import type {
  NexonCharacterBasic,
  NexonCharacterStat,
  NexonGuildBasic,
  NexonGuildIdResponse,
  NexonOcidResponse,
  NexonSymbolEquipment,
  NexonUnion,
} from '@/types/nexon';

const BASE_URL = 'https://open.api.nexon.com/maplestory/v1';
const API_KEY = process.env.NEXON_API_KEY!;

// Rate Limiter: 초당 5회 제한
let lastCallTime = 0;
const MIN_INTERVAL = 210; // 210ms (안전 마진 포함)

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < MIN_INTERVAL) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL - elapsed));
  }

  const res = await fetch(url, {
    headers: { 'x-nxopen-api-key': API_KEY },
    next: { revalidate: 0 },
  });

  lastCallTime = Date.now(); // fetch 완료 후 갱신

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(`Nexon API Error ${res.status}: ${JSON.stringify(error)}`);
  }

  return res;
}

// 재시도 래퍼 (지수 백오프)
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
  throw new Error('Unreachable');
}

export async function getGuildId(
  guildName: string,
  worldName: string
): Promise<string> {
  const params = new URLSearchParams({
    guild_name: guildName,
    world_name: worldName,
  });
  const res = await rateLimitedFetch(`${BASE_URL}/guild/id?${params}`);
  const data: NexonGuildIdResponse = await res.json();
  return data.oguild_id;
}

export async function getGuildBasic(
  oguildId: string,
  date: string
): Promise<NexonGuildBasic> {
  const params = new URLSearchParams({ oguild_id: oguildId, date });
  const res = await rateLimitedFetch(`${BASE_URL}/guild/basic?${params}`);
  return res.json();
}

export async function getOcid(characterName: string): Promise<string> {
  const params = new URLSearchParams({ character_name: characterName });
  const res = await rateLimitedFetch(`${BASE_URL}/id?${params}`);
  const data: NexonOcidResponse = await res.json();
  return data.ocid;
}

export async function getCharacterBasic(
  ocid: string,
  date?: string
): Promise<NexonCharacterBasic> {
  const params = new URLSearchParams({ ocid, ...(date && { date }) });
  const res = await rateLimitedFetch(`${BASE_URL}/character/basic?${params}`);
  return res.json();
}

export async function getCharacterStat(
  ocid: string,
  date?: string
): Promise<NexonCharacterStat> {
  const params = new URLSearchParams({ ocid, ...(date && { date }) });
  const res = await rateLimitedFetch(`${BASE_URL}/character/stat?${params}`);
  return res.json();
}

export async function getSymbolEquipment(
  ocid: string,
  date?: string
): Promise<NexonSymbolEquipment> {
  const params = new URLSearchParams({ ocid, ...(date && { date }) });
  const res = await rateLimitedFetch(
    `${BASE_URL}/character/symbol-equipment?${params}`
  );
  return res.json();
}

export async function getUnion(
  ocid: string,
  date?: string
): Promise<NexonUnion> {
  const params = new URLSearchParams({ ocid, ...(date && { date }) });
  const res = await rateLimitedFetch(`${BASE_URL}/user/union?${params}`);
  return res.json();
}

// 길드원 전체 데이터 수집 (한 명) - date 없으면 실시간
export async function collectMemberData(ocid: string, date?: string) {
  return withRetry(async () => {
    const [basic, stat, symbol, union] = await Promise.all([
      getCharacterBasic(ocid, date),
      getCharacterStat(ocid, date),
      getSymbolEquipment(ocid, date),
      getUnion(ocid, date),
    ]);

    const combatPower =
      stat.final_stat.find((s) => s.stat_name === '전투력')?.stat_value ?? '0';

    const arcaneForce = symbol.symbol
      .filter((s) => s.symbol_name.includes('아케인'))
      .reduce((sum, s) => sum + parseInt(s.symbol_force), 0);

    const authenticForce = symbol.symbol
      .filter(
        (s) =>
          s.symbol_name.includes('어센틱') ||
          s.symbol_name.includes('그랜드 어센틱')
      )
      .reduce((sum, s) => sum + parseInt(s.symbol_force), 0);

    return {
      characterName: basic.character_name,
      job: basic.character_class,
      level: basic.character_level,
      exp: basic.character_exp,
      expRate: parseFloat(basic.character_exp_rate),
      combatPower: parseInt(combatPower),
      unionLevel: union.union_level,
      arcaneForce,
      authenticForce,
      characterImage: basic.character_image,
    };
  });
}
