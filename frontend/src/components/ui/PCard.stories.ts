import type { Meta, StoryObj } from '@storybook/vue3'
import PCard from './PCard.vue'
import PButton from './PButton.vue'

const meta: Meta<typeof PCard> = {
  title: 'Components/PCard',
  component: PCard,
  tags: ['autodocs'],
  argTypes: {
    hoverable: {
      control: 'boolean',
      description: '是否可悬停',
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
      description: '内边距大小',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    padding: 'md',
    default: '卡片内容',
  },
}

export const Hoverable: Story = {
  args: {
    hoverable: true,
    padding: 'md',
  },
  render: args => ({
    components: { PCard },
    setup() {
      return { args }
    },
    template: `
      <PCard v-bind="args">
        <h3 style="margin: 0 0 8px 0;">可悬停卡片</h3>
        <p style="margin: 0; color: #666;">鼠标悬停查看效果</p>
      </PCard>
    `,
  }),
}

export const PaddingNone: Story = {
  args: {
    padding: 'none',
  },
  render: args => ({
    components: { PCard },
    setup() {
      return { args }
    },
    template: `
      <PCard v-bind="args">
        <div style="background: #f0f0f0; padding: 16px;">无内边距卡片</div>
      </PCard>
    `,
  }),
}

export const PaddingSmall: Story = {
  args: {
    padding: 'sm',
  },
  render: args => ({
    components: { PCard },
    setup() {
      return { args }
    },
    template: `
      <PCard v-bind="args">
        <h4 style="margin: 0;">小内边距</h4>
      </PCard>
    `,
  }),
}

export const PaddingMedium: Story = {
  args: {
    padding: 'md',
  },
  render: args => ({
    components: { PCard },
    setup() {
      return { args }
    },
    template: `
      <PCard v-bind="args">
        <h4 style="margin: 0;">中等内边距</h4>
      </PCard>
    `,
  }),
}

export const PaddingLarge: Story = {
  args: {
    padding: 'lg',
  },
  render: args => ({
    components: { PCard },
    setup() {
      return { args }
    },
    template: `
      <PCard v-bind="args">
        <h4 style="margin: 0;">大内边距</h4>
      </PCard>
    `,
  }),
}

export const CardGrid: Story = {
  render: () => ({
    components: { PCard, PButton },
    template: `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
        <PCard v-for="i in 6" :key="i" hoverable padding="md">
          <h4 style="margin: 0 0 8px 0;">卡片 {{ i }}</h4>
          <p style="margin: 0 0 16px 0; color: #666; font-size: 14px;">
            这是一张可悬停的卡片，点击可以查看详情。
          </p>
          <PButton variant="ghost" size="sm">查看详情</PButton>
        </PCard>
      </div>
    `,
  }),
}

export const ProductCard: Story = {
  render: () => ({
    components: { PCard, PButton },
    template: `
      <div style="display: flex; gap: 16px; flex-wrap: wrap;">
        <PCard v-for="i in 3" :key="i" hoverable padding="none" style="width: 240px;">
          <div style="height: 160px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>
          <div style="padding: 16px;">
            <h4 style="margin: 0 0 8px 0;">产品 {{ i }}</h4>
            <p style="margin: 0 0 16px 0; color: #666; font-size: 14px;">
              产品描述信息
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: bold; color: #667eea;">¥{{ 99 + i * 50 }}</span>
              <PButton variant="primary" size="sm">购买</PButton>
            </div>
          </div>
        </PCard>
      </div>
    `,
  }),
}
