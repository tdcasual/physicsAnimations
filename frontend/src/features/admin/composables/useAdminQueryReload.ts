import { type Ref, onBeforeUnmount, watch } from "vue";

export function useAdminQueryReload(params: {
  query: Ref<string>;
  reload: (options: { reset: true }) => Promise<unknown> | unknown;
  delayMs?: number;
}) {
  let timer = 0;

  watch(params.query, () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      void params.reload({ reset: true });
    }, params.delayMs ?? 250);
  });

  onBeforeUnmount(() => {
    window.clearTimeout(timer);
  });
}
