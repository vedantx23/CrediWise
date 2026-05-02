"""
tests/test_community.py — Unit tests for Community Intelligence
Run: pytest backend/tests/test_community.py -v
"""

import pytest
import sys, os, json
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from community import (
    create_offer, vote_offer, get_offer, get_offers_for_card, get_all_offers,
    submit_combo, get_leaderboard, get_all_combos_for_city, get_combo,
    delete_combo, _acceptance_rate, _enrich_offer, _enrich_combo, _combo_key,
    PERSONAS, INDIAN_CITIES,
)
from database import run_migrations, get_all_cards
from seed_data import seed


# ─── Setup ────────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def ensure_db():
    run_migrations()
    if not get_all_cards():
        seed()


# ─── _acceptance_rate ─────────────────────────────────────────────────────────

class TestAcceptanceRate:
    def test_all_upvotes(self):
        assert _acceptance_rate(10, 0) == pytest.approx(100.0)

    def test_all_downvotes(self):
        assert _acceptance_rate(0, 10) == pytest.approx(0.0)

    def test_mixed(self):
        assert _acceptance_rate(3, 1) == pytest.approx(75.0)

    def test_no_votes_returns_none(self):
        assert _acceptance_rate(0, 0) is None

    def test_rounds_to_one_decimal(self):
        rate = _acceptance_rate(1, 3)
        assert rate == pytest.approx(25.0)

    def test_large_numbers(self):
        rate = _acceptance_rate(730, 270)
        assert rate == pytest.approx(73.0)


# ─── _combo_key ───────────────────────────────────────────────────────────────

class TestComboKey:
    def test_deterministic(self):
        k1 = _combo_key(["hdfc_regalia", "axis_ace"], "Mumbai", "The Reward Arbitrageur")
        k2 = _combo_key(["hdfc_regalia", "axis_ace"], "Mumbai", "The Reward Arbitrageur")
        assert k1 == k2

    def test_order_independent(self):
        k1 = _combo_key(["hdfc_regalia", "axis_ace"],   "Mumbai", "The Reward Arbitrageur")
        k2 = _combo_key(["axis_ace",    "hdfc_regalia"], "Mumbai", "The Reward Arbitrageur")
        assert k1 == k2

    def test_different_city_different_key(self):
        k1 = _combo_key(["hdfc_regalia"], "Mumbai", "The Stealth Nomad")
        k2 = _combo_key(["hdfc_regalia"], "Delhi",  "The Stealth Nomad")
        assert k1 != k2

    def test_different_persona_different_key(self):
        k1 = _combo_key(["hdfc_regalia"], "Mumbai", "The Stealth Nomad")
        k2 = _combo_key(["hdfc_regalia"], "Mumbai", "The Frugal Zen Master")
        assert k1 != k2

    def test_starts_with_combo_prefix(self):
        k = _combo_key(["kotak_811"], "Pune", "The Frugal Zen Master")
        assert k.startswith("combo_")


# ─── Offer creation & voting ─────────────────────────────────────────────────

class TestOfferVotes:
    def _make_offer(self, suffix=""):
        return create_offer(
            card_id    = "hdfc_millennia",
            offer_text = f"5% cashback on Swiggy{suffix}",
            offer_rate = 5.0,
        )

    def test_create_returns_offer_id(self):
        oid = self._make_offer("_create")
        assert oid.startswith("offer_")

    def test_custom_offer_id(self):
        custom_id = "my_custom_offer_99"
        oid = create_offer("kotak_811", "10x points on first txn",
                           offer_id=custom_id)
        assert oid == custom_id

    def test_upvote_increments(self):
        oid    = self._make_offer("_upvote")
        result = vote_offer(oid, "up")
        assert result["upvotes"] >= 1

    def test_downvote_increments(self):
        oid    = self._make_offer("_downvote")
        result = vote_offer(oid, "down")
        assert result["downvotes"] >= 1

    def test_multiple_upvotes(self):
        oid = self._make_offer("_multi_up")
        vote_offer(oid, "up")
        vote_offer(oid, "up")
        result = vote_offer(oid, "up")
        assert result["upvotes"] >= 3

    def test_vote_returns_acceptance_rate(self):
        oid    = self._make_offer("_rate")
        vote_offer(oid, "up")
        vote_offer(oid, "up")
        vote_offer(oid, "up")
        result = vote_offer(oid, "down")
        assert result["acceptance_rate"] == pytest.approx(75.0)

    def test_vote_label_contains_percentage(self):
        oid = self._make_offer("_label")
        vote_offer(oid, "up")
        result = vote_offer(oid, "up")
        assert "%" in result["label"] or "users" in result["label"]

    def test_invalid_vote_raises(self):
        oid = self._make_offer("_bad")
        with pytest.raises(ValueError):
            vote_offer(oid, "neutral")

    def test_nonexistent_offer_raises(self):
        with pytest.raises(ValueError):
            vote_offer("offer_does_not_exist_xyz", "up")

    def test_get_offer_returns_dict(self):
        oid   = self._make_offer("_get")
        offer = get_offer(oid)
        assert offer is not None
        assert offer["offer_id"] == oid

    def test_get_offer_has_required_fields(self):
        oid   = self._make_offer("_fields")
        offer = get_offer(oid)
        for field in ["offer_id", "card_id", "offer_text", "upvotes",
                      "downvotes", "acceptance_rate", "total_votes", "label"]:
            assert field in offer

    def test_get_offers_for_card(self):
        self._make_offer("_for_card")
        offers = get_offers_for_card("hdfc_millennia")
        assert isinstance(offers, list)
        assert len(offers) >= 1
        assert all(o["card_id"] == "hdfc_millennia" for o in offers)

    def test_get_all_offers(self):
        self._make_offer("_all")
        offers = get_all_offers()
        assert isinstance(offers, list)
        assert len(offers) >= 1

    def test_min_votes_filter(self):
        oid = self._make_offer("_min_votes")
        vote_offer(oid, "up")
        # Request min_votes=5 — newly created offer with 1 vote should not appear
        offers_5 = get_all_offers(min_votes=5)
        offers_1 = get_all_offers(min_votes=1)
        ids_5 = {o["offer_id"] for o in offers_5}
        ids_1 = {o["offer_id"] for o in offers_1}
        assert oid in ids_1
        assert oid not in ids_5

    def test_zero_votes_label(self):
        oid   = self._make_offer("_zero_label")
        offer = get_offer(oid)
        assert "No votes yet" in offer["label"] or offer["total_votes"] == 0


# ─── _enrich_offer ───────────────────────────────────────────────────────────

class TestEnrichOffer:
    def test_adds_acceptance_rate(self):
        row = {"offer_id": "x", "card_id": "kotak_811", "offer_text": "test",
               "offer_rate": 2.0, "upvotes": 7, "downvotes": 3, "last_updated": ""}
        enriched = _enrich_offer(row)
        assert enriched["acceptance_rate"] == pytest.approx(70.0)

    def test_adds_total_votes(self):
        row = {"offer_id": "x", "card_id": "kotak_811", "offer_text": "test",
               "offer_rate": 2.0, "upvotes": 7, "downvotes": 3, "last_updated": ""}
        enriched = _enrich_offer(row)
        assert enriched["total_votes"] == 10

    def test_adds_label(self):
        row = {"offer_id": "x", "card_id": "kotak_811", "offer_text": "test",
               "offer_rate": 2.0, "upvotes": 0, "downvotes": 0, "last_updated": ""}
        enriched = _enrich_offer(row)
        assert "label" in enriched


# ─── Card Combos ─────────────────────────────────────────────────────────────

class TestCardCombos:
    _CARDS_A = ["hdfc_regalia", "axis_ace", "sbi_simplyclick"]
    _CARDS_B = ["icici_amazon", "kotak_811"]
    _CITY    = "Mumbai"
    _PERSONA = "The Reward Arbitrageur"

    def test_submit_returns_dict(self):
        result = submit_combo(self._CARDS_A, self._CITY, self._PERSONA, 18400)
        assert isinstance(result, dict)
        assert "combo_id" in result

    def test_submit_increments_submissions(self):
        # Submit same combo twice
        r1 = submit_combo(self._CARDS_A, self._CITY, self._PERSONA, 18000)
        r2 = submit_combo(self._CARDS_A, self._CITY, self._PERSONA, 19000)
        assert r2["submissions"] == r1["submissions"] + 1

    def test_submit_averages_nav(self):
        # Fresh combo with unique city to avoid leftover data
        r1 = submit_combo(self._CARDS_B, "Jaipur", self._PERSONA, 10000)
        r2 = submit_combo(self._CARDS_B, "Jaipur", self._PERSONA, 12000)
        # Running average: (10000*1 + 12000) / 2 = 11000
        assert r2["nav_score"] == pytest.approx(11000.0)

    def test_combo_has_card_names(self):
        result = submit_combo(["hdfc_millennia"], "Delhi", "The Frugal Zen Master", 8000)
        assert len(result["card_names"]) >= 1
        assert isinstance(result["card_names"][0], str)

    def test_combo_display_string_format(self):
        result = submit_combo(["hdfc_regalia", "axis_ace"], "Bangalore",
                               "The Stealth Nomad", 15000)
        display = result["display"]
        assert "Bangalore" in display
        assert "NAV" in display
        assert "₹" in display

    def test_display_includes_card_names(self):
        result = submit_combo(["kotak_811"], "Pune", "The Frugal Zen Master", 5000)
        assert any(name in result["display"] for name in result["card_names"])

    def test_get_combo_by_id(self):
        result = submit_combo(["sbi_simplyclick"], "Hyderabad",
                               "The High-Street Architect", 7000)
        combo  = get_combo(result["combo_id"])
        assert combo is not None
        assert combo["combo_id"] == result["combo_id"]

    def test_get_combo_not_found(self):
        assert get_combo("combo_nonexistent_xyz") is None

    def test_empty_cards_raises(self):
        with pytest.raises(ValueError):
            submit_combo([], self._CITY, self._PERSONA, 5000)

    def test_delete_combo(self):
        result = submit_combo(["icici_coral"], "Chennai",
                               "The Reward Arbitrageur", 6000)
        cid = result["combo_id"]
        assert delete_combo(cid) is True
        assert get_combo(cid) is None

    def test_delete_nonexistent_returns_false(self):
        assert delete_combo("combo_does_not_exist_xyz") is False


# ─── Leaderboard ─────────────────────────────────────────────────────────────

class TestLeaderboard:
    def setup_method(self):
        """Insert a few combos for leaderboard testing."""
        submit_combo(["hdfc_regalia", "axis_ace"],    "Mumbai",    "The Reward Arbitrageur", 18400)
        submit_combo(["hdfc_millennia", "icici_amazon"], "Mumbai", "The Reward Arbitrageur", 15000)
        submit_combo(["kotak_811"],                   "Delhi",     "The Frugal Zen Master",  5000)
        submit_combo(["indusind_legend", "axis_ace"], "Bangalore", "The Stealth Nomad",      12000)

    def test_returns_list(self):
        board = get_leaderboard()
        assert isinstance(board, list)

    def test_sorted_by_nav_desc(self):
        board = get_leaderboard(top_n=10)
        navs = [c["nav_score"] for c in board]
        assert navs == sorted(navs, reverse=True)

    def test_top_n_respected(self):
        board = get_leaderboard(top_n=2)
        assert len(board) <= 2

    def test_city_filter(self):
        board = get_leaderboard(city="Mumbai")
        assert all(c["city"].lower() == "mumbai" for c in board)

    def test_persona_filter(self):
        board = get_leaderboard(persona="The Frugal Zen Master")
        assert all(c["persona"] == "The Frugal Zen Master" for c in board)

    def test_city_and_persona_filter(self):
        board = get_leaderboard(city="Mumbai", persona="The Reward Arbitrageur")
        assert all(
            c["city"].lower() == "mumbai" and c["persona"] == "The Reward Arbitrageur"
            for c in board
        )

    def test_no_results_for_unknown_city(self):
        board = get_leaderboard(city="MarsCity2099")
        assert board == []

    def test_each_combo_has_display(self):
        board = get_leaderboard(top_n=5)
        for combo in board:
            assert "display" in combo
            assert len(combo["display"]) > 10

    def test_display_contains_city(self):
        board = get_leaderboard(city="Delhi", top_n=3)
        for combo in board:
            assert "Delhi" in combo["display"]

    def test_get_all_combos_for_city(self):
        combos = get_all_combos_for_city("Bangalore")
        assert isinstance(combos, list)
        assert all(c["city"].lower() == "bangalore" for c in combos)


# ─── Metadata ─────────────────────────────────────────────────────────────────

class TestMetadata:
    def test_personas_list_non_empty(self):
        assert len(PERSONAS) == 4

    def test_indian_cities_list(self):
        assert "Mumbai" in INDIAN_CITIES
        assert "Delhi"  in INDIAN_CITIES
        assert "Other"  in INDIAN_CITIES

    def test_persona_names_correct(self):
        assert "The Stealth Nomad"         in PERSONAS
        assert "The High-Street Architect" in PERSONAS
        assert "The Reward Arbitrageur"    in PERSONAS
        assert "The Frugal Zen Master"     in PERSONAS
