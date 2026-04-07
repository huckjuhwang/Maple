/**
 * 길드원 전원 데이터 수집 스크립트
 *
 * 실행: npx tsx scripts/collect.ts
 *
 * data/
 *   members.json          ← 길드원 목록 + ocid 캐시
 *   snapshots/
 *     2026-04-06.json     ← 일별 스냅샷
 *     2026-04-07.json
 *     ...
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// .env.local 자동 로드
config({ path: path.join(__dirname, '..', '.env.local') });

const BASE_URL = 'https://open.api.nexon.com/maplestory/v1';
const API_KEY = process.env.NEXON_API_KEY;
if (!API_KEY) {
  console.error('❌ NEXON_API_KEY 환경변수가 설정되지 않았습니다.');
  console.error('   .env.local 파일에 NEXON_API_KEY=xxx 를 추가하세요.');
  process.exit(1);
}
const GUILD_NAME = process.env.GUILD_NAME ?? '거울';
const WORLD_NAME = process.env.WORLD_NAME ?? '스카니아';
const DATA_DIR = path.join(__dirname, '..', 'data');
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'snapshots');

// Rate Limiter
let lastCall = 0;
async function apiCall(url: string) {
  const now = Date.now();
  const wait = 210 - (now - lastCall);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();

  const res = await fetch(url, {
    headers: { 'x-nxopen-api-key': API_KEY },
  });
  if (!res.ok) {
    const err = await res.text();
    // 데이터 준비 중 에러 → 상위로 타입 구분 가능하게 던짐
    if (err.includes('OPENAPI00009')) throw Object.assign(new Error('NOT_READY'), { code: 'NOT_READY' });
    throw new Error(`API ${res.status}: ${err}`);
  }
  return res.json();
}

function getYesterday(): string {
  // KST(UTC+9) 기준 어제 날짜
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setDate(kst.getDate() - 1);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface MemberCache {
  characterName: string;
  ocid: string;
}

interface MemberSnapshot {
  characterName: string;
  job: string;
  level: number;
  exp: number;
  expRate: number;
  combatPower: number;
  unionLevel: number;
  arcaneForce: number;
  authenticForce: number;
  characterImage: string;
}

async function main() {
  // 디렉토리 생성
  fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

  const date = getYesterday();

  // 이미 수집된 날짜면 스킵
  const snapshotFile = path.join(SNAPSHOTS_DIR, `${date}.json`);
  if (fs.existsSync(snapshotFile)) {
    const existing = JSON.parse(fs.readFileSync(snapshotFile, 'utf-8'));
    if ((existing.members?.length ?? 0) > 0) {
      console.log(`✅ ${date} 데이터 이미 존재 (${existing.members.length}명) → 스킵`);
      process.exit(0);
    }
  }

  console.log(`\n🍄 거울 길드 데이터 수집 시작 (${date})\n`);

  // 1. 길드 ID 조회 (데이터 준비 여부 probe)
  console.log('1️⃣  길드 ID 조회...');
  let guildIdData: any;
  try {
    guildIdData = await apiCall(
      `${BASE_URL}/guild/id?guild_name=${encodeURIComponent(GUILD_NAME)}&world_name=${encodeURIComponent(WORLD_NAME)}`
    );
  } catch (e: any) {
    if (e.code === 'NOT_READY') {
      console.log(`⏳ ${date} 데이터 아직 준비 중 (OPENAPI00009) → 다음 시도까지 대기`);
      process.exit(0);
    }
    throw e;
  }
  const oguildId = guildIdData.oguild_id;
  console.log(`   oguild_id: ${oguildId}`);

  // 2. 길드 기본 정보
  console.log('2️⃣  길드 멤버 목록 조회...');
  const guild = await apiCall(
    `${BASE_URL}/guild/basic?oguild_id=${oguildId}&date=${date}`
  );
  const memberNames: string[] = guild.guild_member;
  console.log(`   멤버 수: ${memberNames.length}명`);

  // 3. ocid 캐시 로드/생성
  const cacheFile = path.join(DATA_DIR, 'members.json');
  let ocidCache: Record<string, string> = {};
  if (fs.existsSync(cacheFile)) {
    const cached: MemberCache[] = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    for (const m of cached) ocidCache[m.characterName] = m.ocid;
    console.log(`   캐시된 ocid: ${cached.length}개`);
  }

  // 4. 신규 멤버 ocid 조회
  const newMembers = memberNames.filter(n => !ocidCache[n]);
  if (newMembers.length > 0) {
    console.log(`3️⃣  신규 멤버 ocid 조회 (${newMembers.length}명)...`);
    for (let i = 0; i < newMembers.length; i++) {
      try {
        const data = await apiCall(
          `${BASE_URL}/id?character_name=${encodeURIComponent(newMembers[i])}`
        );
        ocidCache[newMembers[i]] = data.ocid;
        if ((i + 1) % 20 === 0) {
          console.log(`   ${i + 1}/${newMembers.length} ocid 조회 완료`);
        }
      } catch (e) {
        console.log(`   ❌ ${newMembers[i]}: ocid 조회 실패`);
      }
    }
  }

  // ocid 캐시 저장
  const membersList: MemberCache[] = memberNames
    .filter(n => ocidCache[n])
    .map(n => ({ characterName: n, ocid: ocidCache[n] }));
  fs.writeFileSync(cacheFile, JSON.stringify(membersList, null, 2));
  console.log(`   ocid 캐시 저장: ${membersList.length}명`);

  // 5. 멤버별 데이터 수집
  console.log(`4️⃣  멤버 데이터 수집 시작 (${membersList.length}명)...`);
  console.log(`   예상 소요: ~${Math.ceil(membersList.length * 4 * 0.21 / 60)}분\n`);

  const snapshots: MemberSnapshot[] = [];
  let success = 0;
  let fail = 0;
  const startTime = Date.now();

  for (let i = 0; i < membersList.length; i++) {
    const { characterName, ocid } = membersList[i];
    try {
      // basic
      const basic = await apiCall(
        `${BASE_URL}/character/basic?ocid=${ocid}&date=${date}`
      );
      // stat
      const stat = await apiCall(
        `${BASE_URL}/character/stat?ocid=${ocid}&date=${date}`
      );
      // symbol
      const symbol = await apiCall(
        `${BASE_URL}/character/symbol-equipment?ocid=${ocid}&date=${date}`
      );
      // union
      const union = await apiCall(
        `${BASE_URL}/user/union?ocid=${ocid}&date=${date}`
      );

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
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const pct = ((i + 1) / membersList.length * 100).toFixed(0);
      process.stdout.write(`\r   🍄 ${i + 1}/${membersList.length} (${pct}%) | ✅${success} ❌${fail} | ${elapsed}s`);

    } catch (e) {
      fail++;
      process.stdout.write(`\r   🍄 ${i + 1}/${membersList.length} | ✅${success} ❌${fail} | ${characterName} 실패`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n✅ 수집 완료! ${success}명 성공, ${fail}명 실패 (${totalTime}초)\n`);

  // 6. 스냅샷 저장
  // 전투력 내림차순 정렬
  snapshots.sort((a, b) => b.combatPower - a.combatPower);

  const snapshotFile = path.join(SNAPSHOTS_DIR, `${date}.json`);
  const snapshotData = {
    date,
    guildName: GUILD_NAME,
    worldName: WORLD_NAME,
    guildLevel: guild.guild_level,
    masterName: guild.guild_master_name,
    memberCount: guild.guild_member_count,
    collectedCount: snapshots.length,
    collectedAt: new Date().toISOString(),
    members: snapshots,
  };

  fs.writeFileSync(snapshotFile, JSON.stringify(snapshotData, null, 2));
  console.log(`📁 스냅샷 저장: ${snapshotFile}`);
  console.log(`   파일 크기: ${(fs.statSync(snapshotFile).size / 1024).toFixed(1)}KB`);

  // 7. 최신 데이터를 latest.json에도 복사
  fs.writeFileSync(
    path.join(DATA_DIR, 'latest.json'),
    JSON.stringify(snapshotData, null, 2)
  );
  console.log(`📁 latest.json 업데이트 완료`);

  console.log(`\n🐌 완료! API 호출 약 ${1 + membersList.length + success * 4}회 사용\n`);
}

main().catch(console.error);
