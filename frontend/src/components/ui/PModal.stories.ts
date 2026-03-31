import type { Meta, StoryObj } from '@storybook/vue3'
import { ref } from 'vue'
import PModal from './PModal.vue'
import PButton from './PButton.vue'

const meta: Meta<typeof PModal> = {
  title: 'Components/PModal',
  component: PModal,
  tags: ['autodocs'],
  argTypes: {
    modelValue: {
      control: 'boolean',
      description: '控制模态框显示/隐藏',
    },
    title: {
      control: 'text',
      description: '标题',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      description: '模态框尺寸',
    },
    closable: {
      control: 'boolean',
      description: '是否显示关闭按钮',
    },
    maskClosable: {
      control: 'boolean',
      description: '点击遮罩是否关闭',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    modelValue: true,
    title: '模态框标题',
    size: 'md',
  },
  render: args => ({
    components: { PModal, PButton },
    setup() {
      const visible = ref(args.modelValue)
      return { args, visible }
    },
    template: `
      <div>
        <PButton @click="visible = true">打开模态框</PButton>
        <PModal v-model="visible" v-bind="args">
          <p>这是模态框的内容区域。</p>
          <p>可以放置任何内容。</p>
        </PModal>
      </div>
    `,
  }),
}

export const Small: Story = {
  args: {
    modelValue: true,
    title: '小模态框',
    size: 'sm',
  },
  render: args => ({
    components: { PModal, PButton },
    setup() {
      const visible = ref(args.modelValue)
      return { args, visible }
    },
    template: `
      <div>
        <PButton @click="visible = true">打开</PButton>
        <PModal v-model="visible" v-bind="args">
          <p>这是一个小尺寸的模态框。</p>
        </PModal>
      </div>
    `,
  }),
}

export const Large: Story = {
  args: {
    modelValue: true,
    title: '大模态框',
    size: 'lg',
  },
  render: args => ({
    components: { PModal, PButton },
    setup() {
      const visible = ref(args.modelValue)
      return { args, visible }
    },
    template: `
      <div>
        <PButton @click="visible = true">打开</PButton>
        <PModal v-model="visible" v-bind="args">
          <p>这是一个大尺寸的模态框。</p>
          <p>可以容纳更多内容。</p>
        </PModal>
      </div>
    `,
  }),
}

export const NoTitle: Story = {
  args: {
    modelValue: true,
    size: 'md',
  },
  render: args => ({
    components: { PModal, PButton },
    setup() {
      const visible = ref(args.modelValue)
      return { args, visible }
    },
    template: `
      <div>
        <PButton @click="visible = true">打开</PButton>
        <PModal v-model="visible" v-bind="args">
          <p>这是一个没有标题的模态框。</p>
        </PModal>
      </div>
    `,
  }),
}

export const NotClosable: Story = {
  args: {
    modelValue: true,
    title: '不可关闭',
    closable: false,
    maskClosable: false,
  },
  render: args => ({
    components: { PModal, PButton },
    setup() {
      const visible = ref(args.modelValue)
      return { args, visible }
    },
    template: `
      <div>
        <PButton @click="visible = true">打开</PButton>
        <PModal v-model="visible" v-bind="args">
          <p>这个模态框不能通过点击遮罩或关闭按钮关闭。</p>
          <p>请使用 ESC 键关闭。</p>
        </PModal>
      </div>
    `,
  }),
}

export const WithFooter: Story = {
  args: {
    modelValue: true,
    title: '带底部按钮',
    size: 'md',
  },
  render: args => ({
    components: { PModal, PButton },
    setup() {
      const visible = ref(args.modelValue)
      return { args, visible }
    },
    template: `
      <div>
        <PButton @click="visible = true">打开</PButton>
        <PModal v-model="visible" v-bind="args">
          <p>确定要执行此操作吗？</p>
          <template #footer>
            <PButton variant="ghost" @click="visible = false">取消</PButton>
            <PButton variant="primary" @click="visible = false">确认</PButton>
          </template>
        </PModal>
      </div>
    `,
  }),
}

export const ConfirmModal: Story = {
  render: () => ({
    components: { PModal, PButton },
    setup() {
      const visible = ref(false)
      return { visible }
    },
    template: `
      <div>
        <PButton variant="danger" @click="visible = true">删除</PButton>
        <PModal v-model="visible" title="确认删除" size="sm">
          <p>确定要删除此项目吗？此操作不可撤销。</p>
          <template #footer>
            <PButton variant="ghost" @click="visible = false">取消</PButton>
            <PButton variant="danger" @click="visible = false">删除</PButton>
          </template>
        </PModal>
      </div>
    `,
  }),
}

export const FormModal: Story = {
  render: () => ({
    components: { PModal, PButton, PInput },
    setup() {
      const visible = ref(false)
      const form = ref({ name: '', email: '' })
      return { visible, form }
    },
    template: `
      <div>
        <PButton @click="visible = true">新建用户</PButton>
        <PModal v-model="visible" title="新建用户" size="md">
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div>
              <label style="display: block; margin-bottom: 8px; color: #666;">姓名</label>
              <PInput v-model="form.name" placeholder="请输入姓名" />
            </div>
            <div>
              <label style="display: block; margin-bottom: 8px; color: #666;">邮箱</label>
              <PInput v-model="form.email" type="email" placeholder="请输入邮箱" />
            </div>
          </div>
          <template #footer>
            <PButton variant="ghost" @click="visible = false">取消</PButton>
            <PButton variant="primary" @click="visible = false">保存</PButton>
          </template>
        </PModal>
      </div>
    `,
  }),
}
