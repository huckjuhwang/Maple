/**
 * 스냅샷 비교 - 일별/주간/월간 변화량 계산
 *
 * data/snapshots/ 폴더에서 두 날짜의 JSON을 비교하여
 * 각 멤버의 경험치/전투력/레벨 변화량을 산출
 */

import * as fs from 'fs';
import * as path from 'path';

export interface MemberChange {
  characterName: string;
  characterImage: string;
  job: string;
  // 현재 값
  level: number;
  expRate: number;
  combatPower: number;
  unionLevel: number;
  // 변화량
  levelChange: number;
  expLevelChange: number;  // 레벨분 환산 경험치 변화
  expChange: number;       // 실제 경험치 수치 변화량
  combatPowerChange: number;
  unionLevelChange: number;
  arcaneForceChange: number;
  authenticForceChange: number;
  // 이전 값
  prevLevel: number;
  prevCombatPower: number;
}

export interface CompareResult {
  fromDate: string;
  toDate: string;
  period: string; // 'daily' | 'weekly' | 'monthly'
  members: MemberChange[];
  hasData: boolean;
}

function getSnapshotsDir(): string {
  return path.join(process.cwd(), 'data', 'snapshots');
}

/** 사용 가능한 스냅샷 날짜 목록 (최신순) */
export function getAvailableDates(): string[] {
  const dir = getSnapshotsDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .sort()
    .reverse();
}

/** 특정 날짜 스냅샷 로드 */
export function loadSnapshot(date: string): any | null {
  const filePath = path.join(getSnapshotsDir(), `${date}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/** 최신 스냅샷 로드 */
export function loadLatest(): any | null {
  const filePath = path.join(process.cwd(), 'data', 'latest.json');
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * 경험치 변화를 레벨분으로 환산
 * 예) Lv283 (92%) → Lv285 (15%) = 2.23 레벨분
 */
function calcExpLevelChange(
  prevLevel: number, prevExpRate: number,
  currLevel: number, currExpRate: number
): number {
  if (prevLevel === currLevel) {
    // 같은 레벨 내 경험치 변화
    return (currExpRate - prevExpRate) / 100;
  }
  // 레벨업 포함
  const prevRemaining = (100 - prevExpRate) / 100;
  const fullLevels = currLevel - prevLevel - 1;
  const currProgress = currExpRate / 100;
  return prevRemaining + fullLevels + currProgress;
}

/**
 * 두 날짜 스냅샷 비교
 */
export function compareSnapshots(fromDate: string, toDate: string, period: string = 'daily'): CompareResult {
  const fromSnap = loadSnapshot(fromDate);
  const toSnap = loadSnapshot(toDate);

  if (!fromSnap || !toSnap) {
    return { fromDate, toDate, period, members: [], hasData: false };
  }

  // from 데이터를 맵으로 변환
  const fromMap = new Map<string, any>();
  for (const m of fromSnap.members) {
    fromMap.set(m.characterName, m);
  }

  const members: MemberChange[] = [];

  for (const curr of toSnap.members) {
    const prev = fromMap.get(curr.characterName);
    if (!prev) continue; // 이전 데이터 없으면 스킵

    const expLevelChange = calcExpLevelChange(
      prev.level, prev.expRate,
      curr.level, curr.expRate
    );

    members.push({
      characterName: curr.characterName,
      characterImage: curr.characterImage,
      job: curr.job,
      level: curr.level,
      expRate: curr.expRate,
      combatPower: curr.combatPower,
      unionLevel: curr.unionLevel,
      levelChange: curr.level - prev.level,
      expLevelChange: Math.round(expLevelChange * 100) / 100,
      expChange: (curr.exp ?? 0) - (prev.exp ?? 0),
      combatPowerChange: curr.combatPower - prev.combatPower,
      unionLevelChange: curr.unionLevel - prev.unionLevel,
      arcaneForceChange: (curr.arcaneForce ?? 0) - (prev.arcaneForce ?? 0),
      authenticForceChange: (curr.authenticForce ?? 0) - (prev.authenticForce ?? 0),
      prevLevel: prev.level,
      prevCombatPower: prev.combatPower,
    });
  }

  return { fromDate, toDate, period, members, hasData: true };
}

/**
 * 주어진 날짜로부터 N일 전 날짜 계산
 */
export function daysAgo(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

/**
 * 메이플스토리 주간 기준 계산 (목요일 00시 리셋)
 *
 * 이번 주: 가장 최근 목요일 ~ 다음 수요일
 * 지난 주: 그 전 목요일 ~ 최근 목요일 전날(수요일)
 *
 * 예) 오늘이 2026-04-07 (월요일)이면:
 *   이번 주: 2026-04-02 (목) ~ 2026-04-08 (수)
 *   지난 주: 2026-03-26 (목) ~ 2026-04-01 (수)
 */
export interface WeekRange {
  start: string; // 목요일
  end: string;   // 수요일
  label: string; // "4/2 ~ 4/8"
}

export function getMapleWeek(dateStr: string, weeksAgo: number = 0): WeekRange {
  const d = new Date(dateStr);
  // 요일: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
  const dayOfWeek = d.getDay();

  // 이번 주 목요일 찾기
  // 목(4)이면 0, 금(5)이면 -1, 토(6)이면 -2, 일(0)이면 -3,
  // 월(1)이면 -4, 화(2)이면 -5, 수(3)이면 -6
  let daysToThursday: number;
  if (dayOfWeek >= 4) {
    daysToThursday = dayOfWeek - 4;
  } else {
    daysToThursday = dayOfWeek + 3; // 일=3, 월=4, 화=5, 수=6
  }

  const thursday = new Date(d);
  thursday.setDate(d.getDate() - daysToThursday - (weeksAgo * 7));

  const wednesday = new Date(thursday);
  wednesday.setDate(thursday.getDate() + 6);

  const start = thursday.toISOString().split('T')[0];
  const end = wednesday.toISOString().split('T')[0];
  const label = `${thursday.getMonth() + 1}/${thursday.getDate()} ~ ${wednesday.getMonth() + 1}/${wednesday.getDate()}`;

  return { start, end, label };
}

/**
 * 월간 기준 계산 (1일 ~ 말일)
 *
 * 예) 오늘이 2026-04-07이면:
 *   이번 달: 2026-04-01 ~ 2026-04-30
 *   지난 달: 2026-03-01 ~ 2026-03-31
 */
export function getMapleMonth(dateStr: string, monthsAgo: number = 0): WeekRange {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() - monthsAgo);

  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0); // 말일

  const start = firstDay.toISOString().split('T')[0];
  const end = lastDay.toISOString().split('T')[0];
  const label = `${year}년 ${month + 1}월`;

  return { start, end, label };
}

/**
 * 자동 비교: 가능한 데이터에서 최적의 비교 생성
 */
export function getAutoCompare(): CompareResult | null {
  const dates = getAvailableDates();
  if (dates.length < 2) return null;

  // 가장 최신 vs 그 다음 → 일별
  return compareSnapshots(dates[1], dates[0], 'daily');
}

/**
 * 기간별 비교 시도
 * weekly = 메이플 주간 기준 (목~수)
 * monthly = 1일~말일 기준
 */
export function getCompareByPeriod(
  period: 'daily' | 'weekly' | 'monthly',
  offset: number = 0 // weeksAgo or monthsAgo
): CompareResult | null {
  const dates = getAvailableDates();
  if (dates.length === 0) return null;

  const latest = dates[0];

  if (period === 'weekly') {
    const week = getMapleWeek(latest, offset);
    const fromDate = dates.find(d => d <= week.start) ?? dates[dates.length - 1];
    const toDate = dates.find(d => d <= week.end) ?? dates[0];
    if (fromDate === toDate) return null;
    const result = compareSnapshots(fromDate, toDate, 'weekly');
    return { ...result, fromDate: week.start, toDate: week.end };
  }

  if (period === 'monthly') {
    const month = getMapleMonth(latest, offset);
    const fromDate = dates.find(d => d <= month.start) ?? dates[dates.length - 1];
    const toDate = dates.find(d => d <= month.end) ?? dates[0];
    if (fromDate === toDate) return null;
    const result = compareSnapshots(fromDate, toDate, 'monthly');
    return { ...result, fromDate: month.start, toDate: month.end };
  }

  // daily
  const targetDate = daysAgo(latest, 1);
  const closest = dates.find(d => d <= targetDate) ?? dates[dates.length - 1];
  if (closest === latest) return null;

  return compareSnapshots(closest, latest, period);
}
