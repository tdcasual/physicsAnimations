import { onBeforeUnmount } from "vue";

export function useRouteAbortController() {
  const controller = new AbortController();

  onBeforeUnmount(() => {
    controller.abort();
  });

  return controller;
}
