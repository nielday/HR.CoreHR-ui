<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { PlusIcon, PencilIcon, UserMinusIcon, ArrowRightLeftIcon, SearchIcon, EyeIcon, BriefcaseIcon, MailIcon, PhoneIcon, DownloadIcon, UploadIcon, CheckSquareIcon } from 'lucide-vue-next'
import { Row as ARow, Col as ACol, Card as ACard, Avatar as AAvatar, Pagination as APagination, Spin as ASpin } from 'ant-design-vue'
import { useEmployeeStore } from '../stores/employee'
import { useDepartmentStore } from '../stores/department'
import { usePositionStore } from '../stores/position'
import { useContractStore } from '../stores/contract'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'

const store = useEmployeeStore()
const deptStore = useDepartmentStore()
const posStore = usePositionStore()
const contractStore = useContractStore()
const router = useRouter()

const authStore = useAuthStore()
const canManageSystem = computed(() => ['Admin', 'HR'].includes(authStore.userRole || ''))
const isEmployee = computed(() => authStore.userRole === 'Employee')

// Nhân viên thường chỉ thấy đồng nghiệp cùng phòng + được mở chi tiết của riêng mình.
function canViewDetail(item: any) {
  return !isEmployee.value || item.id === authStore.employeeId
}

// Trưởng phòng (cấp trên) của phòng ban mà nhân viên đang xem — để làm nổi bật trong danh sách.
const myDeptManagerId = computed<string | null>(() => {
  if (!isEmployee.value) return null
  // Với nhân viên thường, mọi dòng đều cùng phòng ban → lấy departmentId từ dòng bất kỳ
  // (ổn định kể cả khi phân trang, không phụ thuộc việc dòng "chính mình" có trên trang hay không).
  const deptId = store.employees[0]?.departmentId
  if (!deptId) return null
  const dept = deptStore.departments.find((d: any) => d.id === deptId)
  return dept?.managerEmployeeId || null
})

const isModalOpen = ref(false)
const isEditMode = ref(false)
const editingId = ref<string | null>(null)

// Modals
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
  positionId: '',
  contractTypeId: '',
  contractStartDate: '',
  contractEndDate: '',
  hireDate: new Date().toISOString().split('T')[0] as string
})

const selectedEmployeeIds = ref<string[]>([])
const isSelectionMode = ref(false)
const isImportModalOpen = ref(false)
const importFile = ref<File | null>(null)
const importResult = ref<any>(null)

function toggleSelectionMode() {
  isSelectionMode.value = !isSelectionMode.value
  if (!isSelectionMode.value) {
    selectedEmployeeIds.value = []
  }
}

function toggleSelection(id: string) {
  const index = selectedEmployeeIds.value.indexOf(id)
  if (index === -1) selectedEmployeeIds.value.push(id)
  else selectedEmployeeIds.value.splice(index, 1)
}

function selectAll() {
  if (selectedEmployeeIds.value.length === store.employees.length) {
    selectedEmployeeIds.value = []
  } else {
    selectedEmployeeIds.value = store.employees.map(e => e.id as string)
  }
}

async function executeBatchResign() {
  if (!confirm(`Bạn có chắc muốn đánh dấu nghỉ việc ${selectedEmployeeIds.value.length} nhân viên?`)) return
  
  const success = await store.resignBatch(selectedEmployeeIds.value, 'Nghỉ việc hàng loạt', new Date().toISOString())
  if (success) {
    selectedEmployeeIds.value = []
    alert('Đã xử lý thành công!')
  }
}

async function triggerExport() {
  await store.exportExcel(searchParams.value)
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
    if (result.successCount > 0) fetchData()
  }
}

const searchParams = ref({
  keyword: '',
  departmentId: '',
  positionId: '',
  contractTypeId: '',
  workingStatus: ''
})

const pagination = ref({
  page: 1,
  itemsPerPage: 10
})

const headers = [
  { title: 'Mã', align: 'start', key: 'employeeCode' },
  { title: 'Nhân viên', align: 'start', key: 'fullName' },
  { title: 'Phòng ban', align: 'start', key: 'departmentName' },
  { title: 'Chức vụ', align: 'start', key: 'positionName' },
  { title: 'Số điện thoại', align: 'start', key: 'phoneNumber' },
  { title: 'Ngày vào làm', align: 'start', key: 'hireDate' },
  { title: 'Trạng thái', align: 'center', key: 'workingStatus' },
  { title: '', align: 'end', key: 'actions', sortable: false },
] as const

onMounted(async () => {
  if (authStore.userRole !== 'Employee') {
    if (deptStore.departments.length === 0) await deptStore.fetchDepartments()
    if (posStore.positions.length === 0) await posStore.fetchPositions()
    if (contractStore.contracts.length === 0) await contractStore.fetchContracts()
  } else {
    // Cần danh sách phòng ban để xác định trưởng phòng (cấp trên) trong danh bạ.
    if (deptStore.departments.length === 0) await deptStore.fetchDepartments()
  }
  fetchData()
})

function loadItems({ page, itemsPerPage }: any) {
  pagination.value.page = page
  pagination.value.itemsPerPage = itemsPerPage
  fetchData()
}

function fetchData() {
  store.fetchEmployees({
    page: pagination.value.page,
    pageSize: pagination.value.itemsPerPage,
    keyword: searchParams.value.keyword || undefined,
    departmentId: searchParams.value.departmentId || undefined,
    positionId: searchParams.value.positionId || undefined,
    contractTypeId: searchParams.value.contractTypeId || undefined,
    workingStatus: searchParams.value.workingStatus || undefined
  })
}

// Search debounce
let timeout: any
function onSearchInput() {
  clearTimeout(timeout)
  timeout = setTimeout(() => {
    pagination.value.page = 1
    fetchData()
  }, 500)
}

function onFilterChange() {
  pagination.value.page = 1
  fetchData()
}

function openCreateModal() {
  isEditMode.value = false
  editingId.value = null
  newEmp.value = {
    employeeCode: '', fullName: '', email: '', phoneNumber: '',
    dateOfBirth: '', gender: '', address: '',
    departmentId: '', positionId: '', contractTypeId: '',
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
    fetchData()
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
      fetchData()
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
      fetchData()
    }
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Nhân viên</h1>
        <p class="text-muted-foreground font-sans text-lg">{{ isEmployee ? 'Danh bạ đồng nghiệp trong phòng ban của bạn.' : 'Quản lý nhân sự, cập nhật hồ sơ và theo dõi trạng thái.' }}</p>
      </div>
      <div v-if="canManageSystem" class="flex flex-wrap items-center gap-2">
        <Button variant="ghost" @click="toggleSelectionMode" :class="isSelectionMode ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:bg-muted'">
          <CheckSquareIcon class="w-4 h-4 mr-2" />
          {{ isSelectionMode ? 'Thoát chọn nhiều' : 'Chọn nhiều' }}
        </Button>
        <Button variant="secondary" @click="triggerExport" :disabled="store.isLoading" class="border-border hover:bg-muted">
          <DownloadIcon class="w-4 h-4 mr-2" />
          Xuất Excel
        </Button>
        <Button variant="secondary" @click="isImportModalOpen = true; importFile = null; importResult = null" class="border-border hover:bg-muted">
          <UploadIcon class="w-4 h-4 mr-2" />
          Nhập Excel
        </Button>
        <Button @click="openCreateModal" class="shadow-accent hover:shadow-accent-lg transition-all duration-300 hover:-translate-y-0.5">
          <PlusIcon class="w-4 h-4 mr-2" />
          Thêm nhân viên
        </Button>
      </div>
    </div>

    <!-- Filters Section -->
    <div class="bg-card border border-border rounded-2xl shadow-sm p-4 flex flex-col xl:flex-row gap-4 items-center">
      <div class="relative w-full xl:w-64">
        <SearchIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input 
          v-model="searchParams.keyword" 
          @input="onSearchInput"
          type="text" 
          placeholder="Tìm theo tên, mã, email..."
          class="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm"
        />
      </div>
      <div v-if="!isEmployee" class="flex-1 w-full flex flex-col sm:flex-row gap-4">
        <select v-model="searchParams.departmentId" @change="onFilterChange" class="flex-1 h-10 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
          <option value="">Tất cả phòng ban</option>
          <option v-for="d in deptStore.departments" :key="d.id" :value="d.id">{{ d.departmentName }}</option>
        </select>
        <select v-model="searchParams.positionId" @change="onFilterChange" class="flex-1 h-10 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
          <option value="">Tất cả chức vụ</option>
          <option v-for="p in posStore.positions" :key="p.id" :value="p.id">{{ p.positionName }}</option>
        </select>
        <select v-model="searchParams.contractTypeId" @change="onFilterChange" class="flex-1 h-10 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
          <option value="">Tất cả hợp đồng</option>
          <option v-for="c in contractStore.contracts" :key="c.id" :value="c.id">{{ c.contractTypeName }}</option>
        </select>
        <select v-model="searchParams.workingStatus" @change="onFilterChange" class="w-full sm:w-40 h-10 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
          <option value="">Tất cả trạng thái</option>
          <option value="Active">Đang làm việc</option>
          <option value="Probation">Thử việc</option>
          <option value="Suspended">Tạm ngưng</option>
          <option value="Resigned">Đã nghỉ việc</option>
        </select>
      </div>
    </div>

    <div v-if="store.error && !isModalOpen && !isResignModalOpen && !isTransferModalOpen" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
      {{ store.error }}
    </div>

    <!-- Batch Actions Toolbar -->
    <div v-if="isSelectionMode && canManageSystem" class="bg-warning/10 border border-warning/20 rounded-xl p-3 flex items-center justify-between mb-4 animate-in slide-in-from-top-2">
      <div class="flex items-center gap-2 text-warning font-medium text-sm">
        <CheckSquareIcon class="w-5 h-5" />
        Đã chọn {{ selectedEmployeeIds.length }} nhân viên
      </div>
      <div class="flex items-center gap-2">
        <Button variant="ghost" size="sm" @click="selectAll" class="text-muted-foreground hover:text-foreground">
          {{ selectedEmployeeIds.length > 0 && selectedEmployeeIds.length === store.employees.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả' }}
        </Button>
        <Button size="sm" @click="executeBatchResign" :disabled="selectedEmployeeIds.length === 0" class="bg-warning hover:bg-warning/90 text-white border-transparent shadow-sm disabled:opacity-50">
          Đánh dấu nghỉ việc hàng loạt
        </Button>
      </div>
    </div>

    <!-- Data Grid -->
    <div class="relative group">
      <div class="absolute -top-24 -right-24 w-48 h-48 bg-accent/5 rounded-full blur-[80px] pointer-events-none transition-opacity duration-1000 opacity-50 group-hover:opacity-100"></div>

      <div v-if="store.isLoading" class="py-20 flex justify-center items-center">
        <a-spin size="large" />
      </div>

      <div v-else>
        <a-row :gutter="[24, 24]">
          <a-col :xs="24" :sm="12" :lg="8" :xl="6" v-for="item in store.employees" :key="item.id">
            <a-card :bordered="false" class="shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden h-full flex flex-col border border-border/50 group/card relative p-0" :bodyStyle="{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }">
              
              <!-- Checkbox chọn nhiều (Góc trái) -->
              <div v-if="canManageSystem && isSelectionMode" class="absolute top-4 left-4 z-20">
                <input 
                  type="checkbox" 
                  :checked="selectedEmployeeIds.includes(item.id as string)"
                  @change="toggleSelection(item.id as string)"
                  class="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent cursor-pointer"
                />
              </div>

              <!-- Tag trạng thái nổi góc phải -->
              <div class="absolute top-4 right-4 z-10">
                <span v-if="item.workingStatus === 'Active' || item.workingStatus === 'Probation'" class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-green-50 text-green-600 border border-green-200 shadow-sm">
                  {{ item.workingStatus === 'Probation' ? 'Thử việc' : 'Đang làm' }}
                </span>
                <span v-else class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-gray-100 text-gray-500 border border-gray-200 shadow-sm">
                  {{ item.workingStatus === 'Resigned' ? 'Đã nghỉ' : item.workingStatus === 'Suspended' ? 'Tạm ngưng' : item.workingStatus }}
                </span>
              </div>

              <!-- Top part: Avatar & Status -->
              <div class="p-5 flex flex-col items-center text-center mt-2">
                <a-avatar :size="64" class="bg-gradient-to-tr from-accent to-accent-secondary text-white font-display text-2xl shadow-md mb-3 flex items-center justify-center">
                  {{ item.fullName.split(' ').pop()?.[0] || 'NV' }}
                </a-avatar>
                <h3 class="font-semibold text-foreground text-lg leading-tight group-hover/card:text-accent transition-colors">{{ item.fullName }}</h3>
                <div class="flex items-center justify-center gap-2 mt-1.5">
                  <span class="font-mono text-xs text-muted-foreground">{{ item.employeeCode }}</span>
                  <span v-if="myDeptManagerId && item.id === myDeptManagerId" class="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono tracking-wider uppercase bg-accent/10 text-accent border border-accent/20">
                    Trưởng phòng
                  </span>
                </div>
              </div>

              <!-- Middle part: Details -->
              <div class="px-5 pb-5 flex-1 space-y-3">
                <div class="flex items-start gap-3 text-sm text-foreground">
                  <div class="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <BriefcaseIcon class="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p class="font-medium leading-none mb-1">{{ item.positionName || '—' }}</p>
                    <p class="text-xs text-muted-foreground">{{ item.departmentName || '—' }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3 text-sm text-foreground">
                  <div class="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <MailIcon class="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <span class="truncate text-xs">{{ item.email || '—' }}</span>
                </div>
                <div class="flex items-center gap-3 text-sm text-foreground">
                  <div class="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <PhoneIcon class="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <span class="text-xs">{{ item.phoneNumber || '—' }}</span>
                </div>
              </div>

              <!-- Actions -->
              <div class="border-t border-border/50 bg-muted/20 px-4 py-3 flex items-center justify-center gap-2 mt-auto">
                  <button v-if="canViewDetail(item)" @click="router.push(`/employees/${item.id}`)" class="flex-1 flex justify-center items-center p-2 text-muted-foreground hover:text-foreground hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-border" title="Xem chi tiết">
                    <EyeIcon class="w-4 h-4" />
                  </button>
                  <template v-if="canManageSystem">
                    <button @click="openEditModal(item)" class="flex-1 flex justify-center items-center p-2 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-all" title="Sửa">
                      <PencilIcon class="w-4 h-4" />
                    </button>
                    <button v-if="item.workingStatus === 'Active' || item.workingStatus === 'Probation'" @click="openTransfer(item)" class="flex-1 flex justify-center items-center p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Điều chuyển">
                      <ArrowRightLeftIcon class="w-4 h-4" />
                    </button>
                    <button v-if="item.workingStatus === 'Active' || item.workingStatus === 'Probation'" @click="openResign(item)" class="flex-1 flex justify-center items-center p-2 text-muted-foreground hover:text-warning hover:bg-warning/10 rounded-lg transition-all" title="Đánh dấu nghỉ việc">
                      <UserMinusIcon class="w-4 h-4" />
                    </button>
                  </template>
              </div>
            </a-card>
          </a-col>
        </a-row>

        <div v-if="store.employees.length === 0" class="py-12 bg-card rounded-2xl border border-border flex flex-col items-center justify-center text-muted-foreground font-sans text-sm mt-4">
           Không tìm thấy nhân viên nào
        </div>

        <!-- Pagination -->
        <div v-if="store.totalItems > 0" class="mt-8 flex justify-center">
          <div class="bg-card px-4 py-2 rounded-2xl border border-border shadow-sm inline-flex">
            <a-pagination
              v-model:current="pagination.page"
              v-model:pageSize="pagination.itemsPerPage"
              :total="store.totalItems"
              show-size-changer
              @change="loadItems({ page: pagination.page, itemsPerPage: pagination.itemsPerPage })"
            />
          </div>
        </div>
      </div>
    </div>

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
  </div>
</template>

<style scoped>
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
  padding-top: 0.75rem !important;
  padding-bottom: 0.75rem !important;
}
:deep(.v-data-table__tr:hover) {
  background: rgba(241, 245, 249, 0.4) !important;
}
</style>
