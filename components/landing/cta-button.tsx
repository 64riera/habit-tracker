import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared signup CTA used in the nav, hero and closing section: one visual
 * treatment (hover lift + sliding arrow, feedback for "this moves you
 * forward") instead of three near-duplicated buttons drifting apart. */
export function CtaButton({
  href,
  children,
  size = "md",
  className,
}: {
  href: string;
  children: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-lg bg-text font-semibold text-surface transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        "hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-10px_var(--header-shadow)] active:translate-y-0 active:scale-[0.98]",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        size === "sm" ? "px-4 py-2 text-[13px]" : "px-5 py-3 text-sm",
        className
      )}
    >
      {children}
      <ArrowRight
        size={size === "sm" ? 14 : 16}
        strokeWidth={2.25}
        aria-hidden
        className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
      />
    </Link>
  );
}
