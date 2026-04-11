/**
 * README.md 자동 업데이트 스크립트
 * push 전 hook에서 호출됨 (latest.json → README 현황 섹션 업데이트)
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..');
const latestFile = path.join(ROOT, 'data', 'latest.json');
const readmeFile = path.join(ROOT, 'README.md');

function formatKST(isoString: string): string {
  const d = new Date(isoString);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const mo = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  const h = String(kst.getUTCHours()).padStart(2, '0');
  const m = String(kst.getUTCMinutes()).padStart(2, '0');
  return `${y}-${mo}-${day} ${h}:${m} KST`;
}

if (!fs.existsSync(latestFile)) {
  console.log('latest.json 없음, README 업데이트 스킵');
  process.exit(0);
}

const latest = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));
const readme = fs.readFileSync(readmeFile, 'utf-8');

const collectedAt = latest.collectedAt ? formatKST(latest.collectedAt) : latest.date;

const statsBlock = `<!-- AUTO_STATS_START -->
## 📊 현황

| 항목 | 값 |
|------|-----|
| 마지막 수집 | ${collectedAt} |
| 수집 인원 | ${latest.collectedCount ?? latest.memberCount}명 |
| 길드 레벨 | Lv.${latest.guildLevel} |
| 마스터 | ${latest.masterName} |

<!-- AUTO_STATS_END -->`;

const updated = readme.replace(
  /<!-- AUTO_STATS_START -->[\s\S]*?<!-- AUTO_STATS_END -->/,
  statsBlock
);

if (updated === readme) {
  console.log('README 변경 없음 (태그 없거나 동일한 내용)');
} else {
  fs.writeFileSync(readmeFile, updated);
  console.log(`README 업데이트 완료: ${collectedAt}, ${latest.collectedCount}명`);
}
