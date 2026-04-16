<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Wifi, WifiOff } from 'lucide-vue-next';

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
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
});

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus);
  window.removeEventListener('offline', updateOnlineStatus);
  if (hideTimeout) clearTimeout(hideTimeout);
});
</script>

<template>
  <!-- Offline Indicator (Fixed) -->
  <div
    v-if="!isOnline"
    class="fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm"
  >
    <WifiOff class="w-4 h-4" />
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
      class="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 text-sm font-medium"
    >
      <Wifi class="w-4 h-4" />
      <span>已恢复网络连接</span>
      <button
        @click="dismissBanner"
        class="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </Transition>
</template>
