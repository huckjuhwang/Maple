'use client';

import { useState, useMemo } from 'react';
import GrowthSection from '@/components/growth/GrowthSection';
import MemberList from '@/components/dashboard/MemberList';
import type { CompareResult } from '@/features/growth/compare';

type Tab = 'growth' | 'members';

interface Props {
  members: any[];
  comparisons: {
    daily: CompareResult | null;
    weekly: CompareResult | null;
    monthly: CompareResult | null;
  };
  dailyComparisons: Record<string, CompareResult | null>;
  snapshots: any[];
  allMemberNames: string[];
}

export default function Dashboard({ members, comparisons, dailyComparisons, snapshots, allMemberNames }: Props) {
  const [tab, setTab] = useState<Tab>('growth');
  const [selectedGroup, setSelectedGroup] = useState<string[]>([]);
  const isGroupActive = selectedGroup.length > 0;

  const filteredMembers = useMemo(() => {
    if (!isGroupActive) return members;
    return members.filter((m: any) => selectedGroup.includes(m.characterName));
  }, [members, selectedGroup, isGroupActive]);

  return (
    <>
      {/* 탭 네비게이션 */}
      <div className="maple-card p-1.5 mb-5 flex gap-1">
        <button
          onClick={() => setTab('growth')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            tab === 'growth'
              ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm'
              : 'hover:bg-amber-50 opacity-50'
          }`}
        >
          <span>🏃</span> 성장 레이스
        </button>
        <button
          onClick={() => setTab('members')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            tab === 'members'
              ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm'
              : 'hover:bg-amber-50 opacity-50'
          }`}
        >
          <span>🐌</span> 길드원 현황
        </button>
      </div>

      {/* 성장 레이스 */}
      {tab === 'growth' && (
        <section className="mb-6">
          <GrowthSection
            members={members}
            comparisons={comparisons}
            dailyComparisons={dailyComparisons}
            snapshots={snapshots}
            allMemberNames={allMemberNames}
            selectedGroup={selectedGroup}
            onGroupChange={setSelectedGroup}
          />
        </section>
      )}

      {/* 길드원 현황 */}
      {tab === 'members' && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs opacity-50">
              {isGroupActive
                ? `${filteredMembers.length}/${members.length}명 (그룹 필터)`
                : `전투력순 · ${members.length}명`
              }
            </span>
          </div>
          <MemberList members={filteredMembers} />
        </section>
      )}
    </>
  );
}
