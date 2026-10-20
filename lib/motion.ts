import { gsap } from "gsap";
import { useLayoutEffect, type DependencyList, type RefObject } from "react";

// GSAP's ticker is the only clock: tweens, timers and idle motion all run on it, so a
// hidden tab pauses everything together. Never add a requestAnimationFrame loop of your own.
export { gsap };

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
