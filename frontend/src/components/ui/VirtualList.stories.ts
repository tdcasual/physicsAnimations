import type { Meta, StoryObj } from '@storybook/vue3'
import { ref } from 'vue'
import VirtualList from './VirtualList.vue'

interface Item {
  id: string
  name: string
  description: string
}

// 生成大量测试数据
function generateItems(count: number): Item[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    name: `项目 ${i + 1}`,
    description: `这是项目 ${i + 1} 的描述文本，用于测试虚拟滚动性能。`,
  }))
}

const meta: Meta<typeof VirtualList<Item>> = {
  title: 'UI/VirtualList',
  component: VirtualList,
  tags: ['autodocs'],
  argTypes: {
    items: {
      control: 'object',
      description: '列表数据',
    },
    itemHeight: {
      control: 'number',
      description: '每项高度（像素）',
    },
    buffer: {
      control: 'number',
      description: '缓冲区大小',
    },
    height: {
      control: 'number',
      description: '列表高度',
    },
    selectedId: {
      control: 'text',
      description: '选中项 ID',
    },
  },
  args: {
    items: generateItems(1000),
    itemHeight: 80,
    buffer: 3,
    height: 400,
    selectedId: null,
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: args => ({
    components: { VirtualList },
    setup() {
      const selectedId = ref<string | null>(null)

      function handleSelect(item: Item) {
        selectedId.value = item.id
      }

      return { args, selectedId, handleSelect }
    },
    template: `
      <VirtualList
        v-bind="args"
        v-model:selected-id="selectedId"
        @select="handleSelect"
      >
        <template #default="{ item, selected }">
          <div :style="{ padding: '16px', background: selected ? '#e0f2fe' : 'transparent' }">
            <div style="font-weight: 600; margin-bottom: 4px;">{{ item.name }}</div>
            <div style="font-size: 13px; color: #6b7280;">{{ item.description }}</div>
          </div>
        </template>
      </VirtualList>
      <p style="margin-top: 12px; font-size: 13px; color: #6b7280;">
        共 {{ args.items.length }} 项，实际只渲染可视区域
      </p>
    `,
  }),
}

export const LargeDataset: Story = {
  args: {
    items: generateItems(10000),
    itemHeight: 60,
    height: 500,
  },
  render: args => ({
    components: { VirtualList },
    setup() {
      return { args }
    },
    template: `
      <VirtualList v-bind="args">
        <template #default="{ item }">
          <div :style="{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }">
            <span style="width: 60px; color: #9ca3af; font-size: 12px;">#{{ item.id }}</span>
            <span style="font-weight: 500;">{{ item.name }}</span>
          </div>
        </template>
      </VirtualList>
      <p style="margin-top: 12px; font-size: 13px; color: #6b7280;">
        10,000 项数据，虚拟滚动保持流畅
      </p>
    `,
  }),
}

export const WithScrollEnd: Story = {
  args: {
    items: generateItems(50),
    itemHeight: 80,
    height: 300,
  },
  render: args => ({
    components: { VirtualList },
    setup() {
      const message = ref('滚动到底部触发事件')

      function handleScrollEnd() {
        message.value = '已滚动到底部！' + new Date().toLocaleTimeString()
      }

      return { args, message, handleScrollEnd }
    },
    template: `
      <VirtualList v-bind="args" @scroll-end="handleScrollEnd">
        <template #default="{ item }">
          <div :style="{ padding: '16px' }">
            <div style="font-weight: 600;">{{ item.name }}</div>
            <div style="font-size: 13px; color: #6b7280;">{{ item.description }}</div>
          </div>
        </template>
      </VirtualList>
      <p style="margin-top: 12px; font-size: 13px; color: #dc2626;">
        {{ message }}
      </p>
    `,
  }),
}

export const CustomHeight: Story = {
  args: {
    items: generateItems(100),
    itemHeight: 120,
    height: 600,
  },
  render: args => ({
    components: { VirtualList },
    setup() {
      return { args }
    },
    template: `
      <VirtualList v-bind="args">
        <template #default="{ item }">
          <div :style="{ padding: '20px', height: '100%', boxSizing: 'border-box' }">
            <div style="font-weight: 600; font-size: 16px; margin-bottom: 8px;">{{ item.name }}</div>
            <div style="font-size: 14px; color: #6b7280; line-height: 1.5;">
              {{ item.description }}
            </div>
          </div>
        </template>
      </VirtualList>
    `,
  }),
}
