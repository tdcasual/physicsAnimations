export function resolveTopbarModeClass(currentPath: string): string {
  if (currentPath.startsWith('/admin') || currentPath === '/login') {
    return 'topbar--admin'
  }
  if (currentPath.startsWith('/viewer')) {
    return 'topbar--viewer'
  }
  if (currentPath.startsWith('/library')) {
    return 'topbar--library'
  }
  return 'topbar--catalog'
}

export type TopbarSearchState = {
  kind: 'input' | 'return-link'
  target: string | null
  placeholder: string
}

export function resolveTopbarSearchState(currentPath: string): TopbarSearchState {
  if (currentPath === '/') {
    return {
      kind: 'input',
      target: null,
      placeholder: '搜索演示 / 分类',
    }
  }

  return {
    kind: 'return-link',
    target: '/',
    placeholder: '回目录搜索演示',
  }
}
