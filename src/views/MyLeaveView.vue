<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Table as ATable, Tag as ATag, Select as ASelect, Input as AInput, message } from 'ant-design-vue'
import { CalendarDaysIcon, PlusIcon } from 'lucide-vue-next'
import { useAttendanceStore, LEAVE_STATUS } from '../stores/attendance'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'

const ATextarea = AInput.TextArea

const store = useAttendanceStore()

const isModalOpen = ref(false)
const currentYear = new Date().getFullYear()

// Loại nghỉ động — lấy từ số phép còn lại (chỉ gồm loại đang hoạt động, kèm tên).
const leaveTypeOptions = computed(() =>
  (store.myLeaveBalance as any[]).map(b => ({ value: b.leaveType, label: b.name }))
)

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
  form.value = { leaveType: leaveTypeOptions.value[0]?.value ?? 0, fromDate: '', toDate: '', reason: '' }
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
    await store.fetchMyLeaveBalance(currentYear)
  } else {
    message.error(store.error || 'Gửi đơn nghỉ thất bại')
  }
}

onMounted(() => {
  store.fetchMyLeaves()
  store.fetchMyLeaveBalance(currentYear)
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

    <!-- Số phép còn lại -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        v-for="balance in store.myLeaveBalance"
        :key="balance.leaveType"
        class="bg-card border border-border rounded-2xl shadow-sm p-5 flex items-start gap-4"
      >
        <div class="w-11 h-11 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
          <CalendarDaysIcon class="w-5 h-5" />
        </div>
        <div class="min-w-0">
          <p class="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
            {{ balance.name }}
          </p>
          <p class="font-display text-2xl text-foreground">
            <template v-if="balance.entitledDays === null || balance.entitledDays === undefined">
              Không giới hạn
            </template>
            <template v-else>
              Còn {{ balance.remainingDays }} / {{ balance.entitledDays }}
            </template>
          </p>
          <p class="text-xs text-muted-foreground font-sans mt-1">
            Đã dùng {{ balance.usedDays }} ngày trong năm {{ currentYear }}
          </p>
        </div>
      </div>
    </div>

    <!-- Bảng đơn nghỉ -->
    <div class="bg-card border border-border rounded-2xl shadow-md p-6">
      <ATable :columns="columns" :data-source="store.myLeaves" :loading="store.isLoading" row-key="id" :pagination="{ pageSize: 10 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'leaveType'">
            <span class="font-sans font-medium text-foreground">{{ record.leaveTypeName }}</span>
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
          <a-select v-model:value="form.leaveType" :options="leaveTypeOptions" placeholder="-- Chọn loại nghỉ --" style="width:100%" />
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
          <a-textarea v-model:value="form.reason" :rows="3" placeholder="Lý do xin nghỉ..." />
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
