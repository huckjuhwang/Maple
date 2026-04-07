'use client';

import { useState, useMemo } from 'react';
import GrowthSection from '@/components/growth/GrowthSection';
import MemberList from '@/components/dashboard/MemberList';
import type { CompareResult } from '@/features/growth/compare';

interface Props {
  members: any[];
  comparisons: {
    daily: CompareResult | null;
    weekly: CompareResult | null;
    monthly: CompareResult | null;
  };
  snapshots: any[];
  allMemberNames: string[];
}

export default function Dashboard({ members, comparisons, snapshots, allMemberNames }: Props) {
  const [selectedGroup, setSelectedGroup] = useState<string[]>([]);
  const isGroupActive = selectedGroup.length > 0;

  // 필터링된 멤버
  const filteredMembers = useMemo(() => {
    if (!isGroupActive) return members;
    return members.filter((m: any) => selectedGroup.includes(m.characterName));
  }, [members, selectedGroup, isGroupActive]);

  return (
    <>
      {/* 성장 레이스 */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl mushroom-bounce">🏃</span>
          <h2 className="text-xl font-bold" style={{ color: 'var(--maple-brown)' }}>
            성장 레이스
          </h2>
        </div>
        <GrowthSection
          members={members}
          comparisons={comparisons}
          snapshots={snapshots}
          allMemberNames={allMemberNames}
          selectedGroup={selectedGroup}
          onGroupChange={setSelectedGroup}
        />
      </section>

      {/* 길드원 현황 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl slime-squish">🐌</span>
          <h2 className="text-xl font-bold" style={{ color: 'var(--maple-brown)' }}>
            길드원 현황
          </h2>
          <span className="text-xs opacity-50 ml-auto">
            {isGroupActive
              ? `${filteredMembers.length}/${members.length}명 (그룹 필터)`
              : `전투력순 · ${members.length}명`
            }
          </span>
        </div>
        <MemberList members={filteredMembers} />
      </section>
    </>
  );
}
