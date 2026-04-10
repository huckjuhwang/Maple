/**
 * cron-job.org 자동 설정 스크립트
 *
 * 실행: npx tsx scripts/setup-cron-jobs.ts
 *
 * 필요한 환경변수 (.env.local):
 *   CRONJOB_API_KEY=xxx     ← cron-job.org → Account → API Key
 *   GITHUB_PAT=xxx          ← GitHub → Settings → Developer settings → PAT (workflow 권한)
 */

import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.join(__dirname, '..', '.env.local') });

const CRONJOB_API = 'https://api.cron-job.org';
const CRONJOB_KEY = process.env.CRONJOB_API_KEY;
const GITHUB_PAT = process.env.GITHUB_PAT;
const GITHUB_REPO = 'huckjuhwang/Maple';

if (!CRONJOB_KEY) { console.error('❌ CRONJOB_API_KEY 없음 (.env.local에 추가)'); process.exit(1); }
if (!GITHUB_PAT) { console.error('❌ GITHUB_PAT 없음 (.env.local에 추가)'); process.exit(1); }

const DISPATCH_BASE = `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows`;

const GITHUB_HEADERS = {
  Authorization: `Bearer ${GITHUB_PAT}`,
  Accept: 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
};

const GITHUB_BODY = '{"ref":"main"}';

// cron-job.org 스케줄 형식
// hours/minutes: -1 = 매번, 특정 값 = 해당 시각만
// wdays: 0=일 1=월 2=화 ... 6=토, -1=매일
const JOBS = [
  {
    title: '🔍 거울/달라 모니터링 (5분)',
    url: `${DISPATCH_BASE}/monitor.yml/dispatches`,
    schedule: {
      timezone: 'Asia/Seoul',
      hours: [-1],
      mdays: [-1],
      minutes: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
      months: [-1],
      wdays: [-1],
    },
  },
  {
    title: '🍄 거울 오늘 실시간 수집 (30분)',
    url: `${DISPATCH_BASE}/collect-today.yml/dispatches`,
    schedule: {
      timezone: 'Asia/Seoul',
      hours: [-1],
      mdays: [-1],
      minutes: [0, 30],
      months: [-1],
      wdays: [-1],
    },
  },
  {
    title: '🍄 거울 전날 결산 수집 (매일 00:05 KST)',
    url: `${DISPATCH_BASE}/collect.yml/dispatches`,
    schedule: {
      timezone: 'Asia/Seoul',
      hours: [0],
      mdays: [-1],
      minutes: [5],
      months: [-1],
      wdays: [-1],
    },
  },
  {
    title: '🍄 거울 전날 결산 재시도 (30분마다, 실패 시 스킵)',
    url: `${DISPATCH_BASE}/collect.yml/dispatches`,
    schedule: {
      timezone: 'Asia/Seoul',
      hours: [-1],
      mdays: [-1],
      minutes: [35], // 매시간 35분 (00:05 이후 30분 간격)
      months: [-1],
      wdays: [-1],
    },
  },
  {
    title: '💤 거울/달라 미접속 알림 (매일 07:00 KST)',
    url: `${DISPATCH_BASE}/inactive.yml/dispatches`,
    schedule: {
      timezone: 'Asia/Seoul',
      hours: [7],
      mdays: [-1],
      minutes: [0],
      months: [-1],
      wdays: [-1],
    },
  },
  {
    title: '📊 거울/달라 주간 리포트 (매주 목 09:00 KST)',
    url: `${DISPATCH_BASE}/weekly-report.yml/dispatches`,
    schedule: {
      timezone: 'Asia/Seoul',
      hours: [9],
      mdays: [-1],
      minutes: [0],
      months: [-1],
      wdays: [4], // 목요일
    },
  },
];

async function createJob(job: typeof JOBS[0]) {
  const res = await fetch(`${CRONJOB_API}/jobs`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${CRONJOB_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      job: {
        url: job.url,
        enabled: true,
        title: job.title,
        schedule: job.schedule,
        requestMethod: 1, // POST
        extendedData: {
          headers: GITHUB_HEADERS,
          body: GITHUB_BODY,
        },
      },
    }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  const data = text ? JSON.parse(text) : {};
  return data.jobId;
}

async function listJobs() {
  const res = await fetch(`${CRONJOB_API}/jobs`, {
    headers: { Authorization: `Bearer ${CRONJOB_KEY}` },
  });
  const data = await res.json();
  return data.jobs ?? [];
}

async function deleteJob(jobId: number) {
  await fetch(`${CRONJOB_API}/jobs/${jobId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${CRONJOB_KEY}` },
  });
}

async function main() {
  console.log('\n🍄 cron-job.org 자동 설정 시작\n');

  // 기존 maple 관련 Job 정리
  console.log('기존 Job 확인 중...');
  const existing = await listJobs();
  const mapleJobs = existing.filter((j: any) =>
    j.title?.includes('거울') || j.title?.includes('달라') || j.title?.includes('🍄') || j.title?.includes('🔍') || j.title?.includes('💤') || j.title?.includes('📊')
  );

  if (mapleJobs.length > 0) {
    console.log(`기존 Job ${mapleJobs.length}개 삭제 중...`);
    for (const j of mapleJobs) {
      await deleteJob(j.jobId);
      console.log(`  삭제: ${j.title}`);
      await new Promise(r => setTimeout(r, 2000));
    }
    console.log('삭제 완료, 10초 대기...');
    await new Promise(r => setTimeout(r, 10000));
  }

  // 신규 Job 등록
  console.log('\nJob 등록 중...\n');
  for (const job of JOBS) {
    try {
      const jobId = await createJob(job);
      console.log(`✅ ${job.title} (ID: ${jobId})`);
    } catch (e) {
      console.log(`❌ ${job.title}: ${e}`);
    }
    await new Promise(r => setTimeout(r, 2000)); // 2초 간격
  }

  console.log('\n✅ 완료! cron-job.org 대시보드에서 확인하세요.');
  console.log('   https://cron-job.org/en/members/\n');
}

main().catch(console.error);
