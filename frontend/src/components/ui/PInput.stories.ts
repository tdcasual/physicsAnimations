import type { Meta, StoryObj } from '@storybook/vue3'
import { ref } from 'vue'
import PInput from './PInput.vue'

const meta: Meta<typeof PInput> = {
  title: 'Components/PInput',
  component: PInput,
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
    type: {
      control: 'select',
      options: ['text', 'password', 'email', 'number'],
      description: '输入类型',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: '输入框尺寸',
    },
    error: {
      control: 'text',
      description: '错误提示',
    },
    disabled: {
      control: 'boolean',
      description: '禁用状态',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    modelValue: '',
    placeholder: '请输入内容',
  },
}

export const WithValue: Story = {
  args: {
    modelValue: 'Hello World',
    placeholder: '请输入内容',
  },
}

export const Small: Story = {
  args: {
    modelValue: '',
    size: 'sm',
    placeholder: '小尺寸输入框',
  },
}

export const Medium: Story = {
  args: {
    modelValue: '',
    size: 'md',
    placeholder: '中尺寸输入框',
  },
}

export const Large: Story = {
  args: {
    modelValue: '',
    size: 'lg',
    placeholder: '大尺寸输入框',
  },
}

export const Password: Story = {
  args: {
    modelValue: 'password123',
    type: 'password',
    placeholder: '请输入密码',
  },
}

export const Email: Story = {
  args: {
    modelValue: 'user@example.com',
    type: 'email',
    placeholder: '请输入邮箱',
  },
}

export const WithError: Story = {
  args: {
    modelValue: 'invalid',
    error: '请输入有效的内容',
    placeholder: '请输入内容',
  },
}

export const Disabled: Story = {
  args: {
    modelValue: '禁用内容',
    disabled: true,
  },
}

export const AllStates: Story = {
  render: () => ({
    components: { PInput },
    setup() {
      const value1 = ref('')
      const value2 = ref('')
      const value3 = ref('')
      const value4 = ref('禁用内容')
      return { value1, value2, value3, value4 }
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px; width: 300px;">
        <div>
          <div style="margin-bottom: 8px; color: #666;">Normal</div>
          <PInput v-model="value1" placeholder="正常状态" />
        </div>
        <div>
          <div style="margin-bottom: 8px; color: #666;">With Error</div>
          <PInput v-model="value2" placeholder="错误状态" error="请输入有效内容" />
        </div>
        <div>
          <div style="margin-bottom: 8px; color: #666;">Disabled</div>
          <PInput v-model="value4" disabled />
        </div>
      </div>
    `,
  }),
}

export const AllSizes: Story = {
  render: () => ({
    components: { PInput },
    setup() {
      const value1 = ref('')
      const value2 = ref('')
      const value3 = ref('')
      return { value1, value2, value3 }
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px; width: 300px;">
        <PInput v-model="value1" size="sm" placeholder="Small" />
        <PInput v-model="value2" size="md" placeholder="Medium" />
        <PInput v-model="value3" size="lg" placeholder="Large" />
      </div>
    `,
  }),
}
