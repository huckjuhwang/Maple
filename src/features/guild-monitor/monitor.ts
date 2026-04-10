/**
 * 길드원 모니터링 시스템
 *
 * 배치 1: 가입/탈퇴 감지 (5분마다)
 * 배치 2: 미접속 감지 (매일 오전 7시)
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

// ============================================
// 타입
// ============================================

export interface MemberChangeLog {
  name: string;
  type: 'leave' | 'join';
  date: string;
  level?: number;
  job?: string;
}

export interface MonitorState {
  lastChecked: string;
  members: string[];       // 마지막 확인된 멤버 목록
  changeLog: MemberChangeLog[];  // 가입/탈퇴 이력 (영구 보관)
}

export interface InactiveAlert {
  name: string;
  days: number;
  lastExpChange: string;   // 마지막 경험치 변화일
  level?: number;
  job?: string;
}

// ============================================
// 상태 관리
// ============================================

function getStatePath(): string {
  return path.join(DATA_DIR, 'guild-monitor.json');
}

export function loadState(): MonitorState | null {
  const p = getStatePath();
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

export function saveState(state: MonitorState): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(getStatePath(), JSON.stringify(state, null, 2));
}

// ============================================
// 배치 1: 가입/탈퇴 감지
// ============================================

export function detectChanges(
  prevMembers: string[],
  currentMembers: string[]
): { leaves: string[]; joins: string[] } {
  const prevSet = new Set(prevMembers);
  const currSet = new Set(currentMembers);

  const leaves = prevMembers.filter(name => !currSet.has(name));
  const joins = currentMembers.filter(name => !prevSet.has(name));

  return { leaves, joins };
}

// ============================================
// 배치 2: 미접속 감지 (15일+ 매일 알림)
// ============================================

export function detectInactive(
  snapshots: { date: string; members: any[] }[]
): InactiveAlert[] {
  if (snapshots.length < 2) return [];

  const latest = snapshots[snapshots.length - 1];
  const today = new Date(latest.date);
  const alerts: InactiveAlert[] = [];

  for (const member of latest.members) {
    // 가장 최근에 경험치가 변한 날 찾기
    let lastChangeDate = latest.date;
    for (let i = snapshots.length - 1; i > 0; i--) {
      const curr = snapshots[i].members.find((m: any) => m.characterName === member.characterName);
      const prev = snapshots[i - 1].members.find((m: any) => m.characterName === member.characterName);
      if (!curr || !prev) continue;
      if (curr.exp !== prev.exp || curr.level !== prev.level) {
        lastChangeDate = snapshots[i].date;
        break;
      }
      lastChangeDate = snapshots[i - 1].date;
    }

    const diffDays = Math.floor(
      (today.getTime() - new Date(lastChangeDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays >= 15) {
      alerts.push({
        name: member.characterName,
        days: diffDays,
        lastExpChange: lastChangeDate,
        level: member.level,
        job: member.job,
      });
    }
  }

  // 일수 내림차순
  alerts.sort((a, b) => b.days - a.days);
  return alerts;
}

// ============================================
// 디스코드 Embed 메시지
// ============================================

/** 배치 1: 가입/탈퇴 알림 */
export function buildChangeEmbed(
  leaves: { name: string; level?: number; job?: string }[],
  joins: { name: string; level?: number; job?: string }[],
  guildName: string,
  prevCount: number,
  currentCount: number
): object {
  const fields: any[] = [];
  const diff = currentCount - prevCount;
  const diffStr = diff > 0 ? `▲${diff}` : diff < 0 ? `▼${Math.abs(diff)}` : '변동없음';

  if (leaves.length > 0) {
    fields.push({
      name: `🚪 탈퇴 (${leaves.length}명)`,
      value: leaves.map(m => {
        const info = m.level ? `Lv.${m.level} ${m.job}` : '';
        return `❌ **${m.name}** ${info}`;
      }).join('\n'),
      inline: false,
    });
  }

  if (joins.length > 0) {
    fields.push({
      name: `🎉 가입 (${joins.length}명)`,
      value: joins.map(m => {
        const info = m.level ? `Lv.${m.level} ${m.job}` : '';
        return `✅ **${m.name}** ${info}`;
      }).join('\n'),
      inline: false,
    });
  }

  fields.push({
    name: '📊 길드 현황',
    value: `총 **${currentCount}명** (${diffStr})`,
    inline: false,
  });

  // 탈퇴 있으면 빨강, 가입만이면 초록, 둘 다 있으면 주황
  let color = 0x43A047; // 초록
  if (leaves.length > 0 && joins.length > 0) color = 0xFF9B37; // 주황
  else if (leaves.length > 0) color = 0xE53935; // 빨강

  return {
    embeds: [{
      title: `🪞 ${guildName} 길드원 변동 알림`,
      color,
      fields,
      footer: { text: '🍄 거울 길드 대시보드' },
      timestamp: new Date().toISOString(),
    }],
  };
}

/** 배치 2: 미접속 알림 */
export function buildInactiveEmbed(
  alerts: InactiveAlert[],
  guildName: string
): object {
  const alertList = alerts.map(a => {
    return `🔴 **${a.name}** · ${a.days}일째 · Lv.${a.level ?? '?'} ${a.job ?? ''}`;
  }).join('\n');

  return {
    embeds: [{
      title: `🪞 ${guildName} 장기 미접속 알림`,
      color: 0xE53935,
      fields: [{
        name: `💤 15일 이상 미접속 (${alerts.length}명)`,
        value: alertList || '없음 🎉',
        inline: false,
      }],
      footer: { text: '🍄 거울 길드 대시보드 · 경험치 변화 기준' },
      timestamp: new Date().toISOString(),
    }],
  };
}

/** 주간 리포트 */
export interface WeeklyReportData {
  period: string;            // "2026-04-07 ~ 2026-04-13"
  guildName: string;
  currentCount: number;
  prevCount: number;
  joins: MemberChangeLog[];
  leaves: MemberChangeLog[];
  inactiveCount: number;
}

export function buildWeeklyReportEmbed(data: WeeklyReportData): object {
  const diff = data.currentCount - data.prevCount;
  const diffStr = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : '±0';

  const fields: any[] = [];

  // 인원 현황
  fields.push({
    name: '📊 길드 현황',
    value: [
      `총 인원: **${data.currentCount}명** (${diffStr})`,
      data.inactiveCount > 0 ? `장기 미접속: **${data.inactiveCount}명**` : '',
    ].filter(Boolean).join('\n'),
    inline: false,
  });

  // 가입
  if (data.joins.length > 0) {
    fields.push({
      name: `🎉 가입 (${data.joins.length}명)`,
      value: data.joins.map(m => `✅ **${m.name}** ${m.job ? `${m.job}` : ''} ${m.level ? `Lv.${m.level}` : ''}`).join('\n'),
      inline: true,
    });
  }

  // 탈퇴
  if (data.leaves.length > 0) {
    fields.push({
      name: `🚪 탈퇴 (${data.leaves.length}명)`,
      value: data.leaves.map(m => `❌ **${m.name}** ${m.job ? `${m.job}` : ''} ${m.level ? `Lv.${m.level}` : ''}`).join('\n'),
      inline: true,
    });
  }

  // 가입/탈퇴 없으면
  if (data.joins.length === 0 && data.leaves.length === 0) {
    fields.push({ name: '📝 인원 변동', value: '이번 주 변동 없음 ✨', inline: false });
  }

  return {
    embeds: [{
      title: `🪞 ${data.guildName} 주간 리포트`,
      description: `📅 ${data.period}`,
      color: 0x4A90D9,
      fields,
      footer: { text: '🍄 거울 길드 대시보드 · 자동 리포트' },
      timestamp: new Date().toISOString(),
    }],
  };
}

/** 디스코드 웹훅 발송 */
export async function sendDiscordAlert(
  webhookUrl: string,
  message: object
): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    return res.ok;
  } catch {
    console.error('Discord webhook 발송 실패');
    return false;
  }
}
