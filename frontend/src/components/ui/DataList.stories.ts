import type { Meta, StoryObj } from '@storybook/vue3'
import DataList from './DataList.vue'

interface Item {
  id: string
  name: string
  description: string
}

const sampleItems: Item[] = [
  { id: '1', name: '牛顿第一定律', description: '惯性定律的描述' },
  { id: '2', name: '牛顿第二定律', description: 'F=ma 的经典力学公式' },
  { id: '3', name: '牛顿第三定律', description: '作用力与反作用力' },
  { id: '4', name: '动量守恒', description: '系统总动量保持不变' },
  { id: '5', name: '能量守恒', description: '能量既不会凭空产生也不会消失' },
]

const meta: Meta<typeof DataList<Item>> = {
  title: 'UI/DataList',
  component: DataList,
  tags: ['autodocs'],
  argTypes: {
    items: {
      control: 'object',
      description: '列表数据',
    },
    selectedId: {
      control: 'text',
      description: '当前选中项 ID',
    },
    loading: {
      control: 'boolean',
      description: '加载状态',
    },
    errorText: {
      control: 'text',
      description: '错误文本',
    },
    total: {
      control: 'number',
      description: '总数',
    },
    hasMore: {
      control: 'boolean',
      description: '是否还有更多',
    },
    query: {
      control: 'text',
      description: '搜索关键词',
    },
    searchPlaceholder: {
      control: 'text',
      description: '搜索占位符',
    },
    emptyText: {
      control: 'text',
      description: '空数据提示',
    },
  },
  args: {
    items: sampleItems,
    selectedId: null,
    loading: false,
    errorText: '',
    total: 5,
    hasMore: false,
    query: '',
    searchPlaceholder: '搜索项目...',
    emptyText: '暂无数据',
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: args => ({
    components: { DataList },
    setup() {
      return { args }
    },
    template: `
      <DataList v-bind="args" style="max-width: 500px;">
        <template #item="{ item, selected }">
          <div :style="{ opacity: selected ? 1 : 0.9 }">
            <div style="font-weight: 600; margin-bottom: 4px;">{{ item.name }}</div>
            <div style="font-size: 13px; color: #6b7280;">{{ item.description }}</div>
          </div>
        </template>
      </DataList>
    `,
  }),
}

export const WithSelection: Story = {
  args: {
    selectedId: '2',
  },
  render: args => ({
    components: { DataList },
    setup() {
      return { args }
    },
    template: `
      <DataList v-bind="args" style="max-width: 500px;">
        <template #item="{ item, selected }">
          <div :style="{ opacity: selected ? 1 : 0.9 }">
            <div style="font-weight: 600; margin-bottom: 4px;">{{ item.name }}</div>
            <div style="font-size: 13px; color: #6b7280;">{{ item.description }}</div>
          </div>
        </template>
      </DataList>
    `,
  }),
}

export const Loading: Story = {
  args: {
    loading: true,
    items: [],
  },
  render: args => ({
    components: { DataList },
    setup() {
      return { args }
    },
    template: `
      <DataList v-bind="args" style="max-width: 500px;" />`,
  }),
}

export const Empty: Story = {
  args: {
    items: [],
    total: 0,
  },
  render: args => ({
    components: { DataList },
    setup() {
      return { args }
    },
    template: `
      <DataList v-bind="args" style="max-width: 500px;" />`,
  }),
}

export const WithError: Story = {
  args: {
    errorText: '加载数据失败，请稍后重试',
  },
  render: args => ({
    components: { DataList },
    setup() {
      return { args }
    },
    template: `
      <DataList v-bind="args" style="max-width: 500px;" />`,
  }),
}

export const WithLoadMore: Story = {
  args: {
    hasMore: true,
    total: 42,
  },
  render: args => ({
    components: { DataList },
    setup() {
      return { args }
    },
    template: `
      <DataList v-bind="args" style="max-width: 500px;">
        <template #item="{ item, selected }">
          <div :style="{ opacity: selected ? 1 : 0.9 }">
            <div style="font-weight: 600; margin-bottom: 4px;">{{ item.name }}</div>
            <div style="font-size: 13px; color: #6b7280;">{{ item.description }}</div>
          </div>
        </template>
      </DataList>
    `,
  }),
}

export const WithSearch: Story = {
  args: {
    query: '牛顿',
  },
  render: args => ({
    components: { DataList },
    setup() {
      return { args }
    },
    template: `
      <DataList v-bind="args" style="max-width: 500px;">
        <template #item="{ item, selected }">
          <div :style="{ opacity: selected ? 1 : 0.9 }">
            <div style="font-weight: 600; margin-bottom: 4px;">{{ item.name }}</div>
            <div style="font-size: 13px; color: #6b7280;">{{ item.description }}</div>
          </div>
        </template>
      </DataList>
    `,
  }),
}
