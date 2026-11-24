<script setup lang="ts">
import { computed } from 'vue'
import dayjs from 'dayjs'
import { useEffortStore } from '@/stores/effort'
import { WEEKDAYS } from '@/utils/format'
import { filterTasks } from './calendar'
import CalendarCell from './CalendarCell.vue'

const props = defineProps<{ person: string; site: string; keyword: string }>()
const emit = defineEmits<{ open: [date: string] }>()

const store = useEffortStore()
const today = dayjs().format('YYYY-MM-DD')

const cells = computed(() => {
  const start = store.monthStart.subtract(store.monthStart.day(), 'day')
  const end = store.monthEnd.add(6 - store.monthEnd.day(), 'day')
  const list = []
  for (let d = start; !d.isAfter(end, 'day'); d = d.add(1, 'day')) {
    const date = d.format('YYYY-MM-DD')
    const inMonth = d.month() === store.monthStart.month()
    list.push({
      date,
      day: d.date(),
      weekday: d.day(),
      inMonth,
      holiday: store.holidayMap.get(date)?.name ?? null,
      isToday: date === today,
      items: inMonth ? filterTasks(store.tasksByDate.get(date) ?? [], props.person, props.site, store.csrMap, props.keyword) : [],
    })
  }
  return list
})
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-line bg-white">
    <div class="min-w-[980px]">
      <div class="grid grid-cols-7 border-b border-line bg-subtle">
        <div
          v-for="(w, i) in WEEKDAYS"
          :key="w"
          class="px-3 py-2.5 text-[13px] font-semibold"
          :class="i === 0 ? 'text-sun' : i === 6 ? 'text-sat' : 'text-ink-2'"
        >
          {{ w }}
        </div>
      </div>
      <div class="grid grid-cols-7">
        <template v-for="c in cells" :key="c.date">
          <CalendarCell v-if="c.inMonth" v-bind="c" @open="emit('open', c.date)" />
          <div v-else class="min-h-[140px] border-r border-b border-line-soft bg-subtle px-3 py-2.5 text-[13px] text-[#9aa0a8]">
            {{ c.day }}
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
