<script setup lang="ts">
import { XIcon } from 'lucide-vue-next'

defineProps<{
  title: string
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-foreground/20 backdrop-blur-sm" @click="emit('close')"></div>
    
    <!-- Modal Content -->
    <div class="relative bg-card w-full max-w-md p-8 rounded-2xl shadow-xl border border-border animate-in fade-in zoom-in-95 duration-200">
      <div class="flex justify-between items-center mb-6">
        <h3 class="font-display text-2xl text-foreground">{{ title }}</h3>
        <button type="button" @click="emit('close')" class="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted">
          <XIcon class="w-5 h-5" />
        </button>
      </div>
      
      <slot></slot>
    </div>
  </div>
</template>
