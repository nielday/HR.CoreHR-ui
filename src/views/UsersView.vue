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

const employeeOptions = computed(() => {
  const existingEmployeeIds = new Set(users.value.map(u => u.employeeId).filter(id => id))
  return (empStore.employees as any[])
    .filter(e => !existingEmployeeIds.has(e.id))
    .map((e) => ({ value: e.id, label: `${e.fullName} (${e.employeeCode})` }))
})

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

// ===== Đổi vai trò =====
const editModalOpen = ref(false)
const submitting = ref(false)
const editForm = reactive({ id: '', username: '', role: 'Employee' })

function openEditRole(u: any) {
  editForm.id = u.id
  editForm.username = u.username
  editForm.role = u.role
  editModalOpen.value = true
}

async function submitEditRole() {
  submitting.value = true
  try {
    await api.patch(`/Users/${editForm.id}/role`, { role: editForm.role })
    message.success(`Đã cập nhật quyền cho tài khoản ${editForm.username}`)
    editModalOpen.value = false
    await fetchUsers()
  } catch (e: any) {
    message.error(e.response?.data?.message || 'Đổi vai trò thất bại')
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
        <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Tài khoản truy cập</h1>
        <p class="text-muted-foreground font-sans text-lg">Phân quyền tài khoản. Hệ thống tự cấp tài khoản khi nhân sự mới được thêm.</p>
      </div>
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
              <button v-if="isAdmin" @click="openEditRole(record)" class="p-2 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-50 transition-colors" title="Đổi vai trò">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </button>
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

    <!-- Modal Đổi vai trò -->
    <Modal title="Phân quyền tài khoản" :is-open="editModalOpen" @close="editModalOpen = false">
      <form class="space-y-5" @submit.prevent="submitEditRole">
        <div class="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
          <div class="flex justify-between items-center text-sm">
            <span class="text-slate-500">Tài khoản:</span>
            <span class="font-mono font-bold text-slate-800">{{ editForm.username }}</span>
          </div>
        </div>
        
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Vai trò mới</label>
          <ASelect v-model:value="editForm.role" :options="roleOptions" style="width: 100%" size="large" />
          <p class="text-xs text-muted-foreground mt-2">Chỉ Admin mới có thể cấp quyền Admin cho người khác.</p>
        </div>

        <div class="pt-4 border-t border-border flex justify-end gap-3 mt-2">
          <Button variant="ghost" type="button" @click="editModalOpen = false">Hủy</Button>
          <Button type="submit" :disabled="submitting" class="min-w-[140px]">{{ submitting ? 'Đang lưu...' : 'Lưu thay đổi' }}</Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
