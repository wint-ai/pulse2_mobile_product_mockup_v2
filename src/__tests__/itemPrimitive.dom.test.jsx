// @vitest-environment happy-dom
//
// ui/item — a PORT GUARD, not a behaviour suite.
//
// `src/components/ui/item.jsx` is shadcn's registry `item.tsx` ported to JSX.
// It has no logic worth testing; what is worth testing is that the port did
// not drift. Two ways it could:
//
//  · a `data-slot` renamed or dropped. The slots are a public contract — the
//    registry's own `group-has-[[data-slot=item-description]]/item` selector
//    depends on them, and so will the three valve surfaces.
//  · the Base UI confusion. shadcn's DOCS site has migrated to Base UI, which
//    composes with a `render` prop. This repo is on `radix-ui@1.6.7` and
//    composes with `asChild`. A paste from the docs site would still render
//    something, so the `asChild` case below is the one that would catch it.
//
// The class-string assertions are spot checks against the registry source, not
// a transcription of it — enough to catch a variant whose value was edited to
// "look more like the house style", which is how a ported primitive stops
// being a ported primitive.
//
// NO APPEARANCE CLAIMS: happy-dom has no layout engine.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'

import {
  Item,
  ItemGroup,
  ItemSeparator,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemHeader,
  ItemFooter,
} from '@/components/ui/item'

afterEach(() => {
  cleanup()
})

const slot = (name) => document.querySelector(`[data-slot="${name}"]`)

describe('ui/item — slots', () => {
  it('stamps every data-slot the registry defines', () => {
    render(
      <ItemGroup>
        <Item>
          <ItemMedia variant="icon" />
          <ItemContent>
            <ItemHeader>h</ItemHeader>
            <ItemTitle>Boiler Room</ItemTitle>
            <ItemDescription>Basement · Building A</ItemDescription>
            <ItemFooter>f</ItemFooter>
          </ItemContent>
          <ItemActions>a</ItemActions>
        </Item>
        <ItemSeparator />
      </ItemGroup>,
    )
    for (const name of [
      'item-group',
      'item',
      'item-media',
      'item-content',
      'item-header',
      'item-title',
      'item-description',
      'item-footer',
      'item-actions',
      'item-separator',
    ]) {
      expect(slot(name), name).toBeTruthy()
    }
  })

  it('gives ItemGroup role=list, and ItemDescription a <p>', () => {
    render(
      <ItemGroup>
        <Item>
          <ItemDescription>d</ItemDescription>
        </Item>
      </ItemGroup>,
    )
    expect(slot('item-group')).toHaveAttribute('role', 'list')
    expect(slot('item-description').tagName).toBe('P')
  })
})

describe('ui/item — variants and sizes', () => {
  it('defaults to variant=default size=default and advertises both', () => {
    render(<Item>row</Item>)
    const el = slot('item')
    expect(el).toHaveAttribute('data-variant', 'default')
    expect(el).toHaveAttribute('data-size', 'default')
    const cls = el.getAttribute('class')
    expect(cls).toContain('group/item')
    expect(cls).toContain('bg-transparent')
    expect(cls).toContain('gap-4')
    expect(cls).toContain('p-4')
    expect(cls).toContain('focus-visible:ring-ring/50')
  })

  it('size=sm is the dense row the 509px-of-chrome screen needs', () => {
    render(<Item size="sm">row</Item>)
    const cls = slot('item').getAttribute('class')
    expect(cls).toContain('gap-2.5')
    expect(cls).toContain('px-4')
    expect(cls).toContain('py-3')
  })

  it('variant=outline and variant=muted carry the registry values', () => {
    render(<Item variant="outline">row</Item>)
    expect(slot('item').getAttribute('class')).toContain('border-border')
    cleanup()
    render(<Item variant="muted">row</Item>)
    expect(slot('item').getAttribute('class')).toContain('bg-muted/50')
  })

  it("ItemMedia's icon variant keeps the 8px box and the svg sizing escape", () => {
    render(<ItemMedia variant="icon" />)
    const cls = slot('item-media').getAttribute('class')
    expect(cls).toContain('size-8')
    expect(cls).toContain('bg-muted')
    expect(cls).toContain("[&_svg:not([class*='size-'])]:size-4")
  })
})

describe('ui/item — composition is Radix asChild, not Base UI render', () => {
  it('asChild renders the child element and keeps the item classes on it', () => {
    render(
      <Item asChild>
        <button type="button">Open valve</button>
      </Item>,
    )
    const el = screen.getByRole('button', { name: 'Open valve' })
    expect(el).toHaveAttribute('data-slot', 'item')
    expect(el.getAttribute('class')).toContain('group/item')
    // No wrapper div got left behind around it.
    expect(el.parentElement.querySelector('[data-slot="item"]')).toBe(el)
  })

  it('className survives the cva merge', () => {
    render(<Item className="p-0">row</Item>)
    const cls = slot('item').getAttribute('class')
    expect(cls).toContain('p-0')
    // tailwind-merge drops the losing padding, not the winning one.
    expect(cls).not.toMatch(/\bp-4\b/)
  })
})
