# 🍄 메이플 거울 길드 트래커

> 메이플스토리 스카니아 서버 **거울 · 달라 길드** 전용 성장 대시보드

🌐 **사이트**: [maple-guild-tracker.vercel.app](https://maple-guild-tracker.vercel.app)
📖 **사용 설명서**: [maple-guild-tracker.vercel.app/guide.html](https://maple-guild-tracker.vercel.app/guide.html)

<!-- AUTO_STATS_START -->
## 📊 현황

| 항목 | 값 |
|------|-----|
| 마지막 수집 | 2026-04-10 17:48 KST |
| 수집 인원 | 196명 |
| 길드 레벨 | Lv.30 |
| 마스터 | 쭈히 |

<!-- AUTO_STATS_END -->

---

## 서비스 소개

거울 길드와 달라 길드 길드원들의 성장 현황을 자동으로 수집하고 시각화하는 웹 서비스입니다.

- 매일 Nexon Open API로 길드원 데이터 자동 수집
- 일별 / 주간 / 월간 경험치·전투력 성장 레이스 제공
- 가입·탈퇴 시 Discord 자동 알림
- 길드 운영진을 위한 관리자 페이지

---

## 주요 기능

### 📊 성장 대시보드
- 일별 / 주간 / 월간 탭 전환
- 경험치 · 전투력 성장 랭킹 (포디움 + 전체 순위)
- 레벨업 정확한 경험치 계산 (260~300 레벨 테이블 기반)

### 👥 길드원 현황
- 전체 길드원 목록 (닉네임 / 직업 / 레벨 필터)
- 개인 프로필 페이지 (성장 추이 차트)
- [MapleScout](https://maplescouter.com) 외부 링크 연동

### 📡 Discord 자동 알림
- 가입 · 탈퇴 실시간 감지 알림 (5분마다)
- 15일 이상 미접속 길드원 알림 (매일)
- 주간 인원 변동 리포트 (매주 목요일)

### 🛠️ 관리자 페이지 (`/admin/{secret}`)
- 거울 · 달라 길드원 직위 · 이름 · 비고 관리
- 가입 / 탈퇴 / 길드 이전 처리
- 배치 자동 이탈 감지 표시 (삭제 없이 관리자 확인 후 처리)
- 데이터 백업 · 복원

---

## 배치 스케줄

GitHub Actions + **cron-job.org** 외부 트리거로 정확한 주기 실행

| 배치 | 주기 | KST | 역할 |
|------|------|-----|------|
| 길드원 모니터링 | 5분마다 | - | 거울/달라 가입·탈퇴 감지 + Discord 알림 |
| 오늘 실시간 수집 | 30분마다 | - | 거울 오늘 스냅샷 수집 |
| 전날 결산 수집 | 매일 + 30분 재시도 | 00:05 | 거울 전날 최종 스냅샷 |
| 미접속 알림 | 매일 | 07:00 | 거울/달라 장기 미접속 Discord 알림 |
| 주간 리포트 | 매주 목요일 | 09:00 | 거울/달라 주간 리포트 Discord 발송 |

> cron-job.org 설정 방법 → [docs/cron-setup.md](docs/cron-setup.md)

---

## 로컬 실행

```bash
# 패키지 설치
npm install

# 환경변수 설정
# .env.local 파일 생성 후 아래 값 입력

# 개발 서버 실행
npx next dev -p 3333

# 데이터 수집
npx tsx scripts/collect.ts

# 빌드
npx next build
```

---

## 환경변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `NEXON_API_KEY` | ✅ | Nexon Open API Key |
| `DISCORD_WEBHOOK_URL` | - | Discord 알림 웹훅 URL |
| `ADMIN_SECRET` | - | 관리자 페이지 접근 키 (`/admin/{키}`) |
| `GUILD_NAME` | - | 길드명 (기본값: 거울) |
| `WORLD_NAME` | - | 월드명 (기본값: 스카니아) |

---

## GitHub Secrets 등록

| Secret | 설명 |
|--------|------|
| `NEXON_API_KEY` | Nexon API Key |
| `DISCORD_WEBHOOK_URL` | Discord 웹훅 URL |
| `ADMIN_SECRET` | 관리자 페이지 키 |

---

## 스크립트 목록

| 스크립트 | 설명 |
|---------|------|
| `scripts/collect.ts` | 거울 전날 결산 수집 |
| `scripts/collect-today.ts` | 거울 오늘 실시간 수집 |
| `scripts/collect-dalla.ts` | 달라 초기 데이터 수집 (1회) |
| `scripts/init-admin.ts` | admin.json 초기화 (1회) |
| `scripts/setup-cron-jobs.ts` | cron-job.org 자동 등록 |
| `scripts/batch-member-change.ts` | 가입/탈퇴 감지 배치 |
| `scripts/batch-inactive.ts` | 미접속 알림 배치 |
| `scripts/batch-weekly-report.ts` | 주간 리포트 배치 |

---

## 기술 스택

- **Frontend**: Next.js 16 (App Router) · TypeScript · Tailwind CSS · Recharts
- **Storage**: JSON 파일 (DB 없음)
- **배포**: Vercel
- **배치**: GitHub Actions + cron-job.org
- **API**: Nexon Open API · Discord Webhook
