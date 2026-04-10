# 메이플 거울 길드 트래커

## 프로젝트 개요
메이플스토리 Nexon Open API 기반 **스카니아 거울 길드 전용** 대시보드.
성장 레이스 (경험치/전투력) + 길드원 현황을 자동 수집하여 보여주는 웹앱.

## 현재 상태
- **빌드**: ✅ 성공 (`npx next build`)
- **데이터**: 188명/196명 수집 완료 (`data/snapshots/2026-04-06.json`)
- **GitHub push**: ❌ 아직 안 됨 (회사 네트워크 차단)
- **API 한도**: 일 1,000회, 4/7 기준 949회 사용 → 내일 리셋

## 기술 스택
- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Recharts (설치됨, 차트 미구현)
- JSON 파일 저장 (DB 없음)
- dotenv (scripts에서 .env.local 자동 로드)

## 핵심 파일 구조
```
src/
  app/
    page.tsx                     ← 메인 대시보드 (Server Component, JSON에서 읽기)
    member/[name]/page.tsx       ← 개인 프로필 페이지
    api/cron/weekly/route.ts     ← 디스코드 주간 리포트 API
    api/guild/route.ts           ← 길드 API (실시간 호출용, 현재 미사용)
  components/
    growth/GrowthRanking.tsx     ← 성장 레이스 (포디움 + 랭킹 + 현재스펙/변화량 토글)
    dashboard/MemberList.tsx     ← 길드원 목록 (필터링 지원)
    ui/MemberFilter.tsx          ← 닉네임/직업/레벨 필터
  features/
    growth/compare.ts            ← ⭐ 비교 로직 핵심 (일별/주간/월간 스냅샷 비교)
  services/
    nexon-api.ts                 ← Nexon Open API 클라이언트 + Rate Limiter
    discord.ts                   ← Discord Webhook 서비스
  types/
    nexon.ts                     ← Nexon API 응답 타입
    guild.ts                     ← 길드/멤버 타입
  lib/
    constants.ts                 ← 유틸 함수 (formatCombatPower 등)

scripts/
  collect.ts                     ← 전원 수집 스크립트 (npx tsx scripts/collect.ts)
  collect-date.ts                ← 특정 날짜 수집 (npx tsx scripts/collect-date.ts 2026-04-05)

data/
  latest.json                    ← 최신 스냅샷 (page.tsx에서 읽음)
  members.json                   ← 길드원 ocid 캐시
  snapshots/
    2026-04-06.json              ← 일별 스냅샷 (현재 1일치만 있음)

.env.local                       ← API Key (git에 포함 안 됨)
.github/workflows/
  collect.yml                    ← 거울 전날 결산 수집 (cron-job.org → 매일 KST 10:05)
  collect-today.yml              ← 거울 오늘 실시간 수집 (cron-job.org → 매 30분)
  monitor.yml                    ← 거울/달라 가입·탈퇴 감지 (cron-job.org → 매 5분)
  inactive.yml                   ← 거울/달라 미접속 알림 (cron-job.org → 매일 KST 07:00)
  weekly-report.yml              ← 거울/달라 주간 리포트 (cron-job.org → 매주 월 KST 09:00)
docs/cron-setup.md               ← cron-job.org 설정 가이드
vercel.json                      ← Vercel 배포 설정
```

## 배치 스케줄 (cron-job.org 외부 트리거)

GitHub Actions 내장 cron은 5분·10분 단위 스케줄이 불안정 → cron-job.org에서 GitHub API 직접 호출
→ 자세한 설정: `docs/cron-setup.md`

| 배치 | 주기 | KST | 역할 |
|------|------|-----|------|
| `monitor.yml` | 5분 | - | 거울/달라 가입·탈퇴 감지, admin.json 업데이트 |
| `collect-today.yml` | 30분 | - | 거울 오늘 실시간 스냅샷 |
| `collect.yml` | 매일 | 10:05 | 거울 전날 결산 스냅샷 |
| `inactive.yml` | 매일 | 07:00 | 거울/달라 장기 미접속 Discord 알림 |
| `weekly-report.yml` | 매주 월 | 09:00 | 거울/달라 주간 리포트 Discord |

## 주요 설계 결정
- **단일 길드 고정**: 환경변수 `GUILD_NAME=거울`, `WORLD_NAME=스카니아` (자유 검색 불가)
- **주간 기준**: 목요일 00시 리셋 (메이플 주간퀘 기준) → `getMapleWeek()` 함수
- **월간 기준**: 1일~말일 → `getMapleMonth()` 함수
- **경험치 가중치 없음**: 레벨 구간 관계없이 통일 (사용자 요청)
- **캐릭터 클릭**: 내부 프로필 페이지 + maplescouter.com 외부 링크
- **리포트**: 디스코드 웹훅으로 전체 길드원 대상 (필터링 불가)
- **웹 필터링**: 닉네임/직업/레벨 구간 커스텀 가능
- **큐브/스타포스 이력 API**: 타인 조회 불가 확인됨 → 운 랭킹은 보류

## 환경변수 (.env.local)
```
NEXON_API_KEY=xxx          ← Nexon Open API Key (필수)
GUILD_NAME=거울             ← 길드명 (기본값 있음)
WORLD_NAME=스카니아          ← 월드명 (기본값 있음)
DISCORD_WEBHOOK_URL=xxx     ← 디스코드 웹훅 (선택)
CRON_SECRET=xxx             ← Cron 엔드포인트 보호 (선택)
```

## 실행 방법 (최초 세팅)
```bash
# 1. node_modules 설치 (최초 1회, 또는 zip으로 가져온 경우 필수)
npm install

# 2. .env.local 파일 생성 (없으면)
# NEXON_API_KEY=xxx
# GUILD_NAME=거울
# WORLD_NAME=스카니아

# 3. 개발 서버 실행
npx next dev -p 3333

# 4. 데이터 수집 (API Key 필요)
npx tsx scripts/collect.ts

# 5. 빌드
npx next build
```

## 집에서 할 일 (순서대로)

### Step 1. GitHub push
```bash
cd /Users/happy/maple-guild-tracker

# .gitignore에서 data/ 줄 제거
# 그 후:
git add -A
git commit -m "feat: data 폴더 포함하여 전체 push"
git push -u origin main
```

### Step 2. GitHub Secrets 등록
```
GitHub 웹 → Settings → Secrets and variables → Actions → New repository secret
  Name: NEXON_API_KEY
  Value: .env.local 파일에 있는 키 값
→ 이걸 해야 GitHub Actions 자동 수집이 동작
```

### Step 3. Vercel 배포
```
1. vercel.com 가입 (GitHub 계정 연동)
2. "Import Project" → huckjuhwang/Maple 선택
3. 환경변수 설정:
   NEXON_API_KEY=xxx
   GUILD_NAME=거울
   WORLD_NAME=스카니아
4. Deploy 클릭
5. → https://xxx.vercel.app URL 생성됨!

* DB 전환 불필요! JSON이 빌드에 포함되므로 그대로 동작.
* GitHub Actions가 매일 수집 → push → Vercel 자동 재빌드.
```

### Step 4. Nexon API 앱 승인 신청 (한도 1,000 → 100,000)
```
1. openapi.nexon.com 로그인
2. 내 앱 관리 → 앱 선택
3. "앱 승인 신청" 클릭
4. 작성 내용:
   - 서비스명: 거울 길드 대시보드
   - 서비스 URL: https://xxx.vercel.app (Step 3에서 생성된 URL)
   - 서비스 설명: 메이플스토리 스카니아 거울 길드 전용 성장 레이스 대시보드.
     길드원 190명의 전투력/레벨/경험치/유니온 일일 변화를 추적하는 웹서비스.
   - 일일 예상 호출 수: 약 800~1,600회 (길드원 수집용)
5. 심사 완료되면 한도 상향

* 승인되면 GitHub Actions가 아닌 Vercel Cron으로도 수집 가능
* 하루 여러 번 수집도 가능해짐 (예: 6시간마다)
* 과거 데이터 한번에 여러 날치 수집 가능
```

### Step 5. 과거 데이터 수집
```bash
# API 승인 전: 하루 1,000회 → 1일치만 가능
# API 승인 후: 100,000회 → 한번에 다 가능!

# 승인 전이면 하루에 1일치씩:
npx tsx scripts/collect-date.ts 2026-04-05
# 다음 날:
npx tsx scripts/collect-date.ts 2026-04-04

# 승인 후면 한번에:
npx tsx scripts/collect-date.ts 2026-04-05
npx tsx scripts/collect-date.ts 2026-04-04
npx tsx scripts/collect-date.ts 2026-04-03
npx tsx scripts/collect-date.ts 2026-04-02
npx tsx scripts/collect-date.ts 2026-04-01

# 수집 후:
git add data/ && git commit -m "🍄 과거 데이터 수집" && git push
# → Vercel 자동 재빌드 → 비교/차트 즉시 동작
```

## 추가 개발 작업 (나중에)

### 강화 운 랭킹 (대안 논의 필요)
- `/history/cube`, `/history/starforce` API는 본인 계정만 조회 가능 확인됨
- 대안: 길드원 각자 API Key 등록 / 자기신고제 / 보류

### 길드 공지 (디스코드 연동)
- 디스코드 #길드공지 채널 메시지를 읽어와서 대시보드에 표시
- 디스코드 봇 토큰 필요 (Discord Developer Portal에서 봇 생성)
- GitHub Actions에서 수집 시 메시지도 같이 가져옴 → data/notices.json 저장

### 디자인 개선 (선택)
- 메이플 픽셀아트 SVG 아이콘 (주황버섯, 슬라임 직접 제작)
- 다크모드 지원
- 차트 기간 이전/다음 네비게이션 (이전 주, 다음 주 버튼)

## 이미 완료된 것 (✅)
- ~~일간/주간/월간 탭 전환 UI~~ → `GrowthSection.tsx` (완료)
- ~~Recharts 라인 차트~~ → `GrowthChart.tsx` (완료)
- ~~주간 기준 목~수~~ → `getMapleWeek()` (완료)
- ~~월간 기준 1~말일~~ → `getMapleMonth()` (완료)
- ~~기간 배지 표시~~ → GrowthRanking에 기간 표시 (완료)
- ~~애니메이션~~ → 주황버섯/슬라임/왕관/별/떠다니기/슬라이드인 (완료)
- ~~리뷰 이슈 수정~~ → API Key 노출, 에러핸들링, Rate Limiter 등 6건 (완료)

## 참고 문서
- Plan: `docs/01-plan/features/메이플길드트래커.plan.md`
- Design: `docs/02-design/features/메이플길드트래커.design.md`
- Nexon API 문서: https://openapi.nexon.com/game/maplestory/

## 커밋 컨벤션
- `feat:` 새 기능 / `fix:` 버그 수정 / `chore:` 설정 변경
- 메이플 이모지 🍄🐌 적극 활용
