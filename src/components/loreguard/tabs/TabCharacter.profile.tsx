"use client";

import { useState, type CSSProperties } from "react";
import { Check, Edit, Quote, Shield, X } from "@/components/loreguard/icons";
import type {
  AssetPotentialLevel,
  Character,
  CharacterDevelopmentTier,
  NarrativeInfoState,
} from "@/lib/studio-types";
import {
  ASSET_POTENTIAL_LABELS,
  DEVELOPMENT_TIER_LABELS,
  INFO_STATE_LABELS,
  avatarGradient,
  avColor,
  avLetter,
  infoRows,
  splitTraits,
} from "./TabCharacter.shared";

interface CharacterProfileViewProps {
  active: Character;
  activeIndex: number;
  povCharacter?: string;
  editing: boolean;
  activeRels: Array<{ id: string; name: string; kind: string }>;
  onEdit: () => void;
  onDelete: () => void;
  onSave: (patch: Partial<Character>) => void;
  onCancelEdit: () => void;
}

export function CharacterProfileView({
  active,
  activeIndex,
  povCharacter,
  editing,
  activeRels,
  onEdit,
  onDelete,
  onSave,
  onCancelEdit,
}: CharacterProfileViewProps) {
  return (
    <>
      <div className="ch-hero">
        <span className="ch-av lg" style={{ background: avatarGradient(avColor(activeIndex)) }}>
          {avLetter(active.name)}
        </span>
        <div className="ch-hero-body">
          <div className="ch-hero-top">
            <h2 className="ch-name">{active.name}</h2>
            {(povCharacter === active.id || povCharacter === active.name) && (
              <span className="pill blue">POV</span>
            )}
          </div>
          <div className="ch-role">{active.role || "역할 미정"}</div>
          {active.personality && <div className="ch-oneliner">{active.personality}</div>}
        </div>
        {!editing && (
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn" onClick={onEdit}>
              <Edit size={15} strokeWidth={1.6} />
              편집
            </button>
            <button
              type="button"
              className="btn ghost"
              aria-label="인물 삭제"
              onClick={onDelete}
            >
              <X size={15} strokeWidth={1.6} />
              삭제
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <CharForm char={active} onSave={onSave} onCancel={onCancelEdit} />
      ) : (
        <div className="ch-cols">
          <div className="ch-main">
            <div className="ch-sec">
              <div className="ch-sec-h">기본 정보</div>
              {infoRows(active).length > 0 ? (
                <div className="ch-info">
                  {infoRows(active).map(([key, val]) => (
                    <div key={key} className="ch-info-i">
                      <span className="ch-info-k">{key}</span>
                      <span className="ch-info-v">{val}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ch-none">기본 정보가 아직 비어 있습니다. “편집”으로 채우세요.</div>
              )}
            </div>

            <div className="ch-sec">
              <div className="ch-sec-h">성격 키워드</div>
              {splitTraits(active.traits).length > 0 ? (
                <div className="ch-traits">
                  {splitTraits(active.traits).map((trait) => (
                    <span key={trait} className="ch-trait">
                      {trait}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="ch-none">키워드 없음</div>
              )}
            </div>

            <div className="ch-sec">
              <div className="ch-sec-h">
                <Quote size={14} strokeWidth={1.6} />
                말투 · 보이스
              </div>
              {active.speechExample || active.speechStyle ? (
                <div className="ch-voice">
                  {active.speechExample || active.speechStyle}
                  {active.speechExample && active.speechStyle && (
                    <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--ink-3)" }}>
                      {active.speechStyle}
                    </div>
                  )}
                </div>
              ) : (
                <div className="ch-none">말투 정보 없음</div>
              )}
            </div>

            <div className="ch-sec">
              <div className="ch-sec-h">관계</div>
              {activeRels.length > 0 ? (
                <div className="ch-rels">
                  {activeRels.map((relation) => (
                    <div key={relation.id} className="ch-rel">
                      <span className="ch-av xs">{avLetter(relation.name)}</span>
                      <span className="ch-rel-n">{relation.name}</span>
                      <span className="ch-rel-r">{relation.kind}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ch-none">등록된 관계 없음</div>
              )}
            </div>
          </div>

          <div className="ch-side">
            <PotentialCard char={active} />
            <LoreCard char={active} />
          </div>
        </div>
      )}
    </>
  );
}

export function PotentialCard({ char }: { char: Character }) {
  const dna = typeof char.dna === "number" ? Math.max(0, Math.min(100, char.dna)) : null;
  const tone = dna == null ? "gray" : dna >= 80 ? "green" : dna >= 50 ? "amber" : "red";
  return (
    <div className="pcard">
      <div className="pcard-h">
        <Shield size={15} strokeWidth={1.6} />
        서사 잠재력
      </div>
      {dna == null ? (
        <span className="ch-none">아직 평가되지 않음</span>
      ) : (
        <div className="ch-check">
          <div className="ch-check-top">
            <span>DNA 점수</span>
            <b style={{ color: `var(--c-${tone})` }}>{`${dna}`}</b>
          </div>
          <div className="tbar">
            <span style={{ width: `${dna}%`, background: `var(--c-${tone})` }} />
          </div>
        </div>
      )}
    </div>
  );
}

export function LoreCard({ char }: { char: Character }) {
  const rows: Array<[string, string]> = [];
  if (char.symbol) rows.push(["상징", char.symbol]);
  if (char.secret) rows.push(["비밀", char.secret]);
  if (char.externalPerception) rows.push(["타인의 인상", char.externalPerception]);
  if (char.backstory) rows.push(["과거", char.backstory]);
  if (char.assetMemo) rows.push(["자산화 메모", char.assetMemo]);
  if (rows.length === 0) return null;
  return (
    <div className="pcard">
      <div className="pcard-h">
        <Quote size={15} strokeWidth={1.6} />
        서사 디테일
      </div>
      {rows.map(([key, value]) => (
        <div key={key} className="ch-check">
          <div className="ch-check-top">
            <span>{key}</span>
          </div>
          <div className="ch-voice" style={{ fontSize: 13, padding: "10px 13px" }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}

interface CharFormProps {
  char: Character;
  onSave: (patch: Partial<Character>) => void;
  onCancel: () => void;
}

export function CharForm({ char, onSave, onCancel }: CharFormProps) {
  const [name, setName] = useState(char.name);
  const [role, setRole] = useState(char.role);
  const [traits, setTraits] = useState(char.traits ?? "");
  const [personality, setPersonality] = useState(char.personality ?? "");
  const [speechStyle, setSpeechStyle] = useState(char.speechStyle ?? "");
  const [speechExample, setSpeechExample] = useState(char.speechExample ?? "");
  const [appearance, setAppearance] = useState(char.appearance ?? "");
  const [developmentTier, setDevelopmentTier] = useState<CharacterDevelopmentTier>(char.developmentTier ?? "T1");
  const [informationState, setInformationState] = useState<NarrativeInfoState>(char.informationState ?? "unknown");
  const [publicKnowledge, setPublicKnowledge] = useState(char.publicKnowledge ?? "");
  const [privateTruth, setPrivateTruth] = useState(char.privateTruth ?? "");
  const [relationAddress, setRelationAddress] = useState(char.relationAddress ?? "");
  const [honorificRule, setHonorificRule] = useState(char.honorificRule ?? "");
  const [assetPotential, setAssetPotential] = useState<AssetPotentialLevel>(char.assetPotential ?? "none");
  const [assetMemo, setAssetMemo] = useState(char.assetMemo ?? "");

  const labelStyle: CSSProperties = {
    display: "block",
    marginBottom: 12,
  };
  const labelTextStyle: CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    color: "var(--ink-3)",
    marginBottom: 6,
  };
  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    background: "var(--card)",
    border: "1px solid var(--line)",
    borderRadius: 10,
    fontSize: 13.5,
    color: "var(--ink-1)",
    fontFamily: "inherit",
    resize: "vertical",
  };

  const field = (label: string, value: string, set: (value: string) => void, multiline = false) => (
    <label style={labelStyle}>
      <span style={labelTextStyle}>{label}</span>
      {multiline ? (
        <textarea style={inputStyle} rows={2} value={value} onChange={(event) => set(event.target.value)} />
      ) : (
        <input style={inputStyle} value={value} onChange={(event) => set(event.target.value)} />
      )}
    </label>
  );

  const selectField = <T extends string>(
    label: string,
    value: T,
    set: (value: T) => void,
    options: Record<T, string>,
  ) => (
    <label style={labelStyle}>
      <span style={labelTextStyle}>{label}</span>
      <select style={inputStyle} value={value} onChange={(event) => set(event.target.value as T)}>
        {(Object.entries(options) as Array<[T, string]>).map(([key, labelValue]) => (
          <option key={key} value={key}>{labelValue}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="ch-sec" style={{ maxWidth: 640 }}>
      <div className="ch-sec-h">인물 편집</div>
      {field("이름", name, setName)}
      {field("역할", role, setRole)}
      {field("성격 키워드 (쉼표 구분)", traits, setTraits)}
      {field("성격", personality, setPersonality, true)}
      {field("말투 스타일", speechStyle, setSpeechStyle)}
      {field("대표 대사", speechExample, setSpeechExample, true)}
      {field("외형", appearance, setAppearance, true)}
      <div className="ch-sec-h" style={{ marginTop: 18 }}>전문 설계</div>
      {selectField("설계 단계", developmentTier, setDevelopmentTier, DEVELOPMENT_TIER_LABELS)}
      {selectField("정보 상태", informationState, setInformationState, INFO_STATE_LABELS)}
      {field("공개 인식", publicKnowledge, setPublicKnowledge, true)}
      {field("숨은 진실", privateTruth, setPrivateTruth, true)}
      {field("관계 호칭", relationAddress, setRelationAddress)}
      {field("존대 규칙", honorificRule, setHonorificRule, true)}
      {selectField("IP 가능성", assetPotential, setAssetPotential, ASSET_POTENTIAL_LABELS)}
      {field("자산화 메모", assetMemo, setAssetMemo, true)}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button
          type="button"
          className="btn primary"
          onClick={() =>
            onSave({
              name: name.trim() || char.name,
              role: role.trim(),
              traits: traits.trim(),
              personality: personality.trim() || undefined,
              speechStyle: speechStyle.trim() || undefined,
              speechExample: speechExample.trim() || undefined,
              appearance: appearance.trim(),
              developmentTier,
              informationState,
              publicKnowledge: publicKnowledge.trim() || undefined,
              privateTruth: privateTruth.trim() || undefined,
              relationAddress: relationAddress.trim() || undefined,
              honorificRule: honorificRule.trim() || undefined,
              assetPotential,
              assetMemo: assetMemo.trim() || undefined,
            })
          }
        >
          <Check size={15} strokeWidth={1.6} />
          저장
        </button>
        <button type="button" className="btn ghost" onClick={onCancel}>
          <X size={15} strokeWidth={1.6} />
          취소
        </button>
      </div>
    </div>
  );
}
