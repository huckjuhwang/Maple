import { NextResponse } from 'next/server';
import { getAutoCompare } from '@/features/growth/compare';
import { sendDailyReport } from '@/services/discord';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const comparison = getAutoCompare();
  if (!comparison || !comparison.hasData) {
    return NextResponse.json({ success: false, error: 'Not enough data for daily comparison' });
  }

  // 경험치 상승 TOP10
  const expTop10 = [...comparison.members]
    .sort((a, b) => (b.expChange ?? 0) - (a.expChange ?? 0))
    .slice(0, 10);

  const totalLevelUps = comparison.members.reduce((s, m) => s + m.levelChange, 0);

  const success = await sendDailyReport({
    date: comparison.toDate,
    guildName: '거울',
    memberCount: comparison.members.length,
    expTop10,
    totalLevelUps,
  });

  return NextResponse.json({ success, date: comparison.toDate, top10: expTop10.length });
}
