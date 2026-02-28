import { computed, ref, type Ref } from "vue";

interface UsePagedAdminListOptions {
  pageSize?: number;
}

interface ApplyPageResultOptions {
  reset: boolean;
}

interface PageResult<T> {
  items?: T[];
  page?: number;
  total?: number;
}

export function usePagedAdminList<T>({ pageSize = 24 }: UsePagedAdminListOptions = {}) {
  const items: Ref<T[]> = ref([]);
  const total = ref(0);
  const page = ref(1);
  const latestRequestSeq = ref(0);
  const hasMore = computed(() => items.value.length < total.value);

  function nextRequestSeq(): number {
    latestRequestSeq.value += 1;
    return latestRequestSeq.value;
  }

  function isLatestRequest(seq: number): boolean {
    return seq === latestRequestSeq.value;
  }

  function applyPageResult(result: PageResult<T> | null | undefined, { reset }: ApplyPageResultOptions) {
    const nextPage = reset ? 1 : page.value + 1;
    const received = Array.isArray(result?.items) ? result.items : [];
    page.value = Number(result?.page || nextPage);
    total.value = Number(result?.total || 0);
    items.value = reset ? received : [...items.value, ...received];
  }

  function resetList() {
    items.value = [];
    total.value = 0;
    page.value = 1;
  }

  return {
    items,
    total,
    page,
    pageSize,
    hasMore,
    nextRequestSeq,
    isLatestRequest,
    applyPageResult,
    resetList,
  };
}
