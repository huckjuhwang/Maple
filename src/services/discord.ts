/**
 * Discord Webhook 서비스
 * 주간 리포트를 디스코드 채널에 자동 발송
 */

import { formatCombatPower, formatNumber } from '@/lib/constants';
import type { MemberChange } from '@/features/growth/compare';

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

interface WeeklyReport {
  fromDate: string;
  toDate: string;
  guildName: string;
  memberCount: number;
  // 전투력 랭킹 TOP5
  combatTop5: MemberChange[];
  // 경험치 랭킹 TOP5
  expTop5: MemberChange[];
  // 길드 전체 통계
  avgCombatPowerChange: number;
  totalLevelUps: number;
  stagnantMembers: string[]; // 변동 없는 멤버
}

function buildReportMessage(report: WeeklyReport): object {
  const combatList = report.combatTop5
    .map((m, i) => {
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      const change = m.combatPowerChange > 0
        ? `+${formatCombatPower(m.combatPowerChange)}`
        : formatCombatPower(m.combatPowerChange);
      return `${medals[i]} **${m.characterName}** ${change} (${m.job} Lv.${m.level})`;
    })
    .join('\n');

  const expList = report.expTop5
    .map((m, i) => {
      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
      const change = m.levelChange > 0
        ? `Lv.${m.prevLevel}→${m.level} (+${m.expLevelChange}레벨분)`
        : `Lv.${m.level} (+${m.expLevelChange}레벨분)`;
      return `${medals[i]} **${m.characterName}** ${change}`;
    })
    .join('\n');

  const stagnant = report.stagnantMembers.length > 0
    ? `\n💤 **정체 중**: ${report.stagnantMembers.join(', ')}`
    : '';

  return {
    embeds: [{
      title: `🪞 거울 길드 주간 리포트`,
      description: `📅 ${report.fromDate} → ${report.toDate}`,
      color: 0x5B9BD5, // 거울 길드 색상
      fields: [
        {
          name: '💪 전투력 상승 랭킹',
          value: combatList || '데이터 없음',
          inline: false,
        },
        {
          name: '🏃 경험치 상승 랭킹',
          value: expList || '데이터 없음',
          inline: false,
        },
        {
          name: '📊 길드 통계',
          value: [
            `평균 전투력 변화: ${report.avgCombatPowerChange > 0 ? '+' : ''}${formatCombatPower(report.avgCombatPowerChange)}`,
            `총 레벨업: ${report.totalLevelUps}회`,
            `수집 멤버: ${report.memberCount}명`,
            stagnant,
          ].filter(Boolean).join('\n'),
          inline: false,
        },
      ],
      footer: {
        text: '🍄 거울 길드 대시보드 | Powered by Nexon Open API',
      },
      timestamp: new Date().toISOString(),
    }],
  };
}

interface DailyReport {
  date: string;
  guildName: string;
  memberCount: number;
  expTop10: MemberChange[];
  totalLevelUps: number;
}

function buildDailyReportMessage(report: DailyReport): object {
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  const expList = report.expTop10
    .map((m, i) => {
      const expStr = m.expChange && m.expChange > 0
        ? `+${formatNumber(m.expChange)}`
        : m.levelChange > 0
          ? `Lv.${m.prevLevel}→${m.level} 🎉`
          : `Lv.${m.level} (${m.expRate.toFixed(1)}%)`;
      return `${medals[i]} **${m.characterName}** ${expStr} · ${m.job}`;
    })
    .join('\n');

  return {
    embeds: [{
      title: `📅 거울 길드 일별 경험치 리포트`,
      description: `${report.date} 기준`,
      color: 0xFF9B37,
      fields: [
        {
          name: '🏃 경험치 상승 TOP 10',
          value: expList || '데이터 없음',
          inline: false,
        },
        {
          name: '📊 오늘 통계',
          value: [
            `총 레벨업: ${report.totalLevelUps}회`,
            `수집 멤버: ${report.memberCount}명`,
          ].join('\n'),
          inline: false,
        },
      ],
      footer: {
        text: '🍄 거울 길드 대시보드 | Powered by Nexon Open API',
      },
      timestamp: new Date().toISOString(),
    }],
  };
}

export async function sendDailyReport(report: DailyReport): Promise<boolean> {
  if (!WEBHOOK_URL) {
    console.log('⚠️ DISCORD_WEBHOOK_URL 미설정. 리포트 발송 스킵.');
    return false;
  }

  const message = buildDailyReportMessage(report);

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      console.error(`Discord webhook failed: ${res.status}`);
      return false;
    }

    console.log('✅ 디스코드 일별 리포트 발송 완료');
    return true;
  } catch (error) {
    console.error('Discord webhook error:', error);
    return false;
  }
}

export async function sendWeeklyReport(report: WeeklyReport): Promise<boolean> {
  if (!WEBHOOK_URL) {
    console.log('⚠️ DISCORD_WEBHOOK_URL 미설정. 리포트 발송 스킵.');
    return false;
  }

  const message = buildReportMessage(report);

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      console.error(`Discord webhook failed: ${res.status}`);
      return false;
    }

    console.log('✅ 디스코드 주간 리포트 발송 완료');
    return true;
  } catch (error) {
    console.error('Discord webhook error:', error);
    return false;
  }
}
