/**
 * sync-upstream-data.mjs — one-way import of the WEB sandbox's demo dataset.
 *
 * Reads `wint-ai/pulse2_product_sandbox` (the web app) and emits a vendored
 * snapshot of the MRG demo scope into `src/data/upstream/mrg-snapshot.json`.
 *
 * READ-ONLY with respect to the web repo. This script never writes, stages, or
 * checks out anything there — it only reads two files and runs `git rev-parse`.
 *
 * The snapshot is COMMITTED to this repo on purpose: the GitHub Pages build and
 * CI must not depend on a sibling checkout existing on disk. Re-run this script
 * only when the web dataset actually changes.
 *
 *   node scripts/sync-upstream-data.mjs
 *   PULSE2_WEB_REPO=/path/to/pulse2_product_sandbox node scripts/sync-upstream-data.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../src/data/upstream/mrg-snapshot.json');

const WEB_REPO = process.env.PULSE2_WEB_REPO || 'C:/Projects/pulse2_product_sandbox';

// ── Demo constants, mirrored verbatim from the web repo ──────────────────────
// web: src/demoMode.ts
const MRG_ACCOUNT_ID = '0015800001fvUFkAAM';
const ALL_CLEAR_LOCATION_IDS = ['esrt-bldg-D', 'esrt-bldg-E'];
// web: src/data/mockData.ts — DEMO MODE restructure block
const BUILDING_ADDRESSES = [
  '350 5th Avenue, New York, NY 10118',
  '20 West 34th Street, New York, NY 10001',
  '1 Bryant Park, New York, NY 10036',
  '11 Madison Avenue, New York, NY 10010',
  '200 Park Avenue, New York, NY 10166',
];
const BUILDINGS = ['A', 'B', 'C', 'D', 'E'];
const APARTMENTS_PER_BUILDING = 10;

// ── Read upstream ────────────────────────────────────────────────────────────
const curatedPath = path.join(WEB_REPO, 'src/data/wint-curated-data.json');
if (!existsSync(curatedPath)) {
  console.error(`\n  Cannot find the web sandbox at: ${WEB_REPO}`);
  console.error(`  Expected: ${curatedPath}`);
  console.error(`\n  Clone it, or set PULSE2_WEB_REPO to its path:`);
  console.error(`    git clone https://github.com/wint-ai/pulse2_product_sandbox\n`);
  process.exit(1);
}
const data = JSON.parse(readFileSync(curatedPath, 'utf8'));

function upstreamRev() {
  try {
    const sha = execFileSync('git', ['-C', WEB_REPO, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const dirty = execFileSync(
      'git',
      [
        '-C', WEB_REPO, 'status', '--porcelain', '--',
        'src/data', 'src/demoMode.ts', 'src/system-page/data',
      ],
      { encoding: 'utf8' },
    ).trim();
    // Porcelain lines are `XY <path>`; split on the first run of spaces so a
    // one-character status code doesn't shift the path by a byte.
    const paths = dirty ? dirty.split('\n').map(l => l.trim().split(/\s+/).slice(1).join(' ')) : [];
    return { sha, dirtyDataFiles: paths };
  } catch {
    return { sha: 'unknown', dirtyDataFiles: [] };
  }
}

// ── Collect the MRG account subtree ──────────────────────────────────────────
const byParent = new Map();
for (const a of data.accounts) {
  if (!byParent.has(a.parent_id)) byParent.set(a.parent_id, []);
  byParent.get(a.parent_id).push(a);
}
function collectDescendantIds(rootId) {
  const out = [];
  const walk = (id) => {
    out.push(id);
    for (const child of byParent.get(id) || []) walk(child.id);
  };
  walk(rootId);
  return out;
}

const rootAccount = data.accounts.find(a => a.id === MRG_ACCOUNT_ID);
if (!rootAccount) {
  console.error(`  Account ${MRG_ACCOUNT_ID} not found in the curated dataset.`);
  process.exit(1);
}
const accountIds = collectDescendantIds(MRG_ACCOUNT_ID);
const accountIdSet = new Set(accountIds);
const accounts = data.accounts.filter(a => accountIdSet.has(a.id));
const sites = data.sites.filter(s => accountIdSet.has(s.account_sf_id));
const siteIdSet = new Set(sites.map(s => s.id));
const waterSystems = data.water_systems.filter(w => accountIdSet.has(w.account_sf_id));

// ── Build country → site → system tree (mirrors web buildLocationHierarchy) ──
const wsBySite = new Map();
const wsSiteless = [];
for (const ws of waterSystems) {
  if (ws.site_sf_id && siteIdSet.has(ws.site_sf_id)) {
    if (!wsBySite.has(ws.site_sf_id)) wsBySite.set(ws.site_sf_id, []);
    wsBySite.get(ws.site_sf_id).push(ws);
  } else {
    wsSiteless.push(ws);
  }
}

// web node ids: `ws-${water_system_id ?? salesforce_id}`
const systemNodeId = ws => `ws-${ws.water_system_id ?? ws.salesforce_id}`;
const slug = s => s.toLowerCase().replace(/\s+/g, '-');

const systemPayload = ws => ({
  salesforceId: ws.salesforce_id,
  waterSystemId: ws.water_system_id,
  siteSfId: ws.site_sf_id,
  accountSfId: ws.account_sf_id,
  active: ws.active,
  valveType: ws.valve_type,
  meterType: ws.meter_type,
  country: ws.country,
});

const systemNode = ws => ({
  id: systemNodeId(ws),
  name: ws.water_system_name || ws.salesforce_id,
  type: 'system',
  system: systemPayload(ws),
});

const sitesByCountry = {};
for (const site of sites) (sitesByCountry[site.country || 'Unknown'] ??= []).push(site);
const sitelessByCountry = {};
for (const ws of wsSiteless) (sitelessByCountry[ws.country || 'Unknown'] ??= []).push(ws);

const countryNames = [
  ...new Set([...Object.keys(sitesByCountry), ...Object.keys(sitelessByCountry)]),
].sort();

const countryNodes = countryNames.map(country => {
  const siteNodes = (sitesByCountry[country] || []).map(site => {
    const systems = wsBySite.get(site.id) || [];
    return {
      id: site.id,
      name: site.name || site.id,
      type: 'level2',
      levelName: 'Site',
      count: systems.length,
      site: {
        flowlessSiteNumber: site.flowless_site_number,
        siteStatus: site.site_status,
        typeOfSite: site.type_of_site,
        country: site.country,
        accountSfId: site.account_sf_id,
      },
      children: systems.map(systemNode),
    };
  });

  const siteless = sitelessByCountry[country] || [];
  if (siteless.length > 0) {
    siteNodes.push({
      id: `siteless-${MRG_ACCOUNT_ID}-${slug(country)}`,
      name: 'Unassigned Systems',
      type: 'level2',
      levelName: 'Site',
      count: siteless.length,
      children: siteless.map(systemNode),
    });
  }

  return {
    id: `country-${MRG_ACCOUNT_ID}-${slug(country)}`,
    name: country,
    type: 'level1',
    levelName: 'Country',
    children: siteNodes,
  };
});

// ── DEMO restructure: United States → Office + Residential ───────────────────
// Mirrors the `if (DEMO_MRG_ONLY)` block in web src/data/mockData.ts.
const usNode = countryNodes.find(n => n.name === 'United States') ?? countryNodes[0];
if (!usNode) {
  console.error('  No country node produced for MRG — nothing to restructure.');
  process.exit(1);
}
const existing = usNode.children ?? [];
const office = {
  id: 'esrt-office',
  name: 'Office',
  type: 'level2',
  levelName: 'Division',
  count: existing.length,
  children: existing,
};
const residential = {
  id: 'esrt-residential',
  name: 'Residential',
  type: 'level2',
  levelName: 'Division',
  count: BUILDINGS.length,
  children: BUILDINGS.map((letter, bi) => ({
    id: `esrt-bldg-${letter}`,
    name: `Building ${letter}`,
    type: 'level3',
    levelName: 'Building',
    address: BUILDING_ADDRESSES[bi],
    count: APARTMENTS_PER_BUILDING,
    // Apartments are water SYSTEMS (one system per apartment), not locations.
    children: Array.from({ length: APARTMENTS_PER_BUILDING }, (_, i) => ({
      id: `esrt-bldg-${letter}-apt-${i + 1}`,
      name: `Apartment ${i + 1}`,
      type: 'system',
      system: { residential: true, salesforceId: null, waterSystemId: null },
    })),
  })),
};
usNode.children = [office, residential];

// ── Emit ─────────────────────────────────────────────────────────────────────
const rev = upstreamRev();
const countSystems = nodes =>
  nodes.reduce(
    (n, node) => n + (node.type === 'system' ? 1 : 0) + countSystems(node.children || []),
    0,
  );

const snapshot = {
  _meta: {
    description:
      'MRG demo scope imported from the Pulse 2.0 WEB sandbox. Generated file — do not edit by hand.',
    generator: 'scripts/sync-upstream-data.mjs',
    generatedAt: new Date().toISOString(),
    source: {
      repo: 'wint-ai/pulse2_product_sandbox',
      commit: rev.sha,
      uncommittedDataFiles: rev.dirtyDataFiles,
    },
    demo: {
      accountId: MRG_ACCOUNT_ID,
      allClearLocationIds: ALL_CLEAR_LOCATION_IDS,
    },
    counts: {
      accounts: accounts.length,
      sites: sites.length,
      waterSystemsFromCrm: waterSystems.length,
      systemNodesInTree: countSystems(countryNodes),
    },
  },
  rootAccountId: MRG_ACCOUNT_ID,
  allClearLocationIds: ALL_CLEAR_LOCATION_IDS,
  accounts: accounts.map(a => ({
    id: a.id,
    name: a.name,
    parentId: a.parent_id,
    status: a.account_status,
    type: a.type,
    region: a.region,
    industry: a.industry,
    numberOfActiveSites: a.number_of_active_sites,
  })),
  tree: countryNodes,
};

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

const shortSha = rev.sha.slice(0, 12);
console.log(`  Wrote ${path.relative(process.cwd(), OUT)}`);
console.log(`    upstream    ${shortSha}${rev.dirtyDataFiles.length ? '  (+ uncommitted data edits)' : ''}`);
console.log(`    accounts    ${accounts.length}  (root: ${rootAccount.name})`);
console.log(`    sites       ${sites.length}`);
console.log(
  `    systems     ${snapshot._meta.counts.systemNodesInTree} nodes  ` +
    `(${waterSystems.length} from CRM + ${BUILDINGS.length * APARTMENTS_PER_BUILDING} residential)`,
);
if (rev.dirtyDataFiles.length) {
  console.log(`\n  NOTE: the web repo has uncommitted edits to:`);
  for (const f of rev.dirtyDataFiles) console.log(`        ${f}`);
}
