<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick, watch } from 'vue'
import { Empty as AEmpty } from 'ant-design-vue'
import { OrgChart } from 'd3-org-chart'
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

const chartContainer = ref<HTMLElement | null>(null)
let chart: any = null

onMounted(() => {
  store.fetchDepartments() // danh sách phẳng cho d3-org-chart
  if (employeeStore.employees.length === 0) employeeStore.fetchEmployees()
  
  // Gắn event listener global để nhận sự kiện từ D3 HTML
  ;(window as any).deptEdit = (id: string) => {
    const item = store.departments.find(x => x.id === id)
    if (item) openEditModal(item)
  }
  ;(window as any).deptDelete = (id: string) => {
    const item = store.departments.find(x => x.id === id)
    if (item) confirmDelete(item)
  }
})

onBeforeUnmount(() => {
  delete (window as any).deptEdit
  delete (window as any).deptDelete
})

// map employeeId -> tên trưởng phòng
const managerName = (id?: string | null) => {
  if (!id) return null
  const e = (employeeStore.employees as any[]).find((x) => x.id === id)
  return e ? `${e.fullName}` : null
}

function renderChart() {
  if (!chartContainer.value) return
  if (!chart) {
    chart = new OrgChart()
      .container(chartContainer.value)
      .nodeHeight((d: any) => 130)
      .nodeWidth((d: any) => 250)
      .childrenMargin((d: any) => 50)
      .compactMarginBetween((d: any) => 30)
      .compactMarginPair((d: any) => 30)
      .nodeId((d: any) => d.id)
      .parentNodeId((d: any) => d.parentDepartmentId)
      .nodeContent(function(d: any) {
         const item = d.data
         const hasChildren = d.children && d.children.length > 0
         const manager = managerName(item.managerEmployeeId)
         const isActiveColor = item.isActive ? 'background-color: #22c55e;' : 'background-color: #d1d5db;'
         
         const actionsHtml = canManageSystem.value ? `
            <div class="dept-node-actions mt-3 flex items-center justify-center gap-2 transition-opacity duration-200">
                <button type="button" class="dept-act" onclick="window.deptEdit('${item.id}')">Sửa</button>
                <button type="button" class="dept-act danger" ${hasChildren ? 'disabled' : ''} onclick="window.deptDelete('${item.id}')">Xóa</button>
            </div>
         ` : ''

         return `
           <div class="dept-node-container h-full w-full bg-white text-center border border-slate-200 rounded-2xl shadow-sm p-4 flex flex-col justify-center">
              <div class="font-sans font-semibold text-slate-900 text-[17px] leading-tight">${item.departmentName}</div>
              <div class="flex items-center justify-center gap-2 mt-1.5">
                <span class="font-mono text-[12px] uppercase tracking-wider text-slate-500">${item.departmentCode}</span>
                <span class="inline-block w-2.5 h-2.5 rounded-full" style="${isActiveColor}"></span>
              </div>
              ${manager ? `<div class="text-[13px] text-slate-500 mt-1.5">TP: ${manager}</div>` : ''}
              ${actionsHtml}
           </div>
         `
      })
  }

  const data = JSON.parse(JSON.stringify(store.departments))
  chart.data(data).render().expandAll()
}

watch(() => [store.departments, employeeStore.employees], () => {
  if (store.departments.length > 0) {
    nextTick(renderChart)
  }
}, { deep: true })

function openCreateModal() {
  isEditMode.value = false
  editingId.value = null
  newDept.value = { departmentCode: '', departmentName: '', description: '', parentDepartmentId: '', managerEmployeeId: '', isActive: true }
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
  const success = isEditMode.value && editingId.value
    ? await store.updateDepartment(editingId.value, payload)
    : await store.createDepartment(payload)
  if (success) isModalOpen.value = false
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
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Phòng ban</h1>
        <p class="text-muted-foreground font-sans text-lg">Sơ đồ tổ chức phân cấp từ trên xuống.</p>
      </div>
      <Button v-if="canManageSystem" @click="openCreateModal" class="shadow-accent hover:shadow-accent-lg transition-all duration-300 hover:-translate-y-0.5">
        Thêm phòng ban
      </Button>
    </div>

    <div v-if="store.error && !isModalOpen && !isConfirmDeleteOpen" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
      {{ store.error }}
    </div>

    <!-- Sơ đồ tổ chức (d3-org-chart) -->
    <div class="bg-card border border-border rounded-2xl shadow-md p-4 sm:p-6 dept-org-wrap overflow-hidden">
      <div v-if="store.departments.length" ref="chartContainer" class="w-full h-[600px] bg-[#f8fafc] rounded-xl overflow-hidden border border-slate-100"></div>
      <AEmpty v-else :image="undefined" description="Chưa có phòng ban" class="m-auto" />
    </div>

    <!-- Create / Edit Modal -->
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
.dept-org-wrap {
  width: 100%;
}

:deep(.dept-node-container) {
  transition: border-color .2s, box-shadow .2s, transform .2s;
}

:deep(.dept-node-container:hover) {
  border-color: var(--accent, #0052ff);
  box-shadow: 0 8px 22px rgba(0, 82, 255, 0.12);
}

:deep(.dept-node-actions) {
  opacity: 0;
}

:deep(.dept-node-container:hover .dept-node-actions) {
  opacity: 1;
}

:deep(.dept-act) {
  font-size: 13px;
  padding: 3px 14px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  transition: all .15s;
}

:deep(.dept-act:hover) {
  border-color: var(--accent, #0052ff);
  color: var(--accent, #0052ff);
}

:deep(.dept-act.danger:hover) {
  border-color: #ef4444;
  color: #ef4444;
  background: #fef2f2;
}

:deep(.dept-act:disabled) {
  opacity: .4;
  cursor: not-allowed;
}

/* Sửa màu nét vẽ của d3-org-chart để đẹp hơn */
:deep(.svg-chart-container path.link) {
  stroke: #94a3b8 !important;
  stroke-width: 2px !important;
}
</style>
