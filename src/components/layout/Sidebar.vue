<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const authStore = useAuthStore()

const drawer = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const userRole = computed(() => authStore.userRole)

// Determine visibility of menus based on role
const canManageSystem = computed(() => ['Admin', 'HR'].includes(userRole.value || ''))
const canViewAll = computed(() => ['Admin', 'HR', 'Manager'].includes(userRole.value || ''))
</script>

<template>
  <v-navigation-drawer v-model="drawer" border="right" elevation="0" class="bg-foreground text-white/70 border-r border-border/10" :width="280">
    <div class="h-full flex flex-col relative overflow-hidden bg-foreground">
      
      <!-- Background Texture (Dot pattern for dark sections) -->
      <div class="absolute inset-0 texture-dots opacity-5 pointer-events-none"></div>

      <!-- Logo Section -->
      <div class="h-20 px-6 flex items-center gap-3 border-b border-white/5 flex-shrink-0 relative z-10">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-secondary flex items-center justify-center shadow-accent">
          <span class="font-display font-bold text-white text-lg">HR</span>
        </div>
        <div>
          <h1 class="font-display text-xl text-white tracking-tight leading-tight">Core</h1>
          <p class="font-mono text-[10px] uppercase tracking-widest text-accent-secondary">Enterprise</p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 py-6 space-y-1 relative z-10 overflow-y-auto custom-scrollbar">
        <div class="px-4 mb-2 mt-2">
          <span class="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">Main Menu</span>
        </div>

        <RouterLink to="/employees" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
          <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
          <span class="font-sans font-medium text-sm">Employees</span>
        </RouterLink>

        <template v-if="canViewAll">
          <RouterLink to="/departments" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
            <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
            <span class="font-sans font-medium text-sm">Departments</span>
          </RouterLink>
        </template>
        
        <template v-if="canManageSystem">
          <div class="px-4 mb-2 mt-8">
            <span class="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">Settings</span>
          </div>

          <RouterLink to="/positions" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
            <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
            <span class="font-sans font-medium text-sm">Positions</span>
          </RouterLink>

          <RouterLink to="/contracts" class="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
            <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
            <span class="font-sans font-medium text-sm">Contract Types</span>
          </RouterLink>
        </template>
      </nav>

      <!-- Bottom User Profile Section -->
      <div class="p-4 border-t border-white/5 bg-foreground/50 backdrop-blur-sm relative z-10">
        <div class="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/5">
          <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-accent to-accent-secondary p-[2px]">
            <div class="w-full h-full rounded-full border border-background overflow-hidden bg-white">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="User" class="w-full h-full object-cover" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">{{ userRole === 'Admin' ? 'Administrator' : userRole }}</p>
            <p class="text-xs text-muted-foreground truncate">{{ userRole }} Role</p>
          </div>
        </div>
      </div>
      
    </div>
  </v-navigation-drawer>
</template>

<style scoped>
.texture-dots {
  background-image: radial-gradient(circle, white 1px, transparent 1px);
  background-size: 32px 32px;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
a.router-link-exact-active > span:first-child {
  background-color: var(--accent, #0052FF) !important;
  box-shadow: 0 0 8px var(--accent, #0052FF);
}
</style>
