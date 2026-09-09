import { cn } from "@/lib/utils"

function Card({ className, ...props }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-white text-slate-900 flex flex-col gap-3 rounded-2xl border border-slate-200/70 py-4 shadow-[0_2px_6px_rgba(20,21,26,0.05),0_1px_2px_rgba(20,21,26,0.04)]",
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1 px-4", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-base font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-slate-500 text-sm", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }) {
  return (
    <div data-slot="card-content" className={cn("px-4", className)} {...props} />
  )
}

function CardFooter({ className, ...props }) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-4", className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
