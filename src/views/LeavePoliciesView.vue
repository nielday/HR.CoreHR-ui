<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Table as ATable, Tag as ATag, Popconfirm as APopconfirm, message } from 'ant-design-vue'
import { PencilIcon, PlusIcon, TrashIcon } from 'lucide-vue-next'
import { useAttendanceStore } from '../stores/attendance'
import Button from '../components/ui/Button.vue'
import Modal from '../components/ui/Modal.vue'

const store = useAttendanceStore()

const isModalOpen = ref(false)
const isEdit = ref(false)
const editingId = ref<string | null>(null)
const form = ref({
  name: '',
  isPaid: true,
  annualQuotaDays: null as number | null,
  description: '',
  isActive: true,
})

const columns = [
  { title: 'Tên loại nghỉ', key: 'name' },
  { title: 'Có lương', key: 'isPaid', align: 'center' as const, width: 110 },
  { title: 'Hạn mức/năm', key: 'annualQuotaDays', align: 'center' as const, width: 140 },
  { title: 'Mô tả', key: 'description' },
  { title: 'Trạng thái', key: 'isActive', align: 'center' as const, width: 130 },
  { title: 'Thao tác', key: 'actions', align: 'right' as const, width: 110 },
]

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
  <div class="space-y-8 motion-safe:animate-in motion-safe:fade-in duration-700 pb-12">
    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">Loại nghỉ phép</h1>
        <p class="text-muted-foreground font-sans text-lg">Quản lý các loại nghỉ, hạn mức ngày/năm và trạng thái áp dụng.</p>
      </div>
      <Button @click="openCreate" class="shadow-accent">
        <PlusIcon class="w-4 h-4 mr-2" /> Thêm loại nghỉ
      </Button>
    </div>

    <div v-if="store.error && !isModalOpen" class="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-sans">
      {{ store.error }}
    </div>

    <div class="bg-card border border-border rounded-2xl shadow-md p-6">
      <ATable :columns="columns" :data-source="store.leavePolicies" :loading="store.isLoading" :pagination="false" row-key="id" class="font-sans">
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
              <button @click="openEdit(record)" class="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-colors" title="Sửa">
                <PencilIcon class="w-4 h-4" />
              </button>
              <APopconfirm title="Xóa loại nghỉ này?" ok-text="Xóa" cancel-text="Hủy" @confirm="remove(record.id)">
                <button class="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                  <TrashIcon class="w-4 h-4" />
                </button>
              </APopconfirm>
            </div>
          </template>
        </template>
      </ATable>
    </div>

    <Modal :isOpen="isModalOpen" :title="isEdit ? 'Sửa loại nghỉ' : 'Thêm loại nghỉ'" @close="isModalOpen = false">
      <form @submit.prevent="submit" class="space-y-5">
        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Tên loại nghỉ <span class="text-red-500">*</span></label>
          <input v-model="form.name" type="text" required class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm" placeholder="VD: Phép năm, Nghỉ cưới..." />
        </div>

        <div class="flex items-center gap-3">
          <input id="leaveIsPaid" v-model="form.isPaid" type="checkbox" class="w-4 h-4 rounded text-accent focus:ring-accent accent-accent" />
          <label for="leaveIsPaid" class="font-sans text-sm text-foreground">Nghỉ có lương (tính vào ngày phép có lương khi chốt công)</label>
        </div>

        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Hạn mức ngày/năm</label>
          <input v-model.number="form.annualQuotaDays" type="number" min="0" step="0.5" class="w-full h-12 px-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-mono text-sm" placeholder="Để trống = không giới hạn" />
          <p class="mt-2 text-xs text-muted-foreground font-sans">Để trống nếu không giới hạn (vd nghỉ không lương).</p>
        </div>

        <div>
          <label class="block font-mono text-xs uppercase tracking-widest text-muted-foreground mb-2">Mô tả</label>
          <textarea v-model="form.description" rows="2" class="w-full p-3 rounded-xl border border-border bg-transparent focus:ring-2 focus:ring-accent outline-none font-sans text-sm resize-none" placeholder="Mô tả..."></textarea>
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
  </div>
</template>
