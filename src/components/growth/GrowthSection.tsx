'use client';

import { useState, useMemo } from 'react';
import GrowthRanking from './GrowthRanking';
import type { CompareResult } from '@/features/growth/compare';

type Period = 'daily' | 'weekly' | 'monthly';

interface Props {
  members: any[];
  comparisons: {
    daily: CompareResult | null;
    weekly: CompareResult | null;
    monthly: CompareResult | null;
  };
  snapshots: any[];
  allMemberNames: string[];
  selectedGroup: string[];
  onGroupChange: (group: string[]) => void;
}

export default function GrowthSection({ members, comparisons, snapshots, allMemberNames, selectedGroup, onGroupChange }: Props) {
  const [period, setPeriod] = useState<Period>('daily');
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  const isGroupActive = selectedGroup.length > 0;

  // 그룹 필터 적용
  const filteredMembers = useMemo(() => {
    if (!isGroupActive) return members;
    return members.filter((m: any) => selectedGroup.includes(m.characterName));
  }, [members, selectedGroup, isGroupActive]);

  const currentComparison = useMemo(() => {
    const comp = comparisons[period];
    if (!comp || !comp.hasData || !isGroupActive) return comp;
    return { ...comp, members: comp.members.filter(m => selectedGroup.includes(m.characterName)) };
  }, [comparisons, period, selectedGroup, isGroupActive]);

  const filteredSnapshots = useMemo(() => {
    if (!isGroupActive) return snapshots;
    return snapshots.map((snap: any) => ({
      ...snap,
      members: snap.members.filter((m: any) => selectedGroup.includes(m.characterName)),
    }));
  }, [snapshots, selectedGroup, isGroupActive]);

  const filteredMemberNames = isGroupActive ? selectedGroup : allMemberNames;

  const toggleMember = (name: string) => {
    onGroupChange(
      selectedGroup.includes(name)
        ? selectedGroup.filter(n => n !== name)
        : [...selectedGroup, name]
    );
  };

  return (
    <div className="space-y-3">

      {/* ── 기간 탭 ── */}
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
      </div>

      {/* ── 비교 대상 (접힘/펼침) ── */}
      <div className="maple-card p-3">
        <button
          onClick={() => setShowGroupPicker(!showGroupPicker)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold opacity-40">비교 대상</span>
            {isGroupActive ? (
              <span className="maple-badge text-xs" style={{ background: '#FFF3E0', color: 'var(--maple-orange)' }}>
                🎯 {selectedGroup.length}명
              </span>
            ) : (
              <span className="text-xs opacity-40">전체 {members.length}명</span>
            )}
          </div>
          <span className="text-xs opacity-40">{showGroupPicker ? '▲' : '▼'}</span>
        </button>

        {showGroupPicker && (
          <div className="mt-3 pt-3 border-t border-amber-100">
            {/* 초기화 + 검색 */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="🔍 닉네임 검색"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-full text-xs border-2 border-amber-100 focus:border-amber-300 outline-none bg-white"
              />
              {isGroupActive && (
                <button
                  onClick={() => onGroupChange([])}
                  className="text-xs px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors whitespace-nowrap"
                  style={{ color: '#E53935', border: '1px solid #FFCDD2' }}
                >
                  ✕ 초기화
                </button>
              )}
            </div>

            {/* 선택된 멤버 태그 */}
            {isGroupActive && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedGroup.map(name => (
                  <button
                    key={name}
                    onClick={() => toggleMember(name)}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--maple-orange)', color: 'white' }}
                  >
                    {name} ✕
                  </button>
                ))}
              </div>
            )}

            {/* 멤버 피커 */}
            <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
              {allMemberNames.filter(name =>
                !memberSearch || name.toLowerCase().includes(memberSearch.toLowerCase())
              ).map(name => (
                <button
                  key={name}
                  onClick={() => toggleMember(name)}
                  className="text-xs px-2 py-0.5 rounded-full transition-all"
                  style={{
                    background: selectedGroup.includes(name) ? 'var(--maple-orange)' : '#F5F5F5',
                    color: selectedGroup.includes(name) ? 'white' : '#666',
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 랭킹 ── */}
      <GrowthRanking members={filteredMembers} comparison={currentComparison} />
    </div>
  );
}
