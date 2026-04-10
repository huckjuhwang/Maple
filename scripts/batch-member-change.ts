/**
 * 배치 1: 가입/탈퇴 감지 (5분마다)
 *
 * 실행: npx tsx scripts/batch-member-change.ts
 * GitHub Actions: 매 5분 실행
 *
 * API 호출: 1회 (길드 멤버 목록만)
 * 변동 없으면 알림 안 보냄
 */

import * as path from 'path';
import * as fs from 'fs';
import { config } from 'dotenv';

config({ path: path.join(__dirname, '..', '.env.local') });

import {
  loadState, saveState, detectChanges,
  buildChangeEmbed, sendDiscordAlert,
} from '../src/features/guild-monitor/monitor';
import type { MonitorState, MemberChangeLog } from '../src/features/guild-monitor/monitor';
import { loadAdminData, saveAdminData, syncMembers } from '../src/features/admin/storage';

const API_KEY = process.env.NEXON_API_KEY;
if (!API_KEY) { console.error('❌ NEXON_API_KEY 필요'); process.exit(1); }

const GUILD_NAME = process.env.GUILD_NAME ?? '거울';
const WORLD_NAME = process.env.WORLD_NAME ?? '스카니아';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const BASE_URL = 'https://open.api.nexon.com/maplestory/v1';

// 길드명 → 내부 키 매핑
const GUILD_KEY: Record<string, 'mirror' | 'dalla'> = {
  '거울': 'mirror',
  '달라': 'dalla',
};

async function apiCall(url: string) {
  const res = await fetch(url, { headers: { 'x-nxopen-api-key': API_KEY! } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function main() {
  const now = new Date().toISOString();
  console.log(`\n🔍 가입/탈퇴 감지 [${GUILD_NAME}] (${now})\n`);

  // 1. 현재 길드원 목록 가져오기
  const guildIdData = await apiCall(
    `${BASE_URL}/guild/id?guild_name=${encodeURIComponent(GUILD_NAME)}&world_name=${encodeURIComponent(WORLD_NAME)}`
  );
  const guild = await apiCall(
    `${BASE_URL}/guild/basic?oguild_id=${guildIdData.oguild_id}`
  );

  const currentMembers: string[] = guild.guild_member;
  const currentCount = guild.guild_member_count;
  console.log(`현재 멤버: ${currentCount}명`);

  // 2. 이전 상태 로드
  const state = loadState(GUILD_NAME);

  if (!state) {
    console.log('최초 실행 → 상태 초기화');
    saveState({ lastChecked: now, members: currentMembers, changeLog: [] }, GUILD_NAME);
    console.log('✅ 초기 상태 저장 완료\n');
    return;
  }

  // 3. 변동 감지
  const { leaves, joins } = detectChanges(state.members, currentMembers);

  if (leaves.length === 0 && joins.length === 0) {
    console.log('변동 없음 ✅');
    state.lastChecked = now;
    state.members = currentMembers;
    saveState(state, GUILD_NAME);
    return;
  }

  console.log(`탈퇴: ${leaves.length}명, 가입: ${joins.length}명`);

  // 4. 탈퇴자/가입자 상세 정보 (latest.json 참조)
  const latestPath = path.join(process.cwd(), 'data', 'latest.json');
  let latestMembers: any[] = [];
  try {
    latestMembers = JSON.parse(fs.readFileSync(latestPath, 'utf-8')).members ?? [];
  } catch {}

  const leaveDetails = leaves.map(name => {
    const m = latestMembers.find((m: any) => m.characterName === name);
    return { name, level: m?.level, job: m?.job };
  });
  const joinDetails = joins.map(name => ({ name }));

  // 5. admin.json 동기화 (신규 추가 + 이탈 감지 표시)
  const guildKey = GUILD_KEY[GUILD_NAME];
  if (guildKey) {
    try {
      const adminData = loadAdminData();
      const members = guildKey === 'mirror' ? adminData.mirror : adminData.dalla;
      const apiMemberList = currentMembers.map(name => {
        const m = latestMembers.find((m: any) => m.characterName === name);
        return { characterName: name, job: m?.job ?? '', level: m?.level ?? 0, combatPower: m?.combatPower, unionLevel: m?.unionLevel };
      });
      const { added, left } = syncMembers(members, apiMemberList, guildKey);
      if (added.length > 0) console.log(`📥 admin.json 신규 추가: ${added.join(', ')}`);
      if (left.length > 0) console.log(`⚠️ admin.json 이탈 감지: ${left.join(', ')}`);
      saveAdminData(adminData);
    } catch (e) {
      console.warn('⚠️ admin.json 동기화 실패:', e);
    }
  }

  // 6. 디스코드 알림
  if (WEBHOOK_URL) {
    const embed = buildChangeEmbed(leaveDetails, joinDetails, GUILD_NAME, state.members.length, currentCount);
    const sent = await sendDiscordAlert(WEBHOOK_URL, embed);
    console.log(sent ? '✅ 디스코드 알림 발송' : '❌ 디스코드 발송 실패');
  } else {
    console.log('⚠️ DISCORD_WEBHOOK_URL 미설정 → 알림 스킵');
  }

  // 7. 로그 추가 + 상태 저장
  const today = new Date().toISOString().split('T')[0];
  const newLogs: MemberChangeLog[] = [
    ...leaves.map(name => ({ name, type: 'leave' as const, date: today, ...leaveDetails.find(d => d.name === name) })),
    ...joins.map(name => ({ name, type: 'join' as const, date: today })),
  ];

  state.lastChecked = now;
  state.members = currentMembers;
  state.changeLog = [...state.changeLog, ...newLogs];
  saveState(state, GUILD_NAME);

  console.log('✅ 상태 저장 완료\n');
}

main().catch(console.error);
