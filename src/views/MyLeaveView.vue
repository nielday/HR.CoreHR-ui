<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Table as ATable, Tag as ATag, Select as ASelect, message } from 'ant-design-vue'
import { PlusIcon } from 'lucide-vue-next'
import { useAttendanceStore, LEAVE_STATUS, LEAVE_TYPE } from '../stores/attendance'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'

const store = useAttendanceStore()

const isModalOpen = ref(false)

const leaveTypeOptions = [
  { value: 0, label: 'Phép năm' },
  { value: 1, label: 'Nghỉ ốm' },
  { value: 2, label: 'Không lương' },
]

const form = ref({
  leaveType: 0 as number,
  fromDate: '',
  toDate: '',
  reason: '',
})

const columns = [
  { title: 'Loại', key: 'leaveType', width: 120 },
  { title: 'Từ ngày', key: 'fromDate', align: 'center' as const, width: 120 },
  { title: 'Đến ngày', key: 'toDate', align: 'center' as const, width: 120 },
  { title: 'Số ngày', key: 'totalDays', align: 'center' as const, width: 90 },
  { title: 'Lý do', key: 'reason' },
  { title: 'Trạng thái', key: 'status', align: 'center' as const, width: 130 },
  { title: 'Lý do từ chối', key: 'rejectReason' },
]

// Helper format ngày 'YYYY-MM-DD' -> 'dd/MM/yyyy', cẩn thận null
function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function openCreateModal() {
  form.value = { leaveType: 0, fromDate: '', toDate: '', reason: '' }
  store.error = null
  isModalOpen.value = true
}

async function submitLeave() {
  const ok = await store.createLeave({
    leaveType: form.value.leaveType,
    fromDate: form.value.fromDate,
    toDate: form.value.toDate,
    reason: form.value.reason,
  })
  if (ok) {
    message.success('Đã gửi đơn nghỉ phép')
    isModalOpen.value = false
    await store.fetchMyLeaves()
  } else {
    message.error(store.error || 'Gửi đơn nghỉ thất bại')
  }
}

onMounted(() => {
  store.fetchMyLeaves()
})
</script>

<template>
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Đơn nghỉ phép của tôi</h1>
        <p class="text-muted-foreground font-sans text-lg">Tạo và theo dõi các đơn xin nghỉ phép của bạn.</p>
      </div>
      <Button @click="openCreateModal" class="shadow-accent hover:shadow-accent-lg transition-all duration-300 hover:-translate-y-0.5">
        <PlusIcon class="w-4 h-4 mr-2" />
        Tạo đơn nghỉ
      </Button>
    </div>

    <div v-if="store.error && !isModalOpen" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
      {{ store.error }}
    </div>

    <!-- Bảng đơn nghỉ -->
    <div class="bg-card border border-border rounded-2xl shadow-md p-6">
      <ATable :columns="columns" :data-source="store.myLeaves" :loading="store.isLoading" row-key="id" :pagination="{ pageSize: 10 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'leaveType'">
            <span class="font-sans font-medium text-foreground">{{ LEAVE_TYPE[record.leaveType] || record.leaveType }}</span>
          </template>
          <template v-else-if="column.key === 'fromDate'">
            <span class="font-mono text-sm">{{ formatDate(record.fromDate) }}</span>
          </template>
          <template v-else-if="column.key === 'toDate'">
            <span class="font-mono text-sm">{{ formatDate(record.toDate) }}</span>
          </template>
          <template v-else-if="column.key === 'totalDays'">
            <span class="font-mono text-sm">{{ record.totalDays }}</span>
          </template>
          <template v-else-if="column.key === 'reason'">
            <span class="font-sans text-sm text-muted-foreground">{{ record.reason || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <ATag :color="LEAVE_STATUS[record.status]?.color">{{ LEAVE_STATUS[record.status]?.label || record.status }}</ATag>
          </template>
          <template v-else-if="column.key === 'rejectReason'">
            <span class="font-sans text-sm text-muted-foreground">{{ record.rejectReason || '—' }}</span>
          </template>
        </template>
      </ATable>
    </div>

    <!-- Modal tạo đơn -->
    <Modal :isOpen="isModalOpen" title="Tạo đơn nghỉ phép" @close="isModalOpen = false">
      <form @submit.prevent="submitLeave" class="space-y-5">
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Loại nghỉ <span class="text-red-500">*</span></label>
          <ASelect v-model:value="form.leaveType" :options="leaveTypeOptions" size="large" class="w-full" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Từ ngày <span class="text-red-500">*</span></label>
            <input v-model="form.fromDate" type="date" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm" />
          </div>
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Đến ngày <span class="text-red-500">*</span></label>
            <input v-model="form.toDate" type="date" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm" />
          </div>
        </div>
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Lý do <span class="text-red-500">*</span></label>
          <textarea v-model="form.reason" rows="3" required class="w-full p-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm resize-none" placeholder="Lý do xin nghỉ..."></textarea>
        </div>

        <div v-if="store.error && isModalOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans">
          {{ store.error }}
        </div>

        <div class="pt-6 border-t border-border flex justify-end gap-4 mt-6">
          <Button variant="ghost" type="button" @click="isModalOpen = false">Hủy</Button>
          <Button type="submit" :disabled="store.isLoading" class="min-w-[150px]">
            {{ store.isLoading ? 'Đang gửi...' : 'Gửi đơn' }}
          </Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
