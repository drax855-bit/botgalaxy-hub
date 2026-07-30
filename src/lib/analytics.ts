import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/directory.functions";

function visitorHash(): string {
  if (typeof window === "undefined") return "";
  let v = window.localStorage.getItem("bg_vid");
  if (!v) {
    v = Math.random().toString(36).slice(2) + Date.now().toString(36);
    window.localStorage.setItem("bg_vid", v);
  }
  return v;
}

function device(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  return w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
}

/** Privacy-conscious: no cookies, no IPs, only a random local id. */
export function track(
  event_type: "page_view" | "bot_profile_view" | "invite_click" | "search" | "signup" | "submission" | "vote",
  extra: { path?: string; bot_id?: string; search_term?: string } = {},
) {
  if (typeof window === "undefined") return;
  void trackEvent({
    data: {
      event_type,
      device: device(),
      visitor_hash: visitorHash(),
      referrer: document.referrer ? new URL(document.referrer).hostname : undefined,
      path: extra.path ?? window.location.pathname,
      bot_id: extra.bot_id,
      search_term: extra.search_term,
    },
  }).catch(() => undefined);
}

export function usePageView(path: string, botId?: string) {
  const last = useRef<string>("");
  useEffect(() => {
    const key = `${path}|${botId ?? ""}`;
    if (last.current === key) return;
    last.current = key;
    track("page_view", { path });
    if (botId) track("bot_profile_view", { path, bot_id: botId });
  }, [path, botId]);
}
