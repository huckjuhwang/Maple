import { NextResponse } from 'next/server';
import {
  getGuildId,
  getGuildBasic,
  getOcid,
  collectMemberData,
} from '@/services/nexon-api';
import { GUILD_NAME, WORLD_NAME, getYesterday } from '@/lib/constants';
import type { GuildMember } from '@/types/guild';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '10');

  try {
    const date = getYesterday();
    const oguildId = await getGuildId(GUILD_NAME, WORLD_NAME);
    const guild = await getGuildBasic(oguildId, date);

    // 지정된 수만큼 길드원 데이터 수집
    const memberNames = guild.guild_member.slice(0, limit);
    const members: GuildMember[] = [];

    for (const name of memberNames) {
      try {
        const ocid = await getOcid(name);
        const data = await collectMemberData(ocid, date);
        members.push({ ...data, ocid });
      } catch {
        console.error(`Failed to collect data for ${name}`);
      }
    }

    // 전투력 내림차순 정렬
    members.sort((a, b) => b.combatPower - a.combatPower);

    return NextResponse.json({
      success: true,
      data: {
        guildName: guild.guild_name,
        worldName: guild.world_name,
        guildLevel: guild.guild_level,
        masterName: guild.guild_master_name,
        memberCount: guild.guild_member_count,
        date,
        members,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
