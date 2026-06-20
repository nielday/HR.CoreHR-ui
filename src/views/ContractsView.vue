<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { Tag as ATag, Input as AInput, InputNumber as AInputNumber } from 'ant-design-vue'
const ATextarea = AInput.TextArea
import { PlusIcon, PencilIcon, Trash2Icon, RotateCcwIcon } from 'lucide-vue-next'
import { useContractStore } from '../stores/contract'
import { useAuthStore } from '../stores/auth'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'
import DataTableShell from '../components/ui/DataTableShell.vue'

const authStore = useAuthStore()
const canManageSystem = computed(() => ['Admin', 'HR'].includes(authStore.userRole || ''))

const store = useContractStore()
const isModalOpen = ref(false)
const isEditMode = ref(false)
const editingId = ref<string | null>(null)
const isConfirmDeleteOpen = ref(false)
const selectedContract = ref<any>(null)
const showInactive = ref(false)

const search = ref('')

const newContract = ref({
  contractTypeCode: '',
  contractTypeName: '',
  defaultDurationMonths: null as any,
  description: '',
  isActive: true
})

const columns = computed<any[]>(() => [
  { title: 'Mã', dataIndex: 'contractTypeCode', key: 'contractTypeCode', width: 180, sorter: (a: any, b: any) => (a.contractTypeCode || '').localeCompare(b.contractTypeCode || '') },
  { title: 'Tên', dataIndex: 'contractTypeName', key: 'contractTypeName', sorter: (a: any, b: any) => (a.contractTypeName || '').localeCompare(b.contractTypeName || '') },
  { title: 'Thời hạn', key: 'defaultDurationMonths', width: 150, align: 'center', sorter: (a: any, b: any) => (a.defaultDurationMonths ?? 0) - (b.defaultDurationMonths ?? 0) },
  { title: 'Mô tả', dataIndex: 'description', key: 'description' },
  ...(canManageSystem.value ? [{ title: '', key: 'actions', width: 100, align: 'right' }] : []),
])

const tablePagination = { pageSize: 15, showSizeChanger: true, pageSizeOptions: ['15', '30', '50'], showTotal: (t: number) => `${t} mục` }

const filtered = computed(() => {
  const kw = search.value.trim().toLowerCase()
  if (!kw) return store.contracts
  return (store.contracts as any[]).filter(
    (c) =>
      (c.contractTypeName || '').toLowerCase().includes(kw) ||
      (c.contractTypeCode || '').toLowerCase().includes(kw) ||
      (c.description || '').toLowerCase().includes(kw),
  )
})

onMounted(() => {
  store.fetchContracts(showInactive.value)
})

watch(showInactive, (newVal) => {
  store.fetchContracts(newVal)
})

function openCreateModal() {
  isEditMode.value = false
  editingId.value = null
  newContract.value = {
    contractTypeCode: '',
    contractTypeName: '',
    defaultDurationMonths: null,
    description: '',
    isActive: true
  }
  isModalOpen.value = true
}

function openEditModal(item: any) {
  isEditMode.value = true
  editingId.value = item.id
  newContract.value = {
    contractTypeCode: item.contractTypeCode,
    contractTypeName: item.contractTypeName,
    defaultDurationMonths: item.defaultDurationMonths,
    description: item.description || '',
    isActive: item.isActive !== false
  }
  isModalOpen.value = true
}

async function submitCreateOrUpdate() {
  const payload = {
    contractTypeCode: newContract.value.contractTypeCode,
    contractTypeName: newContract.value.contractTypeName,
    defaultDurationMonths: newContract.value.defaultDurationMonths || null,
    description: newContract.value.description,
    isActive: newContract.value.isActive
  }

  let success = false
  if (isEditMode.value && editingId.value) {
    success = await store.updateContract(editingId.value, payload)
  } else {
    success = await store.createContract(payload)
  }

  if (success) {
    isModalOpen.value = false
  }
}

function confirmDelete(item: any) {
  selectedContract.value = item
  isConfirmDeleteOpen.value = true
}

async function executeDelete() {
  if (selectedContract.value) {
    const success = await store.deleteContract(selectedContract.value.id)
    if (success) isConfirmDeleteOpen.value = false
  }
}

async function executeRestore(item: any) {
  await store.restoreContract(item.id)
}
</script>

<template>
  <DataTableShell
    title="Loại hợp đồng"
    subtitle="Quản lý các loại hợp đồng lao động và thời hạn."
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
      <label class="flex items-center gap-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
        <input type="checkbox" v-model="showInactive" class="w-4 h-4 rounded border-border text-accent focus:ring-accent" />
        Hiện loại đã ẩn
      </label>
      <Button v-if="canManageSystem" @click="openCreateModal">
        <PlusIcon class="w-4 h-4 mr-2" /> Thêm loại hợp đồng
      </Button>
    </template>

    <template #banner>
      <div v-if="store.error && !isModalOpen && !isConfirmDeleteOpen" class="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
        {{ store.error }}
      </div>
    </template>

    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'contractTypeCode'">
        <span class="font-mono text-sm font-medium text-muted-foreground">{{ record.contractTypeCode }}</span>
      </template>
      <template v-else-if="column.key === 'contractTypeName'">
        <div class="flex items-center gap-2">
          <span class="font-sans font-medium" :class="record.isActive === false ? 'text-muted-foreground line-through' : 'text-foreground'">{{ record.contractTypeName }}</span>
          <a-tag v-if="record.isActive === false" color="red">Đã ẩn</a-tag>
        </div>
      </template>
      <template v-else-if="column.key === 'defaultDurationMonths'">
        <a-tag v-if="record.defaultDurationMonths" color="default">{{ record.defaultDurationMonths }} tháng</a-tag>
        <span v-else class="text-muted-foreground italic">—</span>
      </template>
      <template v-else-if="column.key === 'description'">
        <span class="font-sans text-sm text-muted-foreground">{{ record.description || '—' }}</span>
      </template>
      <template v-else-if="column.key === 'actions'">
        <div class="flex items-center justify-end gap-1">
          <template v-if="record.isActive !== false">
            <button @click="openEditModal(record)" class="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-all" title="Sửa">
              <PencilIcon class="w-4 h-4" />
            </button>
            <button @click="confirmDelete(record)" class="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Xóa">
              <Trash2Icon class="w-4 h-4" />
            </button>
          </template>
          <template v-else>
            <button @click="executeRestore(record)" class="p-1.5 text-muted-foreground hover:text-green-500 hover:bg-green-50 rounded-lg transition-all" title="Khôi phục">
              <RotateCcwIcon class="w-4 h-4" />
            </button>
          </template>
        </div>
      </template>
    </template>
  </DataTableShell>

  <!-- Create / Edit Modal -->
  <Modal :isOpen="isModalOpen" :title="isEditMode ? 'Sửa loại hợp đồng' : 'Thêm loại hợp đồng'" @close="isModalOpen = false">
    <form @submit.prevent="submitCreateOrUpdate" class="space-y-5">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Mã <span class="text-red-500">*</span></label>
          <a-input v-model:value="newContract.contractTypeCode" placeholder="VD: FULL" :disabled="isEditMode" style="width:100%" />
        </div>
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Thời hạn (tháng)</label>
          <a-input-number v-model:value="newContract.defaultDurationMonths" :min="1" placeholder="12" style="width:100%" />
        </div>
      </div>
      <div>
        <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Tên <span class="text-red-500">*</span></label>
        <a-input v-model:value="newContract.contractTypeName" placeholder="Hợp đồng toàn thời gian" style="width:100%" />
      </div>
      <div>
        <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Mô tả</label>
        <a-textarea v-model:value="newContract.description" :rows="3" placeholder="Hợp đồng tiêu chuẩn..." />
      </div>

      <div v-if="isEditMode" class="flex items-center gap-3 pt-2">
        <input type="checkbox" id="isActiveContract" v-model="newContract.isActive" class="w-4 h-4 rounded text-accent focus:ring-accent accent-accent" />
        <label for="isActiveContract" class="font-sans text-sm text-foreground">Trạng thái hoạt động</label>
      </div>

      <div v-if="store.error && isModalOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans mt-4">
        {{ store.error }}
      </div>

      <div class="pt-6 border-t border-border flex justify-end gap-4 mt-6">
        <Button variant="ghost" type="button" @click="isModalOpen = false">Hủy</Button>
        <Button type="submit" :disabled="store.isLoading" class="min-w-[150px]">
          {{ store.isLoading ? 'Đang xử lý...' : (isEditMode ? 'Lưu thay đổi' : 'Tạo loại hợp đồng') }}
        </Button>
      </div>
    </form>
  </Modal>

  <!-- Delete Confirmation Modal -->
  <Modal :isOpen="isConfirmDeleteOpen" title="Xác nhận xóa" @close="isConfirmDeleteOpen = false">
    <div class="space-y-6">
      <p class="text-sm text-muted-foreground font-sans">
        Bạn có chắc muốn xóa <strong>{{ selectedContract?.contractTypeName }}</strong>?
      </p>
      <div v-if="store.error && isConfirmDeleteOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans">
        {{ store.error }}
      </div>
      <div class="pt-4 flex justify-end gap-4">
        <Button variant="ghost" @click="isConfirmDeleteOpen = false">Hủy</Button>
        <Button @click="executeDelete" :disabled="store.isLoading" class="bg-red-500 hover:bg-red-600 border-transparent text-white shadow-md">
          {{ store.isLoading ? 'Đang xóa...' : 'Xóa loại hợp đồng' }}
        </Button>
      </div>
    </div>
  </Modal>
</template>
