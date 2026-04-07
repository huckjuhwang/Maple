import * as fs from 'fs';
import * as path from 'path';
import Link from 'next/link';
import { formatCombatPower, formatNumber, getYesterday } from '@/lib/constants';
import { getAvailableDates, loadSnapshot } from '@/features/growth/compare';
import { getOcid, collectMemberData } from '@/services/nexon-api';

function scouterUrl(name: string) {
  return `https://maplescouter.com/info?name=${encodeURIComponent(name)}`;
}

/**
 * 실시간 데이터 가져오기 (캐릭터 1명만, API 4회)
 * API 실패 시 null 반환 → JSON 데이터로 폴백
 */
async function fetchLiveData(characterName: string) {
  // 환경변수 없으면 스킵
  if (!process.env.NEXON_API_KEY) return null;
  try {
    const date = getYesterday();
    const ocid = await getOcid(characterName);
    const data = await collectMemberData(ocid, date);
    return { ...data, date, isLive: true };
  } catch {
    return null;
  }
}

function getLatestData() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'latest.json');
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

interface Props {
  params: Promise<{ name: string }>;
}

export default async function MemberPage({ params }: Props) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  const guild = getLatestData();

  if (!guild || !guild.members) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-6 text-center">
        <div className="text-4xl mb-4 mushroom-bounce">🍄</div>
        <h1 className="text-xl font-bold mb-2">데이터가 없습니다</h1>
        <Link href="/" className="maple-tab maple-tab-active no-underline">← 대시보드로</Link>
      </main>
    );
  }

  const member = guild.members.find((m: any) => m.characterName === decodedName);

  if (!member) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-6 text-center">
        <div className="text-4xl mb-4 mushroom-bounce">🍄</div>
        <h1 className="text-xl font-bold mb-2">캐릭터를 찾을 수 없습니다</h1>
        <p className="text-sm opacity-60 mb-4">&quot;{decodedName}&quot; 을(를) 찾을 수 없어요</p>
        <Link href="/" className="maple-tab maple-tab-active no-underline">← 대시보드로</Link>
      </main>
    );
  }

  // 전체 랭킹에서 순위 찾기
  const rank = guild.members.findIndex((m: any) => m.characterName === decodedName) + 1;

  // 히스토리 데이터 수집 (JSON 스냅샷)
  const dates = getAvailableDates();
  const history: { date: string; level: number; exp: number; combatPower: number; expRate: number; unionLevel: number; isLive?: boolean }[] = [];
  for (const date of dates.slice(0, 30)) {
    const snap = loadSnapshot(date);
    if (!snap) continue;
    const m = snap.members.find((m: any) => m.characterName === decodedName);
    if (m) {
      history.push({
        date,
        level: m.level,
        exp: m.exp ?? 0,
        combatPower: m.combatPower,
        expRate: m.expRate,
        unionLevel: m.unionLevel,
      });
    }
  }
  history.reverse(); // 오래된 순

  // 실시간 데이터 가져오기 (오늘 기준, 1명만 API 호출)
  const liveData = await fetchLiveData(decodedName);
  if (liveData) {
    // 이미 같은 날짜가 있으면 교체, 없으면 추가
    const existingIdx = history.findIndex(h => h.date === liveData.date);
    const liveEntry = {
      date: liveData.date,
      level: liveData.level,
      exp: liveData.exp,
      combatPower: liveData.combatPower,
      expRate: liveData.expRate,
      unionLevel: liveData.unionLevel,
      isLive: true,
    };
    if (existingIdx >= 0) {
      history[existingIdx] = liveEntry;
    } else {
      history.push(liveEntry);
    }
  }

  // 실시간 데이터가 있으면 member 정보 덮어쓰기
  const displayMember = liveData
    ? { ...member, level: liveData.level, expRate: liveData.expRate, combatPower: liveData.combatPower, unionLevel: liveData.unionLevel }
    : member;

  // 변화량 계산 (가장 오래된 vs 최신)
  const hasHistory = history.length >= 2;
  const oldest = hasHistory ? history[0] : null;
  const latest = hasHistory ? history[history.length - 1] : null;

  // 경험치 분석 (최근 8일)
  const recent8 = history.slice(-8);
  const dailyExpGains: { date: string; gain: number; levelUp: boolean }[] = [];
  for (let i = 1; i < recent8.length; i++) {
    const prev = recent8[i - 1];
    const curr = recent8[i];
    let gain = curr.exp - prev.exp;
    // 레벨업 시 exp가 리셋되므로 보정 불가 → 양수만 유효
    const levelUp = curr.level > prev.level;
    if (gain < 0 && levelUp) gain = 0; // 레벨업으로 리셋된 경우
    dailyExpGains.push({
      date: curr.date,
      gain: Math.max(gain, 0),
      levelUp,
    });
  }

  const totalExpGain = dailyExpGains.reduce((s, d) => s + d.gain, 0);
  const avgDailyExp = dailyExpGains.length > 0
    ? Math.round(totalExpGain / dailyExpGains.length)
    : 0;

  // 레벨업 예상일 계산
  // 현재 경험치% → 100%까지 남은 양 추정
  const currentExpRate = member.expRate ?? 0;
  const remainingPct = 100 - currentExpRate;
  let estimatedDaysToLevelUp: number | null = null;
  if (avgDailyExp > 0 && recent8.length >= 2) {
    // 하루 평균 경험치% 상승량 계산
    const latestH = recent8[recent8.length - 1];
    const firstH = recent8[0];
    const days = recent8.length - 1;
    // 같은 레벨 내에서의 expRate 변화로 계산
    if (latestH.level === firstH.level && days > 0) {
      const dailyPctGain = (latestH.expRate - firstH.expRate) / days;
      if (dailyPctGain > 0) {
        estimatedDaysToLevelUp = Math.ceil(remainingPct / dailyPctGain);
      }
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      {/* 뒤로가기 */}
      <Link href="/" className="inline-flex items-center gap-1 text-sm opacity-60 hover:opacity-100 mb-4 no-underline text-inherit">
        ← 대시보드로
      </Link>

      {/* 프로필 헤더 */}
      <header className="mirror-card p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-3 right-4 text-xl mushroom-bounce">🍄</div>
        <div className="absolute bottom-3 left-4 text-xl slime-squish">🐌</div>

        <div className="flex items-center gap-5">
          {/* 캐릭터 이미지 */}
          <a href={scouterUrl(member.characterName)} target="_blank" rel="noopener noreferrer">
            <div className="w-40 h-40 rounded-full overflow-hidden bg-white/60 flex-shrink-0 char-img-hover" style={{ borderColor: 'var(--guild-mirror)', borderWidth: '3px', borderStyle: 'solid' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={member.characterImage}
                alt={member.characterName}
                className="w-full h-full object-cover"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          </a>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{member.characterName}</h1>
              <span className="maple-badge" style={{ background: '#FFF3E0', color: 'var(--maple-orange)' }}>
                #{rank}
              </span>
            </div>
            <p className="text-sm opacity-70 mt-1">{displayMember.job} &middot; Lv.{displayMember.level}</p>
            <p className="text-xs opacity-50 mt-1">
              경험치: {displayMember.expRate?.toFixed(2) ?? 0}%
              {liveData && <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#E8F5E9', color: '#2E7D32' }}>🟢 실시간</span>}
            </p>
            <a
              href={scouterUrl(member.characterName)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-xs px-3 py-1 rounded-full no-underline"
              style={{ background: 'var(--guild-mirror)', color: 'var(--guild-mirror-deep)' }}
            >
              🔍 환산 사이트에서 보기
            </a>
          </div>
        </div>
      </header>

      {/* 스펙 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="maple-card p-4 text-center">
          <div className="text-xs opacity-60 mb-1">⚔️ 전투력</div>
          <div className="text-lg font-bold text-gradient-orange">{formatCombatPower(displayMember.combatPower)}</div>
        </div>
        <div className="maple-card p-4 text-center">
          <div className="text-xs opacity-60 mb-1">🏰 유니온</div>
          <div className="text-lg font-bold text-gradient-purple">{formatNumber(displayMember.unionLevel)}</div>
        </div>
        <div className="maple-card p-4 text-center">
          <div className="text-xs opacity-60 mb-1">🔮 아케인포스</div>
          <div className="text-lg font-bold text-gradient-blue">{formatNumber(displayMember.arcaneForce ?? 0)}</div>
        </div>
        <div className="maple-card p-4 text-center">
          <div className="text-xs opacity-60 mb-1">✨ 어센틱포스</div>
          <div className="text-lg font-bold text-gradient-green">{formatNumber(displayMember.authenticForce ?? 0)}</div>
        </div>
      </div>

      {/* 경험치 분석 (최근 8일) */}
      {dailyExpGains.length > 0 ? (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl mushroom-bounce">🍄</span>
            <h2 className="text-lg font-bold" style={{ color: 'var(--maple-brown)' }}>
              경험치 분석
            </h2>
            <span className="text-xs opacity-50 ml-auto">최근 {dailyExpGains.length}일</span>
          </div>

          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="maple-card p-4 text-center">
              <div className="text-xs opacity-60 mb-1">📈 일일 평균</div>
              <div className="text-lg font-bold text-gradient-orange">{formatCombatPower(avgDailyExp)}</div>
              <div className="text-xs opacity-40">경험치/일</div>
            </div>
            <div className="maple-card p-4 text-center">
              <div className="text-xs opacity-60 mb-1">📊 총 획득</div>
              <div className="text-lg font-bold text-gradient-blue">{formatCombatPower(totalExpGain)}</div>
              <div className="text-xs opacity-40">{dailyExpGains.length}일간</div>
            </div>
            <div className="maple-card p-4 text-center">
              <div className="text-xs opacity-60 mb-1">🎯 레벨업 예상</div>
              <div className="text-lg font-bold text-gradient-green">
                {estimatedDaysToLevelUp !== null
                  ? `${estimatedDaysToLevelUp}일 후`
                  : '계산 불가'}
              </div>
              <div className="text-xs opacity-40">
                {estimatedDaysToLevelUp !== null
                  ? `→ Lv.${member.level + 1}`
                  : '레벨업 or 데이터 부족'}
              </div>
            </div>
          </div>

          {/* 일별 경험치 상승 막대 */}
          <div className="maple-card p-4">
            <div className="text-xs font-bold opacity-40 mb-3 uppercase tracking-wider">일별 경험치 획득량</div>
            <div className="space-y-2">
              {dailyExpGains.map((d, i) => {
                const maxGain = Math.max(...dailyExpGains.map(x => x.gain), 1);
                const pct = (d.gain / maxGain) * 100;
                return (
                  <div key={d.date} className="flex items-center gap-2">
                    <div className="text-xs w-12 opacity-60">{d.date.slice(5)}</div>
                    <div className="flex-1 h-6 bg-amber-50 rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(pct, 2)}%`,
                          background: d.levelUp
                            ? 'linear-gradient(90deg, #FFD93D, #FF9B37)'
                            : 'linear-gradient(90deg, #A8D8EA, #5B9BD5)',
                        }}
                      />
                      <div className="absolute inset-0 flex items-center px-2">
                        <span className="text-xs font-bold" style={{ color: pct > 40 ? 'white' : 'var(--maple-brown)' }}>
                          {d.gain > 0 ? formatCombatPower(d.gain) : '-'}
                          {d.levelUp && ' 🎉 레벨업!'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs opacity-50">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(90deg, #A8D8EA, #5B9BD5)' }} />
                일반
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(90deg, #FFD93D, #FF9B37)' }} />
                레벨업 포함
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="mb-6">
          <div className="maple-card p-6 text-center">
            <div className="text-3xl mb-2 mushroom-bounce">🍄</div>
            <p className="text-sm opacity-60">경험치 분석은 2일 이상의 데이터가 필요해요</p>
          </div>
        </section>
      )}

      {/* 성장 추이 */}
      {hasHistory ? (
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📈</span>
            <h2 className="text-lg font-bold" style={{ color: 'var(--maple-brown)' }}>
              성장 추이
            </h2>
            <span className="text-xs opacity-50 ml-auto">{history.length}일 기록</span>
          </div>
          <div className="maple-card p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-xs opacity-60">전투력 변화</div>
                <div className={`font-bold ${latest!.combatPower - oldest!.combatPower > 0 ? 'change-up' : 'change-none'}`}>
                  {latest!.combatPower - oldest!.combatPower > 0 ? '+' : ''}{formatCombatPower(latest!.combatPower - oldest!.combatPower)}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-60">레벨 변화</div>
                <div className={`font-bold ${latest!.level - oldest!.level > 0 ? 'change-up' : 'change-none'}`}>
                  {latest!.level - oldest!.level > 0 ? '+' : ''}{latest!.level - oldest!.level}
                  {latest!.level !== oldest!.level && (
                    <span className="text-xs opacity-60 ml-1">({oldest!.level}→{latest!.level})</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-60">유니온 변화</div>
                <div className={`font-bold ${latest!.unionLevel - oldest!.unionLevel > 0 ? 'change-up' : 'change-none'}`}>
                  {latest!.unionLevel - oldest!.unionLevel > 0 ? '+' : ''}{formatNumber(latest!.unionLevel - oldest!.unionLevel)}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-60">기간</div>
                <div className="font-bold text-sm">
                  {oldest!.date} ~ {latest!.date}
                </div>
              </div>
            </div>

            {/* 일별 기록 테이블 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-amber-100">
                    <th className="text-left py-2 px-2 text-xs opacity-60">날짜</th>
                    <th className="text-right py-2 px-2 text-xs opacity-60">레벨</th>
                    <th className="text-right py-2 px-2 text-xs opacity-60">경험치%</th>
                    <th className="text-right py-2 px-2 text-xs opacity-60">전투력</th>
                    <th className="text-right py-2 px-2 text-xs opacity-60">유니온</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => {
                    const prev = i > 0 ? history[i - 1] : null;
                    return (
                      <tr key={h.date} className="border-b border-amber-50 hover:bg-amber-50/50" style={h.isLive ? { background: '#F1F8E9' } : undefined}>
                        <td className="py-2 px-2 text-xs">
                          {h.date}
                          {h.isLive && <span className="ml-1" title="실시간">🟢</span>}
                        </td>
                        <td className="py-2 px-2 text-right font-medium">
                          Lv.{h.level}
                          {prev && h.level > prev.level && (
                            <span className="change-up text-xs ml-1">+{h.level - prev.level}</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {h.expRate.toFixed(1)}%
                        </td>
                        <td className="py-2 px-2 text-right font-medium">
                          {formatCombatPower(h.combatPower)}
                          {prev && h.combatPower !== prev.combatPower && (
                            <span className={`text-xs ml-1 ${h.combatPower > prev.combatPower ? 'change-up' : 'change-down'}`}>
                              {h.combatPower > prev.combatPower ? '↑' : '↓'}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {formatNumber(h.unionLevel)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : (
        <section className="mb-6">
          <div className="maple-card p-6 text-center">
            <div className="text-3xl mb-2 slime-squish">🐌</div>
            <p className="text-sm opacity-60">아직 비교할 데이터가 부족해요</p>
            <p className="text-xs opacity-40 mt-1">내일 수집 후 성장 추이를 확인할 수 있습니다</p>
          </div>
        </section>
      )}

      {/* 푸터 */}
      <footer className="text-center mt-8 mb-4 text-xs opacity-40">
        <div className="flex items-center justify-center gap-2">
          <span className="mushroom-bounce">🍄</span>
          <span>스카니아 거울 길드 전용</span>
          <span className="slime-squish">🐌</span>
        </div>
      </footer>
    </main>
  );
}
