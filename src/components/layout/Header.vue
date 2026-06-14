<script setup lang="ts">

import { useAuthStore } from '../../stores/auth'
import { MenuIcon, LogOutIcon } from 'lucide-vue-next'

const authStore = useAuthStore()

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
        <!-- Title removed to prevent hierarchy redundancy with page headers -->
      </div>
    </template>

    <template v-slot:append>
      <div class="flex items-center gap-2 md:gap-4">
        <button @click="logout" class="flex items-center gap-2 p-2 px-3 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
          <LogOutIcon class="w-4 h-4" />
          <span class="hidden md:inline font-medium text-sm">Logout</span>
        </button>
      </div>
    </template>
  </v-app-bar>
</template>
