import type { Meta, StoryObj } from '@storybook/vue3'
import ActionBar from './ActionBar.vue'

const meta: Meta<typeof ActionBar> = {
  title: 'UI/ActionBar',
  component: ActionBar,
  tags: ['autodocs'],
  argTypes: {
    align: {
      control: 'select',
      options: ['start', 'center', 'end'],
      description: '对齐方式',
    },
    compact: {
      control: 'boolean',
      description: '是否紧凑模式',
    },
    sticky: {
      control: 'boolean',
      description: '是否 sticky 定位',
    },
  },
  args: {
    align: 'end',
    compact: false,
    sticky: false,
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: args => ({
    components: { ActionBar },
    setup() {
      return { args }
    },
    template: `
      <ActionBar v-bind="args">
        <template #secondary>
          <button class="btn-secondary">取消</button>
        </template>
        <template #primary>
          <button class="btn-primary">保存</button>
        </template>
      </ActionBar>
    `,
  }),
}

export const WithDanger: Story = {
  render: args => ({
    components: { ActionBar },
    setup() {
      return { args }
    },
    template: `
      <ActionBar v-bind="args">
        <template #secondary>
          <button class="btn-secondary">取消</button>
        </template>
        <template #primary>
          <button class="btn-primary">保存</button>
          <button class="btn-danger">删除</button>
        </template>
      </ActionBar>
    `,
  }),
}

export const AlignStart: Story = {
  args: {
    align: 'start',
  },
  render: args => ({
    components: { ActionBar },
    setup() {
      return { args }
    },
    template: `
      <ActionBar v-bind="args">
        <template #start>
          <button class="btn-ghost">返回</button>
        </template>
        <template #end>
          <button class="btn-primary">继续</button>
        </template>
      </ActionBar>
    `,
  }),
}

export const Compact: Story = {
  args: {
    compact: true,
  },
  render: args => ({
    components: { ActionBar },
    setup() {
      return { args }
    },
    template: `
      <ActionBar v-bind="args">
        <template #secondary>
          <button class="btn-secondary">取消</button>
        </template>
        <template #primary>
          <button class="btn-primary">保存</button>
        </template>
      </ActionBar>
    `,
  }),
}
