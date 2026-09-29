// shadcn/ui Table (new-york), JSX rather than TSX to match the rest of ui/.
//
// Added for the System tab on the location/account entity. The mobile block it
// serves is Figma "Table 16 - Pro Application Block", variant screenSize=Small
// (176511:26284) — the only table in the shadcncraft library that is drawn at
// phone width. Everything else there (Table, DataTable, Table 1-9) is a
// desktop composition.
//
// Figma emits that block as a CSS grid with col-N / row-N classes, which is
// just how Figma serialises an auto-layout table. A real <table> is used here
// instead: it carries the row/column semantics a grid of divs cannot, which
// matters because these rows are interactive. The column track from the node
// (minmax(0,1fr) 80px 56px) is reproduced with table-fixed and a <colgroup>.

import { cn } from '@/lib/utils'

function Table({ className, containerClassName, ...props }) {
  return (
    <div data-slot="table-container" className={cn('relative w-full', containerClassName)}>
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }) {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...props} />
}

function TableBody({ className, ...props }) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b transition-colors data-[state=selected]:bg-muted hover:bg-muted/50',
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'h-10 px-2 text-left align-middle font-medium text-foreground whitespace-nowrap',
        '[&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }) {
  return (
    <td
      data-slot="table-cell"
      className={cn('p-2 align-middle whitespace-nowrap', '[&:has([role=checkbox])]:pr-0', className)}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
