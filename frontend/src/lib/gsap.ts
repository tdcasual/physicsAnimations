import type { gsap as GSAPType } from "gsap";
import type { ScrollTrigger as ScrollTriggerType } from "gsap/ScrollTrigger";

let gsapInstance: typeof GSAPType | null = null;
let scrollTriggerInstance: typeof ScrollTriggerType | null = null;
let initPromise: Promise<{ gsap: typeof GSAPType; ScrollTrigger: typeof ScrollTriggerType }> | null = null;

// Check if user prefers reduced motion
const prefersReducedMotion = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
};

async function initGsap(): Promise<{ gsap: typeof GSAPType; ScrollTrigger: typeof ScrollTriggerType }> {
  if (gsapInstance && scrollTriggerInstance) {
    return { gsap: gsapInstance, ScrollTrigger: scrollTriggerInstance };
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const [{ gsap }, { ScrollTrigger }] = await Promise.all([
      import("gsap"),
      import("gsap/ScrollTrigger"),
    ]);

    gsapInstance = gsap;
    scrollTriggerInstance = ScrollTrigger;

    // Only register in browser environment with matchMedia support
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      gsap.registerPlugin(ScrollTrigger);

      // Respect user's motion preferences
      if (prefersReducedMotion()) {
        gsap.globalTimeline.timeScale(0);
      }
    }

    return { gsap, ScrollTrigger };
  })();

  return initPromise;
}

export { initGsap };
export type { GSAPType, ScrollTriggerType };
