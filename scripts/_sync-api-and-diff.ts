/**
 * 1. API 기준으로 admin.json 업데이트 (헝헝석 추가, 19명 leaveDetected)
 * 2. 엑셀 데이터와 차이점 출력
 */
import { config } from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
config({ path: path.join(__dirname, '..', '.env.local') });

const API_KEY = process.env.NEXON_API_KEY!;
const BASE = 'https://open.api.nexon.com/maplestory/v1';
const ADMIN_FILE = path.join(__dirname, '..', 'data', 'admin.json');

let lastCall = 0;
async function call(url: string) {
  const now = Date.now();
  const wait = 210 - (now - lastCall);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastCall = Date.now();
  const res = await fetch(url, { headers: { 'x-nxopen-api-key': API_KEY } });
  return res.json();
}

// ── 엑셀 거울 길드원 데이터 ─────────────────────────────────
// format: mainOwner, name, job, level, position, note, realName
const excelMirror: { name: string; position: string; realName: string; note: string; mainCharacter: string }[] = [
  { name: '쭈히', position: '거울', realName: '김주희/90', note: '', mainCharacter: 'original' },
  { name: '데먼', position: '세계', realName: '김현우/00', note: '', mainCharacter: 'original' },
  { name: '밈두', position: '세계', realName: '황민주/94', note: '', mainCharacter: 'original' },
  { name: '소퐁', position: '세계', realName: '김태완/97', note: '', mainCharacter: 'original' },
  { name: '휭곰범', position: '세계', realName: '김대휘/93', note: '', mainCharacter: 'original' },
  { name: '0렙악마', position: '조각', realName: '김동환/02', note: '', mainCharacter: 'original' },
  { name: '20억', position: '조각', realName: '여범찬/99', note: '', mainCharacter: 'original' },
  { name: 'BOB버걸', position: '조각', realName: '심우국/02', note: '군 복무', mainCharacter: 'original' },
  { name: 'EsenJ', position: '조각', realName: '형상아/95', note: '', mainCharacter: 'original' },
  { name: 'Fives', position: '조각', realName: '진광명/01', note: '', mainCharacter: 'original' },
  { name: 'iceia', position: '조각', realName: '정연우/01', note: '', mainCharacter: 'original' },
  { name: 'JELYPO', position: '조각', realName: '박재휘/95', note: '', mainCharacter: 'original' },
  { name: 'Limit', position: '조각', realName: '손준영/92', note: '', mainCharacter: 'original' },
  { name: 'ol픈소마', position: '조각', realName: '육인혁/99', note: '', mainCharacter: 'original' },
  { name: 'Or기밤비', position: '조각', realName: '최은선/95', note: '', mainCharacter: 'original' },
  { name: 'PBVIP', position: '조각', realName: '조영수/94', note: '', mainCharacter: 'original' },
  { name: '고냥이계란말', position: '조각', realName: '김준/99', note: '', mainCharacter: 'original' },
  { name: '고로시상어', position: '조각', realName: '김민수/97', note: '', mainCharacter: 'original' },
  { name: '관절렌', position: '조각', realName: '변영석/92', note: '', mainCharacter: 'original' },
  { name: '그리워원기형', position: '조각', realName: '박주신/95', note: '', mainCharacter: 'original' },
  { name: '금발카나오', position: '조각', realName: '배용민/99', note: '', mainCharacter: 'original' },
  { name: '긍지높은콩', position: '조각', realName: '유성준/03', note: '', mainCharacter: 'original' },
  { name: '기달리즈', position: '조각', realName: '김총명/92', note: '', mainCharacter: 'original' },
  { name: '깝쯔', position: '조각', realName: '유다윗/91', note: '', mainCharacter: 'original' },
  { name: '깡쫑민', position: '조각', realName: '강종민/94', note: '', mainCharacter: 'original' },
  { name: '깨이', position: '조각', realName: '권덕륜/99', note: '', mainCharacter: 'original' },
  { name: '꺄부렁', position: '조각', realName: '김기태/95', note: '', mainCharacter: 'original' },
  { name: '꽐루님', position: '조각', realName: '이슬기/00', note: '', mainCharacter: 'original' },
  { name: '나실피드', position: '조각', realName: '', note: '', mainCharacter: 'original' },
  { name: '낙원의인형', position: '조각', realName: '강영규/04', note: '', mainCharacter: 'original' },
  { name: '내활', position: '조각', realName: '계요한/92', note: '하대원', mainCharacter: 'original' },
  { name: '노닥아크', position: '조각', realName: '이영훈/93', note: '', mainCharacter: 'original' },
  { name: '노약자테러범', position: '조각', realName: '최대현/02', note: '', mainCharacter: 'original' },
  { name: '니콜라테슬라', position: '조각', realName: '권용준/01', note: '', mainCharacter: 'original' },
  { name: '닉넴쥰내귀찮', position: '조각', realName: '장승환/94', note: '', mainCharacter: 'original' },
  { name: '데션족', position: '조각', realName: '장현우/02', note: '', mainCharacter: 'original' },
  { name: '도동보', position: '조각', realName: '유승창/94', note: '', mainCharacter: 'original' },
  { name: '두몽지로', position: '조각', realName: '이광호/02', note: '', mainCharacter: 'original' },
  { name: '뚜앵아', position: '조각', realName: '임수아/01', note: '', mainCharacter: 'original' },
  { name: '뚜왕아', position: '조각', realName: '오도연/03', note: '', mainCharacter: 'original' },
  { name: '뚱넝', position: '조각', realName: '정한동/90', note: '', mainCharacter: 'original' },
  { name: '뚱늬', position: '조각', realName: '유지영/93', note: '', mainCharacter: 'original' },
  { name: '렌52', position: '조각', realName: '이동민/97', note: '', mainCharacter: 'original' },
  { name: '렌뚜븃', position: '조각', realName: '고재준/95', note: '', mainCharacter: 'original' },
  { name: '렌찌', position: '조각', realName: '김은정/94', note: '', mainCharacter: 'original' },
  { name: '렌천칠', position: '조각', realName: '현석현/02', note: '', mainCharacter: 'original' },
  { name: '령언', position: '조각', realName: '김형언/92', note: '', mainCharacter: 'original' },
  { name: '로보락', position: '조각', realName: '유지민/91', note: '', mainCharacter: 'original' },
  { name: '로사나워', position: '조각', realName: '오일수/93', note: '', mainCharacter: 'original' },
  { name: '매혈단화', position: '조각', realName: '정선문/01', note: '', mainCharacter: 'original' },
  { name: '맹자린', position: '조각', realName: '임세미/97', note: '', mainCharacter: 'original' },
  { name: '메익두방', position: '조각', realName: '홍승표/02', note: '', mainCharacter: 'original' },
  { name: '모홋', position: '조각', realName: '고동우/90', note: '', mainCharacter: 'original' },
  { name: '무민별', position: '조각', realName: '채원석/95', note: '은월짱할거야', mainCharacter: 'original' },
  { name: '문쏙쏙', position: '조각', realName: '문수형/91', note: '', mainCharacter: 'original' },
  { name: '미소맛소다', position: '조각', realName: '이상구/92', note: '', mainCharacter: 'original' },
  { name: '미역', position: '조각', realName: '홍진영/95', note: '피노키오', mainCharacter: 'original' },
  { name: '뱃흔', position: '조각', realName: '김태용/93', note: '', mainCharacter: 'original' },
  { name: '변백', position: '조각', realName: '정문기/00', note: '', mainCharacter: 'original' },
  { name: '빼봉', position: '조각', realName: '김동석/01', note: '', mainCharacter: 'original' },
  { name: '뽀은', position: '조각', realName: '정민규/92', note: '', mainCharacter: 'original' },
  { name: '설명스킵충', position: '조각', realName: '황정현/95', note: '', mainCharacter: 'original' },
  { name: '설윤중', position: '조각', realName: '우윤중/04', note: '', mainCharacter: 'original' },
  { name: '성현x', position: '조각', realName: '홍성현/92', note: '', mainCharacter: 'original' },
  { name: '세현하나', position: '조각', realName: '최세현/92', note: '', mainCharacter: 'original' },
  { name: '소방교최재혁', position: '조각', realName: '최재혁/00', note: '', mainCharacter: 'original' },
  { name: '슬렌떠', position: '조각', realName: '이동엽/96', note: '', mainCharacter: 'original' },
  { name: '십군', position: '조각', realName: '김학종/92', note: '', mainCharacter: 'original' },
  { name: '쒸꺄', position: '조각', realName: '장현서/94', note: '', mainCharacter: 'original' },
  { name: '아델렌타', position: '조각', realName: '박종우/01', note: '', mainCharacter: 'original' },
  { name: '아리원z', position: '조각', realName: '한다원/88', note: '지성이대리중', mainCharacter: 'original' },
  { name: '애플핏치', position: '조각', realName: '홍형기/96', note: '', mainCharacter: 'original' },
  { name: '앵구바퍼', position: '조각', realName: '김영훈/94', note: '', mainCharacter: 'original' },
  { name: '얼음맛좀봐랏', position: '조각', realName: '최준서/02', note: '', mainCharacter: 'original' },
  { name: '에구룽', position: '조각', realName: '김재훈/02', note: '', mainCharacter: 'original' },
  { name: '에너지스마일', position: '조각', realName: '최희도/94', note: '', mainCharacter: 'original' },
  { name: '여명의키드', position: '조각', realName: '최환/99', note: '6월 복귀', mainCharacter: 'original' },
  { name: '여모르띠', position: '조각', realName: '어수호/93', note: '', mainCharacter: 'original' },
  { name: '예이이이이잇', position: '조각', realName: '유관우/06', note: '', mainCharacter: 'original' },
  { name: '오늘춥더라', position: '조각', realName: '백종현/00', note: '', mainCharacter: 'original' },
  { name: '외톨이영욱', position: '조각', realName: '이가민/96', note: '', mainCharacter: 'original' },
  { name: '운리그', position: '조각', realName: '강태영/94', note: '', mainCharacter: 'original' },
  { name: '원기는친구없', position: '조각', realName: '양현우/02', note: '', mainCharacter: 'original' },
  { name: '헝헝석', position: '조각', realName: '전영욱/96', note: '월산동리가민', mainCharacter: 'original' },
  { name: '유킹', position: '조각', realName: '', note: '입원', mainCharacter: 'original' },
  { name: '윤띠', position: '조각', realName: '이아율/97', note: '', mainCharacter: 'original' },
  { name: '으연', position: '조각', realName: '김의연/98', note: '앨뱁', mainCharacter: 'original' },
  { name: '이민흉', position: '조각', realName: '이민형/00', note: '', mainCharacter: 'original' },
  { name: '이시카와은월', position: '조각', realName: '조영빈/03', note: '', mainCharacter: 'original' },
  { name: '임나구리', position: '조각', realName: '', note: '', mainCharacter: 'original' },
  { name: '잉짱', position: '조각', realName: '박정혁/02', note: '', mainCharacter: 'original' },
  { name: '전사렌쿤', position: '조각', realName: '권준석/96', note: '직업 군인', mainCharacter: 'original' },
  { name: '전설적인고서', position: '조각', realName: '차준석/99', note: '', mainCharacter: 'original' },
  { name: '조팔붕', position: '조각', realName: '박소망/92', note: '', mainCharacter: 'original' },
  { name: '주입', position: '조각', realName: '지승헌/03', note: '', mainCharacter: 'original' },
  { name: '지넬라', position: '조각', realName: '김준섭/03', note: '', mainCharacter: 'original' },
  { name: '지팡이와데스', position: '조각', realName: '김형인/94', note: '', mainCharacter: 'original' },
  { name: '쨩룩', position: '조각', realName: '박상현/93', note: '', mainCharacter: 'original' },
  { name: '쪼읊', position: '조각', realName: '조민우/02', note: '직업 군인', mainCharacter: 'original' },
  { name: '찐돌쿤', position: '조각', realName: '장진혁/92', note: '', mainCharacter: 'original' },
  { name: '챠루', position: '조각', realName: '박지은/00', note: 'ROTC', mainCharacter: 'original' },
  { name: '퀘스트충충', position: '조각', realName: '정다희/96', note: '', mainCharacter: 'original' },
  { name: '크앍숍', position: '조각', realName: '이진원/90', note: '', mainCharacter: 'original' },
  { name: '키아o', position: '조각', realName: '이준/91', note: '', mainCharacter: 'original' },
  { name: '텃루', position: '조각', realName: '김은규/96', note: '', mainCharacter: 'original' },
  { name: '팽장군', position: '조각', realName: '팽우택/94', note: '', mainCharacter: 'original' },
  { name: '포철상', position: '조각', realName: '오상철/03', note: '', mainCharacter: 'original' },
  { name: '포피넛', position: '조각', realName: '양서영/98', note: '', mainCharacter: 'original' },
  { name: '핀치아빠', position: '조각', realName: '강철용/95', note: '', mainCharacter: 'original' },
  { name: '하늘수', position: '조각', realName: '김용한/01', note: '', mainCharacter: 'original' },
  { name: '헬로우송', position: '조각', realName: '손우현/93', note: '', mainCharacter: 'original' },
  { name: '혁쥬', position: '조각', realName: '황혁주/98', note: '', mainCharacter: 'original' },
  { name: '호피곰', position: '조각', realName: '윤요빈/93', note: '', mainCharacter: 'original' },
  { name: '희뜨', position: '조각', realName: '장희승/97', note: '서거라', mainCharacter: 'original' },
  { name: 'CcHm', position: '모래', realName: '차현석/97', note: '', mainCharacter: 'original' },
  { name: 'THEHYPHEN', position: '모래', realName: '성화섭/97', note: '', mainCharacter: 'original' },
  { name: '검바르', position: '모래', realName: '윤동준/02', note: '', mainCharacter: 'original' },
  { name: '기마쯔', position: '모래', realName: '이현준/98', note: '', mainCharacter: 'original' },
  { name: '김쫠깃', position: '모래', realName: '김수민/92', note: '', mainCharacter: 'original' },
  { name: '난펫', position: '모래', realName: '임인지/90', note: '', mainCharacter: 'original' },
  { name: '누끼렌', position: '모래', realName: '이상민/96', note: '', mainCharacter: 'original' },
  { name: '닛뾰', position: '모래', realName: '김은률/02', note: '', mainCharacter: 'original' },
  { name: '도낭비', position: '모래', realName: '정대민/99', note: '', mainCharacter: 'original' },
  { name: '도히쑥', position: '모래', realName: '권태형/94', note: '', mainCharacter: 'original' },
  { name: '등대지기은율', position: '모래', realName: '황차현/92', note: '', mainCharacter: 'original' },
  { name: '딸기던진슬요', position: '모래', realName: '전병훈/91', note: '', mainCharacter: 'original' },
  { name: '란화꽃', position: '모래', realName: '최지희/96', note: '', mainCharacter: 'original' },
  { name: '롄숙', position: '모래', realName: '김경훈/92', note: '', mainCharacter: 'original' },
  { name: '리승렌즈', position: '모래', realName: '이승용/98', note: '', mainCharacter: 'original' },
  { name: '무로민', position: '모래', realName: '이상민/00', note: '', mainCharacter: 'original' },
  { name: '받쑈', position: '모래', realName: '이정섭/91', note: '', mainCharacter: 'original' },
  { name: '벡난', position: '모래', realName: '허재영/03', note: '', mainCharacter: 'original' },
  { name: '븐브', position: '모래', realName: '이진형/00', note: '', mainCharacter: 'original' },
  { name: '블결', position: '모래', realName: '황예일/01', note: '', mainCharacter: 'original' },
  { name: '상암벌광전사', position: '모래', realName: '홍준영/91', note: '챌섭 교체', mainCharacter: 'original' },
  { name: '악굽', position: '모래', realName: '김진원/00', note: '', mainCharacter: 'original' },
  { name: '우미클', position: '모래', realName: '이우진/98', note: '', mainCharacter: 'original' },
  { name: '재주부림', position: '모래', realName: '박대원/91', note: '', mainCharacter: 'original' },
  { name: '전략가', position: '모래', realName: '강현석/96', note: '', mainCharacter: 'original' },
  { name: '젼메추', position: '모래', realName: '권근찬/98', note: '', mainCharacter: 'original' },
  { name: '조약백호활', position: '모래', realName: '한정우/04', note: '', mainCharacter: 'original' },
  { name: '지하돌세민', position: '모래', realName: '정세민/04', note: '', mainCharacter: 'original' },
  { name: '총쌤', position: '모래', realName: '이승민/91', note: '', mainCharacter: 'original' },
  { name: '총알왕', position: '모래', realName: '손민재/98', note: '', mainCharacter: 'original' },
  { name: '추준', position: '모래', realName: '이동민/96', note: '', mainCharacter: 'original' },
  { name: '콰트로에어', position: '모래', realName: '송기렬/00', note: '', mainCharacter: 'original' },
  { name: '탁쿤이', position: '모래', realName: '채상훈/96', note: '', mainCharacter: 'original' },
  { name: '테더코인매입', position: '모래', realName: '김민수/98', note: '', mainCharacter: 'original' },
  { name: '패그', position: '모래', realName: '이동민/96', note: '', mainCharacter: 'original' },
  { name: '허쥬', position: '모래', realName: '김가윤/95', note: '쯔뗀', mainCharacter: 'original' },
  { name: 'Ludani', position: '사유', realName: '박상현/02', note: '학기 중', mainCharacter: 'original' },
  { name: '귀살대호앵', position: '사유', realName: '김동선/03', note: '', mainCharacter: 'original' },
  { name: '떡꼬치맨', position: '사유', realName: '이충민/06', note: '3월 복귀', mainCharacter: 'original' },
  { name: '렌타쿠용', position: '사유', realName: '백진욱/97', note: '3월 복귀', mainCharacter: 'original' },
  { name: '맥주맛소마', position: '사유', realName: '이명요/92', note: '여름 복귀', mainCharacter: 'original' },
  { name: '반쪽탄', position: '사유', realName: '진세명/94', note: '4월 복귀', mainCharacter: 'original' },
  { name: '븜균', position: '사유', realName: '김고은/01', note: '', mainCharacter: 'original' },
  { name: '섭바이병장', position: '사유', realName: '김승섭/97', note: '', mainCharacter: 'original' },
  { name: '시간이머문별', position: '사유', realName: '박지훈/96', note: '5월 복귀', mainCharacter: 'original' },
  { name: '앗츠팡', position: '사유', realName: '임성균/00', note: '', mainCharacter: 'original' },
  { name: '집잃은펭귄', position: '사유', realName: '박정규/98', note: '', mainCharacter: 'original' },
  { name: '크리아스노', position: '사유', realName: '강륜보/02', note: '', mainCharacter: 'original' },
];

// 부캐 매핑 (본캐닉 → 부캐닉 목록)
const subCharMap: Record<string, string[]> = {
  'Limit': ['Flow'],
  '메익두방': ['나로멋쨍이'],
  '노약자테러범': ['노약자석여포'],
  '령언': ['령어니온'],
  '세현하나': ['세현마흔여섯'],
  '미소맛소다': ['소다맛미소'],
  'ol픈소마': ['여왕님최고다'],
  '지넬라': ['지렌라'],
  '십군': ['첫미련'],
  '키아o': ['키루o'],
  '원기는친구없': ['파랑컬러렌즈'],
  '꺄부렁': ['현대렌'],
  '핀치아빠': ['홍언'],
  '운리그': ['흰라라슈'],
  '쭈히': ['맨들쭈'],
  '탁쿤이': ['사계의시계'],
  '포철상': ['철상'],
};

async function main() {
  // ── 1. API 호출 ────────────────────────────────────────
  console.log('🔄 API 호출 중...');
  const guildId = await call(`${BASE}/guild/id?guild_name=거울&world_name=스카니아`);
  const guild = await call(`${BASE}/guild/basic?oguild_id=${guildId.oguild_id}`);
  const apiMembers: string[] = guild.guild_member;
  const apiSet = new Set(apiMembers);
  console.log(`API 길드원 수: ${apiMembers.length}명\n`);

  // ── 2. admin.json 로드 ─────────────────────────────────
  const admin = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf-8'));
  const adminMap = new Map(admin.mirror.map((m: any) => [m.characterName, m]));

  // ── 3. API 기준 업데이트 ───────────────────────────────
  // 3a. API에 없는 멤버 → leaveDetected
  let leaveCount = 0;
  for (const m of admin.mirror) {
    if (!apiSet.has(m.characterName) && !m.leaveDetected) {
      m.leaveDetected = true;
      leaveCount++;
    }
    // API에 다시 나타나면 해제
    if (apiSet.has(m.characterName) && m.leaveDetected) {
      m.leaveDetected = false;
    }
  }

  // 3b. API에 있는데 admin에 없는 → 신규 추가
  const today = new Date(Date.now() + 9*60*60*1000).toISOString().split('T')[0];
  let addCount = 0;
  for (const name of apiMembers) {
    if (!adminMap.has(name)) {
      admin.mirror.push({
        characterName: name,
        guild: 'mirror',
        position: '',
        mainCharacter: '',
        realName: '',
        note: '',
        inactiveReason: '',
        fromMirror: '',
        memoHistory: [],
        status: 'new',
        joinDate: today,
      });
      addCount++;
      console.log(`➕ 신규 추가: ${name}`);
    }
  }

  admin.config.lastUpdated = new Date().toISOString();
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2));
  console.log(`✅ API 업데이트 완료: 이탈감지 ${leaveCount}명, 신규추가 ${addCount}명\n`);

  // ── 4. 엑셀 vs admin 차이점 출력 ──────────────────────
  // admin 재로드 (방금 저장한 것)
  const adminUpdated = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf-8'));
  const adminMapUpdated = new Map(adminUpdated.mirror.map((m: any) => [m.characterName, m]));

  const excelMap = new Map(excelMirror.map(e => [e.name, e]));

  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 엑셀 vs admin 차이점');
  console.log('═══════════════════════════════════════════════════════\n');

  // 엑셀에 있는데 admin에 없는
  const excelOnlyNames = excelMirror.filter(e => !adminMapUpdated.has(e.name)).map(e => e.name);
  if (excelOnlyNames.length > 0) {
    console.log(`⚠️  엑셀에 있는데 admin에 없는 (${excelOnlyNames.length}명):`);
    excelOnlyNames.forEach(n => console.log(`  - ${n}`));
    console.log('');
  }

  // admin에 있는데 엑셀에 없는 (API에도 있는 현재 활성 멤버)
  const adminOnlyNames = adminUpdated.mirror.filter((m: any) =>
    !excelMap.has(m.characterName) && apiSet.has(m.characterName)
  ).map((m: any) => m.characterName);
  if (adminOnlyNames.length > 0) {
    console.log(`⚠️  API엔 있는데 엑셀에 없는 (${adminOnlyNames.length}명) → 엑셀 미반영 신규가입자?:`);
    adminOnlyNames.forEach((n: string) => console.log(`  - ${n}`));
    console.log('');
  }

  // 매칭된 멤버 중 필드 차이
  console.log('📝 매칭 멤버 필드 차이:');
  let diffCount = 0;
  for (const excel of excelMirror) {
    const admin = adminMapUpdated.get(excel.name) as any;
    if (!admin) continue;
    const diffs: string[] = [];
    if (excel.position && admin.position !== excel.position)
      diffs.push(`직위: "${admin.position || '없음'}" → "${excel.position}"`);
    if (excel.realName && admin.realName !== excel.realName)
      diffs.push(`이름: "${admin.realName || '없음'}" → "${excel.realName}"`);
    if (excel.note && admin.note !== excel.note)
      diffs.push(`비고: "${admin.note || '없음'}" → "${excel.note}"`);
    if (diffs.length > 0) {
      console.log(`  ${excel.name}: ${diffs.join(' | ')}`);
      diffCount++;
    }
  }
  if (diffCount === 0) console.log('  (없음)');

  // leaveDetected 상태인 멤버 요약
  const leaveDetected = adminUpdated.mirror.filter((m: any) => m.leaveDetected);
  console.log(`\n🚨 현재 이탈 감지 상태 (${leaveDetected.length}명):`);
  leaveDetected.forEach((m: any) => {
    const inExcel = excelMap.has(m.characterName);
    console.log(`  - ${m.characterName}${inExcel ? ' [엑셀O]' : ' [엑셀X - 신규탈퇴?]'}`);
  });
}

main().catch(console.error);
