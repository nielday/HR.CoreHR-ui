<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { PlusIcon, PencilIcon, TrashIcon, CornerDownRightIcon } from 'lucide-vue-next'
import { useDepartmentStore } from '../stores/department'
import { useEmployeeStore } from '../stores/employee'
import { useAuthStore } from '../stores/auth'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'

const store = useDepartmentStore()
const employeeStore = useEmployeeStore()
const authStore = useAuthStore()

const canManageSystem = computed(() => ['Admin', 'HR'].includes(authStore.userRole || ''))

const isModalOpen = ref(false)
const isEditMode = ref(false)
const editingId = ref<string | null>(null)
const isConfirmDeleteOpen = ref(false)
const selectedDept = ref<any>(null)

const newDept = ref({
  departmentCode: '',
  departmentName: '',
  description: '',
  parentDepartmentId: '',
  managerEmployeeId: '',
  isActive: true
})

const headers = [
  { title: 'Tên phòng ban', align: 'start', key: 'departmentName', width: '30%' },
  { title: 'Mã', align: 'start', key: 'departmentCode', width: '15%' },
  { title: 'Mô tả', align: 'start', key: 'description', width: '25%' },
  { title: 'Trạng thái', align: 'center', key: 'isActive', width: '15%' },
  { title: '', align: 'end', key: 'actions', sortable: false },
] as const

onMounted(() => {
  store.fetchDepartmentTree()
  store.fetchDepartments() // for the flat list in the dropdown
  if (employeeStore.employees.length === 0) employeeStore.fetchEmployees()
})

// Flatten the tree for v-data-table
const flattenedTree = computed(() => {
  const result: any[] = []
  function flatten(nodes: any[], level: number = 0) {
    for (const node of nodes) {
      result.push({ ...node, level })
      if (node.subDepartments && node.subDepartments.length > 0) {
        flatten(node.subDepartments, level + 1)
      }
    }
  }
  flatten(store.departmentTree)
  return result
})

function openCreateModal() {
  isEditMode.value = false
  editingId.value = null
  newDept.value = {
    departmentCode: '',
    departmentName: '',
    description: '',
    parentDepartmentId: '',
    managerEmployeeId: '',
    isActive: true
  }
  isModalOpen.value = true
}

function openEditModal(item: any) {
  isEditMode.value = true
  editingId.value = item.id
  newDept.value = {
    departmentCode: item.departmentCode,
    departmentName: item.departmentName,
    description: item.description || '',
    parentDepartmentId: item.parentDepartmentId || '',
    managerEmployeeId: item.managerEmployeeId || '',
    isActive: item.isActive
  }
  isModalOpen.value = true
}

async function submitCreateOrUpdate() {
  const payload = {
    departmentCode: newDept.value.departmentCode,
    departmentName: newDept.value.departmentName,
    description: newDept.value.description,
    parentDepartmentId: newDept.value.parentDepartmentId || null,
    managerEmployeeId: newDept.value.managerEmployeeId || null,
    isActive: newDept.value.isActive
  }
  
  let success = false
  if (isEditMode.value && editingId.value) {
    success = await store.updateDepartment(editingId.value, payload)
  } else {
    success = await store.createDepartment(payload)
  }

  if (success) {
    isModalOpen.value = false
  }
}

function confirmDelete(item: any) {
  selectedDept.value = item
  isConfirmDeleteOpen.value = true
}

async function executeDelete() {
  if (selectedDept.value) {
    const success = await store.deleteDepartment(selectedDept.value.id)
    if (success) isConfirmDeleteOpen.value = false
  }
}
</script>

<template>
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Phòng ban</h1>
        <p class="text-muted-foreground font-sans text-lg">Quản lý cơ cấu tổ chức và phân cấp.</p>
      </div>
      <Button v-if="canManageSystem" @click="openCreateModal" class="shadow-accent hover:shadow-accent-lg transition-all duration-300 hover:-translate-y-0.5">
        <PlusIcon class="w-4 h-4 mr-2" />
        Thêm phòng ban
      </Button>
    </div>

    <div v-if="store.error && !isModalOpen && !isConfirmDeleteOpen" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
      {{ store.error }}
    </div>

    <!-- Tree View inside Minimalist Card -->
    <div class="bg-card border border-border rounded-2xl shadow-md overflow-hidden relative group">
      <!-- Glow effect -->
      <div class="absolute -top-24 -right-24 w-48 h-48 bg-accent/5 rounded-full blur-[80px] pointer-events-none transition-opacity duration-1000 opacity-50 group-hover:opacity-100"></div>

      <v-data-table
        :headers="headers as any"
        :items="flattenedTree"
        :loading="store.isLoading"
        class="bg-transparent font-sans"
        hover
        hide-default-footer
        :items-per-page="-1"
      >
        <!-- Custom Department Name Column (Tree indentation) -->
        <template #[`item.departmentName`]="{ item }">
          <div class="flex items-center" :style="{ paddingLeft: `${item.level * 2}rem` }">
            <CornerDownRightIcon v-if="item.level > 0" class="w-4 h-4 text-muted-foreground/40 mr-2 shrink-0" />
            <div class="py-3">
              <div class="font-semibold text-foreground text-[15px] flex items-center gap-2">
                {{ item.departmentName }}
                <span v-if="item.subDepartments?.length" class="inline-flex items-center justify-center bg-accent/10 text-accent font-mono text-[10px] rounded-full w-5 h-5">
                  {{ item.subDepartments.length }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <!-- Custom Code Column -->
        <template #[`item.departmentCode`]="{ item }">
          <span class="font-mono text-sm font-medium text-muted-foreground">{{ item.departmentCode }}</span>
        </template>

        <!-- Custom Description Column -->
        <template #[`item.description`]="{ item }">
          <span class="font-sans text-sm text-muted-foreground">{{ item.description || '—' }}</span>
        </template>

        <!-- Custom Status Column -->
        <template #[`item.isActive`]="{ item }">
          <span v-if="item.isActive" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-green-50 text-green-600 border border-green-200">
            Đang hoạt động
          </span>
          <span v-else class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-gray-100 text-gray-500 border border-gray-200">
            Ngừng hoạt động
          </span>
        </template>

        <!-- Custom Actions Column -->
        <template #[`item.actions`]="{ item }">
          <div v-if="canManageSystem" class="flex items-center justify-end gap-1 opacity-60 group-hover/row:opacity-100 transition-opacity">
            <button @click="openEditModal(item)" class="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-colors" title="Sửa">
              <PencilIcon class="w-4 h-4" />
            </button>
            <button @click="confirmDelete(item)" class="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa" :disabled="item.subDepartments?.length > 0">
              <TrashIcon class="w-4 h-4" :class="{'opacity-30 cursor-not-allowed': item.subDepartments?.length > 0}" />
            </button>
          </div>
        </template>
      </v-data-table>
    </div>

    <!-- Create / Edit Department Modal -->
    <Modal :isOpen="isModalOpen" :title="isEditMode ? 'Sửa phòng ban' : 'Thêm phòng ban'" @close="isModalOpen = false">
      <form @submit.prevent="submitCreateOrUpdate" class="space-y-5">
        
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Mã phòng ban <span class="text-red-500">*</span></label>
          <input v-model="newDept.departmentCode" type="text" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-mono text-sm" placeholder="HR-01" :disabled="isEditMode"/>
        </div>

        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Tên phòng ban <span class="text-red-500">*</span></label>
          <input v-model="newDept.departmentName" type="text" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm" placeholder="Phòng Nhân sự"/>
        </div>

        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Mô tả</label>
          <textarea v-model="newDept.description" rows="2" class="w-full p-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm resize-none" placeholder="Mô tả (không bắt buộc)..."></textarea>
        </div>

        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Phòng ban cha</label>
          <select v-model="newDept.parentDepartmentId" class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
            <option value="">-- Không có phòng cha (Cấp gốc) --</option>
            <option v-for="d in store.departments" :key="d.id" :value="d.id" :disabled="d.id === editingId">
              {{ d.departmentName }}
            </option>
          </select>
        </div>

        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Trưởng phòng</label>
          <select v-model="newDept.managerEmployeeId" class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
            <option value="">-- Chưa phân công --</option>
            <option v-for="e in employeeStore.employees" :key="e.id" :value="e.id">
              {{ e.fullName }} ({{ e.employeeCode }})
            </option>
          </select>
        </div>

        <div v-if="isEditMode" class="flex items-center gap-3 pt-2">
          <input type="checkbox" id="isActive" v-model="newDept.isActive" class="w-4 h-4 rounded text-accent focus:ring-accent accent-accent" />
          <label for="isActive" class="font-sans text-sm text-foreground">Trạng thái hoạt động</label>
        </div>

        <div v-if="store.error && isModalOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans mt-4">
          {{ store.error }}
        </div>

        <div class="pt-6 border-t border-border flex justify-end gap-4 mt-6">
          <Button variant="ghost" type="button" @click="isModalOpen = false">Hủy</Button>
          <Button type="submit" :disabled="store.isLoading" class="min-w-[150px]">
            {{ store.isLoading ? 'Đang xử lý...' : (isEditMode ? 'Lưu thay đổi' : 'Thêm phòng ban') }}
          </Button>
        </div>
      </form>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal :isOpen="isConfirmDeleteOpen" title="Xác nhận xóa" @close="isConfirmDeleteOpen = false">
      <div class="space-y-6">
        <p class="text-sm text-muted-foreground font-sans">
          Bạn có chắc muốn xóa <strong>{{ selectedDept?.departmentName }}</strong>?
        </p>

        <div v-if="store.error && isConfirmDeleteOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans">
          {{ store.error }}
        </div>

        <div class="pt-4 flex justify-end gap-4">
          <Button variant="ghost" @click="isConfirmDeleteOpen = false">Hủy</Button>
          <Button @click="executeDelete" :disabled="store.isLoading" class="bg-red-500 hover:bg-red-600 border-transparent text-white shadow-md">
            {{ store.isLoading ? 'Đang xóa...' : 'Xóa phòng ban' }}
          </Button>
        </div>
      </div>
    </Modal>

  </div>
</template>

<style scoped>
/* Make vuetify data table look like minimal tailwind table */
:deep(.v-data-table) {
  background: transparent !important;
}
:deep(.v-data-table__th) {
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 0.75rem !important;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #64748B !important;
  font-weight: 500 !important;
  border-bottom: 1px solid #E2E8F0 !important;
  background: rgba(241, 245, 249, 0.3) !important;
  padding-top: 1rem !important;
  padding-bottom: 1rem !important;
}
:deep(.v-data-table__td) {
  border-bottom: 1px solid #E2E8F0 !important;
  padding-top: 0.5rem !important;
  padding-bottom: 0.5rem !important;
}
:deep(.v-data-table__tr:hover) {
  background: rgba(241, 245, 249, 0.4) !important;
}
</style>
