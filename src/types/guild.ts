export interface GuildMember {
  characterName: string;
  ocid: string;
  job: string;
  level: number;
  exp: number;
  expRate: number;
  combatPower: number;
  unionLevel: number;
  arcaneForce: number;
  authenticForce: number;
  characterImage: string;
}

export interface DailyStat {
  memberName: string;
  date: string;
  level: number;
  exp: number;
  expRate: number;
  combatPower: number;
  unionLevel: number;
  arcaneForce: number;
  authenticForce: number;
}

export interface GrowthData {
  rank: number;
  memberName: string;
  characterImage: string;
  job: string;
  levelFrom: number;
  levelTo: number;
  expChange: number; // 레벨분 환산
  combatPowerChange: number;
  combatPowerCurrent: number;
}

export type ViewMode = 'daily' | 'weekly' | 'monthly';
export type Track = 'exp' | 'combat';
