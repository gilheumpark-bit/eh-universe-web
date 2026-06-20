// ============================================================
// Jurisdiction Form Pack — 국가·언어별 체크리스트/양식 기준
// ============================================================
//
// 역할:
//   - UI 번역이 아니라, 출고 국가/언어권별로 어떤 기록·양식·자산화 항목을
//     준비해야 하는지 정의한다.
//   - 법률 적합 판정이 아니라 제출 전 확인/보완 항목을 구조화한다.
//   - 출고 패키지, 확인서, IP Pack, 번역 sign-off가 같은 기준을 공유하게 한다.
// ============================================================

import { field, form, lt, section } from './jurisdiction-form-pack.builders';
import { COUNTRY_EXTRA_SECTIONS } from './jurisdiction-form-pack.extras';
import type { CertificateLanguage } from './types';

export type JurisdictionId = 'GLOBAL' | 'KR' | 'US' | 'EU' | 'UK' | 'AU' | 'JP' | 'CN' | 'TW';

export type LocalePackId =
  | 'global'
  | 'ko-KR'
  | 'en-US'
  | 'en-EU'
  | 'en-GB'
  | 'en-AU'
  | 'ja-JP'
  | 'zh-CN'
  | 'zh-TW';

export type ReleaseFormId =
  | 'project-intake'
  | 'creative-process'
  | 'rights-asset'
  | 'source-reference'
  | 'translation-localization'
  | 'release-package';

export type FieldKind = 'text' | 'textarea' | 'select' | 'multi-select' | 'boolean' | 'date' | 'file-list';

export interface LocalizedText {
  ko: string;
  en: string;
  ja: string;
  zh: string;
}

export interface FormFieldDefinition {
  id: string;
  label: LocalizedText;
  kind: FieldKind;
  required: boolean;
  help: LocalizedText;
  evidenceKey: string;
}

export interface FormSectionDefinition {
  id: string;
  title: LocalizedText;
  fields: readonly FormFieldDefinition[];
}

export interface ReleaseFormDefinition {
  id: ReleaseFormId;
  title: LocalizedText;
  purpose: LocalizedText;
  sections: readonly FormSectionDefinition[];
}

export interface SourceReference {
  title: string;
  url: string;
  checkedAt: string;
}

export interface JurisdictionFormPack {
  id: LocalePackId;
  jurisdiction: JurisdictionId;
  language: CertificateLanguage;
  label: LocalizedText;
  limitation: LocalizedText;
  sourceReferences: readonly SourceReference[];
  forms: readonly ReleaseFormDefinition[];
}

export interface FormCompletionResult {
  formId: ReleaseFormId;
  requiredTotal: number;
  requiredPresent: number;
  missingRequiredFieldIds: string[];
}

const CHECKED_AT = '2026-06-15';

const BASE_FORMS: Readonly<Record<ReleaseFormId, ReleaseFormDefinition>> = Object.freeze({
  'project-intake': form(
    'project-intake',
    lt('프로젝트 접수', 'Project Intake', 'プロジェクト受付', '项目登记'),
    lt(
      '작품을 만들기 전 제목, 작가, 언어, 출고 방향을 고정합니다.',
      'Fix title, author, language, and release intent before production.',
      '制作前に題名、作者、言語、出稿方針を固定します。',
      '在制作前固定作品名、作者、语言和交付方向。',
    ),
    [
      section(
        'identity',
        lt('작품 식별', 'Work Identity', '作品識別', '作品识别'),
        [
          field(
            'work-title',
            lt('작품명', 'Work title', '作品タイトル', '作品标题'),
            'text',
            true,
            lt('미정이면 임시 제목과 변경 이력을 남깁니다.', 'Use a working title and keep rename history if not final.', '未定の場合は仮題と変更履歴を残します。', '未定时使用暂定标题并保留改名记录。'),
          ),
          field(
            'author-display-name',
            lt('작가 표시명', 'Author display name', '作者表示名', '作者显示名'),
            'text',
            true,
            lt('출고 문서와 확인서에 들어갈 이름입니다.', 'Name shown in release records and the journal.', '出稿記録と確認書に表示する名前です。', '用于交付记录和过程确认书的名称。'),
          ),
          field(
            'primary-language',
            lt('원문 언어', 'Source language', '原文言語', '源语言'),
            'select',
            true,
            lt('글자/단어 수, 폰트, 현지화 기준의 기본값이 됩니다.', 'Sets defaults for unit counting, typography, and localization.', '文字/単語数、書体、ローカライズ基準の初期値になります。', '作为字数/词数、字体、本地化规则的默认值。'),
          ),
          field(
            'target-market',
            lt('출고 국가/언어권', 'Target market/jurisdiction', '出稿先の国・言語圏', '目标市场/司法辖区'),
            'select',
            true,
            lt('국가별 양식 팩을 선택하는 기준입니다.', 'Selects the jurisdiction form pack.', '国別フォームパックを選ぶ基準です。', '用于选择国家/语言表单包。'),
          ),
        ],
      ),
      section(
        'release-intent',
        lt('출고 목적', 'Release Intent', '出稿目的', '交付目的'),
        [
          field(
            'release-channel',
            lt('출고 채널', 'Release channel', '出稿チャネル', '交付渠道'),
            'multi-select',
            true,
            lt('플랫폼 게시, 출판사 제출, 개인 보관, 해외 피칭을 분리합니다.', 'Separate platform upload, publisher submission, private records, and overseas pitch.', 'プラットフォーム投稿、出版社提出、個人保管、海外提案を分けます。', '区分平台发布、出版社提交、个人存档和海外提案。'),
          ),
          field(
            'author-final-decision',
            lt('최종 결정자', 'Final decision maker', '最終決定者', '最终决策人'),
            'text',
            true,
            lt('작가 본인, 공동작가, 편집자 승인 범위를 적습니다.', 'Record author, co-author, or editor approval scope.', '作者本人、共同作者、編集者の承認範囲を記録します。', '记录作者、共同作者或编辑的批准范围。'),
          ),
        ],
      ),
    ],
  ),
  'creative-process': form(
    'creative-process',
    lt('과정기록 양식', 'Creative Process Record', '制作過程記録', '创作过程记录'),
    lt(
      '누가 무엇을 지시·수정·채택·보류했는지 남깁니다.',
      'Record who directed, revised, accepted, or held each material decision.',
      '誰が何を指示・修正・採用・保留したかを残します。',
      '记录谁指示、修改、采纳或搁置了哪些关键决定。',
    ),
    [
      section(
        'decision-log',
        lt('결정 로그', 'Decision Log', '決定ログ', '决策日志'),
        [
          field(
            'human-decisions',
            lt('작가 결정 항목', 'Author decisions', '作者決定項目', '作者决策项'),
            'textarea',
            true,
            lt('세계관, 캐릭터, 결말, 톤 등 작가가 잡은 결정을 기록합니다.', 'Record author-held decisions such as world, character, ending, and tone.', '世界観、人物、結末、トーンなど作者が決めた項目を記録します。', '记录世界观、人物、结局、语气等由作者决定的事项。'),
          ),
          field(
            'noa-involvement-scope',
            lt('노아 개입 범위', 'Noa involvement scope', 'ノア関与範囲', '诺亚参与范围'),
            'textarea',
            true,
            lt('초안, 다듬기, 후보 제안, 오타 점검처럼 도구가 맡은 범위를 씁니다.', 'Describe tool support such as drafting, polishing, suggestions, or typo checks.', '草案、整文、候補提案、誤字確認など道具が担った範囲を書きます。', '说明工具参与的范围，如草稿、润色、建议或错字检查。'),
          ),
          field(
            'accepted-suggestions',
            lt('채택한 제안', 'Accepted suggestions', '採用した提案', '已采纳建议'),
            'file-list',
            true,
            lt('채택 시각, 변경 전후 해시, 작가 승인 메모를 연결합니다.', 'Link accepted time, before/after hashes, and author approval note.', '採用時刻、変更前後ハッシュ、作者承認メモを紐づけます。', '关联采纳时间、修改前后哈希和作者批准说明。'),
          ),
          field(
            'held-or-rejected-suggestions',
            lt('보류·미채택 제안', 'Held or not-adopted suggestions', '保留・未採用提案', '搁置或未采纳建议'),
            'file-list',
            false,
            lt('무엇을 쓰지 않았는지도 과정기록의 신뢰를 높입니다.', 'Recording what was not used improves process clarity.', '使わなかったものも過程記録の明確さを高めます。', '记录未使用内容可提高过程清晰度。'),
          ),
        ],
      ),
      section(
        'continuity',
        lt('이력 보존', 'History Preservation', '履歴保存', '历史保存'),
        [
          field(
            'revision-log',
            lt('수정 이력', 'Revision log', '修正履歴', '修改记录'),
            'file-list',
            true,
            lt('퇴고, 리웍, 구조 변경의 이유를 기록합니다.', 'Record reasons for revision, rework, and structural changes.', '推敲、リワーク、構造変更の理由を記録します。', '记录修订、重写和结构变化的原因。'),
          ),
          field(
            'work-note-index',
            lt('작업노트 색인', 'Work note index', '作業ノート索引', '工作笔记索引'),
            'file-list',
            true,
            lt('새 채팅은 숨은 기억이 아니라 저장된 작업노트에서 이어집니다.', 'New sessions continue from stored work notes, not hidden memory.', '新規セッションは隠れた記憶ではなく保存済み作業ノートから続きます。', '新会话从已保存的工作笔记继续，而非隐藏记忆。'),
          ),
          field(
            'hash-chain',
            lt('해시 체인', 'Hash chain', 'ハッシュチェーン', '哈希链'),
            'boolean',
            true,
            lt('이벤트 순서와 변경 여부를 확인하기 위한 기술 기록입니다.', 'Technical record for event order and change detection.', 'イベント順序と変更有無を確認する技術記録です。', '用于确认事件顺序和变更情况的技术记录。'),
          ),
        ],
      ),
    ],
  ),
  'rights-asset': form(
    'rights-asset',
    lt('권리/IP 자산화 양식', 'Rights/IP Asset Form', '権利/IP資産化フォーム', '权利/IP资产化表'),
    lt(
      '작품을 파일이 아니라 라이선스·피칭 가능한 자산 단위로 정리합니다.',
      'Organize the work as licensable and pitch-ready assets, not just files.',
      '作品を単なるファイルではなく、ライセンス・提案可能な資産単位で整理します。',
      '将作品整理为可授权、可提案的资产，而不只是文件。',
    ),
    [
      section(
        'rights-chain',
        lt('권리 귀속', 'Rights Chain', '権利帰属', '权利归属'),
        [
          field(
            'author-ownership',
            lt('원저작자/권리자', 'Original author/right holder', '原作者・権利者', '原作者/权利人'),
            'text',
            true,
            lt('작가, 공동작가, 법인 소유 여부를 구분합니다.', 'Separate author, co-author, and entity ownership.', '作者、共同作者、法人所有を分けます。', '区分作者、共同作者和法人所有。'),
          ),
          field(
            'coauthor-split',
            lt('공동작업 지분/역할', 'Co-author share/role', '共同作業の持分・役割', '共同创作份额/角色'),
            'textarea',
            false,
            lt('공동저작, 편집, 번역, 삽화 기여를 분리합니다.', 'Separate co-writing, editing, translation, and illustration contributions.', '共同著作、編集、翻訳、挿絵の貢献を分けます。', '区分合著、编辑、翻译和插画贡献。'),
          ),
          field(
            'external-materials',
            lt('외부 자료 사용', 'External materials used', '外部資料利用', '外部材料使用'),
            'file-list',
            true,
            lt('문서, 이미지, 웹 클립, 협업자 텍스트의 출처와 사용 범위를 기록합니다.', 'Record source and usage scope for docs, images, web clips, and collaborator text.', '文書、画像、Webクリップ、協力者テキストの出典と利用範囲を記録します。', '记录文档、图片、网页剪辑和协作者文本的来源与使用范围。'),
          ),
          field(
            'license-notes',
            lt('사용권 메모', 'License/permission notes', '利用許諾メモ', '许可/授权说明'),
            'textarea',
            true,
            lt('독점/비독점, 기간, 지역, 2차 이용 범위를 적습니다.', 'Record exclusivity, term, territory, and derivative-use scope.', '独占/非独占、期間、地域、二次利用範囲を記録します。', '记录独占/非独占、期限、地域和衍生使用范围。'),
          ),
        ],
      ),
      section(
        'asset-package',
        lt('자산 패키지', 'Asset Package', '資産パッケージ', '资产包'),
        [
          field(
            'character-world-bible',
            lt('세계관·캐릭터 바이블', 'World/character bible', '世界観・キャラクターバイブル', '世界观/角色圣经'),
            'file-list',
            true,
            lt('설정집, 캐릭터, 아이템, 용어집을 출고 단위로 묶습니다.', 'Bundle settings, characters, items, and glossary as release assets.', '設定集、キャラクター、アイテム、用語集を出稿単位でまとめます。', '将设定集、角色、物品和术语表打包为交付资产。'),
          ),
          field(
            'derivative-rights',
            lt('2차 이용 범위', 'Derivative-use scope', '二次利用範囲', '衍生使用范围'),
            'multi-select',
            true,
            lt('출판, 영상화, 웹툰화, 게임화, 굿즈, 해외판을 분리합니다.', 'Separate publishing, screen, webtoon, game, merchandise, and overseas use.', '出版、映像化、ウェブトゥーン化、ゲーム化、商品化、海外版を分けます。', '区分出版、影视化、漫画化、游戏化、商品和海外版。'),
          ),
          field(
            'trademark-title-check',
            lt('제목·상표 위험 점검', 'Title/trademark risk check', '題名・商標リスク確認', '标题/商标风险检查'),
            'boolean',
            false,
            lt('서비스명·작품명·캐릭터명은 출시 전 별도 검색이 필요합니다.', 'Names should be searched separately before launch.', 'サービス名・作品名・キャラクター名は公開前に別途検索が必要です。', '服务名、作品名和角色名上线前需要单独检索。'),
          ),
        ],
      ),
    ],
  ),
  'source-reference': form(
    'source-reference',
    lt('원자료·참조 양식', 'Source/Reference Form', '原資料・参照フォーム', '原始资料/参考表'),
    lt(
      '사용자가 제공한 자료를 실제로 읽고 분류했는지 남깁니다.',
      'Record whether user-provided materials were actually read and classified.',
      '提供資料を実際に読み分類したかを残します。',
      '记录用户提供材料是否已实际读取并分类。',
    ),
    [
      section(
        'source-inventory',
        lt('자료 목록', 'Source Inventory', '資料一覧', '资料清单'),
        [
          field(
            'source-inventory',
            lt('자료 인벤토리', 'Source inventory', '資料インベントリ', '资料清单'),
            'file-list',
            true,
            lt('파일명, URL, 해시, 공개 범위를 남깁니다.', 'Keep filename, URL, hash, and visibility.', 'ファイル名、URL、ハッシュ、公開範囲を残します。', '保留文件名、URL、哈希和可见范围。'),
          ),
          field(
            'read-evidence',
            lt('읽은 범위', 'Read scope', '読了範囲', '读取范围'),
            'textarea',
            true,
            lt('읽은 페이지/섹션/문자 수와 미확인 범위를 분리합니다.', 'Separate read pages/sections/chars and unread ranges.', '読んだページ/節/文字数と未確認範囲を分けます。', '区分已读页/章节/字数和未确认范围。'),
          ),
          field(
            'classification-result',
            lt('분류 결과', 'Classification result', '分類結果', '分类结果'),
            'multi-select',
            true,
            lt('세계관, 캐릭터, 아이템, 시나리오, 씬, 권리 메모, 미분류로 나눕니다.', 'Classify into world, character, item, scenario, scene, rights memo, or unclassified.', '世界観、人物、アイテム、シナリオ、シーン、権利メモ、未分類に分けます。', '分为世界观、角色、物品、剧情、场景、权利备注或未分类。'),
          ),
        ],
      ),
    ],
  ),
  'translation-localization': form(
    'translation-localization',
    lt('번역·현지화 검수 양식', 'Translation/Localization Sign-off', '翻訳・ローカライズ確認フォーム', '翻译/本地化确认表'),
    lt(
      '원문 밀착 보관본과 시장 출고본을 분리해 작가 승인을 남깁니다.',
      'Separate faithful records and market release tracks with author sign-off.',
      '忠実保存版と市場出稿版を分けて作者承認を残します。',
      '区分忠实存档版和市场发布版，并记录作者确认。',
    ),
    [
      section(
        'translation-track',
        lt('번역 트랙', 'Translation Track', '翻訳トラック', '翻译轨道'),
        [
          field(
            'source-target-language',
            lt('원문/목표 언어', 'Source/target language', '原文/対象言語', '源语言/目标语言'),
            'text',
            true,
            lt('예: ko-KR → en-US, ko-KR → ja-JP.', 'Example: ko-KR to en-US, ko-KR to ja-JP.', '例: ko-KR → en-US, ko-KR → ja-JP。', '例如：ko-KR → en-US, ko-KR → ja-JP。'),
          ),
          field(
            'faithful-market-track',
            lt('보관본/출고본 분리', 'Faithful/market track split', '保存版/出稿版の分離', '存档版/市场版分离'),
            'boolean',
            true,
            lt('원문 보존용과 독자 현지화용을 섞지 않습니다.', 'Do not mix source-faithful and reader-localized outputs.', '原文保存用と読者向けローカライズ用を混ぜません。', '不要混合忠实原文版和读者本地化版。'),
          ),
          field(
            'glossary-lock',
            lt('용어·호칭 고정', 'Glossary/name lock', '用語・呼称固定', '术语/称呼锁定'),
            'file-list',
            true,
            lt('인명, 지명, 기술명, 호칭, 말투를 고정합니다.', 'Lock names, places, terms, honorifics, and voice.', '人名、地名、技術名、呼称、口調を固定します。', '锁定人名、地名、术语、称呼和语气。'),
          ),
          field(
            'author-signoff',
            lt('작가 승인', 'Author sign-off', '作者承認', '作者确认'),
            'boolean',
            true,
            lt('기계 점검과 별도로 작가가 최종 판단합니다.', 'Author makes final judgment separately from machine checks.', '機械確認とは別に作者が最終判断します。', '机器检查之外由作者作最终判断。'),
          ),
        ],
      ),
      section(
        'overseas-release-review',
        lt('해외 출고 검토', 'Overseas Release Review', '海外出稿確認', '海外交付检查'),
        [
          field(
            'source-preservation-copy',
            lt('원문 보존안', 'Source-preservation copy', '原文保存案', '原文保留稿'),
            'file-list',
            true,
            lt('대상 언어를 몰라도 누락 여부를 비교할 수 있게 원문 구조를 보존한 판본을 남깁니다.', 'Keep a structure-preserving version so missing content can be checked even when the author does not read the target language.', '対象言語が読めなくても欠落を比較できるよう原文構造を保った版を残します。', '保留源文结构版本，使作者不懂目标语言也能检查遗漏。'),
          ),
          field(
            'market-release-copy',
            lt('시장판', 'Market release copy', '市場版', '市场版'),
            'file-list',
            true,
            lt('현지 독자가 자연스럽게 읽는 출고용 판본입니다. 원문 보존안과 섞지 않습니다.', 'Release copy optimized for native readers. Do not mix it with the source-preservation copy.', '現地読者が自然に読める出稿版です。原文保存案と混ぜません。', '面向本地读者的发布版本，不与原文保留稿混用。'),
          ),
          field(
            'back-translation-summary-ko',
            lt('역번역 한국어 요약', 'Korean back-translation summary', '逆翻訳の韓国語要約', '回译韩语摘要'),
            'textarea',
            true,
            lt('작가가 대상 언어를 몰라도 의미 변화와 누락을 판단할 수 있게 한국어 요약을 붙입니다.', 'Attach a Korean summary of the back-translation so the author can judge meaning shifts and omissions.', '作者が対象言語を読めなくても意味変化と欠落を判断できるよう韓国語要約を添えます。', '附上回译的韩语摘要，让作者不懂目标语言也能判断意义变化和遗漏。'),
          ),
          field(
            'cultural-risk-summary-ko',
            lt('문화 리스크 한국어 요약', 'Korean cultural-risk summary', '文化リスクの韓国語要約', '文化风险韩语摘要'),
            'textarea',
            true,
            lt('호칭, 금기, 차별 표현, 현지 플랫폼 민감 요소를 한국어로 요약합니다.', 'Summarize honorifics, taboos, discriminatory wording, and platform-sensitive issues in Korean.', '呼称、禁忌、差別表現、現地プラットフォームの注意要素を韓国語で要約します。', '用韩语概述称呼、禁忌、歧视性表达和当地平台敏感因素。'),
          ),
          field(
            'localization-decision-log',
            lt('현지화 결정 로그', 'Localization decision log', 'ローカライズ決定ログ', '本地化决策记录'),
            'file-list',
            true,
            lt('이름, 호칭, 농담, 단위, 문화 요소를 바꾼 이유와 작가 승인 여부를 남깁니다.', 'Record why names, honorifics, jokes, units, and cultural elements changed and whether the author approved them.', '名前、呼称、冗談、単位、文化要素を変えた理由と作者承認の有無を残します。', '记录姓名、称呼、笑点、单位和文化元素变更原因及作者是否批准。'),
          ),
        ],
      ),
    ],
  ),
  'release-package': form(
    'release-package',
    lt('출고 패키지 양식', 'Release Package Form', '出稿パッケージフォーム', '交付包表'),
    lt(
      '원고만이 아니라 확인서, 출처, 권리/IP, 현지화 기록을 묶습니다.',
      'Bundle manuscript, journal, sources, rights/IP, and localization records.',
      '原稿だけでなく確認書、出典、権利/IP、ローカライズ記録をまとめます。',
      '不仅打包稿件，也打包过程记录、来源、权利/IP和本地化记录。',
    ),
    [
      section(
        'package-contents',
        lt('포함 파일', 'Package Contents', '含まれるファイル', '包含文件'),
        [
          field(
            'clean-manuscript',
            lt('제출용 원고', 'Clean manuscript', '提出用原稿', '提交稿件'),
            'file-list',
            true,
            lt('헤더, 과정 메모, 미완 표식을 제거한 제출본입니다.', 'Submission copy without headers, process notes, or unfinished markers.', 'ヘッダー、過程メモ、未完了印を除いた提出稿です。', '去除标题、过程备注和未完成标记的提交稿。'),
          ),
          field(
            'process-record',
            lt('과정기록', 'Process record', '過程記録', '过程记录'),
            'file-list',
            true,
            lt('확인서와 작업 영수증을 포함합니다.', 'Include journal and work receipts.', '確認書と作業レシートを含めます。', '包含过程确认书和工作收据。'),
          ),
          field(
            'ip-pack-manifest',
            lt('권리/IP 자산화 구성표', 'Rights/IP asset manifest', '権利/IP資産化構成表', '权利/IP资产化构成表'),
            'file-list',
            true,
            lt('공개/비공개 경계, 출처 요약, 위험 항목을 설명합니다.', 'Describe public/private boundaries, source summary, and review items.', '公開/非公開境界、出典要約、確認項目を説明します。', '说明公开/非公开边界、来源摘要和检查项。'),
          ),
          field(
            'limitation-statement',
            lt('한계 문구', 'Limitation statement', '限界文言', '限制声明'),
            'boolean',
            true,
            lt('권리 판단을 대체하지 않는다는 문구를 포함합니다.', 'Include that this does not replace rights review.', '権利判断に代わらない旨を含めます。', '包含不替代权利审查的说明。'),
          ),
        ],
      ),
    ],
  ),
});

function buildForms(packId: LocalePackId): ReleaseFormDefinition[] {
  const extras = COUNTRY_EXTRA_SECTIONS[packId] ?? {};
  return (Object.keys(BASE_FORMS) as ReleaseFormId[]).map((formId) => {
    const base = BASE_FORMS[formId];
    return {
      ...base,
      sections: [...base.sections, ...(extras[formId] ?? [])],
    };
  });
}

function pack(input: {
  id: LocalePackId;
  jurisdiction: JurisdictionId;
  language: CertificateLanguage;
  label: LocalizedText;
  sourceReferences: readonly SourceReference[];
}): JurisdictionFormPack {
  return {
    ...input,
    limitation: lt(
      '이 팩은 제출 전 확인 항목입니다. 권리 판단이나 현지 법률 검토를 대체하지 않습니다.',
      'This pack is a pre-submission checklist and does not replace rights or local legal review.',
      'このパックは提出前の確認項目であり、権利判断や現地法務確認に代わるものではありません。',
      '本表单包为提交前检查项，不能替代权利判断或当地法律审查。',
    ),
    forms: buildForms(input.id),
  };
}

export const JURISDICTION_FORM_PACKS: Readonly<Record<LocalePackId, JurisdictionFormPack>> =
  Object.freeze({
    global: pack({
      id: 'global',
      jurisdiction: 'GLOBAL',
      language: 'ko',
      label: lt('공통 출고 팩', 'Global Release Pack', '共通出稿パック', '通用交付包'),
      sourceReferences: [],
    }),
    'ko-KR': pack({
      id: 'ko-KR',
      jurisdiction: 'KR',
      language: 'ko',
      label: lt('한국어/한국 출고 팩', 'Korean/Korea Release Pack', '韓国語・韓国出稿パック', '韩语/韩国交付包'),
      sourceReferences: [
        {
          title: '인공지능 발전과 신뢰 기반 조성 등에 관한 기본법',
          url: 'https://www.law.go.kr/lsInfoP.do?lsiSeq=268543',
          checkedAt: CHECKED_AT,
        },
        {
          title: '인공지능 발전과 신뢰 기반 조성 등에 관한 기본법 시행령',
          url: 'https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=282879&viewCls=lsRvsDocInfoR',
          checkedAt: CHECKED_AT,
        },
      ],
    }),
    'en-US': pack({
      id: 'en-US',
      jurisdiction: 'US',
      language: 'en',
      label: lt('영어/미국 출고 팩', 'English/US Release Pack', '英語・米国出稿パック', '英语/美国交付包'),
      sourceReferences: [
        {
          title: 'U.S. Copyright Office — Copyright and Artificial Intelligence',
          url: 'https://www.copyright.gov/ai/',
          checkedAt: CHECKED_AT,
        },
        {
          title: 'Copyright Registration Guidance: Works Containing Material Generated by Artificial Intelligence',
          url: 'https://www.copyright.gov/ai/ai_policy_guidance.pdf',
          checkedAt: CHECKED_AT,
        },
      ],
    }),
    'en-EU': pack({
      id: 'en-EU',
      jurisdiction: 'EU',
      language: 'en',
      label: lt('영어/EU 출고 팩', 'English/EU Release Pack', '英語・EU出稿パック', '英语/EU 交付包'),
      sourceReferences: [
        {
          title: 'European Commission — Code of Practice on Transparency of AI-Generated Content',
          url: 'https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content',
          checkedAt: CHECKED_AT,
        },
      ],
    }),
    'en-GB': pack({
      id: 'en-GB',
      jurisdiction: 'UK',
      language: 'en',
      label: lt('영어/영국 출고 팩', 'English/UK Release Pack', '英語・英国出稿パック', '英语/英国交付包'),
      sourceReferences: [
        {
          title: 'GOV.UK — Intellectual property: Copyright',
          url: 'https://www.gov.uk/government/collections/intellectual-property-copyright',
          checkedAt: CHECKED_AT,
        },
        {
          title: 'GOV.UK — Copyright notices',
          url: 'https://www.gov.uk/guidance/copyright-notices',
          checkedAt: CHECKED_AT,
        },
      ],
    }),
    'en-AU': pack({
      id: 'en-AU',
      jurisdiction: 'AU',
      language: 'en',
      label: lt('영어/호주 출고 팩', 'English/Australia Release Pack', '英語・豪州出稿パック', '英语/澳大利亚交付包'),
      sourceReferences: [
        {
          title: 'Australian Attorney-General Department — Copyright basics',
          url: 'https://www.ag.gov.au/rights-and-protections/copyright/copyright-basics',
          checkedAt: CHECKED_AT,
        },
        {
          title: 'Australian Attorney-General Department — For copyright owners',
          url: 'https://www.ag.gov.au/rights-and-protections/copyright/copyright-owners',
          checkedAt: CHECKED_AT,
        },
        {
          title: 'IP Australia — Who owns intellectual property?',
          url: 'https://www.ipaustralia.gov.au/understanding-ip/who-owns-ip',
          checkedAt: CHECKED_AT,
        },
      ],
    }),
    'ja-JP': pack({
      id: 'ja-JP',
      jurisdiction: 'JP',
      language: 'ja',
      label: lt('일본어/일본 출고 팩', 'Japanese/Japan Release Pack', '日本語・日本出稿パック', '日语/日本交付包'),
      sourceReferences: [
        {
          title: '文化庁 — AIと著作権について',
          url: 'https://www.bunka.go.jp/seisaku/chosakuken/aiandcopyright.html',
          checkedAt: CHECKED_AT,
        },
        {
          title: '文化庁 — AIと著作権に関するチェックリスト＆ガイダンス',
          url: 'https://www.bunka.go.jp/seisaku/bunkashingikai/chosakuken/seisaku/r06_02/pdf/94089701_05.pdf',
          checkedAt: CHECKED_AT,
        },
      ],
    }),
    'zh-CN': pack({
      id: 'zh-CN',
      jurisdiction: 'CN',
      language: 'zh',
      label: lt('중국어/중국 출고 팩', 'Chinese/China Release Pack', '中国語・中国出稿パック', '中文/中国交付包'),
      sourceReferences: [
        {
          title: '中央网信办 — 人工智能生成合成内容标识办法',
          url: 'https://www.cac.gov.cn/2025-03/14/c_1743654684782215.htm',
          checkedAt: CHECKED_AT,
        },
        {
          title: '中央网信办 — 生成式人工智能服务管理暂行办法',
          url: 'https://www.cac.gov.cn/2023-07/13/c_1690898327029107.htm',
          checkedAt: CHECKED_AT,
        },
      ],
    }),
    'zh-TW': pack({
      id: 'zh-TW',
      jurisdiction: 'TW',
      language: 'zh',
      label: lt('중국어/대만 출고 팩', 'Chinese/Taiwan Release Pack', '中国語・台湾出稿パック', '中文/台湾交付包'),
      sourceReferences: [
        {
          title: 'Taiwan Intellectual Property Office — Copyright Act',
          url: 'https://www.tipo.gov.tw/en/tipo2/377.html',
          checkedAt: CHECKED_AT,
        },
        {
          title: 'Taiwan Intellectual Property Office — Copyright FAQ',
          url: 'https://www.tipo.gov.tw/en/tipo2/393.html',
          checkedAt: CHECKED_AT,
        },
      ],
    }),
  });

export function listJurisdictionFormPacks(): JurisdictionFormPack[] {
  return Object.values(JURISDICTION_FORM_PACKS).map((packItem) => ({
    ...packItem,
    forms: packItem.forms.map((item) => ({ ...item, sections: [...item.sections] })),
    sourceReferences: [...packItem.sourceReferences],
  }));
}

export function getJurisdictionFormPack(id: LocalePackId | string): JurisdictionFormPack {
  if (id in JURISDICTION_FORM_PACKS) {
    return JURISDICTION_FORM_PACKS[id as LocalePackId];
  }
  const normalizedId = id.toLowerCase();
  if (normalizedId.startsWith('ko')) return JURISDICTION_FORM_PACKS['ko-KR'];
  if (normalizedId.startsWith('ja')) return JURISDICTION_FORM_PACKS['ja-JP'];
  if (normalizedId === 'zh-tw' || normalizedId.includes('hant')) return JURISDICTION_FORM_PACKS['zh-TW'];
  if (normalizedId.startsWith('zh')) return JURISDICTION_FORM_PACKS['zh-CN'];
  if (normalizedId === 'en-gb' || normalizedId === 'en-uk') return JURISDICTION_FORM_PACKS['en-GB'];
  if (normalizedId === 'en-au') return JURISDICTION_FORM_PACKS['en-AU'];
  if (normalizedId === 'en-eu') return JURISDICTION_FORM_PACKS['en-EU'];
  if (normalizedId.startsWith('en')) return JURISDICTION_FORM_PACKS['en-US'];
  return JURISDICTION_FORM_PACKS.global;
}

export function inferLocalePackId(input: {
  projectTargetLanguage?: string | null;
  targetMarket?: string | null;
} | null | undefined): LocalePackId {
  if (!input) return 'global';
  const targetMarket = String(input.targetMarket ?? '').toUpperCase();
  const targetLanguage = String(input.projectTargetLanguage ?? '').toUpperCase();

  if (targetMarket === 'JP' || targetLanguage === 'JP' || targetLanguage === 'JA') return 'ja-JP';
  if (targetMarket === 'TW') return 'zh-TW';
  if (targetMarket === 'CN') return 'zh-CN';
  if (targetMarket === 'EU') return 'en-EU';
  if (targetMarket === 'GB' || targetMarket === 'UK') return 'en-GB';
  if (targetMarket === 'AU') return 'en-AU';
  if (targetMarket === 'US' || targetLanguage === 'EN') return 'en-US';
  if (targetLanguage === 'CN' || targetLanguage === 'ZH') return 'zh-CN';
  if (targetMarket === 'KR' || targetLanguage === 'KO') return 'ko-KR';
  return 'global';
}

function hasValue(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined;
}

export function evaluateFormCompletion(
  packId: LocalePackId | string,
  formId: ReleaseFormId,
  values: Readonly<Record<string, unknown>>,
): FormCompletionResult {
  const packItem = getJurisdictionFormPack(packId);
  const targetForm = packItem.forms.find((item) => item.id === formId);
  if (!targetForm) {
    return { formId, requiredTotal: 0, requiredPresent: 0, missingRequiredFieldIds: [] };
  }
  const requiredFields = targetForm.sections.flatMap((item) => item.fields).filter((item) => item.required);
  const missingRequiredFieldIds = requiredFields
    .filter((item) => !hasValue(values[item.id]))
    .map((item) => item.id);
  return {
    formId,
    requiredTotal: requiredFields.length,
    requiredPresent: requiredFields.length - missingRequiredFieldIds.length,
    missingRequiredFieldIds,
  };
}

// IDENTITY_SEAL: jurisdiction-form-pack | role=localized release/checklist form definitions | inputs=locale/jurisdiction | outputs=forms/readiness gaps
