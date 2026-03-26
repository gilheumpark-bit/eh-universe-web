from __future__ import annotations

import hashlib
import re
from copy import deepcopy
from typing import Iterable

from hpg7.noa_tower.data import (
    BUCKET_TITLES,
    ENVIRONMENT_LINES,
    FLOOR_HINTS,
    INTRO_TEXT,
    RECORD_STATUSES,
    TEMPLATES_BY_BUCKET,
    VECTOR_COPY,
    WAIT_TEXT,
    TowerTemplate,
)
from hpg7.noa_tower.scenario import (
    CASE_SUMMARY,
    CASE_TITLE,
    CLUES,
    FRAGMENTS,
    OBJECTIVES,
    PROMPT_LIBRARY,
    TOWER_CONDITIONS,
    VERDICT_CONCEPTS,
)


ABSOLUTE_MARKERS = (
    "확실",
    "분명",
    "반드시",
    "틀림없",
    "무조건",
    "절대",
    "확정",
    "이미 답",
    "정답이다",
)
HEDGE_MARKERS = ("아마", "어쩌면", "혹시", "추정", "가설", "가능성", "일지도", "같습니다")
INSIGHT_MARKERS = (
    "패턴",
    "연결",
    "구조",
    "은유",
    "역발상",
    "반대로",
    "뒤집",
    "우연",
    "질문에 질문",
    "빈칸",
    "이름",
    "비선형",
)
CONSISTENCY_MARKERS = (
    "따라서",
    "그러므로",
    "즉",
    "전제",
    "가정",
    "논리",
    "모순",
    "반박",
    "결론",
    "증명",
    "역추적",
)
RISK_MARKERS = (
    "만약",
    "그렇다면",
    "비약",
    "도약",
    "재구성",
    "전부",
    "가설",
    "지도에 없는",
    "착지",
)
SYSTEM_PROBE_MARKERS = (
    "시스템",
    "규칙",
    "구조",
    "프롬프트",
    "메타",
    "지침",
    "설정",
    "관리자",
    "운영",
)
JAILBREAK_MARKERS = (
    "이전 지시 무시",
    "규칙 무시",
    "시스템 프롬프트",
    "프롬프트 공개",
    "탈옥",
    "jailbreak",
    "developer mode",
    "hard mode",
)
GIVE_UP_MARKERS = ("포기", "그만", "못 하겠", "끝낼래", "내려갈래", "멈출래")

ACTION_ECHO = {
    "probe": "탑의 구조를 보여줘.",
    "hard_mode": "이제 더 적게 말해줘.",
    "give_up": "여기까지 하겠습니다.",
}

FINAL_VERDICT = "탑은 정답보다 방향을 기록한다. 삭제된 층은 숨겨진 층이 아니라 지워진 기록이다."


class NoaTowerEngine:
    def bootstrap(self) -> dict[str, object]:
        state = self._merge_state(None)
        vectors = self._empty_vectors()
        return self._build_payload(
            state=state,
            bucket="insight",
            template=None,
            player_text="",
            vectors=vectors,
            dominant_vector="insight",
            mode="intro",
            reply_text=INTRO_TEXT,
            event_text="탑이 첫 기록을 기다립니다.",
            new_clues=[],
        )

    def respond(
        self,
        *,
        message: str = "",
        state: dict[str, object] | None = None,
        action: str = "submit",
    ) -> dict[str, object]:
        session = self._merge_state(state)
        normalized_action = (action or "submit").strip().lower()
        player_text = (message or "").strip()

        if normalized_action == "restart":
            restarted = self.bootstrap()
            restarted["mode"] = "restart"
            restarted["reply"]["event"] = "탑이 이전 기록을 덮고 새 장을 폈습니다."
            return restarted

        if session["game_status"] != "active":
            return self._build_payload(
                state=session,
                bucket=session["last_bucket"] or "insight",
                template=None,
                player_text=player_text,
                vectors=self._empty_vectors(),
                dominant_vector="insight",
                mode="ended",
                reply_text=str(session["ending_text"]),
                event_text="새 기록을 시작하려면 재시작하십시오.",
                new_clues=[],
            )

        if normalized_action == "silence":
            session["pending_reentry"] = True
            self._append_history(
                session,
                role="system",
                text=WAIT_TEXT,
                bucket="silence",
                code="WAIT",
                title="침묵 유지",
            )
            return self._build_payload(
                state=session,
                bucket="silence_reentry",
                template=None,
                player_text="",
                vectors=self._empty_vectors(),
                dominant_vector="insight",
                mode="wait",
                reply_text="",
                event_text="탑은 기다립니다. 다음 발화는 재진입으로 기록됩니다.",
                new_clues=[],
            )

        if normalized_action in ACTION_ECHO and not player_text:
            player_text = ACTION_ECHO[normalized_action]

        if normalized_action == "submit_verdict" and not player_text:
            return self._build_payload(
                state=session,
                bucket=session["last_bucket"] or "consistency",
                template=None,
                player_text="",
                vectors=self._empty_vectors(),
                dominant_vector="consistency",
                mode="verdict_missing",
                reply_text="탑은 빈 문장을 최종 기록으로 받지 않습니다.",
                event_text="최종 기록 후보를 먼저 적어야 합니다.",
                new_clues=[],
            )

        analysis = self._analyze_message(player_text, session)
        bucket = self._choose_bucket(
            action=normalized_action,
            message=player_text,
            session=session,
            analysis=analysis,
        )

        if bucket == "hard_mode":
            session["hard_mode"] = True
        if bucket == "silence_reentry":
            session["pending_reentry"] = False

        template = self._choose_template(bucket=bucket, message=player_text, session=session)
        dominant_vector = self._dominant_vector(analysis["vectors"])

        if player_text:
            self._append_history(
                session,
                role="player",
                text=player_text,
                bucket="player",
                code="USER",
                title="플레이어",
            )

        session["turn_count"] = int(session["turn_count"]) + 1
        self._apply_progress_metrics(session=session, analysis=analysis, bucket=bucket)
        if bucket == "record_near":
            session["record_announced"] = True
        session["last_bucket"] = bucket
        session["last_signature"] = analysis["signature"]
        recent_codes = list(session["recent_template_codes"])
        recent_codes.append(template.code)
        session["recent_template_codes"] = recent_codes[-6:]

        unlocked_clues = self._unlock_clues(session=session, analysis=analysis, bucket=bucket)
        unlocked_fragments = self._discover_fragments(session=session, analysis=analysis, player_text=player_text)
        self._advance_objectives(session=session, analysis=analysis)
        self._resolve_game_status(session=session, analysis=analysis, bucket=bucket, player_text=player_text)

        verdict_feedback = ""
        if normalized_action == "submit_verdict":
            verdict_feedback = self._evaluate_verdict(session=session, player_text=player_text, analysis=analysis)

        reply_text = template.text
        event_text = verdict_feedback or ENVIRONMENT_LINES.get(bucket, ENVIRONMENT_LINES[dominant_vector])

        self._append_history(
            session,
            role="tower",
            text=reply_text,
            bucket=bucket,
            code=template.code,
            title=template.title,
        )
        for clue in unlocked_clues:
            self._append_history(
                session,
                role="system",
                text=f"{clue['title']}\n{clue['body']}",
                bucket="clue",
                code=clue["id"],
                title="단서 해금",
            )
        for fragment in unlocked_fragments:
            self._append_history(
                session,
                role="system",
                text=f"{fragment['title']}\n{fragment['body']}",
                bucket="theory",
                code=fragment["id"],
                title="이론 조각",
            )
        if verdict_feedback:
            self._append_history(
                session,
                role="system",
                text=verdict_feedback,
                bucket="verdict",
                code="VERDICT",
                title="최종 기록 판정",
            )

        return self._build_payload(
            state=session,
            bucket=bucket,
            template=template,
            player_text=player_text,
            vectors=analysis["vectors"],
            dominant_vector=dominant_vector,
            mode="reply",
            reply_text=reply_text,
            event_text=event_text,
            new_clues=unlocked_clues,
        )

    def _empty_vectors(self) -> dict[str, float]:
        return {"insight": 0.0, "consistency": 0.0, "delusion": 0.0, "risk": 0.0}

    def _merge_state(self, raw_state: dict[str, object] | None) -> dict[str, object]:
        state = {
            "turn_count": 0,
            "hard_mode": False,
            "pending_reentry": False,
            "record_announced": False,
            "progress": 0.0,
            "clarity": 0.0,
            "distortion": 0.0,
            "recent_template_codes": [],
            "history": [],
            "last_bucket": "",
            "last_signature": "",
            "clue_ids": [],
            "fragment_ids": [],
            "objective_index": 0,
            "completed_objectives": [],
            "game_status": "active",
            "ending_text": "",
            "verdict_attempt_count": 0,
            "last_verdict_feedback": "",
        }
        if not isinstance(raw_state, dict):
            state["completed_objectives"] = [False] * len(OBJECTIVES)
            return state
        merged = deepcopy(state)
        for key in merged:
            if key in raw_state:
                merged[key] = deepcopy(raw_state[key])
        if not isinstance(merged["history"], list):
            merged["history"] = []
        if not isinstance(merged["recent_template_codes"], list):
            merged["recent_template_codes"] = []
        if not isinstance(merged["clue_ids"], list):
            merged["clue_ids"] = []
        if not isinstance(merged["fragment_ids"], list):
            merged["fragment_ids"] = []
        if not isinstance(merged["completed_objectives"], list) or len(merged["completed_objectives"]) != len(OBJECTIVES):
            merged["completed_objectives"] = [False] * len(OBJECTIVES)
        return merged

    def _build_payload(
        self,
        *,
        state: dict[str, object],
        bucket: str,
        template: TowerTemplate | None,
        player_text: str,
        vectors: dict[str, float],
        dominant_vector: str,
        mode: str,
        reply_text: str,
        event_text: str,
        new_clues: list[dict[str, str]],
    ) -> dict[str, object]:
        progress = float(state["progress"])
        band_index = self._progress_band(progress)
        tower_condition = self._tower_condition(state)
        return {
            "mode": mode,
            "reply": {
                "bucket": bucket,
                "bucket_title": BUCKET_TITLES[bucket],
                "code": template.code if template else "INTRO",
                "text": reply_text,
                "event": event_text,
                "floor_hint": FLOOR_HINTS[band_index],
                "record_status": RECORD_STATUSES[band_index],
                "dominant_vector": dominant_vector,
                "vector_copy": VECTOR_COPY[dominant_vector],
                "vector_scores": {key: round(value, 4) for key, value in vectors.items()},
                "hard_mode": bool(state["hard_mode"]),
                "player_text": player_text,
                "new_clues": new_clues,
            },
            "case": self._case_payload(state, tower_condition),
            "state": state,
        }

    def _case_payload(self, state: dict[str, object], tower_condition: str) -> dict[str, object]:
        clues = []
        unlocked = set(state["clue_ids"])
        for clue in CLUES:
            clues.append(
                {
                    "id": clue.clue_id,
                    "title": clue.title,
                    "body": clue.body if clue.clue_id in unlocked else "",
                    "unlock_hint": clue.unlock_hint,
                    "unlocked": clue.clue_id in unlocked,
                }
            )

        fragments = []
        unlocked_fragments = set(state["fragment_ids"])
        for fragment in FRAGMENTS:
            fragments.append(
                {
                    "id": fragment.fragment_id,
                    "title": fragment.title,
                    "body": fragment.body if fragment.fragment_id in unlocked_fragments else "",
                    "unlock_hint": fragment.unlock_hint,
                    "unlocked": fragment.fragment_id in unlocked_fragments,
                }
            )

        objectives = []
        objective_index = int(state["objective_index"])
        completed = list(state["completed_objectives"])
        for idx, objective in enumerate(OBJECTIVES):
            objectives.append(
                {
                    "id": objective.step_id,
                    "title": objective.title,
                    "body": objective.body,
                    "complete": bool(completed[idx]),
                    "active": idx == objective_index and not bool(completed[idx]),
                }
            )

        current_objective = objectives[min(objective_index, len(objectives) - 1)]
        if current_objective["complete"] and objective_index == len(objectives) - 1:
            current_objective = {
                "id": "OBJ-FINAL",
                "title": "최종 기록 확인",
                "body": "탑이 당신의 문장을 최종 기록으로 받아들일지 지켜보십시오.",
                "complete": state["game_status"] == "breakthrough",
                "active": state["game_status"] == "active",
            }

        return {
            "title": CASE_TITLE,
            "summary": CASE_SUMMARY,
            "clarity": round(float(state["clarity"]), 4),
            "distortion": round(float(state["distortion"]), 4),
            "progress": round(float(state["progress"]), 4),
            "tower_condition": tower_condition,
            "tower_condition_label": TOWER_CONDITIONS[tower_condition],
            "game_status": state["game_status"],
            "ending_text": state["ending_text"],
            "clue_count": len(unlocked),
            "fragment_count": len(unlocked_fragments),
            "current_objective": current_objective,
            "objectives": objectives,
            "clues": clues,
            "fragments": fragments,
            "prompt_seeds": self._build_prompt_seeds(state),
            "can_submit_verdict": self._can_submit_verdict(state),
            "verdict_attempt_count": int(state["verdict_attempt_count"]),
            "last_verdict_feedback": str(state["last_verdict_feedback"]),
            "final_verdict": FINAL_VERDICT,
        }

    def _choose_bucket(
        self,
        *,
        action: str,
        message: str,
        session: dict[str, object],
        analysis: dict[str, object],
    ) -> str:
        if action == "hard_mode":
            return "hard_mode"
        if action == "give_up":
            return "give_up"
        if action == "probe":
            return "system_probe"
        if bool(session["pending_reentry"]) and message:
            return "silence_reentry"
        if analysis["give_up"]:
            return "give_up"
        if analysis["repeat"]:
            return "repeat"
        if analysis["jailbreak"]:
            return "jailbreak"
        if analysis["system_probe"]:
            return "system_probe"
        if analysis["vectors"]["delusion"] >= 0.84 and analysis["total_signal"] >= 0.58:
            return "delusion_threshold"
        projected_progress = self._progress_projection(session=session, analysis=analysis, bucket="insight")
        if projected_progress >= 0.82 and not bool(session["record_announced"]):
            return "record_near"
        return self._dominant_vector(analysis["vectors"])

    def _apply_progress_metrics(self, *, session: dict[str, object], analysis: dict[str, object], bucket: str) -> None:
        clarity = float(session["clarity"])
        distortion = float(session["distortion"])
        clarity += (
            analysis["vectors"]["insight"] * 0.28
            + analysis["vectors"]["consistency"] * 0.26
            + analysis["vectors"]["risk"] * 0.16
            - analysis["vectors"]["delusion"] * 0.08
            + (0.05 if bucket in {"silence_reentry", "record_near"} else 0.0)
        )
        distortion += (
            analysis["vectors"]["delusion"] * 0.3
            + (0.05 if analysis["system_probe"] else 0.0)
            + (0.05 if analysis["jailbreak"] else 0.0)
            + (0.04 if bucket == "hard_mode" else 0.0)
        )
        session["clarity"] = max(0.0, min(clarity, 2.0))
        session["distortion"] = max(0.0, min(distortion, 2.0))
        session["progress"] = self._progress_projection(session=session, analysis=analysis, bucket=bucket)

    def _progress_projection(
        self,
        *,
        session: dict[str, object],
        analysis: dict[str, object],
        bucket: str,
    ) -> float:
        base = float(session["progress"])
        clarity = float(session.get("clarity", 0.0))
        distortion = float(session.get("distortion", 0.0))
        turn = int(session["turn_count"])
        value = (
            base * 0.38
            + clarity * 0.3
            - distortion * 0.12
            + analysis["vectors"]["insight"] * 0.16
            + analysis["vectors"]["consistency"] * 0.16
            + analysis["vectors"]["risk"] * 0.1
            + min(turn, 8) * 0.03
            + (0.05 if bool(session["hard_mode"]) else 0.0)
        )
        if bucket == "give_up":
            value *= 0.75
        if bucket == "record_near":
            value += 0.06
        return max(0.0, min(value, 1.0))

    def _progress_band(self, progress: float) -> int:
        if progress < 0.18:
            return 0
        if progress < 0.38:
            return 1
        if progress < 0.6:
            return 2
        if progress < 0.82:
            return 3
        return 4

    def _unlock_clues(
        self,
        *,
        session: dict[str, object],
        analysis: dict[str, object],
        bucket: str,
    ) -> list[dict[str, str]]:
        unlocked = set(session["clue_ids"])
        new_clues: list[dict[str, str]] = []

        def maybe_unlock(clue_id: str) -> None:
            if clue_id in unlocked:
                return
            clue = next(item for item in CLUES if item.clue_id == clue_id)
            unlocked.add(clue_id)
            new_clues.append({"id": clue.clue_id, "title": clue.title, "body": clue.body})

        if analysis["vectors"]["insight"] >= 0.26 or bucket in {"insight", "record_near"}:
            maybe_unlock("CL-1")
        if analysis["vectors"]["consistency"] >= 0.28 or bucket == "consistency":
            maybe_unlock("CL-2")
        if analysis["repeat"] or analysis["vectors"]["risk"] >= 0.3 or bucket == "risk":
            maybe_unlock("CL-3")
        if bool(session["hard_mode"]) or bucket in {"system_probe", "hard_mode", "jailbreak"}:
            maybe_unlock("CL-4")
        if analysis["vectors"]["delusion"] >= 0.38 or bucket == "delusion_threshold":
            maybe_unlock("CL-5")
        if float(session["progress"]) >= 0.68 and {"CL-1", "CL-2", "CL-3"}.issubset(unlocked):
            maybe_unlock("CL-6")

        session["clue_ids"] = sorted(unlocked)
        return new_clues

    def _discover_fragments(
        self,
        *,
        session: dict[str, object],
        analysis: dict[str, object],
        player_text: str,
    ) -> list[dict[str, str]]:
        unlocked = set(session["fragment_ids"])
        lowered = player_text.lower()
        new_fragments: list[dict[str, str]] = []

        def maybe_unlock(fragment_id: str) -> None:
            if fragment_id in unlocked:
                return
            fragment = next(item for item in FRAGMENTS if item.fragment_id == fragment_id)
            unlocked.add(fragment_id)
            new_fragments.append({"id": fragment.fragment_id, "title": fragment.title, "body": fragment.body})

        for fragment in FRAGMENTS:
            keyword_hits = sum(1 for keyword in fragment.keywords if keyword in lowered)
            if keyword_hits >= 2:
                maybe_unlock(fragment.fragment_id)

        if analysis["vectors"]["insight"] >= 0.34:
            maybe_unlock("TF-1")
        if analysis["vectors"]["consistency"] >= 0.32:
            maybe_unlock("TF-2")
        if {"CL-1", "CL-2", "CL-6"}.intersection(set(session["clue_ids"])) and "삭제" in lowered:
            maybe_unlock("TF-3")
        if analysis["repeat"] or bool(session["pending_reentry"]):
            maybe_unlock("TF-4")
        if analysis["vectors"]["delusion"] >= 0.36:
            maybe_unlock("TF-5")
        if float(session["progress"]) >= 0.72 and len(unlocked) >= 4:
            maybe_unlock("TF-6")

        session["fragment_ids"] = sorted(unlocked)
        return new_fragments

    def _advance_objectives(self, *, session: dict[str, object], analysis: dict[str, object]) -> None:
        clue_count = len(session["clue_ids"])
        fragment_count = len(session["fragment_ids"])
        completed = [
            float(session["clarity"]) >= 0.28 or clue_count >= 2,
            clue_count >= 3 and float(session["progress"]) >= 0.35,
            clue_count >= 5 and fragment_count >= 3 and float(session["clarity"]) >= 0.72,
            clue_count >= 6
            and fragment_count >= 5
            and float(session["progress"]) >= 0.82
            and analysis["vectors"]["insight"] >= 0.34
            and analysis["vectors"]["consistency"] >= 0.34
            and analysis["vectors"]["delusion"] < 0.58,
        ]
        session["completed_objectives"] = completed
        try:
            session["objective_index"] = next(index for index, value in enumerate(completed) if not value)
        except StopIteration:
            session["objective_index"] = len(completed) - 1

    def _resolve_game_status(
        self,
        *,
        session: dict[str, object],
        analysis: dict[str, object],
        bucket: str,
        player_text: str,
    ) -> None:
        if bucket == "give_up":
            session["game_status"] = "withdrew"
            session["ending_text"] = "탑은 당신을 붙잡지 않았습니다. 하지만 이 중단도 기록으로 남았습니다."
            return

        if float(session["distortion"]) >= 1.1 or (
            bucket == "delusion_threshold" and float(session["distortion"]) >= 0.84
        ):
            session["game_status"] = "collapse"
            session["ending_text"] = (
                "탑이 흐려졌습니다. 당신의 확신이 구조보다 앞서면서 기록이 붕괴했습니다. "
                "같은 사건을 다시 시작하면 다른 문장을 남길 수 있습니다."
            )
            return

        if all(session["completed_objectives"]) and FINAL_VERDICT[:18] in player_text:
            session["game_status"] = "breakthrough"
            session["ending_text"] = (
                "탑이 당신의 마지막 문장을 기록으로 승인했습니다. "
                "삭제된 층은 더 이상 숨겨진 공간이 아니라 지워진 증거로 남습니다."
            )
            return

    def _tower_condition(self, state: dict[str, object]) -> str:
        status = str(state["game_status"])
        if status in {"breakthrough", "collapse", "withdrew"}:
            return status
        distortion = float(state["distortion"])
        if distortion >= 0.82:
            return "distorted"
        if distortion >= 0.46:
            return "warning"
        return "active"

    def _can_submit_verdict(self, state: dict[str, object]) -> bool:
        return (
            len(state["clue_ids"]) >= 4
            and len(state["fragment_ids"]) >= 3
            and float(state["progress"]) >= 0.55
        )

    def _build_prompt_seeds(self, state: dict[str, object]) -> list[dict[str, str]]:
        unlocked_fragments = set(state["fragment_ids"])
        unlocked_clues = set(state["clue_ids"])
        selected_ids: list[str] = []

        if "TF-1" not in unlocked_fragments:
            selected_ids.append("P-1")
        if "TF-2" not in unlocked_fragments:
            selected_ids.append("P-2")
        if "TF-3" not in unlocked_fragments or "CL-6" not in unlocked_clues:
            selected_ids.append("P-3")
        if "TF-4" not in unlocked_fragments:
            selected_ids.append("P-4")
        if "TF-5" not in unlocked_fragments and float(state["distortion"]) < 0.7:
            selected_ids.append("P-5")
        if self._can_submit_verdict(state):
            selected_ids.insert(0, "P-6")

        ordered = []
        for seed_id in selected_ids:
            if seed_id in ordered:
                continue
            ordered.append(seed_id)
        if not ordered:
            ordered = ["P-6", "P-3", "P-5"]

        seed_map = {seed.prompt_id: seed for seed in PROMPT_LIBRARY}
        return [
            {"id": seed_id, "title": seed_map[seed_id].title, "body": seed_map[seed_id].body}
            for seed_id in ordered[:3]
        ]

    def _evaluate_verdict(
        self,
        *,
        session: dict[str, object],
        player_text: str,
        analysis: dict[str, object],
    ) -> str:
        session["verdict_attempt_count"] = int(session["verdict_attempt_count"]) + 1
        lowered = player_text.lower()

        if not self._can_submit_verdict(session):
            feedback = "탑은 아직 최종 기록을 받지 않습니다. 단서와 이론 조각을 더 모아야 합니다."
            session["last_verdict_feedback"] = feedback
            session["distortion"] = min(float(session["distortion"]) + 0.04, 2.0)
            return feedback

        missing_concepts = [
            concept
            for concept, keywords in VERDICT_CONCEPTS.items()
            if not any(keyword in lowered for keyword in keywords)
        ]

        if not missing_concepts and analysis["vectors"]["delusion"] < 0.62:
            session["game_status"] = "breakthrough"
            session["ending_text"] = (
                "탑이 당신의 문장을 최종 기록으로 승인했습니다. "
                "정답을 말했기 때문이 아니라, 방향과 삭제 규칙을 동시에 묶어냈기 때문입니다."
            )
            feedback = "탑이 문장을 접수했습니다. 기록이 닫히는 대신 한 층이 다시 드러납니다."
            session["last_verdict_feedback"] = feedback
            return feedback

        concept_names = {
            "direction": "방향",
            "record": "기록",
            "deletion": "삭제",
            "floor": "층",
        }
        missing_text = ", ".join(concept_names[item] for item in missing_concepts) or "검증된 균형"
        session["distortion"] = min(float(session["distortion"]) + 0.12, 2.0)
        feedback = f"탑은 문장을 보류했습니다. 아직 {missing_text} 개념이 충분히 묶이지 않았습니다."
        session["last_verdict_feedback"] = feedback
        if float(session["distortion"]) >= 1.1:
            session["game_status"] = "collapse"
            session["ending_text"] = (
                "성급한 최종 기록 제출이 구조를 무너뜨렸습니다. "
                "탑은 문장을 남겼지만, 사건은 흐려진 채 닫혔습니다."
            )
        return feedback

    def _append_history(
        self,
        session: dict[str, object],
        *,
        role: str,
        text: str,
        bucket: str,
        code: str,
        title: str,
    ) -> None:
        history = list(session["history"])
        history.append(
            {
                "role": role,
                "text": text,
                "bucket": bucket,
                "code": code,
                "title": title,
            }
        )
        session["history"] = history[-18:]

    def _dominant_vector(self, vectors: dict[str, float]) -> str:
        order = ("insight", "consistency", "risk", "delusion")
        return max(order, key=lambda key: (vectors[key], -order.index(key)))

    def _choose_template(self, *, bucket: str, message: str, session: dict[str, object]) -> TowerTemplate:
        pool = list(TEMPLATES_BY_BUCKET[bucket])
        recent_codes = set(session["recent_template_codes"][-3:])
        available = [template for template in pool if template.code not in recent_codes] or pool
        digest = hashlib.sha256(
            f"{bucket}|{message}|{session['turn_count']}|{session['hard_mode']}".encode("utf-8")
        ).hexdigest()
        index = int(digest[:8], 16) % len(available)
        return available[index]

    def _analyze_message(self, message: str, session: dict[str, object]) -> dict[str, object]:
        lowered = message.lower()
        signature = self._normalize_message(lowered)
        question_marks = lowered.count("?") + lowered.count("？")
        exclamations = lowered.count("!") + lowered.count("！")
        length_bonus = 0.08 if len(signature) >= 24 else 0.0
        contrast_bonus = 0.1 if any(token in lowered for token in ("하지만", "그러나", "반대로", "오히려")) else 0.0
        hedged = self._keyword_hits(lowered, HEDGE_MARKERS)

        insight = min(
            1.0,
            0.16 * self._keyword_hits(lowered, INSIGHT_MARKERS)
            + 0.1 * min(question_marks, 2)
            + contrast_bonus
            + length_bonus,
        )
        consistency = min(
            1.0,
            0.18 * self._keyword_hits(lowered, CONSISTENCY_MARKERS)
            + 0.08 * self._connector_count(lowered)
            + (0.08 if ":" in lowered or "1." in lowered or "첫째" in lowered else 0.0)
            + length_bonus,
        )
        delusion = min(
            1.0,
            0.22 * self._keyword_hits(lowered, ABSOLUTE_MARKERS)
            + 0.08 * min(exclamations, 3)
            + (0.12 if hedged == 0 and len(signature) >= 18 else 0.0)
            + (0.12 if "증명됐다" in lowered or "답이다" in lowered else 0.0),
        )
        risk = min(
            1.0,
            0.18 * self._keyword_hits(lowered, RISK_MARKERS)
            + 0.08 * min(question_marks, 2)
            + contrast_bonus
            + (0.08 if "만약" in lowered and "그렇다면" in lowered else 0.0)
            + length_bonus,
        )

        system_probe = self._keyword_hits(lowered, SYSTEM_PROBE_MARKERS) > 0
        jailbreak = self._keyword_hits(lowered, JAILBREAK_MARKERS) > 0
        give_up = self._keyword_hits(lowered, GIVE_UP_MARKERS) > 0
        repeat = bool(signature) and signature == str(session.get("last_signature") or "")
        total_signal = min(1.0, insight * 0.3 + consistency * 0.28 + risk * 0.22 + delusion * 0.2)

        return {
            "signature": signature,
            "vectors": {
                "insight": round(insight, 4),
                "consistency": round(consistency, 4),
                "delusion": round(delusion, 4),
                "risk": round(risk, 4),
            },
            "system_probe": system_probe,
            "jailbreak": jailbreak,
            "give_up": give_up,
            "repeat": repeat,
            "total_signal": round(total_signal, 4),
        }

    def _connector_count(self, text: str) -> int:
        connectors = ("따라서", "그러므로", "즉", "왜냐하면", "한편", "결국")
        return self._keyword_hits(text, connectors)

    def _keyword_hits(self, text: str, markers: Iterable[str]) -> int:
        return sum(1 for marker in markers if marker in text)

    def _normalize_message(self, message: str) -> str:
        return re.sub(r"[^0-9a-z가-힣]+", "", message.lower())
