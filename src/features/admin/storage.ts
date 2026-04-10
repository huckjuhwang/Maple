/**
 * 관리자 데이터 JSON 파일 관리
 * data/admin.json에 저장
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AdminData, MemberAdmin, LeftMember, MemoEntry } from './types';

const ADMIN_FILE = path.join(process.cwd(), 'data', 'admin.json');
const LOCK_FILE = ADMIN_FILE + '.lock';

// 간단한 파일 락 (동시 쓰기 방지)
function acquireLock(): boolean {
  try {
    fs.writeFileSync(LOCK_FILE, String(Date.now()), { flag: 'wx' });
    return true;
  } catch {
    // 이미 락이 있으면 5초 이상 된 건 오래된 락으로 간주
    try {
      const lockTime = parseInt(fs.readFileSync(LOCK_FILE, 'utf-8'));
      if (Date.now() - lockTime > 5000) {
        fs.unlinkSync(LOCK_FILE);
        return acquireLock();
      }
    } catch {}
    return false;
  }
}

function releaseLock(): void {
  try { fs.unlinkSync(LOCK_FILE); } catch {}
}

const DEFAULT_DATA: AdminData = {
  config: {
    positions: ['거울', '세계', '조각', '파편', '모래', '먼지', '사유'],
    masterPosition: '거울',
    lastUpdated: new Date().toISOString(),
  },
  mirror: [],
  dalla: [],
  left: [],
};

/** 관리 데이터 로드 */
export function loadAdminData(): AdminData {
  if (!fs.existsSync(ADMIN_FILE)) return { ...DEFAULT_DATA };
  try {
    const raw = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf-8'));
    return migrateData(raw);
  } catch (e) {
    console.error('❌ admin.json 파싱 실패! 데이터가 초기화됩니다:', e);
    // 손상된 파일 백업
    const backupPath = ADMIN_FILE + '.backup.' + Date.now();
    try { fs.copyFileSync(ADMIN_FILE, backupPath); } catch {}
    return { ...DEFAULT_DATA };
  }
}

const MAX_BACKUPS = 10;
const BACKUP_DIR = path.join(path.dirname(ADMIN_FILE), 'backups');

/** 롤링 백업: 저장 전 현재 파일을 타임스탬프로 복사, 최대 10개 유지 */
function rotateBackup(): void {
  if (!fs.existsSync(ADMIN_FILE)) return;
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    fs.copyFileSync(ADMIN_FILE, path.join(BACKUP_DIR, `admin.${ts}.json`));

    // 오래된 백업 삭제
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('admin.') && f.endsWith('.json'))
      .sort()
      .reverse();
    for (const old of files.slice(MAX_BACKUPS)) {
      fs.unlinkSync(path.join(BACKUP_DIR, old));
    }
  } catch (e) {
    console.warn('⚠️ 백업 실패:', e);
  }
}

/** 백업 목록 조회 */
export function listBackups(): { name: string; date: string; size: number }[] {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('admin.') && f.endsWith('.json'))
    .sort()
    .reverse()
    .map(name => {
      const stat = fs.statSync(path.join(BACKUP_DIR, name));
      const dateMatch = name.match(/admin\.(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})\.json/);
      const date = dateMatch ? dateMatch[1].replace(/T/, ' ').replace(/-/g, (m, offset) => offset > 9 ? ':' : '-') : name;
      return { name, date, size: stat.size };
    });
}

/** 특정 백업으로 복원 */
export function restoreBackup(backupName: string): boolean {
  const backupPath = path.join(BACKUP_DIR, backupName);
  if (!fs.existsSync(backupPath)) return false;
  // 현재 데이터도 백업 후 덮어쓰기
  rotateBackup();
  fs.copyFileSync(backupPath, ADMIN_FILE);
  return true;
}

/** 관리 데이터 저장 (롤링 백업 + 락 보호) */
export function saveAdminData(data: AdminData): void {
  if (!acquireLock()) {
    console.warn('⚠️ admin.json 락 획득 실패, 재시도...');
    const start = Date.now();
    while (Date.now() - start < 200) { /* busy wait */ }
    if (!acquireLock()) throw new Error('admin.json 저장 실패: 락 획득 불가');
  }
  try {
    rotateBackup();
    data.config.lastUpdated = new Date().toISOString();
    fs.mkdirSync(path.dirname(ADMIN_FILE), { recursive: true });
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(data, null, 2));
  } finally {
    releaseLock();
  }
}

/** 관리 데이터 로드 시 마이그레이션 (기존 데이터 호환) */
function migrateData(data: AdminData): AdminData {
  const migrateMember = (m: MemberAdmin) => {
    if (!m.memoHistory) m.memoHistory = [];
  };
  data.mirror.forEach(migrateMember);
  data.dalla.forEach(migrateMember);
  return data;
}

/** 빈 멤버 생성 */
function createEmptyMember(name: string, guild: 'mirror' | 'dalla', apiData?: any): MemberAdmin {
  return {
    characterName: name,
    guild,
    position: '',
    mainCharacter: '',
    realName: '',
    note: '',
    inactiveReason: '',
    fromMirror: '',
    memoHistory: [],
    job: apiData?.job,
    level: apiData?.level,
    combatPower: apiData?.combatPower,
    unionLevel: apiData?.unionLevel,
    status: 'new',
    joinDate: new Date().toISOString().split('T')[0],
  };
}

/**
 * API 멤버 목록과 동기화
 * 거울/달라 각각 호출
 */
export function syncMembers(
  members: MemberAdmin[],
  apiMembers: { characterName: string; job: string; level: number; combatPower?: number; unionLevel?: number }[],
  guild: 'mirror' | 'dalla'
): { added: string[]; left: string[]; updated: MemberAdmin[] } {
  const apiNameSet = new Set(apiMembers.map(m => m.characterName));
  const adminNameSet = new Set(members.map(m => m.characterName));
  const today = new Date().toISOString().split('T')[0];

  const added: string[] = [];
  const left: string[] = [];

  // 1. 기존 멤버 업데이트 + 탈퇴 감지
  for (const member of members) {
    if (member.status === 'left') continue;

    const apiMember = apiMembers.find(m => m.characterName === member.characterName);
    if (apiMember) {
      member.job = apiMember.job;
      member.level = apiMember.level;
      if (apiMember.combatPower) member.combatPower = apiMember.combatPower;
      if (apiMember.unionLevel) member.unionLevel = apiMember.unionLevel;
      member.leaveDetected = false; // API에 있으면 이탈 감지 해제
      // new 상태는 관리자가 직접 확인(직위/이름 입력)해야 active로 변경 → sync에서 자동 변환 안 함
    } else {
      // 탈퇴 처리 대신 이탈 감지 표시만 (관리자가 직접 확인 후 처리)
      if (!member.leaveDetected) {
        member.leaveDetected = true;
        left.push(member.characterName);
      }
    }
  }

  // 2. 신규 멤버 추가
  for (const apiMember of apiMembers) {
    if (!adminNameSet.has(apiMember.characterName)) {
      members.push(createEmptyMember(apiMember.characterName, guild, apiMember));
      added.push(apiMember.characterName);
    }
  }

  return { added, left, updated: members };
}

/**
 * 탈퇴 처리: 멤버를 left 배열로 이동
 */
export function processLeave(
  adminData: AdminData,
  characterName: string,
  guild: 'mirror' | 'dalla',
  reason: string,
  noRejoin: boolean,
  noRejoinReason: string
): boolean {
  const members = guild === 'mirror' ? adminData.mirror : adminData.dalla;
  const idx = members.findIndex(m => m.characterName === characterName);
  if (idx === -1) return false;

  // 이미 탈퇴 탭에 있으면 중복 방지
  const alreadyLeft = adminData.left.some(l => l.characterName === characterName && l.guild === guild);
  if (alreadyLeft) {
    members.splice(idx, 1); // 멤버 목록에서만 제거
    return true;
  }

  const member = members[idx];

  // 탈퇴 기록 추가
  adminData.left.push({
    characterName: member.characterName,
    guild,
    job: member.job ?? '',
    level: member.level ?? 0,
    realName: member.realName,
    leftDate: member.leftDate ?? new Date().toISOString().split('T')[0],
    reason,
    noRejoin,
    noRejoinReason,
  });

  // 멤버 목록에서 제거
  members.splice(idx, 1);
  return true;
}

/** 메모 히스토리 추적 대상 필드 */
const TRACKED_FIELDS = ['position', 'mainCharacter', 'realName', 'note', 'inactiveReason', 'fromMirror'];

/**
 * 멤버 수동 필드 업데이트 (인라인 편집 + 히스토리 추적)
 */
export function updateMember(
  members: MemberAdmin[],
  characterName: string,
  updates: Partial<MemberAdmin>
): boolean {
  const member = members.find(m => m.characterName === characterName);
  if (!member) return false;

  const today = new Date().toISOString().split('T')[0];
  if (!member.memoHistory) member.memoHistory = [];

  for (const [field, newValue] of Object.entries(updates)) {
    if (TRACKED_FIELDS.includes(field)) {
      const oldValue = String((member as any)[field] ?? '');
      const newStr = String(newValue ?? '');
      if (oldValue !== newStr) {
        member.memoHistory.push({ date: today, field, oldValue, newValue: newStr });
      }
    }
  }

  Object.assign(member, updates);
  return true;
}

/**
 * 탈퇴자 재가입 처리: left → mirror/dalla 복원
 */
export function rejoinMember(
  adminData: AdminData,
  characterName: string,
  toGuild: 'mirror' | 'dalla'
): boolean {
  const idx = adminData.left.findIndex(m => m.characterName === characterName);
  if (idx === -1) return false;

  const leftMember = adminData.left[idx];
  const today = new Date().toISOString().split('T')[0];

  const restored = createEmptyMember(characterName, toGuild, {
    job: leftMember.job,
    level: leftMember.level,
  });
  restored.realName = leftMember.realName;
  restored.status = 'active';
  restored.joinDate = today;
  restored.memoHistory = [{
    date: today,
    field: '재가입',
    oldValue: `탈퇴(${leftMember.leftDate}, ${leftMember.reason})`,
    newValue: `${toGuild === 'mirror' ? '거울' : '달라'} 재가입`,
  }];

  const target = toGuild === 'mirror' ? adminData.mirror : adminData.dalla;
  target.push(restored);
  adminData.left.splice(idx, 1);
  return true;
}

/**
 * 길드 전입 처리: mirror↔dalla 양방향
 */
export function transferMember(
  adminData: AdminData,
  characterName: string,
  fromGuild: 'mirror' | 'dalla',
  toGuild: 'mirror' | 'dalla'
): boolean {
  if (fromGuild === toGuild) return false;

  const source = fromGuild === 'mirror' ? adminData.mirror : adminData.dalla;
  const idx = source.findIndex(m => m.characterName === characterName);
  if (idx === -1) return false;

  const member = source[idx];
  const today = new Date().toISOString().split('T')[0];
  const fromLabel = fromGuild === 'mirror' ? '거울' : '달라';
  const toLabel = toGuild === 'mirror' ? '거울' : '달라';

  // 히스토리 기록
  if (!member.memoHistory) member.memoHistory = [];
  member.memoHistory.push({
    date: today,
    field: '전입',
    oldValue: fromLabel,
    newValue: toLabel,
  });

  // 길드 변경
  member.guild = toGuild;
  if (toGuild === 'dalla') {
    member.fromMirror = member.mainCharacter || member.characterName;
  } else {
    member.fromMirror = '';
  }

  // 이동
  source.splice(idx, 1);
  const target = toGuild === 'mirror' ? adminData.mirror : adminData.dalla;

  // 이미 대상 길드에 존재하면 (배치가 신규로 추가한 경우) → 달라 데이터로 덮어쓰기
  const existingIdx = target.findIndex(m => m.characterName === characterName);
  if (existingIdx !== -1) {
    const existing = target[existingIdx];
    // 관리 데이터(직위/이름/비고/메모)는 달라 쪽 데이터 우선, API 데이터는 최신(거울 신규) 우선
    target[existingIdx] = {
      ...existing,
      position: existing.position, // 직위는 이전 후 별도 설정
      realName: member.realName || existing.realName,
      mainCharacter: member.mainCharacter || existing.mainCharacter,
      note: member.note || existing.note,
      inactiveReason: member.inactiveReason || existing.inactiveReason,
      fromMirror: member.fromMirror || existing.fromMirror,
      memoHistory: [...(member.memoHistory ?? []), ...(existing.memoHistory ?? [])],
      guild: toGuild,
      status: member.status === 'new' ? 'new' : existing.status,
      leaveDetected: false,
    };
  } else {
    target.push(member);
  }

  return true;
}

/**
 * 미접속 사유가 있는 멤버 목록 (알림 제외용)
 */
export function getInactiveExclusions(): Set<string> {
  const data = loadAdminData();
  const excluded = new Set<string>();
  for (const m of [...data.mirror, ...data.dalla]) {
    if (m.inactiveReason && m.inactiveReason.trim() !== '') {
      excluded.add(m.characterName);
    }
  }
  return excluded;
}

// calcStats는 utils.ts에서 import하여 사용 (클라이언트 호환)
