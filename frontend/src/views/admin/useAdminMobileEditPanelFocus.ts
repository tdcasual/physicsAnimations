import { nextTick, type Ref } from "vue";

type CreateAdminMobileEditPanelFocusParams = {
  panelRef: Ref<HTMLElement | null>;
  maxWidth?: number;
  isMobileViewport?: () => boolean;
};

function createDefaultViewportMatcher(maxWidth: number) {
  return function isMobileViewport() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia(`(max-width: ${maxWidth}px)`).matches;
  };
}

export function createAdminMobileEditPanelFocus(params: CreateAdminMobileEditPanelFocusParams) {
  const { panelRef, maxWidth = 1024, isMobileViewport = createDefaultViewportMatcher(maxWidth) } = params;

  async function focusEditPanel() {
    if (!isMobileViewport()) return false;

    await nextTick();

    if (!panelRef.value) return false;
    panelRef.value.scrollIntoView({ block: "start", inline: "nearest" });
    return true;
  }

  return {
    focusEditPanel,
  };
}
