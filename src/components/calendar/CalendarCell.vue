<script setup lang="ts">
import { computed } from 'vue'
import { Gauge, Lock, PencilLine } from 'lucide-vue-next'
import type { Task } from '@/types'
import { useEffortStore } from '@/stores/effort'
import TaskTag from '@/components/common/TaskTag.vue'
import { fmtH, shortTitle } from '@/utils/format'
import { MAX_VISIBLE, isOver } from './calendar'

const props = defineProps<{
  date: string
  day: number
  weekday: number
  holiday: string | null
  isToday: boolean
  inMonth?: boolean
  items: Task[]
}>()
defineEmits<{ open: [] }>()

const store = useEffortStore()

const totals = computed(() =>
  store.members
    .map((m) => ({
      member: m,
      hours: props.items.filter((a) => a.memberId === m.id).reduce((s, a) => s + a.hours, 0),
      cap: store.capOf(m.id, props.date),
    }))
    .filter((t) => t.hours > 0),
)

/** 그날 하루 상한을 따로 지정한 담당자 */
const customCaps = computed(() =>
  store.members
    .map((m) => ({ member: m, cap: store.customCapOf(m.id, props.date) }))
    .filter((c) => c.cap)
    .map((c) => ({
      key: c.member.id,
      label: `${c.member.name.slice(0, 1)} ${fmtH(c.cap!.hours)}h`,
      title: `${c.member.name} 하루 상한 ${fmtH(c.cap!.hours)}h${c.cap!.note ? ` (${c.cap!.note})` : ''}`,
    })),
)

// 담당자 순서 → 입력 순서로 정렬해서 상위 3건만
const sorted = computed(() => {
  const order = new Map(store.members.map((m, i) => [m.id, i]))
  return [...props.items].sort((a, b) => (order.get(a.memberId) ?? 0) - (order.get(b.memberId) ?? 0))
})
const visible = computed(() => sorted.value.slice(0, MAX_VISIBLE))
const hidden = computed(() => Math.max(0, props.items.length - MAX_VISIBLE))

const off = computed(() => props.weekday === 0 || props.weekday === 6 || !!props.holiday)
const dateColor = computed(() =>
  props.weekday === 0 ? 'text-sun' : props.weekday === 6 || props.holiday ? 'text-sat' : 'text-ink',
)
const aria = computed(
  () => `${props.date.slice(5, 7)}월 ${props.day}일${props.holiday ? ` ${props.holiday}` : ''} 상세 보기, ${props.items.length}건`,
)
</script>

<template>
  <button
    type="button"
    class="flex min-h-[140px] min-w-0 flex-col items-start border-r border-b border-line-soft px-3 py-2.5 text-left hover:bg-info-50/40"
    :class="off ? 'bg-subtle' : 'bg-white'"
    :aria-label="aria"
    @click="$emit('open')"
  >
    <div class="flex w-full items-center gap-1.5">
      <span
        v-if="isToday"
        class="flex size-[26px] items-center justify-center rounded-full bg-ink text-[13px] font-bold text-white"
      >{{ day }}</span>
      <span v-else class="text-[13px] font-semibold" :class="dateColor">{{ day }}</span>
      <span v-if="holiday" class="truncate text-[11px] text-sat">{{ holiday }}</span>
      <span class="ml-auto flex gap-1">
        <span
          v-for="t in totals"
          :key="t.member.id"
          class="rounded px-1.5 font-mono text-[11px] font-semibold"
          :style="
            isOver(t.hours, t.cap)
              ? { background: 'var(--color-danger-50)', color: 'var(--color-danger)' }
              : { background: t.member.tint, color: t.member.color }
          "
        >
          {{ t.member.name.slice(0, 1) }} {{ fmtH(t.hours) }}
        </span>
      </span>
    </div>

    <div v-if="customCaps.length" class="mt-1 flex w-full flex-wrap gap-1">
      <span
        v-for="c in customCaps"
        :key="c.key"
        class="inline-flex items-center gap-0.5 rounded border border-dashed border-field-line bg-field px-1 text-[10px] leading-4 text-field-ink"
        :title="c.title"
      >
        <Gauge :size="10" aria-hidden="true" />{{ c.label }}
      </span>
    </div>
    <div class="mt-1.5 flex w-full flex-col gap-[3px]">
      <div
        v-for="(a, i) in visible"
        :key="i"
        class="flex min-w-0 items-center gap-[5px] text-xs leading-[18px]"
      >
        <span class="h-3.5 w-[3px] shrink-0 rounded-sm" :style="{ background: store.memberMap.get(a.memberId)?.color }" />
        <TaskTag :task="a.type" />
        <span class="shrink-0 font-mono text-[11px] text-ink-2">{{ fmtH(a.hours) }}</span>
        <span class="min-w-0 truncate text-ink-2">{{ shortTitle(store.csrMap.get(a.csrId)?.title ?? '') }}</span>
        <Lock v-if="store.csrMap.get(a.csrId)?.confirmed" :size="11" class="shrink-0 text-muted" aria-hidden="true" />
        <PencilLine v-else-if="a.manual" :size="11" class="shrink-0 text-field-ink" aria-hidden="true" />
      </div>
    </div>

    <span v-if="hidden" class="mt-auto pt-1 text-xs font-semibold text-info-700">+{{ hidden }}건 더보기</span>
  </button>
</template>
