<script setup lang="ts">
import { computed, ref } from 'vue'
import { Lock, PencilLine } from 'lucide-vue-next'
import { useEffortStore } from '@/stores/effort'
import TaskTag from '@/components/common/TaskTag.vue'

const person = defineModel<string>('person', { required: true })
const site = defineModel<string>('site', { required: true })

const store = useEffortStore()
const personOptions = computed(() => [{ value: 'all', label: '전체' }, ...store.members.map((m) => ({ value: m.id, label: m.name }))])
const siteOptions = [
  { value: 'all', label: '전체' },
  { value: '엔솔', label: '엔솔' },
  { value: '화학', label: '화학' },
]

const keyword = ref('');

const tabClass = (on: boolean) =>
  on ? 'border-ink bg-ink font-semibold text-white' : 'border-[#d5d8de] bg-white font-medium text-ink-2 hover:bg-subtle'
</script>

<template>
  <div class="card flex flex-wrap items-center gap-4 px-3.5 py-2.5">
    <div role="group" aria-label="담당자 필터" class="flex items-center gap-1">
      <span class="mr-1 text-[13px] text-muted">담당자</span>
      <button
        v-for="o in personOptions"
        :key="o.value"
        type="button"
        class="min-h-9 rounded-lg border px-3 text-[13px]"
        :class="tabClass(person === o.value)"
        :aria-pressed="person === o.value"
        @click="person = o.value"
      >
        {{ o.label }}
      </button>
    </div>
    <div class="h-7 w-px bg-line" />
    <div role="group" aria-label="사이트 필터" class="flex items-center gap-1">
      <span class="mr-1 text-[13px] text-muted">사이트</span>
      <button
        v-for="o in siteOptions"
        :key="o.value"
        type="button"
        class="min-h-9 rounded-lg border px-3 text-[13px]"
        :class="tabClass(site === o.value)"
        :aria-pressed="site === o.value"
        @click="site = o.value"
      >
        {{ o.label }}
      </button>
    </div>

    <label class="flex items-center gap-2 text-[13px] text-muted">
      검색
      <input v-model="keyword" type="search" placeholder="CSR번호 · CSR명" class="h-10 w-[260px] rounded-lg border border-[#d5d8de] bg-white px-3 text-[13px]" />
    </label>

    <div class="ml-auto flex flex-wrap items-center gap-3 text-xs text-ink-2">
      <span class="inline-flex items-center gap-1.5"><TaskTag task="DEV" /></span>
      <span class="inline-flex items-center gap-1.5"><TaskTag task="UAT" />사용자테스트</span>
      <span class="inline-flex items-center gap-1.5"><TaskTag task="TPT" />제3자테스트</span>
      <span class="inline-flex items-center gap-1"><Lock :size="12" aria-hidden="true" />일정확정</span>
      <span class="inline-flex items-center gap-1"><PencilLine :size="12" class="text-field-ink" aria-hidden="true" />직접 고친 작업</span>
      <span class="inline-flex items-center gap-1"><span class="size-2.5 rounded-[3px] bg-danger" />8h 초과</span>
    </div>
  </div>
</template>
