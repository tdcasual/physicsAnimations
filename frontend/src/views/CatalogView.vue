<script setup lang="ts">
  import { computed } from 'vue'
  import { RouterLink } from 'vue-router'
  import { PCard, PEmpty } from '../components/ui'
  import { useCatalogViewState } from '../features/catalog/useCatalogViewState'
  import { toggleFavoriteDemo, isFavoriteDemo } from '../features/catalog/favorites'
  import { normalizePublicUrl } from '../features/catalog/catalogLink'

  const {
    loading,
    loadError,
    view,
    groups,
    categories,
    hasCatalogGroups,
    libraryHighlights,
    favoriteIds,
    selectGroup,
    selectCategory,
    refresh,
    query: searchQuery,
  } = useCatalogViewState()

  const activeGroup = computed(() => groups.value.find(g => g.id === view.value.activeGroupId))

  function handleToggleFavorite(itemId: string) {
    toggleFavoriteDemo(itemId)
    refresh()
  }

  function getItemHref(item: any) {
    return item.href || `/viewer/${item.id}`
  }

  function isExternalLink(href: string) {
    return href.startsWith('http')
  }
</script>

<template>
  <div class="catalog-view">
    <!-- 加载状态 -->
    <div v-if="loading" class="state-loading">
      <div class="spinner" />
      <span>正在加载演示内容...</span>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="loadError" class="state-error">
      <PEmpty description="加载失败，请刷新页面重试">
        <template #action>
          <button class="retry-btn" @click="refresh">重新加载</button>
        </template>
      </PEmpty>
    </div>

    <!-- 内容 -->
    <template v-else>
      <!-- Hero 区域 -->
      <section class="catalog-hero">
        <div class="hero-content">
          <h1 class="hero-title">高中物理动画演示</h1>
          <p class="hero-subtitle"> 涵盖力学、电磁学、热学、光学、近代物理等多个领域 </p>
          <div class="hero-stats">
            <span class="stat">{{ view.items.length }} 个演示</span>
            <span class="stat-dot">·</span>
            <span class="stat">{{ groups.length }} 个分组</span>
          </div>
        </div>
      </section>

      <!-- 导航栏 -->
      <nav class="catalog-nav">
        <!-- 分组切换 -->
        <div class="nav-groups">
          <button
            v-for="group in groups"
            :key="group.id"
            class="nav-tab"
            :class="{ active: group.id === view.activeGroupId }"
            @click="selectGroup(group.id)"
          >
            {{ group.title }}
          </button>
        </div>

        <!-- 分类筛选 -->
        <div class="nav-categories">
          <button
            class="nav-tab"
            :class="{ active: view.activeCategoryId === 'all' }"
            @click="selectCategory('all')"
          >
            全部
          </button>
          <button
            v-for="category in categories"
            :key="category.id"
            class="nav-tab"
            :class="{ active: category.id === view.activeCategoryId }"
            @click="selectCategory(category.id)"
          >
            {{ category.title }}
            <span v-if="category.items.length" class="tab-count">{{ category.items.length }}</span>
          </button>
        </div>
      </nav>

      <!-- 内容列表 -->
      <div class="catalog-content">
        <PEmpty v-if="view.items.length === 0" description="暂无符合条件的演示" size="lg">
          <template #action>
            <button
              class="clear-btn"
              @click="
                searchQuery = ''
                selectCategory('all')
              "
            >
              清除筛选
            </button>
          </template>
        </PEmpty>

        <div v-else class="items-grid">
          <PCard v-for="item in view.items" :key="item.id" hoverable class="item-card">
            <RouterLink
              v-if="!isExternalLink(getItemHref(item))"
              :to="getItemHref(item)"
              class="item-link"
            >
              <div class="item-thumbnail">
                <img
                  v-if="item.thumbnail"
                  :src="normalizePublicUrl(item.thumbnail)"
                  :alt="item.title"
                  loading="lazy"
                />
                <div v-else class="thumbnail-placeholder">
                  {{ item.title.slice(0, 2) }}
                </div>
              </div>
              <div class="item-info">
                <h3 class="item-title">{{ item.title }}</h3>
                <p v-if="item.description" class="item-desc">{{ item.description }}</p>
              </div>
            </RouterLink>

            <a v-else :href="getItemHref(item)" target="_blank" rel="noopener" class="item-link">
              <div class="item-thumbnail">
                <img
                  v-if="item.thumbnail"
                  :src="normalizePublicUrl(item.thumbnail)"
                  :alt="item.title"
                  loading="lazy"
                />
                <div v-else class="thumbnail-placeholder">{{ item.title.slice(0, 2) }}</div>
                <span class="external-badge">外部</span>
              </div>
              <div class="item-info">
                <h3 class="item-title">{{ item.title }}</h3>
                <p v-if="item.description" class="item-desc">{{ item.description }}</p>
              </div>
            </a>

            <button
              class="favorite-btn"
              :class="{ active: isFavoriteDemo(item.id) }"
              @click.prevent="handleToggleFavorite(item.id)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                />
              </svg>
            </button>
          </PCard>
        </div>
      </div>

      <!-- 资源库推荐 -->
      <section v-if="libraryHighlights.length" class="catalog-library">
        <h2 class="section-title">资源库精选</h2>
        <div class="items-grid">
          <PCard
            v-for="folder in libraryHighlights"
            :key="folder.id"
            hoverable
            class="item-card folder-card"
          >
            <RouterLink :to="`/library/folder/${folder.id}`" class="item-link">
              <div class="item-thumbnail">
                <img
                  v-if="folder.coverPath"
                  :src="normalizePublicUrl(folder.coverPath)"
                  :alt="folder.name"
                  loading="lazy"
                />
                <div v-else class="thumbnail-placeholder folder-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"
                    />
                  </svg>
                </div>
              </div>
              <div class="item-info">
                <h3 class="item-title">{{ folder.name }}</h3>
                <p class="item-desc">{{ folder.categoryId }} · 资源文件夹</p>
              </div>
            </RouterLink>
          </PCard>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
  .catalog-view {
    padding-bottom: var(--space-10);
  }

  /* Hero */
  .catalog-hero {
    text-align: center;
    padding: var(--space-10) 0 var(--space-8);
    margin-bottom: var(--space-6);
  }

  .hero-title {
    font-size: clamp(var(--text-3xl), 5vw, 40px);
    font-weight: var(--font-bold);
    background: linear-gradient(135deg, var(--text-primary), var(--primary-default));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 var(--space-4);
    letter-spacing: -0.02em;
  }

  .hero-subtitle {
    font-size: var(--text-lg);
    color: var(--text-secondary);
    line-height: var(--leading-relaxed);
    margin: 0 0 var(--space-4);
  }

  .hero-stats {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-size: var(--text-sm);
    color: var(--text-tertiary);
  }

  .stat-dot {
    opacity: 0.5;
  }

  /* 导航 */
  .catalog-nav {
    position: sticky;
    top: 64px;
    z-index: var(--z-sticky);
    background: var(--surface-bg);
    padding: var(--space-4) 0;
    margin-bottom: var(--space-6);
    border-bottom: 1px solid var(--border-subtle);
  }

  .nav-groups {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
    overflow-x: auto;
    scrollbar-width: none;
  }

  .nav-groups::-webkit-scrollbar {
    display: none;
  }

  .nav-categories {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .nav-tab {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border: 1px solid transparent;
    border-radius: var(--radius-full);
    background: transparent;
    font-size: var(--text-sm);
    color: var(--text-secondary);
    cursor: pointer;
    white-space: nowrap;
    transition: all var(--duration-fast) var(--ease-smooth);
  }

  .nav-tab:hover {
    background: var(--surface-panel);
    color: var(--text-primary);
  }

  .nav-tab.active {
    background: var(--primary-default);
    color: white;
    border-color: var(--primary-default);
  }

  .tab-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    background: oklch(100% 0 0 / 0.2);
    border-radius: var(--radius-full);
    font-size: 11px;
    font-weight: var(--font-medium);
  }

  /* 内容网格 */
  .catalog-content {
    margin-bottom: var(--space-10);
  }

  .items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: var(--space-4);
  }

  .item-card {
    position: relative;
    overflow: hidden;
  }

  .item-card :deep(.p-card) {
    height: 100%;
    padding: 0;
    overflow: hidden;
  }

  .item-link {
    display: flex;
    flex-direction: column;
    text-decoration: none;
    color: inherit;
    height: 100%;
  }

  .item-thumbnail {
    position: relative;
    aspect-ratio: 16 / 10;
    overflow: hidden;
    background: var(--surface-panel);
  }

  .item-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform var(--duration-slow) var(--ease-smooth);
  }

  .item-card:hover .item-thumbnail img {
    transform: scale(1.05);
  }

  .thumbnail-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-3xl);
    font-weight: var(--font-bold);
    color: var(--text-quaternary);
    background: linear-gradient(135deg, var(--surface-panel), var(--surface-page));
  }

  .folder-icon {
    color: var(--primary-default);
  }

  .folder-icon svg {
    width: 48px;
    height: 48px;
    opacity: 0.5;
  }

  .external-badge {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    padding: 2px 8px;
    background: var(--surface-card);
    color: var(--text-secondary);
    font-size: var(--text-xs);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-sm);
  }

  .item-info {
    padding: var(--space-4);
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .item-title {
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    margin: 0 0 var(--space-2);
    line-height: var(--leading-snug);
  }

  .item-desc {
    font-size: var(--text-sm);
    color: var(--text-tertiary);
    margin: 0;
    line-height: var(--leading-relaxed);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* 收藏按钮 */
  .favorite-btn {
    position: absolute;
    top: var(--space-3);
    left: var(--space-3);
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 50%;
    background: var(--surface-card);
    color: var(--text-quaternary);
    cursor: pointer;
    opacity: 0;
    transform: scale(0.8);
    transition: all var(--duration-fast) var(--ease-smooth);
    box-shadow: var(--shadow-md);
    z-index: 2;
  }

  .item-card:hover .favorite-btn {
    opacity: 1;
    transform: scale(1);
  }

  .favorite-btn:hover {
    color: var(--danger-9);
    transform: scale(1.1) !important;
  }

  .favorite-btn.active {
    opacity: 1;
    transform: scale(1);
    color: var(--danger-9);
  }

  .favorite-btn svg {
    width: 20px;
    height: 20px;
  }

  /* 资源库区域 */
  .catalog-library {
    padding-top: var(--space-8);
    border-top: 1px solid var(--border-subtle);
  }

  .section-title {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--text-primary);
    margin: 0 0 var(--space-5);
  }

  /* 加载状态 */
  .state-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-12);
    color: var(--text-tertiary);
    gap: var(--space-4);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-default);
    border-top-color: var(--primary-default);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .retry-btn,
  .clear-btn {
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    background: var(--surface-card);
    color: var(--text-primary);
    font-size: var(--text-sm);
    cursor: pointer;
    transition: all var(--duration-fast) var(--ease-smooth);
  }

  .retry-btn:hover,
  .clear-btn:hover {
    border-color: var(--primary-default);
    color: var(--primary-default);
  }

  /* 响应式 */
  @media (max-width: 768px) {
    .catalog-hero {
      padding: var(--space-6) 0;
    }

    .hero-title {
      font-size: var(--text-2xl);
    }

    .hero-subtitle {
      font-size: var(--text-base);
    }

    .items-grid {
      grid-template-columns: 1fr;
    }

    .favorite-btn {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
