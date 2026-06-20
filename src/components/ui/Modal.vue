<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
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
  document.body.style.overflow = ''
})

watch(
  () => props.isOpen,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  },
  { immediate: true }
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[9990] flex items-start sm:items-center justify-center overflow-y-auto p-4"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-foreground/20 backdrop-blur-sm"
        @click="emit('close')"
      ></div>

      <!-- Modal Content -->
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        class="relative z-10 flex w-full max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-xl bg-card shadow-xl border border-border motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 duration-200"
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
        <header class="shrink-0 p-6 pb-4">
          <div class="flex justify-between items-center">
            <h3 id="modal-title" class="font-display text-lg font-semibold text-foreground">{{ title }}</h3>
            <button type="button" @click="emit('close')" aria-label="Close modal" class="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted">
              <XIcon class="w-5 h-5" />
            </button>
          </div>
        </header>
        
        <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <slot></slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>
