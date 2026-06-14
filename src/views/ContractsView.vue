<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { PlusIcon, PencilIcon, TrashIcon } from 'lucide-vue-next'
import { useContractStore } from '../stores/contract'
import { useAuthStore } from '../stores/auth'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'

const authStore = useAuthStore()
const canManageSystem = computed(() => ['Admin', 'HR'].includes(authStore.userRole || ''))

const store = useContractStore()
const isModalOpen = ref(false)
const isEditMode = ref(false)
const editingId = ref<string | null>(null)
const isConfirmDeleteOpen = ref(false)
const selectedContract = ref<any>(null)

const newContract = ref({
  contractTypeCode: '',
  contractTypeName: '',
  defaultDurationMonths: null as number | null,
  description: '',
  isActive: true
})

const headers = [
  { title: 'Code', align: 'start', key: 'contractTypeCode', width: '20%' },
  { title: 'Name', align: 'start', key: 'contractTypeName', width: '30%' },
  { title: 'Duration', align: 'start', key: 'defaultDurationMonths', width: '15%' },
  { title: 'Description', align: 'start', key: 'description', width: '20%' },
  { title: '', align: 'end', key: 'actions', sortable: false },
] as const

onMounted(() => {
  store.fetchContracts()
})

function openCreateModal() {
  isEditMode.value = false
  editingId.value = null
  newContract.value = {
    contractTypeCode: '',
    contractTypeName: '',
    defaultDurationMonths: null,
    description: '',
    isActive: true
  }
  isModalOpen.value = true
}

function openEditModal(item: any) {
  isEditMode.value = true
  editingId.value = item.id
  newContract.value = {
    contractTypeCode: item.contractTypeCode,
    contractTypeName: item.contractTypeName,
    defaultDurationMonths: item.defaultDurationMonths,
    description: item.description || '',
    isActive: item.isActive !== false
  }
  isModalOpen.value = true
}

async function submitCreateOrUpdate() {
  const payload = {
    contractTypeCode: newContract.value.contractTypeCode,
    contractTypeName: newContract.value.contractTypeName,
    defaultDurationMonths: newContract.value.defaultDurationMonths || null,
    description: newContract.value.description,
    isActive: newContract.value.isActive
  }
  
  let success = false
  if (isEditMode.value && editingId.value) {
    success = await store.updateContract(editingId.value, payload)
  } else {
    success = await store.createContract(payload)
  }

  if (success) {
    isModalOpen.value = false
  }
}

function confirmDelete(item: any) {
  selectedContract.value = item
  isConfirmDeleteOpen.value = true
}

async function executeDelete() {
  if (selectedContract.value) {
    const success = await store.deleteContract(selectedContract.value.id)
    if (success) isConfirmDeleteOpen.value = false
  }
}
</script>

<template>
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Contract Types</h1>
        <p class="text-muted-foreground font-sans text-lg">Manage employment agreements and durations.</p>
      </div>
      <Button v-if="canManageSystem" @click="openCreateModal" class="shadow-accent hover:shadow-accent-lg transition-all duration-300 hover:-translate-y-0.5">
        <PlusIcon class="w-4 h-4 mr-2" />
        New Contract Type
      </Button>
    </div>

    <div v-if="store.error && !isModalOpen && !isConfirmDeleteOpen" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
      {{ store.error }}
    </div>

    <!-- Minimalist Data Table -->
    <div class="bg-card border border-border rounded-2xl shadow-md overflow-hidden relative group">
      <div class="absolute -top-24 -right-24 w-48 h-48 bg-accent/5 rounded-full blur-[80px] pointer-events-none transition-opacity duration-1000 opacity-50 group-hover:opacity-100"></div>

      <v-data-table
        :headers="headers as any"
        :items="store.contracts"
        :loading="store.isLoading"
        class="bg-transparent font-sans"
        hover
      >
        <template #[`item.contractTypeCode`]="{ item }">
          <span class="font-mono text-sm font-medium text-muted-foreground">{{ item.contractTypeCode }}</span>
        </template>
        
        <template #[`item.contractTypeName`]="{ item }">
          <span class="font-sans font-medium text-foreground">{{ item.contractTypeName }}</span>
        </template>

        <template #[`item.defaultDurationMonths`]="{ item }">
          <span v-if="item.defaultDurationMonths" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
            {{ item.defaultDurationMonths }} Mo
          </span>
          <span v-else class="text-muted-foreground italic">—</span>
        </template>

        <template #[`item.description`]="{ item }">
          <span class="font-sans text-sm text-muted-foreground">{{ item.description || '—' }}</span>
        </template>

        <template #[`item.actions`]="{ item }">
          <div v-if="canManageSystem" class="flex items-center justify-end gap-1 opacity-60 group-hover/row:opacity-100 transition-opacity">
            <button @click="openEditModal(item)" class="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-colors" title="Edit">
              <PencilIcon class="w-4 h-4" />
            </button>
            <button @click="confirmDelete(item)" class="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </template>
      </v-data-table>
    </div>

    <!-- Create / Edit Modal -->
    <Modal :isOpen="isModalOpen" :title="isEditMode ? 'Edit Contract Type' : 'New Contract Type'" @close="isModalOpen = false">
      <form @submit.prevent="submitCreateOrUpdate" class="space-y-5">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Code <span class="text-red-500">*</span></label>
            <input v-model="newContract.contractTypeCode" type="text" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-mono text-sm" placeholder="e.g. FULL" :disabled="isEditMode"/>
          </div>
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Duration (Mo)</label>
            <input v-model="newContract.defaultDurationMonths" type="number" min="1" class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-mono text-sm" placeholder="12" />
          </div>
        </div>
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Name <span class="text-red-500">*</span></label>
          <input v-model="newContract.contractTypeName" type="text" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm" placeholder="Full-time Employment"/>
        </div>
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Description</label>
          <textarea v-model="newContract.description" rows="3" class="w-full p-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm resize-none" placeholder="Standard contract..."></textarea>
        </div>
        
        <div v-if="isEditMode" class="flex items-center gap-3 pt-2">
          <input type="checkbox" id="isActiveContract" v-model="newContract.isActive" class="w-4 h-4 rounded text-accent focus:ring-accent accent-accent" />
          <label for="isActiveContract" class="font-sans text-sm text-foreground">Active Status</label>
        </div>

        <div v-if="store.error && isModalOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans mt-4">
          {{ store.error }}
        </div>

        <div class="pt-6 border-t border-border flex justify-end gap-4 mt-6">
          <Button variant="ghost" type="button" @click="isModalOpen = false">Cancel</Button>
          <Button type="submit" :disabled="store.isLoading" class="min-w-[150px]">
            {{ store.isLoading ? 'Processing...' : (isEditMode ? 'Save Changes' : 'Create Type') }}
          </Button>
        </div>
      </form>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal :isOpen="isConfirmDeleteOpen" title="Confirm Deletion" @close="isConfirmDeleteOpen = false">
      <div class="space-y-6">
        <p class="text-sm text-muted-foreground font-sans">
          Are you sure you want to delete <strong>{{ selectedContract?.contractTypeName }}</strong>?
        </p>
        <div v-if="store.error && isConfirmDeleteOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans">
          {{ store.error }}
        </div>
        <div class="pt-4 flex justify-end gap-4">
          <Button variant="ghost" @click="isConfirmDeleteOpen = false">Cancel</Button>
          <Button @click="executeDelete" :disabled="store.isLoading" class="bg-red-500 hover:bg-red-600 border-transparent text-white shadow-md">
            {{ store.isLoading ? 'Deleting...' : 'Delete Contract Type' }}
          </Button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
:deep(.v-data-table) { background: transparent !important; }
:deep(.v-data-table__th) {
  font-family: 'JetBrains Mono', monospace !important;
  font-size: 0.75rem !important;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #64748B !important;
  font-weight: 500 !important;
  border-bottom: 1px solid #E2E8F0 !important;
  background: rgba(241, 245, 249, 0.3) !important;
}
:deep(.v-data-table__td) { border-bottom: 1px solid #E2E8F0 !important; }
:deep(.v-data-table__tr:hover) { background: rgba(241, 245, 249, 0.4) !important; }
</style>
