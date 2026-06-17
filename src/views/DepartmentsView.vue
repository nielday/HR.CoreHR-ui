<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { Tree as ATree, Tag as ATag, Empty as AEmpty, Button as AButton } from 'ant-design-vue'
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

// Dựng dữ liệu cây cho a-tree (key/title/children), giữ nguyên dữ liệu gốc trên mỗi node
function toNode(d: any): any {
  const children = (d.subDepartments || []).map(toNode)
  return { ...d, key: d.id, title: d.departmentName, ...(children.length ? { children } : {}) }
}
const treeData = computed(() => (store.departmentTree || []).map(toNode))
const expandedKeys = ref<string[]>([])
// Mặc định mở hết khi dữ liệu sẵn sàng
watch(treeData, (t) => {
  const keys: string[] = []
  const walk = (nodes: any[]) => nodes.forEach((n) => { keys.push(n.key); if (n.children) walk(n.children) })
  walk(t)
  expandedKeys.value = keys
}, { immediate: true })

// map employeeId -> tên trưởng phòng
const managerName = (id?: string | null) => {
  if (!id) return null
  const e = (employeeStore.employees as any[]).find((x) => x.id === id)
  return e ? `${e.fullName}` : null
}

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
        <p class="text-muted-foreground font-sans text-lg">Cơ cấu tổ chức dạng cây phân cấp.</p>
      </div>
      <Button v-if="canManageSystem" @click="openCreateModal" class="shadow-accent hover:shadow-accent-lg transition-all duration-300 hover:-translate-y-0.5">
        Thêm phòng ban
      </Button>
    </div>

    <div v-if="store.error && !isModalOpen && !isConfirmDeleteOpen" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
      {{ store.error }}
    </div>

    <!-- Cây phòng ban (Ant Design Tree) -->
    <div class="bg-card border border-border rounded-2xl shadow-md p-4 sm:p-6">
      <ATree
        v-if="treeData.length"
        v-model:expandedKeys="expandedKeys"
        :tree-data="treeData"
        :selectable="false"
        block-node
        class="dept-tree"
      >
        <template #title="node">
          <div class="flex items-center justify-between gap-3 py-1.5 pr-2 group/row w-full">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-sans font-semibold text-foreground text-[15px]">{{ node.departmentName }}</span>
              <span class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{{ node.departmentCode }}</span>
              <ATag v-if="node.isActive" color="green">Đang hoạt động</ATag>
              <ATag v-else color="default">Ngừng hoạt động</ATag>
              <span v-if="managerName(node.managerEmployeeId)" class="text-xs text-muted-foreground font-sans">
                · TP: {{ managerName(node.managerEmployeeId) }}
              </span>
              <span v-if="node.description" class="text-xs text-muted-foreground font-sans hidden md:inline">— {{ node.description }}</span>
            </div>
            <div v-if="canManageSystem" class="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
              <AButton type="text" size="small" @click.stop="openEditModal(node)">Sửa</AButton>
              <AButton
                type="text"
                size="small"
                danger
                :disabled="!!(node.children && node.children.length)"
                @click.stop="confirmDelete(node)"
              >Xóa</AButton>
            </div>
          </div>
        </template>
      </ATree>
      <AEmpty v-else :image="undefined" description="Chưa có phòng ban" />
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
.dept-tree :deep(.ant-tree-node-content-wrapper) {
  width: 100%;
}
.dept-tree :deep(.ant-tree-treenode) {
  width: 100%;
  padding-bottom: 4px;
}
</style>
