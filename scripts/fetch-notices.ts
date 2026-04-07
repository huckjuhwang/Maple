/**
 * 디스코드 특정 채널 메시지 수집 → data/notices.json 저장
 *
 * 환경변수 필요:
 *   DISCORD_BOT_TOKEN=Bot xxxx   (Discord Developer Portal에서 봇 생성)
 *   DISCORD_NOTICE_CHANNEL_ID=123456789  (공지 채널 ID, 우클릭→ID 복사)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = process.env.DISCORD_NOTICE_CHANNEL_ID;
const LIMIT = 10; // 최근 몇 개 가져올지

interface DiscordMessage {
  id: string;
  content: string;
  timestamp: string;
  author: { username: string; global_name?: string };
}

interface Notice {
  id: string;
  content: string;
  timestamp: string;
  author: string;
}

async function fetchNotices(): Promise<void> {
  if (!BOT_TOKEN || !CHANNEL_ID) {
    console.log('⚠️ DISCORD_BOT_TOKEN 또는 DISCORD_NOTICE_CHANNEL_ID 미설정. 스킵.');
    return;
  }

  const url = `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages?limit=${LIMIT}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`❌ Discord API 오류 ${res.status}: ${err}`);
    return;
  }

  const messages: DiscordMessage[] = await res.json();

  const notices: Notice[] = messages
    .filter(m => m.content.trim().length > 0)
    .map(m => ({
      id: m.id,
      content: m.content,
      timestamp: m.timestamp,
      author: m.author.global_name ?? m.author.username,
    }));

  const outPath = path.join(process.cwd(), 'data', 'notices.json');
  fs.writeFileSync(outPath, JSON.stringify({ notices, fetchedAt: new Date().toISOString() }, null, 2));
  console.log(`✅ 공지 ${notices.length}개 저장 → ${outPath}`);
}

fetchNotices().catch(e => {
  console.error('fetch-notices 실패:', e);
  process.exit(0); // 실패해도 수집 배치 전체를 중단하지 않음
});
