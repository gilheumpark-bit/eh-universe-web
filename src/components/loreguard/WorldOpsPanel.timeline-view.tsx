"use client";

import { useCallback, useMemo, useState } from "react";
import { useStudio } from "@/app/studio/StudioContext";
import { L4 } from "@/lib/i18n";
import { Check, Clock, Edit, Plus, X } from "@/components/loreguard/icons";
import WorldTimeline from "@/components/studio/WorldTimeline";
import { markExplicitCreativeLog } from "@/hooks/useCreativeProcessAutoTrigger";
import type { AppLanguage, StoryConfig, WorldTimelineEntry } from "@/lib/studio-types";
import { splitPeople, yearSortKey } from "./WorldOpsPanel.helpers";

let cpAlertAt = 0;

function surfaceCpLogFailure(): void {
  const now = Date.now();
  if (now - cpAlertAt < 60_000) return;
  cpAlertAt = now;
  try {
    window.dispatchEvent(
      new CustomEvent("noa:alert", {
        detail: { message: "창작 과정 기록 실패 — 확인서 정확도에 영향", variant: "warning" },
      }),
    );
  } catch {
    // Notification is best-effort; timeline edit itself must stay usable.
  }
}

function fireCpLog(p: Promise<string | null> | null | undefined): void {
  if (!p) {
    surfaceCpLogFailure();
    return;
  }
  p.then((id) => {
    if (id === null) surfaceCpLogFailure();
  }).catch(() => surfaceCpLogFailure());
}

const getCreativeLogger = () =>
  typeof window !== "undefined" ? window.__creativeLogger ?? null : null;

interface EntryDraft {
  year: string;
  event: string;
  people: string;
}

export function WorldOpsTimelineView({
  config,
  language,
  setConfig,
}: {
  config: StoryConfig;
  language: AppLanguage;
  setConfig: ReturnType<typeof useStudio>["setConfig"];
}) {
  const entries = useMemo<WorldTimelineEntry[]>(() => config.worldTimeline ?? [], [config.worldTimeline]);
  const [draft, setDraft] = useState<EntryDraft>({ year: "", event: "", people: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EntryDraft>({ year: "", event: "", people: "" });

  const sorted = useMemo(() => {
    return entries
      .map((e, i) => ({ e, i }))
      .sort((a, b) => (yearSortKey(a.e.year) - yearSortKey(b.e.year)) || (a.i - b.i))
      .map((x) => x.e);
  }, [entries]);

  const characterNames = useMemo(
    () => (config.characters ?? []).map((c) => c.name.trim()).filter(Boolean),
    [config.characters],
  );

  const logEdit = useCallback((entry: WorldTimelineEntry, before: WorldTimelineEntry | null, note: string) => {
    fireCpLog(
      getCreativeLogger()?.logHumanEdit({
        targetType: "world",
        targetId: `worldTimeline:${entry.id}`,
        beforeContent: before ? JSON.stringify(before) : undefined,
        afterContent: JSON.stringify(entry),
        note,
        stage: "world",
      }),
    );
    markExplicitCreativeLog("world");
  }, []);

  const add = useCallback(() => {
    const year = draft.year.trim();
    const event = draft.event.trim();
    if (!year || !event) return;
    const entry: WorldTimelineEntry = {
      id: `wt_${Date.now()}`,
      year,
      event,
      people: splitPeople(draft.people),
    };
    setConfig((prev) => ({ ...prev, worldTimeline: [...(prev.worldTimeline ?? []), entry] }));
    setDraft({ year: "", event: "", people: "" });
    logEdit(entry, null, "world-timeline-add (WorldOpsPanel)");
  }, [draft, setConfig, logEdit]);

  const startEdit = useCallback((e: WorldTimelineEntry) => {
    setEditingId(e.id);
    setEditDraft({ year: e.year, event: e.event, people: (e.people ?? []).join(", ") });
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId) return;
    const year = editDraft.year.trim();
    const event = editDraft.event.trim();
    if (!year || !event) return;
    const before = entries.find((e) => e.id === editingId) ?? null;
    const next: WorldTimelineEntry = {
      id: editingId,
      year,
      event,
      people: splitPeople(editDraft.people),
    };
    setConfig((prev) => ({
      ...prev,
      worldTimeline: (prev.worldTimeline ?? []).map((e) => (e.id === editingId ? next : e)),
    }));
    setEditingId(null);
    logEdit(next, before, "world-timeline-edit (WorldOpsPanel)");
  }, [editingId, editDraft, entries, setConfig, logEdit]);

  const remove = useCallback((id: string) => {
    const before = entries.find((e) => e.id === id) ?? null;
    setConfig((prev) => ({
      ...prev,
      worldTimeline: (prev.worldTimeline ?? []).filter((e) => e.id !== id),
    }));
    if (editingId === id) setEditingId(null);
    if (before) {
      fireCpLog(
        getCreativeLogger()?.logHumanEdit({
          targetType: "world",
          targetId: `worldTimeline:${id}`,
          beforeContent: JSON.stringify(before),
          afterContent: "",
          note: "world-timeline-delete (WorldOpsPanel)",
          stage: "world",
        }),
      );
      markExplicitCreativeLog("world");
    }
  }, [entries, editingId, setConfig]);

  return (
    <div className="wops-stack">
      <div className="pcard">
        <div className="pcard-h">
          <Plus size={15} />
          {L4(language, { ko: "연표 항목 추가", en: "Add timeline entry", ja: "年表項目を追加", zh: "添加年表条目" })}
        </div>
        <div className="wops-form-grid">
          <input
            value={draft.year}
            onChange={(e) => setDraft((d) => ({ ...d, year: e.target.value }))}
            aria-label={L4(language, { ko: "연도", en: "Year", ja: "年", zh: "年份" })}
            placeholder={L4(language, { ko: "연도 (예: 1024)", en: "Year (e.g. 1024)", ja: "年 (例: 1024)", zh: "年份(如 1024)" })}
            className="wops-input"
          />
          <input
            value={draft.event}
            onChange={(e) => setDraft((d) => ({ ...d, event: e.target.value }))}
            onKeyDown={(e) => { if (!e.nativeEvent.isComposing && e.key === "Enter") add(); }}
            aria-label={L4(language, { ko: "사건", en: "Event", ja: "出来事", zh: "事件" })}
            placeholder={L4(language, { ko: "사건 (예: 대붕괴 — 마법 체계 붕괴)", en: "Event", ja: "出来事", zh: "事件" })}
            className="wops-input"
          />
        </div>
        <div className="wops-field-row">
          <input
            value={draft.people}
            onChange={(e) => setDraft((d) => ({ ...d, people: e.target.value }))}
            aria-label={L4(language, { ko: "관련 인물 (쉼표 구분)", en: "Related people (comma-separated)", ja: "関連人物 (カンマ区切り)", zh: "相关人物(逗号分隔)" })}
            placeholder={L4(language, { ko: "관련 인물 — 쉼표 구분", en: "Related people — comma-separated", ja: "関連人物 — カンマ区切り", zh: "相关人物 — 逗号分隔" })}
            className="wops-input wops-field-grow"
          />
          <button type="button" className="btn primary" disabled={!draft.year.trim() || !draft.event.trim()} onClick={add}>
            <Plus size={14} />
            {L4(language, { ko: "추가", en: "Add", ja: "追加", zh: "添加" })}
          </button>
        </div>
        {characterNames.length > 0 && (
          <div className="wops-chip-row wops-chip-row-spaced">
            {characterNames.map((n) => (
              <button
                key={n}
                type="button"
                className="pill blue wops-person-chip"
                title={L4(language, { ko: `관련 인물에 ${n} 추가`, en: `Add ${n} to people`, ja: `関連人物に ${n} を追加`, zh: `把 ${n} 加入相关人物` })}
                onClick={() =>
                  setDraft((d) => {
                    const cur = splitPeople(d.people);
                    if (cur.includes(n)) return d;
                    return { ...d, people: [...cur, n].join(", ") };
                  })
                }
              >
                + {n}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pcard">
        <div className="pcard-h">
          <Clock size={15} />
          {L4(language, { ko: "연표 (시간순)", en: "Timeline (chronological)", ja: "年表 (時系列)", zh: "年表(按时间)" })}
          <span className="pill gray wops-push">
            {sorted.length}
          </span>
        </div>
        {sorted.length === 0 ? (
          <p className="wops-muted-copy">
            {L4(language, {
              ko: "아직 연표 항목이 없습니다. 위에서 연도·사건을 추가하세요.",
              en: "No timeline entries yet. Add a year and event above.",
              ja: "まだ年表項目がありません。上で年と出来事を追加してください。",
              zh: "还没有年表条目。请在上方添加年份和事件。",
            })}
          </p>
        ) : (
          <ol className="wops-timeline-list">
            {sorted.map((e) => (
              <li key={e.id} className="wops-timeline-item">
                <span aria-hidden="true" className="wops-timeline-dot" />
                {editingId === e.id ? (
                  <div className="wops-edit-stack">
                    <div className="wops-edit-grid">
                      <input
                        value={editDraft.year}
                        onChange={(ev) => setEditDraft((d) => ({ ...d, year: ev.target.value }))}
                        aria-label={L4(language, { ko: "연도 수정", en: "Edit year", ja: "年を編集", zh: "编辑年份" })}
                        className="wops-input"
                      />
                      <input
                        value={editDraft.event}
                        onChange={(ev) => setEditDraft((d) => ({ ...d, event: ev.target.value }))}
                        aria-label={L4(language, { ko: "사건 수정", en: "Edit event", ja: "出来事を編集", zh: "编辑事件" })}
                        className="wops-input"
                      />
                    </div>
                    <div className="wops-edit-row">
                      <input
                        value={editDraft.people}
                        onChange={(ev) => setEditDraft((d) => ({ ...d, people: ev.target.value }))}
                        aria-label={L4(language, { ko: "관련 인물 수정 (쉼표 구분)", en: "Edit related people", ja: "関連人物を編集", zh: "编辑相关人物" })}
                        className="wops-input wops-field-grow"
                      />
                      <button type="button" className="btn primary" onClick={saveEdit} disabled={!editDraft.year.trim() || !editDraft.event.trim()}>
                        <Check size={14} />
                        {L4(language, { ko: "저장", en: "Save", ja: "保存", zh: "保存" })}
                      </button>
                      <button type="button" className="btn" onClick={() => setEditingId(null)}>
                        <X size={14} />
                        {L4(language, { ko: "취소", en: "Cancel", ja: "キャンセル", zh: "取消" })}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="wops-entry-row">
                    <div className="wops-entry-year">{e.year}</div>
                    <div className="wops-entry-body">
                      <div className="wops-entry-text">{e.event}</div>
                      {(e.people?.length ?? 0) > 0 && (
                        <div className="wops-chip-row wops-entry-people">
                          {(e.people ?? []).map((p, i) => (
                            <span key={i} className="pill blue">{p}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="eh-icbtn"
                      aria-label={L4(language, { ko: `${e.year} 항목 편집`, en: `Edit entry ${e.year}`, ja: `${e.year} 項目を編集`, zh: `编辑 ${e.year} 条目` })}
                      onClick={() => startEdit(e)}
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      type="button"
                      className="eh-icbtn"
                      aria-label={L4(language, { ko: `${e.year} 항목 삭제`, en: `Delete entry ${e.year}`, ja: `${e.year} 項目を削除`, zh: `删除 ${e.year} 条目` })}
                      onClick={() => remove(e.id)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {(config.worldSimData?.civs?.length ?? 0) > 0 && (
        <div className="pcard">
          <WorldTimeline simData={config.worldSimData || {}} language={language} />
        </div>
      )}
    </div>
  );
}
