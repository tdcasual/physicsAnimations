import type { Meta, StoryObj } from '@storybook/vue3'
import { ref } from 'vue'
import AdminWorkspaceLayout from './AdminWorkspaceLayout.vue'
import DataList from './DataList.vue'
import EditorPanel from './EditorPanel.vue'
// import SearchField from './SearchField.vue'

interface Item {
  id: string
  name: string
  description: string
}

const sampleItems: Item[] = [
  { id: '1', name: '牛顿第一定律', description: '惯性定律' },
  { id: '2', name: '牛顿第二定律', description: 'F=ma' },
  { id: '3', name: '牛顿第三定律', description: '作用力与反作用力' },
  { id: '4', name: '动量守恒', description: '系统总动量保持不变' },
]

const meta: Meta<typeof AdminWorkspaceLayout> = {
  title: 'UI/AdminWorkspaceLayout',
  component: AdminWorkspaceLayout,
  tags: ['autodocs'],
  argTypes: {
    isEditorOpen: {
      control: 'boolean',
      description: '是否显示编辑面板',
    },
    mobileSheetBreakpoint: {
      control: 'number',
      description: '移动端抽屉断点',
    },
    disableBodyScroll: {
      control: 'boolean',
      description: '是否禁用 body 滚动',
    },
  },
  args: {
    isEditorOpen: false,
    mobileSheetBreakpoint: 640,
    disableBodyScroll: false,
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: args => ({
    components: { AdminWorkspaceLayout, DataList, EditorPanel },
    setup() {
      const items = ref(sampleItems)
      const selectedId = ref<string | null>(null)
      const query = ref('')

      const selectedItem = ref<Item | null>(null)

      function handleSelect(item: Item) {
        selectedId.value = item.id
        selectedItem.value = item
        args.isEditorOpen = true
      }

      function handleClose() {
        args.isEditorOpen = false
        selectedId.value = null
        selectedItem.value = null
      }

      return { args, items, selectedId, query, selectedItem, handleSelect, handleClose }
    },
    template: `
      <AdminWorkspaceLayout
        :is-editor-open="args.isEditorOpen"
        :mobile-sheet-breakpoint="args.mobileSheetBreakpoint"
        :disable-body-scroll="args.disableBodyScroll"
        @close="handleClose"
        style="height: 500px;"
      >
        <template #header>
          <div style="padding: 16px;">
            <h2 style="margin: 0; font-size: 20px;">内容管理</h2>
          </div>
        </template>

        <template #list>
          <DataList
            :items="items"
            :selected-id="selectedId"
            v-model:query="query"
            :total="items.length"
            search-placeholder="搜索物理实验..."
            @select="handleSelect"
          >
            <template #item="{ item }">
              <div>
                <div style="font-weight: 600;">{{ item.name }}</div>
                <div style="font-size: 13px; color: #6b7280;">{{ item.description }}</div>
              </div>
            </template>
          </DataList>
        </template>

        <template #editor>
          <EditorPanel
            v-if="selectedItem"
            :title="'编辑: ' + selectedItem.name"
            save-text="保存"
            cancel-text="取消"
            @save="handleClose"
            @cancel="handleClose"
          >
            <div style="display: grid; gap: 12px;">
              <div>
                <label style="display: block; margin-bottom: 4px; font-size: 14px;">名称</label>
                <input 
                  type="text" 
                  :value="selectedItem.name" 
                  style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px;"
                />
              </div>
              <div>
                <label style="display: block; margin-bottom: 4px; font-size: 14px;">描述</label>
                <textarea 
                  :value="selectedItem.description"
                  style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px; min-height: 80px;"
                ></textarea>
              </div>
            </div>
          </EditorPanel>
          <div v-else style="padding: 32px; text-align: center; color: #6b7280;">
            请选择左侧项目编辑
          </div>
        </template>
      </AdminWorkspaceLayout>
    `,
  }),
}

export const EditorOpen: Story = {
  args: {
    isEditorOpen: true,
  },
  render: args => ({
    components: { AdminWorkspaceLayout, EditorPanel },
    setup() {
      return { args }
    },
    template: `
      <AdminWorkspaceLayout
        :is-editor-open="args.isEditorOpen"
        :disable-body-scroll="false"
        style="height: 500px;"
      >
        <template #header>
          <div style="padding: 16px;">
            <h2 style="margin: 0; font-size: 20px;">内容管理</h2>
          </div>
        </template>

        <template #list>
          <div style="padding: 16px;">
            <p>列表面板内容</p>
          </div>
        </template>

        <template #editor>
          <EditorPanel
            title="编辑项目"
            save-text="保存"
            cancel-text="取消"
          >
            <div>
              <label style="display: block; margin-bottom: 4px; font-size: 14px;">名称</label>
              <input 
                type="text" 
                value="示例项目"
                style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px;"
              />
            </div>
          </EditorPanel>
        </template>
      </AdminWorkspaceLayout>
    `,
  }),
}

export const WithoutHeader: Story = {
  render: args => ({
    components: { AdminWorkspaceLayout },
    setup() {
      return { args }
    },
    template: `
      <AdminWorkspaceLayout
        :is-editor-open="false"
        style="height: 400px;"
      >
        <template #list>
          <div style="padding: 16px;">
            <h3>列表面板</h3>
            <p>无头部区域的布局示例</p>
          </div>
        </template>

        <template #editor>
          <div style="padding: 16px;">
            <h3>编辑面板</h3>
            <p>编辑内容区域</p>
          </div>
        </template>
      </AdminWorkspaceLayout>
    `,
  }),
}
