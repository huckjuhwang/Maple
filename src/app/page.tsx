import * as fs from 'fs';
import * as path from 'path';
import { formatCombatPower, formatNumber } from '@/lib/constants';
import { getAutoCompare, getAvailableDates, getCompareByPeriod, loadSnapshot } from '@/features/growth/compare';
import Dashboard from '@/components/dashboard/Dashboard';
import NoticeSection from '@/components/NoticeSection';

function getNotices() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'notices.json');
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function getLatestData() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'latest.json');
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function scouterUrl(name: string) {
  return `https://maplescouter.com/info?name=${encodeURIComponent(name)}`;
}

export default function HomePage() {
  const guild = getLatestData();
  const noticesData = getNotices();

  if (!guild || !guild.members) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-6 text-center">
        <div className="mirror-card p-8">
          <div className="text-4xl mb-4 mushroom-bounce">🍄</div>
          <h1 className="text-xl font-bold mb-2">데이터가 아직 없어요!</h1>
          <p className="text-sm opacity-60 mb-4">먼저 데이터를 수집해주세요</p>
          <code className="text-xs bg-gray-100 px-3 py-2 rounded-lg block">
            npx tsx scripts/collect.ts
          </code>
        </div>
      </main>
    );
  }

  const members = guild.members;
  const availableDates = getAvailableDates();

  // 기간별 비교 데이터
  const comparisons = {
    daily: getAutoCompare(),
    weekly: getCompareByPeriod('weekly'),
    monthly: getCompareByPeriod('monthly'),
  };

  // 차트용 스냅샷 로드 (최대 30일)
  const snapshots = availableDates.slice(0, 30).reverse().map(date => {
    const snap = loadSnapshot(date);
    if (!snap) return null;
    return {
      date: snap.date,
      members: snap.members.map((m: any) => ({
        characterName: m.characterName,
        level: m.level,
        expRate: m.expRate,
        combatPower: m.combatPower,
        unionLevel: m.unionLevel,
      })),
    };
  }).filter(Boolean);

  const allMemberNames = members.map((m: any) => m.characterName);

  const avgCombatPower = members.length
    ? Math.round(members.reduce((s: number, m: any) => s + m.combatPower, 0) / members.length)
    : 0;
  const avgLevel = members.length
    ? Math.round(members.reduce((s: number, m: any) => s + m.level, 0) / members.length)
    : 0;
  const maxLevel = members.length
    ? Math.max(...members.map((m: any) => m.level))
    : 0;
  const topDps = members[0];

  // 길마 찾기
  const master = members.find((m: any) => m.characterName === guild.masterName);

  // 직업 분포
  const jobCount: Record<string, number> = {};
  members.forEach((m: any) => { jobCount[m.job] = (jobCount[m.job] || 0) + 1; });
  const topJobs = Object.entries(jobCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      {/* 헤더 - 거울 길드 */}
      <header className="mirror-card p-6 mb-6 text-center relative overflow-hidden">
        {/* 떠다니는 메이플 장식 */}
        <div className="absolute top-3 left-4 text-2xl mushroom-bounce"><img src="/maple-icon.png" alt="거울 길드" className="w-10 h-10 object-contain" /></div>
        {/* <div className="absolute top-3 right-4 text-1.5xl mushroom-bounce" style={{ animationDelay: '0.8s' }}> 🍄</div> */}
        <div className="absolute top-3 right-4 text-2xl mushroom-bounce"><img src="/maple-icon.png" alt="거울 길드" className="w-10 h-10 object-contain" /></div>
        <div className="absolute bottom-3 left-8 text-xl float sparkle">🌟</div>
        <div className="absolute bottom-3 right-8 text-xl float" style={{ animationDelay: '2s' }}>✨</div>
        <div className="absolute top-12 left-16 text-lg float" style={{ animationDelay: '1.5s', opacity: 0.15 }}>🍄</div>
        <div className="absolute bottom-8 right-16 text-lg float" style={{ animationDelay: '3s', opacity: 0.15 }}>🐌</div>

        <div className="flex items-center justify-center gap-3 mb-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/guild-name.png" alt={guild.guildName} className="h-36 object-contain" />
        </div>
        <p className="text-sm mt-1" style={{ color: '#7BA7C9' }}>
          {guild.worldName} &middot; Lv.{guild.guildLevel} &middot; {guild.memberCount}명
        </p>
        <p className="text-xs mt-1 opacity-50">
           길드마스터: {guild.masterName}
        </p>

        <div className="flex justify-center gap-4 mt-4 flex-wrap">
          <div className="text-center min-w-[80px]">
            <div className="text-xs opacity-60">평균 전투력</div>
            <div className="text-lg font-bold text-gradient-orange">
              {formatCombatPower(avgCombatPower)}
            </div>
          </div>
          <div className="text-center min-w-[80px]">
            <div className="text-xs opacity-60">평균 레벨</div>
            <div className="text-lg font-bold text-gradient-purple">
              Lv.{avgLevel}
            </div>
          </div>
          <div className="text-center min-w-[80px]">
            <div className="text-xs opacity-60">최고 레벨</div>
            <div className="text-lg font-bold text-gradient-green">
              Lv.{maxLevel}
            </div>
          </div>
          <div className="text-center min-w-[80px]">
            <div className="text-xs opacity-60">수집 멤버</div>
            <div className="text-lg font-bold" style={{ color: 'var(--maple-blue)' }}>
              {members.length}명
            </div>
          </div>
        </div>

        {/* 수집 현황 */}
        {/* <div className="mt-3 text-xs opacity-40">
          스냅샷: {availableDates.length}일치 보유
          {availableDates.length > 0 && ` (${availableDates[availableDates.length - 1]} ~ ${availableDates[0]})`}
        </div> */}
      </header>

      {/* 직업 분포 */}
      <section className="mb-6">
        <div className="maple-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg mushroom-bounce">🍄</span>
            <h3 className="text-sm font-bold" style={{ color: 'var(--maple-brown)' }}>직업 분포 TOP5</h3>
          </div>
          <div className="flex gap-2 flex-wrap">
            {topJobs.map(([job, count], i) => (
              <span key={job} className="maple-badge pop-in" style={{
                background: i === 0 ? '#FFF3E0' : '#F5F5F5',
                color: i === 0 ? 'var(--maple-orange)' : '#666',
                animationDelay: `${i * 100}ms`,
              }}>
                {job} {count}명
              </span>
            ))}
          </div>
        </div>
      </section>

      {noticesData && (
        <NoticeSection notices={noticesData.notices} fetchedAt={noticesData.fetchedAt} />
      )}

      <Dashboard
        members={members}
        comparisons={comparisons}
        snapshots={snapshots}
        allMemberNames={allMemberNames}
      />

      {/* 푸터 */}
      <footer className="text-center mt-8 mb-4 text-xs opacity-40">
        <div className="flex items-center justify-center gap-2">
          <span className="mushroom-bounce">🍄</span>
          <span>스카니아 거울 길드 전용</span>
          <span className="slime-squish">🐌</span>
        </div>
        <p className="mt-1">Powered by Nexon Open API &middot; Made with 💛 by 거울</p>
      </footer>
    </main>
  );
}
