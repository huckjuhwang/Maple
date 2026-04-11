/**
 * 스냅샷 비교 - 일별/주간/월간 변화량 계산
 *
 * data/snapshots/ 폴더에서 두 날짜의 JSON을 비교하여
 * 각 멤버의 경험치/전투력/레벨 변화량을 산출
 *
 * 로컬: fs.readFileSync (개발용)
 * Vercel: GitHub raw URL fetch (재배포 없이 최신 데이터 반영)
 */

import * as fs from 'fs';
import * as path from 'path';
import { calcExpGainWithLevelUp } from '@/lib/levelExpTable';
import { githubFetchJson, githubListSnapshotDates } from '@/lib/github-data';

const isVercel = process.env.VERCEL === '1';

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
  expGain: number | null;  // 테이블 기반 정확한 획득 경험치 (레벨업 포함), null이면 추정 불가
  expGainEstimated: boolean; // expGain이 추정값인지 여부
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

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 사용 가능한 스냅샷 날짜 목록 (최신순) */
export async function getAvailableDates(): Promise<string[]> {
  if (!isVercel) {
    const dir = path.join(process.cwd(), 'data', 'snapshots');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort()
      .reverse();
  }
  return githubListSnapshotDates();
}

/** 특정 날짜 스냅샷 로드 */
export async function loadSnapshot(date: string): Promise<any | null> {
  if (!isVercel) {
    const filePath = path.join(process.cwd(), 'data', 'snapshots', `${date}.json`);
    if (!fs.existsSync(filePath)) return null;
    try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch { return null; }
  }
  return githubFetchJson(`data/snapshots/${date}.json`, 86400);
}

/** 최신 스냅샷 로드 */
export async function loadLatest(): Promise<any | null> {
  if (!isVercel) {
    const filePath = path.join(process.cwd(), 'data', 'latest.json');
    if (!fs.existsSync(filePath)) return null;
    try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch { return null; }
  }
  return githubFetchJson('data/latest.json', 1800);
}

/**
 * 경험치 변화를 레벨분으로 환산
 */
function calcExpLevelChange(
  prevLevel: number, prevExpRate: number,
  currLevel: number, currExpRate: number
): number {
  if (prevLevel === currLevel) {
    return (currExpRate - prevExpRate) / 100;
  }
  const prevRemaining = (100 - prevExpRate) / 100;
  const fullLevels = currLevel - prevLevel - 1;
  const currProgress = currExpRate / 100;
  return prevRemaining + fullLevels + currProgress;
}

/**
 * 두 날짜 스냅샷 비교
 */
export async function compareSnapshots(fromDate: string, toDate: string, period: string = 'daily'): Promise<CompareResult> {
  const [fromSnap, toSnap] = await Promise.all([loadSnapshot(fromDate), loadSnapshot(toDate)]);

  if (!fromSnap || !toSnap) {
    return { fromDate, toDate, period, members: [], hasData: false };
  }

  const fromMap = new Map<string, any>();
  for (const m of fromSnap.members) {
    fromMap.set(m.characterName, m);
  }

  const members: MemberChange[] = [];

  for (const curr of toSnap.members) {
    const prev = fromMap.get(curr.characterName);
    if (!prev) continue;

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
      expChange: (() => {
        const raw = (curr.exp ?? 0) - (prev.exp ?? 0);
        return curr.level > prev.level && raw < 0 ? 0 : raw;
      })(),
      expGain: calcExpGainWithLevelUp(prev.level, prev.exp ?? 0, curr.level, curr.exp ?? 0),
      expGainEstimated: false,
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
  return toLocalDateString(d);
}

export interface WeekRange {
  start: string;
  end: string;
  label: string;
}

export function getMapleWeek(dateStr: string, weeksAgo: number = 0): WeekRange {
  const d = new Date(dateStr);
  const dayOfWeek = d.getDay();

  let daysToThursday: number;
  if (dayOfWeek >= 4) {
    daysToThursday = dayOfWeek - 4;
  } else {
    daysToThursday = dayOfWeek + 3;
  }

  const thursday = new Date(d);
  thursday.setDate(d.getDate() - daysToThursday - (weeksAgo * 7));

  const wednesday = new Date(thursday);
  wednesday.setDate(thursday.getDate() + 6);

  const start = toLocalDateString(thursday);
  const end = toLocalDateString(wednesday);
  const label = `${thursday.getMonth() + 1}/${thursday.getDate()} ~ ${wednesday.getMonth() + 1}/${wednesday.getDate()}`;

  return { start, end, label };
}

export function getMapleMonth(dateStr: string, monthsAgo: number = 0): WeekRange {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() - monthsAgo);

  const year = d.getFullYear();
  const month = d.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const start = toLocalDateString(firstDay);
  const end = toLocalDateString(lastDay);
  const label = `${year}년 ${month + 1}월`;

  return { start, end, label };
}

/**
 * 자동 비교: 가장 최신 vs 전날
 */
export async function getAutoCompare(): Promise<CompareResult | null> {
  const dates = await getAvailableDates();
  if (dates.length < 2) return null;
  return compareSnapshots(dates[1], dates[0], 'daily');
}

/**
 * 기간별 비교
 */
export async function getCompareByPeriod(
  period: 'daily' | 'weekly' | 'monthly',
  offset: number = 0
): Promise<CompareResult | null> {
  const dates = await getAvailableDates();
  if (dates.length === 0) return null;

  const latest = dates[0];

  if (period === 'weekly') {
    const week = getMapleWeek(latest, offset);
    const fromRef = daysAgo(week.start, 1);
    const fromDate = dates.find(d => d <= fromRef) ?? dates[dates.length - 1];
    const toDate = dates.find(d => d <= week.end) ?? dates[0];
    if (fromDate === toDate) return null;
    const result = await compareSnapshots(fromDate, toDate, 'weekly');
    return { ...result, fromDate: week.start, toDate: week.end };
  }

  if (period === 'monthly') {
    const month = getMapleMonth(latest, offset);
    const fromDate = dates.find(d => d <= month.start) ?? dates[dates.length - 1];
    const toDate = dates.find(d => d <= month.end) ?? dates[0];
    if (fromDate === toDate) return null;
    const result = await compareSnapshots(fromDate, toDate, 'monthly');
    return { ...result, fromDate: month.start, toDate: month.end };
  }

  // daily
  const targetDate = daysAgo(latest, 1);
  const closest = dates.find(d => d <= targetDate) ?? dates[dates.length - 1];
  if (closest === latest) return null;
  return compareSnapshots(closest, latest, period);
}
