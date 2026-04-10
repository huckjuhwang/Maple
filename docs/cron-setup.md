# 배치 스케줄 설정 가이드 (cron-job.org)

GitHub Actions 내장 cron은 고빈도 스케줄(5분, 10분)이 불안정해서
외부 cron 서비스(cron-job.org)로 GitHub API를 직접 호출합니다.

**스크립트로 자동 등록 가능 → 아래 2단계만 하면 됩니다.**

---

## 1단계: 토큰 2개 발급

### GitHub PAT (Personal Access Token)
1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **Generate new token (classic)**
3. Scope: **`workflow`** 체크
4. 토큰 복사 → `.env.local`에 추가:
   ```
   GITHUB_PAT=ghp_xxxxx
   ```

### cron-job.org API Key
1. [cron-job.org](https://cron-job.org) 가입 (무료)
2. 로그인 후 **Account → API** 탭
3. API Key 복사 → `.env.local`에 추가:
   ```
   CRONJOB_API_KEY=xxxxx
   ```

---

## 2단계: 스크립트 실행

```bash
npx tsx scripts/setup-cron-jobs.ts
```

5개 Job이 자동으로 cron-job.org에 등록됩니다.

---

## 확인

- [cron-job.org 대시보드](https://cron-job.org/en/members/) → Job 목록 확인
- GitHub → Actions 탭 → 자동 실행 기록 확인

---

## 전체 배치 일정 요약

| 배치 | 주기 | KST 기준 | 역할 |
|------|------|---------|------|
| `monitor.yml` | 5분마다 | - | 거울/달라 가입·탈퇴 감지, admin.json 업데이트 |
| `collect-today.yml` | 30분마다 | - | 거울 오늘 실시간 스냅샷 수집 |
| `collect.yml` | 매일 1회 | 10:05 | 거울 전날 결산 스냅샷 수집 |
| `inactive.yml` | 매일 1회 | 07:00 | 거울/달라 장기 미접속 Discord 알림 |
| `weekly-report.yml` | 매주 월 | 09:00 | 거울/달라 주간 리포트 Discord 발송 |
