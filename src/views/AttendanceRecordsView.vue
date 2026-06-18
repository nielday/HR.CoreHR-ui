<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { Select as ASelect, Table as ATable, Tag as ATag, Input, Collapse, Badge as ABadge, Segmented as ASegmented, message } from 'ant-design-vue'
import { PlusIcon, UsersIcon } from 'lucide-vue-next'
import { useAttendanceStore, ATTENDANCE_STATUS } from '../stores/attendance'
import { useEmployeeStore } from '../stores/employee'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'

const AInputSearch = Input.Search
const ACollapse = Collapse
const ACollapsePanel = Collapse.Panel

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

// Lọc + tìm kiếm
const searchText = ref('')
const deptFilter = ref<string>('')
const departmentOptions = computed(() => {
  const set = new Set<string>()
  for (const e of empStore.allEmployees as any[]) set.add(e.departmentName || 'Chưa phân phòng')
  return [{ value: '', label: 'Tất cả phòng ban' }, ...[...set].sort().map((d) => ({ value: d, label: d }))]
})

// Gắn thông tin NV vào từng bản ghi
const enriched = computed(() =>
  (store.attendanceList as any[]).map((r) => {
    const e = empMap.value[r.employeeId]
    return { ...r, _name: e?.name || 'NV chưa đồng bộ', _code: e?.code || r.employeeId?.slice(0, 8), _dept: e?.dept || 'Chưa phân phòng' }
  })
)
const filtered = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  return enriched.value.filter((r) => {
    if (deptFilter.value && r._dept !== deptFilter.value) return false
    if (q && !`${r._name} ${r._code}`.toLowerCase().includes(q)) return false
    return true
  })
})
// Nhóm theo phòng ban
const groups = computed(() => {
  const m = new Map<string, any[]>()
  for (const r of filtered.value) {
    if (!m.has(r._dept)) m.set(r._dept, [])
    m.get(r._dept)!.push(r)
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], 'vi')).map(([dept, records]) => ({ dept, records }))
})
const activeKeys = ref<string[]>([])
watch(groups, (g) => { activeKeys.value = g.map((x) => x.dept) }, { immediate: true })

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

// ===== Chế độ xem: lưới tháng (mặc định) | nhật ký chi tiết =====
const viewMode = ref<'matrix' | 'log'>('matrix')
const viewOptions = [
  { label: 'Bảng tháng', value: 'matrix' },
  { label: 'Nhật ký chi tiết', value: 'log' },
]

// Ký hiệu trạng thái (giống bảng chấm công VN): K=đủ công, V=vắng, P=phép, L=lễ
const SYMBOL: Record<number, { ch: string; cls: string; label: string }> = {
  0: { ch: 'K', cls: 'bg-emerald-100 text-emerald-700', label: 'Đủ công' },
  1: { ch: 'V', cls: 'bg-red-100 text-red-700', label: 'Vắng' },
  2: { ch: 'P', cls: 'bg-blue-100 text-blue-700', label: 'Nghỉ phép' },
  3: { ch: 'L', cls: 'bg-purple-100 text-purple-700', label: 'Ngày lễ' },
}

const daysInMonth = computed(() => new Date(year.value, month.value, 0).getDate())
const dayList = computed(() => Array.from({ length: daysInMonth.value }, (_, i) => i + 1))
const todayDay = computed(() => {
  const n = new Date()
  return n.getMonth() + 1 === month.value && n.getFullYear() === year.value ? n.getDate() : -1
})
function isWeekend(day: number) {
  const w = new Date(year.value, month.value - 1, day).getDay()
  return w === 0 || w === 6
}

// Pivot: nhân viên (trong phạm vi) × ngày, kèm dòng tổng hợp "quy ra công"
const matrixGroups = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  const byEmp: Record<string, Record<number, any>> = {}
  for (const r of store.attendanceList as any[]) {
    const d = parseInt(String(r.workDate).slice(8, 10), 10)
    let map = byEmp[r.employeeId]
    if (!map) { map = {}; byEmp[r.employeeId] = map }
    map[d] = r
  }
  const emps = (empStore.allEmployees as any[]).filter((e) => {
    if (e.workingStatus === 'Resigned') return false
    const dept = e.departmentName || 'Chưa phân phòng'
    if (deptFilter.value && dept !== deptFilter.value) return false
    if (q && !`${e.fullName} ${e.employeeCode}`.toLowerCase().includes(q)) return false
    return true
  })
  const m = new Map<string, any[]>()
  for (const e of emps) {
    const dept = e.departmentName || 'Chưa phân phòng'
    const days = byEmp[e.id] || {}
    const recs = Object.values(days) as any[]
    const row = {
      id: e.id,
      name: e.fullName,
      code: e.employeeCode,
      days,
      summary: {
        cong: recs.filter((r) => r.status === 0).length,
        ot: recs.reduce((s, r) => s + (r.overtimeHours || 0), 0),
        late: recs.filter((r) => (r.lateMinutes || 0) > 0).length,
        leave: recs.filter((r) => r.status === 2).length,
        absent: recs.filter((r) => r.status === 1).length,
      },
    }
    if (!m.has(dept)) m.set(dept, [])
    m.get(dept)!.push(row)
  }
  return [...m.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'vi'))
    .map(([dept, rows]) => ({ dept, rows }))
})

const matrixColumns = computed(() => {
  const cols: any[] = [{ title: 'Nhân viên', key: 'emp', fixed: 'left', width: 168 }]
  for (const d of dayList.value) {
    const weekend = isWeekend(d)
    const today = d === todayDay.value
    cols.push({
      title: String(d),
      key: `day-${d}`,
      day: d,
      width: 38,
      align: 'center',
      customHeaderCell: () => ({ class: today ? 'ts-today' : weekend ? 'ts-weekend' : '' }),
      customCell: () => ({ class: weekend ? 'ts-weekend' : '' }),
    })
  }
  cols.push(
    { title: 'Công', key: 'sum-cong', fixed: 'right', width: 56, align: 'center' },
    { title: 'OT', key: 'sum-ot', fixed: 'right', width: 52, align: 'center' },
    { title: 'Muộn', key: 'sum-late', fixed: 'right', width: 58, align: 'center' },
    { title: 'Phép', key: 'sum-leave', fixed: 'right', width: 52, align: 'center' },
    { title: 'Vắng', key: 'sum-absent', fixed: 'right', width: 52, align: 'center' },
  )
  return cols
})
const matrixScrollX = computed(() => 168 + dayList.value.length * 38 + 270)

function cellClass(rec: any) {
  const base = SYMBOL[rec.status]?.cls || 'bg-gray-100 text-gray-500'
  return rec.status === 0 && (rec.lateMinutes || 0) > 0 ? `${base} ring-1 ring-amber-400` : base
}
function cellTitle(rec: any) {
  const parts = [`Vào ${formatTime(rec.checkInTime)}`, `Ra ${formatTime(rec.checkOutTime)}`]
  if ((rec.lateMinutes || 0) > 0) parts.push(`muộn ${rec.lateMinutes}'`)
  if ((rec.overtimeHours || 0) > 0) parts.push(`TC ${rec.overtimeHours}h`)
  return `${SYMBOL[rec.status]?.label || ''} · ${parts.join(' · ')}`
}
// Bản ghi của ngày tương ứng với cột (key dạng 'day-<n>')
function dayRec(record: any, column: any) {
  return record.days[Number(String(column.key).slice(4))]
}

const columns = [
  { title: 'Nhân viên', key: 'employee' },
  { title: 'Ngày', key: 'workDate', align: 'center' as const, width: 120 },
  { title: 'Giờ vào', key: 'checkInTime', align: 'center' as const, width: 100 },
  { title: 'Giờ ra', key: 'checkOutTime', align: 'center' as const, width: 100 },
  { title: 'Số giờ', key: 'workedHours', align: 'right' as const, width: 90 },
  { title: 'Tăng ca', key: 'overtimeHours', align: 'right' as const, width: 90 },
  { title: 'Đi muộn', key: 'lateMinutes', align: 'right' as const, width: 100 },
  { title: 'Trạng thái', key: 'status', align: 'center' as const, width: 120 },
]

async function reload() {
  await store.fetchAttendance(undefined, month.value, year.value)
}

// ===== Modal nhập tay =====
const modalOpen = ref(false)
const submitting = ref(false)
const form = reactive<{ employeeId: string | undefined; workDate: string; status: number; checkInTime: string; checkOutTime: string; note: string }>({
  employeeId: undefined, workDate: '', status: 0, checkInTime: '', checkOutTime: '', note: '',
})
function openModal() {
  form.employeeId = undefined; form.workDate = ''; form.status = 0; form.checkInTime = ''; form.checkOutTime = ''; form.note = ''
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
  await reload()
})
watch([month, year], reload)
</script>

<template>
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Bảng chấm công</h1>
        <p class="text-muted-foreground font-sans text-lg">Theo dõi giờ làm việc, tăng ca và trạng thái chấm công theo tháng.</p>
      </div>
      <div class="flex items-center gap-3">
        <ASelect v-model:value="month" :options="months" style="width: 120px" size="large" />
        <ASelect v-model:value="year" :options="years" style="width: 110px" size="large" />
        <Button @click="openModal" class="shadow-accent">
          <PlusIcon class="w-4 h-4 mr-2" /> Nhập tay
        </Button>
      </div>
    </div>

    <div v-if="store.error" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">{{ store.error }}</div>

    <!-- Thanh tìm kiếm + lọc phòng ban + chế độ xem -->
    <div class="bg-card border border-border rounded-2xl shadow-md p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
      <ASegmented v-model:value="viewMode" :options="viewOptions" size="large" />
      <AInputSearch v-model:value="searchText" placeholder="Tìm theo tên hoặc mã nhân viên..." allow-clear size="large" class="flex-1" />
      <ASelect v-model:value="deptFilter" :options="departmentOptions" size="large" style="min-width: 220px" />
      <span class="font-mono text-xs text-muted-foreground whitespace-nowrap">{{ filtered.length }} bản ghi</span>
    </div>

    <!-- ===== CHẾ ĐỘ LƯỚI THÁNG (NV × ngày) ===== -->
    <template v-if="viewMode === 'matrix'">
      <!-- Chú thích ký hiệu -->
      <div class="bg-card border border-border rounded-2xl shadow-sm px-4 py-3 flex flex-wrap items-center gap-3 text-sm font-sans">
        <span class="font-mono text-xs uppercase tracking-widest text-muted-foreground">Ký hiệu:</span>
        <span v-for="(s, k) in SYMBOL" :key="k" class="inline-flex items-center gap-1.5">
          <span class="w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold" :class="s.cls">{{ s.ch }}</span>
          <span class="text-muted-foreground">{{ s.label }}</span>
        </span>
        <span class="inline-flex items-center gap-1.5">
          <span class="w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold bg-emerald-100 text-emerald-700 ring-1 ring-amber-400">K</span>
          <span class="text-muted-foreground">Đi muộn</span>
        </span>
      </div>

      <div v-if="matrixGroups.length" class="bg-card border border-border rounded-2xl shadow-md p-2 sm:p-4">
        <ACollapse v-model:activeKey="activeKeys" :bordered="false" expand-icon-position="end">
          <ACollapsePanel v-for="g in matrixGroups" :key="g.dept">
            <template #header>
              <div class="flex items-center gap-2 font-sans">
                <UsersIcon class="w-4 h-4 text-accent" />
                <span class="font-display text-lg text-foreground">{{ g.dept }}</span>
                <ABadge :count="g.rows.length" :number-style="{ backgroundColor: '#0052FF' }" />
              </div>
            </template>
            <ATable
              class="timesheet"
              :columns="matrixColumns"
              :data-source="g.rows"
              row-key="id"
              :pagination="g.rows.length > 15 ? { pageSize: 15 } : false"
              :scroll="{ x: matrixScrollX }"
              size="small"
              bordered
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'emp'">
                  <div class="font-medium text-foreground text-sm leading-tight">{{ record.name }}</div>
                  <div class="font-mono text-[11px] text-muted-foreground">{{ record.code }}</div>
                </template>
                <template v-else-if="String(column.key).startsWith('day-')">
                  <div
                    v-if="dayRec(record, column)"
                    class="w-7 h-7 mx-auto rounded flex items-center justify-center text-[11px] font-bold cursor-default"
                    :class="cellClass(dayRec(record, column))"
                    :title="cellTitle(dayRec(record, column))"
                  >{{ SYMBOL[dayRec(record, column).status]?.ch }}</div>
                  <span v-else class="text-muted-foreground/30">·</span>
                </template>
                <template v-else-if="column.key === 'sum-cong'"><span class="font-mono font-semibold text-foreground">{{ record.summary.cong }}</span></template>
                <template v-else-if="column.key === 'sum-ot'"><span class="font-mono text-emerald-600">{{ record.summary.ot || 0 }}</span></template>
                <template v-else-if="column.key === 'sum-late'"><span class="font-mono" :class="record.summary.late ? 'text-amber-600' : 'text-muted-foreground'">{{ record.summary.late }}</span></template>
                <template v-else-if="column.key === 'sum-leave'"><span class="font-mono text-blue-600">{{ record.summary.leave }}</span></template>
                <template v-else-if="column.key === 'sum-absent'"><span class="font-mono" :class="record.summary.absent ? 'text-red-600' : 'text-muted-foreground'">{{ record.summary.absent }}</span></template>
              </template>
            </ATable>
          </ACollapsePanel>
        </ACollapse>
      </div>
      <div v-else class="bg-card border border-border rounded-2xl shadow-md p-12 text-center text-muted-foreground font-sans">
        Không có nhân viên phù hợp.
      </div>
    </template>

    <!-- ===== CHẾ ĐỘ NHẬT KÝ CHI TIẾT (theo ngày) ===== -->
    <div v-else-if="groups.length" class="bg-card border border-border rounded-2xl shadow-md p-2 sm:p-4">
      <ACollapse v-model:activeKey="activeKeys" :bordered="false" expand-icon-position="end">
        <ACollapsePanel v-for="g in groups" :key="g.dept">
          <template #header>
            <div class="flex items-center gap-2 font-sans">
              <UsersIcon class="w-4 h-4 text-accent" />
              <span class="font-display text-lg text-foreground">{{ g.dept }}</span>
              <ABadge :count="g.records.length" :number-style="{ backgroundColor: '#0052FF' }" />
            </div>
          </template>
          <ATable :columns="columns" :data-source="g.records" row-key="id" :pagination="g.records.length > 10 ? { pageSize: 10 } : false" size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'employee'">
                <div class="font-sans">
                  <div class="font-medium text-foreground">{{ record._name }}</div>
                  <div class="font-mono text-xs text-muted-foreground">{{ record._code }}</div>
                </div>
              </template>
              <template v-else-if="column.key === 'workDate'"><span class="font-mono text-sm">{{ formatDate(record.workDate) }}</span></template>
              <template v-else-if="column.key === 'checkInTime'"><span class="font-mono text-sm">{{ formatTime(record.checkInTime) }}</span></template>
              <template v-else-if="column.key === 'checkOutTime'"><span class="font-mono text-sm">{{ formatTime(record.checkOutTime) }}</span></template>
              <template v-else-if="column.key === 'workedHours'"><span class="font-mono text-sm">{{ formatHours(record.workedHours) }}</span></template>
              <template v-else-if="column.key === 'overtimeHours'"><span class="font-mono text-sm text-emerald-600">{{ formatHours(record.overtimeHours) }}</span></template>
              <template v-else-if="column.key === 'lateMinutes'"><span class="font-mono text-sm" :class="record.lateMinutes > 0 ? 'text-red-600' : 'text-muted-foreground'">{{ formatHours(record.lateMinutes) }} phút</span></template>
              <template v-else-if="column.key === 'status'">
                <ATag :color="ATTENDANCE_STATUS[record.status]?.color">{{ ATTENDANCE_STATUS[record.status]?.label || record.status }}</ATag>
              </template>
            </template>
          </ATable>
        </ACollapsePanel>
      </ACollapse>
    </div>
    <div v-else class="bg-card border border-border rounded-2xl shadow-md p-12 text-center text-muted-foreground font-sans">
      Không có dữ liệu chấm công phù hợp.
    </div>

    <!-- Modal nhập tay -->
    <Modal title="Nhập chấm công thủ công" :is-open="modalOpen" max-width="lg" @close="modalOpen = false">
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
          />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">Ngày</label>
            <input v-model="form.workDate" type="date" class="w-full h-11 px-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
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
  </div>
</template>

<style scoped>
/* Lưới chấm công: ô gọn, tô màu cuối tuần / hôm nay */
.timesheet :deep(.ant-table-cell) { padding: 4px 4px !important; }
.timesheet :deep(.ts-weekend) { background: #f8fafc; }
.timesheet :deep(.ts-today) {
  background: rgba(0, 82, 255, 0.12) !important;
  color: var(--accent, #0052ff);
  font-weight: 700;
}
.timesheet :deep(.ant-table-thead > tr > th) {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  padding: 6px 4px !important;
}
</style>
