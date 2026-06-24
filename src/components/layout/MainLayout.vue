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
        <router-view v-slot="{ Component, route }">
          <div :key="route.path" class="route-fade">
            <component :is="Component" />
          </div>
        </router-view>
      </div>
    </v-main>
  </v-app>
</template>

<style>
/* Hiệu ứng fade khi đổi route — chạy bằng CSS animation lúc div mount,
   không dùng <transition> để tránh lỗi trắng trang với component async/nhiều node gốc. */
.route-fade {
  animation: route-fade-in 0.3s ease;
}

@keyframes route-fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
