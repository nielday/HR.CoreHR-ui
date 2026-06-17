<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'

// Manage drawer state here to pass to Header and Sidebar
// Default to open on large screens, closed on mobile
const drawer = ref(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true)
const route = useRoute()
const contentClass = computed(() =>
  route.meta.fullWidth
    ? 'w-full max-w-none p-4 md:p-8'
    : 'max-w-7xl mx-auto w-full p-4 md:p-8'
)
</script>

<template>
  <v-app class="bg-background font-sans text-foreground">
    <Sidebar v-model="drawer" />
    <Header @toggle-drawer="drawer = !drawer" />

    <v-main class="bg-background min-h-screen">
      <div :class="contentClass">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </v-main>
  </v-app>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
