'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { formatCombatPower, formatNumber } from '@/lib/constants';
import MemberFilter from '@/components/ui/MemberFilter';

function scouterUrl(name: string) {
  return `https://maplescouter.com/info?name=${encodeURIComponent(name)}`;
}

interface Props {
  members: any[];
}

export default function MemberList({ members }: Props) {
  const [filtered, setFiltered] = useState(members);

  const handleFilter = useCallback((result: any[]) => {
    setFiltered(result);
  }, []);

  return (
    <div>
      <MemberFilter members={members} onFilter={handleFilter} />

      <div className="maple-card p-4">
        <div className="text-xs opacity-50 mb-2 text-right">
          {filtered.length === members.length
            ? `${members.length}명`
            : `${filtered.length}/${members.length}명 표시`}
        </div>
        <div className="space-y-1">
          {filtered.map((member: any, i: number) => (
            <div
              key={member.characterName}
              className="rank-row slide-in"
              style={{ animationDelay: `${Math.min(i * 15, 300)}ms` }}
            >
              <div className="w-8 text-center font-bold text-sm" style={{ color: i < 3 ? 'var(--maple-orange)' : '#999' }}>
                {i === 0 ? <span className="crown-wiggle">🥇</span> : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </div>

              <Link
                href={`/member/${encodeURIComponent(member.characterName)}`}
                className="w-16 h-16 rounded-full overflow-hidden bg-amber-50 mr-3 flex-shrink-0 border-2 char-img-hover block"
                style={{ borderColor: i < 3 ? 'var(--maple-yellow)' : '#eee' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={member.characterImage}
                  alt={member.characterName}
                  className="w-full h-full object-cover"
                  style={{ imageRendering: 'pixelated' }}
                />
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <Link
                    href={`/member/${encodeURIComponent(member.characterName)}`}
                    className="font-semibold text-sm truncate hover:text-blue-500 transition-colors no-underline text-inherit"
                  >
                    {member.characterName}
                  </Link>
                  <a
                    href={scouterUrl(member.characterName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs opacity-30 hover:opacity-70 no-underline"
                    title="환산 사이트에서 보기"
                  >
                    🔍
                  </a>
                </div>
                <div className="text-xs opacity-60">{member.job} &middot; Lv.{member.level}</div>
              </div>

              <div className="text-right">
                <div className="font-bold text-sm" style={{ color: 'var(--maple-orange)' }}>
                  {formatCombatPower(member.combatPower)}
                </div>
                <div className="text-xs opacity-50">
                  유니온 {formatNumber(member.unionLevel)}
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-8">
              <div className="text-3xl mb-2 slime-squish">🐌</div>
              <p className="text-sm opacity-50">검색 결과가 없어요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
