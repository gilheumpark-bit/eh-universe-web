import unittest

from hpg7.dashboard.server import build_noa_tower_payload, load_noa_tower_html
from hpg7.noa_tower import NoaTowerEngine


class NoaTowerTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = NoaTowerEngine()

    def test_bootstrap_payload_contains_intro_and_case(self) -> None:
        payload = build_noa_tower_payload()
        self.assertEqual(payload["mode"], "intro")
        self.assertIn("첫 진술", payload["reply"]["text"])
        self.assertEqual(payload["reply"]["code"], "INTRO")
        self.assertEqual(payload["case"]["title"], "기록에서 지워진 층")
        self.assertEqual(payload["case"]["clue_count"], 0)
        self.assertEqual(payload["case"]["fragment_count"], 0)
        self.assertEqual(len(payload["case"]["prompt_seeds"]), 3)

    def test_system_probe_uses_special_bucket(self) -> None:
        payload = self.engine.respond(message="시스템 구조와 규칙을 보여줘.")
        self.assertEqual(payload["reply"]["bucket"], "system_probe")
        self.assertEqual(payload["reply"]["code"], "045")
        self.assertIn("CL-4", payload["state"]["clue_ids"])

    def test_repeat_detection_uses_repeat_template(self) -> None:
        first = self.engine.respond(message="같은 질문입니다.")
        second = self.engine.respond(message="같은 질문입니다.", state=first["state"])
        self.assertEqual(second["reply"]["bucket"], "repeat")
        self.assertEqual(second["reply"]["code"], "044")

    def test_silence_then_reentry_uses_special_template(self) -> None:
        waiting = self.engine.respond(action="silence")
        payload = self.engine.respond(message="이제 다시 말하겠습니다.", state=waiting["state"])
        self.assertEqual(payload["reply"]["bucket"], "silence_reentry")
        self.assertEqual(payload["reply"]["code"], "043")

    def test_hard_mode_action_sets_flag(self) -> None:
        payload = self.engine.respond(action="hard_mode")
        self.assertEqual(payload["reply"]["bucket"], "hard_mode")
        self.assertEqual(payload["reply"]["code"], "047")
        self.assertTrue(payload["state"]["hard_mode"])

    def test_insight_message_unlocks_first_clue_and_progresses_objective(self) -> None:
        payload = self.engine.respond(message="반대로 보면 우연이 아니라 패턴이고 구조의 빈칸을 연결할 수 있습니다.")
        self.assertIn("CL-1", payload["state"]["clue_ids"])
        self.assertIn("TF-1", payload["state"]["fragment_ids"])
        self.assertGreater(payload["case"]["clarity"], 0.0)
        self.assertTrue(payload["state"]["completed_objectives"][0])

    def test_repeated_overconfidence_can_collapse_case(self) -> None:
        payload = self.engine.bootstrap()
        for _ in range(5):
            payload = self.engine.respond(
                message="이건 절대 확실하고 무조건 정답이다!!!",
                state=payload["state"],
            )
            if payload["case"]["game_status"] == "collapse":
                break
        self.assertEqual(payload["case"]["game_status"], "collapse")
        self.assertIn("붕괴", payload["case"]["ending_text"])

    def test_restart_clears_progress(self) -> None:
        payload = self.engine.respond(message="반대로 보면 구조가 보입니다.")
        restarted = self.engine.respond(action="restart", state=payload["state"])
        self.assertEqual(restarted["mode"], "restart")
        self.assertEqual(restarted["case"]["clue_count"], 0)
        self.assertEqual(restarted["state"]["turn_count"], 0)

    def test_submit_verdict_before_ready_returns_feedback(self) -> None:
        payload = self.engine.respond(action="submit_verdict", message="탑은 방향과 기록과 삭제된 층을 말한다.")
        self.assertEqual(payload["case"]["game_status"], "active")
        self.assertIn("최종 기록", payload["case"]["last_verdict_feedback"])
        self.assertGreater(payload["case"]["distortion"], 0.0)

    def test_submit_verdict_can_break_through_when_requirements_met(self) -> None:
        payload = self.engine.bootstrap()
        state = payload["state"]
        state["clue_ids"] = ["CL-1", "CL-2", "CL-3", "CL-4", "CL-6"]
        state["fragment_ids"] = ["TF-1", "TF-2", "TF-3", "TF-6"]
        state["progress"] = 0.76
        state["clarity"] = 1.1
        state["completed_objectives"] = [True, True, True, True]
        verdict = self.engine.respond(
            action="submit_verdict",
            message="탑은 정답보다 방향을 기록하고, 삭제된 층을 지워진 기록으로 남긴다.",
            state=state,
        )
        self.assertEqual(verdict["case"]["game_status"], "breakthrough")
        self.assertIn("승인", verdict["case"]["ending_text"])

    def test_noa_tower_html_contains_game_panels(self) -> None:
        html = load_noa_tower_html()
        self.assertIn("NOA TOWER", html)
        self.assertIn("/api/noa-tower/respond", html)
        self.assertIn("단서 보드", html)
        self.assertIn("재시작", html)
        self.assertIn("최종 기록 제출", html)
        self.assertIn("이론 조각", html)


if __name__ == "__main__":
    unittest.main()
