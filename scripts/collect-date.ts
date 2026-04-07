/**
 * 특정 날짜 데이터 수집 스크립트
 *
 * 실행: npx tsx scripts/collect-date.ts 2026-04-05
 *       npx tsx scripts/collect-date.ts 2026-03-30
 *
 * Nexon API는 과거 날짜 조회가 가능하므로
 * 이전 날짜 데이터도 소급 수집 가능!
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

interface MemberCache { characterName: string; ocid: string; }

async function main() {
  const date = process.argv[2];
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.log('사용법: npx tsx scripts/collect-date.ts YYYY-MM-DD');
    process.exit(1);
  }

  const snapshotFile = path.join(SNAPSHOTS_DIR, `${date}.json`);
  if (fs.existsSync(snapshotFile)) {
    console.log(`⚠️ ${date}.json 이미 존재합니다. 스킵.`);
    process.exit(0);
  }

  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  console.log(`\n🍄 거울 길드 데이터 수집 (${date})\n`);

  // ocid 캐시 로드
  const cacheFile = path.join(DATA_DIR, 'members.json');
  if (!fs.existsSync(cacheFile)) {
    console.log('❌ members.json 없음. 먼저 npx tsx scripts/collect.ts 실행하세요.');
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
      const basic = await apiCall(`${BASE_URL}/character/basic?ocid=${ocid}&date=${date}`);
      const stat = await apiCall(`${BASE_URL}/character/stat?ocid=${ocid}&date=${date}`);
      const symbol = await apiCall(`${BASE_URL}/character/symbol-equipment?ocid=${ocid}&date=${date}`);
      const union = await apiCall(`${BASE_URL}/user/union?ocid=${ocid}&date=${date}`);

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

  snapshots.sort((a, b) => b.combatPower - a.combatPower);

  const snapshotData = {
    date,
    guildName: '거울',
    worldName: '스카니아',
    collectedCount: snapshots.length,
    collectedAt: new Date().toISOString(),
    members: snapshots,
  };

  fs.writeFileSync(snapshotFile, JSON.stringify(snapshotData, null, 2));
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n✅ ${date} 수집 완료! ${success}명 성공, ${fail}명 실패 (${totalTime}초)`);
  console.log(`📁 ${snapshotFile}\n`);
}

main().catch(console.error);
