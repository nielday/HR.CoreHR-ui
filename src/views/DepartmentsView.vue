<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick, watch } from 'vue'
import { Empty as AEmpty } from 'ant-design-vue'
import OrganizationChart from 'primevue/organizationchart'
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

onMounted(() => {
  store.fetchDepartmentTree()
  store.fetchDepartments() // danh sách phẳng cho dropdown phòng cha
  if (employeeStore.employees.length === 0) employeeStore.fetchEmployees()
})

// map employeeId -> tên trưởng phòng
const managerName = (id?: string | null) => {
  if (!id) return null
  const e = (employeeStore.employees as any[]).find((x) => x.id === id)
  return e ? `${e.fullName}` : null
}

// Chuyển cây phòng ban -> TreeNode cho PrimeVue OrganizationChart
function toOrg(d: any): any {
  return {
    key: d.id,
    expanded: true,
    data: {
      id: d.id,
      raw: d,
      name: d.departmentName,
      code: d.departmentCode,
      isActive: d.isActive,
      managerName: managerName(d.managerEmployeeId),
      hasChildren: !!(d.subDepartments && d.subDepartments.length)
    },
    children: (d.subDepartments || []).map(toOrg)
  }
}
const orgRoots = computed(() => (store.departmentTree || []).map(toOrg))

// Tự động phóng to sơ đồ nhỏ cho vừa bề ngang khung (chỉ zoom LÊN, tối đa 1.6×;
// cây lớn vượt khung giữ nguyên 1× và cuộn ngang). Giúp cây của Manager (ít node) không bị nhỏ.
const orgWrap = ref<HTMLElement | null>(null)
const orgInner = ref<HTMLElement | null>(null)
const zoom = ref(1)

async function fitZoom() {
  if (!orgWrap.value || !orgInner.value) return
  zoom.value = 1
  await nextTick()
  const natural = orgInner.value.scrollWidth
  const avail = orgWrap.value.clientWidth - 48 // trừ padding khung
  if (natural > 0 && avail > 0) {
    zoom.value = Math.min(1.6, Math.max(1, avail / natural))
  }
}

watch(orgRoots, () => { nextTick(fitZoom) }, { immediate: true })
onMounted(() => {
  window.addEventListener('resize', fitZoom)
  nextTick(fitZoom)
})
onBeforeUnmount(() => window.removeEventListener('resize', fitZoom))

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

    <!-- Sơ đồ tổ chức (PrimeVue OrganizationChart) -->
    <div ref="orgWrap" class="bg-card border border-border rounded-2xl shadow-md p-4 sm:p-6 overflow-auto dept-org-wrap">
      <div v-if="orgRoots.length" ref="orgInner" class="dept-org-inner space-y-12 py-6" :style="{ zoom }">
        <OrganizationChart
          v-for="root in orgRoots"
          :key="root.key"
          :value="root"
          collapsible
          class="dept-org"
        >
          <template #default="slotProps">
            <div class="dept-node text-center">
              <div class="font-sans font-semibold text-foreground text-[17px] leading-tight">{{ slotProps.node.data.name }}</div>
              <div class="flex items-center justify-center gap-2 mt-1.5">
                <span class="font-mono text-[12px] uppercase tracking-wider text-muted-foreground">{{ slotProps.node.data.code }}</span>
                <span class="inline-block w-2.5 h-2.5 rounded-full" :class="slotProps.node.data.isActive ? 'bg-green-500' : 'bg-gray-300'"></span>
              </div>
              <div v-if="slotProps.node.data.managerName" class="text-[13px] text-muted-foreground mt-1.5">TP: {{ slotProps.node.data.managerName }}</div>
              <div v-if="canManageSystem" class="dept-node-actions mt-3 flex items-center justify-center gap-2">
                <button type="button" class="dept-act" @click.stop="openEditModal(slotProps.node.data.raw)">Sửa</button>
                <button type="button" class="dept-act danger" :disabled="slotProps.node.data.hasChildren" @click.stop="confirmDelete(slotProps.node.data.raw)">Xóa</button>
              </div>
            </div>
          </template>
        </OrganizationChart>
      </div>
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
  min-height: clamp(560px, 68vh, 920px);
}

.dept-org-inner {
  width: max-content;
  margin-inline: auto;
  padding-block: 34px 96px;
  transform-origin: top center;
}

.dept-org {
  width: max-content;
  margin-inline: auto;
}

.dept-org :deep(.p-organizationchart-table) {
  margin-inline: auto;
}

.dept-node { min-width: 240px; }

.dept-act {
  font-size: 13px;
  padding: 3px 14px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  transition: all .15s;
}
.dept-act:hover { border-color: var(--accent, #0052ff); color: var(--accent, #0052ff); }
.dept-act.danger:hover { border-color: #ef4444; color: #ef4444; background: #fef2f2; }
.dept-act:disabled { opacity: .4; cursor: not-allowed; }

/* Hiện action khi hover node */
.dept-node-actions { opacity: 0; transition: opacity .2s; }
.dept-org :deep(.p-organizationchart-node-content):hover .dept-node-actions { opacity: 1; }

/* Ô node lớn, bo tròn, viền nhẹ + đổ bóng */
.dept-org :deep(.p-organizationchart-node-content) {
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  padding: 22px 36px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
  transition: border-color .2s, box-shadow .2s, transform .2s;
}
.dept-org :deep(.p-organizationchart-node-content:hover) {
  border-color: var(--accent, #0052ff);
  box-shadow: 0 8px 22px rgba(0, 82, 255, 0.12);
  transform: translateY(-2px);
}

/* PrimeVue v4 connector classes. Override logical borders from the theme. */
.dept-org :deep(.p-organizationchart-connector-down) {
  height: 82px !important;
  width: 4px !important;
  background: #64748b !important;
  border-radius: 999px;
}
.dept-org :deep(.p-organizationchart-connector-left) {
  border-inline-end: 3px solid #64748b !important;
}
.dept-org :deep(.p-organizationchart-connector-right) {
  border-inline-start: 3px solid #64748b !important;
}
.dept-org :deep(.p-organizationchart-connector-top) {
  border-block-start: 3px solid #64748b !important;
}
.dept-org :deep(.p-organizationchart-connectors :nth-child(1 of .p-organizationchart-connector-left)) {
  border-inline-end: 0 none !important;
}
.dept-org :deep(.p-organizationchart-connectors :nth-child(1 of .p-organizationchart-connector-right)) {
  border-inline-start: 3px solid #64748b !important;
}
.dept-org :deep(.p-organizationchart-node) { padding: 0 44px; }
.dept-org :deep(.p-organizationchart-nodes) { padding-top: 44px; }

/* Nút thu/mở nhánh rõ hơn */
.dept-org :deep(.p-organizationchart-node-toggle-button) {
  background: #fff;
  border: 2px solid #94a3b8;
  box-shadow: 0 2px 4px rgba(15, 23, 42, 0.14);
}
</style>
