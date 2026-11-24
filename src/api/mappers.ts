// 서버 DTO(API_SPEC.md) ↔ 화면 모델(@/types) 변환.
// 요청 바디는 명세에 있는 필드만 골라서 만든다 (응답에 딸려 온 모르는 필드를 되돌려 보내지 않도록).
import type { Csr, CsrType, Holiday, Member, Settings, Task } from '@/types'
import type { CsrDto, HolidayDto, MemberDto, SettingsDto, TaskDto } from './types'

const DEFAULT_TINT = '#EEF0F3'

// ── CSR ──────────────────────────────────────────────

export function fromCsrDto(d: CsrDto): Csr {
  return {
    id: d.id ?? 0,
    site: d.site || '엔솔',
    csrNo: d.csrNo ?? '',
    title: d.title ?? '',
    devOwner: d.devOwner || '자체',
    // 예전 서버의 '신규(공통)'은 '공통'과 같은 유형
    type: (d.type === '신규(공통)' ? '공통' : (d.type ?? '')) as CsrType | '',
    quantity: d.quantity ?? 1,
    directMd: d.directMd,
    startDate: d.startDate,
    assignedDev: d.assignedDev || null,
    assignedUat: d.assignedUat || null,
    uatDate: d.uatDate,
    assignedTpt: d.assignedTpt || null,
    tptDate: d.tptDate,
    confirmed: d.confirmed,
    manualSchedule: d.manualSchedule,
  }
}

export function toCsrDto(c: Csr): CsrDto {
  return {
    // 화면에서 새로 추가한 행은 음수 임시 id → 서버 규칙상 null(신규)
    id: c.id > 0 ? c.id : null,
    site: c.site,
    csrNo: c.csrNo,
    title: c.title,
    devOwner: c.devOwner,
    type: c.type,
    quantity: c.quantity || 1,
    directMd: c.type === '직접지정' ? c.directMd : null,
    startDate: c.startDate || null,
    assignedDev: c.assignedDev || null,
    assignedUat: c.assignedUat || null,
    uatDate: c.uatDate || null,
    assignedTpt: c.assignedTpt || null,
    tptDate: c.tptDate || null,
    // 읽기 전용 (서버가 무시)
    confirmed: c.confirmed,
    manualSchedule: c.manualSchedule,
  }
}

// ── 작업 ─────────────────────────────────────────────

export function fromTaskDto(d: TaskDto): Task {
  return { id: d.id, csrId: d.csrId, type: d.type, date: d.date, hours: d.hours, memberId: d.memberId, manual: d.manual }
}

// ── 설정 · 개발자 · 공휴일 ───────────────────────────

export function fromSettingsDto(d: SettingsDto): Settings {
  return {
    year: d.year,
    hoursPerDay: d.hoursPerDay,
    uatHours: d.uatHours,
    tptHours: d.tptHours,
    reviewHours: d.reviewHours,
    md: { new: d.md.new, common: d.md.common, modify: d.md.modify, endpoint: d.md.endpoint },
  }
}

export const toSettingsDto = (s: Settings): SettingsDto => fromSettingsDto(s)

export function fromMemberDto(d: MemberDto): Member {
  return { id: d.id, name: d.name, ratio: d.ratio, color: d.color, tint: d.tint ?? DEFAULT_TINT }
}

export function toMemberDto(m: Member): MemberDto {
  return { id: m.id, name: m.name.trim(), ratio: m.ratio, color: m.color.toUpperCase(), tint: m.tint ? m.tint.toUpperCase() : null }
}

export function fromHolidayDto(d: HolidayDto): Holiday {
  return { date: d.date, name: d.name, note: d.note ?? '' }
}

export function toHolidayDto(h: Holiday): HolidayDto {
  return { date: h.date, name: h.name.trim(), note: h.note?.trim() ?? '' }
}
