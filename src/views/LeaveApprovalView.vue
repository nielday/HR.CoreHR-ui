<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Popconfirm as APopconfirm, Tag as ATag, Select as ASelect, message } from 'ant-design-vue'
import { CheckIcon, XIcon, RefreshCwIcon } from 'lucide-vue-next'
import { useAttendanceStore, LEAVE_STATUS, LEAVE_TYPE } from '../stores/attendance'
import { useEmployeeStore } from '../stores/employee'
import DataTableShell from '../components/ui/DataTableShell.vue'
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
const empCode = (employeeId: string) =>
  empMap.value[employeeId]?.code || employeeId.slice(0, 8)

// Helper định dạng ngày 'YYYY-MM-DD' -> 'DD/MM/YYYY'
const formatDate = (s: string | null | undefined) => {
  if (!s) return '-'
  const d = String(s).slice(0, 10).split('-')
  if (d.length !== 3) return String(s)
  return `${d[2]}/${d[1]}/${d[0]}`
}

// ===== Tìm kiếm + bộ lọc (chọn nhiều — multi-select, lọc phía client) =====
const search = ref('')
const fStatuses = ref<number[]>([]) // LEAVE_STATUS 0/1/2 — mảng rỗng = không lọc
const fLeaveTypes = ref<number[]>([]) // LEAVE_TYPE 0/1/2
const fEmployeeIds = ref<string[]>([])

const statusOptions = Object.entries(LEAVE_STATUS).map(([value, meta]) => ({
  label: meta.label,
  value: Number(value),
}))
const leaveTypeOptions = Object.entries(LEAVE_TYPE).map(([value, label]) => ({
  label,
  value: Number(value),
}))
// Danh sách nhân viên đang có đơn nghỉ (để lọc nhiều nhân viên cùng lúc)
const employeeOptions = computed<{ label: string; value: string }[]>(() => {
  const ids = new Set<string>()
  for (const r of store.pendingLeaves as any[]) ids.add(r.employeeId)
  return [...ids]
    .map((id) => ({ label: `${empName(id)} (${empCode(id)})`, value: id }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

const hasFilter = computed(
  () =>
    !!search.value.trim() ||
    fStatuses.value.length > 0 ||
    fLeaveTypes.value.length > 0 ||
    fEmployeeIds.value.length > 0,
)

function clearFilters() {
  search.value = ''
  fStatuses.value = []
  fLeaveTypes.value = []
  fEmployeeIds.value = []
}

const filteredLeaves = computed<any[]>(() => {
  const kw = search.value.trim().toLowerCase()
  return (store.pendingLeaves as any[]).filter((r) => {
    if (fStatuses.value.length && !fStatuses.value.includes(r.status)) return false
    if (fLeaveTypes.value.length && !fLeaveTypes.value.includes(r.leaveType)) return false
    if (fEmployeeIds.value.length && !fEmployeeIds.value.includes(r.employeeId)) return false
    if (kw) {
      const name = empName(r.employeeId).toLowerCase()
      const code = empCode(r.employeeId).toLowerCase()
      if (!name.includes(kw) && !code.includes(kw)) return false
    }
    return true
  })
})

const columns = computed<any[]>(() => [
  { title: 'Nhân viên', key: 'employee', sorter: (a: any, b: any) => empName(a.employeeId).localeCompare(empName(b.employeeId)) },
  { title: 'Loại nghỉ', dataIndex: 'leaveTypeName', key: 'leaveType', align: 'center', width: 130 },
  { title: 'Từ ngày', dataIndex: 'fromDate', key: 'fromDate', align: 'center', width: 120, sorter: (a: any, b: any) => String(a.fromDate || '').localeCompare(String(b.fromDate || '')) },
  { title: 'Đến ngày', dataIndex: 'toDate', key: 'toDate', align: 'center', width: 120 },
  { title: 'Số ngày', dataIndex: 'totalDays', key: 'totalDays', align: 'center', width: 100, sorter: (a: any, b: any) => (a.totalDays || 0) - (b.totalDays || 0) },
  { title: 'Lý do', dataIndex: 'reason', key: 'reason' },
  { title: 'Trạng thái', dataIndex: 'status', key: 'status', align: 'center', width: 120 },
  { title: '', key: 'actions', align: 'right', width: 200 },
])

const pagination = {
  pageSize: 15,
  showSizeChanger: true,
  pageSizeOptions: ['15', '30', '50'],
  showTotal: (t: number) => `${t} đơn`,
}

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
  <DataTableShell
    title="Duyệt nghỉ phép"
    subtitle="Xem và xử lý các đơn xin nghỉ phép đang chờ duyệt."
    :columns="columns"
    :data-source="filteredLeaves"
    :loading="store.isLoading"
    row-key="id"
    :pagination="pagination"
    :scroll-x="1100"
  >
    <!-- Header actions -->
    <template #actions>
      <button @click="reload" class="p-2.5 rounded-lg border border-border text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors" title="Tải lại">
        <RefreshCwIcon class="w-4 h-4" />
      </button>
    </template>

    <!-- Filters (multi-select) -->
    <template #filters>
      <div class="relative w-full sm:w-64">
        <input
          v-model="search"
          type="text"
          placeholder="Tìm theo tên, mã nhân viên..."
          class="w-full h-9 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm"
        />
      </div>
      <ASelect
        v-model:value="fStatuses" mode="multiple" :options="statusOptions" allow-clear :max-tag-count="2"
        placeholder="Trạng thái" class="hr-multi" style="min-width: 180px"
      />
      <ASelect
        v-model:value="fLeaveTypes" mode="multiple" :options="leaveTypeOptions" allow-clear :max-tag-count="2"
        placeholder="Loại nghỉ" class="hr-multi" style="min-width: 180px"
      />
      <ASelect
        v-model:value="fEmployeeIds" mode="multiple" :options="employeeOptions" allow-clear :max-tag-count="1"
        placeholder="Nhân viên" class="hr-multi" style="min-width: 200px"
        :filter-option="(input: string, opt: any) => String(opt.label).toLowerCase().includes(input.toLowerCase())"
      />
      <button
        v-if="hasFilter"
        @click="clearFilters"
        class="h-9 px-3 inline-flex items-center gap-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted text-sm transition-all"
        title="Xóa toàn bộ bộ lọc"
      >
        <XIcon class="w-4 h-4" /> Xóa lọc
      </button>
    </template>

    <!-- Banner: lỗi -->
    <template #banner>
      <div v-if="store.error && !rejectModalOpen" class="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
        {{ store.error }}
      </div>
    </template>

    <!-- Body cells -->
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'employee'">
        <div class="font-sans">
          <div class="font-medium text-foreground">{{ empName(record.employeeId) }}</div>
          <div class="font-mono text-xs text-muted-foreground">{{ empCode(record.employeeId) }}</div>
        </div>
      </template>
      <template v-else-if="column.key === 'leaveType'">
        <span class="font-sans text-sm">{{ record.leaveTypeName }}</span>
      </template>
      <template v-else-if="column.key === 'fromDate'"><span class="font-mono text-sm">{{ formatDate(record.fromDate) }}</span></template>
      <template v-else-if="column.key === 'toDate'"><span class="font-mono text-sm">{{ formatDate(record.toDate) }}</span></template>
      <template v-else-if="column.key === 'totalDays'"><span class="font-mono text-sm font-semibold text-accent">{{ record.totalDays }}</span></template>
      <template v-else-if="column.key === 'reason'"><span class="font-sans text-sm text-muted-foreground">{{ record.reason || '-' }}</span></template>
      <template v-else-if="column.key === 'status'">
        <a-tag :color="LEAVE_STATUS[record.status]?.color || 'default'">
          {{ LEAVE_STATUS[record.status]?.label || record.status }}
        </a-tag>
      </template>
      <template v-else-if="column.key === 'actions'">
        <div v-if="record.status === 0" class="inline-flex items-center gap-1 justify-end">
          <APopconfirm title="Duyệt đơn này?" ok-text="Duyệt" cancel-text="Hủy" @confirm="approve(record.id)">
            <a-button size="small" type="primary">
              <CheckIcon class="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" /> Duyệt
            </a-button>
          </APopconfirm>
          <a-button size="small" danger @click="openReject(record.id)">
            <XIcon class="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" /> Từ chối
          </a-button>
        </div>
        <span v-else class="text-xs text-muted-foreground">—</span>
      </template>
    </template>
  </DataTableShell>

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
</template>

<style scoped>
.hr-multi :deep(.ant-select-selector) {
  border-radius: 0.5rem;
  min-height: 36px;
}
</style>
