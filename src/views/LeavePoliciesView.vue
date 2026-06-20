<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { Tag as ATag, Popconfirm as APopconfirm, Input as AInput, InputNumber as AInputNumber, Select as ASelect, message } from 'ant-design-vue'
const ATextarea = AInput.TextArea
import { PencilIcon, PlusIcon, TrashIcon } from 'lucide-vue-next'
import { useAttendanceStore } from '../stores/attendance'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'
import DataTableShell from '../components/ui/DataTableShell.vue'

const store = useAttendanceStore()

const isModalOpen = ref(false)
const isEdit = ref(false)
const editingId = ref<string | null>(null)

const search = ref('')
const paidFilter = ref('')
const statusFilter = ref('')

const form = ref({
  name: '',
  isPaid: true,
  annualQuotaDays: null as any,
  description: '',
  isActive: true,
})

const columns = computed<any[]>(() => [
  { title: 'Tên loại nghỉ', key: 'name', sorter: (a: any, b: any) => (a.name || '').localeCompare(b.name || '') },
  { title: 'Có lương', key: 'isPaid', align: 'center' as const, width: 110 },
  { title: 'Hạn mức/năm', key: 'annualQuotaDays', align: 'center' as const, width: 140 },
  { title: 'Mô tả', key: 'description' },
  { title: 'Trạng thái', key: 'isActive', align: 'center' as const, width: 130 },
  { title: 'Thao tác', key: 'actions', align: 'right' as const, width: 110 },
])

const filtered = computed<any[]>(() => {
  const kw = search.value.trim().toLowerCase()
  return store.leavePolicies.filter((p: any) => {
    if (paidFilter.value === 'paid' && !p.isPaid) return false
    if (paidFilter.value === 'unpaid' && p.isPaid) return false
    if (statusFilter.value === 'active' && !p.isActive) return false
    if (statusFilter.value === 'inactive' && p.isActive) return false
    if (!kw) return true
    return (
      (p.name || '').toLowerCase().includes(kw) ||
      (p.description || '').toLowerCase().includes(kw)
    )
  })
})

function openCreate() {
  isEdit.value = false
  editingId.value = null
  form.value = { name: '', isPaid: true, annualQuotaDays: null, description: '', isActive: true }
  store.error = null
  isModalOpen.value = true
}

function openEdit(policy: Record<string, any>) {
  isEdit.value = true
  editingId.value = policy.id
  form.value = {
    name: policy.name || '',
    isPaid: policy.isPaid,
    annualQuotaDays: policy.annualQuotaDays ?? null,
    description: policy.description || '',
    isActive: policy.isActive,
  }
  store.error = null
  isModalOpen.value = true
}

async function submit() {
  const payload = {
    name: form.value.name,
    isPaid: form.value.isPaid,
    annualQuotaDays: form.value.annualQuotaDays === null ? null : Number(form.value.annualQuotaDays),
    description: form.value.description,
    isActive: form.value.isActive,
  }
  const ok = isEdit.value && editingId.value
    ? await store.updateLeavePolicy(editingId.value, payload)
    : await store.createLeavePolicy(payload)

  if (ok) {
    message.success(isEdit.value ? 'Đã cập nhật loại nghỉ' : 'Đã thêm loại nghỉ')
    isModalOpen.value = false
    await store.fetchLeavePolicies()
  } else {
    message.error(store.error || 'Lưu thất bại')
  }
}

async function remove(id: string) {
  const ok = await store.deleteLeavePolicy(id)
  if (ok) { message.success('Đã xóa loại nghỉ'); await store.fetchLeavePolicies() }
  else message.error(store.error || 'Xóa thất bại')
}

onMounted(() => store.fetchLeavePolicies())
</script>

<template>
  <DataTableShell
    title="Loại nghỉ phép"
    subtitle="Quản lý các loại nghỉ, hạn mức ngày/năm và trạng thái áp dụng."
    :columns="columns"
    :data-source="filtered"
    :loading="store.isLoading"
    row-key="id"
    show-search
    search-placeholder="Tìm theo tên loại nghỉ, mô tả..."
    :search="search"
    @update:search="search = $event"
    :pagination="{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['15','30','50'], showTotal: (t:number)=>`${t} mục` }"
  >
    <template #actions>
      <Button @click="openCreate" class="shadow-accent">
        <PlusIcon class="w-4 h-4 mr-2" /> Thêm loại nghỉ
      </Button>
    </template>

    <template #filters>
      <a-select
        v-model:value="paidFilter"
        :options="[{ label: 'Tất cả (lương)', value: '' }, { label: 'Có lương', value: 'paid' }, { label: 'Không lương', value: 'unpaid' }]"
        style="min-width: 160px"
      />
      <a-select
        v-model:value="statusFilter"
        :options="[{ label: 'Tất cả trạng thái', value: '' }, { label: 'Đang áp dụng', value: 'active' }, { label: 'Tạm ngừng', value: 'inactive' }]"
        style="min-width: 180px"
      />
    </template>

    <template #banner>
      <div v-if="store.error && !isModalOpen" class="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
        {{ store.error }}
      </div>
    </template>

    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'name'">
        <span class="font-sans font-medium text-foreground">{{ record.name }}</span>
      </template>
      <template v-else-if="column.key === 'isPaid'">
        <ATag :color="record.isPaid ? 'green' : 'default'">{{ record.isPaid ? 'Có lương' : 'Không lương' }}</ATag>
      </template>
      <template v-else-if="column.key === 'annualQuotaDays'">
        <span class="font-mono text-sm">
          {{ record.annualQuotaDays === null || record.annualQuotaDays === undefined ? 'Không giới hạn' : `${record.annualQuotaDays} ngày` }}
        </span>
      </template>
      <template v-else-if="column.key === 'description'">
        <span class="font-sans text-sm text-muted-foreground">{{ record.description || '—' }}</span>
      </template>
      <template v-else-if="column.key === 'isActive'">
        <ATag :color="record.isActive ? 'green' : 'default'">{{ record.isActive ? 'Đang áp dụng' : 'Tạm ngừng' }}</ATag>
      </template>
      <template v-else-if="column.key === 'actions'">
        <div class="flex items-center justify-end gap-1">
          <button @click="openEdit(record)" class="p-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-all" title="Sửa">
            <PencilIcon class="w-4 h-4" />
          </button>
          <APopconfirm title="Xóa loại nghỉ này?" ok-text="Xóa" cancel-text="Hủy" @confirm="remove(record.id)">
            <button class="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Xóa">
              <TrashIcon class="w-4 h-4" />
            </button>
          </APopconfirm>
        </div>
      </template>
    </template>
  </DataTableShell>

  <Modal :isOpen="isModalOpen" :title="isEdit ? 'Sửa loại nghỉ' : 'Thêm loại nghỉ'" @close="isModalOpen = false">
    <form @submit.prevent="submit" class="space-y-5">
      <div>
        <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Tên loại nghỉ <span class="text-red-500">*</span></label>
        <a-input v-model:value="form.name" placeholder="VD: Phép năm, Nghỉ cưới..." style="width:100%" />
      </div>

      <div class="flex items-center gap-3">
        <input id="leaveIsPaid" v-model="form.isPaid" type="checkbox" class="w-4 h-4 rounded text-accent focus:ring-accent accent-accent" />
        <label for="leaveIsPaid" class="font-sans text-sm text-foreground">Nghỉ có lương (tính vào ngày phép có lương khi chốt công)</label>
      </div>

      <div>
        <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Hạn mức ngày/năm</label>
        <a-input-number v-model:value="form.annualQuotaDays" :min="0" :step="0.5" placeholder="Để trống = không giới hạn" style="width:100%" />
        <p class="mt-2 text-xs text-muted-foreground font-sans">Để trống nếu không giới hạn (vd nghỉ không lương).</p>
      </div>

      <div>
        <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Mô tả</label>
        <a-textarea v-model:value="form.description" :rows="2" placeholder="Mô tả..." />
      </div>

      <div v-if="isEdit" class="flex items-center gap-3 pt-2">
        <input id="leavePolicyActive" v-model="form.isActive" type="checkbox" class="w-4 h-4 rounded text-accent focus:ring-accent accent-accent" />
        <label for="leavePolicyActive" class="font-sans text-sm text-foreground">Đang áp dụng</label>
      </div>

      <div v-if="store.error && isModalOpen" class="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-sans">{{ store.error }}</div>

      <div class="pt-6 border-t border-border flex justify-end gap-4 mt-6">
        <Button variant="ghost" type="button" @click="isModalOpen = false">Hủy</Button>
        <Button type="submit" :disabled="store.isLoading" class="min-w-[150px]">
          {{ store.isLoading ? 'Đang lưu...' : (isEdit ? 'Lưu thay đổi' : 'Thêm') }}
        </Button>
      </div>
    </form>
  </Modal>
</template>
