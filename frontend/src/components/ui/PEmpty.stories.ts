import type { Meta, StoryObj } from '@storybook/vue3'
import PEmpty from './PEmpty.vue'
import PButton from './PButton.vue'

const meta: Meta<typeof PEmpty> = {
  title: 'Components/PEmpty',
  component: PEmpty,
  tags: ['autodocs'],
  argTypes: {
    description: {
      control: 'text',
      description: '描述文本',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: '尺寸',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    description: '暂无数据',
    size: 'md',
  },
}

export const Small: Story = {
  args: {
    description: '没有内容',
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    description: '这里什么都没有',
    size: 'lg',
  },
}

export const CustomDescription: Story = {
  args: {
    description: '搜索不到相关内容',
    size: 'md',
  },
}

export const WithAction: Story = {
  render: () => ({
    components: { PEmpty, PButton },
    template: `
      <PEmpty description="暂无数据">
        <template #action>
          <PButton variant="primary">创建新项目</PButton>
        </template>
      </PEmpty>
    `,
  }),
}

export const SearchEmpty: Story = {
  render: () => ({
    components: { PEmpty, PButton },
    template: `
      <PEmpty description="未找到匹配的结果">
        <template #image>
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 64px; height: 64px; color: #999;">
            <circle cx="28" cy="28" r="16" stroke="currentColor" stroke-width="2"/>
            <path d="M40 40L56 56" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </template>
        <template #action>
          <PButton variant="ghost">清除搜索</PButton>
        </template>
      </PEmpty>
    `,
  }),
}

export const ErrorEmpty: Story = {
  render: () => ({
    components: { PEmpty, PButton },
    template: `
      <PEmpty description="加载失败，请重试">
        <template #image>
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 64px; height: 64px; color: #ff4d4f;">
            <circle cx="32" cy="32" r="24" stroke="currentColor" stroke-width="2"/>
            <path d="M24 24L40 40M40 24L24 40" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </template>
        <template #action>
          <PButton variant="primary">重新加载</PButton>
        </template>
      </PEmpty>
    `,
  }),
}

export const AllSizes: Story = {
  render: () => ({
    components: { PEmpty, PButton },
    template: `
      <div style="display: flex; flex-direction: column; gap: 32px; align-items: center;">
        <PEmpty size="sm" description="小尺寸空状态" />
        <PEmpty size="md" description="中尺寸空状态" />
        <PEmpty size="lg" description="大尺寸空状态" />
      </div>
    `,
  }),
}

export const InContext: Story = {
  render: () => ({
    components: { PEmpty, PButton },
    template: `
      <div style="border: 1px solid #e8e8e8; border-radius: 8px; background: #fafafa;">
        <div style="padding: 16px; border-bottom: 1px solid #e8e8e8; font-weight: bold;">
          数据列表
        </div>
        <PEmpty description="暂无数据，点击创建" size="md">
          <template #action>
            <PButton variant="primary">+ 新建</PButton>
          </template>
        </PEmpty>
      </div>
    `,
  }),
}
