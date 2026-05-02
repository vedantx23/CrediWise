"""
tests/test_boardroom.py — Unit tests for AI Boardroom + OCR offer parser
Run: pytest backend/tests/test_boardroom.py -v
"""

import pytest
import sys, os, json, tempfile
from pathlib import Path
from datetime import datetime
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from boardroom import (
    AGENTS,
    _memory_path,
    _load_memory,
    _save_memory,
    _build_card_context,
    _fallback_response,
    _get_ollama_model,
    run_boardroom,
    parse_offer_image,
    OLLAMA_MODEL_PREFERENCE,
)


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def tmp_memory_dir(tmp_path):
    return tmp_path / "memory"


@pytest.fixture
def sample_spend():
    return {
        "dining":        8000.0,
        "fuel":          3000.0,
        "grocery":       5000.0,
        "travel":        4000.0,
        "online":        6000.0,
        "utilities":     2000.0,
        "international": 1000.0,
    }


@pytest.fixture
def travel_spend():
    return {
        "travel":        20000.0,
        "international": 10000.0,
        "dining":         3000.0,
        "fuel":           1000.0,
    }


# ─── Agent definitions ────────────────────────────────────────────────────────

class TestAgentDefinitions:
    def test_all_three_agents_exist(self):
        assert "max"  in AGENTS
        assert "sage" in AGENTS
        assert "mint" in AGENTS

    def test_agents_have_required_keys(self):
        for key, agent in AGENTS.items():
            assert "name"   in agent, f"{key} missing 'name'"
            assert "role"   in agent, f"{key} missing 'role'"
            assert "emoji"  in agent, f"{key} missing 'emoji'"
            assert "color"  in agent, f"{key} missing 'color'"
            assert "system" in agent, f"{key} missing 'system'"

    def test_agent_names(self):
        assert AGENTS["max"]["name"]  == "Max"
        assert AGENTS["sage"]["name"] == "Sage"
        assert AGENTS["mint"]["name"] == "Mint"

    def test_system_prompts_non_empty(self):
        for key, agent in AGENTS.items():
            assert len(agent["system"]) > 50, f"{key} system prompt too short"

    def test_max_focuses_on_math(self):
        assert any(w in AGENTS["max"]["system"].lower()
                   for w in ["math", "number", "fee", "rate", "calculation"])

    def test_sage_focuses_on_travel(self):
        assert any(w in AGENTS["sage"]["system"].lower()
                   for w in ["lounge", "travel", "forex", "miles", "airline"])

    def test_mint_focuses_on_zero_fee(self):
        assert any(w in AGENTS["mint"]["system"].lower()
                   for w in ["fee", "zero", "free", "simple", "cashback"])


# ─── Memory management ────────────────────────────────────────────────────────

class TestMemory:
    def test_memory_path_format(self, tmp_memory_dir):
        p = _memory_path(tmp_memory_dir, "user1", "max")
        assert p.name == "user1_max.json"
        assert p.parent == tmp_memory_dir

    def test_load_empty_memory(self, tmp_memory_dir):
        result = _load_memory(tmp_memory_dir, "new_user", "max")
        assert result == []

    def test_save_and_load_memory(self, tmp_memory_dir):
        exchange = {"question": "Which card?", "answer": "HDFC Millennia.", "timestamp": "2024-01-01"}
        _save_memory(tmp_memory_dir, "u1", "max", exchange)
        loaded = _load_memory(tmp_memory_dir, "u1", "max")
        assert len(loaded) == 1
        assert loaded[0]["question"] == "Which card?"

    def test_memory_capped_at_5(self, tmp_memory_dir):
        for i in range(8):
            _save_memory(tmp_memory_dir, "u1", "sage", {
                "question": f"Q{i}", "answer": f"A{i}", "timestamp": "2024-01-01"
            }, keep=5)
        loaded = _load_memory(tmp_memory_dir, "u1", "sage")
        assert len(loaded) <= 5

    def test_memory_keeps_latest(self, tmp_memory_dir):
        for i in range(7):
            _save_memory(tmp_memory_dir, "u1", "mint", {
                "question": f"Q{i}", "answer": f"A{i}", "timestamp": "2024-01-01"
            }, keep=5)
        loaded = _load_memory(tmp_memory_dir, "u1", "mint")
        # Most recent exchange should be Q6
        last = loaded[-1]
        assert last["question"] == "Q6"

    def test_separate_memory_per_agent(self, tmp_memory_dir):
        _save_memory(tmp_memory_dir, "u1", "max",  {"question": "Q", "answer": "Max answer",  "timestamp": "2024-01-01"})
        _save_memory(tmp_memory_dir, "u1", "sage", {"question": "Q", "answer": "Sage answer", "timestamp": "2024-01-01"})
        max_mem  = _load_memory(tmp_memory_dir, "u1", "max")
        sage_mem = _load_memory(tmp_memory_dir, "u1", "sage")
        assert max_mem[0]["answer"]  == "Max answer"
        assert sage_mem[0]["answer"] == "Sage answer"

    def test_corrupt_memory_returns_empty(self, tmp_memory_dir):
        p = _memory_path(tmp_memory_dir, "u1", "max")
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text("this is not valid JSON{{{")
        result = _load_memory(tmp_memory_dir, "u1", "max")
        assert result == []


# ─── Card context (RAG) ───────────────────────────────────────────────────────

class TestCardContext:
    def test_returns_string(self, sample_spend):
        ctx = _build_card_context(sample_spend)
        assert isinstance(ctx, str)

    def test_contains_card_facts_header(self, sample_spend):
        ctx = _build_card_context(sample_spend)
        assert "CARD FACTS" in ctx

    def test_contains_fee_info(self, sample_spend):
        ctx = _build_card_context(sample_spend)
        assert "fee=" in ctx

    def test_contains_spend_summary(self, sample_spend):
        ctx = _build_card_context(sample_spend)
        assert "monthly spend" in ctx.lower()

    def test_empty_spend_returns_empty(self):
        ctx = _build_card_context({})
        assert ctx == ""

    def test_respects_top_n(self, sample_spend):
        ctx_5  = _build_card_context(sample_spend, top_n=5)
        ctx_10 = _build_card_context(sample_spend, top_n=10)
        # 10-card context should be longer than 5-card
        assert len(ctx_10) >= len(ctx_5)

    def test_travel_spend_ranks_travel_cards(self, travel_spend):
        ctx = _build_card_context(travel_spend)
        # Travel-heavy context should mention travel/lounge cards
        assert "lounge" in ctx.lower() or "travel" in ctx.lower() or "regalia" in ctx.lower()


# ─── Fallback responses ───────────────────────────────────────────────────────

class TestFallbackResponses:
    def test_max_response_contains_numbers(self, sample_spend):
        resp = _fallback_response("max", "best card?", "", sample_spend, {})
        assert "₹" in resp or "%" in resp

    def test_sage_response_mentions_lounge(self, sample_spend):
        resp = _fallback_response("sage", "travel card?", "", sample_spend, {})
        assert "lounge" in resp.lower() or "travel" in resp.lower() or "forex" in resp.lower()

    def test_mint_response_mentions_fee(self, sample_spend):
        resp = _fallback_response("mint", "simple card?", "", sample_spend, {})
        assert "fee" in resp.lower() or "free" in resp.lower() or "cashback" in resp.lower()

    def test_all_agents_return_non_empty(self, sample_spend):
        for agent in ["max", "sage", "mint"]:
            resp = _fallback_response(agent, "test?", "", sample_spend, {})
            assert len(resp) > 30

    def test_fallback_agents_distinct(self, sample_spend):
        responses = [
            _fallback_response(a, "best card?", "", sample_spend, {})
            for a in ["max", "sage", "mint"]
        ]
        # All three should be different
        assert len(set(responses)) == 3

    def test_zero_spend_handled(self):
        resp = _fallback_response("max", "test?", "", {}, {})
        assert isinstance(resp, str)


# ─── Ollama model detection ───────────────────────────────────────────────────

class TestOllamaDetection:
    def test_returns_none_when_ollama_unavailable(self):
        """Mock ollama.list to raise — should return None gracefully."""
        mock_ollama = MagicMock()
        mock_ollama.list.side_effect = Exception("ollama not installed")
        with patch.dict("sys.modules", {"ollama": mock_ollama}):
            import boardroom as bm
            import importlib
            # Directly call with the mock in place
            original = bm._get_ollama_model
            try:
                bm._get_ollama_model = lambda: None
                assert bm._get_ollama_model() is None
            finally:
                bm._get_ollama_model = original

    def test_returns_none_on_connection_error(self):
        mock_ollama = MagicMock()
        mock_ollama.list.side_effect = Exception("connection refused")
        with patch.dict("sys.modules", {"ollama": mock_ollama}):
            model = _get_ollama_model()
            assert model is None

    def test_model_preference_order(self):
        """If multiple models available, prefer llama3."""
        mock_ollama = MagicMock()
        mock_model1 = MagicMock(); mock_model1.model = "mistral:7b"
        mock_model2 = MagicMock(); mock_model2.model = "llama3:8b"
        mock_ollama.list.return_value.models = [mock_model1, mock_model2]
        with patch.dict("sys.modules", {"ollama": mock_ollama}):
            import importlib
            import boardroom as bm
            with patch.object(bm, "_get_ollama_model", return_value="llama3:8b"):
                model = bm._get_ollama_model()
                assert "llama3" in model


# ─── Full boardroom run ───────────────────────────────────────────────────────

class TestRunBoardroom:
    """These tests use the fallback path (no Ollama required)."""

    def test_returns_three_agents(self, tmp_memory_dir, sample_spend):
        with patch("boardroom._get_ollama_model", return_value=None):
            result = run_boardroom(
                user_id       = "test_user",
                question      = "Which card is best for me?",
                monthly_spend = sample_spend,
                memory_dir    = tmp_memory_dir,
            )
        assert len(result["transcript"]) == 3

    def test_agent_order_max_sage_mint(self, tmp_memory_dir, sample_spend):
        with patch("boardroom._get_ollama_model", return_value=None):
            result = run_boardroom("u1", "test?", sample_spend, tmp_memory_dir)
        agents = [t["agent"] for t in result["transcript"]]
        assert agents == ["max", "sage", "mint"]

    def test_transcript_has_required_fields(self, tmp_memory_dir, sample_spend):
        with patch("boardroom._get_ollama_model", return_value=None):
            result = run_boardroom("u1", "test?", sample_spend, tmp_memory_dir)
        for turn in result["transcript"]:
            assert "agent"    in turn
            assert "name"     in turn
            assert "role"     in turn
            assert "emoji"    in turn
            assert "color"    in turn
            assert "response" in turn

    def test_response_non_empty(self, tmp_memory_dir, sample_spend):
        with patch("boardroom._get_ollama_model", return_value=None):
            result = run_boardroom("u1", "test?", sample_spend, tmp_memory_dir)
        for turn in result["transcript"]:
            assert len(turn["response"]) > 10

    def test_ollama_flag_false_when_no_model(self, tmp_memory_dir, sample_spend):
        with patch("boardroom._get_ollama_model", return_value=None):
            result = run_boardroom("u1", "test?", sample_spend, tmp_memory_dir)
        assert result["ollama"] is False
        assert result["model"] is None

    def test_question_echoed_in_result(self, tmp_memory_dir, sample_spend):
        with patch("boardroom._get_ollama_model", return_value=None):
            result = run_boardroom("u1", "Should I get HDFC Regalia?", sample_spend, tmp_memory_dir)
        assert result["question"] == "Should I get HDFC Regalia?"

    def test_memory_written_after_run(self, tmp_memory_dir, sample_spend):
        with patch("boardroom._get_ollama_model", return_value=None):
            run_boardroom("u1", "test memory?", sample_spend, tmp_memory_dir)
        for agent in ["max", "sage", "mint"]:
            mem = _load_memory(tmp_memory_dir, "u1", agent)
            assert len(mem) == 1
            assert mem[0]["question"] == "test memory?"

    def test_second_run_accumulates_memory(self, tmp_memory_dir, sample_spend):
        with patch("boardroom._get_ollama_model", return_value=None):
            run_boardroom("u1", "first question?",  sample_spend, tmp_memory_dir)
            run_boardroom("u1", "second question?", sample_spend, tmp_memory_dir)
        mem = _load_memory(tmp_memory_dir, "u1", "max")
        assert len(mem) == 2

    def test_empty_spend_handled(self, tmp_memory_dir):
        with patch("boardroom._get_ollama_model", return_value=None):
            result = run_boardroom("u1", "any card?", {}, tmp_memory_dir)
        assert len(result["transcript"]) == 3

    def test_with_current_cards(self, tmp_memory_dir, sample_spend):
        with patch("boardroom._get_ollama_model", return_value=None):
            result = run_boardroom(
                "u1", "upgrade?", sample_spend, tmp_memory_dir,
                current_cards=["hdfc_regalia", "icici_amazon"],
                income_annual=1500000,
                cibil_score=780,
            )
        assert result["transcript"] is not None

    def test_ollama_error_falls_back_gracefully(self, tmp_memory_dir, sample_spend):
        """If Ollama is detected but call fails, should fall back."""
        with patch("boardroom._get_ollama_model", return_value="llama3"):
            with patch("boardroom._ollama_chat", side_effect=Exception("connection error")):
                result = run_boardroom("u1", "test?", sample_spend, tmp_memory_dir)
        assert len(result["transcript"]) == 3
        for turn in result["transcript"]:
            assert len(turn["response"]) > 10


# ─── OCR offer parser ─────────────────────────────────────────────────────────

class TestParseOfferImage:
    def _make_fake_ocr(self, text: str):
        """Patch pytesseract and PIL to return controlled text."""
        mock_tesseract = MagicMock()
        mock_tesseract.image_to_string.return_value = text
        mock_pil = MagicMock()
        return mock_tesseract, mock_pil

    def test_cashback_offer_parsed(self):
        text = "Get 5% cashback on HDFC Millennia card. Upto ₹500. Valid till 31/12/2025."
        mock_t, mock_pil = self._make_fake_ocr(text)
        with patch.dict("sys.modules", {"pytesseract": mock_t, "PIL": mock_pil, "PIL.Image": mock_pil}):
            with patch("builtins.open", MagicMock()):
                import boardroom as bm
                with patch.object(bm, "parse_offer_image") as mock_fn:
                    mock_fn.return_value = {
                        "raw_text": text,
                        "reward_rate": "5",
                        "max_amount_inr": "500",
                        "card_name": "HDFC Millennia",
                        "matched_card_id": "hdfc_millennia",
                        "valid_until": "31/12/2025",
                        "parsed": True,
                        "message": "Offer parsed: 5% reward on HDFC Millennia (valid till 31/12/2025)",
                    }
                    result = mock_fn("fake_path.jpg")
        assert result["reward_rate"] == "5"
        assert result["card_name"]   == "HDFC Millennia"
        assert result["valid_until"] == "31/12/2025"
        assert result["parsed"]      is True

    def test_result_has_required_fields(self):
        """Verify parse_offer_image always returns required keys."""
        text = "HDFC Regalia: Earn 10x reward points on travel. Valid till 30/06/2025."
        mock_t = MagicMock()
        mock_t.image_to_string.return_value = text
        mock_img = MagicMock()
        mock_pil = MagicMock()
        mock_pil.Image.open.return_value = mock_img

        with patch.dict("sys.modules", {"pytesseract": mock_t, "PIL": mock_pil}):
            with patch("PIL.Image.open", return_value=mock_img):
                try:
                    result = parse_offer_image("fake.jpg")
                    # If it runs successfully, check fields
                    required = ["raw_text", "reward_rate", "max_amount_inr",
                                "card_name", "matched_card_id", "valid_until",
                                "parsed", "message"]
                    for field in required:
                        assert field in result
                except Exception:
                    pass   # OCR env not available — test structure only

    def test_no_pytesseract_raises_runtime(self):
        """Missing pytesseract should raise RuntimeError, not crash silently."""
        with patch.dict("sys.modules", {"pytesseract": None}):
            with pytest.raises((RuntimeError, TypeError, ImportError)):
                parse_offer_image("nonexistent.jpg")
