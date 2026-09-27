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
 *   node scripts/figma-cache.mjs stats               hit rate and calls saved
 *   node scripts/figma-cache.mjs budget              calls used in the last 24h vs the cap
 *   node scripts/figma-cache.mjs audit <dir>         find duplicate fetches in agent transcripts
 *
 * The cap defaults to 200 (Professional, Dev/Full seat). Override for another
 * plan with FIGMA_MCP_DAILY_CAP, e.g. 600 on Organization/Enterprise.
 */
import {
  existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync, statSync,
} from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const CACHE_DIR = path.join(ROOT, '.figma-cache')
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
  record({ type: 'hit', tool, nodeId })

  if (age > ASSET_URL_TTL_MS) {
    console.error(`WARNING: cached ${Math.round(age / DAY_MS)}d ago. Any figma.com asset URL inside `
      + 'has EXPIRED — re-fetch before using assets. Structure is still usable.')
  } else if (age > FRESH_MS) {
    console.error(`note: cached ${Math.round(age / (60 * 60 * 1000))}h ago; re-fetch if the design may have moved since.`)
  }
  process.stdout.write(entry.payload)
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
  writeFileSync(
    path.join(CACHE_DIR, keyFor(tool, nodeId)),
    JSON.stringify({ tool, nodeId, fetchedAt: Date.now(), payload }, null, 2),
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
  case 'stats': cmdStats(); break
  case 'budget': cmdBudget(); break
  case 'audit': cmdAudit(rest[0]); break
  default:
    console.error(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0])
    process.exit(2)
}
