import type { StudioAction } from "@/components/studio/GlobalSearchPalette";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";
import type { LoreguardTabId } from "./LoreguardShell";

interface BuildLoreguardPaletteActionsArgs {
  language: AppLanguage;
  triggerSave: () => Promise<boolean>;
  createNewSession: () => void;
  openStyleTools: () => void;
  setActiveTab: (nextTab: LoreguardTabId) => void;
}

function dispatchLoreguardEvent(name: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name));
}

function toastSaved(language: AppLanguage) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("noa:toast", {
      detail: {
        message: L4(language, {
          ko: "저장되었습니다",
          en: "Saved",
          ja: "保存しました",
          zh: "已保存",
        }),
        variant: "success",
      },
    }),
  );
}

export function buildLoreguardPaletteActions({
  language,
  triggerSave,
  createNewSession,
  openStyleTools,
  setActiveTab,
}: BuildLoreguardPaletteActionsArgs): StudioAction[] {
  return [
    {
      id: "save-now",
      label: L4(language, {
        ko: "지금 저장",
        en: "Save now",
        ja: "今すぐ保存",
        zh: "立即保存",
      }),
      description: L4(language, {
        ko: "현재 세션을 즉시 저장합니다",
        en: "Persist the current session immediately",
        ja: "現在のセッションを即時保存します",
        zh: "立即保存当前会话",
      }),
      keywords: ["save", "persist", "저장", "세이브"],
      handler: () => {
        void triggerSave().then((ok) => {
          if (ok) toastSaved(language);
        });
      },
    },
    {
      id: "open-export",
      label: L4(language, {
        ko: "내보내기 열기",
        en: "Open export",
        ja: "エクスポートを開く",
        zh: "打开导出",
      }),
      description: L4(language, {
        ko: "집필 탭으로 이동해 내보내기를 엽니다",
        en: "Go to the Writing tab and open export",
        ja: "執筆タブへ移動しエクスポートを開きます",
        zh: "前往写作标签并打开导出",
      }),
      keywords: ["export", "download", "내보내기", "다운로드"],
      handler: () => {
        setActiveTab("writing");
        dispatchLoreguardEvent("loreguard:open-export");
      },
    },
    {
      id: "open-memo",
      label: L4(language, {
        ko: "메모 보드",
        en: "Memo board",
        ja: "メモボード",
        zh: "便签板",
      }),
      description: L4(language, {
        ko: "즉흥 아이디어 스크래치패드를 엽니다",
        en: "Open the quick-idea scratchpad",
        ja: "思いつきメモのスクラッチパッドを開きます",
        zh: "打开灵感速记板",
      }),
      keywords: ["memo", "note", "scratch", "메모", "노트", "아이디어"],
      handler: () => dispatchLoreguardEvent("loreguard:open-memo"),
    },
    {
      id: "open-history",
      label: L4(language, {
        ko: "히스토리",
        en: "History",
        ja: "履歴",
        zh: "历史",
      }),
      description: L4(language, {
        ko: "회차 저장 이력·버전 백업·창작 이벤트를 봅니다",
        en: "View saved sessions, version backups and creative events",
        ja: "保存回・バージョンバックアップ・創作イベントを表示します",
        zh: "查看已保存章节、版本备份与创作事件",
      }),
      keywords: ["history", "version", "backup", "히스토리", "이력", "버전", "백업"],
      handler: () => dispatchLoreguardEvent("loreguard:open-history"),
    },
    {
      id: "open-style-tools",
      label: L4(language, {
        ko: "문체 정렬",
        en: "Style alignment",
        ja: "文体調整",
        zh: "文体校准",
      }),
      description: L4(language, {
        ko: "문체 DNA, 기법 체크리스트, 문장 변환 실험실을 엽니다",
        en: "Open style DNA, technique checklist and sentence transform lab",
        ja: "文体DNA、技法チェックリスト、文章変換ラボを開きます",
        zh: "打开文体 DNA、技法清单与句子转换实验室",
      }),
      keywords: ["style", "tone", "voice", "문체", "스타일", "톤", "문장"],
      handler: openStyleTools,
    },
    {
      id: "open-visual",
      label: L4(language, {
        ko: "비주얼",
        en: "Visual",
        ja: "ビジュアル",
        zh: "视觉",
      }),
      description: L4(language, {
        ko: "비주얼 카드 프롬프트·매체 변환 슬롯을 엽니다",
        en: "Open visual card prompts and media-conversion slots",
        ja: "ビジュアルカードのプロンプトとメディアスロットを開きます",
        zh: "打开视觉卡片提示词与媒体转换槽位",
      }),
      keywords: ["visual", "image", "prompt", "slot", "비주얼", "이미지", "프롬프트", "슬롯"],
      handler: () => dispatchLoreguardEvent("loreguard:open-visual"),
    },
    {
      id: "new-session",
      label: L4(language, {
        ko: "새 회차",
        en: "New session",
        ja: "新しい回",
        zh: "新章节",
      }),
      description: L4(language, {
        ko: "새 회차(세션)를 생성합니다",
        en: "Create a new episode session",
        ja: "新しいエピソードセッションを作成します",
        zh: "创建新的章节会话",
      }),
      keywords: ["new", "session", "episode", "새 세션", "회차", "에피소드"],
      handler: () => createNewSession(),
    },
  ];
}
