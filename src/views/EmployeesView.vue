<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { PlusIcon, PencilIcon, TrashIcon, UserMinusIcon } from 'lucide-vue-next'
import { useEmployeeStore } from '../stores/employee'
import { useDepartmentStore } from '../stores/department'
import { usePositionStore } from '../stores/position'
import { useContractStore } from '../stores/contract'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'

const store = useEmployeeStore()
const deptStore = useDepartmentStore()
const posStore = usePositionStore()
const contractStore = useContractStore()

const isModalOpen = ref(false)
const isEditMode = ref(false)
const editingId = ref<string | null>(null)

// Resign / Delete Modals
const isConfirmDeleteOpen = ref(false)
const isResignModalOpen = ref(false)
const selectedEmp = ref<any>(null)
const resignReason = ref('')
const resignDate = ref<string>(new Date().toISOString().split('T')[0] as string)

const newEmp = ref({
  employeeCode: '',
  fullName: '',
  email: '',
  phoneNumber: '',
  departmentId: '',
  positionId: '',
  contractTypeId: '',
  contractStartDate: '',
  contractEndDate: '',
  hireDate: new Date().toISOString().split('T')[0] as string
})

const headers = [
  { title: 'Code', align: 'start', key: 'employeeCode' },
  { title: 'Employee', align: 'start', key: 'fullName' },
  { title: 'Department', align: 'start', key: 'departmentName' },
  { title: 'Position', align: 'start', key: 'positionName' },
  { title: 'Status', align: 'center', key: 'workingStatus' },
  { title: '', align: 'end', key: 'actions', sortable: false },
] as const

onMounted(() => {
  store.fetchEmployees()
  if (deptStore.departments.length === 0) deptStore.fetchDepartments()
  if (posStore.positions.length === 0) posStore.fetchPositions()
  if (contractStore.contracts.length === 0) contractStore.fetchContracts()
})

function openCreateModal() {
  isEditMode.value = false
  editingId.value = null
  newEmp.value = {
    employeeCode: '', fullName: '', email: '', phoneNumber: '',
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
    departmentId: item.departmentId,
    positionId: item.positionId,
    contractTypeId: item.contractTypeId || '',
    contractStartDate: item.contractStartDate ? item.contractStartDate.split('T')[0] as string : '',
    contractEndDate: item.contractEndDate ? item.contractEndDate.split('T')[0] as string : '',
    hireDate: item.hireDate ? item.hireDate.split('T')[0] as string : new Date().toISOString().split('T')[0] as string
  }
  isModalOpen.value = true
}

async function submitCreateOrUpdate() {
  const payload = {
    ...newEmp.value,
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
  }
}

function confirmDelete(item: any) {
  selectedEmp.value = item
  isConfirmDeleteOpen.value = true
}

async function executeDelete() {
  if (selectedEmp.value) {
    await store.deleteEmployee(selectedEmp.value.id)
    isConfirmDeleteOpen.value = false
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
    }
  }
}
</script>

<template>
  <div class="space-y-8 animate-in fade-in duration-700 pb-12">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2 text-foreground">Employees</h1>
        <p class="text-muted-foreground font-serif text-lg">Manage workforce, assignments, and contracts.</p>
      </div>
      <Button @click="openCreateModal" class="shadow-accent hover:shadow-accent-lg transition-all duration-300 hover:-translate-y-0.5">
        <PlusIcon class="w-4 h-4 mr-2" />
        New Employee
      </Button>
    </div>

    <div v-if="store.error && !isModalOpen && !isConfirmDeleteOpen && !isResignModalOpen" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
      {{ store.error }}
    </div>

    <!-- Vuetify Data Table embedded in Minimalist Card -->
    <div class="bg-card border border-border rounded-2xl shadow-md overflow-hidden relative group">
      <!-- Glow effect for texture -->
      <div class="absolute -top-24 -right-24 w-48 h-48 bg-accent/5 rounded-full blur-[80px] pointer-events-none transition-opacity duration-1000 opacity-50 group-hover:opacity-100"></div>

      <v-data-table
        :headers="headers as any"
        :items="store.employees"
        :loading="store.isLoading"
        class="bg-transparent font-sans"
        hover
      >
        <!-- Custom Code Column -->
        <template v-slot:item.employeeCode="{ item }">
          <span class="font-mono text-sm font-medium text-foreground">{{ item.employeeCode }}</span>
        </template>

        <!-- Custom Employee Column -->
        <template v-slot:item.fullName="{ item }">
          <div class="py-2">
            <div class="font-semibold text-foreground">{{ item.fullName }}</div>
            <div class="text-xs text-muted-foreground">{{ item.email }}</div>
          </div>
        </template>

        <!-- Custom Status Column -->
        <template v-slot:item.workingStatus="{ item }">
          <span v-if="item.workingStatus === 'ACTIVE'" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-green-50 text-green-600 border border-green-200">
            Active
          </span>
          <span v-else class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-gray-100 text-gray-500 border border-gray-200">
            Resigned
          </span>
        </template>

        <!-- Custom Actions Column -->
        <template v-slot:item.actions="{ item }">
          <div class="flex items-center justify-end gap-1 opacity-60 group-hover/row:opacity-100 transition-opacity">
            <button @click="openEditModal(item)" class="p-2 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-colors" title="Edit">
              <PencilIcon class="w-4 h-4" />
            </button>
            <button v-if="item.workingStatus === 'ACTIVE'" @click="openResign(item)" class="p-2 text-muted-foreground hover:text-warning hover:bg-warning/10 rounded-lg transition-colors" title="Mark Resigned">
              <UserMinusIcon class="w-4 h-4" />
            </button>
            <button @click="confirmDelete(item)" class="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </template>
      </v-data-table>
    </div>

    <!-- Create / Edit Employee Modal (Large) -->
    <Modal :isOpen="isModalOpen" :title="isEditMode ? 'Edit Employee Profile' : 'New Employee Profile'" maxWidth="3xl" @close="isModalOpen = false">
      <form @submit.prevent="submitCreateOrUpdate" class="space-y-8">
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <!-- Column 1: Personal Info -->
          <div class="space-y-4">
            <div class="border-b border-border pb-2 mb-4">
              <h4 class="font-mono text-[10px] uppercase tracking-widest text-accent">Personal Information</h4>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Code <span class="text-red-500">*</span></label>
                <input v-model="newEmp.employeeCode" type="text" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-mono text-sm" placeholder="EMP-001" :disabled="isEditMode"/>
              </div>
              <div>
                <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Hire Date <span class="text-red-500">*</span></label>
                <input v-model="newEmp.hireDate" type="date" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm"/>
              </div>
            </div>

            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Full Name <span class="text-red-500">*</span></label>
              <input v-model="newEmp.fullName" type="text" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm" placeholder="John Doe"/>
            </div>
            
            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Email Address <span class="text-red-500">*</span></label>
              <input v-model="newEmp.email" type="email" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm" placeholder="john.doe@company.com"/>
            </div>

            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Phone Number</label>
              <input v-model="newEmp.phoneNumber" type="tel" class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm" placeholder="+1 234 567 890"/>
            </div>
          </div>

          <!-- Column 2: Job & Contract -->
          <div class="space-y-4">
            <div class="border-b border-border pb-2 mb-4">
              <h4 class="font-mono text-[10px] uppercase tracking-widest text-accent">Assignment & Contract</h4>
            </div>

            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Department <span class="text-red-500">*</span></label>
              <select v-model="newEmp.departmentId" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
                <option value="" disabled>Select a department</option>
                <option v-for="d in deptStore.departments" :key="d.id" :value="d.id">{{ d.departmentName }} ({{ d.departmentCode }})</option>
              </select>
            </div>

            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Position <span class="text-red-500">*</span></label>
              <select v-model="newEmp.positionId" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
                <option value="" disabled>Select a position</option>
                <option v-for="p in posStore.positions" :key="p.id" :value="p.id">{{ p.positionName }}</option>
              </select>
            </div>

            <div class="pt-2">
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Contract Type</label>
              <select v-model="newEmp.contractTypeId" class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
                <option value="">No Contract (Pending)</option>
                <option v-for="c in contractStore.contracts" :key="c.id" :value="c.id">{{ c.contractTypeName }}</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4" v-if="newEmp.contractTypeId">
              <div>
                <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Start Date</label>
                <input v-model="newEmp.contractStartDate" type="date" class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm"/>
              </div>
              <div>
                <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">End Date</label>
                <input v-model="newEmp.contractEndDate" type="date" class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm"/>
              </div>
            </div>
          </div>
        </div>

        <div v-if="store.error && isModalOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans mt-4">
          {{ store.error }}
        </div>

        <div class="pt-6 border-t border-border flex justify-end gap-4 mt-6">
          <Button variant="ghost" type="button" @click="isModalOpen = false">Cancel</Button>
          <Button type="submit" :disabled="store.isLoading" class="min-w-[150px]">
            {{ store.isLoading ? 'Processing...' : (isEditMode ? 'Save Changes' : 'Create Employee') }}
          </Button>
        </div>
      </form>
    </Modal>

    <!-- Resign Modal -->
    <Modal :isOpen="isResignModalOpen" title="Resign Employee" @close="isResignModalOpen = false">
      <form @submit.prevent="executeResign" class="space-y-4">
        <p class="text-sm text-muted-foreground font-sans">
          Mark <strong>{{ selectedEmp?.fullName }}</strong> as resigned. This action will change their status but preserve their record.
        </p>

        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Resign Date <span class="text-red-500">*</span></label>
          <input v-model="resignDate" type="date" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-warning outline-none font-sans text-sm"/>
        </div>

        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Reason</label>
          <textarea v-model="resignReason" rows="3" class="w-full p-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-warning outline-none font-sans text-sm" placeholder="Optional reason..."></textarea>
        </div>

        <div v-if="store.error && isResignModalOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans mt-4">
          {{ store.error }}
        </div>

        <div class="pt-4 flex justify-end gap-4">
          <Button variant="ghost" type="button" @click="isResignModalOpen = false">Cancel</Button>
          <Button type="submit" :disabled="store.isLoading" class="bg-warning hover:bg-warning/90 border-transparent shadow-md">Confirm Resignation</Button>
        </div>
      </form>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal :isOpen="isConfirmDeleteOpen" title="Confirm Deletion" @close="isConfirmDeleteOpen = false">
      <div class="space-y-6">
        <p class="text-sm text-muted-foreground font-sans">
          Are you sure you want to completely delete the record for <strong>{{ selectedEmp?.fullName }}</strong>? This action cannot be undone. Consider marking them as resigned instead.
        </p>

        <div v-if="store.error && isConfirmDeleteOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans">
          {{ store.error }}
        </div>

        <div class="pt-4 flex justify-end gap-4">
          <Button variant="ghost" @click="isConfirmDeleteOpen = false">Cancel</Button>
          <Button @click="executeDelete" :disabled="store.isLoading" class="bg-red-500 hover:bg-red-600 border-transparent text-white shadow-md">
            {{ store.isLoading ? 'Deleting...' : 'Delete Permanently' }}
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
  padding-top: 0.75rem !important;
  padding-bottom: 0.75rem !important;
}
:deep(.v-data-table__tr:hover) {
  background: rgba(241, 245, 249, 0.4) !important;
}
</style>
