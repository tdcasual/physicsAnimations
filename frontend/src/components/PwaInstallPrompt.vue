<script setup lang="ts">
import { Download, X } from "lucide-vue-next";
import { onBeforeUnmount, onMounted, ref } from "vue";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
const showPrompt = ref(false);
const isInstalled = ref(false);

function onBeforeInstallPrompt(e: Event) {
  e.preventDefault();
  deferredPrompt.value = e as BeforeInstallPromptEvent;
  showPrompt.value = true;
}

function onAppInstalled() {
  isInstalled.value = true;
  showPrompt.value = false;
  deferredPrompt.value = null;
}

onMounted(() => {
  if (window.matchMedia("(display-mode: standalone)").matches) {
    isInstalled.value = true;
    return;
  }

  window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.addEventListener("appinstalled", onAppInstalled);
});

onBeforeUnmount(() => {
  window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.removeEventListener("appinstalled", onAppInstalled);
});

async function installPwa() {
  if (!deferredPrompt.value) return;

  deferredPrompt.value.prompt();
  await deferredPrompt.value.userChoice;

  deferredPrompt.value = null;
  showPrompt.value = false;
}

function dismissPrompt() {
  showPrompt.value = false;
  localStorage.setItem("pwa-install-dismissed", Date.now().toString());
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
      class="fixed right-4 bottom-4 left-4 z-[var(--z-float)] rounded-2xl border border-border bg-card p-4 shadow-2xl md:right-4 md:left-auto md:w-96"
    >
      <div class="flex items-start gap-4">
        <!-- App Icon -->
        <div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary">
          <svg class="h-8 w-8 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke-linecap="round" />
          </svg>
        </div>

        <!-- Content -->
        <div class="min-w-0 flex-1">
          <h3 class="font-semibold text-card-foreground">安装演示工坊</h3>
          <p class="mt-1 text-sm text-muted-foreground">添加到主屏幕，离线也能访问，体验更流畅</p>
        </div>

        <!-- Close Button -->
        <button
          type="button"
          @click="dismissPrompt"
          class="rounded-full p-1 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          aria-label="关闭安装提示"
        >
          <X class="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      <!-- Actions -->
      <div class="mt-4 flex gap-3">
        <button
          type="button"
          @click="dismissPrompt"
          class="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
        >
          稍后再说
        </button>
        <button
          type="button"
          @click="installPwa"
          class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
        >
          <Download class="h-4 w-4" />
          安装应用
        </button>
      </div>
    </div>
  </Transition>
</template>
