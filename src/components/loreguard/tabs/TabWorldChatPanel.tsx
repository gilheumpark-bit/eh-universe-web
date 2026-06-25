"use client";

import type { Dispatch, SetStateAction } from "react";
import type { VersionedBackup } from "@/lib/indexeddb-backup";
import type { Message } from "@/lib/studio-types";
import {
  Check,
  Clock,
  Globe,
  Send,
  Sync,
  X,
} from "@/components/loreguard/icons";
import { WORLD_FIELDS } from "./TabWorld.parts";

interface TabWorldChatPanelProps {
  isGenerating: boolean;
  showVersions: boolean;
  backups: VersionedBackup[];
  canRestoreVersion: boolean;
  completeness: number;
  filledCount: number;
  worldMissingCount: number;
  pickedFieldTitle: string;
  filteredMessages: Message[];
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  openVersions: () => void;
  restoreVersion: (timestamp: number) => void;
  adopt: (content: string) => void;
  submit: () => void;
  handleCancel: () => void;
}

export default function TabWorldChatPanel({
  isGenerating,
  showVersions,
  backups,
  canRestoreVersion,
  completeness,
  filledCount,
  worldMissingCount,
  pickedFieldTitle,
  filteredMessages,
  input,
  setInput,
  openVersions,
  restoreVersion,
  adopt,
  submit,
  handleCancel,
}: TabWorldChatPanelProps) {
  return (
    <section className="wd-center">
      <div className="wd-chat card">
        <div className="wd-chat-head">
          <div className="wd-chat-title">
            <Globe size={17} />
            세계관 기준선
            <span className="wd-online">
              <span className={`rdot ${isGenerating ? "amber" : "green"}`} />
              {isGenerating ? "제안 준비 중…" : "노아 어시스턴트"}
            </span>
          </div>
          <button type="button" className="btn ghost" onClick={openVersions}>
            <Clock size={15} />
            버전 기록
          </button>
        </div>

        {showVersions ? (
          <div className="wd-chat-body">
            {backups.length === 0 ? (
              <p className="wd-p wd-muted">저장된 버전 백업이 없습니다.</p>
            ) : (
              backups.map((backup) => (
                <div key={backup.timestamp} className="wd-card wd-card-static wd-version-card">
                  <div className="wd-card-ic wd-tone-green">
                    <Clock size={18} />
                  </div>
                  <div className="wd-card-body">
                    <div className="wd-card-top">
                      <span className="wd-card-title">{backup.label}</span>
                    </div>
                    <div className="wd-card-meta">
                      <span>{new Date(backup.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  {canRestoreVersion ? (
                    <button
                      type="button"
                      className="btn wd-version-restore"
                      onClick={() => restoreVersion(backup.timestamp)}
                    >
                      <Sync size={14} />복원
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="wd-chat-body">
            <div className="wd-context-cue" aria-label="세계관 다음 작업">
              <div>
                <span>현재 기준선</span>
                <b>{completeness}%</b>
                <small>{filledCount}/{WORLD_FIELDS.length} 항목 기록</small>
              </div>
              <div>
                <span>다음 입력</span>
                <b>{pickedFieldTitle}</b>
                <small>{worldMissingCount}개 항목 남음</small>
              </div>
            </div>
            {filteredMessages.length === 0 ? (
              <div className="wd-msg ai">
                <div className="wd-ai-av">EH</div>
                <div className="wd-ai-body">
                  <div className="wd-bubble ai">
                    <p className="wd-p">
                      처음부터 모든 설정을 채울 필요는 없습니다. 핵심 전제, 현재 갈등,
                      주인공의 욕망을 먼저 잡고 필요할 때 세계의 규칙을 넓혀가세요.
                      마음에 드는 답변은 오른쪽 보드의 항목을 고른 뒤 <b>채택</b>으로 저장할 수 있어요.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              filteredMessages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="wd-msg user">
                    <div className="wd-time">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="wd-bubble user">{message.content}</div>
                  </div>
                ) : (
                  <div key={message.id} className="wd-msg ai">
                    <div className="wd-ai-av">EH</div>
                    <div className="wd-ai-body">
                      <div className="wd-time">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="wd-bubble ai">
                        <p className="wd-p wd-prewrap">{message.content}</p>
                        <div className="wd-msg-actions">
                          <button
                            type="button"
                            className="wd-mact"
                            aria-label={`'${pickedFieldTitle}' 항목에 채택`}
                            title={`'${pickedFieldTitle}' 항목에 채택`}
                            onClick={() => adopt(message.content)}
                          >
                            <Check size={15} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              )
            )}
          </div>
        )}

        <div className="wd-input">
          <input
            className="wd-in-field"
            placeholder={`'${pickedFieldTitle}' 기준을 한 문장으로 잡아보세요…`}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            disabled={isGenerating}
          />
          {isGenerating ? (
            <button
              type="button"
              className="wd-in-send"
              aria-label="생성 중지"
              title="생성 중지"
              onClick={handleCancel}
            >
              <X size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="wd-in-send"
              aria-label="전송"
              onClick={submit}
              disabled={!input.trim()}
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
