<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message, Input as AInput, Select as ASelect } from 'ant-design-vue'
import { LockIcon, SaveIcon, UserIcon } from 'lucide-vue-next'
import { useEmployeeStore } from '../stores/employee'
import Button from '../components/ui/Button.vue'

const ATextarea = AInput.TextArea

const store = useEmployeeStore()

const profile = ref<any>(null)
const loaded = ref(false)

// Form CHỈ thông tin cá nhân
const form = ref({
  phoneNumber: '',
  dateOfBirth: '' as string,
  gender: '' as string,
  address: '',
})

const STATUS: Record<string, string> = {
  Active: 'Đang làm việc', Probation: 'Thử việc', Suspended: 'Tạm ngưng', Resigned: 'Đã nghỉ việc',
}
const GENDER: Record<string, string> = { Male: 'Nam', Female: 'Nữ', Other: 'Khác' }
const genderOptions = computed(() => Object.entries(GENDER).map(([value, label]) => ({ value, label })))

function fmtDate(v?: string | null) {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
function toDateInput(v?: string | null) {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function load() {
  const data = await store.fetchMyProfile()
  loaded.value = true
  if (data) {
    profile.value = data
    form.value = {
      phoneNumber: data.phoneNumber || '',
      dateOfBirth: toDateInput(data.dateOfBirth),
      gender: data.gender || '',
      address: data.address || '',
    }
  }
}

async function save() {
  const res = await store.updateMyProfile({
    phoneNumber: form.value.phoneNumber || null,
    dateOfBirth: form.value.dateOfBirth || null,
    gender: form.value.gender || null,
    address: form.value.address || null,
  })
  if (res) {
    profile.value = res
    message.success('Đã cập nhật hồ sơ')
  } else {
    message.error(store.error || 'Cập nhật thất bại')
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <div>
      <h1 class="font-display text-2xl text-foreground leading-tight">Hồ sơ của tôi</h1>
      <p class="text-muted-foreground font-sans text-sm mt-0.5">Xem thông tin công việc và cập nhật thông tin cá nhân của bạn.</p>
    </div>

    <div v-if="store.error && loaded && !profile" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
      {{ store.error }}
    </div>

    <template v-if="profile">
      <!-- Thông tin tổ chức (read-only) -->
      <div class="bg-card border border-border rounded-2xl shadow-md p-6">
        <div class="flex items-center gap-2 mb-5">
          <LockIcon class="w-4 h-4 text-muted-foreground" />
          <h2 class="font-display text-xl text-foreground">Thông tin tổ chức</h2>
          <span class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Chỉ HR thay đổi</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <p class="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Mã nhân viên</p>
            <p class="font-mono text-sm text-foreground">{{ profile.employeeCode }}</p>
          </div>
          <div>
            <p class="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Họ và tên</p>
            <p class="font-sans text-sm font-medium text-foreground">{{ profile.fullName }}</p>
          </div>
          <div>
            <p class="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Email</p>
            <p class="font-sans text-sm text-foreground">{{ profile.email }}</p>
          </div>
          <div>
            <p class="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Phòng ban</p>
            <p class="font-sans text-sm text-foreground">{{ profile.departmentName || '—' }}</p>
          </div>
          <div>
            <p class="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Chức vụ</p>
            <p class="font-sans text-sm text-foreground">{{ profile.positionName || '—' }}</p>
          </div>
          <div>
            <p class="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Loại hợp đồng</p>
            <p class="font-sans text-sm text-foreground">{{ profile.currentContractTypeName || '—' }}</p>
          </div>
          <div>
            <p class="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Ngày vào làm</p>
            <p class="font-mono text-sm text-foreground">{{ fmtDate(profile.hireDate) }}</p>
          </div>
          <div>
            <p class="font-mono text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Trạng thái</p>
            <p class="font-sans text-sm text-foreground">{{ STATUS[profile.workingStatus] || profile.workingStatus }}</p>
          </div>
        </div>
        <p class="mt-5 text-xs text-muted-foreground font-sans italic">Cần thay đổi phòng ban / chức vụ? Vui lòng liên hệ phòng Nhân sự.</p>
      </div>

      <!-- Thông tin cá nhân (editable) -->
      <div class="bg-card border border-border rounded-2xl shadow-md p-6 max-w-3xl">
        <div class="flex items-center gap-2 mb-5">
          <UserIcon class="w-4 h-4 text-accent" />
          <h2 class="font-display text-xl text-foreground">Thông tin cá nhân</h2>
        </div>
        <form @submit.prevent="save" class="space-y-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Số điện thoại</label>
              <a-input v-model:value="form.phoneNumber" placeholder="0901234567" style="width:100%" />
            </div>
            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Ngày sinh</label>
              <input v-model="form.dateOfBirth" type="date" class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-mono text-sm" />
            </div>
            <div>
              <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Giới tính</label>
              <a-select v-model:value="form.gender" :options="genderOptions" placeholder="-- Chọn --" style="width:100%" />
            </div>
          </div>
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Địa chỉ</label>
            <a-textarea v-model:value="form.address" :rows="2" placeholder="Số nhà, đường, quận/huyện, tỉnh/thành..." />
          </div>

          <div v-if="store.error && profile" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans">{{ store.error }}</div>

          <div class="pt-2 flex justify-end">
            <Button type="submit" :disabled="store.isLoading" class="min-w-[160px]">
              <SaveIcon class="w-4 h-4 mr-2" />
              {{ store.isLoading ? 'Đang lưu...' : 'Lưu thay đổi' }}
            </Button>
          </div>
        </form>
      </div>
    </template>
  </div>
</template>
