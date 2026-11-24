<script setup lang="ts">
import { computed } from 'vue'
import { Lock, PencilLine, Search, X } from 'lucide-vue-next'
import { useEffortStore } from '@/stores/effort'
import TaskTag from '@/components/common/TaskTag.vue'

const person = defineModel<string>('person', { required: true })
const site = defineModel<string>('site', { required: true })
/** 검색어 (CSR번호·CSR명) — 부모(CalendarView)와 v-model:keyword 로 연결 */
const keyword = defineModel<string>('keyword', { required: true })

const store = useEffortStore()
const personOptions = computed(() => [{ value: 'all', label: '전체' }, ...store.members.map((m) => ({ value: m.id, label: m.name }))])
const siteOptions = [
  { value: 'all', label: '전체' },
  { value: '엔솔', label: '엔솔' },
  { value: '화학', label: '화학' },
]

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

    <div class="h-7 w-px bg-line" />
    <div role="search" class="relative flex items-center">
      <Search :size="15" class="pointer-events-none absolute left-2.5 text-muted" aria-hidden="true" />
      <input
        v-model="keyword"
        type="text"
        placeholder="CSR번호 · CSR명 검색"
        aria-label="CSR번호 또는 CSR명 검색"
        class="h-9 w-[260px] rounded-lg border bg-white pr-8 pl-8 text-[13px]"
        :class="keyword.trim() ? 'border-ink' : 'border-[#d5d8de]'"
        @keydown.esc="keyword = ''"
      />
      <button
        v-if="keyword"
        type="button"
        class="absolute right-1 flex size-7 items-center justify-center rounded-md text-muted hover:bg-subtle hover:text-ink"
        aria-label="검색어 지우기"
        @click="keyword = ''"
      >
        <X :size="14" aria-hidden="true" />
      </button>
    </div>

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
