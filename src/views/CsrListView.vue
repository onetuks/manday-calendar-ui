<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Lock, LockOpen, PencilLine, Plus, RotateCcw, Trash2 } from 'lucide-vue-next'
import { useEffortStore } from '@/stores/effort'
import BaseModal from '@/components/common/BaseModal.vue'
import type { Csr, CsrStatus } from '@/types'
import { OPS } from '@/types'
import { fmtH, fmtMD, fmtMd } from '@/utils/format'

const store = useEffortStore()

const COLS =
  'grid-cols-[64px_40px_84px_164px_minmax(260px,1fr)_88px_112px_72px_136px_100px_100px_136px_100px_136px_132px_88px_128px_72px_80px_96px_84px]'
const TYPES = ['신규', '공통', '수정', '엔드포인트', '직접지정'] as const

const STATUS_CLASS: Record<CsrStatus, string> = {
  확정: 'bg-line-soft text-ink-2',
  진행: 'bg-info-50 text-info-700',
  이월: 'bg-warn-50 text-warn-700',
  '입력 오류': 'bg-danger-50 text-danger',
}

// ── 필터 ──────────────────────────────────────────────
const keyword = ref('')
const siteFilter = ref<'all' | '엔솔' | '화학'>('all')
const statusFilter = ref<'all' | CsrStatus>('all')

const rows = computed(() =>
  store.csrs
    .map((c, i) => ({ csr: c, idx: i + 1, status: store.csrStatus(c), errors: store.csrErrors(c), result: store.resultMap.get(c.id) }))
    .filter(({ csr, status }) => {
      const k = keyword.value.trim().toLowerCase()
      if (k && !`${csr.csrNo} ${csr.title}`.toLowerCase().includes(k)) return false
      if (siteFilter.value !== 'all' && csr.site !== siteFilter.value) return false
      if (statusFilter.value !== 'all' && status !== statusFilter.value) return false
      return true
    }),
)

const counts = computed(() => {
  const res: Record<CsrStatus, number> = { 확정: 0, 진행: 0, 이월: 0, '입력 오류': 0 }
  for (const c of store.csrs) res[store.csrStatus(c)]++
  return res
})

// ── 입력 도우미 ────────────────────────────────────────
const has = (errors: string[], key: string) => errors.includes(key)
const dateInput = (e: Event) => (e.target as HTMLInputElement).value || null
const memberName = (id: string | null) => (id ? store.assigneeName(id) : '자동')

function devChipStyle(id: string | null | undefined) {
  const m = id && id !== OPS ? store.memberMap.get(id) : null
  return m ? { background: m.tint, color: m.color } : { background: 'var(--color-line-soft)', color: 'var(--color-ink-2)' }
}

// ── 일정확정 ──────────────────────────────────────────
const unlockTarget = ref<Csr | null>(null)

function toggleConfirm(c: Csr) {
  if (c.confirmed) unlockTarget.value = c // 해제는 한 번 더 확인
  else store.setConfirmed(c.id, true)
}
async function confirmUnlock() {
  if (unlockTarget.value) await store.setConfirmed(unlockTarget.value.id, false)
  unlockTarget.value = null
}

// ── 수동 조정 되돌리기 ─────────────────────────────────
const resetTarget = ref<Csr | null>(null)
async function confirmReset() {
  if (resetTarget.value) await store.resetSchedule(resetTarget.value.id)
  resetTarget.value = null
}

// ── 행 추가 / 저장 ─────────────────────────────────────
const tableEl = ref<HTMLElement | null>(null)
async function addRow() {
  keyword.value = ''
  statusFilter.value = 'all'
  siteFilter.value = 'all'
  const id = store.addCsr()
  await nextTick()
  tableEl.value?.querySelector<HTMLInputElement>(`[data-row="${id}"] input[data-first]`)?.focus()
}

const saving = ref(false)
const savedAt = ref<string | null>(null)
async function save() {
  saving.value = true
  const ok = await store.saveCsrs()
  saving.value = false
  if (ok) savedAt.value = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <h1 class="m-0 text-[26px] font-bold">CSR 목록</h1>
    <span class="text-muted">{{ store.monthStart.format('YYYY년 M월') }} · {{ store.csrs.length }}행 · {{ fmtMd(store.totalMd) }} MD</span>
    <div class="ml-auto flex flex-wrap items-center gap-2">
      <span v-if="savedAt" class="text-xs text-muted">{{ savedAt }} 저장됨 · 배정 다시 계산</span>
      <!-- <button type="button" class="btn" disabled title="준비 중">
        <ClipboardPaste :size="16" aria-hidden="true" />엑셀에서 붙여넣기
      </button> -->
      <button type="button" class="btn" :disabled="saving" @click="save">{{ saving ? '저장 중…' : '저장' }}</button>
      <button type="button" class="btn btn-primary" @click="addRow"><Plus :size="16" aria-hidden="true" />CSR 추가</button>
    </div>
  </div>

  <div class="card flex items-start gap-3 px-4 py-3">
    <Lock :size="18" class="mt-0.5 shrink-0 text-ink-2" aria-hidden="true" />
    <div class="flex flex-col gap-0.5 text-[13px] text-ink-2">
      <span>
        <strong class="text-ink">일정확정</strong>이 켜진 CSR은 결재가 끝난 건이라 수정할 수 없고, 배정된 일정도 고정됩니다.
        다른 CSR을 추가·수정해도 이 일정은 움직이지 않습니다.
      </span>
      <span class="text-muted">노란 칸은 입력 칸이고, 지정 칸을 비워 두면 자동 배정됩니다. 회색 영역은 계산 결과입니다.</span>
    </div>
  </div>

  <div class="flex flex-wrap items-center gap-3">
    <label class="flex items-center gap-2 text-[13px] text-muted">
      검색
      <input v-model="keyword" type="search" placeholder="CSR번호 · CSR명" class="h-10 w-[260px] rounded-lg border border-[#d5d8de] bg-white px-3 text-[13px]" />
    </label>
    <label class="flex items-center gap-2 text-[13px] text-muted">
      사이트
      <select v-model="siteFilter" class="h-10 rounded-lg border border-[#d5d8de] bg-white px-2.5 text-[13px]">
        <option value="all">전체</option>
        <option>엔솔</option>
        <option>화학</option>
      </select>
    </label>
    <label class="flex items-center gap-2 text-[13px] text-muted">
      상태
      <select v-model="statusFilter" class="h-10 rounded-lg border border-[#d5d8de] bg-white px-2.5 text-[13px]">
        <option value="all">전체</option>
        <option v-for="s in Object.keys(STATUS_CLASS)" :key="s">{{ s }}</option>
      </select>
    </label>
    <span class="ml-auto text-xs text-muted">← 표가 넓으면 가로로 스크롤 →</span>
  </div>

  <div ref="tableEl" class="overflow-x-auto rounded-xl border border-line bg-white">
    <div class="min-w-[2280px]">
      <!-- 그룹 헤더 -->
      <div class="grid text-xs font-semibold text-muted" :class="COLS">
        <div class="col-span-9 border-b border-line bg-field-head px-3 py-2 text-field-ink">입력</div>
        <div class="col-span-5 border-b border-l border-line bg-field px-3 py-2 text-field-ink">지정 (비우면 자동 배정)</div>
        <div class="col-span-7 border-b border-l border-line bg-line-soft px-3 py-2 text-ink-2">자동 계산 결과 · 작업</div>
        <div class="border-b border-line px-3 py-2.5">확정</div>
        <div class="border-b border-line px-2 py-2.5">#</div>
        <div class="border-b border-line px-3 py-2.5">사이트</div>
        <div class="border-b border-line px-3 py-2.5">CSR번호</div>
        <div class="border-b border-line px-3 py-2.5">CSR명</div>
        <div class="border-b border-line px-3 py-2.5">개발주체</div>
        <div class="border-b border-line px-3 py-2.5">신규/수정</div>
        <div class="border-b border-line px-3 py-2.5">수량 / MD</div>
        <div class="border-b border-line px-3 py-2.5">개발시작일</div>
        <div class="border-b border-l border-line px-3 py-2.5">개발자</div>
        <div class="border-b border-line px-3 py-2.5">사테담당</div>
        <div class="border-b border-line px-3 py-2.5">사테일</div>
        <div class="border-b border-line px-3 py-2.5">3테담당</div>
        <div class="border-b border-line px-3 py-2.5">3테일</div>
        <div class="border-b border-l border-line px-3 py-2.5">개발기간</div>
        <div class="border-b border-line px-3 py-2.5">개발자</div>
        <div class="border-b border-line px-3 py-2.5">사테 / 3테</div>
        <div class="border-b border-line px-3 py-2.5 text-right">계획 MD</div>
        <div class="border-b border-line px-3 py-2.5 text-right">작업 MH</div>
        <div class="border-b border-line px-3 py-2.5">상태</div>
        <div class="border-b border-line" />
      </div>

      <div
        v-for="{ csr: c, idx, status, errors, result: r } in rows"
        :key="c.id"
        :data-row="c.id"
        class="grid min-h-[52px] items-center border-b border-line-soft text-[13px]"
        :class="[COLS, c.confirmed ? 'bg-subtle text-ink-2' : 'bg-white']"
      >
        <div class="px-3">
          <button
            type="button"
            class="flex size-10 items-center justify-center rounded-lg border"
            :class="c.confirmed ? 'border-ink bg-ink text-white' : 'border-[#d5d8de] bg-white text-muted hover:bg-subtle'"
            :aria-pressed="c.confirmed"
            :aria-label="`${c.confirmed ? '일정확정 해제' : '일정확정'}: ${c.csrNo || `행 ${idx}`}`"
            :disabled="!c.confirmed && errors.length > 0"
            :title="!c.confirmed && errors.length ? '입력 오류를 먼저 고쳐 주세요' : undefined"
            @click="toggleConfirm(c)"
          >
            <Lock v-if="c.confirmed" :size="16" aria-hidden="true" />
            <LockOpen v-else :size="16" aria-hidden="true" />
          </button>
        </div>
        <div class="px-2 text-xs text-muted">{{ idx }}</div>

        <!-- 확정: 읽기 전용 -->
        <template v-if="c.confirmed">
          <div class="px-3">{{ c.site }}</div>
          <div class="px-3 font-mono text-xs">{{ c.csrNo }}</div>
          <div class="truncate px-3" :title="c.title">{{ c.title }}</div>
          <div class="px-3">{{ c.devOwner }}</div>
          <div class="px-3">{{ c.type }}</div>
          <div class="px-3 font-mono">{{ c.type === '직접지정' ? c.directMd : c.quantity }}</div>
          <div class="px-3 font-mono text-xs">{{ fmtMD(c.startDate) }}</div>
          <div class="border-l border-line px-3">{{ memberName(c.assignedDev) }}</div>
          <div class="px-3">{{ memberName(c.assignedUat) }}</div>
          <div class="px-3 font-mono text-xs">{{ c.uatDate ? fmtMD(c.uatDate) : '자동' }}</div>
          <div class="px-3">{{ memberName(c.assignedTpt) }}</div>
          <div class="px-3 font-mono text-xs">{{ c.tptDate ? fmtMD(c.tptDate) : '자동' }}</div>
        </template>

        <!-- 미확정: 편집 -->
        <template v-else>
          <div class="px-1.5">
            <select v-model="c.site" aria-label="사이트" class="field px-1.5">
              <option>엔솔</option>
              <option>화학</option>
            </select>
          </div>
          <div class="px-1.5">
            <input v-model.trim="c.csrNo" data-first aria-label="CSR번호" class="field font-mono text-xs" :class="{ 'field-error': has(errors, 'CSR번호') }" />
          </div>
          <div class="px-1.5">
            <input v-model="c.title" aria-label="CSR명" placeholder="CSR명 입력" class="field" :class="{ 'field-error': has(errors, 'CSR명') }" />
          </div>
          <div class="px-1.5">
            <select v-model="c.devOwner" aria-label="개발주체" class="field px-1.5">
              <option>자체</option>
              <option>운영</option>
            </select>
          </div>
          <div class="px-1.5">
            <select v-model="c.type" aria-label="신규/수정" class="field px-1.5" :class="{ 'field-error': has(errors, '신규/수정') }">
              <option value="">선택</option>
              <option v-for="t in TYPES" :key="t">{{ t }}</option>
            </select>
          </div>
          <div class="px-1.5">
            <input
              v-if="c.type === '직접지정'"
              v-model.number="c.directMd"
              type="number"
              step="0.1"
              min="0"
              aria-label="MD 직접 입력"
              class="field text-right font-mono"
              :class="{ 'field-error': has(errors, 'MD') }"
            />
            <input v-else v-model.number="c.quantity" type="number" min="1" aria-label="수량" class="field text-right font-mono" />
          </div>
          <div class="px-1.5">
            <input
              type="date"
              aria-label="개발시작일"
              class="field px-1.5 text-xs"
              :class="{ 'field-error': has(errors, '개발시작일') }"
              :value="c.startDate ?? ''"
              @input="c.startDate = dateInput($event)"
            />
          </div>
          <div class="border-l border-line px-1.5">
            <select v-model="c.assignedDev" aria-label="개발자 지정" class="field px-1.5" :class="{ 'field-error': has(errors, '개발자와 3테담당이 같음') }">
              <option :value="null">자동</option>
              <option v-for="m in store.members" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </div>
          <div class="px-1.5">
            <select v-model="c.assignedUat" aria-label="사테담당 지정" class="field px-1.5">
              <option :value="null">자동</option>
              <option v-for="m in store.members" :key="m.id" :value="m.id">{{ m.name }}</option>
              <option :value="OPS">운영</option>
            </select>
          </div>
          <div class="px-1.5">
            <input type="date" aria-label="사테일 지정" class="field px-1.5 text-xs" :value="c.uatDate ?? ''" @input="c.uatDate = dateInput($event)" />
          </div>
          <div class="px-1.5">
            <select v-model="c.assignedTpt" aria-label="3테담당 지정" class="field px-1.5" :class="{ 'field-error': has(errors, '개발자와 3테담당이 같음') }">
              <option :value="null">자동</option>
              <option v-for="m in store.members" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </div>
          <div class="px-1.5">
            <input type="date" aria-label="3테일 지정" class="field px-1.5 text-xs" :value="c.tptDate ?? ''" @input="c.tptDate = dateInput($event)" />
          </div>
        </template>

        <!-- 자동 계산 결과 -->
        <div class="flex h-full items-center border-l border-line bg-[#f6f7f9] px-3 font-mono text-xs">
          <template v-if="r?.developer === OPS">운영 개발</template>
          <template v-else-if="r?.devStart">{{ fmtMD(r.devStart) }} – {{ fmtMD(r.devEnd) }}</template>
          <template v-else>—</template>
        </div>
        <div class="flex h-full items-center bg-[#f6f7f9] px-3">
          <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :style="devChipStyle(r?.developer)">
            {{ store.assigneeName(r?.developer) }}
          </span>
        </div>
        <div class="flex h-full flex-col justify-center bg-[#f6f7f9] px-3 text-xs leading-4">
          <span>사 {{ r?.uatDate ? `${fmtMD(r.uatDate)} ${store.assigneeName(r.uatBy)}` : '—' }}</span>
          <span>3 {{ r?.tptDate ? `${fmtMD(r.tptDate)} ${store.assigneeName(r.tptBy)}` : '—' }}</span>
        </div>
        <div class="flex h-full items-center justify-end bg-[#f6f7f9] px-3 font-mono font-semibold">{{ fmtMd(r?.md) }}</div>
        <div
          class="flex h-full items-center justify-end bg-[#f6f7f9] px-3 font-mono"
          :title="r?.md != null ? `계획 ${fmtH(r.md * (store.settings?.hoursPerDay ?? 8))}h` : undefined"
        >
          {{ store.loggedHours.has(c.id) ? fmtH(store.loggedHours.get(c.id)!) : '—' }}
        </div>
        <div class="flex h-full flex-wrap content-center items-center gap-1 bg-[#f6f7f9] px-3">
          <span class="pill" :class="STATUS_CLASS[status]" :title="errors.join(' · ') || undefined">{{ status }}</span>
          <span
            v-if="c.manualSchedule && !c.confirmed"
            class="pill bg-field text-field-ink"
            title="작업을 직접 고친 CSR: 자동 재배정에서 빠집니다"
          >
            <PencilLine :size="11" aria-hidden="true" />수동
          </span>
        </div>
        <div class="flex h-full items-center justify-center gap-0.5 bg-[#f6f7f9]">
          <button
            v-if="c.manualSchedule && !c.confirmed"
            type="button"
            class="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-info-50 hover:text-info-700"
            :aria-label="`${c.csrNo || `행 ${idx}`} 자동 배정으로 되돌리기`"
            title="자동 배정으로 되돌리기"
            @click="resetTarget = c"
          >
            <RotateCcw :size="16" aria-hidden="true" />
          </button>
          <button
            v-if="!c.confirmed"
            type="button"
            class="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-danger-50 hover:text-danger"
            :aria-label="`${c.csrNo || `행 ${idx}`} 삭제`"
            @click="store.removeCsr(c.id)"
          >
            <Trash2 :size="16" aria-hidden="true" />
          </button>
        </div>
      </div>

      <p v-if="!rows.length" class="px-4 py-10 text-center text-muted">조건에 맞는 CSR이 없습니다.</p>

      <div class="flex items-center gap-4 bg-subtle px-4 py-3 text-[13px] text-muted">
        <span>합계 <strong class="text-ink">{{ fmtMd(store.totalMd) }} MD</strong> (검토자 공수 제외)</span>
        <span>확정 {{ counts.확정 }} · 진행 {{ counts.진행 }} · 이월 {{ counts.이월 }} · 입력 오류 {{ counts['입력 오류'] }}</span>
      </div>
    </div>
  </div>

  <BaseModal
    :open="!!resetTarget"
    title="자동 배정으로 되돌릴까요?"
    :subtitle="resetTarget?.csrNo"
    width="max-w-[480px]"
    @close="resetTarget = null"
  >
    <p class="px-[22px] py-5 text-[13px] leading-6 text-ink-2">
      이 CSR에서 직접 고치거나 추가한 작업을 모두 지우고, 규칙에 따라 다시 배정합니다. 되돌린 뒤에는 복구할 수 없습니다.
    </p>
    <template #footer>
      <button type="button" class="btn ml-auto h-10" @click="resetTarget = null">취소</button>
      <button type="button" class="btn btn-primary h-10" @click="confirmReset">되돌리기</button>
    </template>
  </BaseModal>

  <BaseModal
    :open="!!unlockTarget"
    title="일정확정을 해제할까요?"
    :subtitle="unlockTarget?.csrNo"
    width="max-w-[480px]"
    @close="unlockTarget = null"
  >
    <p class="px-[22px] py-5 text-[13px] leading-6 text-ink-2">
      결재가 끝난 CSR입니다. 해제하면 입력값을 다시 고칠 수 있고, 저장할 때 이 CSR의 일정도 다시 배정될 수 있습니다.
    </p>
    <template #footer>
      <button type="button" class="btn ml-auto h-10" @click="unlockTarget = null">취소</button>
      <button type="button" class="btn btn-primary h-10" @click="confirmUnlock">해제</button>
    </template>
  </BaseModal>
</template>
