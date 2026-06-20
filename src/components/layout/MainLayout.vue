<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'

// Manage drawer state here to pass to Header and Sidebar
// Default to open on large screens, closed on mobile
const drawer = ref(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true)
// Dùng full chiều rộng (bỏ giới hạn max-w-7xl) để bảng dữ liệu rộng hơn
const contentClass = 'w-full max-w-none p-4 md:p-8'
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
