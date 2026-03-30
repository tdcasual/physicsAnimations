/**
 * 图片懒加载指令
 *
 * 使用 IntersectionObserver 实现图片懒加载
 * 支持占位图、加载状态、错误处理
 *
 * @example
 * <img v-lazy="imageUrl" src="placeholder.svg" />
 * <img v-lazy="{ src: imageUrl, placeholder: 'placeholder.svg', error: 'error.svg' }" />
 */

import type { DirectiveBinding, ObjectDirective } from 'vue'

interface LazyOptions {
  src: string
  placeholder?: string
  error?: string
}

type LazyBinding = string | LazyOptions

interface LazyElement extends HTMLImageElement {
  _lazyObserver?: IntersectionObserver
  _lazyLoaded?: boolean
  _lazyOptions?: LazyOptions
}

// 默认配置
const defaultConfig = {
  rootMargin: '50px 0px', // 提前 50px 加载
  threshold: 0.01,
}

// 加载图片
function loadImage(el: LazyElement, options: LazyOptions) {
  if (el._lazyLoaded) return

  const img = new Image()

  img.onload = () => {
    el.src = options.src
    el.classList.add('lazy-loaded')
    el.classList.remove('lazy-loading')
    el._lazyLoaded = true
  }

  img.onerror = () => {
    if (options.error) {
      el.src = options.error
    }
    el.classList.add('lazy-error')
    el.classList.remove('lazy-loading')
    el._lazyLoaded = true
  }

  img.src = options.src
  el.classList.add('lazy-loading')
}

// 创建 IntersectionObserver
function createObserver(el: LazyElement, options: LazyOptions) {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadImage(el, options)
          observer.unobserve(el)
        }
      })
    },
    {
      rootMargin: defaultConfig.rootMargin,
      threshold: defaultConfig.threshold,
    }
  )

  el._lazyObserver = observer
  observer.observe(el)
}

// 解析绑定值
function parseBinding(binding: DirectiveBinding<LazyBinding>): LazyOptions {
  if (typeof binding.value === 'string') {
    return { src: binding.value }
  }
  return binding.value
}

export const vLazy: ObjectDirective<LazyElement, LazyBinding> = {
  mounted(el, binding) {
    const options = parseBinding(binding)
    el._lazyOptions = options

    // 设置占位图
    if (options.placeholder && !el.src) {
      el.src = options.placeholder
    }

    // 添加基础样式
    el.classList.add('lazy-image')

    // 创建观察器
    if ('IntersectionObserver' in window) {
      createObserver(el, options)
    } else {
      // 降级：直接加载
      loadImage(el, options)
    }
  },

  updated(el, binding) {
    const newOptions = parseBinding(binding)
    const oldOptions = el._lazyOptions

    // 如果 src 变化，重新加载
    if (oldOptions?.src !== newOptions.src) {
      el._lazyLoaded = false
      el._lazyOptions = newOptions

      // 清除旧的观察器
      if (el._lazyObserver) {
        el._lazyObserver.disconnect()
      }

      // 重新创建观察器
      if ('IntersectionObserver' in window) {
        createObserver(el, newOptions)
      } else {
        loadImage(el, newOptions)
      }
    }
  },

  unmounted(el) {
    if (el._lazyObserver) {
      el._lazyObserver.disconnect()
      delete el._lazyObserver
    }
  },
}

// 全局样式
export const lazyLoadStyles = `
  .lazy-image {
    opacity: 0.8;
    transition: opacity 300ms ease;
  }

  .lazy-image.lazy-loaded {
    opacity: 1;
  }

  .lazy-image.lazy-loading {
    opacity: 0.5;
  }

  .lazy-image.lazy-error {
    opacity: 1;
  }
`

export default vLazy
