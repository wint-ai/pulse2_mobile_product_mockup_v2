import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/* Stock shadcn, with one divergence noted below.
 *
 * WHY RADIX AND NOT A <div> WITH INITIALS. The repo already had initials
 * discs hand-rolled in two places (MobileHeaderBar, AccountScreenV2) and a
 * real portrait at src/assets/avatar.jpg. The thing Radix adds that a div
 * cannot is the SWAP: AvatarImage reports its own load state and
 * AvatarFallback renders until the image has actually decoded, so a broken
 * or slow portrait shows initials instead of a blank hole. That is the whole
 * component, and it is the reason this screen can show a photo without the
 * identity card collapsing when the photo is missing for a given persona.
 *
 * It is imported from the `radix-ui` umbrella rather than
 * @radix-ui/react-avatar because that is how button.jsx takes Slot and how
 * every other ui/ file in here reaches Radix. Both resolve to the same code.
 */
function Avatar({ className, ...props }) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)}
      {...props} />
  );
}

function AvatarImage({ className, ...props }) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      {...props} />
  );
}

/* `delayMs` is NOT defaulted here. Stock shadcn leaves it undefined too, and
   Radix then shows the fallback immediately — which is what this app wants,
   because the portrait is a bundled local asset that either resolves on the
   first frame or does not exist. A delay only helps when the image is coming
   over a network slow enough that a flash of initials would be noise. */
function AvatarFallback({ className, ...props }) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-muted text-muted-foreground",
        className
      )}
      {...props} />
  );
}

export { Avatar, AvatarImage, AvatarFallback }
