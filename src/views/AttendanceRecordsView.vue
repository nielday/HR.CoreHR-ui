<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { Select as ASelect, Table as ATable, Tag as ATag, Input, Collapse, Badge as ABadge, message } from 'ant-design-vue'
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

    <!-- Thanh tìm kiếm + lọc phòng ban -->
    <div class="bg-card border border-border rounded-2xl shadow-md p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
      <AInputSearch v-model:value="searchText" placeholder="Tìm theo tên hoặc mã nhân viên..." allow-clear size="large" class="flex-1" />
      <ASelect v-model:value="deptFilter" :options="departmentOptions" size="large" style="min-width: 220px" />
      <span class="font-mono text-xs text-muted-foreground whitespace-nowrap">{{ filtered.length }} bản ghi</span>
    </div>

    <!-- Danh sách nhóm theo phòng ban -->
    <div v-if="groups.length" class="bg-card border border-border rounded-2xl shadow-md p-2 sm:p-4">
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
