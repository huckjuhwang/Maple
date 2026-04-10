# 배치 스케줄 설정 가이드 (cron-job.org)

GitHub Actions 내장 cron은 고빈도 스케줄(5분, 10분)이 불안정해서
외부 cron 서비스(cron-job.org)로 GitHub API를 직접 호출합니다.

---

## 사전 준비: GitHub Personal Access Token 발급

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **Generate new token (classic)** 클릭
3. 설정:
   - Note: `maple-cron-trigger`
   - Expiration: No expiration (또는 원하는 기간)
   - Scope: **`workflow`** 체크 (Actions 워크플로우 실행 권한)
4. 토큰 복사 (다시 볼 수 없으므로 바로 저장)

---

## cron-job.org 설정

1. [cron-job.org](https://cron-job.org) 가입 (무료)
2. **CREATE CRONJOB** 클릭
3. 아래 5개 Job 생성

---

## Job 설정 공통 항목

| 항목 | 값 |
|------|-----|
| Request Method | **POST** |
| Header 추가 1 | `Authorization` → `Bearer {발급한_토큰}` |
| Header 추가 2 | `Accept` → `application/vnd.github.v3+json` |
| Header 추가 3 | `Content-Type` → `application/json` |
| Request Body | `{"ref":"main"}` |

---

## Job 1: 길드원 모니터링 (5분마다)

| 항목 | 값 |
|------|-----|
| Title | `거울 길드 모니터링` |
| URL | `https://api.github.com/repos/huckjuhwang/Maple/actions/workflows/monitor.yml/dispatches` |
| Schedule | **Every 5 minutes** |

---

## Job 2: 오늘 실시간 수집 (30분마다)

| 항목 | 값 |
|------|-----|
| Title | `거울 오늘 실시간 수집` |
| URL | `https://api.github.com/repos/huckjuhwang/Maple/actions/workflows/collect-today.yml/dispatches` |
| Schedule | **Every 30 minutes** |

---

## Job 3: 전날 결산 수집 (매일 KST 10:05 = UTC 01:05)

| 항목 | 값 |
|------|-----|
| Title | `거울 전날 결산 수집` |
| URL | `https://api.github.com/repos/huckjuhwang/Maple/actions/workflows/collect.yml/dispatches` |
| Schedule | **Every day** at **01:05 UTC** |

---

## Job 4: 미접속 알림 (매일 KST 07:00 = UTC 22:00 전날)

| 항목 | 값 |
|------|-----|
| Title | `거울/달라 미접속 알림` |
| URL | `https://api.github.com/repos/huckjuhwang/Maple/actions/workflows/inactive.yml/dispatches` |
| Schedule | **Every day** at **22:00 UTC** |

---

## Job 5: 주간 리포트 (매주 월요일 KST 09:00 = UTC 00:00)

| 항목 | 값 |
|------|-----|
| Title | `거울/달라 주간 리포트` |
| URL | `https://api.github.com/repos/huckjuhwang/Maple/actions/workflows/weekly-report.yml/dispatches` |
| Schedule | **Every week** 월요일 **00:00 UTC** |

---

## 확인 방법

- cron-job.org 대시보드에서 각 Job의 **Last execution** 확인
- GitHub → Actions 탭에서 `Manually run by github-actions-bot` 형태로 실행 기록 확인

---

## 전체 배치 일정 요약

| 배치 | 주기 | KST 기준 | 역할 |
|------|------|---------|------|
| `monitor.yml` | 5분마다 | - | 거울/달라 가입·탈퇴 감지, admin.json 업데이트 |
| `collect-today.yml` | 30분마다 | - | 거울 오늘 실시간 스냅샷 수집 |
| `collect.yml` | 매일 1회 | 10:05 | 거울 전날 결산 스냅샷 수집 |
| `inactive.yml` | 매일 1회 | 07:00 | 거울/달라 장기 미접속 Discord 알림 |
| `weekly-report.yml` | 매주 월 | 09:00 | 거울/달라 주간 리포트 Discord 발송 |
