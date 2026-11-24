<script setup lang="ts">
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight, Search } from 'lucide-vue-next'
import { useEffortStore } from '@/stores/effort'
import MonthSummary from '@/components/calendar/MonthSummary.vue'
import CalendarFilters from '@/components/calendar/CalendarFilters.vue'
import CalendarGrid from '@/components/calendar/CalendarGrid.vue'
import DayDetailModal from '@/components/calendar/DayDetailModal.vue'
import { filterTasks, matchesKeyword } from '@/components/calendar/calendar'

const store = useEffortStore()
const person = ref('all')
const site = ref('all')
const keyword = ref('')
const openDate = ref<string | null>(null)

// ── 검색 ──────────────────────────────────────────────
const searching = computed(() => keyword.value.trim() !== '')
/** 검색어에 맞는 CSR (사이트 필터 반영) */
const matchedCsrs = computed(() =>
  searching.value
    ? store.csrs.filter((c) => (site.value === 'all' || c.site === site.value) && matchesKeyword(c, keyword.value))
    : [],
)
/** 담당자·사이트·검색어에 맞는 전체 작업 (모든 달) */
const matchedTasks = computed(() =>
  searching.value ? filterTasks(store.tasks, person.value, site.value, store.csrMap, keyword.value) : [],
)
const monthHits = computed(() => matchedTasks.value.filter((a) => a.date.startsWith(store.month)))
const monthHours = computed(() => monthHits.value.reduce((s, a) => s + a.hours, 0))
/** 이번 달에 결과가 없을 때 이동할 달: 이번 달 이후 가장 가까운 달, 없으면 이전 달 중 가장 가까운 달 */
const nearestMonth = computed(() => {
  if (!searching.value || monthHits.value.length) return null
  const months = [...new Set(matchedTasks.value.map((a) => a.date.slice(0, 7)))].sort()
  return months.find((m) => m > store.month) ?? months.filter((m) => m < store.month).pop() ?? null
})
/** 모달에서 이전날/다음날로 이동. 다른 달로 넘어가면 캘린더도 그 달로 옮긴다 (작업 목록이 달 기준이라) */
function navigateDay(date: string) {
  if (!date.startsWith(store.month)) store.month = date.slice(0, 7)
  openDate.value = date
}

const nearestLabel = computed(() => (nearestMonth.value ? dayjs(`${nearestMonth.value}-01`).format('YYYY년 M월') : ''))

const monthLabel = computed(() => store.monthStart.format('YYYY년 M월'))
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <button type="button" class="btn w-11 px-0" aria-label="이전 달" @click="store.shiftMonth(-1)">
      <ChevronLeft :size="18" aria-hidden="true" />
    </button>
    <h1 class="m-0 text-[26px] font-bold tracking-tight">{{ monthLabel }}</h1>
    <button type="button" class="btn w-11 px-0" aria-label="다음 달" @click="store.shiftMonth(1)">
      <ChevronRight :size="18" aria-hidden="true" />
    </button>
    <button type="button" class="btn px-3.5" @click="store.goToday()">오늘</button>
    <span class="ml-2 text-[13px] text-muted">
      근무일 {{ store.workdays }}일 · 인당 가용 {{ store.capacity }}h (1MD = {{ store.settings?.hoursPerDay }}h)
    </span>
  </div>

  <MonthSummary />
  <CalendarFilters v-model:person="person" v-model:site="site" v-model:keyword="keyword" />

  <div
    v-if="searching"
    role="status"
    class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-info-50 px-3.5 py-2 text-[13px] text-info-700"
  >
    <Search :size="14" aria-hidden="true" />
    <span>
      <strong>'{{ keyword.trim() }}'</strong> 검색 결과: CSR {{ matchedCsrs.length }}건
      <template v-if="monthHits.length"> · 이번 달 작업 {{ monthHits.length }}건 ({{ monthHours.toFixed(1) }}h)</template>
      <template v-else> · 이번 달에는 배정된 작업이 없습니다</template>
    </span>
    <button v-if="nearestMonth" type="button" class="font-semibold underline underline-offset-2" @click="store.month = nearestMonth">
      {{ nearestLabel }}로 이동
    </button>
    <button type="button" class="ml-auto text-xs font-semibold hover:underline" @click="keyword = ''">검색 해제</button>
  </div>

  <CalendarGrid :person="person" :site="site" :keyword="keyword" @open="openDate = $event" />

  <p class="m-0 text-xs text-muted">
    칸에는 최대 3건만 보이고, 나머지는 칸을 눌러 상세 모달에서 확인합니다. 같은 CSR·작업이 하루에 여러 건이면 한 줄로 합쳐 ×건수로 표시합니다.
  </p>

  <DayDetailModal :date="openDate" :site="site" :keyword="keyword" @close="openDate = null" @navigate="navigateDay" />
</template>
