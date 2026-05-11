import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVirtualKeyboard } from "@/hooks/useVirtualKeyboard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

/**
 * ResponsiveDialog
 * - Desktop (md+): renders a centered Dialog (Radix)
 * - Mobile: renders a bottom-sheet Drawer (Vaul) with safe-area + virtual-keyboard handling
 *
 * Use sub-components Header / Title / Description / Body / Footer to get correct
 * sticky behavior + safe area on mobile.
 */

type Ctx = {
  isMobile: boolean;
  keyboardVisible: boolean;
};
const ResponsiveDialogCtx = React.createContext<Ctx>({
  isMobile: false,
  keyboardVisible: false,
});

interface ResponsiveDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function ResponsiveDialog({ open, onOpenChange, children }: ResponsiveDialogProps) {
  const isMobile = useIsMobile();
  const { isVisible: keyboardVisible } = useVirtualKeyboard();

  const ctx = React.useMemo(
    () => ({ isMobile, keyboardVisible }),
    [isMobile, keyboardVisible]
  );

  return (
    <ResponsiveDialogCtx.Provider value={ctx}>
      {isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange}>
          {children}
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          {children}
        </Dialog>
      )}
    </ResponsiveDialogCtx.Provider>
  );
}

export function ResponsiveDialogTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const { isMobile } = React.useContext(ResponsiveDialogCtx);
  return isMobile ? (
    <DrawerTrigger asChild={asChild}>{children}</DrawerTrigger>
  ) : (
    <DialogTrigger asChild={asChild}>{children}</DialogTrigger>
  );
}

interface ResponsiveDialogContentProps {
  children: React.ReactNode;
  className?: string;
  /** Tailwind max-width class for desktop dialog (default sm:max-w-lg) */
  desktopClassName?: string;
}

export function ResponsiveDialogContent({
  children,
  className,
  desktopClassName,
}: ResponsiveDialogContentProps) {
  const { isMobile, keyboardVisible } = React.useContext(ResponsiveDialogCtx);

  if (isMobile) {
    return (
      <DrawerContent
        className={cn(
          "flex flex-col p-0",
          keyboardVisible ? "max-h-[100dvh] h-[100dvh]" : "max-h-[92dvh]",
          className
        )}
      >
        {children}
      </DrawerContent>
    );
  }

  return (
    <DialogContent
      className={cn(
        "p-0 gap-0 flex flex-col max-h-[90vh]",
        desktopClassName ?? "sm:max-w-lg",
        className
      )}
    >
      {children}
    </DialogContent>
  );
}

export function ResponsiveDialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isMobile } = React.useContext(ResponsiveDialogCtx);
  const Cmp = isMobile ? DrawerHeader : DialogHeader;
  return (
    <Cmp
      className={cn(
        "shrink-0 px-6 pt-6 pb-4 border-b text-left",
        isMobile && "pt-2",
        className
      )}
    >
      {children}
    </Cmp>
  );
}

export function ResponsiveDialogTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isMobile } = React.useContext(ResponsiveDialogCtx);
  return isMobile ? (
    <DrawerTitle className={className}>{children}</DrawerTitle>
  ) : (
    <DialogTitle className={className}>{children}</DialogTitle>
  );
}

export function ResponsiveDialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isMobile } = React.useContext(ResponsiveDialogCtx);
  return isMobile ? (
    <DrawerDescription className={className}>{children}</DrawerDescription>
  ) : (
    <DialogDescription className={className}>{children}</DialogDescription>
  );
}

/** Scrollable body. Always fills available space and scrolls; never lets content
 *  hide behind footer or virtual keyboard. */
export function ResponsiveDialogBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-4",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Sticky footer with safe-area padding on mobile. */
export function ResponsiveDialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isMobile } = React.useContext(ResponsiveDialogCtx);
  return (
    <div
      className={cn(
        "shrink-0 border-t bg-background px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2",
        isMobile && "pb-[max(1rem,env(safe-area-inset-bottom))]",
        className
      )}
    >
      {children}
    </div>
  );
}
