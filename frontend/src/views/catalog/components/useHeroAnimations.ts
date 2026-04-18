import { useGsapAnimation } from "@/composables/useGsapAnimation";

export function useHeroAnimations() {
  useGsapAnimation((gsap) => {
    return [
      gsap.fromTo(".hero-title", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }),
      gsap.fromTo(
        ".hero-subtitle",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, delay: 0.2, ease: "power2.out" }
      ),
      gsap.fromTo(
        ".hero-search",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, delay: 0.3, ease: "power2.out" }
      ),
      gsap.fromTo(
        ".hero-stats",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, delay: 0.4, stagger: 0.1, ease: "power2.out" }
      ),
      gsap.fromTo(
        ".hero-tags",
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, delay: 0.55, ease: "power2.out" }
      ),
      gsap.fromTo(
        ".hand-drawn-decoration",
        { scale: 0, rotation: -20 },
        { scale: 1, rotation: 0, duration: 0.6, delay: 0.6, ease: "back.out(1.7)", stagger: 0.1 }
      ),
      gsap.fromTo(
        ".hero-bg-graphic",
        { opacity: 0, scale: 0.95 },
        { opacity: 1, scale: 1, duration: 1.2, delay: 0.3, ease: "power2.out" }
      ),
    ];
  });
}
