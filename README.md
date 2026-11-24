# 공수기록캘린더 UI

LG엔솔·LG화학 SAP PI 개발 공수를 팀이 함께 보고 고치는 웹 화면입니다. 엑셀 'LG공수기록캘린더'를 대체하며, 배정 계산은 서버([manday-calendar-server](https://github.com/onetuks/manday-calendar-server))가 맡고 이 저장소는 표시와 입력만 담당합니다.

## 주요 화면

| 화면 | 경로 | 하는 일 |
|---|---|---|
| 캘린더 | `/` | 월 캘린더, 담당자별 월 요약, 담당자·사이트 필터, CSR번호·CSR명 검색 |
| 일자 상세 모달 | 캘린더 칸 클릭 | 그날 작업 전체 보기·수정·추가·삭제, 담당자별 하루 상한 지정, 이전날/다음날 이동 |
| CSR 목록 | `/csrs` | 엑셀처럼 표에서 바로 입력, 입력 오류 표시, 일정확정/해제, 자동 배정으로 되돌리기 |
| 설정 · 공휴일 | `/settings` | 개발자 비율·색상, 유형별 MD, 하루 근무시간, 휴무일 관리 |

### 캘린더

- 칸에는 담당자별 합계와 작업을 최대 3건까지 보여 주고, 나머지는 "+N건 더보기"로 접습니다. 같은 CSR·작업이 하루에 여러 건이면 한 줄로 합쳐 표시합니다.
- 하루 상한을 넘은 날은 빨간색, 일정확정된 CSR은 잠금 아이콘, 사람이 직접 고친 작업은 연필 아이콘으로 표시합니다.
- **검색:** CSR번호나 CSR명의 일부를 입력하면 그 키워드를 포함한 작업만 캘린더와 상세 모달에 남습니다(대소문자 무시). 캘린더 위에 일치 건수가 표시되고, 이번 달에 결과가 없으면 가장 가까운 달로 바로 이동할 수 있습니다. Esc나 X 버튼으로 지웁니다.
- 필터·검색은 이미 받아 둔 데이터를 브라우저에서 거르는 방식이라 서버 요청이 추가로 생기지 않습니다.

### 일자 상세 모달

- 작업마다 유형·담당자·날짜·시간을 바로 고칠 수 있습니다. 시간에 0을 넣으면 삭제되고, 날짜를 바꾸면 그 날짜로 옮겨집니다. 고친 CSR은 '수동'으로 표시되어 자동 재배정에서 빠집니다.
- **하루 상한:** 담당자별로 그날 상한 MH를 입력합니다(0~24, 0.1 단위). 반차 4h, 연차 0h, 야근 12h 같은 경우에 씁니다. 비우면 기본값(평일 하루 근무시간, 주말·공휴일 0h)으로 돌아갑니다.
- **이전날/다음날:** 머리글의 ‹ › 버튼이나 키보드 ← → 키로 이동합니다. 입력칸에 포커스가 있을 때는 키 이동을 하지 않습니다. 달이 바뀌면 뒤의 캘린더도 함께 넘어갑니다.
- 사이트 필터나 검색어가 걸려 있으면 그에 맞는 작업만 보여 주지만, 합계와 상한 초과 판정은 그날 전체 작업 기준입니다.

### CSR 목록

- 일정확정(`confirmed`)된 CSR은 결재가 끝난 건이라 입력칸이 잠깁니다. 해제할 때는 확인 모달을 한 번 거칩니다.
- 시작일 누락, 개발자와 3테 담당자가 같은 경우 같은 입력 오류는 칸을 빨갛게 표시하고, 오류가 있는 행은 확정할 수 없습니다.
- 같은 CSR이 여러 건이면 행을 여러 개 만드는 대신 '수량'을 씁니다.

## 실행

Node.js 20.19 이상 또는 22.12 이상이 필요합니다.

```bash
npm install
npm run dev        # http://localhost:3009  (/api 요청은 localhost:8089 서버로 전달)
npm run dev:mock   # 서버 없이 목업 데이터(엑셀 11월 시트 값)로 실행
npm run build      # 타입 체크(vue-tsc) + 빌드 → dist/
npm run type-check # 타입 체크만
```

서버와 함께 개발하려면 서버 저장소에서 `./gradlew bootRun`으로 8089 포트를 먼저 띄운 뒤 `npm run dev`를 실행합니다. 프록시 설정은 `vite.config.ts`에 있습니다.

### 환경변수

| 변수 | 값 | 설명 |
|---|---|---|
| `VITE_USE_MOCK` | `true` / `false` | `true`면 서버 대신 `src/mock/data.ts`를 씁니다. `--mode mock`으로 띄워도 같습니다. |

`.env`는 운영 빌드에도 들어가므로 `false`로 두고, 로컬에서만 목업을 쓰려면 `.env.development.local`(Git 제외)에서 바꿉니다. Docker 이미지 빌드는 항상 `VITE_USE_MOCK=false`로 만듭니다.

## 스택

| 용도 | 라이브러리 |
|---|---|
| 프레임워크 | Vue 3 (`<script setup>` + TypeScript), Vite 7 |
| 스타일 | Tailwind CSS v4 (`@tailwindcss/vite`). 디자인 토큰은 `src/assets/main.css`의 `@theme` |
| 라우팅 / 상태 | vue-router 4, Pinia 3 |
| 모달 | @headlessui/vue (Esc 닫기, 포커스 가두기, 바깥 클릭 처리) |
| 날짜 | dayjs |
| 아이콘 | lucide-vue-next |
| 폰트 | IBM Plex Sans KR / Mono (@fontsource로 번들. 외부 CDN이 막힌 사내망에서도 동작) |

캘린더는 FullCalendar 대신 직접 만든 그리드입니다. 칸마다 담당자별 합계와 작업 태그를 넣는 형태라 직접 그리는 편이 단순합니다.

## 구조

```
src/
├─ api/
│  ├─ index.ts        서버 API 호출 (목업 모드면 목업 데이터 반환). 엔드포인트 목록은 파일 상단 주석
│  ├─ types.ts        서버 요청/응답 타입 (서버 API_SPEC.md 기준)
│  └─ mappers.ts      서버 DTO ↔ 화면 모델 변환
├─ mock/data.ts       엑셀 '11월' 시트 값으로 만든 목업
├─ types/index.ts     화면 도메인 타입 (Member, Csr, Task, Settings, Holiday, DayCapacity …)
├─ stores/effort.ts   Pinia 스토어: 데이터 로드, 월 이동, 요약 계산, 입력 검증, 작업·확정·상한 변경
├─ utils/format.ts    시간·날짜 포맷, 작업 라벨
├─ components/
│  ├─ AppHeader.vue
│  ├─ common/         BaseModal(머리글 actions 슬롯 지원), TaskTag
│  └─ calendar/       MonthSummary, CalendarFilters, CalendarGrid, CalendarCell, DayDetailModal, CsrLabel
│                     calendar.ts: 담당자·사이트·검색어 필터, 8h 초과 판정
└─ views/             CalendarView, CsrListView, SettingsView
```

## 서버 연동

요청·응답 스펙은 서버 저장소의 `API_SPEC.md`를 따릅니다.

- 처음 화면이 뜰 때 개발자·설정·공휴일·CSR·작업·하루 상한을 한 번에 받습니다. 캘린더의 월 이동, 필터, 검색은 이 데이터 안에서 처리합니다.
- 변경 API가 성공하면 `GET /api/calendar/schedule`로 배정 결과를 다시 받습니다. 작업을 추가·수정·삭제한 뒤에는 `GET /api/csrs`로 `confirmed`·`manualSchedule` 플래그만 다시 맞추고, 편집 중인 다른 입력값은 건드리지 않습니다.
- 새 CSR 행은 음수 임시 id를 쓰고, 저장할 때 `null`로 바꿔 보냅니다. 서버가 실제 id를 돌려줍니다.
- 서버 오류는 `ProblemDetail`의 `detail → message → title` 순서로 메시지를 뽑아 화면 위쪽에 보여 줍니다.
- 예전 서버의 `'신규(공통)'` 유형은 받을 때 `'공통'`으로 바꿉니다.

## 배포

운영에서는 nginx 컨테이너가 `dist/`를 3009 포트로 서비스하고, `/api` 요청을 서버 컨테이너(`app:8089`)로 넘깁니다. 화면과 API가 같은 주소로 나가므로 CORS 설정이 필요 없습니다. 설정은 `nginx.conf`에 있습니다.

Dockerfile과 docker-compose.yml은 두 저장소를 함께 담는 상위 폴더에 있습니다. 아래처럼 나란히 받아 두고 상위 폴더에서 compose를 실행합니다(자세한 절차는 상위 폴더의 `DEPLOY.md`).

```
003.공수기록캘린더/
├─ 001.ui/                        ← 이 저장소
├─ 002.server/lg_manday_calendar/ ← manday-calendar-server
├─ Dockerfile, docker-compose.yml, compose.tunnel-net.yml
├─ .env.example
└─ DEPLOY.md
```

```bash
# 코드를 바꾼 뒤 화면만 다시 배포
git pull
docker compose up -d --build ui
```

배포한 뒤 예전 화면이 보이면 브라우저 캐시 때문일 수 있으니 강력 새로고침(Ctrl+F5)을 합니다. 해시가 붙은 `assets/`는 오래 캐시하고, `index.html`은 캐시하지 않도록 설정되어 있습니다.
