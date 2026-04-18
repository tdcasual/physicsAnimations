import type { gsap as GSAPType } from "gsap";
import { onMounted, onUnmounted } from "vue";

import { initGsap } from "@/lib/gsap";

type AnimationResult = gsap.core.Timeline | gsap.core.Tween | (() => void) | void;

/**
 * GSAP 动画生命周期自动管理
 * - 自动懒加载 GSAP
 * - 自动处理组件卸载时的清理
 * - 支持返回 tween/timeline 或自定义 cleanup 函数
 */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function useGsapAnimation(factory: (gsap: typeof GSAPType) => AnimationResult | AnimationResult[]) {
  let cleanups: (() => void)[] = [];
  let isMounted = true;

  onMounted(async () => {
    if (prefersReducedMotion()) {
      // Skip animations for users who prefer reduced motion.
      // We still need to ensure elements are visible (not stuck at opacity: 0).
      return;
    }

    const { gsap } = await initGsap();
    if (!isMounted) return;

    const result = factory(gsap);
    if (!result) return;

    const items = Array.isArray(result) ? result : [result];
    for (const item of items) {
      if (!item) continue;
      if (typeof item === "function") {
        cleanups.push(item);
      } else if (typeof item.kill === "function") {
        cleanups.push(() => item.kill());
      }
    }
  });

  onUnmounted(() => {
    isMounted = false;
    cleanups.forEach((fn) => fn());
    cleanups = [];
  });
}
