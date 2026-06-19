<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Tag as ATag } from 'ant-design-vue'
import { PlusIcon, PencilIcon, Trash2Icon, DownloadIcon, UploadIcon, CheckSquareIcon } from 'lucide-vue-next'
import { usePositionStore } from '../stores/position'
import { useAuthStore } from '../stores/auth'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'
import DataTableShell from '../components/ui/DataTableShell.vue'

const authStore = useAuthStore()
const canManageSystem = computed(() => ['Admin', 'HR'].includes(authStore.userRole || ''))

const store = usePositionStore()
const isModalOpen = ref(false)
const isEditMode = ref(false)
const editingId = ref<string | null>(null)
const isConfirmDeleteOpen = ref(false)
const selectedPos = ref<any>(null)

const isImportModalOpen = ref(false)
const importFile = ref<File | null>(null)
const importResult = ref<any>(null)

const search = ref('')

const newPos = ref({
  positionCode: '',
  positionName: '',
  level: null as number | null,
  description: '',
  isActive: true
})

const columns = computed<any[]>(() => [
  { title: 'Mã', dataIndex: 'positionCode', key: 'positionCode', width: 160, sorter: (a: any, b: any) => (a.positionCode || '').localeCompare(b.positionCode || '') },
  { title: 'Tên', dataIndex: 'positionName', key: 'positionName', sorter: (a: any, b: any) => (a.positionName || '').localeCompare(b.positionName || '') },
  { title: 'Cấp bậc', key: 'level', width: 140, align: 'center', sorter: (a: any, b: any) => (a.level ?? 0) - (b.level ?? 0) },
  { title: 'Mô tả', dataIndex: 'description', key: 'description' },
  ...(canManageSystem.value ? [{ title: '', key: 'actions', width: 100, align: 'right' }] : []),
])

const tablePagination = { pageSize: 15, showSizeChanger: true, pageSizeOptions: ['15', '30', '50'], showTotal: (t: number) => `${t} mục` }

const filtered = computed(() => {
  const kw = search.value.trim().toLowerCase()
  if (!kw) return store.positions
  return (store.positions as any[]).filter(
    (p) =>
      (p.positionName || '').toLowerCase().includes(kw) ||
      (p.positionCode || '').toLowerCase().includes(kw) ||
      (p.description || '').toLowerCase().includes(kw),
  )
})

onMounted(() => {
  store.fetchPositions()
})

function openCreateModal() {
  isEditMode.value = false
  editingId.value = null
  newPos.value = {
    positionCode: '',
    positionName: '',
    level: null,
    description: '',
    isActive: true
  }
  isModalOpen.value = true
}

function openEditModal(item: any) {
  isEditMode.value = true
  editingId.value = item.id
  newPos.value = {
    positionCode: item.positionCode,
    positionName: item.positionName,
    level: item.level ?? null,
    description: item.description || '',
    isActive: item.isActive !== false
  }
  isModalOpen.value = true
}

async function submitCreateOrUpdate() {
  const payload = {
    positionCode: newPos.value.positionCode,
    positionName: newPos.value.positionName,
    level: newPos.value.level ?? undefined,
    description: newPos.value.description,
    isActive: newPos.value.isActive
  }

  let success = false
  if (isEditMode.value && editingId.value) {
    success = await store.updatePosition(editingId.value, payload)
  } else {
    success = await store.createPosition(payload)
  }

  if (success) {
    isModalOpen.value = false
  }
}

function confirmDelete(item: any) {
  selectedPos.value = item
  isConfirmDeleteOpen.value = true
}

async function executeDelete() {
  if (selectedPos.value) {
    const success = await store.deletePosition(selectedPos.value.id)
    if (success) isConfirmDeleteOpen.value = false
  }
}

async function triggerExport() {
  await store.exportExcel()
}

function handleFileUpload(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    importFile.value = target.files[0] || null
    importResult.value = null
  }
}

async function executeImport() {
  if (!importFile.value) return
  const result = await store.importExcel(importFile.value)
  if (result) {
    importResult.value = result
    if (result.successCount > 0) store.fetchPositions()
  }
}
</script>

<template>
  <DataTableShell
    title="Chức vụ"
    subtitle="Quản lý chức danh và vị trí công việc trong công ty."
    :columns="columns"
    :data-source="filtered"
    :loading="store.isLoading"
    row-key="id"
    :pagination="tablePagination"
    show-search
    :search="search"
    search-placeholder="Tìm theo mã, tên, mô tả..."
    @update:search="search = $event"
  >
    <template #actions>
      <template v-if="canManageSystem">
        <Button variant="ghost" @click="triggerExport" :disabled="store.isLoading" class="border border-border text-foreground hover:bg-accent/10">
          <DownloadIcon class="w-4 h-4 mr-2" /> Xuất Excel
        </Button>
        <Button variant="ghost" @click="isImportModalOpen = true; importResult = null" :disabled="store.isLoading" class="border border-border text-foreground hover:bg-accent/10">
          <UploadIcon class="w-4 h-4 mr-2" /> Nhập Excel
        </Button>
        <Button @click="openCreateModal">
          <PlusIcon class="w-4 h-4 mr-2" /> Thêm chức vụ
        </Button>
      </template>
    </template>

    <template #banner>
      <div v-if="store.error && !isModalOpen && !isConfirmDeleteOpen" class="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
        {{ store.error }}
      </div>
    </template>

    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'positionCode'">
        <span class="font-mono text-sm font-medium text-muted-foreground">{{ record.positionCode }}</span>
      </template>
      <template v-else-if="column.key === 'positionName'">
        <span class="font-sans font-medium text-foreground">{{ record.positionName }}</span>
      </template>
      <template v-else-if="column.key === 'level'">
        <a-tag v-if="record.level !== null && record.level !== undefined" color="default">Cấp bậc {{ record.level }}</a-tag>
        <span v-else class="text-muted-foreground italic">—</span>
      </template>
      <template v-else-if="column.key === 'description'">
        <span class="font-sans text-sm text-muted-foreground">{{ record.description || '—' }}</span>
      </template>
      <template v-else-if="column.key === 'actions'">
        <div class="flex items-center justify-end gap-1">
          <button @click="openEditModal(record)" class="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-all" title="Sửa">
            <PencilIcon class="w-4 h-4" />
          </button>
          <button @click="confirmDelete(record)" class="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Xóa">
            <Trash2Icon class="w-4 h-4" />
          </button>
        </div>
      </template>
    </template>
  </DataTableShell>

  <!-- Create / Edit Modal -->
  <Modal :isOpen="isModalOpen" :title="isEditMode ? 'Sửa chức vụ' : 'Thêm chức vụ'" @close="isModalOpen = false">
    <form @submit.prevent="submitCreateOrUpdate" class="space-y-5">
      <div>
        <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Mã <span class="text-red-500">*</span></label>
        <input v-model="newPos.positionCode" type="text" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-mono text-sm" placeholder="e.g. DEV" :disabled="isEditMode"/>
      </div>
      <div>
        <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Tên <span class="text-red-500">*</span></label>
        <input v-model="newPos.positionName" type="text" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm" placeholder="Developer"/>
      </div>
      <div>
        <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Cấp bậc</label>
        <input v-model="newPos.level" type="number" min="0" class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-mono text-sm" placeholder="e.g. 1" />
      </div>
      <div>
        <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Mô tả</label>
        <textarea v-model="newPos.description" rows="3" class="w-full p-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm resize-none" placeholder="Software development..."></textarea>
      </div>

      <div v-if="isEditMode" class="flex items-center gap-3 pt-2">
        <input type="checkbox" id="isActivePos" v-model="newPos.isActive" class="w-4 h-4 rounded text-accent focus:ring-accent accent-accent" />
        <label for="isActivePos" class="font-sans text-sm text-foreground">Trạng thái hoạt động</label>
      </div>

      <div v-if="store.error && isModalOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans mt-4">
        {{ store.error }}
      </div>

      <div class="pt-6 border-t border-border flex justify-end gap-4 mt-6">
        <Button variant="ghost" type="button" @click="isModalOpen = false">Hủy</Button>
        <Button type="submit" :disabled="store.isLoading" class="min-w-[150px]">
          {{ store.isLoading ? 'Đang xử lý...' : (isEditMode ? 'Lưu thay đổi' : 'Tạo chức vụ') }}
        </Button>
      </div>
    </form>
  </Modal>

  <!-- Delete Confirmation Modal -->
  <Modal :isOpen="isConfirmDeleteOpen" title="Xác nhận xóa" @close="isConfirmDeleteOpen = false">
    <div class="space-y-6">
      <p class="text-sm text-muted-foreground font-sans">
        Bạn có chắc muốn xóa <strong>{{ selectedPos?.positionName }}</strong>?
      </p>
      <div v-if="store.error && isConfirmDeleteOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans">
        {{ store.error }}
      </div>
      <div class="pt-4 flex justify-end gap-4">
        <Button variant="ghost" @click="isConfirmDeleteOpen = false">Hủy</Button>
        <Button @click="executeDelete" :disabled="store.isLoading" class="bg-red-500 hover:bg-red-600 border-transparent text-white shadow-md">
          {{ store.isLoading ? 'Đang xóa...' : 'Xóa chức vụ' }}
        </Button>
      </div>
    </div>
  </Modal>

  <!-- Import Excel Modal -->
  <Modal :isOpen="isImportModalOpen" title="Nhập danh sách chức vụ" @close="isImportModalOpen = false">
    <div class="space-y-6">
      <div class="p-4 border-2 border-dashed border-border rounded-xl text-center bg-muted/30">
        <UploadIcon class="w-8 h-8 mx-auto text-muted-foreground mb-3" />
        <p class="text-sm font-sans text-muted-foreground mb-2">Tải lên file Excel (.xlsx)</p>
        <input type="file" accept=".xlsx" @change="handleFileUpload" class="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer" />
      </div>

      <div v-if="importResult" class="p-4 rounded-xl font-sans text-sm" :class="importResult.failedCount === 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'">
        <div class="flex items-center gap-2 font-medium mb-2">
          <CheckSquareIcon class="w-5 h-5" /> Kết quả import
        </div>
        <ul class="list-disc pl-5 space-y-1">
          <li>Tổng số dòng: {{ importResult.totalRows }}</li>
          <li>Thành công: <strong>{{ importResult.successCount }}</strong></li>
          <li>Thất bại: <strong>{{ importResult.failedCount }}</strong></li>
        </ul>
        <div v-if="importResult.errors && importResult.errors.length" class="mt-3 text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 max-h-40 overflow-y-auto">
          <p class="font-medium mb-1">Chi tiết lỗi:</p>
          <ul class="list-disc pl-5">
            <li v-for="(err, i) in importResult.errors" :key="i">{{ err }}</li>
          </ul>
        </div>
      </div>

      <div v-if="store.error" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans mt-4">
        {{ store.error }}
      </div>

      <div class="pt-4 flex justify-end gap-3 border-t border-border mt-4">
        <Button variant="ghost" @click="isImportModalOpen = false">Đóng</Button>
        <Button @click="executeImport" :disabled="!importFile || store.isLoading" class="min-w-[120px]">
          {{ store.isLoading ? 'Đang xử lý...' : 'Tiến hành Nhập' }}
        </Button>
      </div>
    </div>
  </Modal>
</template>
