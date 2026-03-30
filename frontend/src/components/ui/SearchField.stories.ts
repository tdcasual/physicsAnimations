import type { Meta, StoryObj } from '@storybook/vue3'
import SearchField from './SearchField.vue'

const meta: Meta<typeof SearchField> = {
  title: 'UI/SearchField',
  component: SearchField,
  tags: ['autodocs'],
  argTypes: {
    modelValue: {
      control: 'text',
      description: '输入值',
    },
    placeholder: {
      control: 'text',
      description: '占位符文本',
    },
    disabled: {
      control: 'boolean',
      description: '是否禁用',
    },
    autofocus: {
      control: 'boolean',
      description: '是否自动聚焦',
    },
  },
  args: {
    modelValue: '',
    placeholder: '搜索...',
    disabled: false,
    autofocus: false,
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    modelValue: '',
    placeholder: '搜索内容...',
  },
}

export const WithValue: Story = {
  args: {
    modelValue: '物理实验',
    placeholder: '搜索...',
  },
}

export const Disabled: Story = {
  args: {
    modelValue: '',
    placeholder: '搜索...',
    disabled: true,
  },
}

export const CustomPlaceholder: Story = {
  args: {
    modelValue: '',
    placeholder: '搜索演示项目...',
  },
}
