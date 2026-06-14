<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { PlusIcon } from 'lucide-vue-next'
import { useContractStore } from '../stores/contract'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'

const store = useContractStore()
const isModalOpen = ref(false)

const newContract = ref({
  contractTypeCode: '',
  contractTypeName: '',
  defaultDurationMonths: null as number | null,
  description: ''
})

onMounted(() => {
  store.fetchContracts()
})

async function submitCreate() {
  const success = await store.createContract({ ...newContract.value })
  if (success) {
    isModalOpen.value = false
    newContract.value = { contractTypeCode: '', contractTypeName: '', defaultDurationMonths: null, description: '' }
  }
}
</script>

<template>
  <div class="space-y-8 animate-in fade-in duration-700">
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2">Contract Types</h1>
        <p class="text-muted-foreground font-serif">Manage employment agreements and durations.</p>
      </div>
      <Button @click="isModalOpen = true">
        <PlusIcon class="w-4 h-4 mr-2" />
        New Contract Type
      </Button>
    </div>

    <div v-if="store.error && !isModalOpen" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
      {{ store.error }}
    </div>

    <div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden relative">
      <div v-if="store.isLoading && !isModalOpen" class="absolute inset-0 bg-card/50 backdrop-blur-[2px] flex items-center justify-center z-10">
        <span class="font-mono text-sm tracking-widest uppercase text-accent animate-pulse">Syncing...</span>
      </div>

      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-border bg-muted/30">
            <th class="py-4 px-6 font-mono text-xs uppercase tracking-widest text-muted-foreground font-medium w-1/5">Code</th>
            <th class="py-4 px-6 font-mono text-xs uppercase tracking-widest text-muted-foreground font-medium w-1/3">Name</th>
            <th class="py-4 px-6 font-mono text-xs uppercase tracking-widest text-muted-foreground font-medium w-1/6">Duration</th>
            <th class="py-4 px-6 font-mono text-xs uppercase tracking-widest text-muted-foreground font-medium">Description</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-if="store.contracts.length === 0 && !store.isLoading">
            <td colspan="4" class="py-12 text-center text-muted-foreground italic font-serif">
              No contract types found. Create one to get started.
            </td>
          </tr>
          <tr v-for="contract in store.contracts" :key="contract.id || contract.contractTypeCode" class="hover:bg-muted/30 transition-colors group">
            <td class="py-4 px-6 font-mono text-sm text-foreground">
              {{ contract.contractTypeCode }}
            </td>
            <td class="py-4 px-6 font-sans font-medium text-foreground">
              {{ contract.contractTypeName }}
            </td>
            <td class="py-4 px-6 font-sans text-sm text-muted-foreground">
              <span v-if="contract.defaultDurationMonths" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
                {{ contract.defaultDurationMonths }} Mo
              </span>
              <span v-else class="text-muted-foreground italic">—</span>
            </td>
            <td class="py-4 px-6 font-sans text-sm text-muted-foreground truncate max-w-xs">
              {{ contract.description || '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal :isOpen="isModalOpen" title="New Contract Type" @close="isModalOpen = false">
      <form @submit.prevent="submitCreate" class="space-y-6">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Code</label>
            <input 
              v-model="newContract.contractTypeCode" 
              type="text" 
              required 
              class="w-full h-12 px-4 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent focus:ring-offset-2 outline-none transition-all font-mono text-sm"
              placeholder="e.g. FULL"
            />
          </div>
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Duration (Mo)</label>
            <input 
              v-model="newContract.defaultDurationMonths" 
              type="number" 
              min="1"
              class="w-full h-12 px-4 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent focus:ring-offset-2 outline-none transition-all font-mono text-sm"
              placeholder="12"
            />
          </div>
        </div>
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Name</label>
          <input 
            v-model="newContract.contractTypeName" 
            type="text" 
            required 
            class="w-full h-12 px-4 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent focus:ring-offset-2 outline-none transition-all font-sans text-sm"
            placeholder="Full-time Employment"
          />
        </div>
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Description</label>
          <textarea 
            v-model="newContract.description" 
            rows="3"
            class="w-full p-4 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent focus:ring-offset-2 outline-none transition-all font-sans text-sm resize-none"
            placeholder="Standard full-time contract"
          ></textarea>
        </div>
        
        <div v-if="store.error && isModalOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {{ store.error }}
        </div>

        <div class="pt-4 flex gap-4">
          <Button variant="secondary" type="button" class="flex-1" @click="isModalOpen = false">Cancel</Button>
          <Button type="submit" class="flex-1" :disabled="store.isLoading">
            {{ store.isLoading ? 'Creating...' : 'Create' }}
          </Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
