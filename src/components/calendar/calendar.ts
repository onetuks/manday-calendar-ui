import type { Csr, Task } from '@/types'

/** 검색어 정규화: 앞뒤 공백 제거 + 소문자 */
export const normalizeKeyword = (keyword: string) => keyword.trim().toLowerCase()

/** CSR번호 또는 CSR명에 검색어가 들어 있는지 (대소문자 무시, 부분 일치). 검색어가 비면 항상 true */
export function matchesKeyword(csr: Csr | undefined, keyword: string) {
  const q = normalizeKeyword(keyword)
  if (!q) return true
  if (!csr) return false
  return csr.csrNo.toLowerCase().includes(q) || csr.title.toLowerCase().includes(q)
}

/** 담당자·사이트·검색어 필터 적용 */
export function filterTasks(list: Task[], person: string, site: string, csrMap: Map<number, Csr>, keyword = '') {
  return list.filter((a) => {
    const csr = csrMap.get(a.csrId)
    return (person === 'all' || a.memberId === person) && (site === 'all' || csr?.site === site) && matchesKeyword(csr, keyword)
  })
}

/** 하루 최대 근무시간을 넘었는지 (부동소수 오차 허용) */
export const isOver = (hours: number, hpd: number) => hours > hpd + 0.05

/** 칸에 바로 보일 최대 건수 */
export const MAX_VISIBLE = 3
