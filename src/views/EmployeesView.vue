<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { PlusIcon, PencilIcon, UserMinusIcon, ArrowRightLeftIcon, EyeIcon, BriefcaseIcon, MailIcon, PhoneIcon, DownloadIcon, UploadIcon, XIcon } from 'lucide-vue-next'
import { Row as ARow, Col as ACol, Card as ACard, Tag as ATag, Segmented as ASegmented, Spin as ASpin, Select as ASelect } from 'ant-design-vue'
import { useEmployeeStore } from '../stores/employee'
import { useDepartmentStore } from '../stores/department'
import { usePositionStore } from '../stores/position'
import { useContractStore } from '../stores/contract'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'
import DataTableShell from '../components/ui/DataTableShell.vue'

const store = useEmployeeStore()
const deptStore = useDepartmentStore()
const posStore = usePositionStore()
const contractStore = useContractStore()
const router = useRouter()

const authStore = useAuthStore()
const canManageSystem = computed(() => ['Admin', 'HR'].includes(authStore.userRole || ''))
const isEmployee = computed(() => authStore.userRole === 'Employee')

// Chế độ hiển thị: bảng (mặc định cho nghiệp vụ) hoặc lưới thẻ
const viewMode = ref<'list' | 'kanban'>('list')

function canViewDetail(item: any) {
  return !isEmployee.value || item.id === authStore.employeeId
}

const myDeptManagerId = computed<string | null>(() => {
  if (!isEmployee.value) return null
  const deptId = filtered.value[0]?.departmentId
  if (!deptId) return null
  const dept = deptStore.departments.find((d: any) => d.id === deptId)
  return dept?.managerEmployeeId || null
})

const isModalOpen = ref(false)
const isEditMode = ref(false)
const editingId = ref<string | null>(null)

const isResignModalOpen = ref(false)
const isTransferModalOpen = ref(false)
const selectedEmp = ref<any>(null)

const resignReason = ref('')
const resignDate = ref<string>(new Date().toISOString().split('T')[0] as string)

const transferData = ref({
  newDepartmentId: '',
  newPositionId: '',
  transferDate: new Date().toISOString().split('T')[0] as string,
  reason: ''
})

const newEmp = ref({
  employeeCode: '',
  fullName: '',
  email: '',
  phoneNumber: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  departmentId: '',
  additionalDepartmentIds: [] as string[],
  positionId: '',
  contractTypeId: '',
  contractStartDate: '',
  contractEndDate: '',
  hireDate: new Date().toISOString().split('T')[0] as string
})

// Tuỳ chọn phòng ban kiêm nhiệm (loại trừ phòng ban chính đang chọn)
const additionalDeptOptions = computed(() =>
  deptStore.departments
    .filter((d: any) => d.id !== newEmp.value.departmentId)
    .map((d: any) => ({ label: `${d.departmentName} (${d.departmentCode})`, value: d.id })),
)

const selectedEmployeeIds = ref<string[]>([])
const isImportModalOpen = ref(false)
const importFile = ref<File | null>(null)
const importResult = ref<any>(null)

const rowSelection = computed(() =>
  canManageSystem.value
    ? {
        selectedRowKeys: selectedEmployeeIds.value,
        onChange: (keys: any[]) => { selectedEmployeeIds.value = keys as string[] },
      }
    : undefined,
)

// ===== BỘ LỌC (chọn nhiều — multi-select, lọc phía client) =====
const fKeyword = ref('')
const fDeptIds = ref<string[]>([])
const fPosIds = ref<string[]>([])
const fContractIds = ref<string[]>([])
const fStatuses = ref<string[]>([])

const deptOptions = computed(() => deptStore.departments.map((d: any) => ({ label: d.departmentName, value: d.id })))
const posOptions = computed(() => posStore.positions.map((p: any) => ({ label: p.positionName, value: p.id })))
const contractOptions = computed(() => contractStore.contracts.map((c: any) => ({ label: c.contractTypeName, value: c.id })))
const statusOptions = [
  { label: 'Đang làm việc', value: 'Active' },
  { label: 'Thử việc', value: 'Probation' },
  { label: 'Tạm ngưng', value: 'Suspended' },
  { label: 'Đã nghỉ việc', value: 'Resigned' },
]

const hasFilter = computed(() =>
  !!fKeyword.value || fDeptIds.value.length > 0 || fPosIds.value.length > 0 || fContractIds.value.length > 0 || fStatuses.value.length > 0,
)

function clearFilters() {
  fKeyword.value = ''
  fDeptIds.value = []
  fPosIds.value = []
  fContractIds.value = []
  fStatuses.value = []
}

const filtered = computed(() => {
  const kw = fKeyword.value.trim().toLowerCase()
  return (store.allEmployees as any[]).filter((e) => {
    if (kw && !`${e.fullName || ''} ${e.employeeCode || ''} ${e.email || ''}`.toLowerCase().includes(kw)) return false
    if (fDeptIds.value.length && !fDeptIds.value.includes(e.departmentId)) return false
    if (fPosIds.value.length && !fPosIds.value.includes(e.positionId)) return false
    if (fContractIds.value.length && !fContractIds.value.includes(e.currentContractTypeId || e.contractTypeId)) return false
    if (fStatuses.value.length && !fStatuses.value.includes(e.workingStatus)) return false
    return true
  })
})

const tablePagination = {
  pageSize: 15,
  showSizeChanger: true,
  pageSizeOptions: ['15', '30', '50', '100'],
  showTotal: (t: number) => `${t} nhân viên`,
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  Active: { label: 'Đang làm', color: 'green' },
  Probation: { label: 'Thử việc', color: 'gold' },
  Suspended: { label: 'Tạm ngưng', color: 'orange' },
  Resigned: { label: 'Đã nghỉ', color: 'default' },
}

const columns = computed<any[]>(() => [
  { title: 'Mã', dataIndex: 'employeeCode', key: 'employeeCode', width: 90, sorter: (a: any, b: any) => (a.employeeCode || '').localeCompare(b.employeeCode || '') },
  { title: 'Nhân viên', dataIndex: 'fullName', key: 'fullName', sorter: (a: any, b: any) => (a.fullName || '').localeCompare(b.fullName || '') },
  { title: 'Phòng ban', dataIndex: 'departmentName', key: 'departmentName' },
  { title: 'Chức vụ', dataIndex: 'positionName', key: 'positionName' },
  { title: 'Loại HĐ', dataIndex: 'currentContractTypeName', key: 'currentContractTypeName', width: 120 },
  { title: 'SĐT', dataIndex: 'phoneNumber', key: 'phoneNumber', width: 130 },
  { title: 'Ngày vào', dataIndex: 'hireDate', key: 'hireDate', width: 110 },
  { title: 'Trạng thái', dataIndex: 'workingStatus', key: 'workingStatus', width: 120, align: 'center' },
  { title: '', key: 'actions', width: canManageSystem.value ? 150 : 60, align: 'right' },
])

function fmtDate(s?: string | null) {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d.getTime())) return String(s)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

async function reload() {
  await store.fetchAllEmployees()
}

onMounted(async () => {
  if (authStore.userRole !== 'Employee') {
    if (deptStore.departments.length === 0) await deptStore.fetchDepartments()
    if (posStore.positions.length === 0) await posStore.fetchPositions()
    if (contractStore.contracts.length === 0) await contractStore.fetchContracts()
  } else {
    if (deptStore.departments.length === 0) await deptStore.fetchDepartments()
  }
  await reload()
})

// ===== XUẤT FILE (CSV mở được bằng Excel) — theo đúng bộ lọc hiện tại =====
function csvCell(v: any) {
  const s = (v ?? '').toString()
  return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

function triggerExport() {
  const rows = filtered.value
  const head = ['Mã', 'Họ tên', 'Email', 'SĐT', 'Phòng ban', 'Chức vụ', 'Loại HĐ', 'Ngày vào', 'Trạng thái']
  const lines = [head.join(',')]
  for (const e of rows as any[]) {
    lines.push([
      e.employeeCode, e.fullName, e.email, e.phoneNumber, e.departmentName, e.positionName,
      e.currentContractTypeName, fmtDate(e.hireDate), STATUS_META[e.workingStatus]?.label || e.workingStatus,
    ].map(csvCell).join(','))
  }
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `NhanVien_${new Date().toISOString().split('T')[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
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
    if (result.successCount > 0) await reload()
  }
}

async function executeBatchResign() {
  if (!confirm(`Bạn có chắc muốn đánh dấu nghỉ việc ${selectedEmployeeIds.value.length} nhân viên?`)) return
  const success = await store.resignBatch(selectedEmployeeIds.value, 'Nghỉ việc hàng loạt', new Date().toISOString())
  if (success) {
    selectedEmployeeIds.value = []
    await reload()
    alert('Đã xử lý thành công!')
  }
}

function openCreateModal() {
  isEditMode.value = false
  editingId.value = null
  newEmp.value = {
    employeeCode: '', fullName: '', email: '', phoneNumber: '',
    dateOfBirth: '', gender: '', address: '',
    departmentId: '', additionalDepartmentIds: [], positionId: '', contractTypeId: '',
    contractStartDate: '', contractEndDate: '',
    hireDate: new Date().toISOString().split('T')[0] as string
  }
  isModalOpen.value = true
}

function openEditModal(item: any) {
  isEditMode.value = true
  editingId.value = item.id
  newEmp.value = {
    employeeCode: item.employeeCode,
    fullName: item.fullName,
    email: item.email,
    phoneNumber: item.phoneNumber || '',
    dateOfBirth: item.dateOfBirth ? item.dateOfBirth.split('T')[0] as string : '',
    gender: item.gender || '',
    address: item.address || '',
    departmentId: item.departmentId,
    additionalDepartmentIds: Array.isArray(item.additionalDepartmentIds) ? [...item.additionalDepartmentIds] : [],
    positionId: item.positionId,
    contractTypeId: item.currentContractTypeId || '',
    contractStartDate: item.contractStartDate ? item.contractStartDate.split('T')[0] as string : '',
    contractEndDate: item.contractEndDate ? item.contractEndDate.split('T')[0] as string : '',
    hireDate: item.hireDate ? item.hireDate.split('T')[0] as string : new Date().toISOString().split('T')[0] as string
  }
  isModalOpen.value = true
}

async function submitCreateOrUpdate() {
  const payload = {
    ...newEmp.value,
    dateOfBirth: newEmp.value.dateOfBirth ? new Date(newEmp.value.dateOfBirth as string).toISOString() : null,
    contractTypeId: newEmp.value.contractTypeId || null,
    contractStartDate: newEmp.value.contractStartDate ? new Date(newEmp.value.contractStartDate as string).toISOString() : null,
    contractEndDate: newEmp.value.contractEndDate ? new Date(newEmp.value.contractEndDate as string).toISOString() : null,
    hireDate: new Date(newEmp.value.hireDate as string).toISOString()
  }

  let success = false
  if (isEditMode.value && editingId.value) {
    success = await store.updateEmployee(editingId.value, payload)
  } else {
    success = await store.createEmployee(payload)
  }

  if (success) {
    isModalOpen.value = false
    await reload()
  }
}

function openTransfer(item: any) {
  selectedEmp.value = item
  transferData.value = {
    newDepartmentId: item.departmentId,
    newPositionId: item.positionId,
    transferDate: new Date().toISOString().split('T')[0] as string,
    reason: ''
  }
  isTransferModalOpen.value = true
}

async function executeTransfer() {
  if (selectedEmp.value) {
    const success = await store.transferEmployee(selectedEmp.value.id, {
      newDepartmentId: transferData.value.newDepartmentId,
      newPositionId: transferData.value.newPositionId,
      transferDate: new Date(transferData.value.transferDate).toISOString(),
      reason: transferData.value.reason
    })
    if (success) {
      isTransferModalOpen.value = false
      await reload()
    }
  }
}

function openResign(item: any) {
  selectedEmp.value = item
  resignReason.value = ''
  resignDate.value = new Date().toISOString().split('T')[0] as string
  isResignModalOpen.value = true
}

async function executeResign() {
  if (selectedEmp.value) {
    const success = await store.resignEmployee(selectedEmp.value.id, resignReason.value, new Date(resignDate.value).toISOString())
    if (success) {
      isResignModalOpen.value = false
      await reload()
    }
  }
}

const isActive = (s: string) => s === 'Active' || s === 'Probation'
</script>

<template>
  <DataTableShell
    title="Nhân viên"
    :subtitle="isEmployee ? 'Danh bạ đồng nghiệp trong phòng ban của bạn.' : 'Quản lý nhân sự, cập nhật hồ sơ và theo dõi trạng thái.'"
    :columns="columns"
    :data-source="filtered"
    :loading="store.isLoading"
    row-key="id"
    :pagination="viewMode === 'list' ? tablePagination : false"
    :row-selection="viewMode === 'list' ? rowSelection : undefined"
    :scroll-x="1100"
  >
    <!-- Header actions -->
    <template #actions>
      <ASegmented
        v-model:value="viewMode"
        :options="[{ label: 'Danh sách', value: 'list' }, { label: 'Lưới', value: 'kanban' }]"
      />
      <template v-if="canManageSystem">
        <Button variant="secondary" @click="triggerExport" :disabled="store.isLoading" title="Xuất danh sách đang lọc ra file (mở bằng Excel)">
          <DownloadIcon class="w-4 h-4 mr-2" /> Xuất file
        </Button>
        <Button variant="secondary" @click="isImportModalOpen = true; importFile = null; importResult = null">
          <UploadIcon class="w-4 h-4 mr-2" /> Nhập Excel
        </Button>
        <Button @click="openCreateModal">
          <PlusIcon class="w-4 h-4 mr-2" /> Thêm nhân viên
        </Button>
      </template>
    </template>

    <!-- Filters (multi-select) -->
    <template #filters>
      <input
        v-model="fKeyword"
        type="text"
        placeholder="Tìm theo tên, mã, email..."
        class="w-full sm:w-56 h-9 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm"
      />
      <template v-if="!isEmployee">
        <ASelect
          v-model:value="fDeptIds" mode="multiple" :options="deptOptions" allow-clear :max-tag-count="2"
          placeholder="Phòng ban" class="hr-multi" style="min-width: 200px"
        />
        <ASelect
          v-model:value="fPosIds" mode="multiple" :options="posOptions" allow-clear :max-tag-count="1"
          placeholder="Chức vụ" class="hr-multi" style="min-width: 180px"
        />
        <ASelect
          v-model:value="fContractIds" mode="multiple" :options="contractOptions" allow-clear :max-tag-count="1"
          placeholder="Loại hợp đồng" class="hr-multi" style="min-width: 180px"
        />
        <ASelect
          v-model:value="fStatuses" mode="multiple" :options="statusOptions" allow-clear :max-tag-count="2"
          placeholder="Trạng thái" class="hr-multi" style="min-width: 180px"
        />
        <button
          v-if="hasFilter"
          @click="clearFilters"
          class="h-9 px-3 inline-flex items-center gap-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-sm transition-all"
          title="Xóa toàn bộ bộ lọc"
        >
          <XIcon class="w-4 h-4" /> Xóa lọc
        </button>
      </template>
    </template>

    <!-- Banner: lỗi + thanh thao tác hàng loạt + đếm kết quả lọc -->
    <template #banner>
      <div v-if="store.error && !isModalOpen && !isResignModalOpen && !isTransferModalOpen" class="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
        {{ store.error }}
      </div>
      <div v-if="hasFilter" class="text-xs text-muted-foreground font-sans">
        Đang lọc: <strong>{{ filtered.length }}</strong> / {{ store.allEmployees.length }} nhân viên
        <span v-if="canManageSystem">— nút “Xuất file” sẽ kết xuất đúng {{ filtered.length }} nhân viên này.</span>
      </div>
      <div v-if="selectedEmployeeIds.length > 0 && canManageSystem" class="bg-warning/10 border border-warning/20 rounded-xl p-3 flex items-center justify-between">
        <span class="text-warning font-medium text-sm">Đã chọn {{ selectedEmployeeIds.length }} nhân viên</span>
        <div class="flex items-center gap-2">
          <Button variant="ghost" @click="selectedEmployeeIds = []" class="text-muted-foreground">Bỏ chọn</Button>
          <Button @click="executeBatchResign" class="bg-warning hover:bg-warning/90 text-white border-transparent">Đánh dấu nghỉ việc hàng loạt</Button>
        </div>
      </div>
    </template>

    <!-- LIST: tuỳ biến ô trong bảng -->
    <template v-if="viewMode === 'list'" #bodyCell="{ column, record }">
      <template v-if="column.key === 'fullName'">
        <div class="leading-tight">
          <div class="font-medium text-foreground flex items-center gap-1.5">
            {{ record.fullName }}
            <a-tag v-if="myDeptManagerId && record.id === myDeptManagerId" color="blue" size="small">Trưởng phòng</a-tag>
          </div>
          <div class="text-xs text-muted-foreground truncate max-w-[240px]">{{ record.email }}</div>
        </div>
      </template>
      <template v-else-if="column.key === 'departmentName'">
        <div>
          <div>{{ record.departmentName || '—' }}</div>
          <div v-if="record.additionalDepartmentNames && record.additionalDepartmentNames.length" class="mt-0.5 flex flex-wrap gap-1">
            <a-tag v-for="(n, i) in record.additionalDepartmentNames" :key="i" color="purple" class="!text-[10px] !leading-4 !px-1.5 !mr-0">+ {{ n }}</a-tag>
          </div>
        </div>
      </template>
      <template v-else-if="column.key === 'hireDate'">{{ fmtDate(record.hireDate) }}</template>
      <template v-else-if="column.key === 'workingStatus'">
        <a-tag :color="STATUS_META[record.workingStatus]?.color || 'default'">
          {{ STATUS_META[record.workingStatus]?.label || record.workingStatus }}
        </a-tag>
      </template>
      <template v-else-if="column.key === 'actions'">
        <div class="flex items-center justify-end gap-1">
          <button v-if="canViewDetail(record)" @click="router.push(`/employees/${record.id}`)" class="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all" title="Xem chi tiết">
            <EyeIcon class="w-4 h-4" />
          </button>
          <template v-if="canManageSystem">
            <button @click="openEditModal(record)" class="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-all" title="Sửa">
              <PencilIcon class="w-4 h-4" />
            </button>
            <button v-if="isActive(record.workingStatus)" @click="openTransfer(record)" class="p-1.5 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Điều chuyển">
              <ArrowRightLeftIcon class="w-4 h-4" />
            </button>
            <button v-if="isActive(record.workingStatus)" @click="openResign(record)" class="p-1.5 text-muted-foreground hover:text-warning hover:bg-warning/10 rounded-lg transition-all" title="Đánh dấu nghỉ việc">
              <UserMinusIcon class="w-4 h-4" />
            </button>
          </template>
        </div>
      </template>
    </template>

    <!-- KANBAN: lưới thẻ (thay cho bảng) -->
    <template v-if="viewMode === 'kanban'">
      <div v-if="store.isLoading" class="py-20 flex justify-center items-center">
        <a-spin size="large" />
      </div>
      <div v-else>
        <a-row :gutter="[16, 16]">
          <a-col :xs="24" :sm="12" :lg="8" :xl="6" v-for="item in filtered" :key="item.id">
            <a-card :bordered="false" class="shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden h-full border border-border/50 relative p-0" :bodyStyle="{ padding: 0 }">
              <div class="absolute top-3 right-3 z-10">
                <a-tag :color="STATUS_META[item.workingStatus || '']?.color || 'default'">{{ STATUS_META[item.workingStatus || '']?.label || item.workingStatus }}</a-tag>
              </div>
              <div class="p-5 flex flex-col items-center text-center">
                <h3 class="font-semibold text-foreground text-lg leading-tight mt-1">{{ item.fullName }}</h3>
                <span class="font-mono text-xs text-muted-foreground mt-1">{{ item.employeeCode }}</span>
              </div>
              <div class="px-5 pb-5 space-y-2.5">
                <div class="flex items-start gap-2.5 text-sm">
                  <BriefcaseIcon class="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p class="font-medium leading-none">{{ item.positionName || '—' }}</p>
                    <p class="text-xs text-muted-foreground mt-0.5">{{ item.departmentName || '—' }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <MailIcon class="w-4 h-4 shrink-0" /> <span class="truncate">{{ item.email || '—' }}</span>
                </div>
                <div class="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <PhoneIcon class="w-4 h-4 shrink-0" /> {{ item.phoneNumber || '—' }}
                </div>
              </div>
              <div class="border-t border-border/50 bg-muted/20 px-4 py-2.5 flex items-center justify-center gap-2">
                <button v-if="canViewDetail(item)" @click="router.push(`/employees/${item.id}`)" class="flex-1 flex justify-center p-2 text-muted-foreground hover:text-foreground hover:bg-white rounded-lg transition-all" title="Xem chi tiết">
                  <EyeIcon class="w-4 h-4" />
                </button>
                <template v-if="canManageSystem">
                  <button @click="openEditModal(item)" class="flex-1 flex justify-center p-2 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-all" title="Sửa">
                    <PencilIcon class="w-4 h-4" />
                  </button>
                  <button v-if="isActive(item.workingStatus || '')" @click="openTransfer(item)" class="flex-1 flex justify-center p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Điều chuyển">
                    <ArrowRightLeftIcon class="w-4 h-4" />
                  </button>
                  <button v-if="isActive(item.workingStatus || '')" @click="openResign(item)" class="flex-1 flex justify-center p-2 text-muted-foreground hover:text-warning hover:bg-warning/10 rounded-lg transition-all" title="Đánh dấu nghỉ việc">
                    <UserMinusIcon class="w-4 h-4" />
                  </button>
                </template>
              </div>
            </a-card>
          </a-col>
        </a-row>
        <div v-if="filtered.length === 0" class="py-12 bg-card rounded-2xl border border-border flex justify-center text-muted-foreground text-sm mt-4">
          Không tìm thấy nhân viên nào
        </div>
      </div>
    </template>
  </DataTableShell>

  <!-- Create / Edit Employee Modal -->
  <Modal :isOpen="isModalOpen" :title="isEditMode ? 'Sửa hồ sơ nhân viên' : 'Hồ sơ nhân viên mới'" maxWidth="3xl" @close="isModalOpen = false">
    <form @submit.prevent="submitCreateOrUpdate" class="space-y-8">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Column 1: Personal Info -->
        <div class="space-y-4">
          <div class="border-b border-border pb-2 mb-4">
            <h4 class="font-mono text-[10px] uppercase tracking-widest text-accent">Thông tin cá nhân</h4>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Mã <span class="text-red-500">*</span></label>
              <input v-model="newEmp.employeeCode" type="text" required pattern="[0-9]+" inputmode="numeric" class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-mono text-sm" placeholder="1001" :disabled="isEditMode"/>
            </div>
            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Ngày vào làm <span class="text-red-500">*</span></label>
              <input v-model="newEmp.hireDate" type="date" required class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm"/>
            </div>
          </div>
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Họ và tên <span class="text-red-500">*</span></label>
            <input v-model="newEmp.fullName" type="text" required class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm" placeholder="Nguyễn Văn A"/>
          </div>
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Email <span class="text-red-500">*</span></label>
            <input v-model="newEmp.email" type="email" required class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm" placeholder="john.doe@company.com"/>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Ngày sinh</label>
              <input v-model="newEmp.dateOfBirth" type="date" class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm"/>
            </div>
            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Giới tính</label>
              <select v-model="newEmp.gender" class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
                <option value="">Chọn</option>
                <option value="Male">Nam</option>
                <option value="Female">Nữ</option>
                <option value="Other">Khác</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Số điện thoại</label>
              <input v-model="newEmp.phoneNumber" type="tel" class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm" placeholder="+84 912 345 678"/>
            </div>
            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Địa chỉ</label>
              <input v-model="newEmp.address" type="text" class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm" placeholder="Thành phố, Quốc gia"/>
            </div>
          </div>
        </div>

        <!-- Column 2: Job & Contract -->
        <div class="space-y-4">
          <div class="border-b border-border pb-2 mb-4">
            <h4 class="font-mono text-[10px] uppercase tracking-widest text-accent">Phân công & Hợp đồng</h4>
          </div>
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Phòng ban <span class="text-red-500">*</span></label>
            <select v-model="newEmp.departmentId" required class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm" :disabled="isEditMode">
              <option value="" disabled>Chọn phòng ban</option>
              <option v-for="d in deptStore.departments" :key="d.id" :value="d.id">{{ d.departmentName }} ({{ d.departmentCode }})</option>
            </select>
            <p v-if="isEditMode" class="text-xs text-muted-foreground mt-1">Để thay đổi phòng ban hoặc chức vụ, hãy dùng chức năng Điều chuyển.</p>
          </div>
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Chức vụ <span class="text-red-500">*</span></label>
            <select v-model="newEmp.positionId" required class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm" :disabled="isEditMode">
              <option value="" disabled>Chọn chức vụ</option>
              <option v-for="p in posStore.positions" :key="p.id" :value="p.id">{{ p.positionName }}</option>
            </select>
          </div>
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Phòng ban kiêm nhiệm</label>
            <ASelect
              v-model:value="newEmp.additionalDepartmentIds"
              mode="multiple"
              :options="additionalDeptOptions"
              allow-clear
              placeholder="Không kiêm nhiệm"
              style="width: 100%"
            />
            <p class="text-[11px] text-muted-foreground mt-1">Phòng ban phụ ngoài phòng ban chính (nếu nhân viên kiêm nhiệm).</p>
          </div>
          <div class="pt-2">
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Loại hợp đồng</label>
            <select v-model="newEmp.contractTypeId" class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
              <option value="">Chưa có hợp đồng (Chờ xử lý)</option>
              <option v-for="c in contractStore.contracts" :key="c.id" :value="c.id">{{ c.contractTypeName }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-4" v-if="newEmp.contractTypeId">
            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Ngày bắt đầu</label>
              <input v-model="newEmp.contractStartDate" type="date" class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm"/>
            </div>
            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Ngày kết thúc</label>
              <input v-model="newEmp.contractEndDate" type="date" class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm"/>
            </div>
          </div>
        </div>
      </div>

      <div v-if="store.error && isModalOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans mt-4">
        {{ store.error }}
      </div>

      <div class="pt-6 border-t border-border flex justify-end gap-4 mt-6">
        <Button variant="ghost" type="button" @click="isModalOpen = false">Hủy</Button>
        <Button type="submit" :disabled="store.isLoading" class="min-w-[150px]">
          {{ store.isLoading ? 'Đang xử lý...' : (isEditMode ? 'Lưu thay đổi' : 'Tạo nhân viên') }}
        </Button>
      </div>
    </form>
  </Modal>

  <!-- Transfer Modal -->
  <Modal :isOpen="isTransferModalOpen" title="Điều chuyển nhân viên" @close="isTransferModalOpen = false">
    <form @submit.prevent="executeTransfer" class="space-y-4">
      <p class="text-sm text-muted-foreground font-sans">
        Điều chuyển <strong>{{ selectedEmp?.fullName }}</strong> sang phòng ban hoặc chức vụ mới.
      </p>
      <div>
        <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Phòng ban mới <span class="text-red-500">*</span></label>
        <select v-model="transferData.newDepartmentId" required class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-blue-500 outline-none font-sans text-sm">
          <option v-for="d in deptStore.departments" :key="d.id" :value="d.id">{{ d.departmentName }}</option>
        </select>
      </div>
      <div>
        <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Chức vụ mới <span class="text-red-500">*</span></label>
        <select v-model="transferData.newPositionId" required class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-blue-500 outline-none font-sans text-sm">
          <option v-for="p in posStore.positions" :key="p.id" :value="p.id">{{ p.positionName }}</option>
        </select>
      </div>
      <div>
        <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Ngày hiệu lực <span class="text-red-500">*</span></label>
        <input v-model="transferData.transferDate" type="date" required class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-blue-500 outline-none font-sans text-sm"/>
      </div>
      <div>
        <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Lý do</label>
        <textarea v-model="transferData.reason" rows="2" class="w-full p-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-blue-500 outline-none font-sans text-sm" placeholder="Lý do điều chuyển..."></textarea>
      </div>
      <div v-if="store.error && isTransferModalOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans mt-4">
        {{ store.error }}
      </div>
      <div class="pt-4 flex justify-end gap-4">
        <Button variant="ghost" type="button" @click="isTransferModalOpen = false">Hủy</Button>
        <Button type="submit" :disabled="store.isLoading" class="bg-blue-600 hover:bg-blue-700 border-transparent text-white shadow-md">Xác nhận điều chuyển</Button>
      </div>
    </form>
  </Modal>

  <!-- Resign Modal -->
  <Modal :isOpen="isResignModalOpen" title="Nghỉ việc" @close="isResignModalOpen = false">
    <form @submit.prevent="executeResign" class="space-y-4">
      <p class="text-sm text-muted-foreground font-sans">
        Đánh dấu <strong>{{ selectedEmp?.fullName }}</strong> đã nghỉ việc. Thao tác này sẽ thay đổi trạng thái nhưng vẫn giữ lại hồ sơ.
      </p>
      <div>
        <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Ngày nghỉ việc <span class="text-red-500">*</span></label>
        <input v-model="resignDate" type="date" required class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-warning outline-none font-sans text-sm"/>
      </div>
      <div>
        <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Lý do</label>
        <textarea v-model="resignReason" rows="3" class="w-full p-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-warning outline-none font-sans text-sm" placeholder="Lý do (không bắt buộc)..."></textarea>
      </div>
      <div v-if="store.error && isResignModalOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans mt-4">
        {{ store.error }}
      </div>
      <div class="pt-4 flex justify-end gap-4">
        <Button variant="ghost" type="button" @click="isResignModalOpen = false">Hủy</Button>
        <Button type="submit" :disabled="store.isLoading" class="bg-warning hover:bg-warning/90 border-transparent shadow-md">Xác nhận nghỉ việc</Button>
      </div>
    </form>
  </Modal>

  <!-- Import Modal -->
  <Modal :isOpen="isImportModalOpen" title="Nhập danh sách nhân viên từ file Excel" @close="isImportModalOpen = false">
    <div class="space-y-4">
      <p class="text-sm text-muted-foreground font-sans">
        Vui lòng tải lên file Excel (.xlsx) với các cột đúng như file mẫu. Các nhân viên mới sẽ tự động được thêm vào hệ thống.
      </p>
      <div class="p-4 bg-muted/50 rounded-xl border border-border border-dashed flex flex-col items-center justify-center gap-4">
        <input type="file" accept=".xlsx" @change="handleFileUpload" class="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20"/>
      </div>
      <div v-if="importResult" class="p-4 rounded-xl text-sm font-sans" :class="importResult.failedCount === 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-orange-50 text-orange-700 border border-orange-200'">
        <h4 class="font-bold mb-2">Kết quả nhập:</h4>
        <ul class="list-disc pl-5 space-y-1">
          <li>Tổng số dòng: <strong>{{ importResult.totalRows }}</strong></li>
          <li>Thành công: <strong>{{ importResult.successCount }}</strong></li>
          <li>Lỗi: <strong>{{ importResult.failedCount }}</strong></li>
        </ul>
        <div v-if="importResult.errors && importResult.errors.length > 0" class="mt-4 max-h-32 overflow-y-auto text-xs space-y-1">
          <p v-for="(err, idx) in importResult.errors" :key="idx" class="text-red-600">{{ err }}</p>
        </div>
      </div>
      <div v-if="store.error && isImportModalOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans">
        {{ store.error }}
      </div>
      <div class="pt-4 flex justify-end gap-4">
        <Button variant="ghost" type="button" @click="isImportModalOpen = false">Đóng</Button>
        <Button @click="executeImport" :disabled="!importFile || store.isLoading" class="min-w-[120px]">
          {{ store.isLoading ? 'Đang xử lý...' : 'Bắt đầu Nhập' }}
        </Button>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.hr-multi :deep(.ant-select-selector) {
  border-radius: 0.5rem;
  min-height: 36px;
}
</style>
