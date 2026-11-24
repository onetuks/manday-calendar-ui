<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { ChevronLeft, ChevronRight, Gauge, Lock, Plus, Trash2 } from 'lucide-vue-next'
import { useEffortStore } from '@/stores/effort'
import BaseModal from '@/components/common/BaseModal.vue'
import TaskTag from '@/components/common/TaskTag.vue'
import type { MemberId, Task, TaskType } from '@/types'
import { TASK_LABEL, WEEKDAYS, fmtH, shortTitle } from '@/utils/format'
import { isOver, matchesKeyword } from './calendar'
import CsrLabel from './CsrLabel.vue'

/**
 * site: 캘린더 사이트 필터 ('all' | '엔솔' | '화학') — 그 사이트 작업만 보여 준다
 * keyword: 캘린더 검색어 — CSR번호·CSR명에 들어 있는 작업만 보여 준다
 */
const props = withDefaults(defineProps<{ date: string | null; site?: string; keyword?: string }>(), {
  site: 'all',
  keyword: '',
})
/** navigate: 이전날/다음날로 이동할 날짜 (YYYY-MM-DD) */
const emit = defineEmits<{ close: []; navigate: [date: string] }>()

const store = useEffortStore()
const hpd = computed(() => store.settings?.hoursPerDay ?? 8)
const isOffDay = computed(() => {
  if (!props.date) return false
  const d = dayjs(props.date)
  return d.day() === 0 || d.day() === 6 || store.isHoliday(props.date)
})
const all = computed(() => (props.date ? (store.tasksByDate.get(props.date) ?? []) : []))
const bySite = computed(() => props.site !== 'all')
const byKeyword = computed(() => props.keyword.trim() !== '')
const filtered = computed(() => bySite.value || byKeyword.value)
/** 사이트·검색어 필터에 맞는 작업 */
const shown = computed(() =>
  all.value.filter((a) => {
    const csr = store.csrMap.get(a.csrId)
    return (!bySite.value || csr?.site === props.site) && matchesKeyword(csr, props.keyword)
  }),
)
/** 부제·빈 목록 문구에 쓰는 필터 이름 (예: "엔솔 · '001170'") */
const filterLabel = computed(() =>
  [bySite.value ? props.site : '', byKeyword.value ? `'${props.keyword.trim()}'` : ''].filter(Boolean).join(' · '),
)

const title = computed(() => {
  if (!props.date) return ''
  const d = dayjs(props.date)
  const holiday = store.holidayMap.get(props.date)?.name
  return `${d.month() + 1}월 ${d.date()}일 (${WEEKDAYS[d.day()]})${holiday ? ` · ${holiday}` : ''}`
})
const sum = (list: Task[]) => list.reduce((s, a) => s + a.hours, 0)
const subtitle = computed(() =>
  filtered.value
    ? `${filterLabel.value} ${fmtH(sum(shown.value))}h · ${shown.value.length}건 (전체 ${fmtH(sum(all.value))}h · ${all.value.length}건)`
    : `총 ${fmtH(sum(all.value))}h · ${all.value.length}건`,
)

const groups = computed(() =>
  store.members.map((m) => {
    const items = shown.value
      .filter((a) => a.memberId === m.id)
      .map((a) => ({ log: a, csr: store.csrMap.get(a.csrId) }))
    // 상한은 사이트와 상관없이 한 사람의 하루 전체 시간이므로 합계·초과 판정은 필터 전 작업으로 한다
    const total = sum(all.value.filter((a) => a.memberId === m.id))
    const hidden = total - items.reduce((s, it) => s + it.log.hours, 0)
    const cap = props.date ? store.capOf(m.id, props.date) : hpd.value
    const custom = props.date ? store.customCapOf(m.id, props.date) : undefined
    return {
      member: m,
      items,
      total,
      cap,
      custom,
      hidden: hidden > 0.005 ? hidden : 0,
      over: isOver(total, cap),
      pct: cap > 0 ? Math.min(100, (total / cap) * 100) : total > 0 ? 100 : 0,
    }
  }),
)

// ── 시간 직접 수정 ────────────────────────────────────
/** 입력 중인 값 (log id → 문자열) */
const drafts = reactive<Record<number, string>>({})
watch(
  () => props.date,
  () => Object.keys(drafts).forEach((k) => delete drafts[Number(k)]),
)

function draftOf(log: Task) {
  return log.id != null && drafts[log.id] !== undefined ? drafts[log.id] : String(log.hours)
}

async function commitHours(log: Task) {
  if (log.id == null || drafts[log.id] === undefined) return
  const value = Number(drafts[log.id])
  delete drafts[log.id]
  if (!Number.isFinite(value) || value === log.hours) return
  if (value <= 0) {
    await store.deleteTask(log)
    return
  }
  await store.updateTask(log, { hours: Math.round(value * 100) / 100 })
}

// ── 하루 상한 ─────────────────────────────────────────
/** 상한 입력 중인 값 (멤버 id → 입력 문자열) */
const capDrafts = reactive<Record<string, string>>({})
watch(
  () => props.date,
  () => Object.keys(capDrafts).forEach((k) => delete capDrafts[k]),
)

/** 키인한 값으로 그날 상한을 정한다. 칸을 비우면 기본 상한으로 돌아간다. */
async function commitCap(memberId: MemberId) {
  if (!props.date || capDrafts[memberId] === undefined) return
  const raw = capDrafts[memberId].trim()
  delete capDrafts[memberId]
  const current = store.customCapOf(memberId, props.date)
  if (raw === '') {
    if (current) await store.clearDayCapacity(props.date, memberId)
    return
  }
  const hours = Math.round(Number(raw) * 10) / 10
  if (!Number.isFinite(hours) || hours < 0 || hours > 24) return
  if (current?.hours === hours) return
  await store.setDayCapacity({ date: props.date, memberId, hours, note: '' })
}

// ── 날짜 옮기기 ───────────────────────────────────────
const moved = ref<string | null>(null)
let movedTimer: ReturnType<typeof setTimeout> | undefined

async function changeDate(log: Task, date: string) {
  if (!date || date === log.date) return
  await store.updateTask(log, { date })
  if (store.error) return
  const d = dayjs(date)
  moved.value = `작업을 ${d.month() + 1}월 ${d.date()}일 (${WEEKDAYS[d.day()]})로 옮겼습니다.`
  clearTimeout(movedTimer)
  movedTimer = setTimeout(() => (moved.value = null), 4000)
}

// ── 작업 추가 ─────────────────────────────────────────
const addingFor = ref<MemberId | null>(null)
const draft = reactive<{ csrId: number | null; type: TaskType; hours: number }>({ csrId: null, type: 'DEV', hours: 1 })
const editableCsrs = computed(() =>
  store.csrs.filter(
    (c) => !c.confirmed && c.id > 0 && (c.csrNo || c.title) && (!bySite.value || c.site === props.site),
  ),
)

function openAdd(memberId: MemberId) {
  addingFor.value = memberId
  Object.assign(draft, { csrId: null, type: 'DEV', hours: 1 })
}

async function submitAdd() {
  if (!props.date || !addingFor.value || draft.csrId == null || !(draft.hours > 0)) return
  const ok = await store.addTask({
    csrId: draft.csrId,
    type: draft.type,
    date: props.date,
    memberId: addingFor.value,
    hours: Math.round(draft.hours * 100) / 100,
  })
  if (ok) addingFor.value = null
}

function close() {
  addingFor.value = null
  emit('close')
}

// ── 이전날 / 다음날 ───────────────────────────────────
const shiftLabel = (n: number) => {
  if (!props.date) return ''
  const d = dayjs(props.date).add(n, 'day')
  return `${d.month() + 1}월 ${d.date()}일 (${WEEKDAYS[d.day()]})`
}

function go(n: number) {
  if (!props.date) return
  addingFor.value = null
  emit('navigate', dayjs(props.date).add(n, 'day').format('YYYY-MM-DD'))
}

/** ← / → 키로 이동. 입력칸·선택칸에 포커스가 있을 때는 그 칸의 커서 이동을 방해하지 않도록 무시한다 */
function onKeydown(e: KeyboardEvent) {
  if (!props.date || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
  const el = e.target as HTMLElement | null
  if (el && (el.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName))) return
  e.preventDefault()
  go(e.key === 'ArrowLeft' ? -1 : 1)
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <BaseModal :open="!!date" :title="title" :subtitle="subtitle" width="max-w-[920px]" @close="close">
    <template #actions>
      <button
        type="button"
        class="flex size-11 items-center justify-center rounded-[10px] border border-line hover:bg-subtle"
        :aria-label="`이전날 ${shiftLabel(-1)}`"
        :title="`이전날 ${shiftLabel(-1)} (←)`"
        @click="go(-1)"
      >
        <ChevronLeft :size="18" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="flex size-11 items-center justify-center rounded-[10px] border border-line hover:bg-subtle"
        :aria-label="`다음날 ${shiftLabel(1)}`"
        :title="`다음날 ${shiftLabel(1)} (→)`"
        @click="go(1)"
      >
        <ChevronRight :size="18" aria-hidden="true" />
      </button>
    </template>
    <p v-if="moved" role="status" class="mx-[22px] mt-3 rounded-lg bg-info-50 px-3 py-2 text-[13px] text-info-700">{{ moved }}</p>
    <div class="flex max-h-[62vh] flex-col gap-[18px] overflow-y-auto px-[22px] pt-2 pb-5">
      <section v-for="g in groups" :key="g.member.id" class="flex flex-col gap-2 pt-3">
        <div class="flex items-center gap-2.5">
          <span class="size-2.5 rounded-[3px]" :style="{ background: g.member.color }" />
          <span class="font-semibold">{{ g.member.name }}</span>
          <span class="font-mono text-[13px] font-semibold" :class="g.over ? 'text-danger' : 'text-ink-2'">
            {{ fmtH(g.total) }}h / {{ fmtH(g.cap) }}h
          </span>
          <div class="h-1.5 max-w-[220px] flex-1 overflow-hidden rounded-full bg-line-soft">
            <div class="h-full" :style="{ width: `${g.pct}%`, background: g.over ? 'var(--color-danger)' : g.member.color }" />
          </div>
          <span v-if="g.over" class="pill bg-danger-50 text-danger">상한 초과</span>
          <button
            type="button"
            class="ml-auto inline-flex h-9 items-center gap-1 rounded-lg border border-[#d5d8de] bg-white px-2.5 text-xs text-ink-2 hover:bg-subtle"
            @click="openAdd(g.member.id)"
          >
            <Plus :size="14" aria-hidden="true" />작업 추가
          </button>
        </div>

        <!-- 하루 상한: 비워 두면 기본(평일 하루 근무시간, 주말·공휴일 0h). 숫자를 키인하면 그날 그 시간이 상한 -->
        <div
          class="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-xs"
          :class="g.custom ? 'border border-dashed border-field-line bg-field/50' : 'bg-subtle'"
        >
          <Gauge :size="14" class="text-muted" aria-hidden="true" />
          <label class="flex items-center gap-1.5 text-ink-2">
            하루 상한
            <input
              type="number"
              inputmode="decimal"
              min="0"
              max="24"
              step="0.1"
              class="field h-8 w-[72px] px-2 text-right font-mono text-[13px]"
              :placeholder="String(isOffDay ? 0 : hpd)"
              :aria-label="`${g.member.name} 하루 상한 MH`"
              :value="capDrafts[g.member.id] ?? (g.custom ? String(g.custom.hours) : '')"
              @input="capDrafts[g.member.id] = ($event.target as HTMLInputElement).value"
              @change="commitCap(g.member.id)"
              @keydown.enter="($event.target as HTMLInputElement).blur()"
            />
            MH
          </label>
          <span class="ml-auto text-muted">
            <template v-if="g.custom">지정함 · 비우면 기본 {{ isOffDay ? 0 : hpd }}MH</template>
            <template v-else>기본 {{ isOffDay ? 0 : hpd }}MH{{ isOffDay ? ' (주말·공휴일)' : '' }}</template>
          </span>
        </div>

        <p v-if="!g.items.length && addingFor !== g.member.id" class="rounded-lg bg-subtle px-3 py-2.5 text-[13px] text-muted">
          {{ filtered ? `${filterLabel}에 맞는 작업이 없습니다.` : '배정된 작업이 없습니다.' }}
        </p>
        <p v-if="g.hidden" class="m-0 text-xs text-muted">
          필터에 맞지 않는 작업 {{ fmtH(g.hidden) }}h는 숨김 (합계·상한에는 포함)
        </p>

        <div
          v-for="it in g.items"
          :key="it.log.id ?? `${it.log.csrId}-${it.log.type}`"
          class="grid grid-cols-[84px_minmax(0,1fr)_96px_136px_92px_36px] items-center gap-2 rounded-lg border px-3 py-2 text-[13px]"
          :class="it.log.manual ? 'border-field-line bg-field/40' : 'border-line-soft'"
        >
          <!-- 확정 건은 읽기 전용 -->
          <template v-if="it.csr?.confirmed">
            <TaskTag :task="it.log.type" size="md" class="justify-self-start" />
            <CsrLabel :csr="it.csr" />
            <span class="px-2 text-ink-2">{{ store.memberMap.get(it.log.memberId)?.name }}</span>
            <span class="px-2 font-mono text-xs text-ink-2">{{ it.log.date }}</span>
            <span class="pr-2 text-right font-mono font-semibold">{{ fmtH(it.log.hours) }}h</span>
            <Lock :size="14" class="justify-self-center text-muted" role="img" aria-label="일정확정" />
          </template>

          <!-- 나머지는 유형·담당자·날짜·시간 직접 수정 -->
          <template v-else>
            <select
              class="field h-9 px-1.5 text-[13px]"
              :aria-label="`${it.csr?.csrNo ?? ''} 작업 유형`"
              :value="it.log.type"
              @change="store.updateTask(it.log, { type: ($event.target as HTMLSelectElement).value as TaskType })"
            >
              <option v-for="(label, key) in TASK_LABEL" :key="key" :value="key">{{ label }}</option>
            </select>
            <CsrLabel :csr="it.csr" />
            <select
              class="field h-9 px-1.5 text-[13px]"
              :aria-label="`${it.csr?.csrNo ?? ''} ${TASK_LABEL[it.log.type]} 담당자`"
              :value="it.log.memberId"
              @change="store.updateTask(it.log, { memberId: ($event.target as HTMLSelectElement).value })"
            >
              <option v-for="m in store.members" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
            <input
              type="date"
              required
              class="field h-9 px-1.5 text-xs"
              :aria-label="`${it.csr?.csrNo ?? ''} ${TASK_LABEL[it.log.type]} 날짜`"
              :value="it.log.date"
              @change="changeDate(it.log, ($event.target as HTMLInputElement).value)"
            />
            <label class="flex items-center justify-end gap-1">
              <input
                type="number"
                min="0"
                max="24"
                step="0.1"
                class="field h-9 w-[64px] px-2 text-right font-mono text-[13px]"
                :aria-label="`${it.csr?.csrNo ?? ''} ${TASK_LABEL[it.log.type]} 시간`"
                :value="draftOf(it.log)"
                @input="drafts[it.log.id!] = ($event.target as HTMLInputElement).value"
                @change="commitHours(it.log)"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
              />
              <span class="text-xs text-muted">h</span>
            </label>
            <button
              type="button"
              class="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-danger-50 hover:text-danger"
              :aria-label="`${it.csr?.csrNo ?? ''} ${TASK_LABEL[it.log.type]} 작업 삭제`"
              @click="store.deleteTask(it.log)"
            >
              <Trash2 :size="15" aria-hidden="true" />
            </button>
          </template>
        </div>

        <!-- 공수 추가 -->
        <form
          v-if="addingFor === g.member.id"
          class="grid grid-cols-[minmax(0,1fr)_96px_96px_auto] items-end gap-2.5 rounded-lg border border-dashed border-field-line bg-field/40 px-3 py-2.5"
          @submit.prevent="submitAdd"
        >
          <label class="flex min-w-0 flex-col gap-1 text-xs text-muted">
            CSR
            <select v-model="draft.csrId" required class="field px-1.5">
              <option :value="null" disabled>선택</option>
              <option v-for="c in editableCsrs" :key="c.id" :value="c.id">{{ c.csrNo }} · {{ shortTitle(c.title) }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-1 text-xs text-muted">
            유형
            <select v-model="draft.type" class="field px-1.5">
              <option v-for="(label, key) in TASK_LABEL" :key="key" :value="key">{{ label }}</option>
            </select>
          </label>
          <label class="flex flex-col gap-1 text-xs text-muted">
            시간(h)
            <input v-model.number="draft.hours" type="number" min="0.1" max="24" step="0.1" required class="field text-right font-mono" />
          </label>
          <div class="flex gap-1.5">
            <button type="button" class="btn h-[34px] px-3 text-[13px]" @click="addingFor = null">취소</button>
            <button type="submit" class="btn btn-primary h-[34px] px-3 text-[13px]" :disabled="draft.csrId == null || store.busy">추가</button>
          </div>
        </form>
      </section>
    </div>

    <template #footer>
      <span class="text-xs leading-5 text-muted">
        하루 상한을 바꾸면 그날은 그 시간까지만 자동 배정됩니다. 작업을 고치거나 추가·삭제한 CSR은 <strong class="text-ink-2">수동 조정</strong>되어 자동 재배정에서 빠집니다.
        잠금 표시 CSR은 일정확정되어 고칠 수 없습니다.
      </span>
      <RouterLink to="/csrs" class="btn btn-primary ml-auto h-10 shrink-0 text-[13px]" @click="close">CSR 목록에서 보기</RouterLink>
    </template>
  </BaseModal>
</template>
