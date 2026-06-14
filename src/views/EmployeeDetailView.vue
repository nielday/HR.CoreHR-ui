<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeftIcon, FileTextIcon, HistoryIcon, UserIcon, PlusIcon, PencilIcon, XCircleIcon } from 'lucide-vue-next'
import { useEmployeeStore } from '../stores/employee'
import { useEmployeeContractStore } from '../stores/employee-contract'
import { useContractStore } from '../stores/contract'
import { useAuthStore } from '../stores/auth'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'

const route = useRoute()
const router = useRouter()
const empStore = useEmployeeStore()
const empContractStore = useEmployeeContractStore()
const contractTypeStore = useContractStore()
const authStore = useAuthStore()

const canManageSystem = computed(() => ['Admin', 'HR'].includes(authStore.userRole || ''))

const employeeId = route.params.id as string
const employee = ref<any>(null)
const transferHistory = ref<any[]>([])
const activeTab = ref('profile') // profile | contracts | history

// Contract Modals
const isContractModalOpen = ref(false)
const isEditContractMode = ref(false)
const editingContractId = ref<string | null>(null)
const isTerminateModalOpen = ref(false)
const isRenewContractMode = ref(false)

const newContract = ref({
  contractTypeId: '',
  contractCode: '',
  status: 1, // Default Active
  startDate: '',
  endDate: '',
  note: ''
})

const terminateData = ref({
  reason: '',
  actualEndDate: new Date().toISOString().split('T')[0] as string
})

onMounted(async () => {
  if (contractTypeStore.contracts.length === 0) {
    contractTypeStore.fetchContracts()
  }
  await loadEmployeeData()
})

async function loadEmployeeData() {
  employee.value = await empStore.fetchEmployeeById(employeeId)
  if (employee.value) {
    empContractStore.fetchContractsByEmployee(employeeId)
    const history = await empStore.fetchDepartmentHistory(employeeId)
    transferHistory.value = history
  }
}

function getStatusBadgeClass(status: number) {
  if (status === 1) return 'bg-green-50 text-green-600 border-green-200' // Active
  if (status === 4) return 'bg-red-50 text-red-600 border-red-200' // Terminated
  if (status === 3) return 'bg-gray-100 text-gray-500 border-gray-200' // Cancelled
  if (status === 2) return 'bg-orange-50 text-orange-600 border-orange-200' // Expired
  return 'bg-blue-50 text-blue-500 border-blue-200' // Pending = 0
}

function getStatusText(status: number) {
  switch(status) {
    case 0: return 'Pending'
    case 1: return 'Active'
    case 2: return 'Expired'
    case 3: return 'Cancelled'
    case 4: return 'Terminated'
    default: return 'Unknown'
  }
}

// Contract Functions
function openCreateContractModal() {
  isEditContractMode.value = false
  isRenewContractMode.value = false
  editingContractId.value = null
  newContract.value = { contractTypeId: '', contractCode: '', status: 1, startDate: '', endDate: '', note: '' }
  isContractModalOpen.value = true
}

function openEditContractModal(contract: any) {
  isEditContractMode.value = true
  isRenewContractMode.value = false
  editingContractId.value = contract.id
  newContract.value = {
    contractTypeId: contract.contractTypeId,
    contractCode: contract.contractCode || '',
    status: contract.status,
    startDate: contract.startDate ? contract.startDate.split('T')[0] : '',
    endDate: contract.endDate ? contract.endDate.split('T')[0] : '',
    note: contract.note || ''
  }
  isContractModalOpen.value = true
}

function openRenewContractModal(contract: any) {
  isEditContractMode.value = false
  isRenewContractMode.value = true
  editingContractId.value = contract.id
  newContract.value = {
    contractTypeId: contract.contractTypeId,
    contractCode: '',
    status: 1,
    startDate: new Date().toISOString().split('T')[0] as string,
    endDate: '',
    note: ''
  }
  isContractModalOpen.value = true
}

async function submitContract() {
  const payload = {
    employeeId,
    contractTypeId: newContract.value.contractTypeId,
    contractCode: newContract.value.contractCode,
    status: newContract.value.status,
    startDate: newContract.value.startDate ? new Date(newContract.value.startDate).toISOString() : null,
    endDate: newContract.value.endDate ? new Date(newContract.value.endDate).toISOString() : null,
    note: newContract.value.note
  }

  let success = false
  if (isRenewContractMode.value && editingContractId.value) {
    success = await empContractStore.renewContract(editingContractId.value, {
      contractTypeId: payload.contractTypeId,
      contractCode: payload.contractCode,
      startDate: payload.startDate,
      endDate: payload.endDate,
      note: payload.note
    })
  } else if (isEditContractMode.value && editingContractId.value) {
    success = await empContractStore.updateContract(editingContractId.value, payload)
  } else {
    success = await empContractStore.createContract(payload)
  }

  if (success) {
    isContractModalOpen.value = false
    await empContractStore.fetchContractsByEmployee(employeeId)
  }
}

function openTerminateModal(contract: any) {
  editingContractId.value = contract.id
  terminateData.value = {
    reason: '',
    actualEndDate: new Date().toISOString().split('T')[0] as string
  }
  isTerminateModalOpen.value = true
}

async function executeTerminate() {
  if (editingContractId.value) {
    const success = await empContractStore.terminateContract(editingContractId.value, {
      reason: terminateData.value.reason,
      actualEndDate: new Date(terminateData.value.actualEndDate).toISOString()
    })
    if (success) {
      isTerminateModalOpen.value = false
      await empContractStore.fetchContractsByEmployee(employeeId)
    }
  }
}
</script>

<template>
  <div class="space-y-6 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <button @click="router.back()" class="p-2 bg-card border border-border rounded-xl text-muted-foreground hover:text-foreground hover:shadow-sm transition-all">
        <ArrowLeftIcon class="w-5 h-5" />
      </button>
      <div>
        <h1 class="font-display text-3xl font-bold text-foreground flex items-center gap-3">
          {{ employee?.fullName || 'Loading...' }}
          <span v-if="employee" class="text-sm font-mono tracking-widest px-2.5 py-0.5 rounded-full" :class="getStatusBadgeClass(employee.workingStatus)">
            {{ employee.workingStatus }}
          </span>
        </h1>
        <p class="text-muted-foreground font-mono text-sm mt-1">Code: {{ employee?.employeeCode }} | Dept: {{ employee?.departmentName }} | Pos: {{ employee?.positionName }}</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 border-b border-border mb-6">
      <button @click="activeTab = 'profile'" :class="[activeTab === 'profile' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground', 'flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors font-sans text-sm']">
        <UserIcon class="w-4 h-4" /> Profile Details
      </button>
      <button @click="activeTab = 'contracts'" :class="[activeTab === 'contracts' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground', 'flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors font-sans text-sm']">
        <FileTextIcon class="w-4 h-4" /> Contracts
      </button>
      <button @click="activeTab = 'history'" :class="[activeTab === 'history' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground', 'flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors font-sans text-sm']">
        <HistoryIcon class="w-4 h-4" /> Transfer History
      </button>
    </div>

    <div v-if="!employee" class="p-8 text-center text-muted-foreground">
      Loading...
    </div>

    <!-- Profile Tab -->
    <div v-else-if="activeTab === 'profile'" class="bg-card border border-border rounded-2xl p-6 shadow-sm">
      <h3 class="font-display text-xl mb-6">Personal Information</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
        <div>
          <span class="block font-mono text-xs uppercase tracking-widest text-muted-foreground">Email</span>
          <span class="block mt-1 font-sans">{{ employee.email }}</span>
        </div>
        <div>
          <span class="block font-mono text-xs uppercase tracking-widest text-muted-foreground">Phone</span>
          <span class="block mt-1 font-sans">{{ employee.phoneNumber || '-' }}</span>
        </div>
        <div>
          <span class="block font-mono text-xs uppercase tracking-widest text-muted-foreground">Date of Birth</span>
          <span class="block mt-1 font-sans">{{ employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : '-' }}</span>
        </div>
        <div>
          <span class="block font-mono text-xs uppercase tracking-widest text-muted-foreground">Gender</span>
          <span class="block mt-1 font-sans">{{ employee.gender || '-' }}</span>
        </div>
        <div class="md:col-span-2">
          <span class="block font-mono text-xs uppercase tracking-widest text-muted-foreground">Address</span>
          <span class="block mt-1 font-sans">{{ employee.address || '-' }}</span>
        </div>
        <div class="md:col-span-2 mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
          <div>
            <span class="block font-mono text-xs uppercase tracking-widest text-muted-foreground">Hire Date</span>
            <span class="block mt-1 font-sans">{{ employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : '-' }}</span>
          </div>
          <div>
            <span class="block font-mono text-xs uppercase tracking-widest text-muted-foreground">Working Status</span>
            <span class="block mt-1 font-sans">{{ employee.workingStatus }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Contracts Tab -->
    <div v-else-if="activeTab === 'contracts'" class="space-y-4">
      <div class="flex justify-end" v-if="canManageSystem">
        <Button @click="openCreateContractModal" size="sm" class="shadow-sm">
          <PlusIcon class="w-4 h-4 mr-2" /> New Contract
        </Button>
      </div>
      
      <div v-if="empContractStore.error" class="p-4 bg-red-50 text-red-600 rounded-xl text-sm">
        {{ empContractStore.error }}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="c in empContractStore.contracts" :key="c.id" class="bg-card border border-border p-5 rounded-2xl shadow-sm relative group">
          <div class="flex justify-between items-start mb-3">
            <h4 class="font-semibold">{{ c.contractTypeName }} ({{ c.contractCode }})</h4>
            <span class="px-2 py-0.5 text-[10px] font-mono tracking-widest uppercase rounded-full border" :class="getStatusBadgeClass(c.status)">{{ getStatusText(c.status) }}</span>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between text-muted-foreground">
              <span>Start:</span>
              <span class="text-foreground">{{ c.startDate ? new Date(c.startDate).toLocaleDateString() : '-' }}</span>
            </div>
            <div class="flex justify-between text-muted-foreground">
              <span>End:</span>
              <span class="text-foreground">{{ c.endDate ? new Date(c.endDate).toLocaleDateString() : 'Indefinite' }}</span>
            </div>
            <div class="flex justify-between text-muted-foreground" v-if="c.actualEndDate">
              <span>Actual End:</span>
              <span class="text-foreground">{{ new Date(c.actualEndDate).toLocaleDateString() }}</span>
            </div>
          </div>
          <div v-if="canManageSystem" class="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-card shadow-sm p-1 rounded-lg border border-border">
            <button v-if="c.status === 1" @click="openRenewContractModal(c)" class="p-1.5 text-muted-foreground hover:text-green-500 rounded-md" title="Renew">
              <PlusIcon class="w-4 h-4" />
            </button>
            <button v-if="c.status !== 4 && c.status !== 3" @click="openEditContractModal(c)" class="p-1.5 text-muted-foreground hover:text-accent rounded-md" title="Edit">
              <PencilIcon class="w-4 h-4" />
            </button>
            <button v-if="c.status === 1 || c.status === 0" @click="openTerminateModal(c)" class="p-1.5 text-muted-foreground hover:text-red-500 rounded-md" title="Terminate">
              <XCircleIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
        <div v-if="empContractStore.contracts.length === 0" class="col-span-full py-8 text-center text-muted-foreground bg-card border border-border rounded-2xl border-dashed">
          No contracts found for this employee.
        </div>
      </div>
    </div>

    <!-- History Tab -->
    <div v-else-if="activeTab === 'history'" class="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div class="p-6">
        <h3 class="font-display text-xl mb-2">Department & Position Transfers</h3>
        <p class="text-muted-foreground text-sm">History of all role and department changes.</p>
      </div>
      <table class="w-full text-left text-sm font-sans">
        <thead class="bg-muted/50 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <tr>
            <th class="px-6 py-4 font-medium">Effective Date</th>
            <th class="px-6 py-4 font-medium">From</th>
            <th class="px-6 py-4 font-medium">To</th>
            <th class="px-6 py-4 font-medium">Reason</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="h in transferHistory" :key="h.id" class="hover:bg-muted/30 transition-colors">
            <td class="px-6 py-4">{{ new Date(h.transferDate).toLocaleDateString() }}</td>
            <td class="px-6 py-4">
              <div class="font-medium text-foreground">{{ h.fromDepartmentName || '-' }}</div>
              <div class="text-xs text-muted-foreground">{{ h.oldPositionName || '-' }}</div>
            </td>
            <td class="px-6 py-4">
              <div class="font-medium text-foreground">{{ h.toDepartmentName || '-' }}</div>
              <div class="text-xs text-muted-foreground">{{ h.newPositionName || '-' }}</div>
            </td>
            <td class="px-6 py-4 text-muted-foreground">{{ h.reason || '-' }}</td>
          </tr>
          <tr v-if="transferHistory.length === 0">
            <td colspan="4" class="px-6 py-8 text-center text-muted-foreground italic">No transfer history found.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Contract Modal -->
    <Modal :isOpen="isContractModalOpen" :title="isRenewContractMode ? 'Renew Contract' : (isEditContractMode ? 'Edit Contract' : 'New Contract')" @close="isContractModalOpen = false">
      <form @submit.prevent="submitContract" class="space-y-4">
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Contract Type <span class="text-red-500">*</span></label>
          <select v-model="newContract.contractTypeId" :disabled="isEditContractMode" required class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
            <option value="" disabled>Select Type</option>
            <option v-for="c in contractTypeStore.contracts" :key="c.id" :value="c.id">{{ c.contractTypeName }}</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Contract Code <span class="text-red-500">*</span></label>
            <input v-model="newContract.contractCode" type="text" :disabled="isEditContractMode" required class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm"/>
          </div>
          <div v-if="!isRenewContractMode">
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Status <span class="text-red-500">*</span></label>
            <select v-model="newContract.status" required class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
              <option :value="0">Pending</option>
              <option :value="1">Active</option>
              <option :value="2">Expired</option>
              <option :value="3">Cancelled</option>
              <option :value="4">Terminated</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Start Date <span class="text-red-500">*</span></label>
            <input v-model="newContract.startDate" type="date" :disabled="isEditContractMode" required class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm"/>
          </div>
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">End Date</label>
            <input v-model="newContract.endDate" type="date" class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm"/>
          </div>
        </div>
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Notes</label>
          <textarea v-model="newContract.note" rows="2" class="w-full p-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm" placeholder="Optional notes..."></textarea>
        </div>
        
        <div v-if="empContractStore.error && isContractModalOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans">
          {{ empContractStore.error }}
        </div>

        <div class="pt-4 flex justify-end gap-4">
          <Button variant="ghost" type="button" @click="isContractModalOpen = false">Cancel</Button>
          <Button type="submit" :disabled="empContractStore.isLoading" class="min-w-[120px]">
            {{ empContractStore.isLoading ? 'Saving...' : 'Save' }}
          </Button>
        </div>
      </form>
    </Modal>

    <!-- Terminate Modal -->
    <Modal :isOpen="isTerminateModalOpen" title="Terminate Contract" @close="isTerminateModalOpen = false">
      <form @submit.prevent="executeTerminate" class="space-y-4">
        <p class="text-sm text-muted-foreground font-sans">
          Are you sure you want to terminate this contract early?
        </p>

        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Actual End Date <span class="text-red-500">*</span></label>
          <input v-model="terminateData.actualEndDate" type="date" required class="w-full h-10 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-red-500 outline-none font-sans text-sm"/>
        </div>

        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Reason <span class="text-red-500">*</span></label>
          <textarea v-model="terminateData.reason" required rows="3" class="w-full p-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-red-500 outline-none font-sans text-sm" placeholder="Reason for termination..."></textarea>
        </div>

        <div v-if="empContractStore.error && isTerminateModalOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans mt-4">
          {{ empContractStore.error }}
        </div>

        <div class="pt-4 flex justify-end gap-4">
          <Button variant="ghost" type="button" @click="isTerminateModalOpen = false">Cancel</Button>
          <Button type="submit" :disabled="empContractStore.isLoading" class="bg-red-500 hover:bg-red-600 border-transparent text-white shadow-md">Confirm Termination</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
