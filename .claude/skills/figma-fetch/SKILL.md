---
name: figma-fetch
description: Rules for spending Figma MCP calls in this repo. Load BEFORE any get_design_context, get_metadata, get_screenshot, get_variable_defs or download_assets call, and BEFORE writing any workflow or fanning out any agents that will read Figma. Figma meters MCP tool calls per seat per day (200/day on Professional) and refuses further reads once the cap is hit — a refusal that reads like a missing node and has already produced a wrong answer here. Encodes the plan-then-fetch discipline and the shared cache in scripts/figma-cache.mjs.
---

# Figma fetches are a metered, shared budget

Figma meters MCP reads per seat per day. This is not a soft guideline — when the
cap is reached Figma refuses the call, and the refusal arrives as a *string*,
not an exception.

| plan (Dev/Full seat) | per day | per minute |
| --- | --- | --- |
| Starter | 200 | 10 |
| **Professional** (this account) | **200** | **15** |
| Organization / Enterprise | 600 | 20 |

View/Collab seats get 6 calls per *month*. `whoami`, `create_new_file` and
`add_code_connect_map` are exempt; every read tool is not.

## Rule 0 — a rate-limit refusal is not a result

This is the rule that matters most, because it corrupts *correctness*, not just
cost.

On 2026-09-27 a 16-component resync exhausted the daily cap partway through. The
agents still running got back:

> You've reached the Figma MCP tool call limit for your Full seat on the
> Professional plan.

Two of them recorded the nodes they had been asking about as **missing**, and
reported that the designer had deleted them. The nodes were fine. Only the quota
was gone. That wrong finding then had to be caught by hand downstream.

So:

- Never record a node as deleted, missing, or changed on the strength of a call
  that failed. Distinguish *"Figma says this node is gone"* from *"I did not get
  an answer"* and say which one you mean.
- Never write a failed response into the cache. `figma-cache.mjs put` refuses
  anything that looks like a rate-limit error for exactly this reason.
- If you hit the cap, stop and say so. A partial survey honestly labelled is
  useful; a partial survey presented as complete is worse than none.

## Rule 1 — plan before you fetch, so no node is fetched twice

The same run made **739** node-addressed calls against only **396** distinct
(tool, node) pairs. 46% of the budget bought nothing. Node `198378:73797` was
fetched **16 times** because `WintSidebar`, `WintSidebarV2` and each of their
verifier agents pulled it independently.

Parallel agents cannot share memory. They can share a directory — and they do:
the cache and the ledger live in `%LOCALAPPDATA%/figma-mcp-cache` (or `$HOME`),
**not** inside any repo. Figma meters per *seat*, so `pulse2_mobile_product_
mockup_v2` and `pulse2_mobile_product_sandbox` spend the same 200/day. A
repo-local ledger would cheerfully report "199 remaining" while a session in the
other project had already spent the lot. One cache also means a node fetched in
either project is free in the other. `FIGMA_CACHE_DIR` overrides it.

```bash
node scripts/figma-cache.mjs plan src/v2/components/*.jsx
```

It extracts every node id the files cite, collapses duplicates, marks what is
already cached, and assigns each node **exactly one owning file**. Fan out on
that plan and the 16x refetch cannot happen — not because agents were asked to
be careful, but because only one of them is told to fetch any given node.

It also prints the call count against your remaining budget, and warns if the
plan does not fit.

## Rule 2 — cache first, always

```bash
node scripts/figma-cache.mjs get get_design_context 198378:73797   # exit 1 = miss
# ... only on a miss, call the MCP tool, then:
node scripts/figma-cache.mjs put get_design_context 198378:73797 payload.txt
```

A hit costs nothing and counts against no quota. Entries older than 24h are
served with a note; entries older than 7 days are served with a warning, because
the `figma.com/api/mcp/asset` URLs inside them have expired by then — the
structure is still good, the asset links are not.

## Rule 3 — pick the cheapest tool that answers the question

Every read costs the same one call, so spend it on the one that actually
answers you:

- **`get_metadata`** — structure, sizes, layer names, hidden flags, child ids.
  Use it to *locate* and to diff structure. It is how you find out that a slot
  is `hidden="true"` in one variant, which is often the whole answer.
- **`get_design_context`** — the real emitted code. Required before you
  implement anything. The project rule stands: you may not build from a
  screenshot.
- **`get_screenshot`** — the visual target only. Never an implementation source.
- **`get_variable_defs`** — only when you need a token's resolved value and the
  emitted fallback is not enough.

Do not call all four on the same node out of habit. And do not call
`get_metadata` on a very large frame expecting children: a subtree past the
size cap returns the bare root, which looks identical to an empty frame. Drill
into a known child instead.

## Rule 4 — do not fetch what you will not read

If you own one component, fetch that component's nodes. Leaf nodes whose parent
you already pulled are usually already in that response. A node cited in a
comment as historical context is not automatically worth a call.

## Rule 5 — audit after any fan-out

```bash
node scripts/figma-cache.mjs audit <workflow-transcript-dir>
```

Reports total calls, distinct pairs, and the refetch rate; exits non-zero past
15% waste. Run it after a large workflow to find out whether the plan held.

## If you are the orchestrator

1. Run `plan` over the target files **before** writing the workflow.
2. Give each agent only the nodes it owns, and tell the others explicitly to
   read the cache rather than fetch.
3. Put the remaining budget in the brief. An agent that knows 40 calls are left
   behaves differently from one that assumes they are free.
4. Check `budget` before starting. Starting a 400-call sweep with 90 left buys a
   half-finished answer plus a batch of false "missing node" findings.
5. Audit afterwards.

## Checking where you stand

```bash
node scripts/figma-cache.mjs budget   # calls used in the last 24h vs the cap
node scripts/figma-cache.mjs stats    # hit rate and calls saved
```

The cap defaults to 200. If the plan is upgraded, set `FIGMA_MCP_DAILY_CAP=600`
rather than editing the script. Figma's docs do not state when the daily window
resets, so treat "remaining" as approximate near the boundary.
