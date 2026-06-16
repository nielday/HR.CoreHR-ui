<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Table as ATable, Popconfirm as APopconfirm, message } from 'ant-design-vue'
import { CheckIcon, XIcon, RefreshCwIcon } from 'lucide-vue-next'
import { useAttendanceStore, LEAVE_TYPE } from '../stores/attendance'
import { useEmployeeStore } from '../stores/employee'
import Modal from '../components/ui/Modal.vue'
import Button from '../components/ui/Button.vue'

const store = useAttendanceStore()
const empStore = useEmployeeStore()

// map employeeId -> { code, name } để hiển thị tên thay vì GUID
const empMap = computed<Record<string, { code: string; name: string }>>(() => {
  const m: Record<string, { code: string; name: string }> = {}
  for (const e of empStore.employees as any[]) {
    if (e.id) m[e.id] = { code: e.employeeCode, name: e.fullName }
  }
  return m
})

const empName = (employeeId: string) =>
  empMap.value[employeeId]?.name || 'NV ' + employeeId.slice(0, 8)

// Helper định dạng ngày 'YYYY-MM-DD' -> 'DD/MM/YYYY'
const formatDate = (s: string | null | undefined) => {
  if (!s) return '-'
  const d = String(s).slice(0, 10).split('-')
  if (d.length !== 3) return String(s)
  return `${d[2]}/${d[1]}/${d[0]}`
}

const columns = [
  { title: 'Nhân viên', key: 'employee' },
  { title: 'Loại', key: 'leaveType', align: 'center' as const, width: 130 },
  { title: 'Từ ngày', key: 'fromDate', align: 'center' as const, width: 120 },
  { title: 'Đến ngày', key: 'toDate', align: 'center' as const, width: 120 },
  { title: 'Số ngày', key: 'totalDays', align: 'center' as const, width: 100 },
  { title: 'Lý do', key: 'reason' },
  { title: '', key: 'actions', align: 'right' as const, width: 180 },
]

// ===== Modal từ chối =====
const rejectModalOpen = ref(false)
const rejectId = ref<string | null>(null)
const rejectReason = ref('')

function openReject(id: string) {
  rejectId.value = id
  rejectReason.value = ''
  rejectModalOpen.value = true
}
function closeReject() {
  rejectModalOpen.value = false
  rejectId.value = null
  rejectReason.value = ''
}

async function reload() {
  await store.fetchPendingLeaves()
}

async function approve(id: string) {
  const ok = await store.approveLeave(id)
  if (ok) { message.success('Đã duyệt'); await reload() }
  else message.error(store.error || 'Duyệt thất bại')
}

async function reject(id: string, reason: string) {
  const ok = await store.rejectLeave(id, reason)
  if (ok) {
    message.success('Đã từ chối đơn')
    closeReject()
    await reload()
  } else {
    message.error(store.error || 'Từ chối thất bại')
  }
}

function confirmReject() {
  if (!rejectId.value) return
  reject(rejectId.value, rejectReason.value)
}

onMounted(async () => {
  await reload()
  if (!empStore.employees.length) await empStore.fetchEmployees({ pageSize: 1000 })
})
</script>

<template>
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Duyệt nghỉ phép</h1>
        <p class="text-muted-foreground font-sans text-lg">Xem và xử lý các đơn xin nghỉ phép đang chờ duyệt.</p>
      </div>
      <button @click="reload" class="p-3 rounded-xl border border-border text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors" title="Tải lại">
        <RefreshCwIcon class="w-4 h-4" />
      </button>
    </div>

    <div v-if="store.error" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">{{ store.error }}</div>

    <div class="bg-card border border-border rounded-2xl shadow-md p-6">
      <ATable :columns="columns" :data-source="store.pendingLeaves" :loading="store.isLoading" row-key="id" :pagination="{ pageSize: 10 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'employee'">
            <div class="font-sans">
              <div class="font-medium text-foreground">{{ empName(record.employeeId) }}</div>
              <div class="font-mono text-xs text-muted-foreground">{{ empMap[record.employeeId]?.code || record.employeeId.slice(0, 8) }}</div>
            </div>
          </template>
          <template v-else-if="column.key === 'leaveType'">
            <span class="font-sans text-sm">{{ LEAVE_TYPE[record.leaveType] || record.leaveType }}</span>
          </template>
          <template v-else-if="column.key === 'fromDate'"><span class="font-mono text-sm">{{ formatDate(record.fromDate) }}</span></template>
          <template v-else-if="column.key === 'toDate'"><span class="font-mono text-sm">{{ formatDate(record.toDate) }}</span></template>
          <template v-else-if="column.key === 'totalDays'"><span class="font-mono text-sm font-semibold text-accent">{{ record.totalDays }}</span></template>
          <template v-else-if="column.key === 'reason'"><span class="font-sans text-sm text-muted-foreground">{{ record.reason || '-' }}</span></template>
          <template v-else-if="column.key === 'actions'">
            <div class="inline-flex items-center gap-1 justify-end">
              <APopconfirm title="Duyệt đơn này?" ok-text="Duyệt" cancel-text="Hủy" @confirm="approve(record.id)">
                <button class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"><CheckIcon class="w-3.5 h-3.5" /> Duyệt</button>
              </APopconfirm>
              <button @click="openReject(record.id)" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"><XIcon class="w-3.5 h-3.5" /> Từ chối</button>
            </div>
          </template>
        </template>
      </ATable>
    </div>

    <Modal :is-open="rejectModalOpen" title="Từ chối đơn nghỉ phép" @close="closeReject">
      <div class="space-y-4 font-sans">
        <div>
          <label class="block text-sm font-medium text-foreground mb-2">Lý do từ chối</label>
          <textarea
            v-model="rejectReason"
            rows="4"
            placeholder="Nhập lý do từ chối đơn..."
            class="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
          ></textarea>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <button @click="closeReject" class="px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Hủy</button>
          <Button @click="confirmReject" :disabled="store.isLoading" class="bg-red-600 hover:bg-red-700">Xác nhận từ chối</Button>
        </div>
      </div>
    </Modal>
  </div>
</template>
