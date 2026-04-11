/**
 * GitHub raw URL / Contents API 기반 데이터 fetch
 * Vercel 환경에서 재배포 없이 최신 data/ 파일을 읽기 위해 사용
 */

const REPO = 'huckjuhwang/Maple';
const BRANCH = 'main';
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
const API = `https://api.github.com/repos/${REPO}`;

const REVALIDATE_SHORT = 1800;  // 30분 (latest, snapshots 목록)
const REVALIDATE_LONG  = 86400; // 24시간 (과거 스냅샷은 변경 없음)

export async function githubFetchJson(filePath: string, revalidate = REVALIDATE_SHORT): Promise<any | null> {
  try {
    const res = await fetch(`${RAW}/${filePath}`, { next: { revalidate } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function githubListSnapshotDates(revalidate = REVALIDATE_SHORT): Promise<string[]> {
  try {
    const res = await fetch(`${API}/contents/data/snapshots`, { next: { revalidate } });
    if (!res.ok) return [];
    const files = await res.json();
    if (!Array.isArray(files)) return [];
    return files
      .filter((f: any) => f.name.endsWith('.json'))
      .map((f: any) => f.name.replace('.json', ''))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}
