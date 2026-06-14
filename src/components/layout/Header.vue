<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const pageTitle = computed(() => {
  if (route.path === '/departments') return 'Departments'
  if (route.path === '/positions') return 'Positions'
  if (route.path === '/contracts') return 'Contract Types'
  if (route.path === '/') return 'Overview'
  if (route.path === '/about') return 'About System'
  return 'Dashboard'
})
</script>

<template>
  <header class="h-20 bg-card border-b border-border flex items-center justify-between px-8 flex-shrink-0 z-10 shadow-sm relative">
    
    <!-- Radial Glow for warmth (from prompt) -->
    <div class="absolute top-0 left-0 w-64 h-20 bg-accent/5 blur-[50px] pointer-events-none"></div>

    <div class="flex items-center gap-4 relative z-10">
      <h2 class="font-display text-2xl text-foreground">{{ pageTitle }}</h2>
      
      <!-- Section Label pattern from design prompt -->
      <div class="hidden md:inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 ml-4">
        <span class="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        <span class="font-mono text-[10px] uppercase tracking-[0.15em] text-accent">
          Live System
        </span>
      </div>
    </div>

    <!-- Right side actions -->
    <div class="flex items-center gap-4 relative z-10">
      <!-- Notification Icon Button -->
      <button class="h-10 w-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors hover:-translate-y-0.5 duration-200">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      </button>
    </div>
  </header>
</template>
