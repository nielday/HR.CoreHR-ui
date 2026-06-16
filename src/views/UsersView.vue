<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Table as ATable, Tag as ATag, Select as ASelect, Popconfirm as APopconfirm, message } from 'ant-design-vue'
import { PlusIcon, KeyRoundIcon, LockIcon, UnlockIcon } from 'lucide-vue-next'
import api from '../utils/axios'
import { useEmployeeStore } from '../stores/employee'
import { useAuthStore } from '../stores/auth'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'

const empStore = useEmployeeStore()
const authStore = useAuthStore()

const users = ref<any[]>([])
const loading = ref(false)
const error = ref('')

const isAdmin = computed(() => authStore.userRole === 'Admin')
const roleOptions = computed(() => {
  const base = [
    { value: 'Employee', label: 'Nhân viên' },
    { value: 'Manager', label: 'Quản lý' },
    { value: 'HR', label: 'Nhân sự (HR)' },
  ]
  if (isAdmin.value) base.push({ value: 'Admin', label: 'Quản trị viên (Admin)' })
  return base
})
const roleLabel: Record<string, string> = { Admin: 'Quản trị viên', HR: 'Nhân sự', Manager: 'Quản lý', Employee: 'Nhân viên' }
const roleColor: Record<string, string> = { Admin: 'red', HR: 'blue', Manager: 'gold', Employee: 'default' }

const employeeOptions = computed(() =>
  (empStore.employees as any[]).map((e) => ({ value: e.id, label: `${e.fullName} (${e.employeeCode})` }))
)

const columns = [
  { title: 'Tài khoản', key: 'username' },
  { title: 'Vai trò', key: 'role', width: 140 },
  { title: 'Nhân viên', key: 'employee' },
  { title: 'Trạng thái', key: 'isActive', align: 'center' as const, width: 130 },
  { title: 'Đổi MK lần đầu', key: 'mustChangePassword', align: 'center' as const, width: 140 },
  { title: '', key: 'actions', align: 'right' as const, width: 170 },
]

async function fetchUsers() {
  loading.value = true; error.value = ''
  try { users.value = (await api.get('/Users')).data }
  catch (e: any) { error.value = e.response?.data?.message || e.message || 'Không tải được danh sách tài khoản' }
  finally { loading.value = false }
}

// ===== Tạo tài khoản =====
const modalOpen = ref(false)
const submitting = ref(false)
const form = reactive<{ username: string; password: string; role: string; employeeId: string | undefined }>({
  username: '', password: '', role: 'Employee', employeeId: undefined,
})
function openCreate() {
  form.username = ''; form.password = ''; form.role = 'Employee'; form.employeeId = undefined
  modalOpen.value = true
}
async function submitCreate() {
  if (!form.username.trim()) { message.error('Nhập tên đăng nhập'); return }
  if (form.password.length < 6) { message.error('Mật khẩu khởi tạo tối thiểu 6 ký tự'); return }
  submitting.value = true
  try {
    await api.post('/Users', { username: form.username, password: form.password, role: form.role, employeeId: form.employeeId || null })
    message.success('Đã tạo tài khoản. Người dùng sẽ đổi mật khẩu khi đăng nhập lần đầu.')
    modalOpen.value = false
    await fetchUsers()
  } catch (e: any) {
    message.error(e.response?.data?.message || 'Tạo tài khoản thất bại')
  } finally { submitting.value = false }
}

async function resetPassword(u: any) {
  try {
    await api.post(`/Users/${u.id}/reset-password`, { newPassword: '123456' })
    message.success(`Đã cấp lại mật khẩu cho ${u.username} (mặc định 123456). Người dùng phải đổi khi đăng nhập.`)
    await fetchUsers()
  } catch (e: any) { message.error(e.response?.data?.message || 'Cấp lại mật khẩu thất bại') }
}
async function toggleActive(u: any) {
  try {
    await api.patch(`/Users/${u.id}/toggle-active`)
    await fetchUsers()
  } catch (e: any) { message.error(e.response?.data?.message || 'Thao tác thất bại') }
}

onMounted(async () => {
  if (!empStore.employees.length) await empStore.fetchEmployees({ pageSize: 1000 })
  await fetchUsers()
})
</script>

<template>
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Quản lý tài khoản</h1>
        <p class="text-muted-foreground font-sans text-lg">Cấp tài khoản cho nhân viên, gán vai trò; người dùng đổi mật khẩu khi đăng nhập lần đầu.</p>
      </div>
      <Button @click="openCreate" class="shadow-accent">
        <PlusIcon class="w-4 h-4 mr-2" /> Tạo tài khoản
      </Button>
    </div>

    <div v-if="error" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">{{ error }}</div>

    <div class="bg-card border border-border rounded-2xl shadow-md p-6">
      <ATable :columns="columns" :data-source="users" :loading="loading" row-key="id" :pagination="{ pageSize: 10 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'username'"><span class="font-mono font-medium text-foreground">{{ record.username }}</span></template>
          <template v-else-if="column.key === 'role'"><ATag :color="roleColor[record.role] || 'default'">{{ roleLabel[record.role] || record.role }}</ATag></template>
          <template v-else-if="column.key === 'employee'">
            <div v-if="record.employeeName" class="font-sans">
              <div class="text-foreground">{{ record.employeeName }}</div>
              <div class="font-mono text-xs text-muted-foreground">{{ record.employeeCode }}</div>
            </div>
            <span v-else class="text-muted-foreground italic text-sm">Không gắn nhân viên</span>
          </template>
          <template v-else-if="column.key === 'isActive'">
            <ATag :color="record.isActive ? 'green' : 'default'">{{ record.isActive ? 'Đang dùng' : 'Đã khóa' }}</ATag>
          </template>
          <template v-else-if="column.key === 'mustChangePassword'">
            <ATag v-if="record.mustChangePassword" color="orange">Cần đổi</ATag>
            <span v-else class="text-muted-foreground text-xs">—</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="flex items-center justify-end gap-1">
              <APopconfirm title="Cấp lại mật khẩu về 123456?" ok-text="Cấp lại" cancel-text="Hủy" @confirm="resetPassword(record)">
                <button class="p-2 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors" title="Cấp lại mật khẩu">
                  <KeyRoundIcon class="w-4 h-4" />
                </button>
              </APopconfirm>
              <APopconfirm :title="record.isActive ? 'Khóa tài khoản này?' : 'Mở khóa tài khoản này?'" ok-text="Xác nhận" cancel-text="Hủy" @confirm="toggleActive(record)">
                <button class="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors" :title="record.isActive ? 'Khóa' : 'Mở khóa'">
                  <LockIcon v-if="record.isActive" class="w-4 h-4" />
                  <UnlockIcon v-else class="w-4 h-4" />
                </button>
              </APopconfirm>
            </div>
          </template>
        </template>
      </ATable>
    </div>

    <!-- Modal tạo tài khoản -->
    <Modal title="Tạo tài khoản nhân viên" :is-open="modalOpen" @close="modalOpen = false">
      <form class="space-y-5" @submit.prevent="submitCreate">
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Nhân viên</label>
          <ASelect
            v-model:value="form.employeeId"
            :options="employeeOptions"
            show-search
            :filter-option="(input: string, option: any) => option.label.toLowerCase().includes(input.toLowerCase())"
            placeholder="Chọn nhân viên (không bắt buộc)"
            style="width: 100%" size="large" allow-clear
          />
        </div>
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Tên đăng nhập <span class="text-red-500">*</span></label>
          <input v-model="form.username" type="text" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-mono text-sm" placeholder="vd: nguyenvana" />
        </div>
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Mật khẩu khởi tạo <span class="text-red-500">*</span></label>
          <input v-model="form.password" type="text" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-mono text-sm" placeholder="Tối thiểu 6 ký tự (người dùng sẽ đổi lần đầu)" />
        </div>
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Vai trò</label>
          <ASelect v-model:value="form.role" :options="roleOptions" style="width: 100%" size="large" />
        </div>

        <div class="pt-4 border-t border-border flex justify-end gap-3">
          <Button variant="ghost" type="button" @click="modalOpen = false">Hủy</Button>
          <Button type="submit" :disabled="submitting" class="min-w-[140px]">{{ submitting ? 'Đang tạo...' : 'Tạo tài khoản' }}</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
