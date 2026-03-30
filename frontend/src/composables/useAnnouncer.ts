import { nextTick } from 'vue'

type AnnouncePriority = 'polite' | 'assertive'

/**
 * 屏幕阅读器通知
 *
 * 向屏幕阅读器发送通知消息
 *
 * @example
 * const { announce } = useAnnouncer()
 * announce('操作成功', 'polite')
 * announce('错误：保存失败', 'assertive')
 */
export function useAnnouncer() {
  // 创建或获取 announcer 元素
  function getAnnouncer(priority: AnnouncePriority): HTMLElement {
    const id = `aria-announcer-${priority}`
    let element = document.getElementById(id)

    if (!element) {
      element = document.createElement('div')
      element.id = id
      element.setAttribute('aria-live', priority)
      element.setAttribute('aria-atomic', 'true')
      element.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      `
      document.body.appendChild(element)
    }

    return element
  }

  /**
   * 发送通知
   * @param message 通知消息
   * @param priority 优先级: 'polite'(礼貌) 或 'assertive'(紧急)
   */
  async function announce(message: string, priority: AnnouncePriority = 'polite') {
    const announcer = getAnnouncer(priority)

    // 清空当前内容
    announcer.textContent = ''

    // 等待 DOM 更新
    await nextTick()

    // 设置新消息
    announcer.textContent = message
  }

  /**
   * 清除通知
   * @param priority 优先级，不指定则清除所有
   */
  function clear(priority?: AnnouncePriority) {
    if (priority) {
      const announcer = document.getElementById(`aria-announcer-${priority}`)
      if (announcer) announcer.textContent = ''
    } else {
      ;['polite', 'assertive'].forEach(p => {
        const announcer = document.getElementById(`aria-announcer-${p}`)
        if (announcer) announcer.textContent = ''
      })
    }
  }

  return {
    announce,
    clear,
  }
}

export default useAnnouncer
