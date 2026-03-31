import { ref, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * 网络在线状态
 *
 * @param onReconnect - 重连后的回调函数
 * @example
 * const isOnline = useOnline(() => {
 *   console.log('网络已恢复，刷新数据...')
 *   refreshData()
 * })
 * // isOnline.value 为 true 表示在线，false 表示离线
 */
export function useOnline(onReconnect?: () => void): Ref<boolean> {
  // 使用 navigator.onLine 作为初始值
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
  let wasOffline = false

  function updateOnlineStatus() {
    const online = navigator.onLine
    isOnline.value = online

    // 如果从离线恢复到在线，触发回调
    if (online && wasOffline && onReconnect) {
      onReconnect()
    }
    wasOffline = !online
  }

  onMounted(() => {
    // 确保初始值正确
    isOnline.value = navigator.onLine
    wasOffline = !navigator.onLine

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
