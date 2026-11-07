#!/usr/bin/env node
/**
 * A shared cache and budget ledger for Figma MCP fetches.
 *
 * Why this exists, precisely: on 2026-09-27 a 16-component resync made 739
 * node-addressed Figma calls against only 396 distinct (tool, node) pairs.
 * 343 of them — 46% — were refetches of something another agent had already
 * pulled. Node 198378:73797 alone was fetched 16 times, because WintSidebar,
 * WintSidebarV2 and each of their verifier agents pulled it independently and
 * none of them could see the others. The run blew through the 200 calls/day a
 * Full seat on Figma's Professional plan allows, and the last agents were cut
 * off mid-survey — so two nodes went unverified and got reported as "missing"
 * when they had merely been rate-limited. A wrong answer, caused by waste.
 *
 * Parallel agents cannot share memory, but they CAN share a directory. That is
 * all this is: fetch once, write it down, and let everyone else read it.
 *
 *   node scripts/figma-cache.mjs plan <file...>      what to fetch, deduped, one owner per node
 *   node scripts/figma-cache.mjs get <tool> <node>   cached payload, or exit 1 on a miss
 *   node scripts/figma-cache.mjs put <tool> <node> [file]   store a payload (stdin if no file)
 *   node scripts/figma-cache.mjs evict <tool> <node> drop a poisoned or stale entry
 *   node scripts/figma-cache.mjs stats               hit rate and calls saved
 *   node scripts/figma-cache.mjs budget              calls used in the last 24h vs the cap
 *   node scripts/figma-cache.mjs audit <dir>         find duplicate fetches in agent transcripts
 *
 * ── A SECOND WAY TO POISON THIS CACHE — found 2026-11-07 ──────────────────
 * `put` has always refused a rate-limit refusal, because caching one tells
 * every later reader "this node does not exist". A TRUNCATED payload is the
 * same bug wearing better clothes, and it got past that guard twice.
 *
 * The harness caps a tool result at 100,000 characters. Two entries were
 * stored at EXACTLY that length — `get_design_context 200013:91524` and
 * `get_design_context 199772:145451` — each cut mid-attribute, missing the
 * last 25-35% of the node. Nothing in them says so. A later reader gets a
 * payload that parses, reads like design data, and is quietly missing the
 * bottom of the frame; `put` accepted both because they contained no
 * rate-limit text. Both were evicted on 2026-11-07 and `put` now screens for
 * this — see truncationVerdict().
 *
 * ⚠ FIGMA'S OWN TRUNCATION IS A DIFFERENT THING and is NOT refused. When the
 *   node is too big, Figma says so in the payload ("...working with truncated
 *   output and results may be incomplete"). That is honest and still useful,
 *   so it is stored WITH A FLAG and `get` says so out loud. The refusal is
 *   reserved for a cut nobody declared.
 *
 * The cap defaults to 200 (Professional, Dev/Full seat). Override for another
 * plan with FIGMA_MCP_DAILY_CAP, e.g. 600 on Organization/Enterprise.
 */
import {
  existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync, statSync, rmSync,
} from 'node:fs'
import path from 'node:path'

/* The cache and the ledger live OUTSIDE the repo, in one place per machine.
   Figma meters per seat, not per project: pulse2_mobile_product_mockup_v2 and
   pulse2_mobile_product_sandbox draw on the same 200/day. A repo-local ledger
   would report "199 remaining" here while a session in the sandbox had already
   spent the lot — the same shape of confidently-wrong answer this file exists
   to prevent. One cache also means a node fetched in either repo is free in
   the other. Override with FIGMA_CACHE_DIR if you need an isolated run. */
const CACHE_DIR = process.env.FIGMA_CACHE_DIR
  || path.join(process.env.LOCALAPPDATA || process.env.HOME || process.cwd(), 'figma-mcp-cache')
const LEDGER = path.join(CACHE_DIR, 'ledger.jsonl')

const DAILY_CAP = Number(process.env.FIGMA_MCP_DAILY_CAP || 200)
const DAY_MS = 24 * 60 * 60 * 1000
/* get_design_context embeds figma.com/api/mcp/asset URLs that die in ~7 days.
   The STRUCTURE stays useful far longer, so an old entry is served with a loud
   warning rather than dropped — but never silently, or someone inlines a dead
   asset URL. */
const ASSET_URL_TTL_MS = 7 * DAY_MS
const FRESH_MS = Number(process.env.FIGMA_CACHE_TTL_MS || DAY_MS)

function ensureDir() {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
}

/** Node ids contain ':' and ';', neither of which is a legal Windows filename. */
function keyFor(tool, nodeId) {
  return `${tool}__${String(nodeId).replace(/[^A-Za-z0-9_-]/g, '_')}.json`
}

function record(event) {
  ensureDir()
  appendFileSync(LEDGER, `${JSON.stringify({ ...event, at: Date.now() })}\n`, 'utf8')
}

function readLedger() {
  if (!existsSync(LEDGER)) return []
  return readFileSync(LEDGER, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l) } catch { return null } })
    .filter(Boolean)
}

/* ── plan ──────────────────────────────────────────────────────────────────
 * The single most effective command here, because it works BEFORE any call is
 * made. Give it the files you are about to resync; it extracts every Figma node
 * id they cite, collapses duplicates, and assigns each node exactly one owning
 * file. Fan out on that plan and the 16x refetch cannot happen — not because
 * agents are asked to be careful, but because only one of them is told to fetch
 * any given node. */
function cmdPlan(files) {
  if (!files.length) {
    console.error('usage: figma-cache.mjs plan <file...>')
    process.exit(2)
  }
  // Bare ids (198314:73471) and Figma's instance form (I198424:63600;194656:347290).
  const RE = /I?\d{3,7}:\d{1,7}(?:;\d{3,7}:\d{1,7})*/g
  const owners = new Map() // nodeId -> [files]

  for (const file of files) {
    let src
    try { src = readFileSync(file, 'utf8') } catch { continue }
    for (const m of src.matchAll(RE)) {
      const id = m[0]
      if (!owners.has(id)) owners.set(id, [])
      const list = owners.get(id)
      if (!list.includes(file)) list.push(file)
    }
  }

  const shared = [...owners.entries()].filter(([, f]) => f.length > 1)
  const cached = [...owners.keys()].filter((id) =>
    existsSync(path.join(CACHE_DIR, keyFor('get_design_context', id)))
    || existsSync(path.join(CACHE_DIR, keyFor('get_metadata', id))))

  console.log(`${owners.size} distinct node(s) cited across ${files.length} file(s)`)
  console.log(`${cached.length} already in the cache — do not refetch these`)
  console.log(`${shared.length} node(s) cited by more than one file — ONE owner each, listed below\n`)

  console.log('FETCH PLAN — each node is fetched by exactly one owner:')
  for (const [id, fs] of [...owners.entries()].sort()) {
    const owner = fs.slice().sort()[0] // deterministic: first file alphabetically
    const hit = cached.includes(id) ? ' [CACHED]' : ''
    const also = fs.length > 1 ? `  (also cited by ${fs.length - 1} other file(s) — they must read the cache)` : ''
    console.log(`  ${id.padEnd(34)} -> ${owner}${hit}${also}`)
  }

  const toFetch = owners.size - cached.length
  console.log(`\n${toFetch} call(s) needed. Budget: ${describeBudget().remaining} remaining today (cap ${DAILY_CAP}).`)
  if (toFetch > describeBudget().remaining) {
    console.log('WARNING: this plan exceeds the remaining daily budget. Split it, or raise')
    console.log('FIGMA_MCP_DAILY_CAP if the plan was upgraded (Organization/Enterprise = 600).')
  }
}

/* ── IS THIS PAYLOAD THE WHOLE NODE? ───────────────────────────────────────
 * Three verdicts, and the difference between them is who did the cutting:
 *
 *   'cut'      — something cut this and said nothing. REFUSED by put, and
 *                served as a MISS by get. This is the poisoning case.
 *   'suspect'  — it ends mid-token. Stored, loudly flagged. Some legitimate
 *                entries are raw rasters or hand-written notes that end oddly,
 *                so this one warns rather than refuses.
 *   'declared' — the payload states its own truncation (Figma's wording when
 *                a node exceeds its size cap). Honest and still useful, so it
 *                is stored and the flag travels with it.
 */

/* Tool-output caps this harness and its neighbours impose. A payload whose
   length is EXACTLY one of these was cut by the transport, not by Figma:
   genuine design output landing on a round number to the character does not
   happen. 100,000 is the one that bit us, twice. */
const OUTPUT_CAPS = new Set([25000, 30000, 50000, 100000, 200000, 250000, 500000, 1000000, 1048576])

/* Figma's own wording when it shortens a large node. Matched near the END of
   the payload only — these words appear in ordinary prose notes too. */
const DECLARES_TRUNCATION = /truncated output|results may be incomplete|output (?:was )?truncated/i

function truncationVerdict(payload) {
  const n = payload.length

  if (OUTPUT_CAPS.has(n)) {
    return {
      kind: 'cut',
      why: `the payload is EXACTLY ${n.toLocaleString('en-US')} characters, which is a `
        + 'tool-output cap, not a length design data arrives at. It was cut in '
        + 'transport and the end of the node is missing.',
    }
  }

  const opener = payload.trimStart()[0]
  if (opener === '[' || opener === '{') {
    try {
      JSON.parse(payload)
    } catch {
      return {
        kind: 'cut',
        why: 'the payload opens as JSON and does not parse. A complete JSON result '
          + 'parses; one that stops partway through does not.',
      }
    }
  }

  if (DECLARES_TRUNCATION.test(payload.slice(-2000))) {
    return {
      kind: 'declared',
      why: 'the payload states its own truncation - this is Figma shortening a large '
        + 'node, not the transport cutting it. Usable, but it is NOT the whole frame.',
    }
  }

  /* A complete emission ends on a terminator. Mid-token is how a cut looks
     when the length happens to miss a cap. */
  const last = payload.replace(/\s+$/, '').slice(-1)
  if (n > 2000 && last && !/[\])}>;.,:"'`*/-]/.test(last)) {
    return {
      kind: 'suspect',
      why: `the payload ends mid-token: ...${JSON.stringify(payload.slice(-48))}`,
    }
  }

  return null
}

/* ── get / put ─────────────────────────────────────────────────────────────*/
function cmdGet(tool, nodeId) {
  const file = path.join(CACHE_DIR, keyFor(tool, nodeId))
  if (!existsSync(file)) {
    record({ type: 'miss', tool, nodeId })
    console.error(`MISS ${tool} ${nodeId} — fetch it, then: figma-cache.mjs put ${tool} ${nodeId} <file>`)
    process.exit(1)
  }
  const entry = JSON.parse(readFileSync(file, 'utf8'))
  const age = Date.now() - entry.fetchedAt

  /* RE-CHECKED ON READ, not trusted from the stored flag alone, because every
     entry written before 2026-11-07 was stored without one. */
  const verdict = entry.truncation || truncationVerdict(entry.payload)

  if (verdict && verdict.kind === 'cut') {
    /* SERVED AS A MISS, and nothing goes to stdout. A reader piping this into
       a file would otherwise get a partial node that reads like a whole one -
       which is the entire failure this check exists to stop. */
    record({ type: 'miss', tool, nodeId })
    console.error(`POISONED ENTRY ${tool} ${nodeId} — ${verdict.why}`)
    console.error('Refusing to serve it. Evict and re-fetch:')
    console.error(`  node scripts/figma-cache.mjs evict ${tool} ${nodeId}`)
    process.exit(1)
  }

  record({ type: 'hit', tool, nodeId })

  if (verdict) {
    console.error(`WARNING: this entry is INCOMPLETE — ${verdict.why}`)
  }
  if (age > ASSET_URL_TTL_MS) {
    console.error(`WARNING: cached ${Math.round(age / DAY_MS)}d ago. Any figma.com asset URL inside `
      + 'has EXPIRED — re-fetch before using assets. Structure is still usable.')
  } else if (age > FRESH_MS) {
    console.error(`note: cached ${Math.round(age / (60 * 60 * 1000))}h ago; re-fetch if the design may have moved since.`)
  }
  process.stdout.write(entry.payload)
}

/* ── evict ─────────────────────────────────────────────────────────────────
 * Drop one entry. Used for a poisoned payload, or when a node is known to have
 * moved under us. It is a ledger event, not a silent unlink: the next reader
 * should be able to see that the entry was removed on purpose. */
function cmdEvict(tool, nodeId) {
  if (!tool || !nodeId) {
    console.error('usage: figma-cache.mjs evict <tool> <node>')
    process.exit(2)
  }
  const file = path.join(CACHE_DIR, keyFor(tool, nodeId))
  if (!existsSync(file)) {
    console.log(`nothing cached for ${tool} ${nodeId}`)
    return
  }
  const bytes = statSync(file).size
  rmSync(file)
  record({ type: 'evict', tool, nodeId })
  console.log(`evicted ${tool} ${nodeId} (${bytes} bytes). The next read is a MISS; re-fetch it.`)
}

function cmdPut(tool, nodeId, file) {
  ensureDir()
  const payload = file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8')
  if (!payload.trim()) {
    console.error('refusing to cache an empty payload — a rate-limit error is not a result')
    process.exit(2)
  }
  /* A rate-limit refusal is a plausible-looking string, and caching one would
     poison every later reader with "this node does not exist" — which is
     exactly how two live nodes got reported as deleted. */
  if (/tool call limit|rate limit/i.test(payload) && payload.length < 800) {
    console.error('refusing to cache what looks like a rate-limit error, not design data')
    process.exit(2)
  }

  /* ── AND THE SAME BUG BY A QUIETER ROUTE — 2026-11-07 ───────────────────
     A payload cut at the harness's 100,000-character ceiling contains no
     rate-limit text, parses, and reads like design data. It is still a lie:
     the last quarter of the node is missing and nothing in the file says so.
     Two entries were stored that way before this check existed. Same class of
     bug as the refusal above, same treatment. */
  const verdict = truncationVerdict(payload)
  const forced = process.argv.includes('--force')

  if (verdict && verdict.kind === 'cut' && !forced) {
    console.error(`refusing to cache a TRUNCATED payload: ${verdict.why}`)
    console.error('')
    console.error('An incomplete node cached as a complete one is worse than a miss - the')
    console.error('next reader cannot tell. Re-fetch the node, or fetch it in pieces (a')
    console.error('child node at a time), or store it with --force if you have checked it')
    console.error('yourself and want the partial payload on the record.')
    process.exit(2)
  }

  if (verdict) {
    console.error(`WARNING: caching an INCOMPLETE payload — ${verdict.why}`)
    if (forced) console.error('(stored anyway: --force)')
  }

  writeFileSync(
    path.join(CACHE_DIR, keyFor(tool, nodeId)),
    JSON.stringify(
      {
        tool,
        nodeId,
        fetchedAt: Date.now(),
        /* The flag TRAVELS WITH THE ENTRY so `get` does not have to re-derive
           it, and so a reader opening the JSON by hand sees it. `get` still
           re-checks, because everything written before this existed has no
           flag at all. */
        ...(verdict ? { truncation: { ...verdict, forced } } : {}),
        payload,
      },
      null,
      2,
    ),
    'utf8',
  )
  record({ type: 'fetch', tool, nodeId })
  console.log(`cached ${tool} ${nodeId} (${payload.length} bytes)`)
}

/* ── stats / budget ────────────────────────────────────────────────────────*/
function describeBudget() {
  const since = Date.now() - DAY_MS
  const used = readLedger().filter((e) => e.type === 'fetch' && e.at >= since).length
  return { used, remaining: Math.max(0, DAILY_CAP - used), cap: DAILY_CAP }
}

function cmdBudget() {
  const { used, remaining, cap } = describeBudget()
  console.log(`Figma MCP calls in the last 24h: ${used} / ${cap}  (${remaining} remaining)`)
  if (!remaining) console.log('EXHAUSTED — further calls will be refused by Figma, not by this script.')
  else if (remaining < cap * 0.2) console.log('Under 20% left. Fetch only what you will actually read.')
}

function cmdStats() {
  const led = readLedger()
  const hits = led.filter((e) => e.type === 'hit').length
  const fetches = led.filter((e) => e.type === 'fetch').length
  const misses = led.filter((e) => e.type === 'miss').length
  const total = hits + fetches
  console.log(`cache entries : ${existsSync(CACHE_DIR) ? readdirSync(CACHE_DIR).filter((f) => f.endsWith('.json')).length : 0}`)
  console.log(`hits          : ${hits}`)
  console.log(`fetches       : ${fetches}`)
  console.log(`misses        : ${misses}`)
  console.log(`calls saved   : ${hits}${total ? `  (${Math.round((hits / total) * 100)}% of reads served from cache)` : ''}`)
  cmdBudget()
}

/* ── audit ─────────────────────────────────────────────────────────────────
 * Post-hoc: point it at a finished workflow's transcript directory and it
 * reports exactly the waste that motivated this file. Run it after any large
 * fan-out to find out whether the plan actually held. */
function cmdAudit(dir) {
  if (!dir || !existsSync(dir)) {
    console.error('usage: figma-cache.mjs audit <workflow-transcript-dir>')
    process.exit(2)
  }
  const pairs = new Map()
  let total = 0

  const walk = (o) => {
    if (Array.isArray(o)) { o.forEach(walk); return }
    if (!o || typeof o !== 'object') return
    if (o.type === 'tool_use' && String(o.name || '').startsWith('mcp__figma__')) {
      const nodeId = o.input?.nodeId
      if (nodeId) {
        const k = `${String(o.name).replace('mcp__figma__', '')}  ${nodeId}`
        pairs.set(k, (pairs.get(k) || 0) + 1)
        total++
      }
    }
    for (const v of Object.values(o)) walk(v)
  }

  for (const f of readdirSync(dir)) {
    if (!/^agent-.*\.jsonl$/.test(f)) continue
    for (const line of readFileSync(path.join(dir, f), 'utf8').split('\n')) {
      if (!line.trim()) continue
      try { walk(JSON.parse(line)) } catch { /* partial line */ }
    }
  }

  const distinct = pairs.size
  const wasted = total - distinct
  console.log(`node-addressed calls : ${total}`)
  console.log(`distinct (tool,node) : ${distinct}`)
  console.log(`wasted on refetches  : ${wasted}${total ? `  (${Math.round((wasted / total) * 100)}%)` : ''}`)
  if (wasted) {
    console.log('\nmost refetched:')
    for (const [k, c] of [...pairs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      if (c > 1) console.log(`  ${String(c).padStart(3)}x  ${k}`)
    }
    console.log('\nEach repeat above was a call the cache would have served. Run `plan` first next time.')
  }
  process.exit(wasted > total * 0.15 ? 1 : 0)
}

const [cmd, ...rest] = process.argv.slice(2)
switch (cmd) {
  case 'plan': cmdPlan(rest); break
  case 'get': cmdGet(rest[0], rest[1]); break
  case 'put': cmdPut(rest[0], rest[1], rest[2]); break
  case 'evict': cmdEvict(rest[0], rest[1]); break
  case 'stats': cmdStats(); break
  case 'budget': cmdBudget(); break
  case 'audit': cmdAudit(rest[0]); break
  default:
    console.error(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0])
    process.exit(2)
}
