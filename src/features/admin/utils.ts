/**
 * 클라이언트에서 사용 가능한 유틸 (fs 의존 없음)
 */

import type { MemberAdmin } from './types';

export function calcStats(members: MemberAdmin[]) {
  const active = members.filter(m => m.status !== 'left');
  const mainChars = active.filter(m => m.mainCharacter === 'original' || m.mainCharacter === '');
  const positionCounts: Record<string, number> = {};
  for (const m of active) {
    if (m.position) {
      positionCounts[m.position] = (positionCounts[m.position] ?? 0) + 1;
    }
  }
  const avgLevel = mainChars.length
    ? Math.round(mainChars.reduce((s, m) => s + (m.level ?? 0), 0) / mainChars.length)
    : 0;

  return {
    total: active.length,
    mainCount: mainChars.length,
    avgLevel,
    positionCounts,
    newCount: active.filter(m => m.status === 'new').length,
    leftCount: members.filter(m => m.status === 'left').length,
  };
}
