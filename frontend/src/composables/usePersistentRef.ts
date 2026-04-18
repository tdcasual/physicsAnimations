import { type Ref, ref, watch } from "vue";

import { getStorageObject, setStorageObject } from "@/lib/storage";

/**
 * 创建自动持久化到 localStorage 的 ref
 * - 读取失败时使用默认值
 * - 写入失败时静默降级（已有 console.warn）
 * - 组件卸载后不再触发写入
 */
export function usePersistentRef<T>(key: string, defaultValue: T, options: { deep?: boolean } = {}): Ref<T> {
  const stored = getStorageObject<T>(key);
  const state = ref<T>(stored ?? defaultValue) as Ref<T>;

  watch(
    state,
    (value) => {
      setStorageObject(key, value);
    },
    { deep: options.deep ?? true }
  );

  return state;
}
