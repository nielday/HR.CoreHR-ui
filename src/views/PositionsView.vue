<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { PlusIcon, PencilIcon, TrashIcon } from 'lucide-vue-next'
import { usePositionStore } from '../stores/position'
import { useAuthStore } from '../stores/auth'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'

const authStore = useAuthStore()
const canManageSystem = computed(() => ['Admin', 'HR'].includes(authStore.userRole || ''))

const store = usePositionStore()
const isModalOpen = ref(false)
const isEditMode = ref(false)
const editingId = ref<string | null>(null)
const isConfirmDeleteOpen = ref(false)
const selectedPos = ref<any>(null)

const newPos = ref({
  positionCode: '',
  positionName: '',
  level: null as number | null,
  description: '',
  isActive: true
})

const headers = [
  { title: 'Mã', align: 'start', key: 'positionCode', width: '15%' },
  { title: 'Tên', align: 'start', key: 'positionName', width: '25%' },
  { title: 'Cấp bậc', align: 'start', key: 'level', width: '15%' },
  { title: 'Mô tả', align: 'start', key: 'description', width: '35%' },
  { title: '', align: 'end', key: 'actions', sortable: false },
] as const

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
</script>

<template>
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Chức vụ</h1>
        <p class="text-muted-foreground font-sans text-lg">Quản lý chức danh và vị trí công việc trong công ty.</p>
      </div>
      <Button v-if="canManageSystem" @click="openCreateModal" class="shadow-accent hover:shadow-accent-lg transition-all duration-300 hover:-translate-y-0.5">
        <PlusIcon class="w-4 h-4 mr-2" />
        Thêm chức vụ
      </Button>
    </div>

    <div v-if="store.error && !isModalOpen && !isConfirmDeleteOpen" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
      {{ store.error }}
    </div>

    <!-- Minimalist Data Table -->
    <div class="bg-card border border-border rounded-2xl shadow-md overflow-hidden relative group">
      <div class="absolute -top-24 -right-24 w-48 h-48 bg-accent/5 rounded-full blur-[80px] pointer-events-none transition-opacity duration-1000 opacity-50 group-hover:opacity-100"></div>

      <v-data-table
        :headers="headers as any"
        :items="store.positions"
        :loading="store.isLoading"
        class="bg-transparent font-sans"
        hover
      >
        <template #[`item.positionCode`]="{ item }">
          <span class="font-mono text-sm font-medium text-muted-foreground">{{ item.positionCode }}</span>
        </template>
        
        <template #[`item.positionName`]="{ item }">
          <span class="font-sans font-medium text-foreground">{{ item.positionName }}</span>
        </template>

        <template #[`item.level`]="{ item }">
          <span v-if="item.level !== null && item.level !== undefined" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
            Cấp bậc {{ item.level }}
          </span>
          <span v-else class="text-muted-foreground italic">—</span>
        </template>

        <template #[`item.description`]="{ item }">
          <span class="font-sans text-sm text-muted-foreground">{{ item.description || '—' }}</span>
        </template>

        <template #[`item.actions`]="{ item }">
          <div v-if="canManageSystem" class="flex items-center justify-end gap-1 opacity-60 group-hover/row:opacity-100 transition-opacity">
            <button @click="openEditModal(item)" class="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-colors" title="Sửa">
              <PencilIcon class="w-4 h-4" />
            </button>
            <button @click="confirmDelete(item)" class="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </template>
      </v-data-table>
    </div>

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
  </div>
</template>

<style scoped>
:deep(.v-data-table) { background: transparent !important; }
:deep(.v-data-table__th) {
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 0.75rem !important;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #64748B !important;
  font-weight: 500 !important;
  border-bottom: 1px solid #E2E8F0 !important;
  background: rgba(241, 245, 249, 0.3) !important;
}
:deep(.v-data-table__td) { border-bottom: 1px solid #E2E8F0 !important; }
:deep(.v-data-table__tr:hover) { background: rgba(241, 245, 249, 0.4) !important; }
</style>
