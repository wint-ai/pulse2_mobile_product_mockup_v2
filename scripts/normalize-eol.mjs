/**
 * Renormalize the working tree to LF, in place.
 *
 * WHY THIS EXISTS
 *
 * `5392ce8` ("Pin line endings before any codemod touches this repo") added a
 * .gitattributes pinning `* text=auto eol=lf`. The INDEX has been uniformly LF
 * ever since, so commits, diffs and history are all clean and always were.
 *
 * What that commit could not do is rewrite files already sitting on disk. Git
 * never retroactively renormalizes a working tree, so every file checked out
 * before that commit still carries CRLF until something rewrites it. At the
 * time this script was added that was 207 of 375 tracked text files.
 *
 * THE HAZARD IS SCRIPTED EDITS, NOT DIFFS. A codemod that matches a
 * multi-line anchor joined with \n matches nothing in a CRLF file, changes no
 * files, and exits 0 — a silent no-op that reports success. That is the exact
 * failure `5392ce8` was trying to get ahead of, and it stayed live for 207
 * files because the pin and the renormalize are two different jobs.
 *
 * Compounding it: this git-bash's sed/awk/grep silently strip CR, so they
 * report a CRLF file as LF. Only `node` and `git ls-files --eol` tell the
 * truth. Hence a node script rather than a shell one-liner.
 *
 * WHY NOT THE TEXTBOOK RECIPE
 *
 *   git rm --cached -r . && git reset --hard
 *
 * is the documented way to renormalize a working tree, and it discards every
 * uncommitted change in the repo. This script does the same job without
 * touching git state: it strips CR from the files git itself reports as
 * `w/crlf`, leaving content byte-identical to what the index already holds.
 * `git status` is unchanged by a run, because there was never a content
 * difference to begin with — only an on-disk encoding one.
 *
 * usage:
 *   node scripts/normalize-eol.mjs            # report only
 *   node scripts/normalize-eol.mjs --write    # rewrite them
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const WRITE = process.argv.includes('--write')

/* `git ls-files --eol` is the only trustworthy reporter here. Its line is
   `i/<index>  w/<worktree>  attr/<attrs>\t<path>`, and the attr field holds
   spaces (`text=auto eol=lf`) — so split on the TAB for the path and only
   then tokenise the flags. A regex over the whole line gets this wrong. */
const rows = execSync('git ls-files --eol', { encoding: 'utf8', maxBuffer: 1 << 28 })
  .trim()
  .split('\n')

const targets = []
for (const line of rows) {
  const tab = line.indexOf('\t')
  if (tab < 0) continue
  const file = line.slice(tab + 1)
  const flags = line.slice(0, tab).trim().split(/\s+/)
  const w = (flags.find(f => f.startsWith('w/')) || '').slice(2)
  if (w === 'crlf' || w === 'mixed') targets.push({ file, w })
}

if (targets.length === 0) {
  console.log('working tree is already LF — nothing to do')
  process.exit(0)
}

const byExt = {}
for (const { file } of targets) {
  const ext = (file.match(/\.[^./]+$/) || ['(none)'])[0]
  byExt[ext] = (byExt[ext] || 0) + 1
}

console.log(`${targets.length} file(s) are not LF on disk:`)
for (const [ext, n] of Object.entries(byExt).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${ext.padEnd(8)} ${n}`)
}

if (!WRITE) {
  console.log('\nreport only — pass --write to rewrite them')
  process.exit(0)
}

let changed = 0
for (const { file } of targets) {
  const before = readFileSync(file)
  /* Strip CR only where it precedes LF. A lone CR is not a line ending here
     and a blanket \r delete would corrupt it. */
  const after = Buffer.from(before.toString('binary').replace(/\r\n/g, '\n'), 'binary')
  if (after.equals(before)) continue
  writeFileSync(file, after)
  changed++
}

console.log(`\nrewrote ${changed} file(s) to LF`)
console.log('`git status` should be unchanged — the index was already LF, so')
console.log('this was an on-disk encoding fix, not a content change.')
