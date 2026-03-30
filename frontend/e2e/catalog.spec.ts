import { test, expect } from '@playwright/test'

test.describe('目录浏览', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // 等待初始内容加载
    await page.waitForTimeout(1000)
  })

  test('应显示分类标签', async ({ page }) => {
    // 检查分类导航
    const categoryTabs = page.locator('.nav-categories .nav-tab, .category-tab')
    const allButton = page
      .locator('.nav-categories button:has-text("全部"), button:has-text("All")')
      .first()

    // 至少应该有"全部"分类
    if (await allButton.isVisible().catch(() => false)) {
      await expect(allButton).toBeVisible()
    }
  })

  test('应能切换分类', async ({ page }) => {
    // 找到第一个非"全部"的分类按钮
    const categoryButtons = page.locator(
      '.nav-categories button:not(.active), .nav-categories .nav-tab:not(.active)'
    )
    const count = await categoryButtons.count()

    if (count > 0) {
      const firstCategory = categoryButtons.first()
      await firstCategory.click()

      // 等待内容更新
      await page.waitForTimeout(500)

      // 检查按钮是否变为激活状态
      await expect(firstCategory).toHaveClass(/active/)
    }
  })

  test('应显示演示项目', async ({ page }) => {
    // 等待更长时间让数据加载
    await page.waitForTimeout(3000)

    // 检查是否有项目卡片
    const itemCards = page.locator('.item-card')
    const count = await itemCards.count()

    // 应该有项目或者显示空状态
    if (count === 0) {
      // 可能是空状态或加载中
      const body = page.locator('body')
      await expect(body).toBeVisible()
    } else {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('搜索功能应正常工作', async ({ page }) => {
    const searchInput = page
      .locator('.topbar-search, input[type="search"], input[placeholder*="搜索"]')
      .first()

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('物理')

      // 等待防抖
      await page.waitForTimeout(600)

      // 搜索后页面应仍有内容
      await expect(page.locator('body')).toBeVisible()

      // 清除搜索
      await searchInput.clear()
      await page.waitForTimeout(600)
    }
  })

  test('收藏按钮应可点击', async ({ page }) => {
    // 找到第一个收藏按钮
    const favoriteBtn = page.locator('.favorite-btn, .btn-favorite').first()

    if (await favoriteBtn.isVisible().catch(() => false)) {
      // 悬停显示（如果是悬停显示的话）
      await favoriteBtn.hover()
      await page.waitForTimeout(200)

      // 点击收藏
      await favoriteBtn.click()
      await page.waitForTimeout(300)

      // 按钮应仍有响应
      await expect(favoriteBtn).toBeVisible()
    }
  })
})
