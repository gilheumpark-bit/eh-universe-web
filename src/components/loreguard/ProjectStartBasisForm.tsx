"use client";

import type { Dispatch, SetStateAction } from "react";
import { L4 } from "@/lib/i18n";
import {
  PublishPlatform,
  type AppLanguage,
  type ProjectReleasePurpose,
  type ProjectRightsStatus,
  type ProjectTargetMarket,
} from "@/lib/studio-types";
import {
  DEFAULT_MARKET_BY_LANGUAGE,
  FORMAT_LABEL_UI,
  PUBLISH_PLATFORM_OPTIONS,
  RELEASE_PURPOSE_LABEL_UI,
  RIGHTS_STATUS_LABEL_UI,
  RIGHTS_STATUS_VALUES,
  TARGET_LANGUAGE_LABEL_UI,
  TARGET_MARKET_LABEL_UI,
  TARGET_MARKET_OPTIONS,
  type ProjectDraft,
} from "@/components/loreguard/ProjectStart.shared";
import { Check, Shield } from "./icons";

interface ProjectStartBasisFormProps {
  language: AppLanguage;
  draft: ProjectDraft;
  setDraft: Dispatch<SetStateAction<ProjectDraft>>;
  visibleMarketOptions: Array<(typeof TARGET_MARKET_OPTIONS)[number]>;
  visiblePlatformOptions: Array<(typeof PUBLISH_PLATFORM_OPTIONS)[number]>;
  projectStartBusy: boolean;
  onSaveOpenWorld: () => void;
}

export function ProjectStartBasisForm({
  language,
  draft,
  setDraft,
  visibleMarketOptions,
  visiblePlatformOptions,
  projectStartBusy,
  onSaveOpenWorld,
}: ProjectStartBasisFormProps) {
  return (
    <>
      <section
        className="ps-release-priority"
        aria-label={L4(language, {
          ko: "세계관 기준선 미리보기",
          en: "Release basis check",
          ja: "出稿基準確認",
          zh: "交付基准检查",
        })}
      >
        <div className="ps-release-priority-head">
          <Shield size={16} />
          <strong>{L4(language, { ko: "세계관 기준선", en: "World basis", ja: "世界観基準", zh: "世界观基准" })}</strong>
          <span>{L4(language, {
            ko: "처음에는 제목, 핵심 전제, 대상 독자만 정해도 충분합니다. 권리/IP와 출고 기준은 이 기준선 위에 천천히 얹습니다.",
            en: "Media, market, platform, and rights status seed the release package.",
            ja: "目標媒体・国・プラットフォーム・権利状態が出稿パッケージの最初の基準です。",
            zh: "目标媒介、市场、平台和权利状态是交付包的初始基准。",
          })}</span>
        </div>
        <div className="ps-release-priority-grid">
          <div>
            <span>{L4(language, { ko: "작품명", en: "Title", ja: "作品名", zh: "作品名" })}</span>
            <b>{draft.title.trim() || L4(language, { ko: "아직 비어 있음", en: "Not set yet", ja: "未入力", zh: "尚未填写" })}</b>
          </div>
          <div>
            <span>{L4(language, { ko: "핵심 전제", en: "Core premise", ja: "核心前提", zh: "核心前提" })}</span>
            <b>{draft.premise.trim() || L4(language, { ko: "세계관에서 이어서 작성", en: "Continue in worldbuilding", ja: "世界観で続けて作成", zh: "在世界观中继续填写" })}</b>
          </div>
          <div>
            <span>{L4(language, { ko: "형태·독자", en: "Format / audience", ja: "形式・読者", zh: "形态/读者" })}</span>
            <b>{L4(language, FORMAT_LABEL_UI[draft.format])} · {L4(language, TARGET_MARKET_LABEL_UI[draft.targetMarket])}</b>
          </div>
          <div>
            <span>{L4(language, { ko: "첫 회차 기준", en: "First episode basis", ja: "初回基準", zh: "首章基准" })}</span>
            <b>{draft.episodeLength.trim() || L4(language, { ko: "분량은 나중에 정해도 됩니다", en: "Can be set later", ja: "後で設定できます", zh: "可稍后设置" })}</b>
          </div>
          <div>
            <span>{L4(language, { ko: "권리/IP", en: "Rights/IP", ja: "権利/IP", zh: "权利/IP" })}</span>
            <b>{draft.rightsNote.trim() || L4(language, { ko: "필요할 때 보강", en: "Add when needed", ja: "必要時に補強", zh: "需要时补充" })}</b>
          </div>
          <div>
            <span>{L4(language, { ko: "다음 단계", en: "Next step", ja: "次の段階", zh: "下一步" })}</span>
            <b>{L4(language, { ko: "저장하고 세계관으로", en: "Save and open world", ja: "保存して世界観へ", zh: "保存并进入世界观" })}</b>
          </div>
        </div>
      </section>

      <div className="ps-form-inline-actions" aria-label={L4(language, {
        ko: "기준선 저장 후 이동",
        en: "Save basis and continue",
        ja: "基準線を保存して移動",
        zh: "保存基准线并继续",
      })}>
        <div>
          <span>{L4(language, { ko: "작성 중에도 바로 이동", en: "Ready while writing", ja: "作成中もすぐ移動", zh: "填写中也可继续" })}</span>
          <b>{L4(language, { ko: "기준선을 저장하고 세계관 보드를 엽니다.", en: "Save the basis and open the world board.", ja: "基準線を保存して世界観ボードを開きます。", zh: "保存基准线并打开世界观面板。" })}</b>
        </div>
        <button
          type="button"
          className="btn primary"
          onClick={onSaveOpenWorld}
          disabled={projectStartBusy}
          aria-busy={projectStartBusy}
          data-testid="project-save-open-world-inline"
        >
          <Check size={15} />
          {L4(language, { ko: "저장하고 세계관으로", en: "Save and open world", ja: "保存して世界観へ", zh: "保存并进入世界观" })}
        </button>
      </div>

      <div className="ps-form">
        <fieldset className="ps-form-group">
          <legend>{L4(language, { ko: "작품 기본", en: "Work basics", ja: "作品基本", zh: "作品基础" })}</legend>
          <div className="ps-form-group-grid">
            <label className="ps-field">
              <span>{L4(language, { ko: "작품명", en: "Title", ja: "作品名", zh: "作品名" })}</span>
              <input
                data-testid="project-title-input"
                value={draft.title}
                onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                placeholder={L4(language, {
                  ko: "예: 회귀한 편집자의 마지막 원고",
                  en: "Example: The Editor's Last Manuscript",
                  ja: "例: 回帰した編集者の最後の原稿",
                  zh: "例：重生编辑的最后一份稿件",
                })}
              />
            </label>
            <label className="ps-field">
              <span>{L4(language, { ko: "출고 형태", en: "Release format", ja: "出稿形式", zh: "交付形态" })}</span>
              <select
                data-testid="project-format-select"
                value={draft.format}
                onChange={(event) => setDraft((prev) => ({ ...prev, format: event.target.value as ProjectDraft["format"] }))}
              >
                <option value="novel">{L4(language, FORMAT_LABEL_UI.novel)}</option>
                <option value="webtoon">{L4(language, FORMAT_LABEL_UI.webtoon)}</option>
                <option value="drama">{L4(language, FORMAT_LABEL_UI.drama)}</option>
                <option value="game">{L4(language, FORMAT_LABEL_UI.game)}</option>
              </select>
            </label>
            <label className="ps-field">
              <span>{L4(language, { ko: "대상 언어권", en: "Target language", ja: "対象言語圏", zh: "目标语言圈" })}</span>
              <select
                data-testid="project-target-language-select"
                value={draft.targetLanguage}
                onChange={(event) => {
                  const targetLanguage = event.target.value as ProjectDraft["targetLanguage"];
                  setDraft((prev) => ({
                    ...prev,
                    targetLanguage,
                    targetMarket:
                      prev.targetMarket === "GLOBAL" ||
                      TARGET_MARKET_OPTIONS.some((option) => option.value === prev.targetMarket && option.lang === targetLanguage)
                        ? prev.targetMarket
                        : DEFAULT_MARKET_BY_LANGUAGE[targetLanguage],
                    publishPlatform:
                      prev.publishPlatform === PublishPlatform.NONE ||
                      PUBLISH_PLATFORM_OPTIONS.some((option) => option.value === prev.publishPlatform && option.lang === targetLanguage)
                        ? prev.publishPlatform
                        : PublishPlatform.NONE,
                  }));
                }}
              >
                <option value="KO">{L4(language, TARGET_LANGUAGE_LABEL_UI.KO)}</option>
                <option value="EN">{L4(language, TARGET_LANGUAGE_LABEL_UI.EN)}</option>
                <option value="JP">{L4(language, TARGET_LANGUAGE_LABEL_UI.JP)}</option>
                <option value="CN">{L4(language, TARGET_LANGUAGE_LABEL_UI.CN)}</option>
              </select>
            </label>
          </div>
        </fieldset>
        <fieldset className="ps-form-group wide">
          <legend>{L4(language, { ko: "창작 기준", en: "Creative basis", ja: "創作基準", zh: "创作基准" })}</legend>
          <div className="ps-form-group-grid">
            <label className="ps-field wide">
              <span>{L4(language, { ko: "핵심 전제", en: "Core premise", ja: "核心前提", zh: "核心前提" })}</span>
              <textarea
                data-testid="project-core-premise-input"
                value={draft.premise}
                onChange={(event) => setDraft((prev) => ({ ...prev, premise: event.target.value }))}
                placeholder={L4(language, {
                  ko: "이 세계에서 현실과 다른 점, 지금 터진 갈등, 주인공이 원하는 것을 한두 문장으로 적습니다.",
                  en: "Write one or two sentences about the world and conflict this work begins from.",
                  ja: "この作品がどんな世界と対立から始まるか、1〜2文で書きます。",
                  zh: "用一两句话写出作品从怎样的世界与冲突开始。",
                })}
              />
            </label>
            <label className="ps-field wide">
              <span>{L4(language, { ko: "권리/IP 메모", en: "Rights/IP notes", ja: "権利/IPメモ", zh: "权利/IP备注" })}</span>
              <textarea
                data-testid="project-rights-memo-input"
                value={draft.rightsNote}
                onChange={(event) => setDraft((prev) => ({ ...prev, rightsNote: event.target.value }))}
                placeholder={L4(language, {
                  ko: "공동기획, 외부자료, 원작·참고자료, 상업 이용 예정 여부가 있으면 적습니다. 없으면 비워도 됩니다.",
                  en: "Note original author, co-planning, external materials and commercial-use plans.",
                  ja: "原作者、共同企画、外部資料、商用利用予定の有無を書きます。",
                  zh: "记录原作者、共同策划、外部资料以及商业使用计划。",
                })}
              />
            </label>
          </div>
        </fieldset>
        <fieldset className="ps-form-group">
          <legend>{L4(language, { ko: "출고 기준", en: "Release basis", ja: "出稿基準", zh: "交付基准" })}</legend>
          <div className="ps-form-group-grid">
            <label className="ps-field">
              <span>{L4(language, { ko: "국가·언어권 기준", en: "Market basis", ja: "国・言語圏基準", zh: "国家/语言圈基准" })}</span>
              <select
                data-testid="project-target-market-select"
                value={draft.targetMarket}
                onChange={(event) => setDraft((prev) => ({ ...prev, targetMarket: event.target.value as ProjectTargetMarket }))}
              >
                {visibleMarketOptions.map((option) => (
                  <option key={option.value} value={option.value}>{L4(language, TARGET_MARKET_LABEL_UI[option.value])}</option>
                ))}
              </select>
            </label>
            <label className="ps-field">
              <span>{L4(language, { ko: "출고 목적", en: "Release purpose", ja: "出稿目的", zh: "交付目的" })}</span>
              <select
                data-testid="project-release-purpose-select"
                value={draft.releasePurpose}
                onChange={(event) => setDraft((prev) => ({ ...prev, releasePurpose: event.target.value as ProjectReleasePurpose }))}
              >
                <option value="serial">{L4(language, RELEASE_PURPOSE_LABEL_UI.serial)}</option>
                <option value="contest">{L4(language, RELEASE_PURPOSE_LABEL_UI.contest)}</option>
                <option value="publisher">{L4(language, RELEASE_PURPOSE_LABEL_UI.publisher)}</option>
                <option value="ip_pitch">{L4(language, RELEASE_PURPOSE_LABEL_UI.ip_pitch)}</option>
                <option value="private_archive">{L4(language, RELEASE_PURPOSE_LABEL_UI.private_archive)}</option>
              </select>
            </label>
            <label className="ps-field">
              <span>{L4(language, { ko: "출고 플랫폼", en: "Release platform", ja: "出稿プラットフォーム", zh: "交付平台" })}</span>
              <select
                data-testid="project-publish-platform-select"
                value={draft.publishPlatform}
                onChange={(event) => setDraft((prev) => ({ ...prev, publishPlatform: event.target.value as PublishPlatform }))}
              >
                {visiblePlatformOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="ps-field">
              <span>{L4(language, { ko: "권리 상태", en: "Rights status", ja: "権利状態", zh: "权利状态" })}</span>
              <select
                data-testid="project-rights-status-select"
                value={draft.rightsStatus}
                onChange={(event) => setDraft((prev) => ({ ...prev, rightsStatus: event.target.value as ProjectRightsStatus }))}
              >
                {RIGHTS_STATUS_VALUES.map((value) => (
                  <option key={value} value={value}>{L4(language, RIGHTS_STATUS_LABEL_UI[value])}</option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
        <fieldset className="ps-form-group">
          <legend>{L4(language, { ko: "연재 계획", en: "Serial plan", ja: "連載計画", zh: "连载计划" })}</legend>
          <div className="ps-form-group-grid">
            <label className="ps-field">
              <span>{L4(language, { ko: "목표 회차", en: "Target episodes", ja: "目標話数", zh: "目标章节数" })}</span>
              <input
                data-testid="project-total-episodes-input"
                value={draft.totalEpisodes}
                onChange={(event) => setDraft((prev) => ({ ...prev, totalEpisodes: event.target.value }))}
                placeholder={L4(language, { ko: "예: 100화", en: "Example: 100 episodes", ja: "例: 100話", zh: "例：100章" })}
              />
            </label>
            <label className="ps-field">
              <span>{L4(language, { ko: "회차당 분량", en: "Episode length", ja: "1話あたり分量", zh: "单章篇幅" })}</span>
              <input
                data-testid="project-episode-length-input"
                value={draft.episodeLength}
                onChange={(event) => setDraft((prev) => ({ ...prev, episodeLength: event.target.value }))}
                placeholder={L4(language, { ko: "예: 5,500-7,000자", en: "Example: 5,500-7,000 characters", ja: "例: 5,500-7,000字", zh: "例：5,500-7,000字" })}
              />
            </label>
            <label className="ps-field wide">
              <span>{L4(language, { ko: "연재·출고 주기", en: "Release cadence", ja: "連載・出稿周期", zh: "连载/交付周期" })}</span>
              <input
                data-testid="project-schedule-input"
                value={draft.releaseCadence}
                onChange={(event) => setDraft((prev) => ({ ...prev, releaseCadence: event.target.value }))}
                placeholder={L4(language, {
                  ko: "예: 주 5회, 시즌 단위, 공모전 제출",
                  en: "Example: 5 times a week, by season, contest submission",
                  ja: "例: 週5回、シーズン単位、公募提出",
                  zh: "例：每周5更、按季、比赛提交",
                })}
              />
            </label>
          </div>
        </fieldset>
        <div className="ps-actions ps-form-actions" aria-label={L4(language, {
          ko: "작품 기준 저장",
          en: "Save work basis",
          ja: "作品基準の保存",
          zh: "保存作品基准",
        })}>
          <button
            type="button"
            className="btn primary"
            onClick={onSaveOpenWorld}
            disabled={projectStartBusy}
            aria-busy={projectStartBusy}
            data-testid="project-save-open-world"
          >
            <Check size={15} />
            {L4(language, { ko: "저장하고 세계관으로", en: "Save and open world", ja: "保存して世界観へ", zh: "保存并进入世界观" })}
          </button>
        </div>
      </div>
    </>
  );
}
