"use client";

import type { Dispatch, SetStateAction } from "react";
import type { StudioEntryMode } from "@/lib/studio-entry-links";
import type { AppLanguage } from "@/lib/studio-types";
import { L4 } from "@/lib/i18n";
import type { ProjectDraft } from "@/components/loreguard/ProjectStart.shared";
import { Book, Check, Download, Plus, Sparkle } from "./icons";

interface ProjectStartEntryPanelProps {
  language: AppLanguage;
  startMode: StudioEntryMode;
  draft: ProjectDraft;
  setDraft: Dispatch<SetStateAction<ProjectDraft>>;
  projectStartBusy: boolean;
  onModeChange: (mode: StudioEntryMode) => void;
  onFocusImport: () => void;
  onCreateBlankProject: () => void;
  onContinueWithNoa: () => void;
}

export function ProjectStartEntryPanel({
  language,
  startMode,
  draft,
  setDraft,
  projectStartBusy,
  onModeChange,
  onFocusImport,
  onCreateBlankProject,
  onContinueWithNoa,
}: ProjectStartEntryPanelProps) {
  const workflowSteps = [
    {
      label: L4(language, { ko: "질문", en: "Questions", ja: "質問", zh: "提问" }),
      detail: L4(language, { ko: "작품의 첫 기준을 말로 잡기", en: "Shape the first basis in words", ja: "作品の最初の基準を言葉で作る", zh: "用文字确定作品初始基准" }),
      Icon: Sparkle,
    },
    {
      label: L4(language, { ko: "기준선", en: "Basis", ja: "基準線", zh: "基准线" }),
      detail: L4(language, { ko: "오른쪽 원장에 작가 값만 남기기", en: "Keep only author choices in the ledger", ja: "右の台帳に作者の値だけ残す", zh: "右侧台账只保留作者选择" }),
      Icon: Book,
    },
    {
      label: L4(language, { ko: "작가 승인", en: "Author signoff", ja: "作者承認", zh: "作者确认" }),
      detail: L4(language, { ko: "노아 제안보다 작가 판단을 앞에 두기", en: "Put the author's judgment before Noa suggestions", ja: "Noaの提案より作者の判断を前に置く", zh: "作者判断先于 Noa 建议" }),
      Icon: Check,
    },
    {
      label: L4(language, { ko: "세계관으로", en: "To world board", ja: "世界観へ", zh: "进入世界观" }),
      detail: L4(language, { ko: "다음 탭이 같은 기준을 이어받기", en: "Let the next tab inherit the same basis", ja: "次のタブが同じ基準を引き継ぐ", zh: "下一标签继承同一基准" }),
      Icon: Plus,
    },
  ] as const;

  return (
    <>
      <div className="ps-head">
        <div>
          <div className="kicker">{L4(language, {
            ko: startMode === "manage" ? "작품 보관함" : startMode === "import" ? "파일 가져오기" : "작품 기준선",
            en: startMode === "manage" ? "Project library" : startMode === "import" ? "Import from files" : "Seed of the work",
            ja: startMode === "manage" ? "作品保管庫" : startMode === "import" ? "ファイルから読み込み" : "作品の種",
            zh: startMode === "manage" ? "作品库" : startMode === "import" ? "从文件导入" : "作品的种子",
          })}</div>
          <h1>{L4(language, {
            ko: startMode === "manage" ? "최근 작품 열기" : startMode === "import" ? "파일에서 작품 자료 가져오기" : "작품의 기준선 만들기",
            en: startMode === "manage" ? "Open a Recent Work" : startMode === "import" ? "Import Work Material" : "Start a New Work",
            ja: startMode === "manage" ? "最近の作品を開く" : startMode === "import" ? "作品資料を読み込む" : "新しい作品を始める",
            zh: startMode === "manage" ? "打开最近作品" : startMode === "import" ? "导入作品资料" : "开始新作品",
          })}</h1>
          <p>{L4(language, {
            ko: startMode === "manage"
              ? "저장된 작품을 바로 열거나, 작품 기준만 먼저 확인한 뒤 이어서 작업합니다."
              : startMode === "import"
                ? "원고·설정집·권리 메모 파일을 작은 창에서 읽고, 필요한 항목만 작품 기준에 반영합니다."
                : "첫 3분은 원고가 아니라 작품이 흔들리지 않을 기준을 잡는 시간입니다. 핵심 전제와 갈등, 주인공의 욕망만 잡아도 다음 단계가 훨씬 선명해집니다.",
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
          ko: startMode === "manage" ? "최근 작품" : startMode === "import" ? "파일 가져오기" : "3분 기준선",
          en: startMode === "manage" ? "Recent works" : startMode === "import" ? "File import" : "Work start",
          ja: startMode === "manage" ? "最近の作品" : startMode === "import" ? "ファイル読込" : "作品開始",
          zh: startMode === "manage" ? "最近作品" : startMode === "import" ? "文件导入" : "作品开始",
        })}</span>
      </div>

      <div className="ps-workflow-spine" aria-label={L4(language, {
        ko: "작품 기준선 작업 흐름",
        en: "Work basis workflow",
        ja: "作品基準線の作業フロー",
        zh: "作品基准线工作流程",
      })}>
        <div className="ps-workflow-copy">
          <span>{L4(language, { ko: "작가 결정 흐름", en: "Author decision flow", ja: "作者決定フロー", zh: "作者决策流程" })}</span>
          <b>{L4(language, {
            ko: "노아는 질문하고, 작가는 기준을 확정합니다.",
            en: "Noa asks. The author decides the basis.",
            ja: "Noaが質問し、作者が基準を確定します。",
            zh: "Noa 负责提问，作者确定基准。",
          })}</b>
        </div>
        {workflowSteps.map(({ label, detail, Icon }) => (
          <div key={label} className="ps-workflow-step">
            <Icon size={15} aria-hidden="true" />
            <span>{label}</span>
            <small>{detail}</small>
          </div>
        ))}
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
            <b>{L4(language, { ko: "가볍게 시작", en: "Quick start", ja: "軽く開始", zh: "轻量开始" })}</b>
            <small>{L4(language, {
              ko: "제목과 핵심 전제만 넣고 세계관으로 이동",
              en: "Set title, release direction, and rights notes directly",
              ja: "題名・連載方針・権利メモを直接設定",
              zh: "直接设置标题、发布方向与权利备注",
            })}</small>
          </span>
        </div>
        <div className={`ps-start-dna-card${startMode === "manage" ? " active" : ""}`}>
          <Book size={17} aria-hidden="true" />
          <span>
            <b>{L4(language, { ko: "이어서 작업", en: "Continue work", ja: "続きから作業", zh: "继续工作" })}</b>
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
            <b>{L4(language, { ko: "메모 가져오기", en: "Import notes", ja: "メモ読み込み", zh: "导入笔记" })}</b>
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

      <section className="ps-noa-thread" aria-label={L4(language, {
        ko: "노아 인터뷰",
        en: "Noa interview",
        ja: "Noaインタビュー",
        zh: "Noa 访谈",
      })}>
        <div className="ps-noa-thread-head">
          <div className="ps-noa-mark">{L4(language, { ko: "노아", en: "Noa", ja: "Noa", zh: "Noa" })}</div>
          <div>
            <strong>{L4(language, { ko: "중앙에서 답하면 오른쪽 기준선이 채워집니다.", en: "Answer here and the basis board fills on the side.", ja: "ここで答えると右側の基準線が埋まります。", zh: "在这里回答，右侧基准线会同步填写。" })}</strong>
            <p>{L4(language, {
              ko: "노아가 묻는 순서대로 짧게 적으세요. 오른쪽 양식은 작가가 확인하고 고치는 정리본입니다.",
              en: "Reply briefly in Noa's order. The side form is the author's editable summary.",
              ja: "Noaの順番に短く答えてください。右側フォームは作者が確認・修正する整理版です。",
              zh: "按 Noa 的顺序简短回答。右侧表单是作者确认并修改的整理版。",
            })}</p>
          </div>
          <button
            type="button"
            className="btn primary ps-noa-head-action"
            onClick={onCreateBlankProject}
            disabled={projectStartBusy}
            aria-busy={projectStartBusy}
            data-testid="lg-project-start-head-save"
          >
            <Check size={15} />
            {L4(language, { ko: "저장하고 세계관으로", en: "Save and open world", ja: "保存して世界観へ", zh: "保存并进入世界观" })}
          </button>
        </div>

        <ol className="ps-noa-chat">
          <li className="ps-noa-bubble noa">
            <span>{L4(language, { ko: "질문 1", en: "Question 1", ja: "質問1", zh: "问题1" })}</span>
            <p>{L4(language, {
              ko: "작품을 한 문장으로 부른다면 어떤 이름이 가장 가깝나요?",
              en: "If this work had to be called by one sentence, what title is closest?",
              ja: "この作品を一文で呼ぶなら、どんな題名が近いですか？",
              zh: "如果用一句话称呼这部作品，哪个标题最接近？",
            })}</p>
          </li>
          <li className="ps-noa-answer-item">
            <div className="ps-noa-answer-field">
              <span>{L4(language, { ko: "작품명", en: "Work title", ja: "作品名", zh: "作品名" })}</span>
              <input
                aria-label={L4(language, { ko: "노아 답변 작품명", en: "Noa answer work title", ja: "Noa回答 作品名", zh: "Noa 回答作品名" })}
                value={draft.title}
                maxLength={200}
                onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                placeholder={L4(language, {
                  ko: "예: 회귀한 편집자의 마지막 원고",
                  en: "Example: The Editor's Last Manuscript",
                  ja: "例: 回帰した編集者の最後の原稿",
                  zh: "例：重生编辑的最后一份稿件",
                })}
              />
            </div>
          </li>

          <li className="ps-noa-bubble noa">
            <span>{L4(language, { ko: "질문 2", en: "Question 2", ja: "質問2", zh: "问题2" })}</span>
            <p>{L4(language, {
              ko: "이 세계에서 현실과 다르게 작동하는 규칙, 지금 터진 갈등, 주인공이 원하는 것을 한 번에 말해보세요.",
              en: "Describe the rule that differs from reality, the active conflict, and what the protagonist wants.",
              ja: "現実と違うルール、今起きている対立、主人公の望みをまとめて答えてください。",
              zh: "请一起写出现实中不存在的规则、当前冲突和主角想要的东西。",
            })}</p>
          </li>
          <li className="ps-noa-answer-item">
            <div className="ps-noa-answer-field">
              <span>{L4(language, { ko: "핵심 전제", en: "Core premise", ja: "核心前提", zh: "核心前提" })}</span>
              <textarea
                aria-label={L4(language, { ko: "노아 답변 핵심 전제", en: "Noa answer core premise", ja: "Noa回答 核心前提", zh: "Noa 回答核心前提" })}
                value={draft.premise}
                onChange={(event) => setDraft((prev) => ({ ...prev, premise: event.target.value }))}
                placeholder={L4(language, {
                  ko: "예: 모든 사람의 기억이 매일 지워지는 도시에서, 주인공만 어제의 기록을 볼 수 있다.",
                  en: "Example: In a city where memories reset daily, only the protagonist can read yesterday's records.",
                  ja: "例: すべての記憶が毎日消える都市で、主人公だけが昨日の記録を読める。",
                  zh: "例：在所有人记忆每天重置的城市里，只有主角能读取昨天的记录。",
                })}
              />
            </div>
          </li>
          <li className="ps-noa-answer-item">
            <div className="ps-noa-mid-actions" aria-label={L4(language, {
              ko: "핵심 전제 작성 후 다음 행동",
              en: "Next action after core premise",
              ja: "核心前提作成後の次の操作",
              zh: "核心前提填写后的下一步",
            })}>
              <div>
                <span>{L4(language, { ko: "핵심 전제까지 잡았다면", en: "Once the premise is set", ja: "核心前提まで決まったら", zh: "核心前提确定后" })}</span>
                <b>{L4(language, { ko: "저장하고 세계관 보드에서 넓혀갑니다.", en: "Save it and expand in the world board.", ja: "保存して世界観ボードで広げます。", zh: "保存后在世界观面板中扩展。" })}</b>
              </div>
              <button
                type="button"
                className="btn primary"
                onClick={onCreateBlankProject}
                disabled={projectStartBusy}
                aria-busy={projectStartBusy}
                data-testid="lg-project-start-mid-save"
              >
                <Check size={15} />
                {L4(language, { ko: "저장하고 세계관으로", en: "Save and open world", ja: "保存して世界観へ", zh: "保存并进入世界观" })}
              </button>
            </div>
          </li>

          <li className="ps-noa-bubble noa">
            <span>{L4(language, { ko: "질문 3", en: "Question 3", ja: "質問3", zh: "问题3" })}</span>
            <p>{L4(language, {
              ko: "공동기획, 외부자료, 원작·참고자료처럼 나중에 권리/IP 점검에 남길 단서가 있나요?",
              en: "Are there clues for later rights/IP review, such as co-planning or external references?",
              ja: "共同企画、外部資料、原作・参考資料など、後で権利/IP点検に残す手がかりはありますか？",
              zh: "是否有共同策划、外部资料、原作/参考资料等需要留给后续权利/IP检查的线索？",
            })}</p>
          </li>
          <li className="ps-noa-answer-item">
            <div className="ps-noa-answer-field">
              <span>{L4(language, { ko: "권리/IP 메모", en: "Rights/IP note", ja: "権利/IPメモ", zh: "权利/IP备注" })}</span>
              <textarea
                aria-label={L4(language, { ko: "노아 답변 권리/IP 메모", en: "Noa answer rights/IP note", ja: "Noa回答 権利/IPメモ", zh: "Noa 回答权利/IP备注" })}
                value={draft.rightsNote}
                onChange={(event) => setDraft((prev) => ({ ...prev, rightsNote: event.target.value }))}
                placeholder={L4(language, {
                  ko: "없으면 비워두세요. 오른쪽 기준선에는 ‘필요할 때 보강’으로 남습니다.",
                  en: "Leave blank if none. The side board will keep it as an item to add when needed.",
                  ja: "なければ空欄で構いません。右側基準線には必要時に補強として残ります。",
                  zh: "没有就留空。右侧基准线会保留为需要时补充。",
                })}
              />
            </div>
          </li>
        </ol>

        <div className="ps-noa-routing" aria-live="polite">
          <span>{L4(language, { ko: "반영 위치", en: "Applied to", ja: "反映先", zh: "写入位置" })}</span>
          <b>{L4(language, { ko: "오른쪽 작품 기준선 양식", en: "Side work basis form", ja: "右側の作品基準フォーム", zh: "右侧作品基准表单" })}</b>
        </div>
      </section>

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
            : L4(language, { ko: "기준선 만들기", en: "Create basis", ja: "基準線を作成", zh: "创建基准线" })}
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
