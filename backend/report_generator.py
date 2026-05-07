"""
report_generator.py — Annual Wallet Report PDF using ReportLab

Pages:
  1. Cover       — "Your 2025 Wallet Report — CrediWise-AI"
                   Total spend, persona, leakage rescued
  2. Month chart — Bar chart: monthly rewards earned
  3. Category    — Which card earned most per category
  4. Next year   — Top recommendations

Output: /reports/{user_id}_{year}.pdf
"""

from __future__ import annotations
import sys, os
from pathlib import Path
from datetime import date
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
from database import get_all_cards, get_all_rewards_map, query

# ─── ReportLab imports ────────────────────────────────────────────────────────
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.colors import (
    HexColor, white, black, Color
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether,
)
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Group
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics import renderPDF
from reportlab.pdfgen import canvas as pdf_canvas

# ─── Brand colours ────────────────────────────────────────────────────────────
VAULT_BG       = HexColor("#0f172a")
VAULT_CARD     = HexColor("#1e293b")
VAULT_BORDER   = HexColor("#334155")
VAULT_GOLD     = HexColor("#f5c842")
VAULT_TEAL     = HexColor("#14b8a6")
VAULT_RED      = HexColor("#ef4444")
VAULT_GREEN    = HexColor("#22c55e")
VAULT_AMBER    = HexColor("#f59e0b")
VAULT_TEXT     = HexColor("#f1f5f9")
VAULT_DIM      = HexColor("#94a3b8")

PAGE_W, PAGE_H = A4
MARGIN         = 2 * cm


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _inr(amount: float) -> str:
    """Format as Indian currency string: ₹X,XX,XXX"""
    try:
        amount = int(round(amount))
        s = str(abs(amount))
        if len(s) > 3:
            last3 = s[-3:]
            rest  = s[:-3]
            groups = []
            while len(rest) > 2:
                groups.append(rest[-2:])
                rest = rest[:-2]
            if rest:
                groups.append(rest)
            s = ",".join(reversed(groups)) + "," + last3
        return f"₹{'-' if amount < 0 else ''}{s}"
    except Exception:
        return f"₹{amount}"


def _styles():
    # base omits textColor so each style can specify its own without conflict
    base = {"fontName": "Helvetica"}

    custom = {
        "H1":        ParagraphStyle("H1",        **base, fontSize=28, leading=36,
                                    textColor=VAULT_GOLD, alignment=TA_CENTER, spaceAfter=6),
        "H2":        ParagraphStyle("H2",        **base, fontSize=18, leading=24,
                                    textColor=VAULT_GOLD, spaceBefore=12, spaceAfter=4),
        "H3":        ParagraphStyle("H3",        **base, fontSize=13, leading=18,
                                    textColor=VAULT_TEAL, spaceBefore=8, spaceAfter=4),
        "Body":      ParagraphStyle("Body",      **base, fontSize=10, leading=15,
                                    textColor=VAULT_TEXT, spaceAfter=4),
        "Small":     ParagraphStyle("Small",     **base, fontSize=8,  leading=12,
                                    textColor=VAULT_DIM, spaceAfter=2),
        "Center":    ParagraphStyle("Center",    **base, fontSize=10, leading=15,
                                    alignment=TA_CENTER, textColor=VAULT_TEXT),
        "Highlight": ParagraphStyle("Highlight", **base, fontSize=22, leading=28,
                                    textColor=VAULT_GREEN, alignment=TA_CENTER,
                                    spaceBefore=4, spaceAfter=4),
        "Label":     ParagraphStyle("Label",     **base, fontSize=8,  leading=10,
                                    textColor=VAULT_DIM, spaceAfter=0),
    }
    return custom


def _dark_page(c, doc):
    """Background callback — dark vault theme for every page."""
    c.setFillColor(VAULT_BG)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    # Subtle gold bottom stripe
    c.setFillColor(HexColor("#1e1a05"))
    c.rect(0, 0, PAGE_W, 0.5 * cm, fill=1, stroke=0)
    # Page number
    c.setFont("Helvetica", 8)
    c.setFillColor(VAULT_DIM)
    c.drawRightString(PAGE_W - MARGIN, 0.35 * cm, f"CrediWise-AI Wallet Report")


# ─── Bar chart drawing ────────────────────────────────────────────────────────

def _monthly_bar_chart(
    months: list[str],
    rewards: list[float],
    width: float = 15 * cm,
    height: float = 7 * cm,
) -> Drawing:
    """Return a Drawing with a vertical bar chart for monthly rewards."""
    d    = Drawing(width, height)
    bc   = VerticalBarChart()
    bc.x = 2.5 * cm
    bc.y = 1.0 * cm
    bc.height = height - 2 * cm
    bc.width  = width  - 3 * cm

    bc.data        = [rewards]
    bc.categoryAxis.categoryNames = months
    bc.categoryAxis.labels.angle  = 45
    bc.categoryAxis.labels.fontSize  = 7
    bc.categoryAxis.labels.fillColor = VAULT_DIM
    bc.categoryAxis.strokeColor      = VAULT_BORDER
    bc.valueAxis.labels.fontSize     = 7
    bc.valueAxis.labels.fillColor    = VAULT_DIM
    bc.valueAxis.strokeColor         = VAULT_BORDER
    bc.valueAxis.gridStrokeColor     = VAULT_BORDER
    bc.valueAxis.gridStrokeDashArray = [2, 4]
    bc.valueAxis.visibleGrid         = 1

    bc.bars[0].fillColor   = VAULT_TEAL
    bc.bars[0].strokeColor = VAULT_TEAL

    d.add(bc)
    return d


# ─── Stat box helper ─────────────────────────────────────────────────────────

def _stat_table(rows: list[tuple[str, str, Any]]) -> Table:
    """
    3-column stat block: (label, value, colour)
    Renders as coloured number cards.
    """
    data = [[
        [Paragraph(lbl, _styles()["Label"]),
         Paragraph(val, ParagraphStyle("sv", fontName="Helvetica-Bold",
                                       fontSize=18, leading=22,
                                       textColor=col, alignment=TA_CENTER))]
        for lbl, val, col in rows
    ]]
    t = Table(data, colWidths=[(PAGE_W - 2 * MARGIN) / len(rows)] * len(rows))
    t.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, -1), VAULT_CARD),
        ("ROUNDEDCORNERS", [6]),
        ("BOX",         (0, 0), (-1, -1), 0.5, VAULT_BORDER),
        ("INNERGRID",   (0, 0), (-1, -1), 0.5, VAULT_BORDER),
        ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN",       (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING",  (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t


# ─── Page builders ────────────────────────────────────────────────────────────

def _page1_cover(
    s: dict,
    user_id: str,
    year: int,
    persona: str,
    total_spend: float,
    leakage_rescued: float,
    current_nav: float,
    optimal_nav: float,
    status: str,
) -> list:
    status_color = {"pass": VAULT_GREEN, "warning": VAULT_AMBER, "critical": VAULT_RED}.get(
        status.lower(), VAULT_TEAL)
    items = [
        Spacer(1, 1.5 * cm),
        Paragraph(f"Your {year} Wallet Report", s["H1"]),
        Paragraph("CrediWise-AI · Financial Intelligence Suite", s["Center"]),
        Spacer(1, 0.4 * cm),
        HRFlowable(width="100%", thickness=1, color=VAULT_GOLD, spaceAfter=16),
        Paragraph(f'<font color="#{VAULT_TEAL.hexval()[2:]}">Your Persona:</font> {persona}',
                  s["H2"]),
        Spacer(1, 0.3 * cm),
        _stat_table([
            ("Total Spend Analysed", _inr(total_spend),   VAULT_TEXT),
            ("Current NAV / Year",   _inr(current_nav),   VAULT_DIM),
            ("Optimal NAV / Year",   _inr(optimal_nav),   VAULT_GREEN),
        ]),
        Spacer(1, 0.5 * cm),
        Paragraph("Leakage Rescued This Year", s["Label"]),
        Paragraph(_inr(leakage_rescued), ParagraphStyle(
            "big", fontName="Helvetica-Bold", fontSize=36, leading=44,
            textColor=status_color, alignment=TA_CENTER)),
        Paragraph(
            "The difference between what you earn and what you <i>could</i> earn.",
            s["Center"]),
        Spacer(1, 0.6 * cm),
        HRFlowable(width="100%", thickness=0.5, color=VAULT_BORDER),
        Spacer(1, 0.2 * cm),
        Paragraph(f"Report generated for: <b>{user_id}</b>  ·  {date.today().isoformat()}",
                  s["Small"]),
    ]
    return items


def _page2_monthly(s: dict, monthly_data: dict[str, dict]) -> list:
    """Bar chart: monthly rewards earned."""
    months  = sorted(monthly_data.keys())
    display = [m[-2:] + "/" + m[:4][2:] for m in months]   # MM/YY

    items = [
        Paragraph("Month-by-Month Reward Earned", s["H2"]),
        HRFlowable(width="100%", thickness=0.5, color=VAULT_BORDER, spaceAfter=12),
    ]
    if len(months) < 1:
        items.append(Paragraph("No monthly data available.", s["Body"]))
        return items

    # Compute rewards per month (using rewards_map × spend)
    rewards_map = get_all_rewards_map()
    all_cards   = {c["card_id"]: c for c in get_all_cards()}

    monthly_rewards: list[float] = []
    table_rows = [["Month", "Total Spend", "Est. Rewards", "Top Category"]]

    for m in months:
        spend    = monthly_data[m]
        total_sp = sum(spend.values())
        best_r   = 0.0
        best_cat = "-"
        for cat, amt in spend.items():
            r = max((rewards_map.get(cid, {}).get(cat, 0) for cid in rewards_map), default=0)
            earned = amt * r / 100
            if earned > best_r:
                best_r, best_cat = earned, cat
        est_reward = sum(
            spend.get(cat, 0) * max(
                (rewards_map.get(cid, {}).get(cat, 0) for cid in rewards_map), default=0
            ) / 100
            for cat in spend
        )
        monthly_rewards.append(round(est_reward, 2))
        table_rows.append([
            display[months.index(m)],
            _inr(total_sp),
            _inr(est_reward),
            best_cat.capitalize(),
        ])

    if len(months) >= 2:
        chart = _monthly_bar_chart(display, monthly_rewards)
        items.append(chart)
        items.append(Spacer(1, 0.4 * cm))

    col_w = [(PAGE_W - 2 * MARGIN) / 4] * 4
    t = Table(table_rows, colWidths=col_w, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  VAULT_CARD),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  VAULT_GOLD),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("BACKGROUND",    (0, 1), (-1, -1), VAULT_BG),
        ("TEXTCOLOR",     (0, 1), (-1, -1), VAULT_TEXT),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [VAULT_BG, VAULT_CARD]),
        ("GRID",          (0, 0), (-1, -1), 0.3, VAULT_BORDER),
        ("ALIGN",         (1, 0), (-1, -1), "RIGHT"),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
    ]))
    items.append(t)
    return items


def _page3_category(s: dict, monthly_data: dict, current_cards: list[str]) -> list:
    """Which card earned most per category."""
    rewards_map = get_all_rewards_map()
    all_cards   = {c["card_id"]: c for c in get_all_cards()}

    # Aggregate spend across all months
    total_spend: dict[str, float] = {}
    for month_data in monthly_data.values():
        for cat, amt in month_data.items():
            total_spend[cat] = total_spend.get(cat, 0) + amt

    items = [
        Paragraph("Category Breakdown — Best Card per Category", s["H2"]),
        HRFlowable(width="100%", thickness=0.5, color=VAULT_BORDER, spaceAfter=12),
        Paragraph(
            "Shows which card in your wallet earned the most in each spending category.",
            s["Body"]),
        Spacer(1, 0.3 * cm),
    ]

    CATS = ["dining", "fuel", "grocery", "travel", "online", "utilities", "international"]
    table_rows = [["Category", "Your Spend/mo", "Best Card", "Rate", "Annual Reward"]]

    for cat in CATS:
        monthly_amt = total_spend.get(cat, 0) / max(len(monthly_data), 1)
        if monthly_amt < 1:
            continue
        # Best card across all cards (or user's cards if provided)
        search_cards = current_cards if current_cards else list(rewards_map.keys())
        best_rate, best_cid = 0.0, None
        for cid in search_cards:
            r = rewards_map.get(cid, {}).get(cat, 0)
            if r > best_rate:
                best_rate, best_cid = r, cid
        if best_cid is None:
            # Fall back to any card
            for cid, rates in rewards_map.items():
                r = rates.get(cat, 0)
                if r > best_rate:
                    best_rate, best_cid = r, cid

        card_name = all_cards.get(best_cid, {}).get("name", best_cid or "-") if best_cid else "-"
        annual    = round(monthly_amt * best_rate / 100 * 12, 0)
        table_rows.append([
            cat.capitalize(),
            _inr(monthly_amt),
            card_name,
            f"{best_rate:.1f}%",
            _inr(annual),
        ])

    col_w = [3*cm, 3.5*cm, 5.5*cm, 2*cm, 3.5*cm]
    t = Table(table_rows, colWidths=col_w, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  VAULT_CARD),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  VAULT_GOLD),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("BACKGROUND",    (0, 1), (-1, -1), VAULT_BG),
        ("TEXTCOLOR",     (0, 1), (-1, -1), VAULT_TEXT),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [VAULT_BG, VAULT_CARD]),
        ("GRID",          (0, 0), (-1, -1), 0.3, VAULT_BORDER),
        ("ALIGN",         (1, 0), (-1, -1), "RIGHT"),
        ("ALIGN",         (0, 0), (0, -1),  "LEFT"),
        ("ALIGN",         (2, 0), (2, -1),  "LEFT"),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
    ]))
    items.append(t)
    return items


def _page4_recommendations(s: dict, recommendations: list[dict]) -> list:
    """Recommendations for next year."""
    items = [
        Paragraph("Recommendations for Next Year", s["H2"]),
        HRFlowable(width="100%", thickness=0.5, color=VAULT_BORDER, spaceAfter=12),
        Paragraph(
            "Based on your spend patterns, these changes could maximise your rewards in the coming year.",
            s["Body"]),
        Spacer(1, 0.4 * cm),
    ]
    if not recommendations:
        items.append(Paragraph(
            "✅ Your current card stack is already well-optimised! "
            "No significant changes recommended.", s["Body"]))
        return items

    for i, rec in enumerate(recommendations[:5], 1):
        nav_gain   = rec.get("nav_gain", rec.get("leakage_inr", 0))
        card_name  = rec.get("card_name", rec.get("card_id", "Unknown"))
        reason     = rec.get("reason", "")
        shap_vals  = rec.get("shap_values", {})

        color = VAULT_GREEN if nav_gain >= 5000 else (VAULT_AMBER if nav_gain >= 2000 else VAULT_TEAL)

        block = [
            Paragraph(f"{i}. {card_name}", ParagraphStyle(
                "rh", fontName="Helvetica-Bold", fontSize=12,
                textColor=color, leading=16, spaceAfter=2)),
            Paragraph(f"Estimated gain: <b>{_inr(nav_gain)}/year</b>", s["Body"]),
        ]
        if reason:
            block.append(Paragraph(reason, s["Small"]))
        if shap_vals:
            shap_str = "  ·  ".join(
                f"{cat.capitalize()}: +{_inr(v)}"
                for cat, v in sorted(shap_vals.items(), key=lambda x: -x[1])[:3]
                if v > 0
            )
            if shap_str:
                block.append(Paragraph(f"Key drivers: {shap_str}", s["Small"]))
        block.append(Spacer(1, 0.1 * cm))

        items.extend(block)
        if i < len(recommendations[:5]):
            items.append(HRFlowable(width="80%", thickness=0.3,
                                    color=VAULT_BORDER, spaceAfter=8))

    items += [
        Spacer(1, 1.0 * cm),
        HRFlowable(width="100%", thickness=1, color=VAULT_GOLD, spaceAfter=8),
        Paragraph(
            "CrediWise-AI · Local · Private · Free  —  All data stays on your device.",
            s["Small"]),
    ]
    return items


# ─── Main generator ───────────────────────────────────────────────────────────

def generate_report(
    user_id:          str,
    year:             int,
    monthly_data:     dict[str, dict[str, float]],  # {YYYY-MM: {cat: amt}}
    persona:          str,
    current_nav:      float,
    optimal_nav:      float,
    leakage_rescued:  float,
    status:           str,
    recommendations:  list[dict],
    current_cards:    list[str] | None = None,
    reports_dir:      Path | None = None,
) -> str:
    """
    Generate the annual wallet report PDF.
    Returns the full path to the saved PDF.
    """
    if reports_dir is None:
        reports_dir = Path(__file__).resolve().parent / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    out_path = reports_dir / f"{user_id}_{year}.pdf"
    s        = _styles()

    total_spend = sum(
        sum(month.values())
        for month in monthly_data.values()
    )
    current_cards = current_cards or []

    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN,  bottomMargin=1.5 * cm,
    )

    story = []

    # ── Page 1: Cover ─────────────────────────────────────────────────────────
    story += _page1_cover(
        s, user_id, year, persona,
        total_spend, leakage_rescued, current_nav, optimal_nav, status,
    )
    story.append(PageBreak())

    # ── Page 2: Monthly chart ─────────────────────────────────────────────────
    story += _page2_monthly(s, monthly_data)
    story.append(PageBreak())

    # ── Page 3: Category breakdown ────────────────────────────────────────────
    story += _page3_category(s, monthly_data, current_cards)
    story.append(PageBreak())

    # ── Page 4: Recommendations ───────────────────────────────────────────────
    story += _page4_recommendations(s, recommendations)

    doc.build(story, onFirstPage=_dark_page, onLaterPages=_dark_page)
    return str(out_path)
