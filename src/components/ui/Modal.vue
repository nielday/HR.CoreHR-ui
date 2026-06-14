<script setup lang="ts">
import { XIcon } from 'lucide-vue-next'

withDefaults(defineProps<{
  title: string
  isOpen: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
}>(), {
  maxWidth: 'md'
})

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-foreground/20 backdrop-blur-sm" @click="emit('close')"></div>
    
    <!-- Modal Content -->
    <div 
      class="relative bg-card w-full p-8 rounded-2xl shadow-xl border border-border animate-in fade-in zoom-in-95 duration-200 max-h-[95vh] overflow-y-auto"
      :class="{
        'max-w-sm': maxWidth === 'sm',
        'max-w-md': maxWidth === 'md',
        'max-w-lg': maxWidth === 'lg',
        'max-w-xl': maxWidth === 'xl',
        'max-w-2xl': maxWidth === '2xl',
        'max-w-3xl': maxWidth === '3xl',
        'max-w-4xl': maxWidth === '4xl',
      }"
    >
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
