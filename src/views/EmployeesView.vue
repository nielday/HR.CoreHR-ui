<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { PlusIcon, PencilIcon, UserMinusIcon, ArrowRightLeftIcon, SearchIcon, EyeIcon } from 'lucide-vue-next'
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
  { title: 'Trạng thái', align: 'center', key: 'workingStatus' },
  { title: '', align: 'end', key: 'actions', sortable: false },
] as const

onMounted(async () => {
  if (authStore.userRole !== 'Employee') {
    if (deptStore.departments.length === 0) await deptStore.fetchDepartments()
    if (posStore.positions.length === 0) await posStore.fetchPositions()
    if (contractStore.contracts.length === 0) await contractStore.fetchContracts()
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
  <div class="space-y-6 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Nhân viên</h1>
        <p class="text-muted-foreground font-sans text-lg">Quản lý nhân sự, cập nhật hồ sơ và theo dõi trạng thái.</p>
      </div>
      <Button v-if="canManageSystem" @click="openCreateModal" class="shadow-accent hover:shadow-accent-lg transition-all duration-300 hover:-translate-y-0.5">
        <PlusIcon class="w-4 h-4 mr-2" />
        Thêm nhân viên
      </Button>
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
      <div class="flex-1 w-full flex flex-col sm:flex-row gap-4">
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

    <!-- Data Table -->
    <div class="bg-card border border-border rounded-2xl shadow-md overflow-hidden relative group">
      <div class="absolute -top-24 -right-24 w-48 h-48 bg-accent/5 rounded-full blur-[80px] pointer-events-none transition-opacity duration-1000 opacity-50 group-hover:opacity-100"></div>

      <v-data-table-server
        :headers="headers as any"
        :items="store.employees"
        :items-length="store.totalItems"
        :loading="store.isLoading"
        @update:options="loadItems"
        class="bg-transparent font-sans"
        hover
      >
        <template #[`item.employeeCode`]="{ item }">
          <span class="font-mono text-sm font-medium text-foreground">{{ item.employeeCode }}</span>
        </template>

        <template #[`item.fullName`]="{ item }">
          <div class="py-2">
            <div class="font-semibold text-foreground">{{ item.fullName }}</div>
            <div class="text-xs text-muted-foreground">{{ item.email }}</div>
          </div>
        </template>

        <template #[`item.workingStatus`]="{ item }">
          <span v-if="item.workingStatus === 'Active' || item.workingStatus === 'Probation'" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-green-50 text-green-600 border border-green-200">
            {{ item.workingStatus === 'Probation' ? 'Thử việc' : 'Đang làm việc' }}
          </span>
          <span v-else class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-gray-100 text-gray-500 border border-gray-200">
            {{ item.workingStatus === 'Resigned' ? 'Đã nghỉ việc' : item.workingStatus === 'Suspended' ? 'Tạm ngưng' : item.workingStatus }}
          </span>
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="flex items-center justify-end gap-1 opacity-60 group-hover/row:opacity-100 transition-opacity">
            <button @click="router.push(`/employees/${item.id}`)" class="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Xem chi tiết">
              <EyeIcon class="w-4 h-4" />
            </button>
            <template v-if="canManageSystem">
              <button @click="openEditModal(item)" class="p-2 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-colors" title="Sửa">
                <PencilIcon class="w-4 h-4" />
              </button>
              <button v-if="item.workingStatus === 'Active' || item.workingStatus === 'Probation'" @click="openTransfer(item)" class="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Điều chuyển">
                <ArrowRightLeftIcon class="w-4 h-4" />
              </button>
              <button v-if="item.workingStatus === 'Active' || item.workingStatus === 'Probation'" @click="openResign(item)" class="p-2 text-muted-foreground hover:text-warning hover:bg-warning/10 rounded-lg transition-colors" title="Đánh dấu nghỉ việc">
                <UserMinusIcon class="w-4 h-4" />
              </button>
            </template>
          </div>
        </template>
      </v-data-table-server>
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
                <input v-model="newEmp.employeeCode" type="text" required class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-mono text-sm" placeholder="EMP-001" :disabled="isEditMode"/>
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
