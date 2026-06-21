import type { AppLanguage, VisualShotType } from "@/lib/studio-types";

type Labels = Readonly<{
  KO: string;
  EN: string;
  JP: string;
  CN: string;
}>;

const LABEL_FALLBACK: Labels = Object.freeze({
  KO: "항목",
  EN: "Item",
  JP: "項目",
  CN: "项目",
});

function pick(language: AppLanguage, labels: Labels | undefined): string {
  return (labels ?? LABEL_FALLBACK)[language] ?? (labels ?? LABEL_FALLBACK).KO;
}

const VISUAL_MEDIUM_LABELS: Readonly<Record<string, Labels>> = Object.freeze({
  image: { KO: "이미지", EN: "Image", JP: "画像", CN: "图像" },
  video: { KO: "영상", EN: "Video", JP: "映像", CN: "视频" },
  voice: { KO: "음성", EN: "Voice", JP: "音声", CN: "语音" },
  audio: { KO: "음성", EN: "Audio", JP: "音声", CN: "音频" },
  cover: { KO: "표지", EN: "Cover", JP: "表紙", CN: "封面" },
});

const VISUAL_CATEGORY_LABELS: Readonly<Record<string, Labels>> = Object.freeze({
  Core: { KO: "핵심", EN: "Core", JP: "中核", CN: "核心" },
  Visual: { KO: "시각", EN: "Visual", JP: "視覚", CN: "视觉" },
  Lighting: { KO: "조명", EN: "Lighting", JP: "照明", CN: "灯光" },
  Color: { KO: "색채", EN: "Color", JP: "色彩", CN: "色彩" },
  Quality: { KO: "품질", EN: "Quality", JP: "品質", CN: "质量" },
  Advanced: { KO: "고급", EN: "Advanced", JP: "詳細", CN: "高级" },
  Motion: { KO: "움직임", EN: "Motion", JP: "動き", CN: "运动" },
  Sequence: { KO: "시퀀스", EN: "Sequence", JP: "シーケンス", CN: "序列" },
  Audio: { KO: "소리", EN: "Audio", JP: "音", CN: "声音" },
  Coherence: { KO: "일관성", EN: "Coherence", JP: "一貫性", CN: "一致性" },
  Speaker: { KO: "화자", EN: "Speaker", JP: "話者", CN: "说话人" },
  Text: { KO: "문장", EN: "Text", JP: "文章", CN: "文本" },
  Emotion: { KO: "감정", EN: "Emotion", JP: "感情", CN: "情绪" },
  Prosody: { KO: "말맛", EN: "Prosody", JP: "韻律", CN: "韵律" },
  Nonverbal: { KO: "비언어", EN: "Nonverbal", JP: "非言語", CN: "非语言" },
  Context: { KO: "환경", EN: "Context", JP: "環境", CN: "环境" },
});

const VISUAL_SLOT_LABELS: Readonly<Record<string, Labels>> = Object.freeze({
  subject: { KO: "주체", EN: "subject", JP: "主体", CN: "主体" },
  action: { KO: "동작", EN: "action", JP: "動作", CN: "动作" },
  setting: { KO: "배경", EN: "setting", JP: "背景", CN: "背景" },
  mood: { KO: "분위기", EN: "mood", JP: "雰囲気", CN: "氛围" },
  style: { KO: "화풍", EN: "style", JP: "画風", CN: "画风" },
  composition: { KO: "구도", EN: "composition", JP: "構図", CN: "构图" },
  cameraAngle: { KO: "카메라 각도", EN: "camera angle", JP: "カメラ角度", CN: "镜头角度" },
  cameraDistance: { KO: "카메라 거리", EN: "camera distance", JP: "カメラ距離", CN: "镜头距离" },
  cameraLens: { KO: "렌즈", EN: "lens", JP: "レンズ", CN: "镜头" },
  depthOfField: { KO: "심도", EN: "depth of field", JP: "被写界深度", CN: "景深" },
  lightingStyle: { KO: "조명 방식", EN: "lighting style", JP: "照明方式", CN: "灯光方式" },
  lightingDirection: { KO: "조명 방향", EN: "lighting direction", JP: "照明方向", CN: "灯光方向" },
  lightingIntensity: { KO: "조명 강도", EN: "lighting intensity", JP: "照明強度", CN: "灯光强度" },
  colorTemperature: { KO: "색온도", EN: "color temperature", JP: "色温度", CN: "色温" },
  timeOfDay: { KO: "시간대", EN: "time of day", JP: "時間帯", CN: "时段" },
  colorPalette: { KO: "색 팔레트", EN: "color palette", JP: "色パレット", CN: "色彩方案" },
  dominantColor: { KO: "주색", EN: "dominant color", JP: "主色", CN: "主色" },
  accentColor: { KO: "강조색", EN: "accent color", JP: "アクセント色", CN: "强调色" },
  saturation: { KO: "채도", EN: "saturation", JP: "彩度", CN: "饱和度" },
  contrast: { KO: "대비", EN: "contrast", JP: "コントラスト", CN: "对比度" },
  resolution: { KO: "해상도", EN: "resolution", JP: "解像度", CN: "分辨率" },
  aspectRatio: { KO: "화면비", EN: "aspect ratio", JP: "画面比", CN: "画幅比例" },
  detailLevel: { KO: "디테일", EN: "detail level", JP: "ディテール", CN: "细节" },
  renderQuality: { KO: "렌더 품질", EN: "render quality", JP: "レンダー品質", CN: "渲染质量" },
  referenceImage: { KO: "참조 이미지", EN: "reference image", JP: "参照画像", CN: "参考图" },
  loraId: { KO: "로라 식별자", EN: "LoRA ID", JP: "LoRA ID", CN: "LoRA ID" },
  controlNet: { KO: "구도 제어", EN: "ControlNet", JP: "構図制御", CN: "构图控制" },
  negativePrompt: { KO: "제외 요소", EN: "negative prompt", JP: "除外要素", CN: "排除项" },
  seed: { KO: "시드", EN: "seed", JP: "シード", CN: "种子" },
  cfgScale: { KO: "반영 강도", EN: "CFG scale", JP: "反映強度", CN: "引导强度" },
  sampler: { KO: "샘플러", EN: "sampler", JP: "サンプラー", CN: "采样器" },
  steps: { KO: "단계 수", EN: "steps", JP: "ステップ数", CN: "步数" },
  duration: { KO: "길이", EN: "duration", JP: "長さ", CN: "时长" },
  cameraMotion: { KO: "카메라 움직임", EN: "camera motion", JP: "カメラ動き", CN: "镜头运动" },
  cameraSpeed: { KO: "카메라 속도", EN: "camera speed", JP: "カメラ速度", CN: "镜头速度" },
  subjectMotion: { KO: "대상 움직임", EN: "subject motion", JP: "対象の動き", CN: "主体运动" },
  subjectSpeed: { KO: "대상 속도", EN: "subject speed", JP: "対象速度", CN: "主体速度" },
  multiShot: { KO: "다중 컷", EN: "multi-shot", JP: "複数カット", CN: "多镜头" },
  shotTransitions: { KO: "장면 전환", EN: "shot transitions", JP: "場面転換", CN: "镜头转场" },
  pacing: { KO: "호흡", EN: "pacing", JP: "テンポ", CN: "节奏" },
  keyframes: { KO: "핵심 프레임", EN: "keyframes", JP: "キーフレーム", CN: "关键帧" },
  bgmMood: { KO: "배경음 분위기", EN: "BGM mood", JP: "BGM雰囲気", CN: "背景乐氛围" },
  bgmGenre: { KO: "배경음 장르", EN: "BGM genre", JP: "BGMジャンル", CN: "背景乐类型" },
  sfx: { KO: "효과음", EN: "sound effects", JP: "効果音", CN: "音效" },
  dialogue: { KO: "대사", EN: "dialogue", JP: "台詞", CN: "对白" },
  ambientSound: { KO: "환경음", EN: "ambient sound", JP: "環境音", CN: "环境音" },
  soundMix: { KO: "소리 배합", EN: "sound mix", JP: "音量配分", CN: "声音混合" },
  subjectConsistency: { KO: "대상 일관성", EN: "subject consistency", JP: "対象一貫性", CN: "主体一致性" },
  temporalCoherence: { KO: "시간 일관성", EN: "temporal coherence", JP: "時間一貫性", CN: "时间连贯性" },
  styleConsistency: { KO: "스타일 일관성", EN: "style consistency", JP: "作風一貫性", CN: "风格一致性" },
  emotionArc: { KO: "감정 변화", EN: "emotion arc", JP: "感情変化", CN: "情绪弧线" },
  voiceId: { KO: "음성 식별자", EN: "voice ID", JP: "音声ID", CN: "语音ID" },
  voiceProfile: { KO: "음성 프로필", EN: "voice profile", JP: "音声プロフィール", CN: "语音档案" },
  voiceCharacter: { KO: "목소리 성격", EN: "voice character", JP: "声の性格", CN: "声音性格" },
  accent: { KO: "억양", EN: "accent", JP: "アクセント", CN: "口音" },
  text: { KO: "문장", EN: "text", JP: "文章", CN: "文本" },
  language: { KO: "언어", EN: "language", JP: "言語", CN: "语言" },
  ssmlTags: { KO: "음성 태그", EN: "SSML tags", JP: "音声タグ", CN: "语音标签" },
  tone: { KO: "톤", EN: "tone", JP: "トーン", CN: "语气" },
  emotionIntensity: { KO: "감정 강도", EN: "emotion intensity", JP: "感情強度", CN: "情绪强度" },
  urgency: { KO: "긴급감", EN: "urgency", JP: "切迫感", CN: "紧迫感" },
  speed: { KO: "속도", EN: "speed", JP: "速度", CN: "速度" },
  pitch: { KO: "음높이", EN: "pitch", JP: "音高", CN: "音高" },
  pitchVariation: { KO: "음높이 변화", EN: "pitch variation", JP: "音高変化", CN: "音高变化" },
  emphasis: { KO: "강조", EN: "emphasis", JP: "強調", CN: "重音" },
  rhythm: { KO: "리듬", EN: "rhythm", JP: "リズム", CN: "节奏" },
  laughType: { KO: "웃음", EN: "laugh", JP: "笑い", CN: "笑声" },
  sigh: { KO: "한숨", EN: "sigh", JP: "ため息", CN: "叹息" },
  gasp: { KO: "놀람 숨", EN: "gasp", JP: "息を呑む音", CN: "倒吸气" },
  breath: { KO: "호흡", EN: "breath", JP: "呼吸", CN: "呼吸" },
  silence: { KO: "침묵", EN: "silence", JP: "沈黙", CN: "停顿" },
  backgroundSound: { KO: "배경음", EN: "background sound", JP: "背景音", CN: "背景声" },
  audioEnvironment: { KO: "녹음 환경", EN: "audio environment", JP: "録音環境", CN: "录音环境" },
  speakerDistance: { KO: "마이크 거리", EN: "speaker distance", JP: "マイク距離", CN: "麦克风距离" },
});

const SHOT_TYPE_LABELS: Readonly<Record<VisualShotType, Labels>> = Object.freeze({
  key_scene: { KO: "대표 장면", EN: "Key scene", JP: "代表場面", CN: "代表场景" },
  character_focus: { KO: "인물 중심", EN: "Character focus", JP: "人物中心", CN: "人物重点" },
  background_focus: { KO: "배경 중심", EN: "Background focus", JP: "背景中心", CN: "背景重点" },
  cover: { KO: "표지", EN: "Cover", JP: "表紙", CN: "封面" },
  thumbnail: { KO: "썸네일", EN: "Thumbnail", JP: "サムネイル", CN: "缩略图" },
  object_focus: { KO: "오브젝트 중심", EN: "Object focus", JP: "物品中心", CN: "物件重点" },
});

const JUDGMENT_LABELS: Readonly<Record<string, Labels>> = Object.freeze({
  PASS: { KO: "노출 가능", EN: "Exposable", JP: "露出可能", CN: "可公开" },
  WARNING: { KO: "작가 확인", EN: "Author check", JP: "作者確認", CN: "作者确认" },
  BLOCKED: { KO: "차단", EN: "Blocked", JP: "遮断", CN: "阻止" },
});

const MANIFEST_DISCLOSURE_LABELS: Readonly<Record<string, Labels>> = Object.freeze({
  "public-verify": { KO: "공개 조회", EN: "Public lookup", JP: "公開照会", CN: "公开查询" },
  "recipient-package": { KO: "제출 패키지", EN: "Recipient package", JP: "提出パッケージ", CN: "提交包" },
  "private-evidence": { KO: "비공개 증빙", EN: "Private evidence", JP: "非公開証跡", CN: "私密证据" },
  "internal-evidence": { KO: "내부 기록", EN: "Internal evidence", JP: "内部記録", CN: "内部记录" },
});

const ARTIFACT_ROLE_LABELS: Readonly<Record<string, Labels>> = Object.freeze({
  "legacy-manuscript-copy": { KO: "이전 원고 사본", EN: "Legacy manuscript copy", JP: "旧原稿コピー", CN: "旧稿副本" },
  "working-final-with-process-reference": { KO: "과정 참조 포함 최종 원고", EN: "Working final with process reference", JP: "工程参照付き最終原稿", CN: "含过程参照的终稿" },
  "submission-clean-copy": { KO: "제출용 클린 원고", EN: "Submission clean copy", JP: "提出用クリーン原稿", CN: "提交用清稿" },
  "submission-clean-mechanical-audit": { KO: "제출 전 문장 점검 결과", EN: "Submission text review", JP: "提出前文章点検", CN: "提交前文本检查" },
  "creative-process-record": { KO: "창작 과정 기록", EN: "Creative process record", JP: "創作過程記録", CN: "创作过程记录" },
  "source-metadata-evidence": { KO: "출처 메타자료", EN: "Source metadata evidence", JP: "出典メタ資料", CN: "来源元数据" },
  "provenance-assertion-payload": { KO: "출처·과정 주장 자료", EN: "Provenance assertion payload", JP: "来歴主張資料", CN: "来源声明资料" },
  "provenance-preparation-note": { KO: "출처 준비 메모", EN: "Provenance preparation note", JP: "来歴準備メモ", CN: "来源准备备注" },
  "submission-readiness-review": { KO: "제출 준비도 검토", EN: "Submission readiness review", JP: "提出準備度レビュー", CN: "提交准备度审查" },
  "localized-release-form-checklist": { KO: "국가별 제출 양식 점검", EN: "Localized release form checklist", JP: "国別提出書式点検", CN: "各地提交表单检查" },
  "release-credit-ledger-preview": { KO: "패키지 조건 미리보기", EN: "Package condition preview", JP: "パッケージ条件プレビュー", CN: "包条件预览" },
  "source-ingest-status-report": { KO: "불러오기 상태 보고", EN: "Source ingest status report", JP: "読み込み状態報告", CN: "导入状态报告" },
  "internal-review-receipts": { KO: "내부 검토 영수증", EN: "Internal review receipts", JP: "内部レビュー受領記録", CN: "内部审查记录" },
  "export-package-generation-receipt": { KO: "출고 패키지 생성 영수증", EN: "Export package generation receipt", JP: "出荷パッケージ生成記録", CN: "出库包生成记录" },
  "package-disclosure-policy": { KO: "패키지 공개 범위 정책", EN: "Package disclosure policy", JP: "パッケージ公開範囲方針", CN: "包公开范围策略" },
  "hash-manifest": { KO: "해시 목록", EN: "Hash manifest", JP: "ハッシュ一覧", CN: "哈希清单" },
});

const ASSET_RIGHTS_LABELS: Readonly<Record<string, Labels>> = Object.freeze({
  manuscriptText: { KO: "원고 본문", EN: "Manuscript text", JP: "原稿本文", CN: "稿件正文" },
  previsualAssets: { KO: "비주얼 준비 자료", EN: "Previsual assets", JP: "プリビジュアル資料", CN: "预视觉资料" },
  aiOutputs: { KO: "노아 보조 산출물", EN: "Noa-assisted outputs", JP: "ノア補助出力", CN: "诺亚辅助输出" },
  externalReferenceMaterials: { KO: "외부 참조 자료", EN: "External reference materials", JP: "外部参照資料", CN: "外部参考资料" },
});

const REVIEW_STATUS_LABELS: Readonly<Record<string, Labels>> = Object.freeze({
  recorded: { KO: "기록됨", EN: "Recorded", JP: "記録済み", CN: "已记录" },
  "needs-review": { KO: "검토 필요", EN: "Needs review", JP: "要確認", CN: "需要审查" },
  hold: { KO: "보류", EN: "Hold", JP: "保留", CN: "暂缓" },
});

const SEVERITY_LABELS: Readonly<Record<string, Labels>> = Object.freeze({
  info: { KO: "안내", EN: "Info", JP: "案内", CN: "提示" },
  low: { KO: "낮음", EN: "Low", JP: "低", CN: "低" },
  medium: { KO: "중간", EN: "Medium", JP: "中", CN: "中" },
  high: { KO: "높음", EN: "High", JP: "高", CN: "高" },
  critical: { KO: "치명", EN: "Critical", JP: "重大", CN: "严重" },
});

export function visualMediumLabel(language: AppLanguage, medium: string): string {
  return pick(language, VISUAL_MEDIUM_LABELS[medium]);
}

export function visualSlotCategoryLabel(language: AppLanguage, category: string): string {
  return pick(language, VISUAL_CATEGORY_LABELS[category]);
}

export function visualSlotLabel(language: AppLanguage, slotName: string): string {
  return pick(language, VISUAL_SLOT_LABELS[slotName]);
}

export function visualShotTypeLabel(language: AppLanguage, shotType: VisualShotType | string): string {
  return pick(language, SHOT_TYPE_LABELS[shotType as VisualShotType]);
}

export function exposureJudgmentLabel(language: AppLanguage, judgment: string): string {
  return pick(language, JUDGMENT_LABELS[judgment]);
}

export function manifestDisclosureLabel(language: AppLanguage, disclosure: string): string {
  return pick(language, MANIFEST_DISCLOSURE_LABELS[disclosure]);
}

export function artifactRoleLabel(language: AppLanguage, role: string): string {
  return pick(language, ARTIFACT_ROLE_LABELS[role]);
}

export function assetRightsGroupLabel(language: AppLanguage, group: string): string {
  return pick(language, ASSET_RIGHTS_LABELS[group]);
}

export function reviewStatusLabel(language: AppLanguage, status: string): string {
  return pick(language, REVIEW_STATUS_LABELS[status]);
}

export function severityLabel(language: AppLanguage, severity: string): string {
  return pick(language, SEVERITY_LABELS[severity]);
}

export function localizeVisualPromptSkeleton(language: AppLanguage, skeleton: string): string {
  if (language !== "KO") return skeleton;
  return skeleton
    .replace(/\[([A-Za-z][A-Za-z0-9]*)\]/g, (_, slotName: string) => `[${visualSlotLabel(language, slotName)}]`)
    .replace(/\sin\s/g, ", 장소: ")
    .replace(/\smood\b/g, " 분위기")
    .replace(/\sstyle\b/g, " 화풍")
    .replace(/\scomposition\b/g, " 구도")
    .replace(/\scamera angle\b/g, " 카메라 각도")
    .replace(/\slens\b/g, " 렌즈")
    .replace(/\sdepth of field\b/g, " 심도")
    .replace(/\blighting from\b/g, "조명 방향")
    .replace(/\bpalette with\b/g, "색 팔레트:")
    .replace(/\bdominant and\b/g, "주색 /")
    .replace(/\baccent\b/g, "강조색")
    .replace(/\bsaturation\b/g, "채도")
    .replace(/\bcontrast\b/g, "대비")
    .replace(/\bblurry, lowres, deformed, text, watermark, jpeg artifacts\b/g, "흐림, 저해상도, 왜곡, 글자, 워터마크, 압축 흔적")
    .replace(/\bblurry, lowres\b/g, "흐림, 저해상도")
    .replace(/\bproduction\b/g, "출고용")
    .replace(/\brandom\b/g, "임의")
    .replace(/\bbalanced\b/g, "균형")
    .replace(/\bnormal\b/g, "보통")
    .replace(/\bmedium\b/g, "보통")
    .replace(/\bon\b/g, "켜짐")
    .replace(/\bsilent\b/g, "무음")
    .replace(/\broom\b/g, "실내")
    .replace(/\bclose mic\b/g, "근접 마이크")
    .replace(/\bNegative:/g, "제외 요소:")
    .replace(/\bBGM\b/g, "배경음")
    .replace(/\bSFX\b/g, "효과음")
    .replace(/\bvoice_id:/g, "음성 식별자:")
    .replace(/\bprofile:/g, "프로필:")
    .replace(/\bcharacter:/g, "성격:")
    .replace(/\baccent:/g, "억양:")
    .replace(/\btext:/g, "문장:")
    .replace(/\blanguage:/g, "언어:")
    .replace(/\bemotion:/g, "감정:")
    .replace(/\burgency:/g, "긴급감:")
    .replace(/\bprosody:/g, "말맛:")
    .replace(/\bnonverbal:/g, "비언어:")
    .replace(/\bcontext:/g, "환경:")
    .replace(/\bssml:/g, "음성 태그:")
    .replace(/\bscene:/g, "장면:")
    .replace(/\bmood:/g, "분위기:")
    .replace(/\bpacing:/g, "호흡:")
    .replace(/\bduration:/g, "길이:")
    .replace(/\baspectRatio:/g, "화면비:")
    .replace(/\bvisual:/g, "시각:")
    .replace(/\bcamera:/g, "카메라:")
    .replace(/\bshots:/g, "컷:")
    .replace(/\blighting:/g, "조명:")
    .replace(/\baudio:/g, "소리:")
    .replace(/\bmix:/g, "소리 배합:")
    .replace(/\bcoherence:/g, "일관성:");
}
