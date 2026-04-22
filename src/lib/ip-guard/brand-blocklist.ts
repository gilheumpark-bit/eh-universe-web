/**
 * Brand / IP Blocklist — 한국 웹소설 생성·RAG 방어용 정적 템플릿.
 *
 * 목적:
 *   작가가 AI 초안 생성 시 실수로 실존 IP(상표·프랜차이즈·캐릭터명)를 본문에
 *   쓰는 것을 선제 차단한다. RAG 문서가 오염되어 이런 이름을 주입해도
 *   후속 스캐너가 탐지·재생성하도록 뿌리를 제공한다.
 *
 * 이 파일의 위치는 **씨앗(seed)**.
 *   - 실제 운영은 Codex의 "금지 브랜드" 섹션 + 사용자 입력으로 확장되어야 한다.
 *   - 여기 박힌 목록은 예시·베이스라인. 법적 책임 회피는 **작가·법무팀 확인 필수**.
 *
 * 확장 가이드:
 *   - 새 브랜드 추가 시 `aliases`에 한국어 음역본·공식 번역·약칭을 모두 등록.
 *   - `severity`:
 *     - 'critical' — 등록 상표 + 원저작자 추적 활발 (사용 시 즉각 DMCA 가능)
 *     - 'warning'  — 대중 IP이나 관용적 언급은 용인 (패러디·레퍼런스 정도)
 *     - 'info'     — 브랜드 자체는 중립, 맥락에 따라 문제
 *   - 국내 웹소설에서 자주 노출되는 IP를 우선 등록 (일본 만화·미국 슈퍼히어로·
 *     글로벌 게임 순).
 *
 * 확신도: 이 목록의 법적 정합성은 [확인 필요]. 초기 배포 전 법무 리뷰 권장.
 */

// ============================================================
// PART 1 — Types
// ============================================================

export type BrandSeverity = 'info' | 'warning' | 'critical';
export type BrandCategory =
  | 'us-entertainment'      // Marvel, DC, Disney, Pixar
  | 'jp-manga-anime'        // 원피스, 나루토, 귀멸의 칼날
  | 'kr-webnovel'           // 나 혼자만 레벨업, 화산귀환
  | 'kr-webtoon'            // 신의 탑, 고수, 외모지상주의
  | 'games'                 // 포켓몬, 레전드 오브 레전드, 디아블로
  | 'tech-it'               // iPhone, Android, Google
  | 'luxury-consumer'       // Rolex, Gucci, Porsche
  | 'food-beverage'         // Starbucks, Coca-Cola
  | 'sports-fashion'        // Nike, Adidas
  | 'film-tv';              // Star Wars, Harry Potter

export interface BrandEntry {
  /** 표준명 (영문 공식) */
  readonly canonical: string;
  /** 분류 */
  readonly category: BrandCategory;
  /** 심각도 */
  readonly severity: BrandSeverity;
  /**
   * 한국어 음역본·약칭·공식 번역 등. 정규식이 아닌 문자열 리스트 — scan 시
   * substring 또는 단어 경계 매칭.
   */
  readonly aliases: readonly string[];
  /** 소유자·퍼블리셔 (선택, 감사·리포트용) */
  readonly owner?: string;
}

export interface BrandFlag {
  readonly entry: BrandEntry;
  readonly matched: string;     // 실제 본문에 나타난 표기
  readonly position: number;    // 문자 오프셋
}

// ============================================================
// PART 2 — Blocklist (SEED — 확장 필수)
// ============================================================

export const BRAND_BLOCKLIST: readonly BrandEntry[] = [
  // ── US Entertainment ─────────────────────────────────────
  { canonical: 'Marvel', category: 'us-entertainment', severity: 'critical', owner: 'Disney/Marvel', aliases: ['마블', '마블스', 'MCU'] },
  { canonical: 'Spider-Man', category: 'us-entertainment', severity: 'critical', owner: 'Marvel', aliases: ['스파이더맨', '스파이더 맨', '거미맨'] },
  { canonical: 'Iron Man', category: 'us-entertainment', severity: 'critical', owner: 'Marvel', aliases: ['아이언맨', '아이언 맨'] },
  { canonical: 'Batman', category: 'us-entertainment', severity: 'critical', owner: 'DC', aliases: ['배트맨', '박쥐맨'] },
  { canonical: 'Superman', category: 'us-entertainment', severity: 'critical', owner: 'DC', aliases: ['슈퍼맨'] },
  { canonical: 'Disney', category: 'us-entertainment', severity: 'critical', owner: 'Disney', aliases: ['디즈니'] },
  { canonical: 'Mickey Mouse', category: 'us-entertainment', severity: 'critical', owner: 'Disney', aliases: ['미키마우스', '미키 마우스'] },

  // ── JP Manga / Anime ─────────────────────────────────────
  { canonical: 'One Piece', category: 'jp-manga-anime', severity: 'critical', owner: 'Shueisha', aliases: ['원피스', '원 피스', '루피'] },
  { canonical: 'Naruto', category: 'jp-manga-anime', severity: 'critical', owner: 'Shueisha', aliases: ['나루토'] },
  { canonical: 'Dragon Ball', category: 'jp-manga-anime', severity: 'critical', owner: 'Shueisha', aliases: ['드래곤볼', '드래곤 볼', '손오공'] },
  { canonical: 'Demon Slayer', category: 'jp-manga-anime', severity: 'critical', owner: 'Shueisha', aliases: ['귀멸의 칼날', '귀멸의칼날', '탄지로'] },
  { canonical: 'Attack on Titan', category: 'jp-manga-anime', severity: 'critical', owner: 'Kodansha', aliases: ['진격의 거인', '진격의거인', '에렌'] },
  { canonical: 'My Hero Academia', category: 'jp-manga-anime', severity: 'critical', owner: 'Shueisha', aliases: ['나의 히어로 아카데미아', '히로아카'] },
  { canonical: 'Hunter x Hunter', category: 'jp-manga-anime', severity: 'critical', owner: 'Shueisha', aliases: ['헌터×헌터', '헌터 헌터', '헌터x헌터'] },
  { canonical: 'Jujutsu Kaisen', category: 'jp-manga-anime', severity: 'critical', owner: 'Shueisha', aliases: ['주술회전', '이타도리'] },

  // ── KR Webnovel (주의: 동일 장르 작품 차용 금지) ──────
  { canonical: 'Solo Leveling', category: 'kr-webnovel', severity: 'critical', owner: 'D&C Media', aliases: ['나 혼자만 레벨업', '나혼자만레벨업', '성진우'] },
  { canonical: 'Return of the Mount Hua Sect', category: 'kr-webnovel', severity: 'critical', owner: 'Naver Webtoon', aliases: ['화산귀환', '청명'] },
  { canonical: 'Return of the Blossoming Blade', category: 'kr-webnovel', severity: 'warning', aliases: ['화산 전생', '화산전생'] },
  { canonical: "Swordmaster's Youngest Son", category: 'kr-webnovel', severity: 'critical', aliases: ['검술명가 막내아들', '검술명가막내아들', '진 룬칸델'] },
  { canonical: 'Omniscient Reader', category: 'kr-webnovel', severity: 'critical', aliases: ['전지적 독자 시점', '전독시', '김독자'] },

  // ── Games ────────────────────────────────────────────────
  { canonical: 'Pokémon', category: 'games', severity: 'critical', owner: 'The Pokémon Company', aliases: ['포켓몬', '포켓몬스터', '피카츄'] },
  { canonical: 'League of Legends', category: 'games', severity: 'critical', owner: 'Riot Games', aliases: ['리그 오브 레전드', '롤', 'LoL'] },
  { canonical: 'Diablo', category: 'games', severity: 'critical', owner: 'Blizzard', aliases: ['디아블로'] },
  { canonical: 'World of Warcraft', category: 'games', severity: 'critical', owner: 'Blizzard', aliases: ['와우', '월드 오브 워크래프트'] },
  { canonical: 'Minecraft', category: 'games', severity: 'critical', owner: 'Microsoft', aliases: ['마인크래프트'] },
  { canonical: 'Genshin Impact', category: 'games', severity: 'critical', owner: 'miHoYo', aliases: ['원신'] },

  // ── Tech / IT ───────────────────────────────────────────
  { canonical: 'iPhone', category: 'tech-it', severity: 'warning', owner: 'Apple', aliases: ['아이폰'] },
  { canonical: 'Android', category: 'tech-it', severity: 'info', owner: 'Google', aliases: ['안드로이드'] },
  { canonical: 'Google', category: 'tech-it', severity: 'warning', owner: 'Alphabet', aliases: ['구글'] },
  { canonical: 'Microsoft', category: 'tech-it', severity: 'warning', aliases: ['마이크로소프트', 'MS'] },
  { canonical: 'Samsung', category: 'tech-it', severity: 'warning', aliases: ['삼성', '삼성전자'] },

  // ── Luxury / Consumer ───────────────────────────────────
  { canonical: 'Rolex', category: 'luxury-consumer', severity: 'warning', aliases: ['롤렉스'] },
  { canonical: 'Gucci', category: 'luxury-consumer', severity: 'warning', aliases: ['구찌'] },
  { canonical: 'Louis Vuitton', category: 'luxury-consumer', severity: 'warning', aliases: ['루이비통', '루이 비통'] },
  { canonical: 'Porsche', category: 'luxury-consumer', severity: 'warning', aliases: ['포르쉐'] },
  { canonical: 'Ferrari', category: 'luxury-consumer', severity: 'warning', aliases: ['페라리'] },

  // ── Film / TV ───────────────────────────────────────────
  { canonical: 'Star Wars', category: 'film-tv', severity: 'critical', owner: 'Disney', aliases: ['스타워즈', '스타 워즈', '제다이'] },
  { canonical: 'Harry Potter', category: 'film-tv', severity: 'critical', owner: 'Warner Bros.', aliases: ['해리포터', '해리 포터', '호그와트'] },
  { canonical: 'Lord of the Rings', category: 'film-tv', severity: 'critical', owner: 'New Line Cinema', aliases: ['반지의 제왕', '반지의제왕', '프로도'] },
  { canonical: 'Game of Thrones', category: 'film-tv', severity: 'critical', owner: 'HBO', aliases: ['왕좌의 게임', '왕좌의게임'] },
  { canonical: 'Stranger Things', category: 'film-tv', severity: 'critical', owner: 'Netflix', aliases: ['기묘한 이야기'] },
  { canonical: 'Breaking Bad', category: 'film-tv', severity: 'critical', owner: 'AMC', aliases: ['브레이킹 배드'] },
  { canonical: 'The Witcher', category: 'film-tv', severity: 'critical', owner: 'Netflix/CD Projekt', aliases: ['위쳐', '위처', '게롤트'] },
  { canonical: 'Avengers', category: 'film-tv', severity: 'critical', owner: 'Disney/Marvel', aliases: ['어벤져스', '어벤저스'] },

  // ── JP Manga 확장 ───────────────────────────────────────
  { canonical: 'Neon Genesis Evangelion', category: 'jp-manga-anime', severity: 'critical', owner: 'Gainax/Khara', aliases: ['에반게리온', '에바'] },
  { canonical: 'Fullmetal Alchemist', category: 'jp-manga-anime', severity: 'critical', owner: 'Square Enix', aliases: ['강철의 연금술사', '강연금', '에드워드 엘릭'] },
  { canonical: 'Bleach', category: 'jp-manga-anime', severity: 'critical', owner: 'Shueisha', aliases: ['블리치'] },
  { canonical: 'Death Note', category: 'jp-manga-anime', severity: 'critical', owner: 'Shueisha', aliases: ['데스노트', '데스 노트', '야가미 라이토'] },
  { canonical: 'Code Geass', category: 'jp-manga-anime', severity: 'critical', owner: 'Sunrise', aliases: ['코드기아스', '코드 기아스', '루루슈'] },
  { canonical: 'Chainsaw Man', category: 'jp-manga-anime', severity: 'critical', owner: 'Shueisha', aliases: ['체인소맨', '체인소 맨'] },
  { canonical: 'Spy x Family', category: 'jp-manga-anime', severity: 'critical', owner: 'Shueisha', aliases: ['스파이 패밀리', '스파이패밀리'] },
  { canonical: 'Tokyo Ghoul', category: 'jp-manga-anime', severity: 'critical', owner: 'Shueisha', aliases: ['도쿄 구울', '도쿄구울'] },
  { canonical: 'Sword Art Online', category: 'jp-manga-anime', severity: 'critical', owner: 'ASCII Media Works', aliases: ['소드 아트 온라인', '소드아트온라인', 'SAO', '키리토'] },
  { canonical: 'Re:Zero', category: 'jp-manga-anime', severity: 'critical', owner: 'Kadokawa', aliases: ['리제로', '리 제로', '스바루'] },

  // ── KR 웹툰 ─────────────────────────────────────────────
  { canonical: 'Tower of God', category: 'kr-webtoon', severity: 'critical', owner: 'Naver Webtoon', aliases: ['신의 탑', '신의탑', '밤'] },
  { canonical: 'The God of High School', category: 'kr-webtoon', severity: 'critical', owner: 'Naver Webtoon', aliases: ['갓 오브 하이스쿨', '갓오브하이스쿨'] },
  { canonical: 'Noblesse', category: 'kr-webtoon', severity: 'critical', owner: 'Naver Webtoon', aliases: ['노블레스'] },
  { canonical: 'Lookism', category: 'kr-webtoon', severity: 'critical', owner: 'Naver Webtoon', aliases: ['외모지상주의'] },
  { canonical: 'True Beauty', category: 'kr-webtoon', severity: 'critical', owner: 'Naver Webtoon', aliases: ['여신강림'] },
  { canonical: 'Sweet Home', category: 'kr-webtoon', severity: 'critical', owner: 'Naver Webtoon', aliases: ['스위트 홈', '스위트홈'] },
  { canonical: 'Itaewon Class', category: 'kr-webtoon', severity: 'critical', owner: 'Kakao Webtoon', aliases: ['이태원 클라쓰', '이태원클라쓰'] },
  { canonical: 'Gosu', category: 'kr-webtoon', severity: 'critical', aliases: ['고수'] },

  // ── KR 웹소설 추가 ──────────────────────────────────────
  { canonical: 'Dungeon Defense', category: 'kr-webnovel', severity: 'critical', aliases: ['던전 디펜스', '던전디펜스'] },
  { canonical: 'I Shall Seal the Heavens', category: 'kr-webnovel', severity: 'warning', aliases: ['봉천기', '패검선종'] },
  { canonical: 'The Beginning After the End', category: 'kr-webnovel', severity: 'critical', aliases: ['끝이 아닌 시작', 'TBATE', '아서 리우드'] },
  { canonical: 'Second Life Ranker', category: 'kr-webnovel', severity: 'critical', aliases: ['랭커의 귀환', '차연우'] },

  // ── Games 확장 ──────────────────────────────────────────
  { canonical: 'Final Fantasy', category: 'games', severity: 'critical', owner: 'Square Enix', aliases: ['파이널 판타지', '파이널판타지', 'FF'] },
  { canonical: 'The Legend of Zelda', category: 'games', severity: 'critical', owner: 'Nintendo', aliases: ['젤다의 전설', '젤다'] },
  { canonical: 'Super Mario', category: 'games', severity: 'critical', owner: 'Nintendo', aliases: ['마리오', '슈퍼 마리오'] },
  { canonical: 'Elden Ring', category: 'games', severity: 'critical', owner: 'FromSoftware', aliases: ['엘든 링', '엘든링'] },
  { canonical: 'Dark Souls', category: 'games', severity: 'critical', owner: 'FromSoftware', aliases: ['다크소울', '다크 소울'] },
  { canonical: 'Overwatch', category: 'games', severity: 'critical', owner: 'Blizzard', aliases: ['오버워치'] },
  { canonical: 'FIFA', category: 'games', severity: 'warning', owner: 'EA/FIFA', aliases: ['피파'] },
  { canonical: 'Call of Duty', category: 'games', severity: 'critical', owner: 'Activision', aliases: ['콜 오브 듀티', '콜오브듀티'] },
  { canonical: "PlayerUnknown's Battlegrounds", category: 'games', severity: 'critical', owner: 'Krafton', aliases: ['배틀그라운드', '배그', 'PUBG'] },

  // ── Tech 확장 ───────────────────────────────────────────
  { canonical: 'Facebook', category: 'tech-it', severity: 'warning', owner: 'Meta', aliases: ['페이스북'] },
  { canonical: 'Instagram', category: 'tech-it', severity: 'warning', owner: 'Meta', aliases: ['인스타그램', '인스타'] },
  { canonical: 'Twitter', category: 'tech-it', severity: 'warning', aliases: ['트위터', 'X(구 트위터)'] },
  { canonical: 'TikTok', category: 'tech-it', severity: 'warning', owner: 'ByteDance', aliases: ['틱톡'] },
  { canonical: 'YouTube', category: 'tech-it', severity: 'warning', owner: 'Google', aliases: ['유튜브'] },
  { canonical: 'Netflix', category: 'tech-it', severity: 'warning', aliases: ['넷플릭스'] },
  { canonical: 'Amazon', category: 'tech-it', severity: 'warning', aliases: ['아마존'] },
  { canonical: 'Tesla', category: 'tech-it', severity: 'warning', aliases: ['테슬라'] },

  // ── Food / Beverage ─────────────────────────────────────
  { canonical: 'Starbucks', category: 'food-beverage', severity: 'warning', aliases: ['스타벅스'] },
  { canonical: 'Coca-Cola', category: 'food-beverage', severity: 'warning', aliases: ['코카콜라', '코카 콜라', '코크'] },
  { canonical: 'Pepsi', category: 'food-beverage', severity: 'warning', aliases: ['펩시'] },
  { canonical: "McDonald's", category: 'food-beverage', severity: 'warning', aliases: ['맥도날드'] },
  { canonical: 'KFC', category: 'food-beverage', severity: 'warning', aliases: ['케이에프씨'] },
  { canonical: 'Red Bull', category: 'food-beverage', severity: 'warning', aliases: ['레드불'] },

  // ── Sports / Fashion ────────────────────────────────────
  { canonical: 'Nike', category: 'sports-fashion', severity: 'warning', aliases: ['나이키'] },
  { canonical: 'Adidas', category: 'sports-fashion', severity: 'warning', aliases: ['아디다스'] },
  { canonical: 'Chanel', category: 'sports-fashion', severity: 'warning', aliases: ['샤넬'] },
  { canonical: 'Hermès', category: 'sports-fashion', severity: 'warning', aliases: ['에르메스'] },
  { canonical: 'Prada', category: 'sports-fashion', severity: 'warning', aliases: ['프라다'] },
  { canonical: 'NBA', category: 'sports-fashion', severity: 'warning', aliases: ['엔비에이'] },
  { canonical: 'Premier League', category: 'sports-fashion', severity: 'warning', aliases: ['프리미어리그', '프리미어 리그'] },

  // ── US Entertainment 추가 ──────────────────────────────
  { canonical: 'Pixar', category: 'us-entertainment', severity: 'critical', owner: 'Disney', aliases: ['픽사'] },
  { canonical: 'Wonder Woman', category: 'us-entertainment', severity: 'critical', owner: 'DC', aliases: ['원더우먼', '원더 우먼'] },
];

// ============================================================
// PART 3 — 쿼리 유틸
// ============================================================

/** 카테고리별 개수 통계 — 감사·UI용 */
export function blocklistStats(): Record<BrandCategory, number> {
  const stats = {
    'us-entertainment': 0,
    'jp-manga-anime': 0,
    'kr-webnovel': 0,
    'kr-webtoon': 0,
    'games': 0,
    'tech-it': 0,
    'luxury-consumer': 0,
    'food-beverage': 0,
    'sports-fashion': 0,
    'film-tv': 0,
  } as Record<BrandCategory, number>;
  for (const e of BRAND_BLOCKLIST) stats[e.category] += 1;
  return stats;
}

/** 심각도별 개수 */
export function blocklistSeverityStats(): Record<BrandSeverity, number> {
  const stats = { info: 0, warning: 0, critical: 0 } as Record<BrandSeverity, number>;
  for (const e of BRAND_BLOCKLIST) stats[e.severity] += 1;
  return stats;
}

// ============================================================
// PART 4 — 매칭 로직
// ============================================================

/**
 * 본문에서 브랜드·IP 매칭을 찾는다.
 *
 * 전략:
 *   - canonical + aliases 전체를 substring 매칭 (대소문자 무시)
 *   - 단어 경계 매칭은 한국어에서 무의미하므로 적용하지 않음 — 대신 최소 2자 이상 alias만 사용
 *   - 매칭 중복 방지: 동일 엔트리의 가장 먼저 발견된 표기만 기록
 *
 * 한계:
 *   - 'MS' 같은 2자 약칭은 오탐 가능성 있음 — severity: 'warning' 이하로 내려 감당
 *   - 발음 변형(띄어쓰기·하이픈 다름)은 aliases에 수동 등록해야 함
 */
export function scanTextForBrands(text: string, customBlocklist?: readonly BrandEntry[]): BrandFlag[] {
  if (!text || !text.trim()) return [];
  const blocklist = customBlocklist ?? BRAND_BLOCKLIST;
  const lowerText = text.toLowerCase();
  const flags: BrandFlag[] = [];

  for (const entry of blocklist) {
    const candidates = [entry.canonical, ...entry.aliases];
    for (const cand of candidates) {
      if (cand.length < 2) continue; // 1자 토큰 오탐 차단
      const needle = cand.toLowerCase();
      const pos = lowerText.indexOf(needle);
      if (pos !== -1) {
        flags.push({
          entry,
          matched: text.slice(pos, pos + cand.length),
          position: pos,
        });
        break; // 이 엔트리에서 1개만 기록 — 같은 브랜드 중복 배제
      }
    }
  }

  return flags;
}

/** 심각도 임계 이상 매칭만 반환 (빠른 게이트용) */
export function scanTextForBrandsAbove(text: string, minSeverity: BrandSeverity): BrandFlag[] {
  const ORDER: Record<BrandSeverity, number> = { info: 0, warning: 1, critical: 2 };
  const threshold = ORDER[minSeverity];
  return scanTextForBrands(text).filter(f => ORDER[f.entry.severity] >= threshold);
}
