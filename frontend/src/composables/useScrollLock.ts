let lockCount = 0;
let originalOverflow = "";
let originalPaddingRight = "";

function getScrollbarWidth(): number {
  if (typeof window === "undefined") return 0;
  return window.innerWidth - document.documentElement.clientWidth;
}

/**
 * 全局滚动锁协调器
 * 支持嵌套：lock() 3 次需要 unlock() 3 次才会真正恢复
 */
export function useScrollLock() {
  const lock = () => {
    if (typeof document === "undefined") return;

    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow;
      originalPaddingRight = document.body.style.paddingRight;

      const scrollbarWidth = getScrollbarWidth();
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      document.body.style.overflow = "hidden";
    }
    lockCount++;
  };

  const unlock = () => {
    if (typeof document === "undefined") return;

    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      originalOverflow = "";
      originalPaddingRight = "";
    }
  };

  return { lock, unlock };
}
