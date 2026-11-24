<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import { useEffortStore } from '@/stores/effort'
import BaseModal from '@/components/common/BaseModal.vue'
import { fmtH } from '@/utils/format'

const store = useEffortStore()
const s = computed(() => store.settings!)

/** 개발 시간 = 총 MD × 하루시간 − 사테 − 3테 − 검토자 */
const devHours = (md: number) => Math.max(0, md * s.value.hoursPerDay - s.value.uatHours - s.value.tptHours - s.value.reviewHours)

const mdRows = computed(() => [
  { key: 'new' as const, label: '신규' },
  { key: 'common' as const, label: '공통' },
  { key: 'modify' as const, label: '수정' },
  { key: 'endpoint' as const, label: '엔드포인트 변경' },
])

const timeFields = [
  { key: 'hoursPerDay' as const, label: '하루 근무시간 (h)', step: 0.5 },
  { key: 'uatHours' as const, label: '사용자테스트 (h / 건)', step: 0.1 },
  { key: 'tptHours' as const, label: '제3자테스트 (h / 건)', step: 0.1 },
  { key: 'reviewHours' as const, label: 'CSR 검토자 공수 (h / 건, 총 공수에서 제외)', step: 0.1 },
]

const yearHolidays = computed(() => store.holidays.filter((h) => h.date.startsWith(String(s.value.year))))

// ── 휴무일 추가 ───────────────────────────────────────
const adding = ref(false)
const draft = reactive({ date: '', name: '', note: '' })
const draftError = computed(() =>
  !draft.date ? '날짜를 입력하세요.' : store.holidayMap.has(draft.date) ? '이미 등록된 날짜입니다.' : !draft.name ? '명칭을 입력하세요.' : '',
)
function openAdd() {
  Object.assign(draft, { date: '', name: '', note: '' })
  adding.value = true
}
async function submitAdd() {
  if (draftError.value) return
  await store.addHoliday({ ...draft })
  adding.value = false
}

const saved = ref(false)
async function save() {
  if (!(await store.saveSettings())) return
  saved.value = true
  setTimeout(() => (saved.value = false), 2000)
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <h1 class="m-0 text-[26px] font-bold">설정 · 공휴일</h1>
    <span class="text-muted">값을 바꾸면 확정되지 않은 CSR의 일정이 다시 계산됩니다.</span>
    <span v-if="saved" class="ml-auto text-xs text-ok-700">저장했습니다</span>
    <button type="button" class="btn btn-primary" :class="{ 'ml-auto': !saved }" @click="save">저장</button>
  </div>

  <div class="flex flex-wrap items-start gap-5">
    <div class="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
      <section class="card flex flex-col gap-3.5 px-[22px] py-5">
        <h2 class="m-0 text-base font-bold">개발자와 배분 비율</h2>
        <div class="grid grid-cols-[minmax(0,1fr)_120px_140px] items-center gap-2.5 text-xs font-semibold text-muted">
          <span>이름</span><span>비율</span><span>색상</span>
        </div>
        <div v-for="(m, i) in store.members" :key="m.id" class="grid grid-cols-[minmax(0,1fr)_120px_140px] items-center gap-2.5">
          <input v-model="m.name" :aria-label="`개발자${i + 1} 이름`" class="field h-10 px-3 text-sm" />
          <input v-model.number="m.ratio" type="number" min="0" step="0.5" :aria-label="`개발자${i + 1} 비율`" class="field h-10 px-3 text-right font-mono text-sm" />
          <label class="flex items-center gap-2 text-[13px] text-ink-2">
            <input v-model="m.color" type="color" :aria-label="`개발자${i + 1} 색상`" class="size-8 cursor-pointer rounded border border-line bg-white p-0.5" />
            {{ m.color.toUpperCase() }}
          </label>
        </div>
        <p class="m-0 text-xs text-muted">
          누적 공수가 이 비율({{ store.members.map((m) => m.ratio).join(' : ') }})에 가장 가깝도록 개발자를 자동 배정합니다.
          제3자테스트는 항상 개발자가 아닌 사람에게 배정됩니다.
        </p>
      </section>

      <section class="card flex flex-col gap-3.5 px-[22px] py-5">
        <h2 class="m-0 text-base font-bold">CSR 유형별 공수</h2>
        <div class="grid grid-cols-[minmax(0,1fr)_140px_160px] items-center gap-2.5 text-xs font-semibold text-muted">
          <span>유형</span><span class="text-right">1건 총 공수 (MD)</span><span class="text-right">개발 시간 (자동)</span>
        </div>
        <div v-for="row in mdRows" :key="row.key" class="grid grid-cols-[minmax(0,1fr)_140px_160px] items-center gap-2.5 border-t border-line-soft py-1">
          <span>{{ row.label }}</span>
          <input v-model.number="s.md[row.key]" type="number" min="0" step="0.1" :aria-label="`${row.label} MD`" class="field h-10 px-3 text-right font-mono text-sm" />
          <span class="text-right font-mono text-ink-2">{{ fmtH(devHours(s.md[row.key])) }}h</span>
        </div>
        <p class="m-0 text-xs text-muted">
          개발 시간 = 총 MD × {{ s.hoursPerDay }} − 사용자테스트 − 제3자테스트 − 검토자. 직접지정 유형은 CSR 목록에서 MD를 직접 입력합니다.
        </p>
      </section>

      <section class="card flex flex-col gap-3.5 px-[22px] py-5">
        <h2 class="m-0 text-base font-bold">시간 기준</h2>
        <div class="grid grid-cols-1 gap-x-5 gap-y-3.5 sm:grid-cols-2">
          <label v-for="f in timeFields" :key="f.key" class="flex flex-col gap-1.5 text-[13px] text-ink-2">
            {{ f.label }}
            <input v-model.number="s[f.key]" type="number" min="0" :step="f.step" class="field h-10 px-3 font-mono text-sm" />
          </label>
        </div>
      </section>
    </div>

    <section class="card flex min-w-0 flex-[1_1_380px] flex-col gap-3 px-[22px] py-5">
      <div class="flex items-center gap-2.5">
        <h2 class="m-0 text-base font-bold">{{ s.year }} 공휴일</h2>
        <span class="text-[13px] text-muted">{{ yearHolidays.length }}일</span>
        <button type="button" class="btn ml-auto h-10 px-3.5 text-[13px]" @click="openAdd">
          <Plus :size="15" aria-hidden="true" />휴무일 추가
        </button>
      </div>
      <p class="m-0 text-xs text-muted">주말과 이 목록의 날짜는 배정에서 건너뜁니다. 회사 휴무일에 맞게 추가·삭제하세요.</p>
      <ul class="m-0 flex list-none flex-col p-0">
        <li
          v-for="h in yearHolidays"
          :key="h.date"
          class="grid min-h-11 grid-cols-[96px_minmax(0,1fr)_44px] items-center gap-2.5 border-t border-line-soft"
        >
          <span class="font-mono text-[13px]">{{ h.date.slice(5).replace('-', '/') }}</span>
          <span class="flex flex-col text-[13px] leading-[18px]">
            <span>{{ h.name }}</span>
            <span v-if="h.note" class="text-xs text-muted">{{ h.note }}</span>
          </span>
          <button
            type="button"
            class="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-danger-50 hover:text-danger"
            :aria-label="`${h.name} 삭제`"
            @click="store.removeHoliday(h.date)"
          >
            <Trash2 :size="16" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </section>
  </div>

  <BaseModal :open="adding" title="휴무일 추가" width="max-w-[440px]" @close="adding = false">
    <form id="holiday-form" class="flex flex-col gap-3.5 px-[22px] py-5" @submit.prevent="submitAdd">
      <label class="flex flex-col gap-1.5 text-[13px] text-ink-2">
        날짜
        <input v-model="draft.date" type="date" required class="field h-10 px-3 text-sm" />
      </label>
      <label class="flex flex-col gap-1.5 text-[13px] text-ink-2">
        명칭
        <input v-model.trim="draft.name" required placeholder="예: 창립기념일" class="field h-10 px-3 text-sm" />
      </label>
      <label class="flex flex-col gap-1.5 text-[13px] text-ink-2">
        비고 (선택)
        <input v-model.trim="draft.note" class="field h-10 px-3 text-sm" />
      </label>
      <p v-if="draft.date && draftError" class="m-0 text-xs text-danger">{{ draftError }}</p>
    </form>
    <template #footer>
      <button type="button" class="btn ml-auto h-10" @click="adding = false">취소</button>
      <button type="submit" form="holiday-form" class="btn btn-primary h-10" :disabled="!!draftError">추가</button>
    </template>
  </BaseModal>
</template>
