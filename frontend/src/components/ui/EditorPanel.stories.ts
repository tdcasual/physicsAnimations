import type { Meta, StoryObj } from '@storybook/vue3'
import EditorPanel from './EditorPanel.vue'

const meta: Meta<typeof EditorPanel> = {
  title: 'UI/EditorPanel',
  component: EditorPanel,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: '面板标题',
    },
    subtitle: {
      control: 'text',
      description: '副标题',
    },
    feedback: {
      control: 'text',
      description: '反馈文本',
    },
    feedbackError: {
      control: 'boolean',
      description: '是否为错误反馈',
    },
    feedbackSuccess: {
      control: 'boolean',
      description: '是否为成功反馈',
    },
    saving: {
      control: 'boolean',
      description: '保存中状态',
    },
    saveText: {
      control: 'text',
      description: '保存按钮文本',
    },
    cancelText: {
      control: 'text',
      description: '取消按钮文本',
    },
    showClose: {
      control: 'boolean',
      description: '是否显示关闭按钮',
    },
  },
  args: {
    title: '编辑项目',
    subtitle: '',
    feedback: '',
    feedbackError: false,
    feedbackSuccess: false,
    saving: false,
    saveText: '保存',
    cancelText: '取消',
    showClose: false,
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: args => ({
    components: { EditorPanel },
    setup() {
      return { args }
    },
    template: `
      <EditorPanel v-bind="args" style="max-width: 400px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <div style="display: grid; gap: 12px;">
          <div>
            <label style="display: block; margin-bottom: 4px; font-size: 14px; color: #374151;">名称</label>
            <input type="text" value="示例项目" style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px;" />
          </div>
          <div>
            <label style="display: block; margin-bottom: 4px; font-size: 14px; color: #374151;">描述</label>
            <textarea style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px; min-height: 80px;">这是一个示例描述</textarea>
          </div>
        </div>
      </EditorPanel>
    `,
  }),
}

export const WithSubtitle: Story = {
  args: {
    title: '编辑分类',
    subtitle: 'ID: category-001',
  },
  render: args => ({
    components: { EditorPanel },
    setup() {
      return { args }
    },
    template: `
      <EditorPanel v-bind="args" style="max-width: 400px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <div>
          <label style="display: block; margin-bottom: 4px; font-size: 14px; color: #374151;">分类名称</label>
          <input type="text" value="力学" style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px;" />
        </div>
      </EditorPanel>
    `,
  }),
}

export const WithSuccessFeedback: Story = {
  args: {
    title: '编辑项目',
    feedback: '保存成功！',
    feedbackSuccess: true,
  },
  render: args => ({
    components: { EditorPanel },
    setup() {
      return { args }
    },
    template: `
      <EditorPanel v-bind="args" style="max-width: 400px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <div>
          <label style="display: block; margin-bottom: 4px; font-size: 14px; color: #374151;">名称</label>
          <input type="text" value="示例项目" style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px;" />
        </div>
      </EditorPanel>
    `,
  }),
}

export const WithErrorFeedback: Story = {
  args: {
    title: '编辑项目',
    feedback: '保存失败，请重试',
    feedbackError: true,
  },
  render: args => ({
    components: { EditorPanel },
    setup() {
      return { args }
    },
    template: `
      <EditorPanel v-bind="args" style="max-width: 400px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <div>
          <label style="display: block; margin-bottom: 4px; font-size: 14px; color: #374151;">名称</label>
          <input type="text" value="" style="width: 100%; padding: 8px; border: 1px solid #dc2626; border-radius: 6px;" />
        </div>
      </EditorPanel>
    `,
  }),
}

export const Saving: Story = {
  args: {
    title: '编辑项目',
    saving: true,
  },
  render: args => ({
    components: { EditorPanel },
    setup() {
      return { args }
    },
    template: `
      <EditorPanel v-bind="args" style="max-width: 400px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <div>
          <label style="display: block; margin-bottom: 4px; font-size: 14px; color: #374151;">名称</label>
          <input type="text" value="示例项目" style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px;" />
        </div>
      </EditorPanel>
    `,
  }),
}

export const WithCloseButton: Story = {
  args: {
    title: '编辑项目',
    showClose: true,
  },
  render: args => ({
    components: { EditorPanel },
    setup() {
      return { args }
    },
    template: `
      <EditorPanel v-bind="args" style="max-width: 400px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <div>
          <label style="display: block; margin-bottom: 4px; font-size: 14px; color: #374151;">名称</label>
          <input type="text" value="示例项目" style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px;" />
        </div>
      </EditorPanel>
    `,
  }),
}
