/**
 * 달라 길드원 초기 데이터 수집
 * admin.json의 dalla 멤버에 레벨/직업/전투력/유니온 채우기
 *
 * 실행: npx tsx scripts/collect-dalla.ts
 * API 호출: ~176명 × 3회 ≈ 528회 (약 2분 소요)
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

config({ path: path.join(__dirname, '..', '.env.local') });

const BASE_URL = 'https://open.api.nexon.com/maplestory/v1';
const API_KEY = process.env.NEXON_API_KEY;
if (!API_KEY) { console.error('❌ NEXON_API_KEY 필요'); process.exit(1); }

const DATA_DIR = path.join(__dirname, '..', 'data');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const CACHE_FILE = path.join(DATA_DIR, 'members.json');

let lastCall = 0;
async function apiCall(url: string) {
  const now = Date.now();
  const wait = 210 - (now - lastCall);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();
  const res = await fetch(url, { headers: { 'x-nxopen-api-key': API_KEY! } });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

function getYesterday(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  kst.setDate(kst.getDate() - 1);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function main() {
  if (!fs.existsSync(ADMIN_FILE)) {
    console.error('❌ data/admin.json 없음. 먼저 npx tsx scripts/init-admin.ts 실행하세요.');
    process.exit(1);
  }

  const adminData = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf-8'));
  const dallaMembers = adminData.dalla as any[];
  const date = getYesterday();

  console.log(`\n🍄 달라 길드원 데이터 수집 시작 (${dallaMembers.length}명, 기준일: ${date})\n`);

  // ocid 캐시 로드
  let ocidCache: Record<string, string> = {};
  if (fs.existsSync(CACHE_FILE)) {
    const cached = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    for (const m of cached) ocidCache[m.characterName] = m.ocid;
    console.log(`캐시된 ocid: ${Object.keys(ocidCache).length}개`);
  }

  // 캐시 없는 달라 멤버 ocid 조회
  const noCache = dallaMembers.filter(m => !ocidCache[m.characterName]);
  if (noCache.length > 0) {
    console.log(`ocid 조회 (${noCache.length}명)...`);
    for (let i = 0; i < noCache.length; i++) {
      try {
        const data = await apiCall(`${BASE_URL}/id?character_name=${encodeURIComponent(noCache[i].characterName)}`);
        ocidCache[noCache[i].characterName] = data.ocid;
        if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${noCache.length} 완료`);
      } catch {
        console.log(`  ❌ ${noCache[i].characterName}: ocid 실패`);
      }
    }
    // 캐시 업데이트 (거울 + 달라 합쳐서 저장)
    const allCached = Object.entries(ocidCache).map(([characterName, ocid]) => ({ characterName, ocid }));
    fs.writeFileSync(CACHE_FILE, JSON.stringify(allCached, null, 2));
  }

  // 멤버별 데이터 수집
  console.log(`\n데이터 수집 시작...`);
  let success = 0;
  let fail = 0;

  for (let i = 0; i < dallaMembers.length; i++) {
    const member = dallaMembers[i];
    const ocid = ocidCache[member.characterName];
    if (!ocid) { fail++; continue; }

    try {
      const [basic, stat, union] = await Promise.all([
        apiCall(`${BASE_URL}/character/basic?ocid=${ocid}&date=${date}`),
        apiCall(`${BASE_URL}/character/stat?ocid=${ocid}&date=${date}`),
        apiCall(`${BASE_URL}/user/union?ocid=${ocid}&date=${date}`),
      ]);

      member.job = basic.character_class;
      member.level = basic.character_level;
      member.combatPower = parseInt(
        stat.final_stat?.find((s: any) => s.stat_name === '전투력')?.stat_value ?? '0'
      );
      member.unionLevel = union.union_level;
      success++;
    } catch {
      fail++;
    }

    if ((i + 1) % 20 === 0) {
      console.log(`  ${i + 1}/${dallaMembers.length} 처리 (성공 ${success}, 실패 ${fail})`);
    }
  }

  fs.writeFileSync(ADMIN_FILE, JSON.stringify(adminData, null, 2));
  console.log(`\n✅ 완료: 성공 ${success}명, 실패 ${fail}명`);
  console.log(`📁 ${ADMIN_FILE}\n`);
}

main().catch(console.error);
