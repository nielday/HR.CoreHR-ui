<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { MenuIcon, BellIcon, SearchIcon, LogOutIcon } from 'lucide-vue-next'

const route = useRoute()
const authStore = useAuthStore()

const pageTitle = computed(() => {
  if (route.path === '/employees') return 'Employees'
  if (route.path === '/departments') return 'Departments'
  if (route.path === '/positions') return 'Positions'
  if (route.path === '/contracts') return 'Contract Types'
  if (route.path === '/about') return 'About System'
  return 'Dashboard'
})

defineEmits(['toggle-drawer'])

function logout() {
  authStore.clearToken()
  window.location.href = '/login'
}
</script>

<template>
  <v-app-bar elevation="0" class="bg-background/80 backdrop-blur-xl border-b border-border px-2 md:px-6">
    <template v-slot:prepend>
      <!-- Mobile menu toggle -->
      <button @click="$emit('toggle-drawer')" class="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors mr-2">
        <MenuIcon class="w-5 h-5" />
      </button>
      
      <div class="flex flex-col">
        <h2 class="font-display text-xl md:text-2xl text-foreground">{{ pageTitle }}</h2>
      </div>
    </template>

    <template v-slot:append>
      <div class="flex items-center gap-2 md:gap-4">
        <!-- Search -->
        <div class="hidden md:flex items-center relative group">
          <SearchIcon class="w-4 h-4 absolute left-3 text-muted-foreground group-focus-within:text-accent transition-colors" />
          <input type="text" placeholder="Search anything..." class="h-10 pl-10 pr-4 rounded-xl bg-muted/50 border border-transparent focus:bg-transparent focus:border-accent/30 focus:ring-2 focus:ring-accent/10 outline-none text-sm w-64 transition-all" />
        </div>

        <button class="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors relative">
          <BellIcon class="w-5 h-5" />
          <span class="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-background animate-pulse"></span>
        </button>

        <div class="h-8 w-[1px] bg-border mx-1 md:mx-2"></div>

        <button @click="logout" class="flex items-center gap-2 p-2 px-3 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
          <LogOutIcon class="w-4 h-4" />
          <span class="hidden md:inline font-medium text-sm">Logout</span>
        </button>
      </div>
    </template>
  </v-app-bar>
</template>
