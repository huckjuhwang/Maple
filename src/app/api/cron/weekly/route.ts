import { NextResponse } from 'next/server';
import { getCompareByPeriod } from '@/features/growth/compare';
import { sendWeeklyReport } from '@/services/discord';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // CRON_SECRET 검증
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const comparison = getCompareByPeriod('weekly');
  if (!comparison || !comparison.hasData) {
    return NextResponse.json({
      success: false,
      error: 'Not enough data for weekly comparison',
    });
  }

  // 전투력 상승 TOP5
  const combatTop5 = [...comparison.members]
    .sort((a, b) => b.combatPowerChange - a.combatPowerChange)
    .slice(0, 5);

  // 경험치 상승 TOP5
  const expTop5 = [...comparison.members]
    .sort((a, b) => b.expLevelChange - a.expLevelChange)
    .slice(0, 5);

  // 통계
  const avgCombatPowerChange = comparison.members.length
    ? Math.round(
        comparison.members.reduce((s, m) => s + m.combatPowerChange, 0) /
        comparison.members.length
      )
    : 0;

  const totalLevelUps = comparison.members.reduce((s, m) => s + m.levelChange, 0);

  const stagnantMembers = comparison.members
    .filter(m => m.combatPowerChange === 0 && m.expLevelChange === 0)
    .map(m => m.characterName);

  const success = await sendWeeklyReport({
    fromDate: comparison.fromDate,
    toDate: comparison.toDate,
    guildName: '거울',
    memberCount: comparison.members.length,
    combatTop5,
    expTop5,
    avgCombatPowerChange,
    totalLevelUps,
    stagnantMembers,
  });

  return NextResponse.json({ success, combatTop5: combatTop5.length, expTop5: expTop5.length });
}
