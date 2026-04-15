<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Download, X } from 'lucide-vue-next';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
const showPrompt = ref(false);
const isInstalled = ref(false);

onMounted(() => {
  // Check if already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    isInstalled.value = true;
    return;
  }
  
  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Store the event for later use
    deferredPrompt.value = e as BeforeInstallPromptEvent;
    // Show our custom install prompt
    showPrompt.value = true;
  });
  
  // Listen for appinstalled event
  window.addEventListener('appinstalled', () => {
    isInstalled.value = true;
    showPrompt.value = false;
    deferredPrompt.value = null;
    console.log('PWA was installed');
  });
});

async function installPwa() {
  if (!deferredPrompt.value) return;
  
  // Show the install prompt
  deferredPrompt.value.prompt();
  
  // Wait for the user to respond
  const { outcome } = await deferredPrompt.value.userChoice;
  
  if (outcome === 'accepted') {
    console.log('User accepted the install prompt');
  } else {
    console.log('User dismissed the install prompt');
  }
  
  // Clear the deferredPrompt
  deferredPrompt.value = null;
  showPrompt.value = false;
}

function dismissPrompt() {
  showPrompt.value = false;
  // Store dismissal time to avoid showing again too soon
  localStorage.setItem('pwa-install-dismissed', Date.now().toString());
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform translate-y-full opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition duration-300 ease-in"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform translate-y-full opacity-0"
  >
    <div
      v-if="showPrompt && !isInstalled"
      class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-4"
    >
      <div class="flex items-start gap-4">
        <!-- App Icon -->
        <div class="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg class="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke-linecap="round" />
          </svg>
        </div>
        
        <!-- Content -->
        <div class="flex-1 min-w-0">
          <h3 class="font-semibold text-gray-900 dark:text-white">
            安装演示工坊
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            添加到主屏幕，离线也能访问，体验更流畅
          </p>
        </div>
        
        <!-- Close Button -->
        <button
          @click="dismissPrompt"
          class="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <X class="w-5 h-5 text-gray-400" />
        </button>
      </div>
      
      <!-- Actions -->
      <div class="flex gap-3 mt-4">
        <button
          @click="dismissPrompt"
          class="flex-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          稍后再说
        </button>
        <button
          @click="installPwa"
          class="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Download class="w-4 h-4" />
          安装应用
        </button>
      </div>
    </div>
  </Transition>
</template>
