<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { PlusIcon } from 'lucide-vue-next'
import { usePositionStore } from '../stores/position'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'

const store = usePositionStore()
const isModalOpen = ref(false)

const newPos = ref({
  positionCode: '',
  positionName: '',
  description: ''
})

onMounted(() => {
  store.fetchPositions()
})

async function submitCreate() {
  const success = await store.createPosition({ ...newPos.value })
  if (success) {
    isModalOpen.value = false
    newPos.value = { positionCode: '', positionName: '', description: '' }
  }
}
</script>

<template>
  <div class="space-y-8 animate-in fade-in duration-700">
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2">Positions</h1>
        <p class="text-muted-foreground font-serif">Manage job titles and roles within the company.</p>
      </div>
      <Button @click="isModalOpen = true">
        <PlusIcon class="w-4 h-4 mr-2" />
        New Position
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
            <th class="py-4 px-6 font-mono text-xs uppercase tracking-widest text-muted-foreground font-medium">Description</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-if="store.positions.length === 0 && !store.isLoading">
            <td colspan="3" class="py-12 text-center text-muted-foreground italic font-serif">
              No positions found. Create one to get started.
            </td>
          </tr>
          <tr v-for="pos in store.positions" :key="pos.id || pos.positionCode" class="hover:bg-muted/30 transition-colors group">
            <td class="py-4 px-6 font-mono text-sm text-foreground">
              {{ pos.positionCode }}
            </td>
            <td class="py-4 px-6 font-sans font-medium text-foreground">
              {{ pos.positionName }}
            </td>
            <td class="py-4 px-6 font-sans text-sm text-muted-foreground truncate max-w-xs">
              {{ pos.description || '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal :isOpen="isModalOpen" title="New Position" @close="isModalOpen = false">
      <form @submit.prevent="submitCreate" class="space-y-6">
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Code</label>
          <input 
            v-model="newPos.positionCode" 
            type="text" 
            required 
            class="w-full h-12 px-4 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent focus:ring-offset-2 outline-none transition-all font-mono text-sm"
            placeholder="e.g. DEV"
          />
        </div>
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Name</label>
          <input 
            v-model="newPos.positionName" 
            type="text" 
            required 
            class="w-full h-12 px-4 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent focus:ring-offset-2 outline-none transition-all font-sans text-sm"
            placeholder="Developer"
          />
        </div>
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Description</label>
          <textarea 
            v-model="newPos.description" 
            rows="3"
            class="w-full p-4 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent focus:ring-offset-2 outline-none transition-all font-sans text-sm resize-none"
            placeholder="Software development and maintenance"
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
