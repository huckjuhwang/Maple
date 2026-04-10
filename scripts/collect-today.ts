/**
 * 오늘 날짜 실시간 데이터 수집 스크립트
 *
 * 실행: npx tsx scripts/collect-today.ts
 *
 * - 오늘 날짜로 API 호출 (경험치 실시간)
 * - data/snapshots/YYYY-MM-DD.json 저장
 * - data/latest.json 업데이트
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

config({ path: path.join(__dirname, '..', '.env.local') });

const BASE_URL = 'https://open.api.nexon.com/maplestory/v1';
const API_KEY = process.env.NEXON_API_KEY;
if (!API_KEY) {
  console.error('❌ NEXON_API_KEY 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}
const DATA_DIR = path.join(__dirname, '..', 'data');
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'snapshots');

let lastCall = 0;
async function apiCall(url: string) {
  const now = Date.now();
  const wait = 210 - (now - lastCall);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();
  const res = await fetch(url, { headers: { 'x-nxopen-api-key': API_KEY } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function getToday(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface MemberCache { characterName: string; ocid: string; }

async function main() {
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

  const date = getToday();
  console.log(`\n🍄 거울 길드 오늘 데이터 수집 (${date})\n`);

  const cacheFile = path.join(DATA_DIR, 'members.json');
  if (!fs.existsSync(cacheFile)) {
    console.error('❌ members.json 없음. 먼저 npx tsx scripts/collect.ts 실행하세요.');
    process.exit(1);
  }
  const membersList: MemberCache[] = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
  console.log(`캐시된 멤버: ${membersList.length}명`);
  console.log(`예상 소요: ~${Math.ceil(membersList.length * 4 * 0.21 / 60)}분\n`);

  const snapshots: any[] = [];
  let success = 0, fail = 0;
  const startTime = Date.now();

  for (let i = 0; i < membersList.length; i++) {
    const { characterName, ocid } = membersList[i];
    try {
      // 날짜 파라미터 없이 호출 → 실시간 데이터
      const basic = await apiCall(`${BASE_URL}/character/basic?ocid=${ocid}`);
      const stat = await apiCall(`${BASE_URL}/character/stat?ocid=${ocid}`);
      const symbol = await apiCall(`${BASE_URL}/character/symbol-equipment?ocid=${ocid}`);
      const union = await apiCall(`${BASE_URL}/user/union?ocid=${ocid}`);

      const combatPower = parseInt(
        stat.final_stat?.find((s: any) => s.stat_name === '전투력')?.stat_value ?? '0'
      );
      const arcaneForce = (symbol.symbol ?? [])
        .filter((s: any) => s.symbol_name?.includes('아케인'))
        .reduce((sum: number, s: any) => sum + parseInt(s.symbol_force ?? '0'), 0);
      const authenticForce = (symbol.symbol ?? [])
        .filter((s: any) => s.symbol_name?.includes('어센틱') || s.symbol_name?.includes('그랜드'))
        .reduce((sum: number, s: any) => sum + parseInt(s.symbol_force ?? '0'), 0);

      snapshots.push({
        characterName: basic.character_name,
        job: basic.character_class,
        level: basic.character_level,
        exp: basic.character_exp,
        expRate: parseFloat(basic.character_exp_rate ?? '0'),
        combatPower,
        unionLevel: union.union_level ?? 0,
        arcaneForce,
        authenticForce,
        characterImage: basic.character_image,
      });
      success++;
    } catch {
      fail++;
    }
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const pct = ((i + 1) / membersList.length * 100).toFixed(0);
    process.stdout.write(`\r   🍄 ${i + 1}/${membersList.length} (${pct}%) | ✅${success} ❌${fail} | ${elapsed}s`);
  }

  // 기존 스냅샷 있으면 전투력만 높은 쪽으로 유지 (사냥 셋팅 방어)
  const snapshotFile = path.join(SNAPSHOTS_DIR, `${date}.json`);
  if (fs.existsSync(snapshotFile)) {
    try {
      const existing = JSON.parse(fs.readFileSync(snapshotFile, 'utf-8'));
      const existingCpMap = new Map<string, number>(
        (existing.members ?? []).map((m: any) => [m.characterName, m.combatPower ?? 0])
      );
      for (const s of snapshots) {
        const prevCp = existingCpMap.get(s.characterName) ?? 0;
        if (prevCp > s.combatPower) s.combatPower = prevCp;
      }
    } catch {}
  }

  snapshots.sort((a, b) => b.combatPower - a.combatPower);

  // 길드 메타정보는 기존 latest.json에서 가져옴
  const latestFile = path.join(DATA_DIR, 'latest.json');
  const latestMeta = fs.existsSync(latestFile)
    ? JSON.parse(fs.readFileSync(latestFile, 'utf-8'))
    : {};

  const snapshotData = {
    date,
    guildName: latestMeta.guildName ?? '거울',
    worldName: latestMeta.worldName ?? '스카니아',
    guildLevel: latestMeta.guildLevel,
    masterName: latestMeta.masterName,
    memberCount: latestMeta.memberCount,
    collectedCount: snapshots.length,
    collectedAt: new Date().toISOString(),
    members: snapshots,
  };

  const snapshotFile = path.join(SNAPSHOTS_DIR, `${date}.json`);
  fs.writeFileSync(snapshotFile, JSON.stringify(snapshotData, null, 2));
  fs.writeFileSync(latestFile, JSON.stringify(snapshotData, null, 2));

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n✅ ${date} 수집 완료! ${success}명 성공, ${fail}명 실패 (${totalTime}초)`);
  console.log(`📁 snapshots/${date}.json + latest.json 업데이트\n`);
}

main().catch(console.error);
