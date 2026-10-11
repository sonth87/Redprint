import React from "react";
import { ANIMATION_KEYFRAMES_CSS } from "@ui-builder/shared";

export function AnimationKeyframes() {
  return <style>{ANIMATION_KEYFRAMES_CSS}</style>;
}

export function PopupKeyframes() {
  return (
    <style>
      {`
@keyframes rb-popup-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes rb-popup-scale { from { opacity: 0; transform: scale(.96) } to { opacity: 1; transform: scale(1) } }
@keyframes rb-popup-slide-up { from { opacity: 0; transform: translateY(32px) } to { opacity: 1; transform: translateY(0) } }
@keyframes rb-popup-slide-down { from { opacity: 0; transform: translateY(-32px) } to { opacity: 1; transform: translateY(0) } }
@keyframes rb-popup-slide-left { from { opacity: 0; transform: translateX(32px) } to { opacity: 1; transform: translateX(0) } }
@keyframes rb-popup-slide-right { from { opacity: 0; transform: translateX(-32px) } to { opacity: 1; transform: translateX(0) } }
@keyframes rb-popup-fade-out { from { opacity: 1 } to { opacity: 0 } }
@keyframes rb-popup-scale-out { from { opacity: 1; transform: scale(1) } to { opacity: 0; transform: scale(.96) } }
@keyframes rb-popup-slide-up-out { from { opacity: 1; transform: translateY(0) } to { opacity: 0; transform: translateY(32px) } }
@keyframes rb-popup-slide-down-out { from { opacity: 1; transform: translateY(0) } to { opacity: 0; transform: translateY(-32px) } }
@keyframes rb-popup-slide-left-out { from { opacity: 1; transform: translateX(0) } to { opacity: 0; transform: translateX(32px) } }
@keyframes rb-popup-slide-right-out { from { opacity: 1; transform: translateX(0) } to { opacity: 0; transform: translateX(-32px) } }
@keyframes rb-popup-backdrop-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes rb-popup-backdrop-out { from { opacity: 1 } to { opacity: 0 } }
`}
    </style>
  );
}

// Walk up the DOM to find the nearest scrollable ancestor.
// Used as IntersectionObserver root so it works inside overflow:auto containers
// (e.g. editor preview pane) as well as normal window-scroll pages.
export function findScrollContainer(el: Element): Element | null {
  let parent = el.parentElement;
  while (parent && parent !== document.documentElement) {
    const { overflow, overflowY } = getComputedStyle(parent);
    if (/auto|scroll/.test(overflow) || /auto|scroll/.test(overflowY)) return parent;
    parent = parent.parentElement;
  }
  return null;
}
