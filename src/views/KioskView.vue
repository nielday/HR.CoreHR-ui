<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { LockIcon, UnlockIcon, ExternalLinkIcon, MonitorIcon } from 'lucide-vue-next'
import { useAttendanceStore } from '../stores/attendance'
import Button from '../components/ui/Button.vue'

const store = useAttendanceStore()
const enabled = ref(true)
const loaded = ref(false)

async function refresh() {
  const s = await store.kioskStatus()
  if (s) enabled.value = !!s.isEnabled
  loaded.value = true
}

async function toggle(val: boolean) {
  const r = await store.kioskToggle(val)
  if (r) {
    enabled.value = !!r.isEnabled
    message.success(val ? 'Đã mở kiosk' : 'Đã khóa kiosk')
  } else {
    message.error(store.error || 'Thao tác thất bại')
  }
}

function openKiosk() {
  window.open('/kiosk', '_blank')
}

onMounted(refresh)
</script>

<template>
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <div>
      <h1 class="font-display text-2xl text-foreground leading-tight">Quản lý Kiosk chấm công</h1>
      <p class="text-muted-foreground font-sans text-sm mt-0.5">Bật/tắt máy chấm công công cộng và mở màn hình đặt tại cổng.</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Trạng thái + khóa/mở -->
      <div class="bg-card border border-border rounded-2xl shadow-md p-6">
        <h2 class="font-display text-xl text-foreground mb-4">Trạng thái Kiosk</h2>
        <div v-if="loaded" class="flex items-center gap-3 mb-6">
          <span :class="enabled ? 'bg-emerald-500' : 'bg-amber-500'" class="w-3 h-3 rounded-full"></span>
          <span class="font-sans font-medium text-foreground">{{ enabled ? 'Đang mở — nhân viên có thể chấm công' : 'Đang khóa — tạm dừng chấm công' }}</span>
        </div>
        <div v-else class="text-muted-foreground mb-6">Đang tải…</div>

        <div class="flex gap-3">
          <Button v-if="enabled" variant="ghost" :disabled="store.isLoading" @click="toggle(false)" class="border border-amber-300 text-amber-600">
            <LockIcon class="w-4 h-4 mr-2" /> Khóa kiosk
          </Button>
          <Button v-else :disabled="store.isLoading" @click="toggle(true)">
            <UnlockIcon class="w-4 h-4 mr-2" /> Mở kiosk
          </Button>
        </div>
        <p class="mt-4 text-xs text-muted-foreground font-sans">Khi khóa: màn hình kiosk sẽ hiện "Đang tạm khóa" và không chấm công được.</p>
      </div>

      <!-- Mở màn hình kiosk -->
      <div class="bg-card border border-border rounded-2xl shadow-md p-6 flex flex-col">
        <h2 class="font-display text-xl text-foreground mb-4">Màn hình chấm công</h2>
        <p class="font-sans text-sm text-muted-foreground mb-6">
          Mở màn hình kiosk (toàn màn hình) trên máy đặt ở cổng. Nhân viên gõ mã NV để Vào ca / Tan ca — không cần đăng nhập.
          Trang này công khai tại đường dẫn <code class="font-mono text-xs bg-muted/40 px-1.5 py-0.5 rounded">/kiosk</code>.
        </p>
        <div class="mt-auto flex gap-3">
          <Button @click="openKiosk">
            <MonitorIcon class="w-4 h-4 mr-2" /> Mở màn hình Kiosk
          </Button>
          <RouterLink to="/kiosk" class="inline-flex items-center gap-1 text-sm text-accent hover:underline self-center">
            <ExternalLinkIcon class="w-4 h-4" /> /kiosk
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
