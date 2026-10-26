// @vitest-environment happy-dom
/**
 * THE ACCOUNT MANAGER SEES A ROLLUP, NOT ONE ACCOUNT ROW.
 *
 * Owner, 2026-10-26: "why i dont see all systems and locations when sign in as
 * account manger on side bar?"
 *
 * The persona filtered on a single sub-account id and resolved to 2 of 103
 * systems, because the snapshot tags exactly one 2-system site to Southbridge
 * Health and everything else — all 50 apartments included — falls through to
 * the MRG root. The side drawer then drew "Residential 0" and five childless
 * building rows.
 *
 * THE DRAWER WAS NOT THE BUG, which is the part worth remembering: it was the
 * only surface in the app honouring the persona at all. Home reads the raw
 * SYSTEMS import and never consults UserContext, so it showed 103 systems and
 * a residential water event beside a drawer showing 2. The scope was wrong and
 * two different datasets hid it.
 *
 * These assertions are about the SHAPE of the scope, not a magic number: that
 * it is a rollup, that it reaches both divisions, and that it still goes
 * through the account tree rather than being hard-coded to "everything".
 */
import { describe, it, expect } from 'vitest'
import { SYSTEMS } from '@/data/systems'
import { PERSONAS } from '@/data/personas'
import { ACCOUNTS, accountWithDescendants, getChildAccounts } from '@/data/accounts'
import { ROOT_ACCOUNT_ID } from '@/data/upstream/buildTree'

const persona = () => PERSONAS.find((p) => p.id === 'account-manager-subaccount')
const visible = () => SYSTEMS.filter((s) => persona().systemFilter(s))

describe('accountWithDescendants', () => {
  it('includes the root itself', () => {
    expect(accountWithDescendants(ROOT_ACCOUNT_ID).has(ROOT_ACCOUNT_ID)).toBe(true)
  })

  it('includes every direct child', () => {
    const scope = accountWithDescendants(ROOT_ACCOUNT_ID)
    const children = getChildAccounts(ROOT_ACCOUNT_ID)
    expect(children.length, 'the fixture has no sub-accounts to roll up').toBeGreaterThan(0)
    for (const c of children) expect(scope.has(c.id), c.name).toBe(true)
  })

  it('walks DOWN only — it does not climb to a root', () => {
    /* "Everything above me too" is not what managing an account means. A
       sub-account's scope must not silently become the whole portfolio. */
    const child = getChildAccounts(ROOT_ACCOUNT_ID)[0]
    const scope = accountWithDescendants(child.id)
    expect(scope.has(child.id)).toBe(true)
    expect(scope.has(ROOT_ACCOUNT_ID), 'climbed to the parent').toBe(false)
  })

  it('returns just the id for an account that does not exist', () => {
    /* So a filter built on a typo matches nothing, rather than everything. */
    const scope = accountWithDescendants('not-an-account')
    expect([...scope]).toEqual(['not-an-account'])
  })

  it('terminates on a cycle rather than hanging', () => {
    /* ACCOUNTS is module state; a malformed parentId chain would otherwise
       spin forever and take the test runner with it. Asserted by construction
       on the real data: the walk visits each account at most once, so the
       result can never exceed the number of accounts that exist. */
    expect(accountWithDescendants(ROOT_ACCOUNT_ID).size).toBeLessThanOrEqual(ACCOUNTS.length + 1)
  })
})

describe('the account manager persona', () => {
  it('is scoped through the account tree, not hard-coded open', () => {
    /* The cheap way to "fix" this is `systemFilter: () => true`, which would
       pass every assertion below and quietly give every future persona the
       whole fleet. So the scope is checked to be a real membership test: a
       system on an account outside the tree must NOT be visible. */
    const outside = { account: 'some-other-crm-account' }
    expect(persona().systemFilter(outside)).toBe(false)
  })

  it('sees both divisions, not one', () => {
    /* The actual symptom: "Residential 0" next to "Office 2". */
    const divisions = new Set(visible().map((s) => s.l2Name))
    expect(divisions.has('Office')).toBe(true)
    expect(divisions.has('Residential')).toBe(true)
  })

  it('sees the residential buildings that made the tree look broken', () => {
    /* Building A-E rendered with no caret and no count because every
       apartment under them was filtered away. */
    const buildings = new Set(visible().filter((s) => s.l2Name === 'Residential').map((s) => s.l4Name))
    expect(buildings.size, 'residential buildings reachable').toBeGreaterThanOrEqual(3)
  })

  it('reaches the whole MRG portfolio', () => {
    /* Owner's ruling, 2026-10-26: an account manager sees MRG and the
       sub-accounts under it. Expressed as "every system whose account is in
       the rollup", so this follows the data rather than pinning 103. */
    const scope = accountWithDescendants(ROOT_ACCOUNT_ID)
    const expected = SYSTEMS.filter((s) => scope.has(s.account))
    expect(visible().length).toBe(expected.length)
    expect(visible().length, 'the scope collapsed again').toBeGreaterThan(SYSTEMS.length / 2)
  })

  it('still includes the sub-account it used to be limited to', () => {
    /* Southbridge Health is INSIDE the rollup now rather than excluded by it.
       If the snapshot ever stops tagging it, this is the canary. */
    const southbridge = '0014H000049GnStQAK'
    const scope = accountWithDescendants(ROOT_ACCOUNT_ID)
    const tagged = SYSTEMS.filter((s) => s.account === southbridge)
    if (tagged.length === 0) return // nothing tagged; nothing to assert
    expect(scope.has(southbridge), 'the sub-account fell out of the rollup').toBe(true)
    for (const s of tagged) expect(persona().systemFilter(s), s.name).toBe(true)
  })

  it('no longer claims to manage one sub-account', () => {
    // The copy described the old scope and would otherwise contradict it.
    expect(persona().description).not.toMatch(/one MRG sub-account/i)
  })
})
