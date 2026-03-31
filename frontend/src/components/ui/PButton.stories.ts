import type { Meta, StoryObj } from '@storybook/vue3'
import { fn } from '@storybook/test'
import PButton from './PButton.vue'

const meta: Meta<typeof PButton> = {
  title: 'Components/PButton',
  component: PButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
      description: '按钮样式变体',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: '按钮尺寸',
    },
    loading: {
      control: 'boolean',
      description: '加载状态',
    },
    disabled: {
      control: 'boolean',
      description: '禁用状态',
    },
    onClick: { action: 'clicked' },
  },
  args: {
    onClick: fn(),
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    default: '主要按钮',
  },
}

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    size: 'md',
    default: '次要按钮',
  },
}

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    size: 'md',
    default: '幽灵按钮',
  },
}

export const Danger: Story = {
  args: {
    variant: 'danger',
    size: 'md',
    default: '危险按钮',
  },
}

export const Small: Story = {
  args: {
    variant: 'primary',
    size: 'sm',
    default: '小按钮',
  },
}

export const Large: Story = {
  args: {
    variant: 'primary',
    size: 'lg',
    default: '大按钮',
  },
}

export const Loading: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    loading: true,
    default: '加载中',
  },
}

export const Disabled: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    disabled: true,
    default: '禁用按钮',
  },
}

export const AllVariants: Story = {
  render: () => ({
    components: { PButton },
    template: `
      <div style="display: flex; gap: 16px; flex-wrap: wrap;">
        <PButton variant="primary">Primary</PButton>
        <PButton variant="secondary">Secondary</PButton>
        <PButton variant="ghost">Ghost</PButton>
        <PButton variant="danger">Danger</PButton>
      </div>
    `,
  }),
}

export const AllSizes: Story = {
  render: () => ({
    components: { PButton },
    template: `
      <div style="display: flex; gap: 16px; align-items: center;">
        <PButton size="sm">Small</PButton>
        <PButton size="md">Medium</PButton>
        <PButton size="lg">Large</PButton>
      </div>
    `,
  }),
}

export const AllStates: Story = {
  render: () => ({
    components: { PButton },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="display: flex; gap: 16px;">
          <PButton variant="primary">Normal</PButton>
          <PButton variant="primary" loading>Loading</PButton>
          <PButton variant="primary" disabled>Disabled</PButton>
        </div>
        <div style="display: flex; gap: 16px;">
          <PButton variant="secondary">Normal</PButton>
          <PButton variant="secondary" loading>Loading</PButton>
          <PButton variant="secondary" disabled>Disabled</PButton>
        </div>
      </div>
    `,
  }),
}
