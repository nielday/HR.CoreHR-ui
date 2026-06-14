<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <aside class="w-64 flex-shrink-0 bg-foreground text-background flex flex-col h-full relative overflow-hidden">
    <!-- Background Texture (Dot pattern for dark sections) -->
    <div class="absolute inset-0 texture-dots opacity-5 pointer-events-none"></div>

    <!-- Logo / Branding -->
    <div class="p-6 md:p-8 relative z-10 flex items-center justify-between">
      <h1 class="font-display text-3xl tracking-tight">
        HR <span class="gradient-text">Core</span>
      </h1>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-4 space-y-2 relative z-10 overflow-y-auto">
      <div class="mb-4 mt-2 px-4">
        <span class="font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground">Main Menu</span>
      </div>

      <RouterLink to="/departments" class="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
        <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
        <span class="font-sans font-medium text-sm">Departments</span>
      </RouterLink>

      <RouterLink to="/positions" class="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
        <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
        <span class="font-sans font-medium text-sm">Positions</span>
      </RouterLink>

      <RouterLink to="/contracts" class="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
        <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
        <span class="font-sans font-medium text-sm">Contract Types</span>
      </RouterLink>

      <RouterLink to="/about" class="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 transition-all duration-200 group" active-class="!text-white bg-white/10 shadow-sm relative">
        <span class="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-accent/50 transition-colors"></span>
        <span class="font-sans font-medium text-sm">About System</span>
      </RouterLink>
    </nav>
    
    <!-- User Settings / Bottom Action -->
    <div class="p-6 relative z-10 border-t border-white/10">
      <button class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 hover:-translate-y-0.5 transition-all duration-200">
        <div class="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent">
          <span class="font-mono text-xs font-bold">AD</span>
        </div>
        <div class="flex flex-col items-start">
          <span class="font-sans font-medium text-sm text-white">Admin User</span>
          <span class="font-mono text-[10px] text-muted-foreground">SYSTEM ADMIN</span>
        </div>
      </button>
    </div>
  </aside>
</template>

<style scoped>
/* CSS dot pattern for the inverted section as requested in the design prompt */
.texture-dots {
  background-image: radial-gradient(circle, white 1px, transparent 1px);
  background-size: 32px 32px;
}
/* Active state indicator dot */
a.router-link-exact-active > span:first-child {
  background-color: var(--accent) !important;
  box-shadow: 0 0 8px var(--accent);
}
</style>
