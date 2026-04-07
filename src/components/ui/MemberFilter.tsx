'use client';

import { useState, useMemo, useEffect } from 'react';

interface Props {
  members: any[];
  onFilter: (filtered: any[]) => void;
}

export default function MemberFilter({ members, onFilter }: Props) {
  const [searchText, setSearchText] = useState('');
  const [jobFilter, setJobFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');

  // 직업 목록
  const jobs = useMemo(() => {
    const set = new Set<string>();
    members.forEach(m => set.add(m.job));
    return Array.from(set).sort();
  }, [members]);

  // 필터 적용 (useEffect로 사이드이펙트 처리)
  useEffect(() => {
    let filtered = members;

    if (searchText) {
      const lower = searchText.toLowerCase();
      filtered = filtered.filter((m: any) =>
        m.characterName.toLowerCase().includes(lower)
      );
    }

    if (jobFilter !== 'all') {
      filtered = filtered.filter((m: any) => m.job === jobFilter);
    }

    if (levelFilter !== 'all') {
      const [min, max] = levelFilter.split('-').map(Number);
      filtered = filtered.filter((m: any) => m.level >= min && m.level <= (max || 999));
    }

    onFilter(filtered);
  }, [searchText, jobFilter, levelFilter, members, onFilter]);

  return (
    <div className="flex gap-2 flex-wrap mb-3">
      {/* 닉네임 검색 */}
      <input
        type="text"
        placeholder="🔍 닉네임 검색"
        value={searchText}
        onChange={e => setSearchText(e.target.value)}
        className="px-3 py-2 rounded-full text-sm border-2 border-amber-100 focus:border-amber-300 outline-none bg-white flex-1 min-w-[150px]"
      />

      {/* 직업 필터 */}
      <select
        value={jobFilter}
        onChange={e => setJobFilter(e.target.value)}
        className="px-3 py-2 rounded-full text-sm border-2 border-amber-100 bg-white cursor-pointer"
      >
        <option value="all">전체 직업</option>
        {jobs.map(job => (
          <option key={job} value={job}>{job}</option>
        ))}
      </select>

      {/* 레벨 구간 필터 */}
      <select
        value={levelFilter}
        onChange={e => setLevelFilter(e.target.value)}
        className="px-3 py-2 rounded-full text-sm border-2 border-amber-100 bg-white cursor-pointer"
      >
        <option value="all">전체 레벨</option>
        <option value="290-999">Lv.290+</option>
        <option value="280-289">Lv.280~289</option>
        <option value="270-279">Lv.270~279</option>
        <option value="260-269">Lv.260~269</option>
        <option value="250-259">Lv.250~259</option>
        <option value="200-249">Lv.200~249</option>
        <option value="1-199">Lv.199 이하</option>
      </select>
    </div>
  );
}
