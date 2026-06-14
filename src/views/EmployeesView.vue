<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { PlusIcon } from 'lucide-vue-next'
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
  hireDate: new Date().toISOString().split('T')[0] as string // fix TS error
})

onMounted(() => {
  store.fetchEmployees()
  // Prefetch Master Data for dropdowns
  if (deptStore.departments.length === 0) deptStore.fetchDepartments()
  if (posStore.positions.length === 0) posStore.fetchPositions()
  if (contractStore.contracts.length === 0) contractStore.fetchContracts()
})

async function submitCreate() {
  const payload = {
    ...newEmp.value,
    contractTypeId: newEmp.value.contractTypeId || null,
    contractStartDate: newEmp.value.contractStartDate ? new Date(newEmp.value.contractStartDate as string).toISOString() : null,
    contractEndDate: newEmp.value.contractEndDate ? new Date(newEmp.value.contractEndDate as string).toISOString() : null,
    hireDate: new Date(newEmp.value.hireDate as string).toISOString()
  }
  
  const success = await store.createEmployee(payload)
  if (success) {
    isModalOpen.value = false
    newEmp.value = {
      employeeCode: '', fullName: '', email: '', phoneNumber: '',
      departmentId: '', positionId: '', contractTypeId: '',
      contractStartDate: '', contractEndDate: '',
      hireDate: new Date().toISOString().split('T')[0] as string
    }
  }
}
</script>

<template>
  <div class="space-y-8 animate-in fade-in duration-700">
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2">Employees</h1>
        <p class="text-muted-foreground font-serif">Manage workforce, assignments, and contracts.</p>
      </div>
      <Button @click="isModalOpen = true">
        <PlusIcon class="w-4 h-4 mr-2" />
        New Employee
      </Button>
    </div>

    <div v-if="store.error && !isModalOpen" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
      {{ store.error }}
    </div>

    <div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden relative overflow-x-auto">
      <div v-if="store.isLoading && !isModalOpen" class="absolute inset-0 bg-card/50 backdrop-blur-[2px] flex items-center justify-center z-10">
        <span class="font-mono text-sm tracking-widest uppercase text-accent animate-pulse">Syncing...</span>
      </div>

      <table class="w-full text-left border-collapse min-w-[800px]">
        <thead>
          <tr class="border-b border-border bg-muted/30">
            <th class="py-4 px-6 font-mono text-xs uppercase tracking-widest text-muted-foreground font-medium w-1/6">Code</th>
            <th class="py-4 px-6 font-mono text-xs uppercase tracking-widest text-muted-foreground font-medium w-1/4">Name</th>
            <th class="py-4 px-6 font-mono text-xs uppercase tracking-widest text-muted-foreground font-medium w-1/5">Department</th>
            <th class="py-4 px-6 font-mono text-xs uppercase tracking-widest text-muted-foreground font-medium w-1/5">Position</th>
            <th class="py-4 px-6 font-mono text-xs uppercase tracking-widest text-muted-foreground font-medium">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-if="store.employees.length === 0 && !store.isLoading">
            <td colspan="5" class="py-12 text-center text-muted-foreground italic font-serif">
              No employees found. Create one to get started.
            </td>
          </tr>
          <tr v-for="emp in store.employees" :key="emp.id || emp.employeeCode" class="hover:bg-muted/30 transition-colors group">
            <td class="py-4 px-6 font-mono text-sm text-foreground">
              {{ emp.employeeCode }}
            </td>
            <td class="py-4 px-6 font-sans">
              <div class="font-medium text-foreground">{{ emp.fullName }}</div>
              <div class="text-xs text-muted-foreground">{{ emp.email }}</div>
            </td>
            <td class="py-4 px-6 font-sans text-sm text-muted-foreground">
              {{ emp.departmentName || '—' }}
            </td>
            <td class="py-4 px-6 font-sans text-sm text-muted-foreground">
              {{ emp.positionName || '—' }}
            </td>
            <td class="py-4 px-6 font-sans text-sm">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-accent/10 text-accent border border-accent/20">
                {{ emp.workingStatus || 'ACTIVE' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create Employee Modal (Large) -->
    <Modal :isOpen="isModalOpen" title="New Employee Profile" maxWidth="3xl" @close="isModalOpen = false">
      <form @submit.prevent="submitCreate" class="space-y-8">
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <!-- Column 1: Personal Info -->
          <div class="space-y-4">
            <div class="border-b border-border pb-2 mb-4">
              <h4 class="font-mono text-xs uppercase tracking-widest text-accent">Personal Information</h4>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Code <span class="text-red-500">*</span></label>
                <input v-model="newEmp.employeeCode" type="text" required class="w-full h-10 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-mono text-sm" placeholder="EMP-001"/>
              </div>
              <div>
                <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Hire Date <span class="text-red-500">*</span></label>
                <input v-model="newEmp.hireDate" type="date" required class="w-full h-10 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm"/>
              </div>
            </div>

            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Full Name <span class="text-red-500">*</span></label>
              <input v-model="newEmp.fullName" type="text" required class="w-full h-10 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm" placeholder="John Doe"/>
            </div>
            
            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Email Address <span class="text-red-500">*</span></label>
              <input v-model="newEmp.email" type="email" required class="w-full h-10 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm" placeholder="john.doe@company.com"/>
            </div>

            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Phone Number</label>
              <input v-model="newEmp.phoneNumber" type="tel" class="w-full h-10 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm" placeholder="+1 234 567 890"/>
            </div>
          </div>

          <!-- Column 2: Job & Contract -->
          <div class="space-y-4">
            <div class="border-b border-border pb-2 mb-4">
              <h4 class="font-mono text-xs uppercase tracking-widest text-accent">Assignment & Contract</h4>
            </div>

            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Department <span class="text-red-500">*</span></label>
              <select v-model="newEmp.departmentId" required class="w-full h-10 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
                <option value="" disabled>Select a department</option>
                <option v-for="d in deptStore.departments" :key="d.id" :value="d.id">{{ d.departmentName }} ({{ d.departmentCode }})</option>
              </select>
            </div>

            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Position <span class="text-red-500">*</span></label>
              <select v-model="newEmp.positionId" required class="w-full h-10 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
                <option value="" disabled>Select a position</option>
                <option v-for="p in posStore.positions" :key="p.id" :value="p.id">{{ p.positionName }}</option>
              </select>
            </div>

            <div class="pt-2">
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Contract Type</label>
              <select v-model="newEmp.contractTypeId" class="w-full h-10 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
                <option value="">No Contract (Pending)</option>
                <option v-for="c in contractStore.contracts" :key="c.id" :value="c.id">{{ c.contractTypeName }}</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-4" v-if="newEmp.contractTypeId">
              <div>
                <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Start Date</label>
                <input v-model="newEmp.contractStartDate" type="date" class="w-full h-10 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm"/>
              </div>
              <div>
                <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">End Date</label>
                <input v-model="newEmp.contractEndDate" type="date" class="w-full h-10 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm"/>
              </div>
            </div>
          </div>
        </div>

        <!-- Error in Modal -->
        <div v-if="store.error && isModalOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans mt-4">
          {{ store.error }}
        </div>

        <div class="pt-6 border-t border-border flex justify-end gap-4 mt-6">
          <Button variant="ghost" type="button" @click="isModalOpen = false">Cancel</Button>
          <Button type="submit" :disabled="store.isLoading" class="min-w-[150px]">
            {{ store.isLoading ? 'Processing...' : 'Create Employee' }}
          </Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
