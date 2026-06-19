<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { Select as ASelect, Tag as ATag, message } from 'ant-design-vue'
import { PlusIcon, PencilIcon } from 'lucide-vue-next'
import { useAttendanceStore, ATTENDANCE_STATUS } from '../stores/attendance'
import { useEmployeeStore } from '../stores/employee'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'
import DataTableShell from '../components/ui/DataTableShell.vue'

const store = useAttendanceStore()
const empStore = useEmployeeStore()

const now = new Date()
const month = ref<number>(now.getMonth() + 1)
const year = ref<number>(now.getFullYear())

const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))
const years = Array.from({ length: 6 }, (_, i) => ({ value: now.getFullYear() - 3 + i, label: `${now.getFullYear() - 3 + i}` }))

// ===== Map nhân viên: id -> { code, name, dept } =====
// Dùng allEmployees (danh sách đầy đủ, ổn định) thay vì employees (phân trang, bị trang khác ghi đè)
const empMap = computed<Record<string, { code: string; name: string; dept: string }>>(() => {
  const m: Record<string, { code: string; name: string; dept: string }> = {}
  for (const e of empStore.allEmployees as any[]) {
    if (e.id) m[e.id] = { code: e.employeeCode, name: e.fullName, dept: e.departmentName || 'Chưa phân phòng' }
  }
  return m
})
const employeeOptions = computed(() =>
  (empStore.allEmployees as any[]).map((e) => ({ value: e.id, label: `${e.fullName} (${e.employeeCode})` }))
)

// Map ca làm việc: id -> tên ca
const shiftMap = computed<Record<string, string>>(() => {
  const m: Record<string, string> = {}
  for (const s of store.shifts as any[]) {
    if (s.id) m[s.id] = s.shiftName || s.shiftCode
  }
  return m
})

// ===== Lọc + tìm kiếm =====
const searchText = ref('')
const deptFilter = ref<string>('')
const employeeFilter = ref<string>('')
const departmentOptions = computed(() => {
  const set = new Set<string>()
  for (const e of empStore.allEmployees as any[]) set.add(e.departmentName || 'Chưa phân phòng')
  return [{ value: '', label: 'Tất cả phòng ban' }, ...[...set].sort().map((d) => ({ value: d, label: d }))]
})
const employeeFilterOptions = computed(() => [
  { value: '', label: 'Tất cả nhân viên' },
  ...employeeOptions.value,
])

// Gắn thông tin NV vào từng bản ghi
const enriched = computed(() =>
  (store.attendanceList as any[]).map((r) => {
    const e = empMap.value[r.employeeId]
    return {
      ...r,
      _name: e?.name || 'NV chưa đồng bộ',
      _code: e?.code || r.employeeId?.slice(0, 8),
      _dept: e?.dept || 'Chưa phân phòng',
      _shift: r.shiftId ? (shiftMap.value[r.shiftId] || '—') : '—',
    }
  })
)
const filtered = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  return enriched.value.filter((r) => {
    if (deptFilter.value && r._dept !== deptFilter.value) return false
    if (employeeFilter.value && r.employeeId !== employeeFilter.value) return false
    if (q && !`${r._name} ${r._code}`.toLowerCase().includes(q)) return false
    return true
  })
})

const statusOptions = [
  { value: 0, label: 'Có mặt' },
  { value: 1, label: 'Vắng' },
  { value: 2, label: 'Nghỉ phép' },
  { value: 3, label: 'Ngày lễ' },
]

// ===== Helper định dạng =====
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`)
function formatDate(v?: string | null) {
  if (!v) return '—'
  const d = new Date(v); return isNaN(d.getTime()) ? '—' : `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}
function formatTime(v?: string | null) {
  if (!v) return '—'
  const d = new Date(v); return isNaN(d.getTime()) ? '—' : `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
const formatHours = (n?: number | null) => (n ?? 0).toLocaleString('vi-VN')

// ===== Cột bảng =====
const columns = computed<any[]>(() => [
  { title: 'Ngày', dataIndex: 'workDate', key: 'workDate', align: 'center', width: 110, sorter: (a: any, b: any) => String(a.workDate).localeCompare(String(b.workDate)) },
  { title: 'Nhân viên', key: 'employee', sorter: (a: any, b: any) => (a._name || '').localeCompare(b._name || '', 'vi') },
  { title: 'Ca', dataIndex: '_shift', key: 'shift', width: 130 },
  { title: 'Giờ vào', key: 'checkInTime', align: 'center', width: 90 },
  { title: 'Giờ ra', key: 'checkOutTime', align: 'center', width: 90 },
  { title: 'Giờ làm', key: 'workedHours', align: 'right', width: 90, sorter: (a: any, b: any) => (a.workedHours || 0) - (b.workedHours || 0) },
  { title: 'Tăng ca', key: 'overtimeHours', align: 'right', width: 90, sorter: (a: any, b: any) => (a.overtimeHours || 0) - (b.overtimeHours || 0) },
  { title: 'Đi muộn', key: 'lateMinutes', align: 'right', width: 100, sorter: (a: any, b: any) => (a.lateMinutes || 0) - (b.lateMinutes || 0) },
  { title: 'Trạng thái', dataIndex: 'status', key: 'status', align: 'center', width: 120, filters: statusOptions.map((s) => ({ text: s.label, value: s.value })), onFilter: (val: any, rec: any) => rec.status === val },
  { title: '', key: 'actions', align: 'right', width: 60 },
])

const pagination = {
  pageSize: 20,
  showSizeChanger: true,
  pageSizeOptions: ['20', '50', '100'],
  showTotal: (t: number) => `${t} dòng`,
}

async function reload() {
  await store.fetchAttendance(undefined, month.value, year.value)
}

// ===== Modal nhập/sửa tay =====
const modalOpen = ref(false)
const isEditMode = ref(false)
const submitting = ref(false)
const form = reactive<{ employeeId: string | undefined; workDate: string; status: number; checkInTime: string; checkOutTime: string; note: string }>({
  employeeId: undefined, workDate: '', status: 0, checkInTime: '', checkOutTime: '', note: '',
})
function openModal() {
  isEditMode.value = false
  form.employeeId = undefined; form.workDate = ''; form.status = 0; form.checkInTime = ''; form.checkOutTime = ''; form.note = ''
  modalOpen.value = true
}
// datetime-local cần dạng "YYYY-MM-DDTHH:mm" theo giờ địa phương
function toLocalInput(v?: string | null) {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
function openEdit(record: any) {
  isEditMode.value = true
  form.employeeId = record.employeeId
  form.workDate = record.workDate ? String(record.workDate).slice(0, 10) : ''
  form.status = record.status
  form.checkInTime = toLocalInput(record.checkInTime)
  form.checkOutTime = toLocalInput(record.checkOutTime)
  form.note = record.note || ''
  modalOpen.value = true
}
async function submitManual() {
  if (!form.employeeId) { message.error('Vui lòng chọn nhân viên'); return }
  if (!form.workDate) { message.error('Vui lòng chọn ngày'); return }
  submitting.value = true
  const ok = await store.upsertManual({
    employeeId: form.employeeId, workDate: form.workDate, status: form.status,
    checkInTime: form.checkInTime || null, checkOutTime: form.checkOutTime || null, note: form.note || null,
  })
  submitting.value = false
  if (ok) { message.success('Đã lưu chấm công'); modalOpen.value = false; await reload() }
  else message.error(store.error || 'Lưu chấm công thất bại')
}

onMounted(async () => {
  if (!empStore.allEmployees.length) await empStore.fetchAllEmployees()
  if (!store.shifts.length) await store.fetchShifts()
  await reload()
})
watch([month, year], reload)
</script>

<template>
  <DataTableShell
    title="Bảng chấm công"
    subtitle="Theo dõi giờ làm việc, tăng ca và trạng thái chấm công theo tháng."
    :columns="columns"
    :data-source="filtered"
    :loading="store.isLoading"
    row-key="id"
    :pagination="pagination"
    :scroll-x="1000"
  >
    <!-- Header actions -->
    <template #actions>
      <Button @click="openModal" class="shadow-accent">
        <PlusIcon class="w-4 h-4 mr-2" /> Nhập tay
      </Button>
    </template>

    <!-- Filters -->
    <template #filters>
      <div class="relative w-full sm:w-64">
        <input
          v-model="searchText"
          type="text"
          placeholder="Tìm theo tên hoặc mã nhân viên..."
          class="w-full h-9 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm"
        />
      </div>
      <ASelect v-model:value="month" :options="months" class="min-w-[120px]" />
      <ASelect v-model:value="year" :options="years" class="min-w-[100px]" />
      <select v-model="deptFilter" class="h-9 px-3 rounded-lg border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm">
        <option v-for="d in departmentOptions" :key="d.value" :value="d.value">{{ d.label }}</option>
      </select>
      <ASelect
        v-model:value="employeeFilter"
        :options="employeeFilterOptions"
        show-search
        :filter-option="(input: string, option: any) => option.label.toLowerCase().includes(input.toLowerCase())"
        class="min-w-[220px]"
        placeholder="Tất cả nhân viên"
      />
    </template>

    <!-- Banner: lỗi -->
    <template #banner>
      <div v-if="store.error && !modalOpen" class="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
        {{ store.error }}
      </div>
    </template>

    <!-- Ô tuỳ biến -->
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'workDate'">
        <span class="font-mono text-sm">{{ formatDate(record.workDate) }}</span>
      </template>
      <template v-else-if="column.key === 'employee'">
        <div class="font-sans leading-tight">
          <div class="font-medium text-foreground">{{ record._name }}</div>
          <div class="font-mono text-xs text-muted-foreground">{{ record._code }}</div>
        </div>
      </template>
      <template v-else-if="column.key === 'checkInTime'">
        <span class="font-mono text-sm">{{ formatTime(record.checkInTime) }}</span>
      </template>
      <template v-else-if="column.key === 'checkOutTime'">
        <span class="font-mono text-sm">{{ formatTime(record.checkOutTime) }}</span>
      </template>
      <template v-else-if="column.key === 'workedHours'">
        <span class="font-mono text-sm">{{ formatHours(record.workedHours) }}</span>
      </template>
      <template v-else-if="column.key === 'overtimeHours'">
        <span class="font-mono text-sm text-emerald-600">{{ formatHours(record.overtimeHours) }}</span>
      </template>
      <template v-else-if="column.key === 'lateMinutes'">
        <span class="font-mono text-sm" :class="record.lateMinutes > 0 ? 'text-red-600' : 'text-muted-foreground'">{{ formatHours(record.lateMinutes) }} phút</span>
      </template>
      <template v-else-if="column.key === 'status'">
        <ATag :color="ATTENDANCE_STATUS[record.status]?.color">{{ ATTENDANCE_STATUS[record.status]?.label || record.status }}</ATag>
      </template>
      <template v-else-if="column.key === 'actions'">
        <div class="flex items-center justify-end">
          <button @click="openEdit(record)" class="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-all" title="Sửa chấm công">
            <PencilIcon class="w-4 h-4" />
          </button>
        </div>
      </template>
    </template>
  </DataTableShell>

  <!-- Modal nhập/sửa tay -->
  <Modal :title="isEditMode ? 'Sửa chấm công' : 'Nhập chấm công thủ công'" :is-open="modalOpen" max-width="lg" @close="modalOpen = false">
    <form class="space-y-5 font-sans" @submit.prevent="submitManual">
      <div>
        <label class="block text-sm font-medium text-foreground mb-1.5">Nhân viên</label>
        <ASelect
          v-model:value="form.employeeId"
          :options="employeeOptions"
          show-search
          :filter-option="(input: string, option: any) => option.label.toLowerCase().includes(input.toLowerCase())"
          placeholder="Chọn nhân viên"
          style="width: 100%"
          size="large"
          :disabled="isEditMode"
        />
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-foreground mb-1.5">Ngày</label>
          <input v-model="form.workDate" type="date" :disabled="isEditMode" class="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60" />
        </div>
        <div>
          <label class="block text-sm font-medium text-foreground mb-1.5">Trạng thái</label>
          <ASelect v-model:value="form.status" :options="statusOptions" style="width: 100%" size="large" />
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-foreground mb-1.5">Giờ vào</label>
          <input v-model="form.checkInTime" type="datetime-local" class="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
        <div>
          <label class="block text-sm font-medium text-foreground mb-1.5">Giờ ra</label>
          <input v-model="form.checkOutTime" type="datetime-local" class="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-foreground mb-1.5">Ghi chú</label>
        <textarea v-model="form.note" rows="3" placeholder="Ghi chú (tùy chọn)" class="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"></textarea>
      </div>
      <div class="flex justify-end gap-3 pt-2">
        <Button variant="secondary" type="button" @click="modalOpen = false">Hủy</Button>
        <Button type="submit" :disabled="submitting">{{ submitting ? 'Đang lưu...' : 'Lưu' }}</Button>
      </div>
    </form>
  </Modal>
</template>
