<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Table as ATable, Tag as ATag, Select as ASelect, message } from 'ant-design-vue'
import { LogInIcon, LogOutIcon } from 'lucide-vue-next'
import { useAttendanceStore, ATTENDANCE_STATUS } from '../stores/attendance'
import Button from '../components/ui/Button.vue'

const store = useAttendanceStore()

const now = new Date()
const month = ref<number>(now.getMonth() + 1)
const year = ref<number>(now.getFullYear())

const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))
const years = Array.from({ length: 6 }, (_, i) => ({ value: now.getFullYear() - 3 + i, label: `${now.getFullYear() - 3 + i}` }))

// ===== Helpers định dạng (cẩn thận null) =====
function fmtDate(v?: string | null): string {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN')
}
function fmtTime(v?: string | null): string {
  if (!v) return '—'
  const d = new Date(v)
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

const columns = [
  { title: 'Ngày', key: 'workDate', width: 120 },
  { title: 'Giờ vào', key: 'checkInTime', align: 'center' as const, width: 100 },
  { title: 'Giờ ra', key: 'checkOutTime', align: 'center' as const, width: 100 },
  { title: 'Số giờ làm', key: 'workedHours', align: 'right' as const, width: 110 },
  { title: 'Tăng ca', key: 'overtimeHours', align: 'right' as const, width: 100 },
  { title: 'Đi muộn', key: 'lateMinutes', align: 'right' as const, width: 110 },
  { title: 'Về sớm', key: 'earlyLeaveMinutes', align: 'right' as const, width: 110 },
  { title: 'Trạng thái', key: 'status', align: 'center' as const, width: 130 },
]

async function reload() {
  await store.fetchMine(month.value, year.value)
}

async function doCheckIn() {
  const r = await store.checkIn()
  if (r) message.success('Chấm công vào thành công')
  else message.error(store.error || 'Chấm công vào thất bại')
  await reload()
}

async function doCheckOut() {
  const r = await store.checkOut()
  if (r) message.success('Chấm công ra thành công')
  else message.error(store.error || 'Chấm công ra thất bại')
  await reload()
}

onMounted(reload)
watch([month, year], reload)
</script>

<template>
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Chấm công của tôi</h1>
        <p class="text-muted-foreground font-sans text-lg">Chấm công vào/ra và xem lịch sử chấm công theo tháng.</p>
      </div>
      <div class="flex items-center gap-3">
        <ASelect v-model:value="month" :options="months" style="width: 120px" size="large" />
        <ASelect v-model:value="year" :options="years" style="width: 110px" size="large" />
      </div>
    </div>

    <div class="flex flex-col sm:flex-row gap-4">
      <Button @click="doCheckIn" :disabled="store.isLoading" class="shadow-accent flex-1 sm:flex-none">
        <LogInIcon class="w-5 h-5 mr-2" />
        Chấm công vào
      </Button>
      <Button @click="doCheckOut" :disabled="store.isLoading" class="flex-1 sm:flex-none !bg-gradient-to-r !from-rose-500 !to-orange-500">
        <LogOutIcon class="w-5 h-5 mr-2" />
        Chấm công ra
      </Button>
    </div>

    <div v-if="store.error" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">{{ store.error }}</div>

    <div class="bg-card border border-border rounded-2xl shadow-md p-6">
      <ATable :columns="columns" :data-source="store.myAttendance" :loading="store.isLoading" row-key="id" :pagination="{ pageSize: 10 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'workDate'">
            <span class="font-mono text-sm">{{ fmtDate(record.workDate) }}</span>
          </template>
          <template v-else-if="column.key === 'checkInTime'">
            <span class="font-mono text-sm text-emerald-600">{{ fmtTime(record.checkInTime) }}</span>
          </template>
          <template v-else-if="column.key === 'checkOutTime'">
            <span class="font-mono text-sm text-orange-600">{{ fmtTime(record.checkOutTime) }}</span>
          </template>
          <template v-else-if="column.key === 'workedHours'">
            <span class="font-mono text-sm font-medium">{{ record.workedHours }}</span>
          </template>
          <template v-else-if="column.key === 'overtimeHours'">
            <span class="font-mono text-sm">{{ record.overtimeHours }} h</span>
          </template>
          <template v-else-if="column.key === 'lateMinutes'">
            <span class="font-mono text-sm" :class="record.lateMinutes > 0 ? 'text-red-600' : 'text-muted-foreground'">{{ record.lateMinutes }} phút</span>
          </template>
          <template v-else-if="column.key === 'earlyLeaveMinutes'">
            <span class="font-mono text-sm" :class="record.earlyLeaveMinutes > 0 ? 'text-red-600' : 'text-muted-foreground'">{{ record.earlyLeaveMinutes }} phút</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <ATag :color="ATTENDANCE_STATUS[record.status]?.color">{{ ATTENDANCE_STATUS[record.status]?.label || record.status }}</ATag>
          </template>
        </template>
      </ATable>
    </div>
  </div>
</template>
