<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { PlusIcon, PencilIcon, PowerIcon } from 'lucide-vue-next'
import { Table as ATable, Tag as ATag, Popconfirm as APopconfirm, message } from 'ant-design-vue'
import { useAttendanceStore, type Shift } from '../stores/attendance'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'

const store = useAttendanceStore()

const isModalOpen = ref(false)
const isEditMode = ref(false)
const editingId = ref<string | null>(null)

const form = ref({
  shiftCode: '',
  shiftName: '',
  startTime: '',
  endTime: '',
  standardHours: 8,
  isActive: true,
})

const columns = [
  { title: 'Mã ca', dataIndex: 'shiftCode', key: 'shiftCode' },
  { title: 'Tên ca', dataIndex: 'shiftName', key: 'shiftName' },
  { title: 'Bắt đầu', key: 'startTime' },
  { title: 'Kết thúc', key: 'endTime' },
  { title: 'Giờ chuẩn', dataIndex: 'standardHours', key: 'standardHours' },
  { title: 'Trạng thái', key: 'isActive' },
  { title: 'Thao tác', key: 'actions', align: 'right' as const },
]

function toHHmm(t?: string | null) {
  return t ? t.slice(0, 5) : ''
}

function openCreate() {
  isEditMode.value = false
  editingId.value = null
  form.value = {
    shiftCode: '',
    shiftName: '',
    startTime: '',
    endTime: '',
    standardHours: 8,
    isActive: true,
  }
  isModalOpen.value = true
}

function openEdit(item: any) {
  isEditMode.value = true
  editingId.value = item.id ?? null
  form.value = {
    shiftCode: item.shiftCode,
    shiftName: item.shiftName,
    startTime: toHHmm(item.startTime),
    endTime: toHHmm(item.endTime),
    standardHours: item.standardHours,
    isActive: item.isActive,
  }
  isModalOpen.value = true
}

async function submit() {
  const payload = {
    shiftCode: form.value.shiftCode,
    shiftName: form.value.shiftName,
    startTime: form.value.startTime,
    endTime: form.value.endTime,
    standardHours: Number(form.value.standardHours),
    isActive: form.value.isActive,
  } as Shift

  let res
  if (isEditMode.value && editingId.value) {
    res = await store.updateShift(editingId.value, payload)
  } else {
    res = await store.createShift(payload)
  }

  if (res) {
    message.success(isEditMode.value ? 'Cập nhật ca thành công' : 'Tạo ca thành công')
    isModalOpen.value = false
    await store.fetchShifts()
  } else {
    message.error(store.error || 'Có lỗi xảy ra')
  }
}

async function deactivate(item: any) {
  if (!item.id) return
  const ok = await store.deactivateShift(item.id)
  if (ok) {
    message.success('Đã ngừng ca làm việc')
    await store.fetchShifts()
  } else {
    message.error(store.error || 'Ngừng ca thất bại')
  }
}

onMounted(() => {
  store.fetchShifts()
})
</script>

<template>
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Ca làm việc</h1>
        <p class="text-muted-foreground font-sans text-lg">Quản lý các ca làm việc và giờ giấc chuẩn của công ty.</p>
      </div>
      <Button @click="openCreate" class="shadow-accent hover:shadow-accent-lg transition-all duration-300 hover:-translate-y-0.5">
        <PlusIcon class="w-4 h-4 mr-2" />
        Thêm ca
      </Button>
    </div>

    <div v-if="store.error && !isModalOpen" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
      {{ store.error }}
    </div>

    <!-- Table -->
    <div class="bg-card border border-border rounded-2xl shadow-md p-6">
      <ATable
        :columns="columns"
        :data-source="store.shifts"
        :loading="store.isLoading"
        :pagination="false"
        row-key="id"
        class="font-sans"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'shiftCode'">
            <span class="font-mono text-sm font-medium text-muted-foreground">{{ record.shiftCode }}</span>
          </template>

          <template v-else-if="column.key === 'shiftName'">
            <span class="font-sans font-medium text-foreground">{{ record.shiftName }}</span>
          </template>

          <template v-else-if="column.key === 'startTime'">
            <span class="font-mono text-sm">{{ record.startTime?.slice(0, 5) }}</span>
          </template>

          <template v-else-if="column.key === 'endTime'">
            <span class="font-mono text-sm">{{ record.endTime?.slice(0, 5) }}</span>
          </template>

          <template v-else-if="column.key === 'standardHours'">
            <span class="font-mono text-sm">{{ record.standardHours }}</span>
          </template>

          <template v-else-if="column.key === 'isActive'">
            <ATag :color="record.isActive ? 'green' : 'default'">
              {{ record.isActive ? 'Đang dùng' : 'Ngừng' }}
            </ATag>
          </template>

          <template v-else-if="column.key === 'actions'">
            <div class="flex items-center justify-end gap-1">
              <button @click="openEdit(record)" class="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-colors" title="Sửa">
                <PencilIcon class="w-4 h-4" />
              </button>
              <APopconfirm
                v-if="record.isActive"
                title="Ngừng ca làm việc này?"
                ok-text="Ngừng"
                cancel-text="Hủy"
                @confirm="deactivate(record)"
              >
                <button class="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Ngừng">
                  <PowerIcon class="w-4 h-4" />
                </button>
              </APopconfirm>
            </div>
          </template>
        </template>
      </ATable>
    </div>

    <!-- Create / Edit Modal -->
    <Modal :isOpen="isModalOpen" :title="isEditMode ? 'Sửa ca làm việc' : 'Thêm ca làm việc'" @close="isModalOpen = false">
      <form @submit.prevent="submit" class="space-y-5">
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Mã ca <span class="text-red-500">*</span></label>
          <input v-model="form.shiftCode" type="text" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-mono text-sm" placeholder="VD: CA1" :disabled="isEditMode" />
        </div>

        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Tên ca <span class="text-red-500">*</span></label>
          <input v-model="form.shiftName" type="text" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm" placeholder="VD: Ca hành chính" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Bắt đầu <span class="text-red-500">*</span></label>
            <input v-model="form.startTime" type="time" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-mono text-sm" />
          </div>
          <div>
            <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Kết thúc <span class="text-red-500">*</span></label>
            <input v-model="form.endTime" type="time" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-mono text-sm" />
          </div>
        </div>

        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Giờ chuẩn <span class="text-red-500">*</span></label>
          <input v-model="form.standardHours" type="number" step="0.5" min="0" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-mono text-sm" placeholder="VD: 8" />
        </div>

        <div v-if="isEditMode" class="flex items-center gap-3 pt-2">
          <input type="checkbox" id="isActiveShift" v-model="form.isActive" class="w-4 h-4 rounded text-accent focus:ring-accent accent-accent" />
          <label for="isActiveShift" class="font-sans text-sm text-foreground">Đang hoạt động</label>
        </div>

        <div v-if="store.error && isModalOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans mt-4">
          {{ store.error }}
        </div>

        <div class="pt-6 border-t border-border flex justify-end gap-4 mt-6">
          <Button variant="ghost" type="button" @click="isModalOpen = false">Hủy</Button>
          <Button type="submit" :disabled="store.isLoading" class="min-w-[150px]">
            {{ store.isLoading ? 'Đang xử lý...' : 'Lưu' }}
          </Button>
        </div>
      </form>
    </Modal>
  </div>
</template>
