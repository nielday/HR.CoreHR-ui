<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}>(), {
  variant: 'primary',
  type: 'button',
  disabled: false
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="relative inline-flex items-center justify-center font-sans font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed group"
    :class="{
      'h-10 px-5 rounded-lg text-white shadow-sm active:scale-[0.98] hover:brightness-110 bg-gradient-to-r from-accent to-accent': variant === 'primary',
      'h-10 px-4 rounded-lg text-foreground border border-border bg-transparent hover:bg-muted hover:border-accent/40': variant === 'secondary',
      'h-10 px-4 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted bg-transparent': variant === 'ghost'
    }"
  >
    <slot></slot>
  </button>
</template>
