/**
 * latest.json → admin.json 초기화
 * 수집된 데이터를 관리 페이지 데이터로 변환
 *
 * 실행: npx tsx scripts/init-admin.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '..', 'data');
const LATEST_FILE = path.join(DATA_DIR, 'latest.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');

function main() {
  if (!fs.existsSync(LATEST_FILE)) {
    console.log('❌ data/latest.json 없음. 먼저 npx tsx scripts/collect.ts 실행하세요.');
    process.exit(1);
  }

  const latest = JSON.parse(fs.readFileSync(LATEST_FILE, 'utf-8'));
  const today = new Date().toISOString().split('T')[0];

  console.log(`🍄 admin.json 초기화 (${latest.members.length}명)\n`);

  const members = latest.members.map((m: any) => ({
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

  const adminData = {
    config: {
      positions: ['거울', '세계', '조각', '파편', '모래', '먼지', '사유'],
      lastUpdated: new Date().toISOString(),
    },
    mirror: members,
    dalla: [],
    left: [],
  };

  fs.writeFileSync(ADMIN_FILE, JSON.stringify(adminData, null, 2));
  console.log(`✅ admin.json 생성 완료 (${members.length}명)`);
  console.log(`📁 ${ADMIN_FILE}\n`);
}

main();
