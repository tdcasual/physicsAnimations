import { ref, onMounted, onUnmounted } from 'vue'

/**
 * 网络在线状态
 *
 * @example
 * const isOnline = useOnline()
 * // isOnline.value 为 true 表示在线，false 表示离线
 */
export function useOnline() {
  const isOnline = ref(true)

  function updateOnlineStatus() {
    isOnline.value = navigator.onLine
  }

  onMounted(() => {
    isOnline.value = navigator.onLine
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
  })

  onUnmounted(() => {
    window.removeEventListener('online', updateOnlineStatus)
    window.removeEventListener('offline', updateOnlineStatus)
  })

  return isOnline
}

export default useOnline
