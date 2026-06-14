<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { PlusIcon } from 'lucide-vue-next'
import { useDepartmentStore } from '../stores/department'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'

const store = useDepartmentStore()
const isModalOpen = ref(false)

const newDept = ref({
  departmentCode: '',
  departmentName: ''
})

onMounted(() => {
  store.fetchDepartments()
})

async function submitCreate() {
  const success = await store.createDepartment({ ...newDept.value })
  if (success) {
    isModalOpen.value = false
    newDept.value = { departmentCode: '', departmentName: '' } // reset form
  }
}
</script>

<template>
  <div class="space-y-8 animate-in fade-in duration-700">
    <!-- Header Area -->
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2">Departments</h1>
        <p class="text-muted-foreground font-serif">Manage organization structure and divisions.</p>
      </div>
      <Button @click="isModalOpen = true">
        <PlusIcon class="w-4 h-4 mr-2" />
        New Department
      </Button>
    </div>

    <!-- Error Alert -->
    <div v-if="store.error && !isModalOpen" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
      {{ store.error }}
    </div>

    <!-- Data Table -->
    <div class="bg-card border border-border rounded-2xl shadow-sm overflow-hidden relative">
      <!-- Loading Overlay -->
      <div v-if="store.isLoading && !isModalOpen" class="absolute inset-0 bg-card/50 backdrop-blur-[2px] flex items-center justify-center z-10">
        <span class="font-mono text-sm tracking-widest uppercase text-accent animate-pulse">Syncing...</span>
      </div>

      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-border bg-muted/30">
            <th class="py-4 px-6 font-mono text-xs uppercase tracking-widest text-muted-foreground font-medium w-1/3">Code</th>
            <th class="py-4 px-6 font-mono text-xs uppercase tracking-widest text-muted-foreground font-medium w-2/3">Name</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-if="store.departments.length === 0 && !store.isLoading">
            <td colspan="2" class="py-12 text-center text-muted-foreground italic font-serif">
              No departments found. Create one to get started.
            </td>
          </tr>
          <tr v-for="dept in store.departments" :key="dept.id || dept.departmentCode" class="hover:bg-muted/30 transition-colors group">
            <td class="py-4 px-6 font-mono text-sm text-foreground">
              {{ dept.departmentCode }}
            </td>
            <td class="py-4 px-6 font-sans font-medium text-foreground">
              {{ dept.departmentName }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create Modal -->
    <Modal :isOpen="isModalOpen" title="New Department" @close="isModalOpen = false">
      <form @submit.prevent="submitCreate" class="space-y-6">
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Code</label>
          <input 
            v-model="newDept.departmentCode" 
            type="text" 
            required 
            class="w-full h-12 px-4 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent focus:ring-offset-2 outline-none transition-all font-mono text-sm"
            placeholder="e.g. IT-01"
          />
        </div>
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Name</label>
          <input 
            v-model="newDept.departmentName" 
            type="text" 
            required 
            class="w-full h-12 px-4 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent focus:ring-offset-2 outline-none transition-all font-sans text-sm"
            placeholder="Information Technology"
          />
        </div>
        
        <!-- Error in Modal -->
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
