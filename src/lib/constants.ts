export const GUILD_NAME = process.env.GUILD_NAME ?? '거울';
export const WORLD_NAME = process.env.WORLD_NAME ?? '스카니아';

// 메이플 직업 카테고리
export const JOB_CATEGORIES: Record<string, string[]> = {
  전사: ['히어로', '팔라딘', '다크나이트', '소울마스터', '미하일', '블래스터', '데몬슬레이어', '데몬어벤져', '아란', '카이저', '아델', '제로'],
  마법사: ['아크메이지(불,독)', '아크메이지(썬,콜)', '비숍', '플레임위자드', '에반', '루미너스', '배틀메이지', '일리움', '라라', '키네시스'],
  궁수: ['보우마스터', '신궁', '윈드브레이커', '와일드헌터', '메르세데스', '카인', '패스파인더'],
  도적: ['나이트로드', '섀도어', '나이트워커', '팬텀', '듀얼블레이드', '카데나', '칼리', '호영'],
  해적: ['바이퍼', '캡틴', '스트라이커', '캐논슈터', '메카닉', '엔젤릭버스터', '제논', '은월', 'Ark'],
};

// 날짜 유틸
export function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export function formatNumber(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  return n.toLocaleString();
}

export function formatCombatPower(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(2)}억`;
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)}천만`;
  if (n >= 10000) return `${(n / 10000).toFixed(0)}만`;
  return n.toLocaleString();
}
