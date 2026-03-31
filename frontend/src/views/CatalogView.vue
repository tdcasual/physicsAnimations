<script setup lang="ts">
  import { computed } from 'vue'
  import { RouterLink } from 'vue-router'
  import { PCard, PEmpty, PErrorState } from '../components/ui'
  import { useCatalogViewState } from '../features/catalog/useCatalogViewState'
  import { toggleFavoriteDemo, isFavoriteDemo } from '../features/catalog/favorites'
  import { normalizePublicUrl } from '../features/catalog/catalogLink'
  import type { CatalogItem } from '../features/catalog/types'

  const { loading, loadError, view, groups, categories, libraryHighlights, favoriteIds, selectGroup, selectCategory, refresh, query: searchQuery } = useCatalogViewState()
  const activeGroup = computed(() => groups.value.find(g => g.id === view.value.activeGroupId))

  function handleToggleFavorite(itemId: string) {
    toggleFavoriteDemo(itemId)
    refresh()
  }
  function getItemHref(item: CatalogItem) { return item.href || `/viewer/${item.id}` }
  function isExternalLink(href: string) { return href.startsWith('http') }
  
  // 获取分组对应的物理学科图标
  function getGroupIcon(groupId: string): string {
    const iconMap: Record<string, string> = {
      'mechanics': '⚙️',
      'electromagnetism': '⚡',
      'thermodynamics': '🌡️',
      'optics': '🔭',
      'modern': '⚛️',
      'all': '📚'
    }
    return iconMap[groupId] || '📐'
  }
  
  // 获取项目对应的学科标签
  function getSubjectTag(item: CatalogItem): { name: string; class: string } | null {
    const groupId = item.groupId || 'mechanics'
    const tagMap: Record<string, { name: string; class: string }> = {
      'mechanics': { name: '力学', class: 'tag-mechanics' },
      'electromagnetism': { name: '电磁学', class: 'tag-electromagnetism' },
      'thermodynamics': { name: '热学', class: 'tag-thermodynamics' },
      'optics': { name: '光学', class: 'tag-optics' },
      'modern': { name: '近代物理', class: 'tag-modern' }
    }
    return tagMap[groupId] || null
  }
</script>

<template>
  <div class="catalog-view">
    <div v-if="loading" class="state-loading">
      <div class="spinner" />
      <span>正在加载演示内容...</span>
    </div>
    <div v-else-if="loadError" class="state-error">
      <PErrorState 
        type="network"
        title="内容加载失败"
        description="无法获取演示内容，请检查网络后重试"
        show-retry
        @retry="refresh"
      />
    </div>
    <template v-else>
      <!-- Hero Section -->
      <section class="catalog-hero" :class="{ 'hero-empty': view.items.length === 0 }">
        <div class="hero-content">
          <div class="hero-badge">
            <span class="badge-icon">🔬</span>
            <span class="badge-text">高中物理教学资源平台</span>
          </div>
          <h1 class="hero-title">
            探索<span class="text-gradient">物理</span>的奥秘
          </h1>
          <p class="hero-subtitle">
            高中物理动画演示 - 通过直观的动画演示，深入理解力学、电磁学、热学、光学、近代物理等核心概念
          </p>
          <div class="hero-stats">
            <div class="stat-item">
              <span class="stat-value">{{ view.items.length }}</span>
              <span class="stat-label">演示动画</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-value">{{ groups.length }}</span>
              <span class="stat-label">学科分组</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-value">{{ favoriteIds.size }}</span>
              <span class="stat-label">我的收藏</span>
            </div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="physics-icons">
            <span class="physics-icon icon-1">⚙️</span>
            <span class="physics-icon icon-2">⚡</span>
            <span class="physics-icon icon-3">🌡️</span>
            <span class="physics-icon icon-4">🔭</span>
            <span class="physics-icon icon-5">⚛️</span>
          </div>
        </div>
      </section>

      <!-- Empty State -->
      <section v-if="view.items.length === 0" class="empty-state">
        <div class="empty-illustration">
          <div class="empty-icon">📚</div>
          <div class="empty-orb orb-1"></div>
          <div class="empty-orb orb-2"></div>
          <div class="empty-orb orb-3"></div>
        </div>
        <h2 class="empty-title">演示内容准备中</h2>
        <p class="empty-description">
          当前暂无演示内容。登录管理员账号，开始创建您的第一个物理教学演示。
        </p>
        <div class="empty-actions">
          <RouterLink to="/admin" class="btn btn-primary btn-lg">
            <span>进入管理后台</span>
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </RouterLink>
        </div>
        <div class="empty-features">
          <div class="feature-item">
            <span class="feature-icon">🎬</span>
            <span class="feature-text">添加动画演示</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">📁</span>
            <span class="feature-text">管理资源库</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🏷️</span>
            <span class="feature-text">分类整理内容</span>
          </div>
        </div>
      </section>

      <!-- Navigation -->
      <nav v-else class="catalog-nav">
        <div class="nav-container">
          <div class="nav-row">
            <div class="nav-section">
              <span class="nav-label">分组</span>
              <div class="nav-groups compact">
                <button 
                  v-for="group in groups" 
                  :key="group.id" 
                  class="nav-tab nav-tab--compact" 
                  :class="{ active: group.id === view.activeGroupId }" 
                  @click="selectGroup(group.id)"
                >
                  <span class="tab-icon">{{ getGroupIcon(group.id) }}</span>
                  <span class="tab-text">{{ group.title }}</span>
                </button>
              </div>
            </div>
            <div class="nav-divider"></div>
            <div class="nav-section">
              <span class="nav-label">分类</span>
              <div class="nav-categories compact">
                <button 
                  class="nav-tab nav-tab--compact" 
                  :class="{ active: view.activeCategoryId === 'all' }" 
                  @click="selectCategory('all')"
                >
                  全部
                </button>
                <button 
                  v-for="category in categories" 
                  :key="category.id" 
                  class="nav-tab nav-tab--compact" 
                  :class="{ active: category.id === view.activeCategoryId }" 
                  @click="selectCategory(category.id)"
                >
                  <span class="tab-text">{{ category.title }}</span>
                  <span v-if="category.items.length" class="tab-count">{{ category.items.length }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <!-- Content Grid -->
      <div v-if="view.items.length > 0" class="catalog-content">
        <div class="content-header">
          <h2 class="content-title">
            {{ activeGroup?.title || '全部演示' }}
            <span v-if="view.activeCategoryId !== 'all'" class="content-subtitle">
              · {{ categories.find(c => c.id === view.activeCategoryId)?.title }}
            </span>
          </h2>
          <span class="content-count">共 {{ view.items.length }} 个</span>
        </div>
        
        <PEmpty v-if="view.filteredItems.length === 0" description="暂无符合条件的演示" size="lg">
          <template #action>
            <button class="btn btn-secondary" @click="() => { searchQuery = ''; selectCategory('all') }">
              清除筛选
            </button>
          </template>
        </PEmpty>
        
        <div v-else class="items-grid">
          <PCard v-for="item in view.filteredItems" :key="item.id" hoverable class="item-card">
            <RouterLink v-if="!isExternalLink(getItemHref(item))" :to="getItemHref(item)" class="item-link">
              <div class="item-thumbnail">
                <img v-if="item.thumbnail" :src="normalizePublicUrl(item.thumbnail)" :alt="item.title" loading="lazy" />
                <div v-else class="thumbnail-placeholder">{{ item.title.slice(0, 2) }}</div>
                <span v-if="getSubjectTag(item)" class="item-tag" :class="getSubjectTag(item)?.class">
                  {{ getSubjectTag(item)?.name }}
                </span>
              </div>
              <div class="item-info">
                <h3 class="item-title">{{ item.title }}</h3>
                <p v-if="item.description" class="item-desc">{{ item.description }}</p>
              </div>
            </RouterLink>
            <a v-else :href="getItemHref(item)" target="_blank" rel="noopener" class="item-link">
              <div class="item-thumbnail">
                <img v-if="item.thumbnail" :src="normalizePublicUrl(item.thumbnail)" :alt="item.title" loading="lazy" />
                <div v-else class="thumbnail-placeholder">{{ item.title.slice(0, 2) }}</div>
                <span class="external-badge">外部</span>
                <span v-if="getSubjectTag(item)" class="item-tag" :class="getSubjectTag(item)?.class">
                  {{ getSubjectTag(item)?.name }}
                </span>
              </div>
              <div class="item-info">
                <h3 class="item-title">{{ item.title }}</h3>
                <p v-if="item.description" class="item-desc">{{ item.description }}</p>
              </div>
            </a>
            <button 
              class="favorite-btn" 
              :class="{ active: favoriteIds.has(item.id) }" 
              :aria-label="favoriteIds.has(item.id) ? '取消收藏' : '添加收藏'" 
              :aria-pressed="favoriteIds.has(item.id)" 
              @click.prevent="handleToggleFavorite(item.id)"
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
          </PCard>
        </div>
      </div>

      <!-- Library Highlights -->
      <section v-if="libraryHighlights.length && view.items.length > 0" class="catalog-library">
        <div class="section-header">
          <div class="section-title-group">
            <span class="section-icon">📁</span>
            <h2 class="section-title">资源库精选</h2>
          </div>
          <RouterLink to="/library" class="section-link">
            查看全部
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </RouterLink>
        </div>
        <div class="items-grid">
          <PCard v-for="folder in libraryHighlights" :key="folder.id" hoverable class="item-card folder-card">
            <RouterLink :to="`/library/folder/${folder.id}`" class="item-link">
              <div class="item-thumbnail">
                <img v-if="folder.coverPath" :src="normalizePublicUrl(folder.coverPath)" :alt="folder.name" loading="lazy" />
                <div v-else class="thumbnail-placeholder folder-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
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

<style scoped src="./CatalogView.css"></style>
