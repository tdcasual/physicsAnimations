import { nextTick, type Ref } from "vue";
import { BREAKPOINTS } from "../../../lib/constants";

export type AdminTaxonomyEditorFocusTarget = "group" | "category";

type CreateAdminTaxonomyMobileEditorFocusParams = {
  editorTopRef: Ref<HTMLElement | null>;
  groupEditorRef: Ref<HTMLElement | null>;
  categoryEditorRef: Ref<HTMLElement | null>;
  isMobileViewport?: () => boolean;
};

function isMobileTaxonomyViewport() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(`(max-width: ${BREAKPOINTS.DESKTOP_COMPACT}px)`).matches;
}

export function createAdminTaxonomyMobileEditorFocus(params: CreateAdminTaxonomyMobileEditorFocusParams) {
  const { editorTopRef, groupEditorRef, categoryEditorRef, isMobileViewport = isMobileTaxonomyViewport } = params;

  async function focusEditorTarget(target: AdminTaxonomyEditorFocusTarget) {
    if (!isMobileViewport()) return false;

    await nextTick();

    const destination = (target === "group" ? groupEditorRef.value : categoryEditorRef.value) ?? editorTopRef.value;
    if (!destination) return false;

    destination.scrollIntoView({ block: "start", inline: "nearest" });
    return true;
  }

  return {
    focusEditorTarget,
  };
}
