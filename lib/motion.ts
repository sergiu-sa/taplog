import { gsap } from "gsap";
import { useLayoutEffect, type DependencyList, type RefObject } from "react";

// GSAP's ticker is the only clock: tweens, timers and idle motion all run on it, so a
// hidden tab pauses everything together. Never add a requestAnimationFrame loop of your own.
export { gsap };

// A coil with nothing lit has no current to pulse; that's a state, not a typo.
gsap.config({ nullTargetWarn: false });

export const ease = { out: "expo.out", inOut: "expo.inOut", soft: "power3.out" } as const;

export const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// Every tween fn creates is reverted when deps change or the component unmounts.
export function useMotion(scope: RefObject<Element | null>, fn: () => void | (() => void), deps: DependencyList) {
  useLayoutEffect(() => {
    if (!scope.current || reducedMotion()) return;
    const ctx = gsap.context(fn, scope.current);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

let openedAt = -Infinity;

// The page transition opens from, or closes into, this coil's die-cut edge (12% inside its
// box, radius 22% of the edge's side), set before the link navigates. The clip is drawn in
// the page's own box, which starts at the top of the document: a page opening is scrolled to
// the top by then, a page closing is still scrolled where it was.
export function curtainFrom(coil: Element | null | undefined, closing = false) {
  if (!coil) return;
  const r = coil.getBoundingClientRect();
  const y = closing ? scrollY : 0;
  const i = r.width * 0.12;
  const s = document.documentElement.style;
  s.setProperty("--curtain", `rect(${r.top + y + i}px ${r.right - i}px ${r.bottom + y - i}px ${r.left + i}px round ${r.width * 0.76 * 0.22}px)`);
  s.setProperty("--curtain-view", `rect(${y}px 100% ${y + innerHeight}px 0 round 0)`);
  if (!closing) openedAt = performance.now();
}

// Whether this page came in through the curtain rather than a load, so its entrance can
// play without hiding anything a server-rendered first frame already showed. Read once, and
// stale after 5 s, so a cmd-click or a reduced-motion visit that never read it can't replay it.
export function arrived() {
  const fresh = performance.now() - openedAt < 5000;
  openedAt = -Infinity;
  return fresh;
}

// Runs fn on the ticker only while el is on screen.
export function whileVisible(el: Element, fn: gsap.TickerCallback) {
  let on = false;
  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting === on) return;
    on = entry.isIntersecting;
    if (on) gsap.ticker.add(fn);
    else gsap.ticker.remove(fn);
  });
  io.observe(el);
  return () => {
    io.disconnect();
    gsap.ticker.remove(fn);
  };
}
