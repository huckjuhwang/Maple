/**
 * 배치 2: 미접속 감지 (매일 오전 7시)
 *
 * 실행: npx tsx scripts/batch-inactive.ts
 * GitHub Actions: cron '0 22 * * *' (UTC 22시 = KST 오전 7시)
 *
 * API 호출: 0회 (스냅샷 데이터만 사용)
 * 15일+ 미접속자만 알림
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

config({ path: path.join(__dirname, '..', '.env.local') });

import {
  detectInactive, buildInactiveEmbed, sendDiscordAlert,
} from '../src/features/guild-monitor/monitor';
import { getInactiveExclusions } from '../src/features/admin/storage';

const GUILD_NAME = process.env.GUILD_NAME ?? '거울';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const SNAPSHOTS_DIR = path.join(process.cwd(), 'data', 'snapshots');

function loadAllSnapshots() {
  if (!fs.existsSync(SNAPSHOTS_DIR)) return [];
  const files = fs.readdirSync(SNAPSHOTS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort(); // 날짜순

  return files.map(f => {
    const data = JSON.parse(fs.readFileSync(path.join(SNAPSHOTS_DIR, f), 'utf-8'));
    return { date: data.date, members: data.members };
  });
}

async function main() {
  console.log(`\n💤 미접속 감지 (${new Date().toISOString()})\n`);

  const snapshots = loadAllSnapshots();
  console.log(`스냅샷: ${snapshots.length}일치`);

  if (snapshots.length < 2) {
    console.log('스냅샷 부족 (최소 2일 필요) → 스킵');
    return;
  }

  const allAlerts = detectInactive(snapshots);
  console.log(`15일+ 미접속 (전체): ${allAlerts.length}명`);

  // 미접속 사유 입력된 멤버 제외
  const excluded = getInactiveExclusions();
  const alerts = allAlerts.filter(a => !excluded.has(a.name));
  const skipped = allAlerts.filter(a => excluded.has(a.name));

  if (skipped.length > 0) {
    console.log(`사유 입력으로 제외: ${skipped.length}명`);
    skipped.forEach(a => console.log(`  ⏭️ ${a.name} · ${a.days}일째 (사유 있음)`));
  }

  console.log(`알림 대상: ${alerts.length}명`);

  if (alerts.length === 0) {
    console.log('미접속자 없음 🎉');
    return;
  }

  alerts.forEach(a => {
    console.log(`  🔴 ${a.name} · ${a.days}일째 · Lv.${a.level ?? '?'}`);
  });

  // 디스코드 알림
  if (WEBHOOK_URL) {
    const embed = buildInactiveEmbed(alerts, GUILD_NAME);
    const sent = await sendDiscordAlert(WEBHOOK_URL, embed);
    console.log(sent ? '\n✅ 디스코드 알림 발송' : '\n❌ 디스코드 발송 실패');
  } else {
    console.log('\n⚠️ DISCORD_WEBHOOK_URL 미설정 → 알림 스킵');
  }

  console.log('');
}

main().catch(console.error);
