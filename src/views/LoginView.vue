<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Button from '../components/ui/Button.vue'

const authStore = useAuthStore()
const router = useRouter()
const errorMsg = ref('')

async function handleLogin() {
  errorMsg.value = ''
  await authStore.login()
  
  if (authStore.isAuthenticated) {
    router.push('/departments')
  } else {
    errorMsg.value = authStore.error || 'Login failed'
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
    <!-- Decorative Radial Glow -->
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/5 rounded-full blur-[100px]"></div>

    <div class="w-full max-w-md p-10 bg-card border border-border rounded-2xl shadow-xl relative z-10">
      <div class="text-center mb-10">
        <h1 class="font-display text-4xl mb-2">HR <span class="gradient-text">Core</span></h1>
        <p class="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">Admin Portal</p>
      </div>

      <div class="space-y-6">
        <div v-if="errorMsg" class="p-4 bg-red-50 text-red-600 rounded-lg text-sm">
          {{ errorMsg }}
        </div>
        
        <p class="text-center font-sans text-muted-foreground mb-6">
          System requires an active API token to proceed.
        </p>

        <Button @click="handleLogin" :disabled="authStore.isLoading" class="w-full">
          {{ authStore.isLoading ? 'Authenticating...' : 'Acquire Token & Enter' }}
        </Button>
      </div>
    </div>
  </div>
</template>
