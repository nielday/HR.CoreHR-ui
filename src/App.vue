<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ConfigProvider as AConfigProvider } from 'ant-design-vue'
import viVN from 'ant-design-vue/es/locale/vi_VN'

// Theme token dùng chung cho toàn bộ component Ant Design — đồng bộ màu nhấn + bo góc.
const theme = {
  token: {
    colorPrimary: '#0052FF',
    colorInfo: '#0052FF',
    colorLink: '#0052FF',
    borderRadius: 8,
    fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    colorBgLayout: '#F0F2F5',
  },
}
</script>

<template>
  <AConfigProvider :theme="theme" :locale="viVN">
    <RouterView />
  </AConfigProvider>
</template>

<style>
/* App-wide un-scoped styles are in main.css */
</style>
