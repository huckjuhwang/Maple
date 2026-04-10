/**
 * latest.json → admin.json 초기화 (거울 + 달라 길드)
 * 수집된 데이터를 관리 페이지 데이터로 변환
 *
 * 실행: npx tsx scripts/init-admin.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

config({ path: path.join(__dirname, '..', '.env.local') });

const DATA_DIR = path.join(__dirname, '..', 'data');
const LATEST_FILE = path.join(DATA_DIR, 'latest.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');

const API_KEY = process.env.NEXON_API_KEY;
const WORLD_NAME = process.env.WORLD_NAME ?? '스카니아';
const BASE_URL = 'https://open.api.nexon.com/maplestory/v1';

async function fetchGuildMembers(guildName: string): Promise<string[]> {
  if (!API_KEY) return [];
  try {
    const idRes = await fetch(
      `${BASE_URL}/guild/id?guild_name=${encodeURIComponent(guildName)}&world_name=${encodeURIComponent(WORLD_NAME)}`,
      { headers: { 'x-nxopen-api-key': API_KEY } }
    );
    if (!idRes.ok) return [];
    const { oguild_id } = await idRes.json();
    const guildRes = await fetch(
      `${BASE_URL}/guild/basic?oguild_id=${oguild_id}`,
      { headers: { 'x-nxopen-api-key': API_KEY } }
    );
    if (!guildRes.ok) return [];
    const guild = await guildRes.json();
    return guild.guild_member ?? [];
  } catch {
    return [];
  }
}

async function main() {
  if (!fs.existsSync(LATEST_FILE)) {
    console.log('❌ data/latest.json 없음. 먼저 npx tsx scripts/collect.ts 실행하세요.');
    process.exit(1);
  }

  const latest = JSON.parse(fs.readFileSync(LATEST_FILE, 'utf-8'));
  const today = new Date().toISOString().split('T')[0];

  // 거울 길드원: latest.json 사용
  const mirrorMembers = latest.members.map((m: any) => ({
    characterName: m.characterName,
    guild: 'mirror',
    position: '',
    mainCharacter: '',
    realName: '',
    note: '',
    inactiveReason: '',
    fromMirror: '',
    memoHistory: [],
    job: m.job,
    level: m.level,
    combatPower: m.combatPower,
    unionLevel: m.unionLevel,
    status: 'active',
    joinDate: today,
  }));

  console.log(`🍄 거울 길드: ${mirrorMembers.length}명`);

  // 달라 길드원: API 호출
  let dallaMembers: any[] = [];
  if (API_KEY) {
    console.log('📡 달라 길드원 API 조회 중...');
    const dallaNames = await fetchGuildMembers('달라');
    dallaMembers = dallaNames.map((name: string) => ({
      characterName: name,
      guild: 'dalla',
      position: '',
      mainCharacter: '',
      realName: '',
      note: '',
      inactiveReason: '',
      fromMirror: '',
      memoHistory: [],
      status: 'new',
      joinDate: today,
    }));
    console.log(`🍄 달라 길드: ${dallaMembers.length}명`);
  } else {
    console.log('⚠️ NEXON_API_KEY 없음 → 달라 길드원 스킵');
  }

  // 기존 admin.json이 있으면 달라 데이터만 추가 (거울은 덮어쓰지 않음)
  if (fs.existsSync(ADMIN_FILE)) {
    const existing = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf-8'));
    if (dallaMembers.length > 0) {
      const existingNames = new Set(existing.dalla.map((m: any) => m.characterName));
      const newDalla = dallaMembers.filter((m: any) => !existingNames.has(m.characterName));
      existing.dalla = [...existing.dalla, ...newDalla];
      fs.writeFileSync(ADMIN_FILE, JSON.stringify(existing, null, 2));
      console.log(`\n✅ 달라 ${newDalla.length}명 추가 완료 (기존 데이터 보존)`);
    }
    return;
  }

  const adminData = {
    config: {
      positions: ['거울', '세계', '조각', '파편', '모래', '먼지', '사유'],
      masterPosition: '거울',
      lastUpdated: new Date().toISOString(),
    },
    mirror: mirrorMembers,
    dalla: dallaMembers,
    left: [],
  };

  fs.writeFileSync(ADMIN_FILE, JSON.stringify(adminData, null, 2));
  console.log(`\n✅ admin.json 생성 완료 (거울 ${mirrorMembers.length}명 + 달라 ${dallaMembers.length}명)`);
  console.log(`📁 ${ADMIN_FILE}\n`);
}

main().catch(console.error);
