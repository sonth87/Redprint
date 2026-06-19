import React from "react";
import { findActiveMenuItem, flattenVisibleMenuItems } from "@ui-builder/shared";
import type { MenuSettings } from "./types";

function useRuntimeActiveItem(settings: MenuSettings): string | null {
  const [activeAnchorId, setActiveAnchorId] = React.useState("");
  const [pathname, setPathname] = React.useState("");

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    setPathname(window.location.pathname);
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return undefined;
    const anchors = flattenVisibleMenuItems(settings.items)
      .map(({ item }) => item.target.type === "anchor" ? item.target.anchorId.replace(/^#/, "") : "")
      .filter(Boolean);
    const elements = anchors
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return undefined;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const id = entry.target.id;
        if (entry.isIntersecting) visible.set(id, entry.intersectionRatio);
        else visible.delete(id);
      });
      const [best] = [...visible.entries()].sort((a, b) => b[1] - a[1]);
      if (best) setActiveAnchorId(best[0]);
    }, { rootMargin: "-20% 0px -65% 0px", threshold: [0.1, 0.25, 0.5, 0.75] });

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [settings.items]);

  if (settings.activeMode === "manual") {
    const flat = flattenVisibleMenuItems(settings.items);
    return settings.activeItemId || (flat[settings.activeIndex]?.item.id ?? null);
  }

  const active = findActiveMenuItem(settings.items, { activeAnchorId, pathname });
  return active?.id ?? null;
}

export { useRuntimeActiveItem };
