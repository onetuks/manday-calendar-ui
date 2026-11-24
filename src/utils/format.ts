import dayjs from 'dayjs'
import type { TaskType } from '@/types'

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

/** 0.1h 단위 표시 */
export const fmtH = (h: number) => (Math.round(h * 10) / 10).toFixed(1)

/** MD는 소수 둘째 자리까지 */
export const fmtMd = (md: number | null | undefined) =>
  md == null ? '—' : md < 0.1 ? md.toFixed(2) : (Math.round(md * 100) / 100).toFixed(2)

/** 2026-11-02 → 11/02 */
export const fmtMD = (d: string | null | undefined) => (d ? dayjs(d).format('MM/DD') : '—')

export const TASK_LABEL: Record<TaskType, string> = {
  DEV: '개발',
  UAT: '사테',
  TPT: '3테',
}

/** 작업 태그 Tailwind 클래스 */
export const TASK_CLASS: Record<TaskType, string> = {
  DEV: 'bg-gray-100 text-ink',
  UAT: 'bg-uat-50 text-uat-700',
  TPT: 'bg-tpt-50 text-tpt-700',
}

/** CSR명 앞의 [팀명] 접두어 제거 */
export const shortTitle = (t: string) => (t ? t.replace(/^\[[^\]]*\]\s*/, '') : '(CSR명 없음)')
