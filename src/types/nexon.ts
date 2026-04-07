// Nexon Open API 응답 타입 (실제 API 호출 결과 기반)

export interface NexonGuildBasic {
  date: string;
  world_name: string;
  guild_name: string;
  guild_level: number;
  guild_fame: number;
  guild_master_name: string;
  guild_member_count: number;
  guild_member: string[];
}

export interface NexonCharacterBasic {
  date: string;
  character_name: string;
  world_name: string;
  character_gender: string;
  character_class: string;
  character_class_level: string;
  character_level: number;
  character_exp: number;
  character_exp_rate: string; // "39.690" 형태의 문자열
  character_guild_name: string;
  character_image: string;
  character_date_create: string;
  access_flag: string;
  liberation_quest_clear: string;
}

export interface NexonStatItem {
  stat_name: string;
  stat_value: string;
}

export interface NexonCharacterStat {
  date: string;
  character_class: string;
  final_stat: NexonStatItem[];
}

export interface NexonSymbol {
  symbol_name: string;
  symbol_icon: string;
  symbol_description: string;
  symbol_force: string;
  symbol_level: number;
  symbol_str: string;
  symbol_dex: string;
  symbol_int: string;
  symbol_luk: string;
  symbol_hp: string;
  symbol_growth_count: number;
  symbol_require_growth_count: number;
}

export interface NexonSymbolEquipment {
  date: string;
  character_class: string;
  symbol: NexonSymbol[];
}

export interface NexonUnion {
  date: string;
  union_level: number;
  union_grade: string;
  union_artifact_level: number;
  union_artifact_exp: number;
  union_artifact_point: number;
}

export interface NexonOcidResponse {
  ocid: string;
}

export interface NexonGuildIdResponse {
  oguild_id: string;
}
