<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { XIcon } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  title: string
  isOpen: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
}>(), {
  maxWidth: 'md'
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-foreground/20 backdrop-blur-sm" @click="emit('close')"></div>
    
    <!-- Modal Container -->
    <div class="flex min-h-full justify-center p-4 sm:p-6">
      <!-- Modal Content -->
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        class="relative bg-card w-full p-8 rounded-2xl shadow-xl border border-border motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 duration-200 m-auto"
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
        <h3 id="modal-title" class="font-display text-2xl text-foreground">{{ title }}</h3>
        <button type="button" @click="emit('close')" aria-label="Close modal" class="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted">
          <XIcon class="w-5 h-5" />
        </button>
      </div>
      
      <slot></slot>
      </div>
    </div>
  </div>
</template>
