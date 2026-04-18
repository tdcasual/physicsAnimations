<script setup lang="ts">
import { Wifi, WifiOff } from "lucide-vue-next";
import { onMounted, onUnmounted, ref } from "vue";

const isOnline = ref(navigator.onLine);
const showBanner = ref(false);
let hideTimeout: number | null = null;

function updateOnlineStatus() {
  const wasOffline = !isOnline.value;
  isOnline.value = navigator.onLine;

  // Show banner when coming back online
  if (wasOffline && isOnline.value) {
    showBanner.value = true;
    if (hideTimeout) clearTimeout(hideTimeout);
    hideTimeout = window.setTimeout(() => {
      showBanner.value = false;
    }, 3000);
  }
}

function dismissBanner() {
  showBanner.value = false;
  if (hideTimeout) clearTimeout(hideTimeout);
}

onMounted(() => {
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
});

onUnmounted(() => {
  window.removeEventListener("online", updateOnlineStatus);
  window.removeEventListener("offline", updateOnlineStatus);
  if (hideTimeout) clearTimeout(hideTimeout);
});
</script>

<template>
  <!-- Offline Indicator (Fixed) -->
  <div
    v-if="!isOnline"
    class="pwa-offline-bar fixed right-0 left-0 z-[var(--z-float)] flex items-center justify-center gap-2 px-4 py-2 text-sm"
    style="top: var(--app-topbar-height, 64px)"
  >
    <WifiOff class="h-4 w-4" />
    <span>离线模式 - 部分功能可能不可用</span>
  </div>

  <!-- Back Online Banner (Auto-hide) -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform -translate-y-full opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition duration-300 ease-in"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform -translate-y-full opacity-0"
  >
    <div
      v-if="showBanner"
      class="pwa-online-banner fixed top-4 left-1/2 z-[var(--z-toast)] flex -translate-x-1/2 items-center gap-3 rounded-full px-6 py-3 text-sm font-medium shadow-lg"
    >
      <Wifi class="h-4 w-4" />
      <span>已恢复网络连接</span>
      <button type="button" aria-label="关闭提示" @click="dismissBanner" class="ml-2 rounded-full p-1 transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-hidden">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.pwa-offline-bar {
  background: var(--pwa-offline-bg, #111827);
  color: #ffffff;
}

.pwa-online-banner {
  background: var(--pwa-online-bg, #16a34a);
  color: #ffffff;
}
</style>
