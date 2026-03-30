import { onBeforeUnmount, onMounted, type ComputedRef, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

type BooleanRef = Ref<boolean> | ComputedRef<boolean>

interface UsePendingChangesGuardParams {
  hasPendingChanges: BooleanRef
  isBlocked?: BooleanRef
  message: string
}

export function usePendingChangesGuard({
  hasPendingChanges,
  isBlocked,
  message,
}: UsePendingChangesGuardParams) {
  function shouldBlockNavigation(): boolean {
    return hasPendingChanges.value && !(isBlocked?.value ?? false)
  }

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!shouldBlockNavigation()) return
    event.preventDefault()
    event.returnValue = ''
  }

  onBeforeRouteLeave(() => {
    if (!shouldBlockNavigation()) return true
    return window.confirm(message)
  })

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })
}
