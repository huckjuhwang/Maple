import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
config({ path: path.join(__dirname, '..', '.env.local') });

const API_KEY = process.env.NEXON_API_KEY!;
const BASE = 'https://open.api.nexon.com/maplestory/v1';

let lastCall = 0;
async function call(url: string) {
  const now = Date.now();
  const wait = 210 - (now - lastCall);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();
  const res = await fetch(url, { headers: { 'x-nxopen-api-key': API_KEY } });
  return res.json();
}

async function main() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  kst.setDate(kst.getDate() - 1);
  const date = kst.toISOString().slice(0, 10);
  console.log('조회 날짜:', date);

  const guildId = await call(`${BASE}/guild/id?guild_name=거울&world_name=스카니아`);
  const guild = await call(`${BASE}/guild/basic?oguild_id=${guildId.oguild_id}`);
  const members: string[] = guild.guild_member;
  console.log('API 길드원 수:', members.length);

  const admin = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'admin.json'), 'utf-8'));
  const adminSet = new Set(admin.mirror.map((m: any) => m.characterName));
  const apiSet = new Set(members);

  const inApiNotAdmin = members.filter(n => !adminSet.has(n));
  console.log(`\nAPI에 있는데 admin에 없는 (${inApiNotAdmin.length}명):`);
  inApiNotAdmin.forEach(n => console.log('  +', n));

  const inAdminNotApi = admin.mirror.filter((m: any) => !apiSet.has(m.characterName));
  console.log(`\nadmin에 있는데 API에 없는 (${inAdminNotApi.length}명):`);
  inAdminNotApi.forEach((m: any) => console.log('  -', m.characterName, `(status: ${m.status})`));

  console.log('\n헝헝석 API에 있나:', apiSet.has('헝헝석'));
  console.log('금츔 API에 있나:', apiSet.has('금츔'));
  console.log('\n전체 API 멤버 목록:');
  members.sort().forEach(n => console.log(' ', n));
}

main().catch(console.error);
