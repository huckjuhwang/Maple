import { NextResponse } from 'next/server';
import { loadAdminData, saveAdminData, updateMember, processLeave, rejoinMember, transferMember, listBackups, restoreBackup } from '@/features/admin/storage';

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'gw2k9x';

function checkSecret(secret: string) {
  return secret === ADMIN_SECRET;
}

/** GET: 관리 데이터 전체 로드 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params;
  if (!checkSecret(secret)) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  try {
    const data = loadAdminData();
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

/** POST: 데이터 업데이트 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params;
  if (!checkSecret(secret)) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { action } = body;
    const adminData = loadAdminData();

    switch (action) {
      case 'updateMember': {
        const { characterName, guild, updates } = body;
        const members = guild === 'dalla' ? adminData.dalla : adminData.mirror;
        // 직위/이름/비고 입력 시 new → active 전환
        const member = members.find(m => m.characterName === characterName);
        if (member?.status === 'new' && (updates.position || updates.realName || updates.note)) {
          updates.status = 'active';
        }
        const ok = updateMember(members, characterName, updates);
        if (ok) saveAdminData(adminData);
        return NextResponse.json({ success: ok });
      }

      case 'processLeave': {
        const { characterName, guild, reason, noRejoin, noRejoinReason } = body;
        const ok = processLeave(adminData, characterName, guild, reason, noRejoin ?? false, noRejoinReason ?? '');
        if (ok) saveAdminData(adminData);
        return NextResponse.json({ success: ok });
      }

      case 'updatePositions': {
        const { positions } = body;
        adminData.config.positions = positions;
        saveAdminData(adminData);
        return NextResponse.json({ success: true });
      }

      case 'rejoin': {
        const { characterName, toGuild } = body;
        const ok = rejoinMember(adminData, characterName, toGuild);
        if (ok) saveAdminData(adminData);
        return NextResponse.json({ success: ok });
      }

      case 'transfer': {
        const { characterName, fromGuild, toGuild } = body;
        const ok = transferMember(adminData, characterName, fromGuild, toGuild);
        if (ok) saveAdminData(adminData);
        return NextResponse.json({ success: ok });
      }

      case 'updateMasterPosition': {
        const { masterPosition } = body;
        adminData.config.masterPosition = masterPosition;
        saveAdminData(adminData);
        return NextResponse.json({ success: true });
      }

      case 'listBackups': {
        return NextResponse.json({ success: true, backups: listBackups() });
      }

      case 'restoreBackup': {
        const { backupName } = body;
        const ok = restoreBackup(backupName);
        return NextResponse.json({ success: ok });
      }

      case 'restoreFromUpload': {
        const { data: uploadData } = body;
        if (!uploadData?.config || !uploadData?.mirror || !uploadData?.dalla || !uploadData?.left) {
          return NextResponse.json({ success: false, error: '올바른 백업 파일이 아닙니다' }, { status: 400 });
        }
        saveAdminData(uploadData);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
