/**
 * 엑셀 데이터를 admin.json에 적용
 * 1. mirror 162명 직위/이름/비고 업데이트
 * 2. left 배열에 탈퇴자 전원 추가 (중복은 memoHistory)
 * 3. 부캐 mainCharacter 업데이트
 */
import * as fs from 'fs';
import * as path from 'path';

const ADMIN_FILE = path.join(__dirname, '..', 'data', 'admin.json');

// ── 거울 길드원 엑셀 데이터 ──────────────────────────────
const excelMirror: { name: string; position: string; realName: string; note: string }[] = [
  { name: '쭈히', position: '거울', realName: '김주희/90', note: '' },
  { name: '데먼', position: '세계', realName: '김현우/00', note: '' },
  { name: '밈두', position: '세계', realName: '황민주/94', note: '' },
  { name: '소퐁', position: '세계', realName: '김태완/97', note: '' },
  { name: '휭곰범', position: '세계', realName: '김대휘/93', note: '' },
  { name: '0렙악마', position: '조각', realName: '김동환/02', note: '' },
  { name: '20억', position: '조각', realName: '여범찬/99', note: '' },
  { name: 'BOB버걸', position: '조각', realName: '심우국/02', note: '군 복무' },
  { name: 'EsenJ', position: '조각', realName: '형상아/95', note: '' },
  { name: 'Fives', position: '조각', realName: '진광명/01', note: '' },
  { name: 'iceia', position: '조각', realName: '정연우/01', note: '' },
  { name: 'JELYPO', position: '조각', realName: '박재휘/95', note: '' },
  { name: 'Limit', position: '조각', realName: '손준영/92', note: '' },
  { name: 'ol픈소마', position: '조각', realName: '육인혁/99', note: '' },
  { name: 'Or기밤비', position: '조각', realName: '최은선/95', note: '' },
  { name: 'PBVIP', position: '조각', realName: '조영수/94', note: '' },
  { name: '고냥이계란말', position: '조각', realName: '김준/99', note: '' },
  { name: '고로시상어', position: '조각', realName: '김민수/97', note: '' },
  { name: '관절렌', position: '조각', realName: '변영석/92', note: '' },
  { name: '그리워원기형', position: '조각', realName: '박주신/95', note: '' },
  { name: '금발카나오', position: '조각', realName: '배용민/99', note: '' },
  { name: '긍지높은콩', position: '조각', realName: '유성준/03', note: '' },
  { name: '기달리즈', position: '조각', realName: '김총명/92', note: '' },
  { name: '깝쯔', position: '조각', realName: '유다윗/91', note: '' },
  { name: '깡쫑민', position: '조각', realName: '강종민/94', note: '' },
  { name: '깨이', position: '조각', realName: '권덕륜/99', note: '' },
  { name: '꺄부렁', position: '조각', realName: '김기태/95', note: '' },
  { name: '꽐루님', position: '조각', realName: '이슬기/00', note: '' },
  { name: '나실피드', position: '조각', realName: '', note: '' },
  { name: '낙원의인형', position: '조각', realName: '강영규/04', note: '' },
  { name: '내활', position: '조각', realName: '계요한/92', note: '하대원' },
  { name: '노닥아크', position: '조각', realName: '이영훈/93', note: '' },
  { name: '노약자테러범', position: '조각', realName: '최대현/02', note: '' },
  { name: '니콜라테슬라', position: '조각', realName: '권용준/01', note: '' },
  { name: '닉넴쥰내귀찮', position: '조각', realName: '장승환/94', note: '' },
  { name: '데션족', position: '조각', realName: '장현우/02', note: '' },
  { name: '도동보', position: '조각', realName: '유승창/94', note: '' },
  { name: '두몽지로', position: '조각', realName: '이광호/02', note: '' },
  { name: '뚜앵아', position: '조각', realName: '임수아/01', note: '' },
  { name: '뚜왕아', position: '조각', realName: '오도연/03', note: '' },
  { name: '뚱넝', position: '조각', realName: '정한동/90', note: '' },
  { name: '뚱늬', position: '조각', realName: '유지영/93', note: '' },
  { name: '렌52', position: '조각', realName: '이동민/97', note: '' },
  { name: '렌뚜븃', position: '조각', realName: '고재준/95', note: '' },
  { name: '렌찌', position: '조각', realName: '김은정/94', note: '' },
  { name: '렌천칠', position: '조각', realName: '현석현/02', note: '' },
  { name: '령언', position: '조각', realName: '김형언/92', note: '' },
  { name: '로보락', position: '조각', realName: '유지민/91', note: '' },
  { name: '로사나워', position: '조각', realName: '오일수/93', note: '' },
  { name: '매혈단화', position: '조각', realName: '정선문/01', note: '' },
  { name: '맹자린', position: '조각', realName: '임세미/97', note: '' },
  { name: '메익두방', position: '조각', realName: '홍승표/02', note: '' },
  { name: '모홋', position: '조각', realName: '고동우/90', note: '' },
  { name: '무민별', position: '조각', realName: '채원석/95', note: '은월짱할거야' },
  { name: '문쏙쏙', position: '조각', realName: '문수형/91', note: '' },
  { name: '미소맛소다', position: '조각', realName: '이상구/92', note: '' },
  { name: '미역', position: '조각', realName: '홍진영/95', note: '피노키오' },
  { name: '뱃흔', position: '조각', realName: '김태용/93', note: '' },
  { name: '변백', position: '조각', realName: '정문기/00', note: '' },
  { name: '빼봉', position: '조각', realName: '김동석/01', note: '' },
  { name: '뽀은', position: '조각', realName: '정민규/92', note: '' },
  { name: '설명스킵충', position: '조각', realName: '황정현/95', note: '' },
  { name: '설윤중', position: '조각', realName: '우윤중/04', note: '' },
  { name: '성현x', position: '조각', realName: '홍성현/92', note: '' },
  { name: '세현하나', position: '조각', realName: '최세현/92', note: '' },
  { name: '소방교최재혁', position: '조각', realName: '최재혁/00', note: '' },
  { name: '슬렌떠', position: '조각', realName: '이동엽/96', note: '' },
  { name: '십군', position: '조각', realName: '김학종/92', note: '' },
  { name: '쒸꺄', position: '조각', realName: '장현서/94', note: '' },
  { name: '아델렌타', position: '조각', realName: '박종우/01', note: '' },
  { name: '아리원z', position: '조각', realName: '한다원/88', note: '지성이대리중' },
  { name: '애플핏치', position: '조각', realName: '홍형기/96', note: '' },
  { name: '앵구바퍼', position: '조각', realName: '김영훈/94', note: '' },
  { name: '얼음맛좀봐랏', position: '조각', realName: '최준서/02', note: '' },
  { name: '에구룽', position: '조각', realName: '김재훈/02', note: '' },
  { name: '에너지스마일', position: '조각', realName: '최희도/94', note: '' },
  { name: '여명의키드', position: '조각', realName: '최환/99', note: '6월 복귀' },
  { name: '여모르띠', position: '조각', realName: '어수호/93', note: '' },
  { name: '예이이이이잇', position: '조각', realName: '유관우/06', note: '' },
  { name: '오늘춥더라', position: '조각', realName: '백종현/00', note: '' },
  { name: '외톨이영욱', position: '조각', realName: '이가민/96', note: '' },
  { name: '운리그', position: '조각', realName: '강태영/94', note: '' },
  { name: '원기는친구없', position: '조각', realName: '양현우/02', note: '' },
  { name: '헝헝석', position: '조각', realName: '전영욱/96', note: '월산동리가민' },
  { name: '유킹', position: '조각', realName: '', note: '입원' },
  { name: '윤띠', position: '조각', realName: '이아율/97', note: '' },
  { name: '으연', position: '조각', realName: '김의연/98', note: '앨뱁' },
  { name: '이민흉', position: '조각', realName: '이민형/00', note: '' },
  { name: '이시카와은월', position: '조각', realName: '조영빈/03', note: '' },
  { name: '임나구리', position: '조각', realName: '', note: '' },
  { name: '잉짱', position: '조각', realName: '박정혁/02', note: '' },
  { name: '전사렌쿤', position: '조각', realName: '권준석/96', note: '직업 군인' },
  { name: '전설적인고서', position: '조각', realName: '차준석/99', note: '' },
  { name: '조팔붕', position: '조각', realName: '박소망/92', note: '' },
  { name: '주입', position: '조각', realName: '지승헌/03', note: '' },
  { name: '지넬라', position: '조각', realName: '김준섭/03', note: '' },
  { name: '지팡이와데스', position: '조각', realName: '김형인/94', note: '' },
  { name: '쨩룩', position: '조각', realName: '박상현/93', note: '' },
  { name: '쪼읊', position: '조각', realName: '조민우/02', note: '직업 군인' },
  { name: '찐돌쿤', position: '조각', realName: '장진혁/92', note: '' },
  { name: '챠루', position: '조각', realName: '박지은/00', note: 'ROTC' },
  { name: '퀘스트충충', position: '조각', realName: '정다희/96', note: '' },
  { name: '크앍숍', position: '조각', realName: '이진원/90', note: '' },
  { name: '키아o', position: '조각', realName: '이준/91', note: '' },
  { name: '텃루', position: '조각', realName: '김은규/96', note: '' },
  { name: '팽장군', position: '조각', realName: '팽우택/94', note: '' },
  { name: '포철상', position: '조각', realName: '오상철/03', note: '' },
  { name: '포피넛', position: '조각', realName: '양서영/98', note: '' },
  { name: '핀치아빠', position: '조각', realName: '강철용/95', note: '' },
  { name: '하늘수', position: '조각', realName: '김용한/01', note: '' },
  { name: '헬로우송', position: '조각', realName: '손우현/93', note: '' },
  { name: '혁쥬', position: '조각', realName: '황혁주/98', note: '' },
  { name: '호피곰', position: '조각', realName: '윤요빈/93', note: '' },
  { name: '희뜨', position: '조각', realName: '장희승/97', note: '서거라' },
  { name: 'CcHm', position: '모래', realName: '차현석/97', note: '' },
  { name: 'THEHYPHEN', position: '모래', realName: '성화섭/97', note: '' },
  { name: '검바르', position: '모래', realName: '윤동준/02', note: '' },
  { name: '기마쯔', position: '모래', realName: '이현준/98', note: '' },
  { name: '김쫠깃', position: '모래', realName: '김수민/92', note: '' },
  { name: '난펫', position: '모래', realName: '임인지/90', note: '' },
  { name: '누끼렌', position: '모래', realName: '이상민/96', note: '' },
  { name: '닛뾰', position: '모래', realName: '김은률/02', note: '' },
  { name: '도낭비', position: '모래', realName: '정대민/99', note: '' },
  { name: '도히쑥', position: '모래', realName: '권태형/94', note: '' },
  { name: '등대지기은율', position: '모래', realName: '황차현/92', note: '' },
  { name: '딸기던진슬요', position: '모래', realName: '전병훈/91', note: '' },
  { name: '란화꽃', position: '모래', realName: '최지희/96', note: '' },
  { name: '롄숙', position: '모래', realName: '김경훈/92', note: '' },
  { name: '리승렌즈', position: '모래', realName: '이승용/98', note: '' },
  { name: '무로민', position: '모래', realName: '이상민/00', note: '' },
  { name: '받쑈', position: '모래', realName: '이정섭/91', note: '' },
  { name: '벡난', position: '모래', realName: '허재영/03', note: '' },
  { name: '븐브', position: '모래', realName: '이진형/00', note: '' },
  { name: '블결', position: '모래', realName: '황예일/01', note: '' },
  { name: '상암벌광전사', position: '모래', realName: '홍준영/91', note: '챌섭 교체' },
  { name: '악굽', position: '모래', realName: '김진원/00', note: '' },
  { name: '우미클', position: '모래', realName: '이우진/98', note: '' },
  { name: '재주부림', position: '모래', realName: '박대원/91', note: '' },
  { name: '전략가', position: '모래', realName: '강현석/96', note: '' },
  { name: '젼메추', position: '모래', realName: '권근찬/98', note: '' },
  { name: '조약백호활', position: '모래', realName: '한정우/04', note: '' },
  { name: '지하돌세민', position: '모래', realName: '정세민/04', note: '' },
  { name: '총쌤', position: '모래', realName: '이승민/91', note: '' },
  { name: '총알왕', position: '모래', realName: '손민재/98', note: '' },
  { name: '추준', position: '모래', realName: '이동민/96', note: '' },
  { name: '콰트로에어', position: '모래', realName: '송기렬/00', note: '' },
  { name: '탁쿤이', position: '모래', realName: '채상훈/96', note: '' },
  { name: '테더코인매입', position: '모래', realName: '김민수/98', note: '' },
  { name: '패그', position: '모래', realName: '이동민/96', note: '' },
  { name: '허쥬', position: '모래', realName: '김가윤/95', note: '쯔뗀' },
  { name: 'Ludani', position: '사유', realName: '박상현/02', note: '학기 중' },
  { name: '귀살대호앵', position: '사유', realName: '김동선/03', note: '' },
  { name: '떡꼬치맨', position: '사유', realName: '이충민/06', note: '3월 복귀' },
  { name: '렌타쿠용', position: '사유', realName: '백진욱/97', note: '3월 복귀' },
  { name: '맥주맛소마', position: '사유', realName: '이명요/92', note: '여름 복귀' },
  { name: '반쪽탄', position: '사유', realName: '진세명/94', note: '4월 복귀' },
  { name: '븜균', position: '사유', realName: '김고은/01', note: '' },
  { name: '섭바이병장', position: '사유', realName: '김승섭/97', note: '' },
  { name: '시간이머문별', position: '사유', realName: '박지훈/96', note: '5월 복귀' },
  { name: '앗츠팡', position: '사유', realName: '임성균/00', note: '' },
  { name: '집잃은펭귄', position: '사유', realName: '박정규/98', note: '' },
  { name: '크리아스노', position: '사유', realName: '강륜보/02', note: '' },
];

// ── 부캐 매핑 ────────────────────────────────────────────
const subCharMap: Record<string, string> = {
  'Flow': 'Limit',
  '나로멋쨍이': '메익두방',
  '노약자석여포': '노약자테러범',
  '령어니온': '령언',
  '세현마흔여섯': '세현하나',
  '소다맛미소': '미소맛소다',
  '여왕님최고다': 'ol픈소마',
  '지렌라': '지넬라',
  '첫미련': '십군',
  '키루o': '키아o',
  '파랑컬러렌즈': '원기는친구없',
  '현대렌': '꺄부렁',
  '홍언': '핀치아빠',
  '흰라라슈': '운리그',
  '맨들쭈': '쭈히',
  '사계의시계': '탁쿤이',
  '철상': '포철상',
};

// ── 탈퇴자 원시 데이터 ───────────────────────────────────
// 형식: 닉네임\t직업\t실명\t탈퇴사유\t비고
const leftRaw = `팬텀s블렉	팬텀		탈퇴	* 재가입 불가
삐치다	아델	이찬우/95	탈퇴	* 재가입 불가
흥엉이	아델	김나영/90	탈퇴	* 재가입 불가
듀블곰팅이	나이트로드	원건호/95	탈퇴	* 재가입 불가
땁팼	썬콜		탈퇴	* 재가입 불가
페라쿄	듀얼블레이드	송지헌/97	탈퇴	* 재가입 불가
진짜호돌이로	카이저	서준영/00	장기 미접속
뚜알라코알라	듀얼블레이더	정우진/03	장기 미접속
헐귄	나이트워커	최준하/97	탈퇴	* 재가입 불가
밍후e	보우마스터	손주환/93	탈퇴	* 재가입 불가
Lios윈브	윈드브레이커	박한수/92	장기 미접속
mylifezob	팔라딘	조용선/95	장기 미접속
사송송	나이트로드	김신종/95	리부트
벤이너무조왓	키네시스	추승준/01	월드리프
일본avi	비숍	이진우/90	월드리프
뉴옥닉스	팔라딘	김대희/96	재탈퇴	* 재가입 불가
안콤	신궁	안민섭/92	탈퇴	* 재가입 불가
삿포포	루미너스	이기훈/94	장기 미접속
게자동	패스파인더	이경민/95	탈퇴	* 재가입 불가
칼리앰		김재하/00	탈퇴	* 재가입 불가
YGGG	섀도어	박민수/93	탈퇴	* 재가입 불가
선도의배메	배틀메이지	우형욱/93	탈퇴	* 재가입 불가
단훠리	호영	단은비/01	탈퇴	* 재가입 불가
원봄이	불독	없음	강제탈퇴(스틸)	* 재가입 불가
박뀨성	히어로	박규성/01	탈퇴	* 재가입 불가
wweee	에반	조용주/94	탈퇴	* 재가입 불가
여흥띠	윈드브레이커	이준수/95	장기 미접속
라예소	라라		장기 미접속
하와와호영씨	호영	송인보/02	장기 미접속(입대)
장도옥	아델	강성진/90	탈퇴	* 재가입 불가
Pennem	나이트로드	석진우/94	탈퇴	* 재가입 불가
수룡의쌍칼	듀얼블레이더	권성진/94	탈퇴	* 재가입 불가
뽀롤잉	아델	이보라/96	탈퇴	* 재가입 불가
냐듣	나이트로드	윤범진/00	탈퇴	* 재가입 불가
루미륩	루미너스	김선웅/98	탈퇴	* 재가입 불가
호령왕자	호영	이연비/02	탈퇴	* 재가입 불가, 새근소근
상근용사동현	히어로	김동현/00	강제탈퇴(먹튀)	* 재가입 불가
홍머표	엔젤릭버스터	홍대표/98	탈퇴	* 재가입 불가
밈쿠	섀도어	박서진/99	탈퇴	* 재가입 불가
문연보라	불독	문무영/96	장기 미접속
원흥떡볶이	은월	김형준/94	장기 미접속
수펩	섀도어	김창수/01	장기 미접속
환상아라모드	신궁	이동호/95	장기 미접속
붕붕훅종일	소울마스터	곽재현/97	장기 미접속
바이퍼전어	바이퍼	위지훈/97	장기 미접속
금방망이	호영	이금현/98	장기 미접속
카덴사	카데나	김승현/03	장기 미접속
서영창	불독	전태영/99	장기 미접속
별류	섀도어	김태준/95	탈퇴	* 재가입 불가
중기	섀도어	민중기	탈퇴	* 재가입 불가
새근소근	데몬 슬레이어	이종민/95	탈퇴	* 재가입 불가, 호령왕자, 묘한소리
왹커	나이트워커	남혜림/97	탈퇴	* 재가입 불가
토반		김다훈/95	탈퇴	* 재가입 불가
망구르파지		이영민/99	탈퇴	* 재가입 불가
유틈	아델	차재혁/00	강제탈퇴(스틸)	* 아이디 구매자가 비매너 행위(스틸)
호설율	칼리	이재익/93	탈퇴	* 재가입 불가
베리쿨쿨	나이트로드	김승운/92	장기 미접속
진짜이적금지	아크	박동규/94	장기 미접속
ANTITHESE	은월	신동민/03	장기 미접속
광평동히어로	히어로	양기철/93	장기 미접속
메점	칼리	서민형/94	탈퇴	* 재가입 불가
팩돌희	바이퍼	김승환/94	탈퇴	* 재가입 불가
꿀섬	나이트워커	송태우/91	탈퇴	* 재가입 불가
민란	아델	민웅기/93	탈퇴	* 재가입 불가
뽀둡	패스파인더	최예지/01	탈퇴	* 재가입 불가
미카비틱기원	비숍	김태연/03	장기 미접속
칠공주리더	메르세데스	이호준/99	장기 미접속
안재앙의아들	윈드브레이커	이강훈/98	장기 미접속
양여자	라라	서성빈/95	장기 미접속
선조치무보고	윈드브레이커	안성진/92	장기 미접속
본투러브	메르세데스	박상준/96	장기 미접속
런쉘	소울마스터	박세연/01	장기 미접속
숙제해야겠따	에반	정건우/03	장기 미접속
섶섣	엔젤릭버스터	안수빈/98	탈퇴	* 재가입 불가
출동직(개두요)	바이퍼	이두원/91	탈퇴	* 재가입 불가, 묘한소리
교황박동범	비숍	박동범/91	탈퇴	* 재가입 불가, 묘한소리
우니여님	소울마스터	이다운/91	탈퇴	* 재가입 불가, 묘한소리
양주먹고맴맴	아델	신동현/94	탈퇴	* 재가입 불가
메또해	히어로	황동욱/91	탈퇴	* 재가입 불가, 묘한소리
잇닷(샌소)	카데나	오인택/96	장기 미접속
THEHYPHEN	윈드브레이커	성화섭/97	장기 미접속
꼐훗	아델	김시현/96	장기 미접속
님하루	나이트로드	김수영/01	장기 미접속
서준도령	키네시스	유재현/00	장기 미접속
로미네윈브	윈드브레이커	박영문/89	장기 미접속
김헷픔	제로	김경민/97	장기 미접속
그랜드오카상	윈드브레이커	이해성/96	장기 미접속
솅쿤	비숍	이세형/88	장기 미접속
시슬리향수	신궁	임성진/92	장기 미접속
응애나살려죠	캡틴	박지호/97	장기 미접속
리린썬	불독	김민우/96	탈퇴
꿰뜬	섀도어	김승범/03	탈퇴
윈두심	윈드브레이커	장동규/94	탈퇴	* 재가입 불가, 묘한소리
에프킴라	듀얼블레이더	최신걸/95	탈퇴
트루엘소마	소울마스터		장기 미접속
서의히	썬콜	이새롬/95	재탈퇴	* 재가입 불가, 체노 뚜비두빗
푸시깽이	나이트로드	신재헌/99	탈퇴
송항영	엔젤릭버스터	원찬웅/00	장기 미접속
지난날이밉다	소울마스터	정다훈/96	장기 미접속
오렌지헤드셋	듀얼블레이더	이세훈/98	탈퇴
서제노	아란	송선오/98	탈퇴
콩챠비	엔젤릭버스터	윤서영/03	탈퇴
자답	비숍	오수영/94	탈퇴
뚜언히	윈드브레이커	조원희/93	탈퇴
세가	라라	김동희/04	탈퇴
이언뉴		김민경/98	탈퇴
가던길가숍	비숍	김규진/95	장기 미접속
권익	섀도어	장현빈/01	장기 미접속
뚜지훈	히어로	최지훈/93	장기 미접속
만취전사	히어로	최서원/91	장기 미접속
섀도옥킹	섀도어	홍승현/95	장기 미접속
앗츠팡	팔라딘		장기 미접속
zl존곰탕	소울마스터	손대현/92	장기 미접속
폴암으로쳐팸	아란	지성현/91	장기 미접속
망고마싸	불독	정의걸/95	장기 미접속
뽀오승	불독	최승표/93	장기 미접속
듀블박종찬	듀얼블레이더	박종찬/97	장기 미접속
썬호야스	썬콜	전호영/98	탈퇴
종퐈	섀도어	오종화/91	탈퇴	* 재가입 불가 (분쟁)
땡벌임	히어로	정성훈	탈퇴
꿀섬	나이트워커	송태우/91	재탈퇴	* 재가입 불가, 재탈퇴
일진하다	나이트워커	정일진/98	탈퇴
묘한소리	비숍	신동해/97	탈퇴	* 재가입 불가 (분쟁)
ChoiYJ	제로	송성인/94	장기 미접속
스빈이	팬텀	홍주현/97	탈퇴
25설경	바이퍼	박찬수/00	강제탈퇴(사기)	* 재가입 불가, 사기 전적 확인
잽이님	윈드브레이커	최성민/91	장기 미접속
키보만	윈드브레이커	김영훈/91	장기 미접속
둥둥쑤마	소울마스터	정한동/90	장기 미접속
예나키키z	바이퍼	신현용/92	장기 미접속
윤식불독	불독	최윤석/00	장기 미접속
래테이	다크나이트	남도현/99	장기 미접속
믹뿌	섀도어	김진영/94	탈퇴	* 재가입 불가
쭈파	나이트로드	이민규/95	탈퇴
신묘	불독	윤일룡/96	탈퇴
굻냐	듀얼블레이더	김용겸/00	탈퇴	* 재가입 불가 (노블)
집잃은펭귄	패스파인더	박정규/98	장기 미접속
롱알롱알롱	듀얼블레이더	박석준	장기 미접속
암행출두	나이트워커	하정우/03	장기 미접속
검황난무	칼리	김현준/98	탈퇴
이외팔	나이트워커	이기헌/00	장기 미접속
내폭	섀도어	최준수/98	장기 미접속
노먹	카인	송형준/96	장기 미접속
비숍해봤냐	비숍	박기홍/93	장기 미접속
숙희집사	호영	김태인/99	장기 미접속
유리별콩콩	섀도어		장기 미접속
젼밍	바이퍼	김지현/00	장기 미접속
김려울	아델	차민정/03	장기 미접속
르잎	라라	강지수/93	장기 미접속
녜담님	윈드브레이커	서주연/93	장기 미접속
학영이	나이트워커	김학영/94	탈퇴
최애의푸	나이트로드	진정현/95	장기 미접속
유썹	에반	김유섭/96	장기 미접속
레빛찬	라라	김한빛/92	장기 미접속
옥과소마	소울마스터	김보성/00	장기 미접속
이마가사이코	키네시스	김도윤/03	장기 미접속
숍두심	비숍	장동규/94	재탈퇴	* 재가입 불가
드림처럼	비숍	김영진/93	탈퇴
근육효원	제로	김효원/97	탈퇴
장오왼	히어로	장현진/97	메접
피바람홍학	듀얼블레이더	신동연/01	메접
서리꽃	제로	김영준/94	탈퇴	* 재가입 불가
마약게임시작	나이트로드	최현수/01	장기 미접속
햄토리p	라라	김동진/92	장기 미접속
묘링	아델	김형석/92	장기 미접속
풀똥	아델	홍대기/98	장기 미접속
믿믄	소울마스터	김재현/97	장기 미접속
아릇쓰	듀얼블레이더	최영재/96	장기 미접속
도아델연	아델	김상훈/94	장기 미접속
공부접은학생	캐논마스터	김택준/05	장기 미접속
하정우	바이퍼	양유안/98	탈퇴	* 재가입 불가, 비매너 제보
찬희멍	나이트로드	김영진/01	탈퇴	* 재가입 불가
최꽥이	비숍	윤석균/97	탈퇴
최꽥이슈우웃	소울마스터	이수민/94	탈퇴
seezi	은월	윤병호/98	탈퇴
류나밍	캡틴	이대형/94	탈퇴
동구리썬	나이트로드	김기선/97	탈퇴	* 재가입 불가 (분쟁)
맹한	제로	정진원/01	탈퇴
오빠도적	나이트워커	최선호/91	탈퇴
빛빈	아델	김용환/02	탈퇴
누벼	은월	한승진/90	탈퇴	* 재가입 불가
98메이지	배틀메이지	정원범/98	장기 미접속
신월동태팔	패스파인더	김태원/94	장기 미접속
잼민율	비숍	이유린/01	재탈퇴	* 재가입 불가
정웅인	팔라딘	최우성/90	탈퇴	* 재가입 불가
버프돈받아	비숍	배명일/97	장기 미접속
하이퍼엇	바이퍼	하건수/89	장기 미접속
화손녀	비숍	정우인/98	장기 미접속
하와와아라	아델	김민준/99	장기 미접속
쏘기쀼	윈드브레이커	황동욱/99	장기 미접속
안랩	아란	이영우/94	장기 미접속
야잼만아	비숍	박준용/96	장기 미접속
젤리꽁장짱	에반	곽주안/02	장기 미접속
삼성평택공장	배틀메이지	김태영/96	장기 미접속
교황재원	비숍	임재원/99	장기 미접속
짐파	바이퍼	이강현/99	장기 미접속
뚜비두빗	플레임위자드	허재성/98	탈퇴	* 재가입 불가 (분쟁)
은환	윈드브레이커	왕은환/87	탈퇴	* 재가입 불가 (분쟁)
체노	은월	문현우/00	탈퇴	* 재가입 불가 (분쟁)
진류경	비숍	심수진/93	탈퇴
박재곤	메카닉	박재곤/98	메접
흙먹는소마님	소울마스터	김지훈/96	탈퇴	* 재가입 불가 (분쟁)
LemonCandy	블래스터	전지웅/03	탈퇴
윤국좌	썬콜	윤국현/89	탈퇴
In2you	비숍	이도훈/05	장기 미접속
계란마리떡밥	소울마스터	김영진/96	메접
naro말하면	나이트로드	백종현/00	메접
밤침	섀도어	안현모/97	메접
치킨서겟	캐논마스터	염문식/97	메접
곰윤호	플레임위자드	문윤호/04	탈퇴
김삐꾹	칼리	이우진/95	장기 미접속
덩딱지	썬콜	이태현/91	장기 미접속
여심도둑춘식	나이트로드	이형훈/98	장기 미접속
옙허	데몬 어벤져	지수환/05	장기 미접속
옛븜	호영	우승우/93	장기 미접속
잠자는별림	비숍	한동희/98	장기 미접속
정상인데	제로	유정상/01	메접
서연이삼겹살	보우마스터	정태양/90	메접
급솔	에반	정재우/04	탈퇴
썬생님	썬콜	강운기/95	탈퇴	* 재가입 불가 (인벤박제)
눅벽	아델	안혁/01	탈퇴
도로테아멍	불독	변유민/01	장기 미접속
꿸톡	에반	임채원/01	장기 미접속
시아루카	캐논마스터	최현영/93	메접
본도	라라	전유진/96	탈퇴	* 재가입 불가 (넷카마)
드픕	나이트워커	김승한/99	장기 미접속
쯩껴	나이트워커	이주현/97	장기 미접속
세구빔으로	루미너스	이재웅/93	메접
3줄요약해줘	아델	박용준/97	탈퇴
메론재삐	일리움	김정훈/98	탈퇴
LavyNetzach	비숍	고아진/98	장기 미접속
그리밍스타	팬텀	정송현/01	장기 미접속
날아라둥둥띠	다크나이트	나준엽/96	탈퇴
딸리로레	제로	김기범/96	메접
제갈씨	나이트워커	제갈동연/93	탈퇴
신인상	아델	이위립/92	탈퇴
헤루잉	에반	허창희/96	장기 미접속
가이랑랑	라라	윤희성/02	장기 미접속
풀똥	아델	홍대기/98	장기 미접속
레빛찬	라라	김한빛/92	장기 미접속
미자미자	엔젤릭버스터	차미지/99	장기 미접속
정기윈	카인	정기원/95	장기 미접속
조태다당	팬텀	조태형/00	메접
내폭	섀도어	최준수/98	메접
Lunarli	윈드브레이커	김찬욱/95	탈퇴
읍땃	비숍	임송이/96	메접
원잉	듀얼블레이더	김민혁/96	메접
불벅인데요	소울마스터	조희덕/89	장기 미접속
돼햄이	메르세데스	윤한기/93	장기 미접속
안주걸이	불독	권용욱/01	장기 미접속
통한의컨트롤	카데나	서일현/98	메접
컹굿	캐논마스터	소휘윤/01	탈퇴
라디노클로버	팔라딘	임재원/99	메접
I엘시I	썬콜	한승현/05	메접
지히창	카인	정희창/96	메접
유윈오	윈드브레이커	유윤오/96	메접
주형상	소울마스터	이주형/98	탈퇴	* 재가입 불가 (노블)
THEHYPHEN	윈드브레이커	성화섭/97	탈퇴
활활탁탁	불독	최세빈/95	탈퇴
석출존슨	바이퍼	김일훈/99	탈퇴
아까먹은치킨	비숍	서영빈/00	메접
주스병	바이퍼	최승환/00	장기 미접속
권은월신	은월	권준/96	탈퇴
곰이핑	은월	김동권/94	탈퇴
찰향	엔젤릭버스터	오재철/99	탈퇴
짭콕	나이트로드	황용택/00	강제 탈퇴	* 재가입 불가, 물통 사기 의심
똘이와까미	패스파인더	이재원/98	탈퇴
넙접	데몬 어벤져	장준수/06	탈퇴
su얼크루	윈드브레이커	백성연/95	장기간 미접속
소앵훈	불독	박소영/96	장기간 미접속
크사네	칼리	방성환/90	장기간 미접속
스르르메르르	메르세데스	김륜형/01	장기간 미접속
안토님	나이트워커	임상철/02	장기간 미접속
펭젠	데몬 어벤져	송호성/03	탈퇴
장수베토벤	소울마스터	김효재/94	탈퇴
플레이팅	데몬 어벤져	박성준/01	메접
소꾼	나이트로드	남민수/03	장기간 미접속
리시현	팬텀	이시현/04	장기간 미접속
지레사정	바이퍼	최희승/93	장기간 미접속
개피로	다크나이트	윤상원/99	장기간 미접속
82키로감자	엔젤릭버스터	김진우/97	장기간 미접속
굿딕	제로	조규찬/91	메접
매화밍꾸	렌	정민구/92	탈퇴
노인과지게	팔라딘	김동한/95	메접
뎨햇	데몬 어벤져	손주환/93	탈퇴
교드리치	나이트로드	전교훈	장기 미접속
신한쫄	데몬 슬레이어	신한철/92	메접
하와와아라	아델	김민준/99	장기간 미접속
룬맨	나이트워커	이록원/93	장기간 미접속
S2한	비숍	이용우/01	장기간 미접속
라딧숍	비숍	정재우/98	탈퇴
땜볘	렌	진석현/99	탈퇴
요것바	일리움	박준수/95	메접
jelly젤리	썬콜	배가람/85	탈퇴
딕먕	엔젤릭버스터	이윤제/03	탈퇴	* 재가입 불가 (노블)
임칙단	렌	정태영/94	탈퇴	* 재가입 불가 (노블)
냥캣야옹천사	라라	정성우/99	탈퇴
킨스더	라라	박민수/99	탈퇴
긱년	캐논마스터	박성윤/01	장기간 미접속
싫어흑인은	키네시스	이정/00	장기간 미접속
풍각	렌	김민규/98	장기간 미접속
쟁반장	루미너스	우준서/03	장기간 미접속
추의	블래스터	최시원/98	탈퇴
큄승현	팬텀	김승현/96	탈퇴
엄태열	패스파인더	김태열/01	메접
거눅렌	렌	이진기/95	탈퇴
a포근포근a	에반	윤준용/03	장기간 미접속
Ceph1	보우마스터	천주형/00	장기간 미접속
똔이요	렌	정대희/98	장기간 미접속
눌그룹	나이트로드	김정록/97	장기간 미접속
매검설화	렌	심성현/95	탈퇴	* 상위 길드 이적
토모라	썬콜	이기훈/85	탈퇴	* 재가입 불가 (핑프)
잇사시브리	듀얼블레이더	양성모/93	탈퇴	* 재가입 불가 (소통불가)
범마렌	렌	황상선/90	메접
캡뮴미	캡틴	백준현/02	장기간 미접속
자중심	듀얼블레이더	배주광/99	장기간 미접속
츠칭잉	렌	박준규/00	탈퇴	* 지인 길드
광주혀기	나이트워커	박창혁/95	메접
톰오오	보우마스터	전준영/97	탈퇴	* 길드 이전
섐딩	에반	김용우/02	월드리프	* 에바노
렌렌현	렌	임수현/98	탈퇴
해구슬	아델	유진선/94	탈퇴
렌드드	렌	이인희/93	메접	* 프뽑
활잽이킹	보우마스터	박형민/01	탈퇴
물방울앵꼬	나이트로드	변창석/95	탈퇴
늦산	아크	서신성/96	장기간 미접속
입량	불독	정영석/94	장기간 미접속
멀혜	불독	노호찬/92	장기간 미접속
셀격	바이퍼	박수열/98	장기간 미접속
마을사람R	비숍	강동권/95	메접
서른살이	렌	박경인/97	메접
원웅언니	나이트워커	이원웅/97	강제탈퇴	* 이중 길드
곤뜩	나이트로드	최한별/92	메접
민몌린	히어로	김민혁/96	메접
손뼉	제로	김현우/00	강제탈퇴	* 재가입 불가
쌈무에쌈싸기	렌	장현욱/02	메접
이걸로누구	데몬 어벤져	김훈호/91	장기간 미접속
돌아와지누	아델	김진우/95	장기간 미접속
누꿉	나이트로드	김보권/97	장기간 미접속
달빛의포근함	렌	이유찬/00	장기간 미접속
렐닝2	렌	임성규/98	장기간 미접속
머힛	바이퍼	김진호/99	장기간 미접속
섹시큐티디숭	비숍	이지수/94	탈퇴
루르o	제로	유강현/03	탈퇴
치즈같은치즈	아크	이주환/99	탈퇴
주몽파트너	렌	이철민/93	탈퇴	* 노블
칠신	히어로	박창규/94	탈퇴	* 상위 길드 이적
ldh98	스트라이커	이동협/98	탈퇴
뭐딥	렌	김문현/88	메접
뉘코틴	배틀메이지	김준영/94	탈퇴
남성혐	와일드헌터	남성현/93	탈퇴	* 노블
시하소	카데나	이성현/04	재탈퇴	* 어사, 재가입 불가
래경래	비숍	김경래/93	메접
용용이눈나	에반	하윤주/98	장기간 미접속
금츔	렌	이경국/02	장기간 미접속
쿨우	나이트로드	이준호/95	장기간 미접속
산골짜기렌	렌	송석/01	장기간 미접속
깅바비	렌	유지원/94	장기간 미접속
IluvZero	제로	황광호/06	장기간 미접속
능캣	렌	이근원/94	장기간 미접속
설렌s	렌	김나영/92	장기간 미접속
쑈혜	윈드브레이커	박재민/96	장기간 미접속
잼일검	불독	이상진/98	장기간 미접속
탱또먹	루미너스	박서연/97	장기간 미접속
렌선뽑힌망붕	렌	조수아/95	장기간 미접속
희쿨	렌	최시원/98	장기간 미접속`;

function parseLeftRaw(raw: string) {
  return raw.split('\n').map(line => {
    const parts = line.split('\t');
    return {
      characterName: parts[0]?.trim() ?? '',
      job: parts[1]?.trim() ?? '',
      realName: parts[2]?.trim() ?? '',
      leftReason: parts[3]?.trim() ?? '',
      note: parts[4]?.trim() ?? '',
    };
  }).filter(r => r.characterName);
}

function main() {
  const admin = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf-8'));
  const adminMirrorMap = new Map(admin.mirror.map((m: any) => [m.characterName, m]));

  // ── 1. mirror 멤버 업데이트 (직위/이름/비고) ─────────────
  let mirrorUpdated = 0;
  for (const excel of excelMirror) {
    const member = adminMirrorMap.get(excel.name) as any;
    if (!member) continue;
    let changed = false;
    if (excel.position && member.position !== excel.position) {
      member.position = excel.position;
      changed = true;
    }
    if (excel.realName && member.realName !== excel.realName) {
      member.realName = excel.realName;
      changed = true;
    }
    if (excel.note && member.note !== excel.note) {
      member.note = excel.note;
      changed = true;
    }
    if (changed) mirrorUpdated++;
  }
  console.log(`✅ mirror 업데이트: ${mirrorUpdated}명`);

  // ── 2. 부캐 mainCharacter 업데이트 ───────────────────────
  let subUpdated = 0;
  for (const member of admin.mirror) {
    const mainChar = subCharMap[member.characterName];
    if (mainChar && member.mainCharacter !== mainChar) {
      member.mainCharacter = mainChar;
      subUpdated++;
    }
  }
  console.log(`✅ 부캐 mainCharacter 업데이트: ${subUpdated}명`);

  // ── 3. left 배열 구성 ─────────────────────────────────────
  const leftEntries = parseLeftRaw(leftRaw);

  // 중복 처리: 같은 characterName이 여러 번 나오면 마지막을 메인으로, 이전 것은 memoHistory에
  // Map: name → { entry, previousEntries[] }
  const leftMap = new Map<string, { entry: any; history: string[] }>();

  for (const entry of leftEntries) {
    const key = entry.characterName;
    if (leftMap.has(key)) {
      const existing = leftMap.get(key)!;
      // 이전 항목을 히스토리로 이동
      const prev = existing.entry;
      existing.history.push(`[이전] ${prev.leftReason}${prev.note ? ' ' + prev.note : ''}`);
      existing.entry = entry; // 최신 항목으로 교체
    } else {
      leftMap.set(key, { entry, history: [] });
    }
  }

  // left 배열 생성
  const newLeftArray: any[] = [];
  for (const [name, { entry, history }] of leftMap) {
    newLeftArray.push({
      characterName: name,
      job: entry.job || '',
      realName: entry.realName || '',
      leftReason: entry.leftReason || '',
      note: entry.note || '',
      memoHistory: history,
    });
  }

  console.log(`✅ left 배열 생성: ${newLeftArray.length}명 (원본 ${leftEntries.length}줄)`);

  // 기존 left에 있던 것과 중복 체크 (현재는 빈 배열이지만 안전하게)
  const existingLeftNames = new Set((admin.left ?? []).map((m: any) => m.characterName));
  const addedCount = newLeftArray.filter(m => !existingLeftNames.has(m.characterName)).length;
  const mergedCount = newLeftArray.filter(m => existingLeftNames.has(m.characterName)).length;

  admin.left = newLeftArray;
  admin.config.lastUpdated = new Date().toISOString();

  fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2));
  console.log(`\n📁 admin.json 저장 완료`);
  console.log(`   mirror: ${admin.mirror.length}명 (${mirrorUpdated}명 업데이트)`);
  console.log(`   left: ${admin.left.length}명 (신규 ${addedCount}, 기존 ${mergedCount})`);
  console.log(`   dalla: ${admin.dalla.length}명`);

  // 요약: leaveDetected 멤버가 left에도 있는 경우
  const leaveDetectedNames = admin.mirror.filter((m: any) => m.leaveDetected).map((m: any) => m.characterName);
  const leftNames = new Set(admin.left.map((m: any) => m.characterName));
  const overlap = leaveDetectedNames.filter((n: string) => leftNames.has(n));
  if (overlap.length > 0) {
    console.log(`\n⚠️  leaveDetected이면서 left에도 있는 멤버 (${overlap.length}명):`);
    overlap.forEach((n: string) => console.log(`  - ${n}`));
    console.log('  → 이 멤버들은 예전에 탈퇴했다가 재가입한 것으로 보임');
  }
}

main();
