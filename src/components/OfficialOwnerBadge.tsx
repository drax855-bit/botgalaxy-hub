import { BadgeCheck } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  /** Render only the check mark, without the label text. */
  compact?: boolean;
  className?: string;
};

/**
 * Read-only account badge. Shown when an account owns at least one approved bot.
 * Unrelated to email verification or the per-bot `verified` flag.
 */
export function OfficialOwnerBadge({ compact = false, className }: Props) {
  const label = "Official Bot Owner";

  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-xs font-medium text-sky-400",
        compact && "px-1 py-1",
        className,
      )}
    >
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {compact ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </span>
  );
}
