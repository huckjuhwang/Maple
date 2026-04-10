'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AdminData, MemberAdmin, LeftMember, MemoEntry } from './types';
import { LEAVE_REASONS } from './types';
import { calcStats } from './utils';

type Tab = 'mirror' | 'dalla' | 'left';

interface Props {
  secret: string;
}

function scouterUrl(name: string) {
  return `https://maplescouter.com/info?name=${encodeURIComponent(name)}`;
}

/** API 호출 헬퍼 (에러 처리 포함) */
async function apiCall(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };
    return await res.json();
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

// 마스터 직위는 config에서 관리

export default function AdminPage({ secret }: Props) {
  const [data, setData] = useState<AdminData | null>(null);
  const [tab, setTab] = useState<Tab>('mirror');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'new' | 'left'>('all');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [leftSearch, setLeftSearch] = useState('');
  const [leftSort, setLeftSort] = useState<{ col: string; asc: boolean }>({ col: '', asc: true });
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [bulkPosition, setBulkPosition] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortAsc, setSortAsc] = useState(true);
  const [leaveModal, setLeaveModal] = useState<{ name: string; guild: 'mirror' | 'dalla' } | null>(null);
  const [positionModal, setPositionModal] = useState(false);
  const [leaveReason, setLeaveReason] = useState('탈퇴');
  const [noRejoin, setNoRejoin] = useState(false);
  const [noRejoinReason, setNoRejoinReason] = useState('');
  const [memoModal, setMemoModal] = useState<{ name: string; history: MemoEntry[] } | null>(null);
  const [transferModal, setTransferModal] = useState<{ name: string; from: 'mirror' | 'dalla'; to: 'mirror' | 'dalla' } | null>(null);
  const [rejoinModal, setRejoinModal] = useState<{ name: string; toGuild: 'mirror' | 'dalla' } | null>(null);
  const [backupModal, setBackupModal] = useState(false);
  const [backupList, setBackupList] = useState<{ name: string; date: string; size: number }[]>([]);

  // 디바운스 타이머
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 데이터 로드
  const loadData = useCallback(() => {
    setLoadError(false);
    apiCall(`/api/admin/${secret}`)
      .then(r => {
        if (r.success) setData(r.data);
        else setLoadError(true);
      });
  }, [secret]);

  useEffect(() => { loadData(); }, [loadData]);

  // 멤버 업데이트 (인라인 편집 + 디바운스 500ms)
  const updateField = useCallback((
    characterName: string,
    guild: 'mirror' | 'dalla',
    field: string,
    value: any
  ) => {
    if (!data) return;

    // 로컬 상태 즉시 업데이트 (UI 반응성)
    const members = guild === 'dalla' ? data.dalla : data.mirror;
    const member = members.find(m => m.characterName === characterName);
    if (member) (member as any)[field] = value;
    setData({ ...data });
    setSaveError('');

    // 디바운스: 같은 멤버+필드 조합은 500ms 후 저장
    const key = `${characterName}:${field}`;
    const existing = debounceTimers.current.get(key);
    if (existing) clearTimeout(existing);

    debounceTimers.current.set(key, setTimeout(async () => {
      debounceTimers.current.delete(key);
      const result = await apiCall(`/api/admin/${secret}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateMember',
          characterName,
          guild,
          updates: { [field]: value },
        }),
      });
      if (!result.success) {
        setSaveError(`${characterName} 저장 실패`);
      }
    }, 500));
  }, [data, secret]);

  // 탈퇴 처리
  const handleLeave = useCallback(async () => {
    if (!leaveModal || !data) return;
    setSaving(true);
    setSaveError('');

    const result = await apiCall(`/api/admin/${secret}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'processLeave',
        characterName: leaveModal.name,
        guild: leaveModal.guild,
        reason: leaveReason,
        noRejoin,
        noRejoinReason,
      }),
    });

    if (!result.success) {
      setSaveError('탈퇴 처리 실패');
      setSaving(false);
      return;
    }

    // 리로드
    const r = await apiCall(`/api/admin/${secret}`);
    if (r.success) setData(r.data);
    setLeaveModal(null);
    setLeaveReason('탈퇴');
    setNoRejoin(false);
    setNoRejoinReason('');
    setSaving(false);
  }, [leaveModal, data, secret, leaveReason, noRejoin, noRejoinReason]);

  // 직위 업데이트
  const updatePositions = useCallback(async (positions: string[]) => {
    if (!data) return;
    data.config.positions = positions;
    setData({ ...data });
    const result = await apiCall(`/api/admin/${secret}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updatePositions', positions }),
    });
    if (!result.success) setSaveError('직위 저장 실패');
  }, [data, secret]);

  // 전입 처리
  const handleTransfer = useCallback(async () => {
    if (!transferModal || !data) return;
    setSaving(true);
    setSaveError('');

    const result = await apiCall(`/api/admin/${secret}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'transfer',
        characterName: transferModal.name,
        fromGuild: transferModal.from,
        toGuild: transferModal.to,
      }),
    });

    if (!result.success) {
      setSaveError('전입 처리 실패');
      setSaving(false);
      return;
    }

    const r = await apiCall(`/api/admin/${secret}`);
    if (r.success) setData(r.data);
    setTransferModal(null);
    setSaving(false);
  }, [transferModal, data, secret]);

  // 재가입 처리
  const handleRejoin = useCallback(async () => {
    if (!rejoinModal || !data) return;
    setSaving(true);
    setSaveError('');

    const result = await apiCall(`/api/admin/${secret}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'rejoin',
        characterName: rejoinModal.name,
        toGuild: rejoinModal.toGuild,
      }),
    });

    if (!result.success) {
      setSaveError('재가입 처리 실패');
      setSaving(false);
      return;
    }

    const r = await apiCall(`/api/admin/${secret}`);
    if (r.success) setData(r.data);
    setRejoinModal(null);
    setSaving(false);
  }, [rejoinModal, data, secret]);

  // 백업 다운로드
  const handleDownloadBackup = useCallback(() => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  // 백업 파일 업로드 복원
  const handleUploadRestore = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const uploadData = JSON.parse(text);
      if (!uploadData?.config || !uploadData?.mirror || !uploadData?.dalla || !uploadData?.left) {
        setSaveError('올바른 백업 파일이 아닙니다');
        return;
      }
      const ok = confirm(`이 백업으로 복원하면 현재 데이터가 덮어씌워집니다. 진행할까요?`);
      if (!ok) return;
      setSaving(true);
      const result = await apiCall(`/api/admin/${secret}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restoreFromUpload', data: uploadData }),
      });
      if (result.success) {
        setData(uploadData);
        setSaveError('');
      } else {
        setSaveError('복원 실패');
      }
      setSaving(false);
    } catch {
      setSaveError('파일을 읽을 수 없습니다');
    }
  }, [secret]);

  // 서버 백업 목록 + 복원
  const openBackupModal = useCallback(async () => {
    const result = await apiCall(`/api/admin/${secret}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'listBackups' }),
    });
    if (result.success) setBackupList(result.backups);
    setBackupModal(true);
  }, [secret]);

  const handleRestoreBackup = useCallback(async (backupName: string) => {
    const ok = confirm('이 시점으로 복원하면 현재 데이터가 덮어씌워집니다. 진행할까요?');
    if (!ok) return;
    setSaving(true);
    const result = await apiCall(`/api/admin/${secret}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restoreBackup', backupName }),
    });
    if (result.success) {
      const r = await apiCall(`/api/admin/${secret}`);
      if (r.success) setData(r.data);
      setBackupModal(false);
    } else {
      setSaveError('복원 실패');
    }
    setSaving(false);
  }, [secret]);

  // 체크박스 토글
  const toggleSelect = (name: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // 전체 선택/해제
  const toggleSelectAll = (members: MemberAdmin[]) => {
    if (selectedMembers.size === members.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(members.map(m => m.characterName)));
    }
  };

  // 일괄 직위 변경
  const bulkUpdatePosition = useCallback(async () => {
    if (!data || !bulkPosition || selectedMembers.size === 0) return;
    setSaveError('');

    // 마스터(세계) 직위는 1명만
    if (bulkPosition === data?.config.masterPosition && selectedMembers.size > 1) {
      setSaveError(`마스터 직위는 1명만 가질 수 있습니다`);
      return;
    }

    const guild = tab as 'mirror' | 'dalla';
    const members = guild === 'dalla' ? data.dalla : data.mirror;

    // 마스터 직위 중복 체크
    if (bulkPosition === data?.config.masterPosition) {
      const existing = members.find(m => m.position === data?.config.masterPosition && !selectedMembers.has(m.characterName));
      if (existing) {
        setSaveError(`마스터 직위는 이미 ${existing.characterName}님이 가지고 있습니다. 먼저 변경해주세요.`);
        return;
      }
    }

    // 로컬 업데이트
    for (const name of selectedMembers) {
      const member = members.find(m => m.characterName === name);
      if (member) member.position = bulkPosition;
    }
    setData({ ...data });

    // 서버 일괄 저장
    for (const name of selectedMembers) {
      await apiCall(`/api/admin/${secret}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateMember',
          characterName: name,
          guild,
          updates: { position: bulkPosition },
        }),
      });
    }

    setSelectedMembers(new Set());
    setBulkPosition('');
  }, [data, tab, secret, bulkPosition, selectedMembers]);

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <div className="text-4xl mb-4 mushroom-bounce">🍄</div>
        {loadError ? (
          <>
            <p className="text-sm mb-3" style={{ color: '#C62828' }}>데이터를 불러오지 못했어요</p>
            <button onClick={loadData} className="maple-tab maple-tab-active text-sm">다시 시도</button>
          </>
        ) : (
          <p>로딩 중...</p>
        )}
      </div>
    );
  }

  const currentMembers = tab === 'mirror' ? data.mirror : tab === 'dalla' ? data.dalla : [];
  const stats = tab !== 'left' ? calcStats(currentMembers) : null;

  // 필터 + 검색
  let displayMembers = currentMembers.filter(m => {
    if (filter === 'active') return m.status === 'active';
    if (filter === 'new') return m.status === 'new';
    if (filter === 'left') return m.status === 'left';
    return true;
  });
  if (search) {
    const lower = search.toLowerCase();
    displayMembers = displayMembers.filter(m =>
      m.characterName.toLowerCase().includes(lower) ||
      m.realName.toLowerCase().includes(lower)
    );
  }

  // 정렬
  if (sortColumn) {
    displayMembers = [...displayMembers].sort((a, b) => {
      let va: any = (a as any)[sortColumn] ?? '';
      let vb: any = (b as any)[sortColumn] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortAsc ? va - vb : vb - va;
      }
      va = String(va).toLowerCase();
      vb = String(vb).toLowerCase();
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }

  const leftCount = currentMembers.filter(m => m.status === 'left').length;
  const newCount = currentMembers.filter(m => m.status === 'new').length;

  // 컬럼 헤더 클릭 정렬
  const sortBy = (col: string) => {
    if (sortColumn === col) setSortAsc(!sortAsc);
    else { setSortColumn(col); setSortAsc(true); }
  };
  const sortIcon = (col: string) => sortColumn === col ? (sortAsc ? ' ▲' : ' ▼') : '';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* 헤더 */}
      <header className="mirror-card p-4 mb-6 relative">
        <div className="absolute top-2 right-3 text-lg mushroom-bounce">🍄</div>
        <div className="flex items-center gap-3">
          <img src="/guild-name.png" alt="거울 길드" className="h-10 object-contain" />
          <div>
            <h1 className="text-xl font-bold text-gradient-blue">거울 길드 관리</h1>
            <p className="text-xs opacity-50">마지막 수정: {data.config.lastUpdated?.slice(0, 10)}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={handleDownloadBackup} className="maple-tab maple-tab-inactive text-xs">📥 백업</button>
            <label className="maple-tab maple-tab-inactive text-xs cursor-pointer">
              📤 복원
              <input type="file" accept=".json" className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleUploadRestore(file);
                e.target.value = '';
              }} />
            </label>
            <button onClick={openBackupModal} className="maple-tab maple-tab-inactive text-xs">🕐 이전 버전</button>
            <button onClick={() => setPositionModal(true)} className="maple-tab maple-tab-inactive text-xs">⚙️ 직위 관리</button>
          </div>
        </div>
      </header>

      {/* 에러 메시지 */}
      {saveError && (
        <div className="maple-card p-3 mb-4 flex items-center gap-2" style={{ borderColor: '#FFCDD2', background: '#FFF5F5' }}>
          <span>⚠️</span>
          <span className="text-sm" style={{ color: '#C62828' }}>{saveError}</span>
          <button onClick={() => setSaveError('')} className="ml-auto text-xs opacity-50">✕</button>
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-2 mb-4">
        {(['mirror', 'dalla', 'left'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setFilter('all'); setSearch(''); }}
            className={`maple-tab ${tab === t ? 'maple-tab-active' : 'maple-tab-inactive'}`}
          >
            {t === 'mirror' && `🪞 거울 (${data.mirror.filter(m => m.status !== 'left').length})`}
            {t === 'dalla' && `🌙 달라 (${data.dalla.filter(m => m.status !== 'left').length})`}
            {t === 'left' && `🚪 탈퇴 (${data.left.length})`}
          </button>
        ))}
      </div>

      {/* 거울/달라 탭 */}
      {tab !== 'left' && (
        <>
          {/* 상단 요약 */}
          {stats && (
            <div className="maple-card p-4 mb-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <div>전체 <strong>{stats.total}</strong>명</div>
                <div>본캐 <strong>{stats.mainCount}</strong>명</div>
                <div>평균 Lv.<strong>{stats.avgLevel}</strong></div>
                {Object.entries(stats.positionCounts).map(([pos, cnt]) => (
                  <div key={pos} className="maple-badge" style={{ background: '#F5F5F5', color: '#666' }}>
                    {pos} {cnt}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 알림 배너 */}
          {leftCount > 0 && (
            <div className="maple-card p-3 mb-3 flex items-center gap-2 cursor-pointer hover:bg-red-50" onClick={() => setFilter('left')} style={{ borderColor: '#FFCDD2' }}>
              <span>🚪</span>
              <span className="text-sm font-bold" style={{ color: '#E53935' }}>미처리 탈퇴 {leftCount}명</span>
              <span className="text-xs opacity-50 ml-auto">클릭하여 확인</span>
            </div>
          )}
          {newCount > 0 && (
            <div className="maple-card p-3 mb-3 flex items-center gap-2 cursor-pointer hover:bg-green-50" onClick={() => setFilter('new')} style={{ borderColor: '#C8E6C9' }}>
              <span>🆕</span>
              <span className="text-sm font-bold" style={{ color: '#43A047' }}>신규 가입 {newCount}명</span>
              <span className="text-xs opacity-50 ml-auto">클릭하여 확인</span>
            </div>
          )}

          {/* 필터 + 검색 */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <input
              type="text"
              placeholder="🔍 닉네임/이름 검색"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2 rounded-full text-sm border-2 border-amber-100 focus:border-amber-300 outline-none bg-white"
            />
            {['all', 'active', 'new', 'left'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`maple-tab text-xs ${filter === f ? 'maple-tab-active' : 'maple-tab-inactive'}`}
              >
                {f === 'all' ? '전체' : f === 'active' ? '✅활동' : f === 'new' ? '🆕신규' : '🚪탈퇴'}
              </button>
            ))}
          </div>

          {/* 일괄 변경 바 */}
          {selectedMembers.size > 0 && (
            <div className="maple-card p-3 mb-3 flex items-center gap-2 flex-wrap" style={{ borderColor: 'var(--maple-orange)', background: '#FFF8ED' }}>
              <span className="text-sm font-bold" style={{ color: 'var(--maple-orange)' }}>
                ✅ {selectedMembers.size}명 선택
              </span>
              <select
                value={bulkPosition}
                onChange={e => setBulkPosition(e.target.value)}
                className="text-sm border-2 border-amber-200 rounded-lg px-2 py-1 bg-white"
              >
                <option value="">직위 선택</option>
                {data.config.positions.map(p => (
                  <option key={p} value={p}>{p} {p === data?.config.masterPosition ? '(마스터·1명)' : ''}</option>
                ))}
              </select>
              <button
                onClick={bulkUpdatePosition}
                disabled={!bulkPosition}
                className="maple-tab text-xs"
                style={{ background: bulkPosition ? 'var(--maple-orange)' : '#ddd', color: 'white' }}
              >
                일괄 변경
              </button>
              <button
                onClick={() => setSelectedMembers(new Set())}
                className="text-xs opacity-50 hover:opacity-100 ml-auto"
              >
                선택 해제
              </button>
            </div>
          )}

          {/* 테이블 */}
          <div className="maple-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-amber-100 bg-amber-50/50">
                  <th className="py-2 px-1 text-center text-xs w-8">
                    <input
                      type="checkbox"
                      checked={selectedMembers.size === displayMembers.length && displayMembers.length > 0}
                      onChange={() => toggleSelectAll(displayMembers)}
                    />
                  </th>
                  <th className="py-2 px-2 text-left text-xs w-8 cursor-pointer hover:text-amber-600" onClick={() => sortBy('status')}>상태{sortIcon('status')}</th>
                  <th className="py-2 px-2 text-left text-xs cursor-pointer hover:text-amber-600" onClick={() => sortBy('characterName')}>닉네임{sortIcon('characterName')}</th>
                  <th className="py-2 px-2 text-left text-xs cursor-pointer hover:text-amber-600" onClick={() => sortBy('job')}>직업{sortIcon('job')}</th>
                  <th className="py-2 px-2 text-right text-xs cursor-pointer hover:text-amber-600" onClick={() => sortBy('level')}>레벨{sortIcon('level')}</th>
                  <th className="py-2 px-2 text-left text-xs cursor-pointer hover:text-amber-600" onClick={() => sortBy('mainCharacter')}>본/부캐{sortIcon('mainCharacter')}</th>
                  <th className="py-2 px-2 text-left text-xs cursor-pointer hover:text-amber-600" onClick={() => sortBy('position')}>직위{sortIcon('position')}</th>
                  {tab === 'dalla' && <th className="py-2 px-2 text-left text-xs">본길전입</th>}
                  <th className="py-2 px-2 text-left text-xs">이름</th>
                  <th className="py-2 px-2 text-left text-xs">비고</th>
                  <th className="py-2 px-2 text-left text-xs">미접속사유</th>
                  <th className="py-2 px-2 text-center text-xs">📝</th>
                  <th className="py-2 px-2 text-center text-xs">🔍</th>
                  <th className="py-2 px-2 text-center text-xs">전입</th>
                  <th className="py-2 px-2 text-center text-xs">처리</th>
                </tr>
              </thead>
              <tbody>
                {displayMembers.map(member => (
                  <tr
                    key={member.characterName}
                    className={`border-b border-amber-50 hover:bg-amber-50/30 ${member.status === 'left' ? 'opacity-50 bg-red-50/30' : member.leaveDetected ? 'bg-orange-50/40' : member.status === 'new' ? 'bg-green-50/30' : ''}`}
                  >
                    <td className="py-2 px-1 text-center">
                      <input
                        type="checkbox"
                        checked={selectedMembers.has(member.characterName)}
                        onChange={() => toggleSelect(member.characterName)}
                      />
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      {member.status === 'new' && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#E8F5E9', color: '#2E7D32' }}>신규</span>
                      )}
                      {member.status === 'left' && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#FFEBEE', color: '#C62828' }}>탈퇴</span>
                      )}
                      {member.status === 'active' && !member.leaveDetected && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#F5F5F5', color: '#999' }}>활동</span>
                      )}
                      {member.leaveDetected && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#FFF3E0', color: '#E65100' }}>이탈감지</span>
                      )}
                    </td>
                    <td className="py-2 px-2 font-medium whitespace-nowrap">{member.characterName}</td>
                    <td className="py-2 px-2 text-xs opacity-70">{member.job}</td>
                    <td className="py-2 px-2 text-right font-medium">{member.level}</td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={member.mainCharacter}
                        onChange={e => updateField(member.characterName, tab as any, 'mainCharacter', e.target.value)}
                        placeholder="original"
                        className="w-20 px-1 py-0.5 text-xs border border-gray-200 rounded bg-transparent"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={member.position}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === data?.config.masterPosition) {
                            const members2 = tab === 'dalla' ? data.dalla : data.mirror;
                            const existing = members2.find(m => m.position === data?.config.masterPosition && m.characterName !== member.characterName);
                            if (existing) {
                              setSaveError(`마스터 직위(${data?.config.masterPosition})는 이미 ${existing.characterName}님이 가지고 있습니다`);
                              return;
                            }
                          }
                          updateField(member.characterName, tab as any, 'position', val);
                        }}
                        className="text-xs border border-gray-200 rounded bg-transparent py-0.5"
                      >
                        <option value="">-</option>
                        {data.config.positions.map(p => (
                          <option key={p} value={p}>{p}{p === data?.config.masterPosition ? ' (마스터)' : ''}</option>
                        ))}
                      </select>
                    </td>
                    {tab === 'dalla' && (
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={member.fromMirror}
                          onChange={e => updateField(member.characterName, 'dalla', 'fromMirror', e.target.value)}
                          className="w-20 px-1 py-0.5 text-xs border border-gray-200 rounded bg-transparent"
                        />
                      </td>
                    )}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={member.realName}
                        onChange={e => updateField(member.characterName, tab as any, 'realName', e.target.value)}
                        className="w-20 px-1 py-0.5 text-xs border border-gray-200 rounded bg-transparent"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={member.note}
                        onChange={e => updateField(member.characterName, tab as any, 'note', e.target.value)}
                        className="w-24 px-1 py-0.5 text-xs border border-gray-200 rounded bg-transparent"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        value={member.inactiveReason}
                        onChange={e => updateField(member.characterName, tab as any, 'inactiveReason', e.target.value)}
                        placeholder="사유 입력 시 알림 제외"
                        className="w-28 px-1 py-0.5 text-xs border border-gray-200 rounded bg-transparent"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => setMemoModal({ name: member.characterName, history: member.memoHistory ?? [] })}
                        className="text-xs hover:opacity-70"
                        title="변경 이력"
                      >
                        {(member.memoHistory?.length ?? 0) > 0 ? '📝' : '·'}
                      </button>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <a href={scouterUrl(member.characterName)} target="_blank" rel="noopener noreferrer" className="text-xs hover:opacity-70">🔍</a>
                    </td>
                    <td className="py-2 px-2 text-center">
                      {member.status !== 'left' && (
                        <button
                          onClick={() => setTransferModal({
                            name: member.characterName,
                            from: tab as 'mirror' | 'dalla',
                            to: tab === 'mirror' ? 'dalla' : 'mirror',
                          })}
                          className="text-xs px-2 py-1 rounded-full whitespace-nowrap"
                          style={{ background: '#E3F2FD', color: '#1565C0' }}
                        >
                          {tab === 'mirror' ? '→달라' : '→거울'}
                        </button>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {member.status === 'left' && (
                        <button
                          onClick={() => setLeaveModal({ name: member.characterName, guild: tab as any })}
                          className="text-xs px-2 py-1 rounded-full whitespace-nowrap"
                          style={{ background: '#FFCDD2', color: '#C62828' }}
                        >
                          탈퇴 처리
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {displayMembers.length === 0 && (
              <div className="text-center py-8 text-sm opacity-50">검색 결과가 없어요 🐌</div>
            )}
          </div>
        </>
      )}

      {/* 탈퇴 탭 */}
      {tab === 'left' && (() => {
        // 검색
        let leftList = data.left;
        if (leftSearch) {
          const q = leftSearch.toLowerCase();
          leftList = leftList.filter(m =>
            m.characterName.toLowerCase().includes(q) ||
            m.realName.toLowerCase().includes(q) ||
            m.reason.toLowerCase().includes(q)
          );
        }
        // 정렬
        if (leftSort.col) {
          leftList = [...leftList].sort((a, b) => {
            let va: any = (a as any)[leftSort.col] ?? '';
            let vb: any = (b as any)[leftSort.col] ?? '';
            if (typeof va === 'number' && typeof vb === 'number') return leftSort.asc ? va - vb : vb - va;
            va = String(va).toLowerCase(); vb = String(vb).toLowerCase();
            return leftSort.asc ? va.localeCompare(vb) : vb.localeCompare(va);
          });
        }
        const leftSortBy = (col: string) => {
          if (leftSort.col === col) setLeftSort({ col, asc: !leftSort.asc });
          else setLeftSort({ col, asc: true });
        };
        const leftSortIcon = (col: string) => leftSort.col === col ? (leftSort.asc ? ' ▲' : ' ▼') : '';

        // 전입 기록 추출 (memoHistory에서)
        const transferLogs: { date: string; name: string; from: string; to: string }[] = [];
        for (const m of [...data.mirror, ...data.dalla]) {
          for (const h of (m.memoHistory ?? [])) {
            if (h.field === '전입' || h.field === '재가입') {
              transferLogs.push({ date: h.date, name: m.characterName, from: h.oldValue, to: h.newValue });
            }
          }
        }
        transferLogs.sort((a, b) => b.date.localeCompare(a.date));

        return (
          <>
            {/* 검색 */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="🔍 닉네임/이름/사유 검색"
                value={leftSearch}
                onChange={e => setLeftSearch(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-2 rounded-full text-sm border-2 border-amber-100 focus:border-amber-300 outline-none bg-white"
              />
            </div>

            {/* 탈퇴 테이블 */}
            <div className="maple-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-amber-100 bg-amber-50/50">
                    <th className="py-2 px-2 text-left text-xs cursor-pointer hover:text-amber-600" onClick={() => leftSortBy('characterName')}>닉네임{leftSortIcon('characterName')}</th>
                    <th className="py-2 px-2 text-left text-xs cursor-pointer hover:text-amber-600" onClick={() => leftSortBy('guild')}>길드{leftSortIcon('guild')}</th>
                    <th className="py-2 px-2 text-left text-xs cursor-pointer hover:text-amber-600" onClick={() => leftSortBy('job')}>직업{leftSortIcon('job')}</th>
                    <th className="py-2 px-2 text-right text-xs cursor-pointer hover:text-amber-600" onClick={() => leftSortBy('level')}>레벨{leftSortIcon('level')}</th>
                    <th className="py-2 px-2 text-left text-xs">이름</th>
                    <th className="py-2 px-2 text-left text-xs cursor-pointer hover:text-amber-600" onClick={() => leftSortBy('leftDate')}>탈퇴일{leftSortIcon('leftDate')}</th>
                    <th className="py-2 px-2 text-left text-xs cursor-pointer hover:text-amber-600" onClick={() => leftSortBy('reason')}>사유{leftSortIcon('reason')}</th>
                    <th className="py-2 px-2 text-center text-xs">재가입불가</th>
                    <th className="py-2 px-2 text-center text-xs">재가입</th>
                  </tr>
                </thead>
                <tbody>
                  {leftList.map((m, i) => (
                    <tr key={`${m.characterName}-${i}`} className="border-b border-amber-50 hover:bg-amber-50/30">
                      <td className="py-2 px-2 font-medium">{m.characterName}</td>
                      <td className="py-2 px-2 text-xs">{m.guild === 'mirror' ? '🪞거울' : '🌙달라'}</td>
                      <td className="py-2 px-2 text-xs opacity-70">{m.job}</td>
                      <td className="py-2 px-2 text-right">{m.level}</td>
                      <td className="py-2 px-2 text-xs">{m.realName}</td>
                      <td className="py-2 px-2 text-xs">{m.leftDate}</td>
                      <td className="py-2 px-2">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{
                          background: m.reason.includes('강제') ? '#FFCDD2' : m.reason.includes('장기') ? '#FFF3E0' : '#F5F5F5',
                          color: m.reason.includes('강제') ? '#C62828' : m.reason.includes('장기') ? '#E65100' : '#666',
                        }}>
                          {m.reason}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center text-xs">
                        {m.noRejoin && <span style={{ color: '#C62828' }}>⛔ {m.noRejoinReason || '불가'}</span>}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {!m.noRejoin && (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => setRejoinModal({ name: m.characterName, toGuild: 'mirror' })}
                              className="text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap"
                              style={{ background: '#E8F5E9', color: '#2E7D32' }}
                            >
                              🪞거울
                            </button>
                            <button
                              onClick={() => setRejoinModal({ name: m.characterName, toGuild: 'dalla' })}
                              className="text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap"
                              style={{ background: '#FFF3E0', color: '#E65100' }}
                            >
                              🌙달라
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {leftList.length === 0 && (
                <div className="text-center py-8 text-sm opacity-50">
                  {leftSearch ? '검색 결과가 없어요 🐌' : '탈퇴 기록이 없어요 🎉'}
                </div>
              )}
            </div>

            {/* 전입/재가입 기록 */}
            {transferLogs.length > 0 && (
              <div className="maple-card p-4 mt-4">
                <h3 className="text-sm font-bold mb-3">↔️ 전입/재가입 기록</h3>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {transferLogs.map((log, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="opacity-40 whitespace-nowrap">{log.date}</span>
                      <span className="font-medium">{log.name}</span>
                      <span className="opacity-50">{log.from}</span>
                      <span>→</span>
                      <span className="font-medium" style={{ color: '#1565C0' }}>{log.to}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* 탈퇴 처리 모달 */}
      {leaveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setLeaveModal(null)}>
          <div className="maple-card p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">🚪 탈퇴 처리</h3>
            <p className="text-sm mb-4"><strong>{leaveModal.name}</strong> 님을 탈퇴 처리합니다.</p>

            <label className="text-xs font-bold opacity-60 block mb-1">사유</label>
            <select
              value={leaveReason}
              onChange={e => setLeaveReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border-2 border-amber-100 mb-3 text-sm"
            >
              {LEAVE_REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={noRejoin} onChange={e => setNoRejoin(e.target.checked)} />
              <span className="text-sm" style={{ color: '#C62828' }}>⛔ 재가입 불가</span>
            </label>
            {noRejoin && (
              <input
                type="text"
                value={noRejoinReason}
                onChange={e => setNoRejoinReason(e.target.value)}
                placeholder="재가입 불가 사유"
                className="w-full px-3 py-2 rounded-lg border-2 border-red-200 mb-3 text-sm"
              />
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={() => setLeaveModal(null)} className="maple-tab maple-tab-inactive flex-1">취소</button>
              <button onClick={handleLeave} disabled={saving} className="maple-tab flex-1" style={{ background: '#E53935', color: 'white' }}>
                {saving ? '처리 중...' : '탈퇴 처리'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 직위 관리 모달 */}
      {positionModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setPositionModal(false)}>
          <div className="maple-card p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">⚙️ 직위 관리</h3>
            <div className="space-y-2 mb-4">
              {data.config.positions.map((pos, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      data.config.masterPosition = pos;
                      setData({ ...data });
                      await apiCall(`/api/admin/${secret}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'updateMasterPosition', masterPosition: pos }),
                      });
                    }}
                    className="text-xs px-2 py-1 rounded-full whitespace-nowrap"
                    style={{
                      background: data.config.masterPosition === pos ? '#FFD93D' : '#F5F5F5',
                      color: data.config.masterPosition === pos ? '#6B4226' : '#999',
                    }}
                    title="마스터 직위로 지정 (1명만)"
                  >
                    {data.config.masterPosition === pos ? '👑' : '○'}
                  </button>
                  <input
                    type="text"
                    value={pos}
                    onChange={e => {
                      const newPositions = [...data.config.positions];
                      newPositions[i] = e.target.value;
                      updatePositions(newPositions);
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg border-2 border-amber-100 text-sm"
                  />
                  <button
                    onClick={() => {
                      const newPositions = data.config.positions.filter((_, j) => j !== i);
                      updatePositions(newPositions);
                    }}
                    className="text-xs px-2 py-1 rounded-full hover:bg-red-50"
                    style={{ color: '#E53935' }}
                  >✕</button>
                </div>
              ))}
            </div>
            <p className="text-xs opacity-50 mb-4">👑 = 마스터 직위 (1명만 가능). 클릭으로 변경.</p>
            <button
              onClick={() => updatePositions([...data.config.positions, '새 직위'])}
              className="w-full maple-tab maple-tab-inactive text-sm mb-4"
            >
              + 직위 추가
            </button>
            <button onClick={() => setPositionModal(false)} className="w-full maple-tab maple-tab-active">
              완료
            </button>
          </div>
        </div>
      )}

      {/* 메모 히스토리 모달 */}
      {memoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setMemoModal(null)}>
          <div className="maple-card p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">📝 {memoModal.name} 변경 이력</h3>
            {memoModal.history.length === 0 ? (
              <p className="text-sm opacity-50 text-center py-4">변경 이력이 없어요</p>
            ) : (
              <div className="space-y-2">
                {[...memoModal.history].reverse().map((entry, i) => (
                  <div key={i} className="flex gap-2 text-sm border-b border-amber-50 pb-2">
                    <span className="text-xs opacity-40 whitespace-nowrap pt-0.5">{entry.date}</span>
                    <div className="flex-1">
                      <span className="text-xs px-1.5 py-0.5 rounded-full mr-1" style={{ background: '#F5F5F5', color: '#666' }}>
                        {entry.field}
                      </span>
                      {entry.oldValue && (
                        <span className="text-xs line-through opacity-40 mr-1">{entry.oldValue}</span>
                      )}
                      <span className="text-xs font-medium">{entry.newValue}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setMemoModal(null)} className="w-full maple-tab maple-tab-active mt-4">
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 전입 확인 모달 */}
      {transferModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setTransferModal(null)}>
          <div className="maple-card p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">↔️ 길드 전입</h3>
            <p className="text-sm mb-4">
              <strong>{transferModal.name}</strong> 님을{' '}
              <span style={{ color: '#1565C0' }}>
                {transferModal.from === 'mirror' ? '🪞거울' : '🌙달라'}
              </span>
              {' → '}
              <span style={{ color: '#E65100' }}>
                {transferModal.to === 'mirror' ? '🪞거울' : '🌙달라'}
              </span>
              로 전입합니다.
            </p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setTransferModal(null)} className="maple-tab maple-tab-inactive flex-1">취소</button>
              <button onClick={handleTransfer} disabled={saving} className="maple-tab flex-1" style={{ background: '#1565C0', color: 'white' }}>
                {saving ? '처리 중...' : '전입 처리'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 재가입 확인 모달 */}
      {rejoinModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setRejoinModal(null)}>
          <div className="maple-card p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">🔄 재가입 처리</h3>
            <p className="text-sm mb-4">
              <strong>{rejoinModal.name}</strong> 님을{' '}
              <span style={{ color: '#2E7D32', fontWeight: 'bold' }}>
                {rejoinModal.toGuild === 'mirror' ? '🪞거울' : '🌙달라'}
              </span>
              에 재가입 처리합니다.
            </p>
            <p className="text-xs opacity-50 mb-4">탈퇴 기록은 삭제되고, 해당 길드에 활동 상태로 복원됩니다.</p>
            <div className="flex gap-2">
              <button onClick={() => setRejoinModal(null)} className="maple-tab maple-tab-inactive flex-1">취소</button>
              <button onClick={handleRejoin} disabled={saving} className="maple-tab flex-1" style={{ background: '#2E7D32', color: 'white' }}>
                {saving ? '처리 중...' : '재가입'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 백업 목록 모달 */}
      {backupModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setBackupModal(false)}>
          <div className="maple-card p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">🕐 이전 버전</h3>
            <p className="text-xs opacity-50 mb-3">데이터가 변경될 때마다 자동 저장됩니다. 클릭하면 해당 시점으로 복원합니다.</p>
            {backupList.length === 0 ? (
              <p className="text-sm opacity-50 text-center py-4">백업이 없어요</p>
            ) : (
              <div className="space-y-2">
                {backupList.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-amber-50 cursor-pointer border border-amber-100"
                    onClick={() => handleRestoreBackup(b.name)}
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium">{b.date}</div>
                      <div className="text-xs opacity-40">{Math.round(b.size / 1024)}KB</div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#E3F2FD', color: '#1565C0' }}>복원</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setBackupModal(false)} className="w-full maple-tab maple-tab-active mt-4">닫기</button>
          </div>
        </div>
      )}

      {/* 푸터 */}
      <footer className="text-center mt-8 mb-4 text-xs opacity-30">
        🍄 거울 길드 관리 페이지 · 비공개 🐌
      </footer>
    </div>
  );
}
