"use client";

import type { StudioEntryMode } from "@/lib/studio-entry-links";
import type { AppLanguage } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";
import { Book, Download, Plus, Sparkle } from "./icons";

interface ProjectStartEntryPanelProps {
  language: AppLanguage;
  startMode: StudioEntryMode;
  projectStartBusy: boolean;
  onModeChange: (mode: StudioEntryMode) => void;
  onFocusImport: () => void;
  onCreateBlankProject: () => void;
  onContinueWithNoa: () => void;
}

export function ProjectStartEntryPanel({
  language,
  startMode,
  projectStartBusy,
  onModeChange,
  onFocusImport,
  onCreateBlankProject,
  onContinueWithNoa,
}: ProjectStartEntryPanelProps) {
  return (
    <>
      <div className="ps-head">
        <div>
          <div className="kicker">{L4(language, {
            ko: startMode === "manage" ? "작품 보관함" : startMode === "import" ? "파일 가져오기" : "작품 시작점",
            en: startMode === "manage" ? "Project library" : startMode === "import" ? "Import from files" : "Seed of the work",
            ja: startMode === "manage" ? "作品保管庫" : startMode === "import" ? "ファイルから読み込み" : "作品の種",
            zh: startMode === "manage" ? "作品库" : startMode === "import" ? "从文件导入" : "作品的种子",
          })}</div>
          <h1>{L4(language, {
            ko: startMode === "manage" ? "최근 작품 열기" : startMode === "import" ? "파일에서 작품 자료 가져오기" : "새 작품 시작",
            en: startMode === "manage" ? "Open a Recent Work" : startMode === "import" ? "Import Work Material" : "Start a New Work",
            ja: startMode === "manage" ? "最近の作品を開く" : startMode === "import" ? "作品資料を読み込む" : "新しい作品を始める",
            zh: startMode === "manage" ? "打开最近作品" : startMode === "import" ? "导入作品资料" : "开始新作品",
          })}</h1>
          <p>{L4(language, {
            ko: startMode === "manage"
              ? "저장된 작품을 바로 열거나, 작품 기준만 먼저 확인한 뒤 이어서 작업합니다."
              : startMode === "import"
                ? "원고·설정집·권리 메모 파일을 작은 창에서 읽고, 필요한 항목만 작품 기준에 반영합니다."
                : "제목, 연재 방향, 권리 메모를 작가 기준으로 먼저 정합니다.",
            en: startMode === "manage"
              ? "Open saved works directly, or select one to inspect its basis board first."
              : startMode === "import"
                ? "Read manuscript, bible, and rights-note files in a small dialog, then apply only what you choose."
                : "Set the work's first face, release direction, and rights notes by the author's standard.",
            ja: startMode === "manage"
              ? "保存済み作品をすぐ開くか、基準板だけを確認して続きから作業します。"
              : startMode === "import"
                ? "原稿・設定集・権利メモを小さな画面で読み込み、必要な項目だけ作品基準に反映します。"
                : "作品の最初の顔、連載方針、権利メモを作者の基準で決めます。",
            zh: startMode === "manage"
              ? "直接打开已保存作品，或先切换基准板确认后继续工作。"
              : startMode === "import"
                ? "在小窗口中读取正文、设定集和权利备注，只把需要的项目写入作品基准。"
                : "以作者的标准确定作品的第一印象、连载方向和权利备注。",
          })}</p>
        </div>
        <span className="pill blue">{L4(language, {
          ko: startMode === "manage" ? "최근 작품" : startMode === "import" ? "파일 가져오기" : "작품 시작",
          en: startMode === "manage" ? "Recent works" : startMode === "import" ? "File import" : "Work start",
          ja: startMode === "manage" ? "最近の作品" : startMode === "import" ? "ファイル読込" : "作品開始",
          zh: startMode === "manage" ? "最近作品" : startMode === "import" ? "文件导入" : "作品开始",
        })}</span>
      </div>

      <div className="ps-entry-switch" role="tablist" aria-label={L4(language, {
        ko: "작품 시작 방식",
        en: "Work start mode",
        ja: "作品開始方法",
        zh: "作品开始方式",
      })}>
        {([
          ["create", L4(language, { ko: "새 작품", en: "New work", ja: "新規作品", zh: "新作品" })],
          ["manage", L4(language, { ko: "최근 작품", en: "Recent works", ja: "最近の作品", zh: "最近作品" })],
          ["import", L4(language, { ko: "파일 가져오기", en: "Import files", ja: "ファイルから読み込み", zh: "从文件导入" })],
        ] as const).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={startMode === mode}
            className={startMode === mode ? "active" : ""}
            onClick={() => {
              onModeChange(mode);
              if (mode === "import") onFocusImport();
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="ps-start-dna" aria-label={L4(language, {
        ko: "작품 시작 구분",
        en: "Work start distinction",
        ja: "作品開始の区分",
        zh: "作品开始区分",
      })}>
        <div className={`ps-start-dna-card${startMode === "create" ? " active" : ""}`}>
          <Plus size={17} aria-hidden="true" />
          <span>
            <b>{L4(language, { ko: "새 작품 작업대", en: "New work desk", ja: "新規作品の作業台", zh: "新作品工作台" })}</b>
            <small>{L4(language, {
              ko: "제목·연재 방향·권리 메모를 직접 세팅",
              en: "Set title, release direction, and rights notes directly",
              ja: "題名・連載方針・権利メモを直接設定",
              zh: "直接设置标题、发布方向与权利备注",
            })}</small>
          </span>
        </div>
        <div className={`ps-start-dna-card${startMode === "manage" ? " active" : ""}`}>
          <Book size={17} aria-hidden="true" />
          <span>
            <b>{L4(language, { ko: "최근 작품 보관함", en: "Recent work library", ja: "最近作品の保管庫", zh: "最近作品库" })}</b>
            <small>{L4(language, {
              ko: "저장된 작품만 고르고 바로 이어서 작업",
              en: "Pick a saved work and continue from there",
              ja: "保存済み作品だけを選び、続きから作業",
              zh: "只选择已保存作品并继续工作",
            })}</small>
          </span>
        </div>
        <div className={`ps-start-dna-card${startMode === "import" ? " active" : ""}`}>
          <Download size={17} aria-hidden="true" />
          <span>
            <b>{L4(language, { ko: "파일 서랍", en: "File drawer", ja: "ファイル引き出し", zh: "文件抽屉" })}</b>
            <small>{L4(language, {
              ko: "작은 창에서 먼저 읽고, 반영 항목만 선택",
              en: "Read in a small dialog, then apply selected items",
              ja: "小さな画面で先に読み、反映項目だけ選択",
              zh: "先在小窗口读取，再选择写入项",
            })}</small>
          </span>
        </div>
      </div>

      {startMode === "import" ? (
        <div className="ps-import-launch" role="region" aria-label={L4(language, {
          ko: "파일 가져오기 시작",
          en: "Start file import",
          ja: "ファイル読み込み開始",
          zh: "开始文件导入",
        })}>
          <div>
            <strong>{L4(language, { ko: "작품에 바로 섞지 않고 먼저 읽습니다.", en: "Read first, apply later.", ja: "すぐ混ぜず、先に読み込みます。", zh: "先读取，后写入。" })}</strong>
            <p>{L4(language, {
              ko: "가져온 파일은 ‘읽은 자료’로 분류됩니다. 작가가 반영을 누른 항목만 세계관, 캐릭터, 시나리오, 권리/IP 메모에 들어갑니다.",
              en: "Files become imported material. Only accepted items enter world, character, plot, or rights/IP notes.",
              ja: "ファイルは読み込み資料として分類されます。作者が反映した項目だけが世界観・キャラクター・シナリオ・権利/IPメモに入ります。",
              zh: "文件会先成为导入资料。只有作者确认的条目才会进入世界观、角色、剧情或权利/IP备注。",
            })}</p>
          </div>
          <button type="button" className="btn primary" onClick={onFocusImport}>
            <Download size={16} />
            {L4(language, { ko: "가져오기 창 열기", en: "Open import dialog", ja: "読み込み画面を開く", zh: "打开导入窗口" })}
          </button>
        </div>
      ) : null}

      <div className="ps-noa">
        <div className="ps-noa-mark">{L4(language, { ko: "노아", en: "Noa", ja: "Noa", zh: "Noa" })}</div>
        <div>
          <strong>{L4(language, { ko: "질문으로 기준 잡기", en: "Set the basis with questions", ja: "質問で基準を決める", zh: "通过提问确定基准" })}</strong>
          <p>
            {L4(language, {
              ko: "노아는 선택지를 정리하고, 작가가 고른 답만 작품 기준에 남깁니다. 작품의 방향은 항상 작가가 결정합니다.",
              en: "Noa organizes options, and only the author's choices stay on the work basis board. Direction stays with the author.",
              ja: "Noaは選択肢を整理し、作者が選んだ値だけを作品基準板に残します。舵は常に作者が握ります。",
              zh: "Noa 整理选项，只有作者选定的内容会留在作品基准板上。方向始终由作者掌握。",
            })}
          </p>
        </div>
      </div>

      <div className="ps-actions">
        <button
          type="button"
          className="btn primary"
          onClick={onCreateBlankProject}
          disabled={projectStartBusy}
          aria-busy={projectStartBusy}
          data-testid="lg-project-start-empty"
        >
          <Plus size={16} />
          {projectStartBusy
            ? L4(language, { ko: "작품 준비 중", en: "Preparing work", ja: "作品準備中", zh: "正在准备作品" })
            : L4(language, { ko: "새 작품 시작", en: "Start new work", ja: "新規作品を開始", zh: "开始新作品" })}
        </button>
        <button
          type="button"
          className="btn"
          onClick={onContinueWithNoa}
          disabled={projectStartBusy}
          aria-busy={projectStartBusy}
          data-testid="lg-project-start-noa"
        >
          <Sparkle size={16} />
          {L4(language, { ko: "질문으로 기준 잡기", en: "Set the basis with questions", ja: "質問で基準を決める", zh: "通过提问确定基准" })}
        </button>
      </div>
    </>
  );
}
