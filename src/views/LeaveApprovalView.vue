<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Popconfirm as APopconfirm, Tag as ATag, Select as ASelect, Table as ATable, Segmented as ASegmented, message } from 'ant-design-vue'
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
const fStatuses = ref<number[]>([0]) // LEAVE_STATUS 0/1/2 — mặc định lọc "Chờ duyệt" (0)
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

// Số đơn đang chờ duyệt (status 0) — hiển thị ở subtitle động
const pendingCount = computed<number>(
  () => (store.pendingLeaves as any[]).filter((r) => r.status === 0).length,
)

// ===== Chế độ hiển thị: Danh sách hoặc Kanban =====
const viewMode = ref<'list' | 'kanban'>('list')
const KANBAN_COLS = [
  { s: 0, label: 'Chờ duyệt', dot: 'bg-amber-400' },
  { s: 1, label: 'Đã duyệt', dot: 'bg-emerald-500' },
  { s: 2, label: 'Từ chối', dot: 'bg-rose-500' },
]
// Kanban: lọc theo tìm kiếm/loại/nhân viên nhưng KHÔNG lọc trạng thái (để thấy đủ 3 cột)
const boardLeaves = computed<any[]>(() => {
  const kw = search.value.trim().toLowerCase()
  return (store.pendingLeaves as any[]).filter((r) => {
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
const groupedLeaves = computed<Record<number, any[]>>(() => ({
  0: boardLeaves.value.filter((r) => r.status === 0),
  1: boardLeaves.value.filter((r) => r.status === 1),
  2: boardLeaves.value.filter((r) => r.status === 2),
}))
const leavesIn = (s: number): any[] => groupedLeaves.value[s] ?? []
// Cập nhật trạng thái tại chỗ (để thẻ Kanban chạy sang cột mới mà không phải tải lại)
function setLocalStatus(id: string, s: number) {
  const r = (store.pendingLeaves as any[]).find((x) => x.id === id)
  if (r) r.status = s
}

// ===== Chọn nhiều (bulk) — chỉ cho chọn đơn đang Chờ duyệt (status 0) =====
const selectedIds = ref<string[]>([])
const rowSelection = computed(() => ({
  selectedRowKeys: selectedIds.value,
  onChange: (keys: any[]) => { selectedIds.value = keys as string[] },
  getCheckboxProps: (r: any) => ({ disabled: r.status !== 0 }),
}))

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

// ===== Modal từ chối (dùng chung cho từng dòng & hàng loạt) =====
const rejectModalOpen = ref(false)
const rejectId = ref<string | null>(null) // null = chế độ hàng loạt
const rejectReason = ref('')
const rejectBulk = ref(false)

function openReject(id: string) {
  rejectId.value = id
  rejectBulk.value = false
  rejectReason.value = ''
  rejectModalOpen.value = true
}
function closeReject() {
  rejectModalOpen.value = false
  rejectId.value = null
  rejectBulk.value = false
  rejectReason.value = ''
}

async function reload() {
  await store.fetchPendingLeaves()
}

async function approve(id: string) {
  const ok = await store.approveLeave(id)
  if (ok) { message.success('Đã duyệt'); setLocalStatus(id, 1) }
  else message.error(store.error || 'Duyệt thất bại')
}

async function reject(id: string, reason: string) {
  const ok = await store.rejectLeave(id, reason)
  if (ok) {
    message.success('Đã từ chối đơn')
    closeReject()
    setLocalStatus(id, 2)
  } else {
    message.error(store.error || 'Từ chối thất bại')
  }
}

function confirmReject() {
  if (rejectBulk.value) { bulkRejectConfirm(); return }
  if (!rejectId.value) return
  reject(rejectId.value, rejectReason.value)
}

// ===== Thao tác hàng loạt =====
const bulkLoading = ref(false)

async function bulkApprove() {
  const ids = [...selectedIds.value]
  if (!ids.length || bulkLoading.value) return
  bulkLoading.value = true
  let ok = 0, fail = 0
  for (const id of ids) {
    const r = await store.approveLeave(id)
    if (r) { ok++; setLocalStatus(id, 1) } else fail++
  }
  bulkLoading.value = false
  selectedIds.value = []
  if (fail === 0) message.success(`Đã duyệt ${ok} đơn`)
  else message.warning(`Đã duyệt ${ok} đơn, ${fail} đơn thất bại`)
}

function openBulkReject() {
  if (!selectedIds.value.length) return
  rejectId.value = null
  rejectBulk.value = true
  rejectReason.value = ''
  rejectModalOpen.value = true
}

async function bulkRejectConfirm() {
  const ids = [...selectedIds.value]
  if (!ids.length || bulkLoading.value) return
  const reason = rejectReason.value
  bulkLoading.value = true
  let ok = 0, fail = 0
  for (const id of ids) {
    const r = await store.rejectLeave(id, reason)
    if (r) { ok++; setLocalStatus(id, 2) } else fail++
  }
  bulkLoading.value = false
  closeReject()
  selectedIds.value = []
  if (fail === 0) message.success(`Đã từ chối ${ok} đơn`)
  else message.warning(`Đã từ chối ${ok} đơn, ${fail} đơn thất bại`)
}

onMounted(async () => {
  await reload()
  if (!empStore.employees.length) await empStore.fetchEmployees({ pageSize: 1000 })
})
</script>

<template>
  <DataTableShell
    title="Duyệt nghỉ phép"
    :subtitle="`Đang chờ duyệt: ${pendingCount} đơn`"
    :columns="columns"
    :data-source="filteredLeaves"
    :loading="store.isLoading"
    row-key="id"
    :pagination="pagination"
    :row-selection="rowSelection"
    :scroll-x="1100"
  >
    <!-- Header actions -->
    <template #actions>
      <ASegmented
        v-model:value="viewMode"
        :options="[{ label: 'Danh sách', value: 'list' }, { label: 'Kanban', value: 'kanban' }]"
      />
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

    <!-- Banner: lỗi + thanh thao tác hàng loạt -->
    <template #banner>
      <div v-if="store.error && !rejectModalOpen" class="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
        {{ store.error }}
      </div>
      <div v-if="selectedIds.length > 0" class="bg-accent/10 border border-accent/20 rounded-xl p-3 flex items-center justify-between">
        <span class="text-accent font-medium text-sm">Đã chọn {{ selectedIds.length }} đơn (Chờ duyệt)</span>
        <div class="flex items-center gap-2">
          <Button variant="ghost" @click="selectedIds = []" :disabled="bulkLoading" class="text-muted-foreground">Bỏ chọn</Button>
          <APopconfirm :title="`Duyệt ${selectedIds.length} đơn đã chọn?`" ok-text="Duyệt" cancel-text="Hủy" @confirm="bulkApprove">
            <a-button type="primary" :loading="bulkLoading">
              <CheckIcon class="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" /> Duyệt {{ selectedIds.length }} đơn
            </a-button>
          </APopconfirm>
          <a-button danger :loading="bulkLoading" @click="openBulkReject">
            <XIcon class="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" /> Từ chối {{ selectedIds.length }} đơn
          </a-button>
        </div>
      </div>
    </template>

    <!-- ===== DANH SÁCH (bảng) ===== -->
    <div v-if="viewMode === 'list'" class="bg-card border border-border rounded-xl shadow-sm overflow-hidden hr-table-wrap">
      <a-table :columns="columns" :data-source="filteredLeaves" :loading="store.isLoading" row-key="id" :pagination="pagination" :row-selection="rowSelection" :scroll="{ x: 1100 }" size="middle">
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
      </a-table>
    </div>

    <!-- ===== KANBAN ===== -->
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div v-for="col in KANBAN_COLS" :key="col.s" class="bg-muted/30 border border-border rounded-xl p-3 flex flex-col">
        <div class="flex items-center gap-2 px-1 pb-2 mb-1 border-b border-border/60">
          <span class="w-2.5 h-2.5 rounded-full" :class="col.dot"></span>
          <span class="font-semibold text-foreground text-sm">{{ col.label }}</span>
          <span class="ml-auto text-xs font-mono text-muted-foreground">{{ leavesIn(col.s).length }}</span>
        </div>
        <div class="space-y-2.5 overflow-y-auto" style="max-height: calc(100vh - 320px)">
          <div v-for="r in leavesIn(col.s)" :key="r.id" class="bg-card border border-border rounded-lg p-3 shadow-sm">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="font-medium text-foreground text-sm truncate">{{ empName(r.employeeId) }}</div>
                <div class="font-mono text-[11px] text-muted-foreground">{{ empCode(r.employeeId) }}</div>
              </div>
              <a-tag class="shrink-0" :color="r.leaveType === 2 ? 'default' : (r.leaveType === 1 ? 'orange' : 'blue')">{{ r.leaveTypeName }}</a-tag>
            </div>
            <div class="mt-2 text-xs font-mono text-muted-foreground">
              {{ formatDate(r.fromDate) }} → {{ formatDate(r.toDate) }} · <span class="text-accent font-semibold">{{ r.totalDays }} ngày</span>
            </div>
            <div v-if="r.reason" class="mt-1 text-xs text-muted-foreground line-clamp-2">{{ r.reason }}</div>
            <div v-if="r.status === 0" class="mt-2.5 flex items-center gap-1.5">
              <APopconfirm title="Duyệt đơn này?" ok-text="Duyệt" cancel-text="Hủy" @confirm="approve(r.id)">
                <a-button size="small" type="primary"><CheckIcon class="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" /> Duyệt</a-button>
              </APopconfirm>
              <a-button size="small" danger @click="openReject(r.id)"><XIcon class="w-3.5 h-3.5 inline-block mr-1 align-text-bottom" /> Từ chối</a-button>
            </div>
            <div v-else-if="r.status === 2 && r.rejectReason" class="mt-2 text-[11px] text-rose-600">Lý do từ chối: {{ r.rejectReason }}</div>
          </div>
          <div v-if="leavesIn(col.s).length === 0" class="text-center text-xs text-muted-foreground py-6">Trống</div>
        </div>
      </div>
    </div>
  </DataTableShell>

  <Modal :is-open="rejectModalOpen" :title="rejectBulk ? `Từ chối ${selectedIds.length} đơn nghỉ phép` : 'Từ chối đơn nghỉ phép'" @close="closeReject">
    <div class="space-y-4 font-sans">
      <p v-if="rejectBulk" class="text-sm text-muted-foreground">
        Lý do dưới đây sẽ áp dụng cho tất cả <strong>{{ selectedIds.length }}</strong> đơn đã chọn.
      </p>
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
        <Button @click="confirmReject" :disabled="store.isLoading || bulkLoading" class="bg-red-600 hover:bg-red-700">
          {{ rejectBulk ? `Xác nhận từ chối ${selectedIds.length} đơn` : 'Xác nhận từ chối' }}
        </Button>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.hr-multi :deep(.ant-select-selector) {
  border-radius: 0.5rem;
  min-height: 36px;
}
.hr-table-wrap :deep(.ant-table-thead > tr > th) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
  font-weight: 600;
  background: rgba(241, 245, 249, 0.5);
}
</style>
