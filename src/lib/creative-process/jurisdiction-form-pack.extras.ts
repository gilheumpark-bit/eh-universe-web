import type { FormSectionDefinition, LocalePackId, ReleaseFormId } from './jurisdiction-form-pack';
import { field, lt, section } from './jurisdiction-form-pack.builders';

export const COUNTRY_EXTRA_SECTIONS: Readonly<Record<LocalePackId, Partial<Record<ReleaseFormId, readonly FormSectionDefinition[]>>>> =
  Object.freeze({
    global: {},
    'ko-KR': {
      'release-package': [
        section(
          'kr-release-review',
          lt('한국 출고 확인', 'Korea Release Review', '韓国出稿確認', '韩国交付检查'),
          [
            field(
              'kr-ai-basic-notice',
              lt('도구 사용 고지 검토', 'Tool-use notice review', '道具利用表示の確認', '工具使用告知检查'),
              'boolean',
              true,
              lt('2026년 시행 AI 기본법/시행령 기준으로 표시 필요 여부를 검토합니다.', 'Review whether notice is needed under Korea AI framework effective in 2026.', '2026年施行の韓国AI基本法体系を基準に表示要否を確認します。', '依据 2026 年实施的韩国 AI 框架检查是否需要告知。'),
            ),
            field(
              'kr-platform-terms',
              lt('국내 플랫폼 약관 확인', 'Domestic platform terms check', '国内プラットフォーム規約確認', '韩国平台条款检查'),
              'boolean',
              true,
              lt('네이버·카카오·문피아 등 제출처별 최신 약관을 별도 확인합니다.', 'Check current terms for each platform such as Naver, Kakao, or Munpia.', 'Naver、Kakao、Munpia等提出先ごとの最新規約を別途確認します。', '分别检查 Naver、Kakao、Munpia 等提交平台的最新条款。'),
            ),
            field(
              'kr-personal-data',
              lt('개인정보 포함 여부', 'Personal data inclusion', '個人情報の含有', '个人信息包含情况'),
              'boolean',
              true,
              lt('실명, 연락처, 민감정보가 원고·메타데이터·노트에 섞이지 않았는지 확인합니다.', 'Check manuscript, metadata, and notes for real names, contacts, or sensitive data.', '実名、連絡先、機微情報が原稿・メタデータ・ノートに混在していないか確認します。', '检查稿件、元数据和笔记中是否混入真实姓名、联系方式或敏感信息。'),
            ),
          ],
        ),
      ],
    },
    'en-US': {
      'rights-asset': [
        section(
          'us-authorship-review',
          lt('미국 저작권 등록 보조', 'US Copyright Registration Support', '米国著作権登録補助', '美国版权登记辅助'),
          [
            field(
              'us-human-authorship-scope',
              lt('작가 저작 기여 범위', 'Author contribution scope', '作者の著作寄与範囲', '作者创作贡献范围'),
              'textarea',
              true,
              lt('선택, 배열, 수정, 원문 작성 등 작가가 기여한 부분을 분리합니다.', 'Separate author selection, arrangement, revision, and authored text.', '選択、配列、修正、本文作成など作者の寄与を分けます。', '区分作者选择、编排、修改和原创文本。'),
            ),
            field(
              'us-nonclaimable-material-note',
              lt('비청구 자료 메모', 'Excluded material note', '請求外素材メモ', '排除材料说明'),
              'textarea',
              true,
              lt('도구 산출물, 외부자료, 공개자료 등 등록 청구에서 분리할 항목을 적습니다.', 'Record tool outputs, external materials, or public-domain materials to exclude from the claim.', '道具出力、外部資料、公開資料など登録請求から分ける項目を記録します。', '记录需从版权主张中排除的工具输出、外部材料或公有材料。'),
            ),
          ],
        ),
      ],
      'release-package': [
        section(
          'us-disclosure-review',
          lt('미국 제출 문구 확인', 'US Submission Wording Review', '米国提出文言確認', '美国提交措辞检查'),
          [
            field(
              'us-registration-disclosure',
              lt('도구 산출물 포함 고지', 'Tool-output inclusion disclosure', '道具出力含有表示', '工具输出包含披露'),
              'boolean',
              true,
              lt('미국 저작권청 제출 시 도구 산출물 포함 여부를 별도 기재할 수 있게 합니다.', 'Prepare a separate disclosure of tool-generated material for USCO filing when applicable.', '米国著作権局提出時に道具出力の含有を別記できるようにします。', '为美国版权局提交准备工具生成材料的单独披露。'),
            ),
          ],
        ),
      ],
    },
    'en-EU': {
      'release-package': [
        section(
          'eu-transparency-review',
          lt('EU 투명성 확인', 'EU Transparency Review', 'EU透明性確認', 'EU 透明度检查'),
          [
            field(
              'eu-article-50-marking',
              lt('기계 판독 표시 준비', 'Machine-readable marking readiness', '機械可読表示の準備', '机器可读标识准备'),
              'boolean',
              true,
              lt('AI Act 50조 관련 표시·메타데이터 요구 가능성을 출고 전 확인합니다.', 'Check possible Article 50 marking and metadata requirements before release.', 'AI Act第50条関連の表示・メタデータ要件可能性を出稿前に確認します。', '发布前检查 AI Act 第50条相关标识和元数据要求。'),
            ),
            field(
              'eu-c2pa-ready',
              lt('C2PA-ready 산출물', 'C2PA-ready artifact', 'C2PA-ready成果物', 'C2PA-ready 文件'),
              'file-list',
              true,
              lt('서명된 구성표가 아니어도 매핑 가능한 JSON을 준비합니다.', 'Prepare mappable JSON even before a signed manifest exists.', '署名済み構成表前でもマッピング可能なJSONを準備します。', '即使尚无签名构成表，也准备可映射 JSON。'),
            ),
            field(
              'eu-personal-data-minimization',
              lt('개인정보 최소화', 'Personal-data minimization', '個人データ最小化', '个人数据最小化'),
              'boolean',
              true,
              lt('출고 패키지에 원고 밖 개인정보가 들어가지 않게 분리합니다.', 'Keep non-manuscript personal data out of the release package.', '出稿パッケージに原稿外の個人データを入れないよう分離します。', '避免交付包包含稿件之外的个人数据。'),
            ),
          ],
        ),
      ],
    },
    'en-GB': {
      'rights-asset': [
        section(
          'uk-rights-chain-review',
          lt('영국 권리 귀속 확인', 'UK Rights Chain Review', '英国の権利帰属確認', '英国权利链检查'),
          [
            field(
              'uk-moral-rights-note',
              lt('저작인격권·표시 메모', 'Moral rights and credit note', '著作者人格権・表示メモ', '精神权利与署名说明'),
              'textarea',
              true,
              lt('작가 표시, 각색 승인, 권리 유보 범위를 계약 메모와 연결합니다.', 'Link credit, adaptation approval, and retained-rights scope to contract notes.', '作者表示、翻案承認、権利留保範囲を契約メモと紐づけます。', '将署名、改编批准和保留权利范围关联到合同备注。'),
            ),
            field(
              'uk-publisher-rights-window',
              lt('출판·2차 이용 권리 기간', 'Publishing and secondary-rights window', '出版・二次利用権の期間', '出版与二次使用权期限'),
              'textarea',
              true,
              lt('독점/비독점, 지역, 기간, 재허락 가능 여부를 분리합니다.', 'Separate exclusivity, territory, term, and sublicensing permission.', '独占/非独占、地域、期間、再許諾可否を分けます。', '区分独占/非独占、地域、期限和再授权许可。'),
            ),
            field(
              'uk-title-trademark-search-note',
              lt('제목·시리즈명 검색 메모', 'Title and series-name search note', '題名・シリーズ名検索メモ', '标题与系列名检索说明'),
              'boolean',
              false,
              lt('작품명, 시리즈명, 필명 사용 전 별도 검색 여부를 남깁니다.', 'Record whether title, series name, and pen-name searches were performed.', '作品名、シリーズ名、筆名の利用前検索有無を残します。', '记录作品名、系列名和笔名使用前是否已检索。'),
            ),
          ],
        ),
      ],
      'release-package': [
        section(
          'uk-release-review',
          lt('영국 출고 확인', 'UK Release Review', '英国出稿確認', '英国交付检查'),
          [
            field(
              'uk-overseas-copyright-note',
              lt('해외 저작권 연결 메모', 'Overseas copyright linkage note', '海外著作権連携メモ', '海外版权衔接说明'),
              'boolean',
              true,
              lt('원문 국가와 영국 출고본의 권리자·사용권 범위를 같은 구성표에 연결합니다.', 'Link right holder and license scope across the source country and UK release copy.', '原文国と英国出稿版の権利者・利用許諾範囲を同じ構成表に結びます。', '将源国家与英国交付版的权利人和许可范围连接到同一构成表。'),
            ),
          ],
        ),
      ],
    },
    'en-AU': {
      'rights-asset': [
        section(
          'au-rights-chain-review',
          lt('호주 권리 귀속 확인', 'Australia Rights Chain Review', '豪州の権利帰属確認', '澳大利亚权利链检查'),
          [
            field(
              'au-ownership-chain-note',
              lt('작성일·권리 귀속 메모', 'Creation date and ownership note', '作成日・権利帰属メモ', '创作日期与权利归属说明'),
              'textarea',
              true,
              lt('작성일, 버전 해시, 작가·공동작업자 권리 귀속을 함께 남깁니다.', 'Record creation date, version hash, and author/collaborator ownership together.', '作成日、バージョンハッシュ、作者・共同作業者の権利帰属を併記します。', '同时记录创作日期、版本哈希和作者/协作者权利归属。'),
            ),
            field(
              'au-creator-moral-rights-note',
              lt('창작자 표시·동일성 메모', 'Creator credit and integrity note', '創作者表示・同一性メモ', '创作者署名与完整性说明'),
              'textarea',
              true,
              lt('작가 표시, 각색 변경, 공동작업자 크레딧 범위를 기록합니다.', 'Record author credit, adaptation changes, and collaborator credit scope.', '作者表示、翻案変更、共同作業者クレジット範囲を記録します。', '记录作者署名、改编变更和协作者署名范围。'),
            ),
            field(
              'au-indigenous-cultural-material-check',
              lt('원주민 문화 표현 후보 점검', 'First Nations cultural material check', '先住民文化表現候補の確認', '原住民文化材料候选检查'),
              'boolean',
              true,
              lt('전통 지식·문화 표현을 참고했을 가능성이 있으면 출처와 승인 경로를 분리합니다.', 'If traditional knowledge or cultural expression may be referenced, separate source and permission path.', '伝統知識・文化表現を参照した可能性があれば、出典と承認経路を分けます。', '如可能参考传统知识或文化表达，需分离来源和许可路径。'),
            ),
          ],
        ),
      ],
      'release-package': [
        section(
          'au-release-review',
          lt('호주 출고 확인', 'Australia Release Review', '豪州出稿確認', '澳大利亚交付检查'),
          [
            field(
              'au-rights-evidence-bundle',
              lt('권리 근거 묶음', 'Rights evidence bundle', '権利根拠パッケージ', '权利依据包'),
              'file-list',
              true,
              lt('등록 서류가 아니라 작성 이력, 계약, 사용권, 출처 기록을 묶습니다.', 'Bundle creation history, contracts, licenses, and source records rather than treating filing as proof.', '登録書類ではなく、作成履歴、契約、利用許諾、出典記録をまとめます。', '打包创作历史、合同、许可和来源记录，而非将登记视为凭据。'),
            ),
          ],
        ),
      ],
    },
    'ja-JP': {
      'rights-asset': [
        section(
          'jp-copyright-risk-review',
          lt('일본 유사성·의거성 확인', 'Japan Similarity/Dependency Review', '日本の類似性・依拠性確認', '日本相似性/依赖性检查'),
          [
            field(
              'jp-similarity-check',
              lt('유사성 후보 점검', 'Similarity candidate check', '類似性候補確認', '相似性候选检查'),
              'boolean',
              true,
              lt('기존 작품과 표현상 유사해 보이는 후보를 분리해 검토합니다.', 'Review expression-level similarity candidates against existing works.', '既存作品との表現上の類似候補を分けて確認します。', '检查与既有作品表达层面的相似候选项。'),
            ),
            field(
              'jp-dependency-record',
              lt('의거 가능성 메모', 'Dependency/access note', '依拠可能性メモ', '依赖/接触可能性说明'),
              'textarea',
              true,
              lt('참고한 작품, 학습/참조 자료, 작가 접근 가능성을 기록합니다.', 'Record referenced works, source materials, and author access context.', '参照作品、学習・参照資料、作者のアクセス可能性を記録します。', '记录参考作品、资料来源和作者接触可能性。'),
            ),
          ],
        ),
      ],
    },
    'zh-CN': {
      'release-package': [
        section(
          'cn-content-label-review',
          lt('중국 생성합성 콘텐츠 표식 확인', 'China Generated/Synthetic Content Label Review', '中国生成合成コンテンツ標識確認', '中国生成合成内容标识检查'),
          [
            field(
              'cn-explicit-label',
              lt('명시 표식', 'Explicit label', '明示標識', '显式标识'),
              'boolean',
              true,
              lt('공개 서비스·플랫폼 제출 시 사용자가 인지 가능한 표시가 필요한지 확인합니다.', 'Check whether a user-visible label is needed for public services or platform release.', '公開サービス・プラットフォーム提出時に利用者が認識できる表示が必要か確認します。', '检查公开服务或平台发布是否需要用户可见标识。'),
            ),
            field(
              'cn-implicit-label',
              lt('파일 메타데이터 표식', 'File metadata label', 'ファイルメタデータ標識', '文件元数据标识'),
              'boolean',
              false,
              lt('텍스트/파일 메타데이터 표식 가능성을 출고 전 확인합니다.', 'Review whether metadata-level labeling is applicable before release.', '出稿前にメタデータレベルの標識適用可能性を確認します。', '发布前检查是否适用元数据层面的标识。'),
            ),
            field(
              'cn-public-service-scope',
              lt('중국 내 공개 서비스 여부', 'Mainland public-service scope', '中国本土向け公開サービス該当性', '中国境内公开服务范围'),
              'boolean',
              true,
              lt('중국 내 일반 대중에게 제공되는 서비스인지 별도 구분합니다.', 'Separate whether the service is offered to the public in mainland China.', '中国本土の一般公衆向け提供かを分けます。', '区分是否向中国境内公众提供服务。'),
            ),
          ],
        ),
      ],
    },
    'zh-TW': {
      'source-reference': [
        section(
          'tw-source-owner-review',
          lt('대만 출처·권리자 확인', 'Taiwan Source and Right Holder Review', '台湾の出典・権利者確認', '台湾来源与权利人检查'),
          [
            field(
              'tw-source-owner-search',
              lt('권리자 조회 메모', 'Right holder lookup note', '権利者照会メモ', '权利人查询说明'),
              'textarea',
              true,
              lt('외부 작품·이미지·설정 자료의 권리자 조회와 미확인 범위를 분리합니다.', 'Separate right-holder lookup and unresolved scope for external works, images, and setting materials.', '外部作品・画像・設定資料の権利者照会と未確認範囲を分けます。', '区分外部作品、图片和设定资料的权利人查询与未确认范围。'),
            ),
          ],
        ),
      ],
      'release-package': [
        section(
          'tw-traditional-chinese-review',
          lt('대만 번체 출고 확인', 'Taiwan Traditional Chinese Release Review', '台湾繁体字出稿確認', '台湾繁体中文交付检查'),
          [
            field(
              'tw-traditional-chinese-release-copy',
              lt('번체 출고본', 'Traditional Chinese release copy', '繁体字出稿版', '繁体中文交付稿'),
              'file-list',
              true,
              lt('간체본과 섞지 않고 대만 독자용 표기·용어 판본을 따로 남깁니다.', 'Keep a Taiwan-facing Traditional Chinese copy separate from Simplified Chinese copy.', '簡体字版と混ぜず、台湾読者向けの表記・用語版を別に残します。', '将面向台湾读者的繁体中文版本与简体版本分开保存。'),
            ),
            field(
              'tw-copyright-act-scope-note',
              lt('저작권법 범위 메모', 'Copyright Act scope note', '著作権法範囲メモ', '著作权法范围说明'),
              'textarea',
              true,
              lt('출고본, 번역본, 삽화, 용어집이 각각 어떤 권리 기록에 연결되는지 적습니다.', 'Record which rights record covers release copy, translation, illustrations, and glossary.', '出稿版、翻訳版、挿絵、用語集がどの権利記録に紐づくかを記録します。', '记录交付稿、译文、插图和术语表分别关联到哪些权利记录。'),
            ),
          ],
        ),
      ],
    },
  });
