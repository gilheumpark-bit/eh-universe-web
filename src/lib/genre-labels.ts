/**
 * M5 Genre Translation Layer — 4-genre label dictionary.
 *
 * 4 genres (novel / webtoon / drama / game) × 14 LabelKeys × 4 langs (ko/en/ja/zh)
 * = 224 leaf entries minimum.
 *
 * Rationale:
 *   - Novel 모드: 한국 웹소설 컨벤션 그대로 (고구마/사이다, 절단마공 등).
 *   - 다른 장르: 업계 중립어 + 한국어 원어를 괄호로 병기(originalTerm) —
 *     작가간 공용 어휘를 잃지 않으면서 직관적인 라벨 제공.
 *   - 하이브리드 한국 작가(웹툰/드라마/게임으로 겸업)가 같은 씬시트 데이터를
 *     재맥락화해 쓸 수 있게 한다.
 *
 * getGenreLabel()은 어떤 (mode, key, lang) 조합이라도 빈 문자열을 반환하지 않도록
 * novel/ko로 폴백한다. 이는 UI가 절대 undefined 라벨을 렌더하지 않도록 보장한다.
 */

// ============================================================
// PART 1 — Types
// ============================================================

export type GenreMode = 'novel' | 'webtoon' | 'drama' | 'game';

export type LabelKey =
  | 'goguma'          // 고구마 (갈등/답답함 밀도)
  | 'sahida'          // 사이다 (보상/해소)
  | 'cliffhanger'     // 절단마공 (다음화 훅)
  | 'pacing'          // 속도감
  | 'povDepth'        // 시점 깊이
  | 'tension'         // 긴장도
  | 'sceneGoal'       // 씬 목표
  | 'hookType'        // 훅 유형
  | 'foreshadow'      // 복선
  | 'payoff'          // 회수
  | 'beatStructure'   // 비트 구조
  | 'characterArc'    // 캐릭터 아크
  | 'motif'           // 모티프
  | 'stakes';         // 이해관계

export type Lang = 'ko' | 'en' | 'ja' | 'zh';

export interface GenreLabel {
  /** 사용자에게 노출되는 표시 라벨 */
  label: string;
  /** 선택적 툴팁/보조 설명 */
  hint?: string;
  /** 비-소설 모드에서 한국어 원어(고구마 등)를 괄호로 병기할 때 사용 */
  originalTerm?: string;
}

// ============================================================
// PART 2 — Novel mode (한국 웹소설 원어 그대로)
// ============================================================

const NOVEL: Record<LabelKey, Record<Lang, GenreLabel>> = {
  goguma: {
    ko: { label: '고구마', hint: '갈등·답답함의 밀도' },
    en: { label: 'Goguma', hint: 'Frustration / conflict density (KR webnovel term)' },
    ja: { label: 'ゴグマ', hint: '葛藤・もどかしさの密度(韓国ウェブ小説用語)' },
    zh: { label: '憋屈段', hint: '冲突与压抑的密度(韩国网文术语)' },
  },
  sahida: {
    ko: { label: '사이다', hint: '보상·해소의 통쾌함' },
    en: { label: 'Sahida', hint: 'Reward / catharsis release (KR webnovel term)' },
    ja: { label: 'サイダー', hint: '報酬・解消の爽快感(韓国ウェブ小説用語)' },
    zh: { label: '爽点', hint: '奖励与宣泄的爽快感(韩国网文术语)' },
  },
  cliffhanger: {
    ko: { label: '절단마공', hint: '다음 화를 끌어당기는 마지막 한 줄' },
    en: { label: 'Cliffhanger', hint: 'Next-chapter hook — the final line that pulls the reader forward' },
    ja: { label: '切断魔功', hint: '次話へ引き込む最後の一行' },
    zh: { label: '断章', hint: '牵引下一章的最后一句' },
  },
  pacing: {
    ko: { label: '속도감', hint: '문장·장면의 속도' },
    en: { label: 'Pacing', hint: 'Speed of sentences and scenes' },
    ja: { label: 'テンポ', hint: '文章とシーンの速度' },
    zh: { label: '节奏', hint: '文句与场景的速度' },
  },
  povDepth: {
    ko: { label: '시점 깊이', hint: '1인칭 내면 ↔ 3인칭 관찰자 거리' },
    en: { label: 'POV depth', hint: '1st-person interiority vs 3rd-person distance' },
    ja: { label: '視点の深さ', hint: '一人称内面と三人称観察者の距離' },
    zh: { label: '视角深度', hint: '第一人称内心与第三人称观察距离' },
  },
  tension: {
    ko: { label: '긴장도', hint: '씬 내부 대치 강도' },
    en: { label: 'Tension', hint: 'In-scene standoff intensity' },
    ja: { label: '緊張度', hint: 'シーン内対峙の強度' },
    zh: { label: '紧张度', hint: '场景内对峙强度' },
  },
  sceneGoal: {
    ko: { label: '씬 목표', hint: '이 장면이 달성해야 할 한 줄' },
    en: { label: 'Scene goal', hint: 'One-line outcome this scene must deliver' },
    ja: { label: 'シーン目標', hint: 'このシーンが果たすべき一行' },
    zh: { label: '场景目标', hint: '本场景必须达成的一句话' },
  },
  hookType: {
    ko: { label: '훅 유형', hint: '의문 / 충격 / 반전 / 위기 / 감정' },
    en: { label: 'Hook type', hint: 'Question / shock / reversal / crisis / emotion' },
    ja: { label: 'フック種別', hint: '疑問・衝撃・反転・危機・感情' },
    zh: { label: '钩子类型', hint: '疑问 / 冲击 / 反转 / 危机 / 情感' },
  },
  foreshadow: {
    ko: { label: '복선', hint: '심어두는 단서' },
    en: { label: 'Foreshadow', hint: 'Planted clue' },
    ja: { label: '伏線', hint: '仕込んでおく手がかり' },
    zh: { label: '伏笔', hint: '埋下的线索' },
  },
  payoff: {
    ko: { label: '회수', hint: '복선의 정산' },
    en: { label: 'Payoff', hint: 'Foreshadow settlement' },
    ja: { label: '回収', hint: '伏線の精算' },
    zh: { label: '回收', hint: '伏笔的兑现' },
  },
  beatStructure: {
    ko: { label: '비트 구조', hint: '3막 / 영웅여정 / 기승전결' },
    en: { label: 'Beat structure', hint: '3-act / Hero Journey / Kishotenketsu' },
    ja: { label: 'ビート構造', hint: '三幕・英雄の旅・起承転結' },
    zh: { label: '节拍结构', hint: '三幕 / 英雄旅程 / 起承转合' },
  },
  characterArc: {
    ko: { label: '캐릭터 아크', hint: '인물의 변화 곡선' },
    en: { label: 'Character arc', hint: 'Character transformation curve' },
    ja: { label: 'キャラクターアーク', hint: '人物の変化曲線' },
    zh: { label: '角色弧线', hint: '人物的变化曲线' },
  },
  motif: {
    ko: { label: '모티프', hint: '반복되는 상징/이미지' },
    en: { label: 'Motif', hint: 'Recurring symbol or image' },
    ja: { label: 'モチーフ', hint: '繰り返される象徴・イメージ' },
    zh: { label: '母题', hint: '反复出现的象征或意象' },
  },
  stakes: {
    ko: { label: '이해관계', hint: '주인공이 잃을 수 있는 것' },
    en: { label: 'Stakes', hint: 'What the protagonist stands to lose' },
    ja: { label: 'ステークス', hint: '主人公が失うかもしれないもの' },
    zh: { label: '利害', hint: '主角可能失去的东西' },
  },
};

// ============================================================
// PART 3 — Webtoon mode (컷/대사 중심 업계어 + 원어 병기)
// ============================================================

const WEBTOON: Record<LabelKey, Record<Lang, GenreLabel>> = {
  goguma: {
    ko: { label: '갈등 밀도', hint: '컷 단위 답답함 쌓기', originalTerm: '고구마' },
    en: { label: 'Conflict density', hint: 'Panel-level frustration build-up' },
    ja: { label: '葛藤密度', hint: 'コマ単位のもどかしさの蓄積' },
    zh: { label: '冲突密度', hint: '格内压抑的累积' },
  },
  sahida: {
    ko: { label: '보상 해소', hint: '컷 전환으로 터뜨리는 카타르시스', originalTerm: '사이다' },
    en: { label: 'Reward release', hint: 'Catharsis delivered via panel turn' },
    ja: { label: '報酬解消', hint: 'コマ転換で炸裂するカタルシス' },
    zh: { label: '奖励释放', hint: '通过格切换爆发的宣泄' },
  },
  cliffhanger: {
    ko: { label: '다음화 훅', hint: '마지막 컷의 인상', originalTerm: '절단마공' },
    en: { label: 'Next-chapter hook', hint: 'Impression of the final panel' },
    ja: { label: '次話フック', hint: '最終コマの印象' },
    zh: { label: '下章钩子', hint: '最后一格的印象' },
  },
  pacing: {
    ko: { label: '컷 리듬', hint: '컷 수와 스크롤 속도', originalTerm: '속도감' },
    en: { label: 'Panel rhythm', hint: 'Panel count and scroll speed' },
    ja: { label: 'コマリズム', hint: 'コマ数とスクロール速度' },
    zh: { label: '分格节奏', hint: '分格数与滚动速度' },
  },
  povDepth: {
    ko: { label: '카메라 거리', hint: '클로즈업 / 미디엄 / 롱숏', originalTerm: '시점 깊이' },
    en: { label: 'Camera distance', hint: 'Close-up / medium / long shot' },
    ja: { label: 'カメラ距離', hint: 'クローズアップ・ミディアム・ロングショット' },
    zh: { label: '镜头距离', hint: '特写 / 中景 / 远景' },
  },
  tension: {
    ko: { label: '대치 강도', hint: '프레임 안 캐릭터 충돌', originalTerm: '긴장도' },
    en: { label: 'Standoff intensity', hint: 'Character confrontation inside the frame' },
    ja: { label: '対峙の強度', hint: 'フレーム内のキャラクター衝突' },
    zh: { label: '对峙强度', hint: '画格内角色冲突' },
  },
  sceneGoal: {
    ko: { label: '씬 목표', hint: '이 화가 전달할 한 장면', originalTerm: '씬 목표' },
    en: { label: 'Scene goal', hint: 'The single beat this episode delivers' },
    ja: { label: 'シーン目標', hint: 'この回が伝える一つのビート' },
    zh: { label: '场景目标', hint: '本回要传达的一个节拍' },
  },
  hookType: {
    ko: { label: '훅 유형', hint: '스크롤 멈춤을 만드는 장치', originalTerm: '훅' },
    en: { label: 'Hook type', hint: 'Device that stops the scroll' },
    ja: { label: 'フック種別', hint: 'スクロールを止める仕掛け' },
    zh: { label: '钩子类型', hint: '让滚动停下的机关' },
  },
  foreshadow: {
    ko: { label: '복선 컷', hint: '나중에 다시 쓰일 이미지', originalTerm: '복선' },
    en: { label: 'Foreshadow panel', hint: 'Image reused later' },
    ja: { label: '伏線コマ', hint: '後で再利用されるイメージ' },
    zh: { label: '伏笔分格', hint: '之后会复用的画面' },
  },
  payoff: {
    ko: { label: '회수 연출', hint: '복선 컷의 재활용', originalTerm: '회수' },
    en: { label: 'Payoff staging', hint: 'Foreshadow panel revisited' },
    ja: { label: '回収演出', hint: '伏線コマの再利用' },
    zh: { label: '回收演出', hint: '复用伏笔分格' },
  },
  beatStructure: {
    ko: { label: '화 구조', hint: '4-6컷 블록 단위', originalTerm: '비트 구조' },
    en: { label: 'Episode structure', hint: '4-6 panel block unit' },
    ja: { label: '話構造', hint: '4-6コマブロック単位' },
    zh: { label: '回章结构', hint: '4-6 格区块单位' },
  },
  characterArc: {
    ko: { label: '캐릭터 아크', hint: '화 단위 변화', originalTerm: '캐릭터 아크' },
    en: { label: 'Character arc', hint: 'Episode-level change' },
    ja: { label: 'キャラクターアーク', hint: '話単位の変化' },
    zh: { label: '角色弧线', hint: '回章级变化' },
  },
  motif: {
    ko: { label: '시각 모티프', hint: '반복 이미지/색상', originalTerm: '모티프' },
    en: { label: 'Visual motif', hint: 'Recurring image or color' },
    ja: { label: 'ビジュアルモチーフ', hint: '繰り返すイメージ・色' },
    zh: { label: '视觉母题', hint: '反复出现的意象或色彩' },
  },
  stakes: {
    ko: { label: '이해관계', hint: '화가 끝날 때 위험한 것', originalTerm: '이해관계' },
    en: { label: 'Stakes', hint: 'What is at risk by episode end' },
    ja: { label: 'ステークス', hint: '話終了時に危険なもの' },
    zh: { label: '利害', hint: '回章结尾时岌岌可危之物' },
  },
};

// ============================================================
// PART 4 — Drama mode (시나리오/대본 업계어 + 원어 병기)
// ============================================================

const DRAMA: Record<LabelKey, Record<Lang, GenreLabel>> = {
  goguma: {
    ko: { label: '갈등 밀도', hint: '씬 단위 긴장 누적', originalTerm: '고구마' },
    en: { label: 'Conflict density', hint: 'Tension accumulation per scene' },
    ja: { label: '葛藤密度', hint: 'シーン単位の緊張蓄積' },
    zh: { label: '冲突密度', hint: '场景级紧张累积' },
  },
  sahida: {
    ko: { label: '턴오버 순간', hint: '3막/중간점 전환의 해소', originalTerm: '사이다' },
    en: { label: 'Turnover moment', hint: 'Midpoint/Act-break release' },
    ja: { label: 'ターンオーバー', hint: '中間点・幕切れの解消' },
    zh: { label: '转折时刻', hint: '中点 / 幕间的释放' },
  },
  cliffhanger: {
    ko: { label: '엔딩 테이크', hint: '다음 회차 유인 컷', originalTerm: '절단마공' },
    en: { label: 'End take', hint: 'Hook cut pulling next episode' },
    ja: { label: 'エンディングテイク', hint: '次回へ引くカット' },
    zh: { label: '结尾镜头', hint: '带入下集的镜头' },
  },
  pacing: {
    ko: { label: '막 리듬', hint: '막 사이 템포', originalTerm: '속도감' },
    en: { label: 'Act rhythm', hint: 'Tempo between acts' },
    ja: { label: '幕リズム', hint: '幕間のテンポ' },
    zh: { label: '幕节奏', hint: '幕与幕间的节拍' },
  },
  povDepth: {
    ko: { label: '카메라 거리', hint: '미디엄샷 기준 클로즈/롱', originalTerm: '시점 깊이' },
    en: { label: 'Camera distance', hint: 'Close/long relative to medium shot' },
    ja: { label: 'カメラ距離', hint: 'ミディアムショット基準の寄り・引き' },
    zh: { label: '镜头距离', hint: '以中景为基准的推拉' },
  },
  tension: {
    ko: { label: '대치 강도', hint: '씬 내 갈등 수위', originalTerm: '긴장도' },
    en: { label: 'Standoff intensity', hint: 'Conflict level within a scene' },
    ja: { label: '対峙の強度', hint: 'シーン内の葛藤水準' },
    zh: { label: '对峙强度', hint: '场景内冲突水位' },
  },
  sceneGoal: {
    ko: { label: '씬 목표', hint: '이 씬이 도달할 한 줄', originalTerm: '씬 목표' },
    en: { label: 'Scene goal', hint: 'The single beat this scene reaches' },
    ja: { label: 'シーン目標', hint: 'このシーンが届けるビート' },
    zh: { label: '场景目标', hint: '本场抵达的一句话' },
  },
  hookType: {
    ko: { label: '훅 유형', hint: '콜드오픈/미드포인트/테그', originalTerm: '훅' },
    en: { label: 'Hook type', hint: 'Cold open / midpoint / tag' },
    ja: { label: 'フック種別', hint: 'コールドオープン・中間点・タグ' },
    zh: { label: '钩子类型', hint: '冷开场 / 中点 / 标签' },
  },
  foreshadow: {
    ko: { label: '복선', hint: '후속 회차 장치', originalTerm: '복선' },
    en: { label: 'Foreshadow', hint: 'Device seeded for later episode' },
    ja: { label: '伏線', hint: '後続回のための仕掛け' },
    zh: { label: '伏笔', hint: '为后续集埋下的装置' },
  },
  payoff: {
    ko: { label: '회수', hint: '클라이맥스의 정산', originalTerm: '회수' },
    en: { label: 'Payoff', hint: 'Climactic settlement' },
    ja: { label: '回収', hint: 'クライマックスの精算' },
    zh: { label: '回收', hint: '高潮的结算' },
  },
  beatStructure: {
    ko: { label: '시퀀스 구조', hint: '5-8 시퀀스 단위', originalTerm: '비트 구조' },
    en: { label: 'Sequence structure', hint: '5-8 sequence unit' },
    ja: { label: 'シーケンス構造', hint: '5-8 シーケンス単位' },
    zh: { label: '段落结构', hint: '5-8 段落单位' },
  },
  characterArc: {
    ko: { label: '캐릭터 아크', hint: '회차 누적 변화', originalTerm: '캐릭터 아크' },
    en: { label: 'Character arc', hint: 'Change accumulated across episodes' },
    ja: { label: 'キャラクターアーク', hint: '回次累積の変化' },
    zh: { label: '角色弧线', hint: '跨集累积的变化' },
  },
  motif: {
    ko: { label: '비주얼 모티프', hint: '반복 샷/음향', originalTerm: '모티프' },
    en: { label: 'Visual motif', hint: 'Recurring shot or sound' },
    ja: { label: 'ビジュアルモチーフ', hint: '繰り返すショット・音響' },
    zh: { label: '视觉母题', hint: '反复的镜头或声响' },
  },
  stakes: {
    ko: { label: '드라마틱 이해관계', hint: '씬 종료 시 위험한 것', originalTerm: '이해관계' },
    en: { label: 'Dramatic stakes', hint: 'What is at risk by scene end' },
    ja: { label: 'ドラマティック・ステークス', hint: 'シーン終了時に危険なもの' },
    zh: { label: '戏剧利害', hint: '场景结尾岌岌可危之物' },
  },
};

// ============================================================
// PART 5 — Game mode (게임 시나리오/선택지 업계어 + 원어 병기)
// ============================================================

const GAME: Record<LabelKey, Record<Lang, GenreLabel>> = {
  goguma: {
    ko: { label: '마찰 구간', hint: '플레이어 저항의 계획된 밀도', originalTerm: '고구마' },
    en: { label: 'Friction block', hint: 'Planned density of player resistance' },
    ja: { label: '摩擦区間', hint: 'プレイヤー抵抗の計画密度' },
    zh: { label: '摩擦区段', hint: '玩家阻力的计划密度' },
  },
  sahida: {
    ko: { label: '보상 스파이크', hint: '해소형 리워드 타이밍', originalTerm: '사이다' },
    en: { label: 'Reward spike', hint: 'Cathartic reward timing' },
    ja: { label: '報酬スパイク', hint: '解消型リワードのタイミング' },
    zh: { label: '奖励尖峰', hint: '宣泄型奖励的时机' },
  },
  cliffhanger: {
    ko: { label: '루프 훅', hint: '다음 세션 복귀 트리거', originalTerm: '절단마공' },
    en: { label: 'Loop hook', hint: 'Trigger for next session return' },
    ja: { label: 'ループフック', hint: '次セッション復帰のトリガー' },
    zh: { label: '循环钩', hint: '回到下一次会话的触发' },
  },
  pacing: {
    ko: { label: '세션 템포', hint: '플레이 세션 단위 속도', originalTerm: '속도감' },
    en: { label: 'Session tempo', hint: 'Speed per play session' },
    ja: { label: 'セッションテンポ', hint: 'プレイセッション単位の速度' },
    zh: { label: '会话节奏', hint: '游玩会话级速度' },
  },
  povDepth: {
    ko: { label: '카메라 모드', hint: '1인칭 / 3인칭 / 탑다운', originalTerm: '시점 깊이' },
    en: { label: 'Camera mode', hint: '1st-person / 3rd-person / top-down' },
    ja: { label: 'カメラモード', hint: '一人称・三人称・トップダウン' },
    zh: { label: '镜头模式', hint: '第一人称 / 第三人称 / 俯视' },
  },
  tension: {
    ko: { label: '대치 강도', hint: '인카운터 난이도 곡선', originalTerm: '긴장도' },
    en: { label: 'Standoff intensity', hint: 'Encounter difficulty curve' },
    ja: { label: '対峙の強度', hint: 'エンカウンター難易度曲線' },
    zh: { label: '对峙强度', hint: '遭遇战难度曲线' },
  },
  sceneGoal: {
    ko: { label: '퀘스트 목표', hint: '이 장면의 완료 조건', originalTerm: '씬 목표' },
    en: { label: 'Quest goal', hint: 'Completion condition of this scene' },
    ja: { label: 'クエスト目標', hint: 'このシーンの完了条件' },
    zh: { label: '任务目标', hint: '本场景的完成条件' },
  },
  hookType: {
    ko: { label: '훅 유형', hint: '선택지 / 이벤트 / 컷씬', originalTerm: '훅' },
    en: { label: 'Hook type', hint: 'Choice / event / cutscene' },
    ja: { label: 'フック種別', hint: '選択肢・イベント・カットシーン' },
    zh: { label: '钩子类型', hint: '选项 / 事件 / 过场' },
  },
  foreshadow: {
    ko: { label: '플래그 심기', hint: '후반 분기 조건 설정', originalTerm: '복선' },
    en: { label: 'Flag planting', hint: 'Setting up late-branch conditions' },
    ja: { label: 'フラグ設置', hint: '後半分岐の条件設定' },
    zh: { label: '插旗', hint: '后期分支的条件设置' },
  },
  payoff: {
    ko: { label: '플래그 회수', hint: '조건 분기 해제', originalTerm: '회수' },
    en: { label: 'Flag payoff', hint: 'Branch condition released' },
    ja: { label: 'フラグ回収', hint: '条件分岐の解放' },
    zh: { label: '旗标回收', hint: '条件分支解除' },
  },
  beatStructure: {
    ko: { label: '루프 구조', hint: '도입 → 상승 → 보스 → 보상', originalTerm: '비트 구조' },
    en: { label: 'Loop structure', hint: 'Intro → rise → boss → reward' },
    ja: { label: 'ループ構造', hint: '導入・上昇・ボス・報酬' },
    zh: { label: '循环结构', hint: '引入 → 上升 → Boss → 奖励' },
  },
  characterArc: {
    ko: { label: '캐릭터 성장', hint: '플레이어 스탯+서사 동기화', originalTerm: '캐릭터 아크' },
    en: { label: 'Character growth', hint: 'Player stats + narrative sync' },
    ja: { label: 'キャラクター成長', hint: 'プレイヤーステータスと物語の同期' },
    zh: { label: '角色成长', hint: '玩家属性与叙事同步' },
  },
  motif: {
    ko: { label: '비주얼 테마', hint: '반복 UI/환경 모티프', originalTerm: '모티프' },
    en: { label: 'Visual theme', hint: 'Recurring UI / environment motif' },
    ja: { label: 'ビジュアルテーマ', hint: '繰り返す UI・環境モチーフ' },
    zh: { label: '视觉主题', hint: '反复的 UI / 环境母题' },
  },
  stakes: {
    ko: { label: '리스크', hint: '실패 시 잃는 것', originalTerm: '이해관계' },
    en: { label: 'Risk', hint: 'What is lost on failure' },
    ja: { label: 'リスク', hint: '失敗時に失うもの' },
    zh: { label: '风险', hint: '失败时失去之物' },
  },
};

// ============================================================
// PART 6 — Aggregate dictionary + lookup helpers
// ============================================================

export const GENRE_LABELS: Record<GenreMode, Record<LabelKey, Record<Lang, GenreLabel>>> = {
  novel: NOVEL,
  webtoon: WEBTOON,
  drama: DRAMA,
  game: GAME,
};

const FALLBACK_MODE: GenreMode = 'novel';
const FALLBACK_LANG: Lang = 'ko';
const FALLBACK_ENTRY: GenreLabel = { label: '' };

/**
 * 장르 라벨 조회. (mode, key, lang)이 하나라도 누락/유효하지 않으면
 * novel/ko/동일키로 폴백한다. UI가 undefined 라벨을 렌더하는 사태를 방지.
 *
 * @example
 *   const entry = getGenreLabel('webtoon', 'goguma', 'ko');
 *   // { label: '갈등 밀도', hint: '...', originalTerm: '고구마' }
 */
export function getGenreLabel(mode: GenreMode, key: LabelKey, lang: Lang): GenreLabel {
  const byMode = GENRE_LABELS[mode] ?? GENRE_LABELS[FALLBACK_MODE];
  const byKey = byMode[key];
  if (!byKey) {
    const fallbackKey = GENRE_LABELS[FALLBACK_MODE][key];
    if (!fallbackKey) return FALLBACK_ENTRY;
    return fallbackKey[lang] ?? fallbackKey[FALLBACK_LANG] ?? FALLBACK_ENTRY;
  }
  return byKey[lang] ?? byKey[FALLBACK_LANG] ?? FALLBACK_ENTRY;
}

/**
 * 라벨 포매터. 장르가 novel이 아니고 lang이 ko이며 originalTerm이 있으면
 * `${label} (${originalTerm})` 형태로 한국어 원어를 병기한다.
 * 그 외 언어/장르에서는 순수 label만 반환한다.
 *
 * @example
 *   formatLabel(getGenreLabel('webtoon', 'goguma', 'ko'), 'ko')
 *   // → '갈등 밀도 (고구마)'
 *   formatLabel(getGenreLabel('webtoon', 'goguma', 'en'), 'en')
 *   // → 'Conflict density'
 */
export function formatLabel(entry: GenreLabel, lang: Lang): string {
  if (lang === 'ko' && entry.originalTerm && entry.originalTerm !== entry.label) {
    return `${entry.label} (${entry.originalTerm})`;
  }
  return entry.label;
}
