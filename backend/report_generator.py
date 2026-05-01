import os
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)

def generate_annual_report(user_id, year=2025):
    # Mock data based on Step 10 requirements
    total_spend = "₹12,45,000"
    persona = "The Reward Arbitrageur"
    leakage_rescued = "₹18,400"
    
    filepath = os.path.join(REPORTS_DIR, f"{user_id}_{year}.pdf")
    
    c = canvas.Canvas(filepath, pagesize=letter)
    width, height = letter
    
    def draw_header(title):
        c.setFillColor(colors.HexColor("#050505")) # Obsidian
        c.rect(0, height - 80, width, 80, fill=1)
        c.setFillColor(colors.HexColor("#d4af37")) # Gold
        c.setFont("Helvetica-Bold", 24)
        c.drawString(40, height - 50, title)
        c.setFont("Helvetica", 12)
        c.drawString(width - 160, height - 50, f"CrediWise-AI {year}")
        c.setFillColor(colors.black)
    
    # --- PAGE 1: Overview ---
    draw_header(f"Your {year} Wallet Report")
    c.setFont("Helvetica-Bold", 18)
    c.drawString(40, height - 150, "Executive Summary")
    
    c.setFont("Helvetica", 14)
    c.drawString(40, height - 190, f"Total Spend Analyzed: {total_spend}")
    c.drawString(40, height - 220, f"Financial Persona Revealed: {persona}")
    c.drawString(40, height - 250, f"Value Leakage Rescued: {leakage_rescued}")
    
    c.setFont("Helvetica-Oblique", 12)
    c.drawString(40, height - 300, "Your proactive card switching this year put you in the top 5% of optimizers.")
    c.showPage()
    
    # --- PAGE 2: Month-by-month reward earned bar chart ---
    draw_header("Rewards Velocity")
    c.setFont("Helvetica-Bold", 18)
    c.drawString(40, height - 150, "Month-by-Month Rewards Earned (in ₹)")
    
    # Draw simple mock bar chart
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    rewards = [1200, 1500, 1100, 2400, 1800, 1300, 2100, 1900, 1600, 2800, 3100, 2200]
    
    chart_x = 50
    chart_y = height - 500
    chart_w = 450
    chart_h = 300
    
    # axes
    c.setStrokeColor(colors.gray)
    c.line(chart_x, chart_y, chart_x + chart_w, chart_y)
    c.line(chart_x, chart_y, chart_x, chart_y + chart_h)
    
    bar_w = 20
    spacing = 36
    max_r = max(rewards)
    
    for i, r in enumerate(rewards):
        x = chart_x + 10 + (i * spacing)
        bar_h = (r / max_r) * chart_h
        y = chart_y
        
        # Draw bar
        c.setFillColor(colors.HexColor("#d4af37"))
        c.rect(x, y, bar_w, bar_h, fill=1, stroke=0)
        
        # Label month
        c.setFillColor(colors.black)
        c.setFont("Helvetica", 10)
        c.drawString(x, y - 20, months[i])
        
        # Label value
        c.setFont("Helvetica", 8)
        c.drawString(x, y + bar_h + 5, str(r))
        
    c.showPage()
    
    # --- PAGE 3: Category Breakdown ---
    draw_header("Category Dominance")
    c.setFont("Helvetica-Bold", 18)
    c.drawString(40, height - 150, "Top Earning Cards by Category")
    
    categories = [
        ("Travel", "HDFC Infinia", "₹12,400"),
        ("Dining", "Axis Ace", "₹4,200"),
        ("Online", "SBI SimplyCLICK", "₹3,100"),
        ("Utilities", "Axis Ace", "₹1,800"),
        ("Fuel", "BPCL SBI Card", "₹1,200")
    ]
    
    y = height - 200
    for cat, card, val in categories:
        c.setFont("Helvetica-Bold", 14)
        c.drawString(40, y, cat)
        c.setFont("Helvetica", 12)
        c.drawString(150, y, f"{card}  →  {val} earned")
        y -= 50
        
    c.showPage()
    
    # --- PAGE 4: Recommendations ---
    draw_header("Next Year's Strategy")
    c.setFont("Helvetica-Bold", 18)
    c.drawString(40, height - 150, "AI Recommendations for 2026")
    
    c.setFont("Helvetica", 12)
    recs = [
        "1. Downgrade SBI SimplyCLICK before renewal (rate dropped stealthily).",
        "2. Apply for Amex Platinum Travel (Your travel spend easily hits the ₹4L milestone).",
        "3. Route all utility payments through Axis Ace to guarantee 5% cashback."
    ]
    
    y = height - 200
    for r in recs:
        c.drawString(40, y, r)
        y -= 40
        
    c.save()
    return filepath
