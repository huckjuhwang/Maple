/** 관리자 데이터 타입 */

// 메모 히스토리 항목
export interface MemoEntry {
  date: string;              // ISO 날짜
  field: string;             // 변경된 필드명
  oldValue: string;          // 이전 값
  newValue: string;          // 새 값
}

// 직위 설정
export interface GuildConfig {
  positions: string[];       // 직위 목록 (순서대로)
  masterPosition: string;    // 마스터 직위 (1명만 가능)
  lastUpdated: string;
}

// 거울/달라 길드원 공통
export interface MemberAdmin {
  characterName: string;
  guild: 'mirror' | 'dalla';  // 소속 길드
  // 수동 관리 필드
  position: string;           // 직위 (거울/세계/조각 등)
  mainCharacter: string;      // 본캐면 "original", 부캐면 본캐 이름
  realName: string;           // 실제 이름/생년
  note: string;               // 비고
  inactiveReason: string;     // 미접속 사유 (입력 시 알림 제외)
  // 달라 전용
  fromMirror: string;         // 본길(거울)에서 전입한 본캐 이름
  memoHistory: MemoEntry[];   // 변경 이력
  // 자동 필드 (API에서 가져옴)
  job?: string;
  level?: number;
  combatPower?: number;
  unionLevel?: number;
  // 상태
  status: 'active' | 'left' | 'new';
  leaveDetected?: boolean;    // 배치에서 이탈 감지됨 (관리자 확인 전)
  leftDate?: string;
  joinDate?: string;
}

// 탈퇴자
export interface LeftMember {
  characterName: string;
  guild: 'mirror' | 'dalla';
  job: string;
  level: number;
  realName: string;           // 이름/생년
  leftDate: string;           // 탈퇴일
  reason: string;             // 사유: 탈퇴/장기미접속/강제탈퇴(스틸)/강제탈퇴(먹퀘)/월드리프/리부트/재탈퇴
  noRejoin: boolean;          // 재가입 불가
  noRejoinReason: string;     // 재가입 불가 사유
}

// 전체 관리 데이터
export interface AdminData {
  config: GuildConfig;
  mirror: MemberAdmin[];      // 거울 길드원
  dalla: MemberAdmin[];       // 달라 길드원
  left: LeftMember[];         // 탈퇴자
}

// 탈퇴 사유 옵션
export const LEAVE_REASONS = [
  '탈퇴',
  '장기 미접속',
  '강제탈퇴(스틸)',
  '강제탈퇴(먹퀘)',
  '월드리프',
  '리부트',
  '재탈퇴',
] as const;
