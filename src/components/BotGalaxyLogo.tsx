import { cn } from "@/lib/utils";

export function BotGalaxyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("h-8 w-8", className)} role="img" aria-label="BotGalaxy">
      <defs>
        <linearGradient id="bg-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <ellipse
        cx="24"
        cy="24"
        rx="21"
        ry="8.5"
        transform="rotate(-28 24 24)"
        fill="none"
        stroke="url(#bg-mark)"
        strokeWidth="2.4"
        opacity="0.9"
      />
      <rect x="13" y="14" width="22" height="18" rx="7" fill="url(#bg-mark)" />
      <circle cx="19.5" cy="23" r="2.6" className="fill-background" />
      <circle cx="28.5" cy="23" r="2.6" className="fill-background" />
      <path d="M24 8.5v5.5" stroke="url(#bg-mark)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="24" cy="7" r="2.4" fill="url(#bg-mark)" />
    </svg>
  );
}

export function BotGalaxyLogo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BotGalaxyMark className="h-8 w-8 shrink-0 text-primary" />
      <span className="font-display text-xl font-bold tracking-tight">
        Bot<span className="brand-gradient-text">Galaxy</span>
      </span>
    </span>
  );
}
