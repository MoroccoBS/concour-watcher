import { X } from "lucide-react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Dialog({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/35 px-4 py-6">
      {children}
    </div>
  );
}

function DialogContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-5xl rounded-lg border border-stone-300 bg-[#fffaf2] shadow-xl",
        className,
      )}
      {...props}
    />
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 border-b border-stone-300 bg-[#fffaf2] p-5",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "font-serif text-3xl leading-tight text-stone-950",
        className,
      )}
      {...props}
    />
  );
}

function DialogClose({
  onClick,
  label = "Close",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button variant="ghost" size="icon" aria-label={label} onClick={onClick}>
      <X className="h-4 w-4" />
    </Button>
  );
}

export { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle };
