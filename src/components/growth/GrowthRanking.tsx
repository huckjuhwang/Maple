'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { formatCombatPower, formatNumber } from '@/lib/constants';
import type { MemberChange, CompareResult } from '@/features/growth/compare';

function memberUrl(name: string) {
  return `/member/${encodeURIComponent(name)}`;
}

function formatChange(value: number, format: 'combat' | 'number' | 'level' = 'number'): string {
  if (value === 0) return '-';
  const sign = value > 0 ? '+' : '';
  switch (format) {
    case 'combat': return `${sign}${formatCombatPower(value)}`;
    case 'level': return `${sign}${value}`;
    default: return `${sign}${formatNumber(value)}`;
  }
}

type Period = 'daily' | 'weekly' | 'monthly';

interface Props {
  members: any[];
  comparisons: {
    daily: CompareResult | null;
    weekly: CompareResult | null;
    monthly: CompareResult | null;
  };
  dailyComparisons: Record<string, CompareResult | null>;
}

type SortBy = 'combatPower' | 'level' | 'expGain' | 'unionLevel';
type ViewMode = 'current' | 'change';

const CURRENT_SORT_OPTIONS: { key: SortBy; label: string; emoji: string }[] = [
  { key: 'combatPower', label: '전투력', emoji: '⚔️' },
  { key: 'level', label: '레벨', emoji: '⭐' },
  { key: 'unionLevel', label: '유니온', emoji: '🏰' },
];

const CHANGE_SORT_OPTIONS: { key: SortBy; label: string; emoji: string }[] = [
  { key: 'expGain', label: '경험치 상승', emoji: '📈' },
  { key: 'combatPower', label: '전투력 상승', emoji: '⚔️' },
  { key: 'unionLevel', label: '유니온 상승', emoji: '🏰' },
];

const INITIAL_VISIBLE = 50; // 포디움 3 + 리스트 47

export default function GrowthRanking({ members, comparisons, dailyComparisons }: Props) {
  const [sortBy, setSortBy] = useState<SortBy>('expGain');
  const [period, setPeriod] = useState<Period>('daily');
  const [viewMode, setViewMode] = useState<ViewMode>(comparisons.daily?.hasData ? 'change' : 'current');
  const [showAll, setShowAll] = useState(false);

  // 일간 날짜 선택 (기본: 가장 최신 날짜)
  const availableDailyDates = Object.keys(dailyComparisons).sort().reverse();
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>(availableDailyDates[0] ?? '');

  const comparison = useMemo(() => {
    if (period === 'daily' && selectedDailyDate && dailyComparisons[selectedDailyDate]) {
      return dailyComparisons[selectedDailyDate];
    }
    return comparisons[period];
  }, [comparisons, dailyComparisons, period, selectedDailyDate]);

  const hasComparison = comparison?.hasData && comparison.members.length > 0;

  // 비교 데이터가 있으면 변화량 매핑
  const changeMap = new Map<string, MemberChange>();
  if (hasComparison) {
    for (const m of comparison!.members) {
      changeMap.set(m.characterName, m);
    }
  }

  const sortOptions = viewMode === 'change' ? CHANGE_SORT_OPTIONS : CURRENT_SORT_OPTIONS;
  // 모드 전환 시 현재 정렬이 없는 옵션이면 첫 번째로 리셋
  const activeSortBy = sortOptions.find(o => o.key === sortBy) ? sortBy : sortOptions[0].key;

  // 정렬
  const sorted = viewMode === 'change' && hasComparison
    ? [...comparison!.members]
      .sort((a, b) => {
        switch (activeSortBy) {
          case 'combatPower': return b.combatPowerChange - a.combatPowerChange;
          case 'expGain': {
            // expGain(테이블 기반) 우선, 없으면 expLevelChange로 폴백
            const aVal = a.expGain ?? (a.expLevelChange * 1e12);
            const bVal = b.expGain ?? (b.expLevelChange * 1e12);
            return bVal - aVal;
          }
          case 'unionLevel': return b.unionLevelChange - a.unionLevelChange;
          default: return 0;
        }
      }).map(c => {
        const orig = members.find((m: any) => m.characterName === c.characterName);
        if (!orig) return { ...c, characterImage: '', job: c.job ?? '' };
        return { ...orig, ...c };
      })
    : [...members].sort((a, b) => {
        switch (activeSortBy) {
          case 'combatPower': return b.combatPower - a.combatPower;
          case 'level': return b.level - a.level;
          case 'unionLevel': return b.unionLevel - a.unionLevel;
          default: return b.combatPower - a.combatPower;
        }
      });

  // 이전 순위 계산 (비교 데이터가 있을 때)
  const prevRankMap = new Map<string, number>();
  if (hasComparison) {
    // 이전 스냅샷 기준 정렬로 이전 순위 산출
    const prevSorted = [...comparison!.members].sort((a, b) => {
      switch (activeSortBy) {
        case 'combatPower': return (b.prevCombatPower ?? b.combatPower) - (a.prevCombatPower ?? a.combatPower);
        case 'level': return (b.prevLevel ?? b.level) - (a.prevLevel ?? a.level);
        case 'expGain': return (b.prevLevel ?? b.level) - (a.prevLevel ?? a.level); // 경험치 상승은 이전 레벨 기준
        case 'unionLevel': return (b.unionLevel - b.unionLevelChange) - (a.unionLevel - a.unionLevelChange);
        default: return 0;
      }
    });
    prevSorted.forEach((m, i) => prevRankMap.set(m.characterName, i + 1));
  }

  function getRankChange(name: string, currentRank: number): { diff: number; label: string; class: string } {
    const prevRank = prevRankMap.get(name);
    if (!prevRank || !hasComparison) return { diff: 0, label: '', class: '' };
    const diff = prevRank - currentRank; // 양수면 순위 상승
    if (diff > 0) return { diff, label: `▲${diff}`, class: 'change-up text-xs' };
    if (diff < 0) return { diff, label: `▼${Math.abs(diff)}`, class: 'change-down text-xs' };
    return { diff: 0, label: '─', class: 'change-none text-xs' };
  }

  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const visibleRest = showAll ? rest : rest.slice(0, INITIAL_VISIBLE - 3);
  const hiddenCount = rest.length - (INITIAL_VISIBLE - 3);

  function getValue(member: any): string {
    if (viewMode === 'change' && hasComparison) {
      const c = changeMap.get(member.characterName);
      if (!c) return '-';
      switch (activeSortBy) {
        case 'combatPower': return formatChange(c.combatPowerChange, 'combat');
        case 'expGain': {
          if (c.expGain !== null && c.expGain !== undefined) {
            return `+${formatNumber(c.expGain)}`;
          }
          // 테이블에 없는 레벨 (260 미만) → expChange 표시
          return `+${formatNumber(c.expChange ?? 0)}`;
        }
        case 'unionLevel': return formatChange(c.unionLevelChange);
        default: return '-';
      }
    }
    switch (activeSortBy) {
      case 'combatPower': return formatCombatPower(member.combatPower);
      case 'level': return `Lv.${member.level}`;
      case 'unionLevel': return member.unionLevel.toLocaleString();
      default: return '';
    }
  }

  function getSubValue(member: any): string {
    if (viewMode === 'change' && hasComparison) {
      const c = changeMap.get(member.characterName);
      if (!c) return '';
      switch (activeSortBy) {
        case 'combatPower': return `Lv.${c.level} ${c.job}`;
        case 'expGain':
          return `Lv.${c.level} (${c.expRate.toFixed(1)}%)`;
        case 'unionLevel': return `Lv.${c.level}`;
        default: return '';
      }
    }
    switch (activeSortBy) {
      case 'combatPower': return `Lv.${member.level} ${member.job}`;
      case 'level': return `경험치 ${member.expRate?.toFixed(1) ?? 0}%`;
      case 'unionLevel': return `Lv.${member.level}`;
      default: return '';
    }
  }

  function getChangeClass(member: any): string {
    if (viewMode !== 'change' || !hasComparison) return '';
    const c = changeMap.get(member.characterName);
    if (!c) return 'change-none';
    let val = 0;
    switch (activeSortBy) {
      case 'combatPower': val = c.combatPowerChange; break;
      case 'expGain': val = c.expGain ?? c.expChange ?? 0; break;
      case 'unionLevel': val = c.unionLevelChange; break;
    }
    return val > 0 ? 'change-up' : val < 0 ? 'change-down' : 'change-none';
  }

  function getPeriodLabel(): string {
    if (!comparison) return '';
    switch (comparison.period) {
      case 'daily': return '일간';
      case 'weekly': return '주간 (목~수)';
      case 'monthly': return '월간 (1일~말일)';
      default: return '';
    }
  }

  function getRankingTitle(): string {
    if (!hasComparison || viewMode !== 'change') return '길드원 현황';
    const periodMap: Record<string, string> = {
      daily: '오늘의',
      weekly: '이번 주',
      monthly: '이번 달',
    };
    const metricMap: Record<string, string> = {
      expGain: '경험치 증가',
      combatPower: '전투력 상승',
      unionLevel: '유니온 상승',
    };
    return `${periodMap[comparison!.period] ?? ''} ${metricMap[activeSortBy] ?? ''} 순위`;
  }

  return (
    <div className="space-y-3">
      {/* ── 랭킹 타이틀 ── */}
      {hasComparison && viewMode === 'change' && (
        <div className="text-lg font-bold" style={{ color: 'var(--maple-orange)' }}>
          🏆 {getRankingTitle()}
        </div>
      )}

      {/* ── 1. 데이터 종류 ── */}
      <div className="maple-card p-3">
        <div className="text-xs font-bold opacity-40 mb-2">데이터</div>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('change')}
            className={`maple-tab flex-1 text-center text-xs ${viewMode === 'change' ? 'maple-tab-active' : 'maple-tab-inactive'}`}
            disabled={!hasComparison}
            style={{ opacity: hasComparison ? 1 : 0.4 }}
          >
            📈 변화량
          </button>
          <button
            onClick={() => setViewMode('current')}
            className={`maple-tab flex-1 text-center text-xs ${viewMode === 'current' ? 'maple-tab-active' : 'maple-tab-inactive'}`}
          >
            📊 현재
          </button>
        </div>
      </div>

      {/* ── 2. 기간 (변화량일 때만) ── */}
      {viewMode === 'change' && (
        <div className="maple-card p-3">
          <div className="text-xs font-bold opacity-40 mb-2">기간</div>
          <div className="flex gap-1">
            {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`maple-tab flex-1 text-center text-xs ${period === p ? 'maple-tab-active' : 'maple-tab-inactive'}`}
              >
                {p === 'daily' ? '일간' : p === 'weekly' ? '주간' : '월간'}
              </button>
            ))}
          </div>
          {/* 일간 날짜 선택 */}
          {period === 'daily' && availableDailyDates.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {availableDailyDates.map(date => (
                <button
                  key={date}
                  onClick={() => setSelectedDailyDate(date)}
                  className="text-xs px-2 py-1 rounded-full transition-all"
                  style={{
                    background: selectedDailyDate === date ? 'var(--maple-orange)' : '#F5F5F5',
                    color: selectedDailyDate === date ? 'white' : '#666',
                  }}
                >
                  {date.slice(5)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 3. 정렬 기준 ── */}
      <div className="maple-card p-3">
        <div className="text-xs font-bold opacity-40 mb-2">정렬</div>
        <div className="flex gap-1">
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`maple-tab flex-1 text-center text-xs whitespace-nowrap ${activeSortBy === opt.key ? 'maple-tab-active' : 'maple-tab-inactive'}`}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 기간 표시 배지 */}
      {hasComparison && viewMode === 'change' && (
        <div className="px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs" style={{ background: '#FFF8ED' }}>
          <span>📅</span>
          <span className="font-bold" style={{ color: 'var(--maple-orange)' }}>{getPeriodLabel()}</span>
          <span className="opacity-40">|</span>
          <span>
            {period === 'daily'
              ? comparison!.toDate
              : `${comparison!.fromDate} → ${comparison!.toDate}`
            }
          </span>
          <span className="opacity-40 ml-auto">{comparison!.members.length}명</span>
        </div>
      )}

      {/* TOP 3 포디움 */}
      <div className="maple-card p-5 mb-4">
        <div className="flex items-end justify-center gap-3 mb-2">
          {/* 2등 */}
          {top3[1] && (
            <Link href={memberUrl(top3[1].characterName)} className="text-center flex-1 max-w-[120px] no-underline text-inherit">
              <div className="text-2xl mb-1">🥈</div>
              <div className="w-24 h-24 rounded-full overflow-hidden bg-amber-50 mx-auto mb-2 border-2 border-gray-300 char-img-hover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={top3[1].characterImage} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
              </div>
              <div className="text-xs font-bold truncate">{top3[1].characterName}</div>
              {getRankChange(top3[1].characterName, 2).label && (
                <div className={getRankChange(top3[1].characterName, 2).class}>{getRankChange(top3[1].characterName, 2).label}</div>
              )}
              <div className={`text-sm font-bold ${getChangeClass(top3[1])}`} style={!getChangeClass(top3[1]) ? { color: 'var(--maple-orange)' } : undefined}>
                {getValue(top3[1])}
              </div>
              <div className="text-xs opacity-50">{getSubValue(top3[1])}</div>
              <div className="h-16 podium-silver rounded-t-lg mt-2" />
            </Link>
          )}
          {/* 1등 */}
          {top3[0] && (
            <Link href={memberUrl(top3[0].characterName)} className="text-center flex-1 max-w-[140px] no-underline text-inherit">
              <div className="text-3xl mb-1 crown-wiggle">👑</div>
              <div className="w-28 h-28 rounded-full overflow-hidden bg-amber-50 mx-auto mb-2 char-img-hover" style={{ borderColor: 'var(--maple-yellow)', borderWidth: '3px', borderStyle: 'solid' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={top3[0].characterImage} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
              </div>
              <div className="text-sm font-bold truncate">{top3[0].characterName}</div>
              {getRankChange(top3[0].characterName, 1).label && (
                <div className={getRankChange(top3[0].characterName, 1).class}>{getRankChange(top3[0].characterName, 1).label}</div>
              )}
              <div className={`text-lg font-bold ${getChangeClass(top3[0])}`} style={!getChangeClass(top3[0]) ? { color: 'var(--maple-orange)' } : undefined}>
                {getValue(top3[0])}
              </div>
              <div className="text-xs opacity-50">{getSubValue(top3[0])}</div>
              <div className="h-24 podium-gold rounded-t-lg mt-2" />
            </Link>
          )}
          {/* 3등 */}
          {top3[2] && (
            <Link href={memberUrl(top3[2].characterName)} className="text-center flex-1 max-w-[120px] no-underline text-inherit">
              <div className="text-2xl mb-1">🥉</div>
              <div className="w-24 h-24 rounded-full overflow-hidden bg-amber-50 mx-auto mb-2 border-2 border-amber-600 char-img-hover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={top3[2].characterImage} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
              </div>
              <div className="text-xs font-bold truncate">{top3[2].characterName}</div>
              {getRankChange(top3[2].characterName, 3).label && (
                <div className={getRankChange(top3[2].characterName, 3).class}>{getRankChange(top3[2].characterName, 3).label}</div>
              )}
              <div className={`text-sm font-bold ${getChangeClass(top3[2])}`} style={!getChangeClass(top3[2]) ? { color: 'var(--maple-orange)' } : undefined}>
                {getValue(top3[2])}
              </div>
              <div className="text-xs opacity-50">{getSubValue(top3[2])}</div>
              <div className="h-10 podium-bronze rounded-t-lg mt-2" />
            </Link>
          )}
        </div>
      </div>

      {/* 4위 이하 리스트 */}
      {rest.length > 0 && (
        <div className="maple-card p-3">
          <div className="space-y-1">
            {visibleRest.map((member: any, i: number) => (
              <Link
                key={member.characterName}
                href={memberUrl(member.characterName)}
                className="rank-row slide-in no-underline text-inherit"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="w-12 text-center flex-shrink-0">
                  <div className="text-sm font-bold" style={{ color: '#aaa' }}>{i + 4}</div>
                  {(() => {
                    const rc = getRankChange(member.characterName, i + 4);
                    return rc.label ? <div className={rc.class}>{rc.label}</div> : null;
                  })()}
                </div>
                <div className="w-14 h-14 rounded-full overflow-hidden bg-amber-50 mr-3 flex-shrink-0 border border-gray-200 char-img-hover">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={member.characterImage} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'pixelated' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{member.characterName}</div>
                  <div className="text-xs opacity-50">{member.job}</div>
                </div>
                <div className="text-right">
                  <div className={`font-bold text-sm ${getChangeClass(member)}`} style={!getChangeClass(member) ? { color: 'var(--maple-orange)' } : undefined}>
                    {getValue(member)}
                  </div>
                  <div className="text-xs opacity-40">{getSubValue(member)}</div>
                </div>
              </Link>
            ))}
          </div>
          {/* 50위 이후 펼치기 */}
          {!showAll && hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full mt-3 py-2 text-xs rounded-lg transition-colors hover:bg-amber-100"
              style={{ color: 'var(--maple-orange)', border: '1px dashed var(--maple-orange)' }}
            >
              ▼ 나머지 {hiddenCount}명 더 보기
            </button>
          )}
          {showAll && hiddenCount > 0 && (
            <button
              onClick={() => setShowAll(false)}
              className="w-full mt-3 py-2 text-xs rounded-lg transition-colors hover:bg-amber-100"
              style={{ color: '#aaa', border: '1px dashed #ddd' }}
            >
              ▲ 접기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
