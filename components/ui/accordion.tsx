"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Secondary detail, folded away.
 *
 * The rule this exists to serve: nobody should have to read something before
 * they understand what to do. Anything that is useful but not needed
 * immediately goes in here.
 */
export function Accordion({
  items,
  className,
}: {
  items: { id: string; title: string; icon?: ReactNode; body: ReactNode }[];
  className?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className={cn("divide-y divide-[--color-edge-soft] overflow-hidden card", className)}>
      {items.map((item) => {
        const isOpen = open === item.id;
        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : item.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-raise"
            >
              {item.icon && <span className="shrink-0 text-signal">{item.icon}</span>}
              <span className="flex-1 text-[14.5px] font-medium">{item.title}</span>
              <ChevronDown
                size={17}
                className={cn(
                  "shrink-0 text-dim transition-transform duration-200",
                  isOpen && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="px-5 pb-5 text-[13.5px] leading-relaxed text-muted">
                  {item.body}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
