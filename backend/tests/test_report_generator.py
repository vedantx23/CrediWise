"""
test_report_generator.py — Unit tests for the Annual Wallet Report PDF generator.
Tests cover helper functions (formatting, page builders) + full generation.
"""

import sys, os, re, tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from report_generator import (
    _inr, generate_report,
)


# ─── _inr formatting ─────────────────────────────────────────────────────────

class TestInrFormat:
    def test_zero(self):
        assert _inr(0) == "₹0"

    def test_hundreds(self):
        assert _inr(500) == "₹500"

    def test_thousands(self):
        assert _inr(1000) == "₹1,000"

    def test_ten_thousand(self):
        assert _inr(10000) == "₹10,000"

    def test_one_lakh(self):
        assert _inr(100000) == "₹1,00,000"

    def test_ten_lakh(self):
        assert _inr(1000000) == "₹10,00,000"

    def test_one_crore(self):
        assert _inr(10000000) == "₹1,00,00,000"

    def test_decimal_rounds(self):
        val = _inr(18400.9)
        assert "18,401" in val or "18,400" in val

    def test_float_truncation(self):
        result = _inr(1234.5)
        assert "1,235" in result or "1,234" in result

    def test_large_number(self):
        result = _inr(1234567)
        assert "12,34,567" in result

    def test_rupee_symbol(self):
        assert _inr(100).startswith("₹")


# ─── generate_report (full pipeline) ─────────────────────────────────────────

def _sample_monthly():
    return {
        "2025-01": {"dining": 8000, "fuel": 5000, "grocery": 6000,
                    "travel": 10000, "online": 7000, "utilities": 3000,
                    "international": 2000, "other": 4000},
        "2025-02": {"dining": 9000, "fuel": 4500, "grocery": 5500,
                    "travel": 12000, "online": 8000, "utilities": 2500,
                    "international": 3000, "other": 3500},
        "2025-03": {"dining": 7500, "fuel": 5500, "grocery": 6500,
                    "travel": 9000, "online": 6500, "utilities": 3500,
                    "international": 1500, "other": 4500},
    }


def _sample_recs():
    return [
        {
            "card_id":   "hdfc_regalia",
            "card_name": "HDFC Regalia",
            "nav_gain":  6400,
            "reason":    "Best travel rewards in your spend profile.",
            "shap_values": {"travel": 3200, "dining": 1800, "online": 1400},
        },
        {
            "card_id":   "axis_ace",
            "card_name": "Axis Ace",
            "nav_gain":  3200,
            "reason":    "5% cashback on utility payments.",
            "shap_values": {"utilities": 2100, "online": 1100},
        },
    ]


class TestGenerateReport:
    def _make_report(self, **kwargs):
        with tempfile.TemporaryDirectory() as tmp:
            path = generate_report(
                user_id="test_user",
                year=2025,
                monthly_data=_sample_monthly(),
                persona="The Reward Arbitrageur",
                current_nav=12000,
                optimal_nav=18400,
                leakage_rescued=6400,
                status="warning",
                recommendations=_sample_recs(),
                current_cards=["hdfc_regalia", "axis_ace"],
                reports_dir=Path(tmp),
                **kwargs,
            )
            return path, Path(path).exists(), Path(path).stat().st_size

    def test_returns_string_path(self):
        path, exists, size = self._make_report()
        assert isinstance(path, str)

    def test_file_created(self):
        _, exists, _ = self._make_report()
        assert exists

    def test_pdf_has_content(self):
        _, _, size = self._make_report()
        assert size > 1000, "PDF appears empty"

    def test_pdf_magic_bytes(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = generate_report(
                user_id="magic_test",
                year=2025,
                monthly_data=_sample_monthly(),
                persona="The Stealth Nomad",
                current_nav=10000,
                optimal_nav=14000,
                leakage_rescued=4000,
                status="warning",
                recommendations=[],
                current_cards=[],
                reports_dir=Path(tmp),
            )
            with open(path, "rb") as f:
                header = f.read(4)
            assert header == b"%PDF", "Not a valid PDF file"

    def test_filename_includes_user_and_year(self):
        path, _, _ = self._make_report()
        fname = Path(path).name
        assert "test_user" in fname
        assert "2025" in fname

    def test_critical_status(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = generate_report(
                user_id="crit_user", year=2025,
                monthly_data=_sample_monthly(),
                persona="The Frugal Zen Master",
                current_nav=5000, optimal_nav=20000,
                leakage_rescued=15000, status="critical",
                recommendations=_sample_recs(),
                current_cards=[], reports_dir=Path(tmp),
            )
            assert Path(path).exists()
            assert Path(path).stat().st_size > 1000

    def test_pass_status(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = generate_report(
                user_id="pass_user", year=2025,
                monthly_data=_sample_monthly(),
                persona="The High-Street Architect",
                current_nav=16000, optimal_nav=17000,
                leakage_rescued=1000, status="pass",
                recommendations=[], current_cards=["hdfc_millennia"],
                reports_dir=Path(tmp),
            )
            assert Path(path).exists()

    def test_empty_monthly_data(self):
        """Should not raise — generates with empty months."""
        with tempfile.TemporaryDirectory() as tmp:
            path = generate_report(
                user_id="empty_user", year=2025,
                monthly_data={},
                persona="The Frugal Zen Master",
                current_nav=0, optimal_nav=0,
                leakage_rescued=0, status="pass",
                recommendations=[], current_cards=[],
                reports_dir=Path(tmp),
            )
            assert Path(path).exists()

    def test_single_month(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = generate_report(
                user_id="single_user", year=2025,
                monthly_data={"2025-06": {"dining": 5000, "online": 3000}},
                persona="The Reward Arbitrageur",
                current_nav=1200, optimal_nav=1800,
                leakage_rescued=600, status="pass",
                recommendations=[], current_cards=[],
                reports_dir=Path(tmp),
            )
            assert Path(path).exists()
            assert Path(path).stat().st_size > 500

    def test_all_12_months(self):
        monthly = {
            f"2025-{m:02d}": {"dining": 8000, "grocery": 5000, "online": 6000}
            for m in range(1, 13)
        }
        with tempfile.TemporaryDirectory() as tmp:
            path = generate_report(
                user_id="full_year", year=2025,
                monthly_data=monthly,
                persona="The Stealth Nomad",
                current_nav=10000, optimal_nav=18000,
                leakage_rescued=8000, status="critical",
                recommendations=_sample_recs(), current_cards=["hdfc_regalia"],
                reports_dir=Path(tmp),
            )
            assert Path(path).stat().st_size > 5000

    def test_many_recommendations(self):
        recs = [
            {"card_id": f"card_{i}", "card_name": f"Card {i}",
             "nav_gain": 1000 * i, "reason": f"Reason {i}", "shap_values": {}}
            for i in range(1, 8)
        ]
        with tempfile.TemporaryDirectory() as tmp:
            path = generate_report(
                user_id="many_rec", year=2025,
                monthly_data=_sample_monthly(),
                persona="The Reward Arbitrageur",
                current_nav=5000, optimal_nav=12000,
                leakage_rescued=7000, status="critical",
                recommendations=recs, current_cards=[],
                reports_dir=Path(tmp),
            )
            assert Path(path).exists()

    def test_directory_autocreated(self):
        with tempfile.TemporaryDirectory() as tmp:
            new_dir = Path(tmp) / "nested" / "reports"
            assert not new_dir.exists()
            generate_report(
                user_id="dir_test", year=2025,
                monthly_data=_sample_monthly(),
                persona="The Frugal Zen Master",
                current_nav=0, optimal_nav=0,
                leakage_rescued=0, status="pass",
                recommendations=[], current_cards=[],
                reports_dir=new_dir,
            )
            assert new_dir.exists()

    def test_different_years(self):
        for yr in [2023, 2024, 2025, 2026]:
            with tempfile.TemporaryDirectory() as tmp:
                path = generate_report(
                    user_id="yr_test", year=yr,
                    monthly_data=_sample_monthly(),
                    persona="The Stealth Nomad",
                    current_nav=8000, optimal_nav=12000,
                    leakage_rescued=4000, status="warning",
                    recommendations=[], current_cards=[],
                    reports_dir=Path(tmp),
                )
                assert str(yr) in path

    def test_no_current_cards(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = generate_report(
                user_id="no_cards", year=2025,
                monthly_data=_sample_monthly(),
                persona="The Frugal Zen Master",
                current_nav=0, optimal_nav=5000,
                leakage_rescued=5000, status="critical",
                recommendations=_sample_recs(), current_cards=None,
                reports_dir=Path(tmp),
            )
            assert Path(path).exists()

    def test_zero_leakage(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = generate_report(
                user_id="zero_leak", year=2025,
                monthly_data=_sample_monthly(),
                persona="The High-Street Architect",
                current_nav=18000, optimal_nav=18000,
                leakage_rescued=0, status="pass",
                recommendations=[], current_cards=["hdfc_infinia"],
                reports_dir=Path(tmp),
            )
            assert Path(path).exists()
