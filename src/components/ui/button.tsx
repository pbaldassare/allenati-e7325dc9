import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 min-h-[44px] active:scale-95",
  {
    variants: {
      variant: {
        default: "glass-strong text-primary-foreground shadow-primary hover:shadow-glow",
        destructive:
          "glass-strong text-destructive-foreground shadow-lg hover:shadow-xl",
        outline:
          "glass-card border-2 border-border/50 hover:border-primary/50 hover:shadow-primary",
        secondary:
          "glass-strong text-secondary-foreground shadow-secondary hover:shadow-glow",
        ghost: "hover:glass-card hover:shadow-sm",
        link: "text-primary-foreground underline-offset-4 hover:underline",
        success: "glass-strong text-success-foreground shadow-lg hover:shadow-xl",
        premium: "glass-strong text-accent-foreground shadow-lg hover:shadow-glow font-space font-bold",
      },
      size: {
        default: "h-12 px-6 py-2 text-base sm:text-sm",
        sm: "h-10 rounded-xl px-4 text-sm",
        lg: "h-14 rounded-2xl px-8 text-lg",
        icon: "h-12 w-12 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
