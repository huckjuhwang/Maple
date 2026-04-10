/**
 * 배치 3: 주간 리포트 (매주 월요일 오전 9시)
 *
 * 실행: npx tsx scripts/batch-weekly-report.ts
 * GitHub Actions: cron '0 0 * * 1' (UTC 0시 = KST 오전 9시, 월요일)
 *
 * API 호출: 0회 (changeLog 데이터 사용)
 * 지난 7일간 가입/탈퇴 요약
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

config({ path: path.join(__dirname, '..', '.env.local') });

import {
  loadState, buildWeeklyReportEmbed, sendDiscordAlert,
  detectInactive,
  type WeeklyReportData,
} from '../src/features/guild-monitor/monitor';
import { getInactiveExclusions } from '../src/features/admin/storage';

const GUILD_NAME = process.env.GUILD_NAME ?? '거울';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const SNAPSHOTS_DIR = path.join(process.cwd(), 'data', 'snapshots');

function loadSnapshots() {
  if (!fs.existsSync(SNAPSHOTS_DIR)) return [];
  return fs.readdirSync(SNAPSHOTS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(SNAPSHOTS_DIR, f), 'utf-8'));
      return { date: data.date, members: data.members };
    });
}

async function main() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  console.log(`\n📊 주간 리포트 (${startStr} ~ ${endStr})\n`);

  // 1. changeLog에서 이번 주 가입/탈퇴 추출
  const state = loadState();
  const weekJoins = (state?.changeLog ?? []).filter(l => l.type === 'join' && l.date >= startStr && l.date <= endStr);
  const weekLeaves = (state?.changeLog ?? []).filter(l => l.type === 'leave' && l.date >= startStr && l.date <= endStr);

  const currentCount = state?.members.length ?? 0;
  const prevCount = currentCount - weekJoins.length + weekLeaves.length;

  console.log(`가입: ${weekJoins.length}명, 탈퇴: ${weekLeaves.length}명`);
  console.log(`현재 ${currentCount}명 (전주 대비 ${currentCount - prevCount >= 0 ? '+' : ''}${currentCount - prevCount})`);

  // 2. 미접속자 수 (사유 입력된 멤버 제외)
  const snapshots = loadSnapshots();
  const allInactive = snapshots.length >= 2 ? detectInactive(snapshots) : [];
  const excluded = getInactiveExclusions();
  const inactiveAlerts = allInactive.filter(a => !excluded.has(a.name));

  // 3. 리포트 생성 + 발송
  const reportData: WeeklyReportData = {
    period: `${startStr} ~ ${endStr}`,
    guildName: GUILD_NAME,
    currentCount,
    prevCount,
    joins: weekJoins,
    leaves: weekLeaves,
    inactiveCount: inactiveAlerts.length,
  };

  if (WEBHOOK_URL) {
    const embed = buildWeeklyReportEmbed(reportData);
    const sent = await sendDiscordAlert(WEBHOOK_URL, embed);
    console.log(sent ? '\n✅ 디스코드 주간 리포트 발송' : '\n❌ 디스코드 발송 실패');
  } else {
    console.log('\n⚠️ DISCORD_WEBHOOK_URL 미설정 → 알림 스킵');
  }

  console.log('');
}

main().catch(console.error);
