# CrediWise: An AI-Driven, Persona-Aware Credit Card Recommendation System for the Indian Consumer Market

**Authors:** Vaishnavi Dubey  
**Affiliation:** Major Project, Computer Science / AI & Data Science  
**Date:** April 2026  

---

## Abstract

The proliferation of credit card products in India has created an information asymmetry problem: consumers face hundreds of card offerings, each with opaque reward structures, variable fee waivers, and category-specific earning rates that are difficult to compare objectively. This paper presents **CrediWise**, an end-to-end AI-powered credit card recommendation platform designed specifically for the Indian financial context. The system integrates a multi-phase machine learning pipeline comprising a Random Forest–based persona classifier, a per-card approval predictor, a shadow audit engine for Net Annual Value (NAV) leakage detection, and a Retrieval-Augmented Generation (RAG) conversational interface powered by a locally-hosted large language model. CrediWise further distinguishes itself through novel lifecycle-aware modules — a downgrade detector, a life event simulator, and a reward expiry tracker — that extend recommendation beyond one-time card selection into ongoing portfolio management. Empirical evaluation demonstrates strong predictive performance: R² ≈ 1.000 on NAV regression, NDCG@3 = 0.9987, and Precision@3 = 0.9893 on card ranking, with the persona classifier achieving robust cross-validated accuracy across four behaviorally distinct user segments. The system demonstrates that hyper-personalized, mathematically transparent financial recommendations are achievable at low infrastructure cost through the judicious combination of classical ML, structured domain knowledge, and local LLM inference.

---

## 1. Introduction

### 1.1 Context and Motivation

India's consumer credit market has undergone rapid expansion over the past decade. As of 2024, the Reserve Bank of India (RBI) reported over 100 million active credit cards in circulation, with major issuers — HDFC Bank, ICICI Bank, Axis Bank, SBI Cards, and American Express — each offering portfolios spanning entry-level, mid-tier, premium, and super-premium products. The reward structures of these products vary enormously: dining cashback rates range from 1% to 10%, forex markup fees span 0% to 3.5%, lounge access entitlements differ by issuer tier, and fee waiver thresholds introduce non-linear cost dynamics that are opaque to the average consumer.

Existing comparison platforms aggregate surface-level attributes — annual fee, joining bonus — but fail to compute the *realized* financial value of a card for a specific individual's spending pattern. A consumer who spends ₹15,000 per month on international travel requires an entirely different card portfolio than one whose expenditure is concentrated in groceries and utility bills. Generic "best credit cards in India" listicles, while widely consumed, provide no personalization and actively mislead users whose spending profiles deviate from assumed archetypes.

This gap motivates CrediWise: a system that models the Indian credit card decision as a multi-criteria optimization problem, where the objective is to maximize the user's *Net Annual Value* (NAV) — the annualized monetary benefit of card rewards less fees — conditioned on their individual spending distribution, income, CIBIL credit score, and existing card portfolio.

### 1.2 Problem Statement

Given a user profile *U = {S, I, C, W}*, where *S* is a vector of category-wise monthly expenditures (dining, fuel, grocery, travel, online, utilities, international, other), *I* is annual income, *C* is CIBIL score, and *W* is the set of currently held cards, the system must:

1. **Classify** the user into a behavioral persona that guides recommendation context and communication style.
2. **Rank** candidate credit cards by their marginal NAV contribution to the user's existing wallet *W*.
3. **Predict** approval probability for each recommended card given the user's creditworthiness.
4. **Alert** the user to reward leakage, rate downgrades, and expiry events on an ongoing basis.
5. **Simulate** the impact of life events (marriage, salary hike, EMI purchases) on the optimal card strategy.

### 1.3 Contributions

This work contributes:
- A domain-specific feature engineering pipeline for Indian credit card data, including regex-based extraction of reward rates from heterogeneous bank marketing text.
- A four-class persona classification model grounded in empirically validated Indian consumer spending archetypes.
- A SHAP-attributed shadow audit engine that computes NAV leakage with category-level explainability.
- An "AI Boardroom" multi-agent conversational module combining RAG with three distinct LLM personas for contextualized advisory dialogue.
- A set of lifecycle management modules — downgrade detector, life event simulator, reward expiry tracker — addressing the full temporal arc of credit card ownership.

---

## 2. Methodology

### 2.1 Data Acquisition and Feature Engineering

The foundation of CrediWise is a structured credit card dataset (`credit_card_dataset_master.csv`) comprising attributes for 16+ major Indian credit cards across issuers including HDFC, ICICI, Axis, SBI, Amex, Kotak, IndusInd, and AU Small Finance Bank. Raw attributes include: Card Name, Bank Name, Annual Fee, Reward Description (free-text), Minimum Income, Lounge Access (domestic and international), and Forex Markup Percentage.

A multi-stage data pipeline (`CrediWiseDataPipeline`) processes raw data into the engineered dataset (`credit_card_dataset_engineered.csv`). Key derived variables include:

- **Net Annual Value (NAV):** The primary optimization target, computed as the annualized sum of category-wise reward earnings less the effective annual fee (accounting for spend-based waivers).
- **Effective Reward Rate Index (ERRI):** A weighted aggregate reward rate across spend categories.
- **Travel Benefit Index:** A composite score of lounge access, forex markup, and airline mile transfer capacity.
- **Lifestyle Benefit Index:** A composite of dining, shopping, and entertainment perks.
- **Spend-Based Fee Waiver Threshold (₹):** The annual spend milestone at which the annual fee is waived.

Reward rates, previously encoded as unstructured marketing text (e.g., "Earn 5X reward points on dining, 2X on all other spends; 1 RP = ₹0.25"), are parsed into numeric category rates using custom regular expressions tuned for Indian financial terminology. This NLP preprocessing layer is critical: inconsistencies across issuers (use of "Lacs," "Cr," "Rs," "₹," and varied point-to-rupee conversion ratios) necessitate bespoke parsing rather than generic NLP libraries.

The pipeline additionally applies `KNNImputer` for missing values, `MultiLabelBinarizer` for categorical partner merchant tags, and `StandardScaler` for numerical features consumed by downstream ML models.

### 2.2 User Persona Classification

A **Random Forest classifier** (`persona_engine.py`) categorizes users into four behaviorally grounded segments based on their monthly spending distribution and demographic inputs:

| Persona ID | Name | Behavioral Signature |
|---|---|---|
| 0 | The Stealth Nomad | High travel (30–50%) and international (12–25%) spend; high income (₹12L–₹30L); 2–5 existing cards |
| 1 | The High-Street Architect | High dining (25–40%) and online (22–35%) spend; city-centric lifestyle; 1–4 cards |
| 2 | The Reward Arbitrageur | Diversified spend across all reward categories; high income (₹15L–₹50L); 3–7 cards; maximizes ERR |
| 3 | The Frugal Zen Master | Grocery (30–45%) and utility (20–30%) dominant; low income (₹3L–₹8L); 1–2 cards; prefers zero-fee |

Synthetic training data (4 × 1,200 = 4,800 samples) is generated using parameterized stochastic spend distributions per persona with realistic Indian income ranges and entropy-based spend diversification features. The feature vector *X* ∈ ℝ¹¹ includes: per-category spend percentages (8 dimensions), log-transformed total monthly spend, annual income in lakhs, number of existing cards, and Shannon entropy of the spend distribution.

The Random Forest model is configured with 200 estimators, maximum depth 12, and balanced class weighting. Post-prediction, SHAP TreeExplainer values attribute each classification to its driving features, providing interpretable top-3 spend drivers per user. Cross-validated accuracy (5-fold) is reported on held-out test splits.

### 2.3 Shadow Audit Engine and NAV Leakage Quantification

The shadow audit engine (`audit_engine.py`) implements a **comparative wallet analysis** framework. Given the user's current card wallet *W* and their spend vector *S*, the engine computes:

- **Current NAV:** Annual rewards achievable using *best rates across currently held cards*.
- **Optimal NAV:** Annual rewards achievable if the user held the globally best card per category.
- **Leakage (₹/year):** `Optimal NAV − Current NAV`

Leakage status is classified as *pass* (<₹2,000), *warning* (₹2,000–₹5,000), or *critical* (>₹5,000). SHAP attribution at the category level is computed per candidate card: `shap[cat] = max(0, new_rate[cat] − current_best_rate[cat]) × spend[cat] / 100 × 12`. Candidate cards are ranked by their marginal NAV contribution, filtered by eligibility (income and CIBIL thresholds), and presented with natural-language explanations derived from SHAP top-2 categories.

### 2.4 Card Approval Prediction

The approval predictor (`approval_predictor.py`) trains a **per-card Random Forest binary classifier** for 16 cards, with features: CIBIL score, annual income (₹), and existing cards count. Training data is synthetically generated (500 samples per card) using publicly documented RBI-derived CIBIL and income thresholds as probabilistic priors. Approval probability is modulated by distance from thresholds and penalized for high card counts (>3), reflecting real-world hard inquiry and credit utilization risk factors. Each model is evaluated by 5-fold ROC-AUC; the bundle is serialized as `models/approval_rf.pkl`.

### 2.5 AI Boardroom: Multi-Agent RAG Advisory

The Boardroom module (`boardroom.py`) orchestrates three LLM agents with distinct advisory personalities, powered by a locally hosted Ollama model (preference order: llama3 → mistral → llama3.2):

- **Max (The Accountant):** Optimizes for rupee-for-rupee NAV; presents fee breakdowns and ERR calculations.
- **Sage (The Traveler):** Advocates for lounge access, forex savings, and airline mile accumulation.
- **Mint (The Minimalist):** Champions zero-fee, flat-cashback simplicity.

Each agent retrieves a factual card context block from SQLite — the top-*N* cards ranked by relevance to the user's spend categories — and prepends it to the system prompt (Retrieval-Augmented Generation). Agents speak sequentially (Max → Sage → Mint), with each agent receiving the prior responses as debate context. Conversation history (last 5 exchanges) is persisted per user per agent in JSON memory files, enabling continuity across sessions. A deterministic rule-based fallback ensures the feature remains usable when Ollama is offline.

### 2.6 Lifecycle Management Modules

**Downgrade Detector** (`downgrade_detector.py`): A weekly APScheduler job snapshots current reward rates from SQLite into a `card_rate_history` table. Differential analysis between successive snapshots identifies rate reductions (with a 0.001% floating-point tolerance). Each detected downgrade is persisted in `downgrade_alerts` with a computed annual extra-loss (₹) based on user spend in the affected category. This accumulating historical rate dataset represents a compounding competitive advantage — no public source maintains granular, time-series Indian credit card reward rate data.

**Life Event Simulator** (`life_event_simulator.py`): Models the financial impact of three pivotal life events:
1. *Marriage:* Merges two user profiles, deduplicates card wallets, and runs a joint audit to identify household-level leakage and optimal card additions.
2. *Salary Hike:* Computes newly unlocked cards at the new income level and generates radar chart data comparing pre/post accessibility and NAV.
3. *EMI Purchase:* Applies flat-rate EMI interest arithmetic (standard Indian bank model at up to 3%/month) to compute break-even between EMI interest cost and cashback earned, with monthly chart data.

**Reward Expiry Tracker** (`reward_tracker.py`): A nightly APScheduler cron job (00:05 IST) queries reward expiry records within a 30-day window, generates bank-specific redemption hints, and flags records to prevent duplicate alerts.

### 2.7 System Architecture

The system follows a four-phase architecture:

1. **Data Acquisition:** Python scraping scripts collect card data; structured into master CSV.
2. **Data Pipeline:** `CrediWiseDataPipeline` standardizes, engineers features, and serializes ML artifacts.
3. **Decision Engine:** FastAPI backend serves pre-computed model artifacts for low-latency inference.
4. **Frontend:** React/Vite single-page application with D3.js and Chart.js for interactive visualizations (radar charts, reward breakdown stacked charts, cluster scatter plots, NAV vs. annual fee curves).

---

## 3. Results and Findings

### 3.1 Model Performance

Evaluation of the NAV regression and card ranking models yields the following results (as documented in `artifacts/evaluation_report.json`):

| Metric | Value |
|---|---|
| Regression RMSE (₹) | 11,971.33 |
| Regression MAE (₹) | 2,626.81 |
| Regression R² | 0.9999 |
| Ranking NDCG@3 | 0.9987 |
| Ranking Precision@3 | 0.9893 |
| Best Model | Random Forest (rf) |
| Optimal Estimators | 178 |
| Optimal Max Depth | 15 |

The near-perfect R² (≈ 1.000) on NAV regression reflects the deterministic mathematical nature of the reward computation once card rates and spend are known. The MAE of ₹2,627 is practically significant — it represents the expected per-user error in NAV estimation, which is acceptable given the range of NAV values across card tiers (₹0 to ₹80,000+ annually for super-premium cards). Ranking performance (NDCG@3 = 0.9987) indicates that the system's top-3 card recommendations are nearly always ordered optimally relative to the ground-truth NAV ranking.

### 3.2 User Segmentation

K-means clustering on user profiles (`artifacts/user_card_training_frame.csv`) identifies four stable user clusters, consistent with the persona taxonomy:

| Cluster | Label |
|---|---|
| 0 | Minimal Fee Users |
| 1 | Cashback Maximizers |
| 2 | Lifestyle Users |
| 3 | Travel Optimizers |

Card segmentation similarly yields four tiers: Entry-Level, Mid-Tier, Premium, and Super-Premium — aligning with issuer tier structures and enabling persona-to-card-tier affinity matching.

### 3.3 Audit Engine Findings

The shadow audit engine demonstrates measurable leakage for typical Indian urban spending profiles. Using default spend assumptions (dining ₹5,000, fuel ₹3,000, grocery ₹4,000, travel ₹3,000, online ₹6,000, utilities ₹2,000, international ₹1,000 per month — ₹24,000 total), the gap between optimal and a suboptimal two-card wallet consistently produces critical-status leakage (>₹5,000/year), validating the business case for active wallet optimization.

### 3.4 Approval Predictor

Per-card Random Forest models trained on CIBIL/income/card-count features achieve average ROC-AUC above 0.80 in 5-fold cross-validation across 16 card models. Cards with clearly defined public thresholds (e.g., Kotak 811, minimum CIBIL 600, no income floor) achieve near-perfect AUC, while borderline premium cards (e.g., Amex Gold, HDFC Regalia) produce moderate AUC scores reflecting genuine threshold uncertainty.

---

## 4. Discussion

### 4.1 Implications

CrediWise demonstrates that the Indian consumer credit card decision can be reframed as a tractable machine learning problem. The key insight is that reward rate data, while encoded in heterogeneous marketing language, can be normalized into a structured feature space that supports quantitative optimization. The SHAP attribution framework enables the system to generate *explanations* rather than opaque rankings — a requirement for consumer trust in financial AI.

The AI Boardroom module addresses a qualitative gap in algorithmic recommendation: users often want to *discuss* a financial decision, not merely receive a ranked list. By instantiating three LLM agents with contrasting advisory philosophies, CrediWise simulates a multi-perspective advisory conversation grounded in factual, hallucination-resistant card data. The RAG architecture — injecting SQLite-sourced card facts directly into each agent's system prompt — is essential to this reliability.

### 4.2 Limitations

Several limitations merit acknowledgment:

1. **Synthetic Training Data:** Both the persona classifier and approval predictor are trained on synthetically generated data. While the distributions are parameterized using domain knowledge (RBI guidelines, public issuer thresholds), the absence of real transaction data limits the external validity of these models. Validation on actual anonymized bank statement data would substantially strengthen confidence.

2. **Static Reward Rates:** Card reward rates change frequently (as the downgrade detector is designed to capture). The initial dataset reflects rates at a point in time; the rate history system accumulates data only from deployment forward.

3. **Scope of Card Coverage:** The dataset covers 16 major Indian credit cards. The Indian market includes hundreds of co-branded, regional, and NBFC-issued cards not represented in the current corpus, which may be optimal for specific consumer niches.

4. **NAV Model Assumptions:** The NAV computation assumes all spending in a category earns the card's stated rate, ignoring caps, merchant exclusions, and accelerated partner bonuses. Real reward accrual is often lower than the stated rate due to these nuances.

5. **CIBIL Score as a Proxy:** The approval predictor uses CIBIL score as a creditworthiness summary, but actual card approval decisions consider additional bureau factors, existing credit limits, and internal bank scoring models that are not publicly disclosed.

### 4.3 Potential Improvements

1. **Bank Statement OCR Integration:** The `statement_parser.py` module and the OCR offer parser in `boardroom.py` provide scaffolding for automated spend inference from uploaded bank statements or SMS screenshots — a feature that would dramatically improve spend data accuracy.
2. **Online Learning:** The downgrade detector's historical rate database could support online updating of card models as rates change, keeping recommendations current without full retraining.
3. **Portfolio-Level Optimization:** Current recommendations optimize marginal NAV card-by-card. A joint portfolio optimizer (e.g., integer linear programming over the full card-category rate matrix) could yield globally optimal multi-card wallets.
4. **Mobile-First Interface:** The current React/Vite SPA could be ported to React Native or Flutter to serve India's predominantly mobile-first user base.
5. **Real Data Validation:** Partnering with a fintech for anonymized transaction data access would enable supervised training on real spending patterns and ground-truth card utilization.

---

## 5. Conclusion

This paper has presented CrediWise, a comprehensive AI-driven credit card recommendation system tailored to the structural complexities of the Indian consumer credit market. The system's core contribution lies in its integration of rigorous financial mathematics (NAV computation, SHAP attribution, leakage quantification) with modern machine learning (Random Forest persona classification, per-card approval prediction) and generative AI (multi-agent RAG boardroom). Lifecycle-aware modules — the downgrade detector, life event simulator, and reward expiry tracker — extend the system's value beyond one-time recommendations into ongoing portfolio stewardship.

Empirical evaluation confirms strong model performance across all key metrics, with near-perfect ranking quality (NDCG@3 = 0.9987) and practical regression accuracy (MAE ≈ ₹2,627). The system's commitment to local LLM inference, privacy-preserving computation, and mathematically transparent recommendations positions it as a credible alternative to opaque, affiliate-driven comparison platforms.

Future work will focus on real transaction data integration, portfolio-level joint optimization, and expansion of the card corpus to encompass the full breadth of the Indian credit card market.

---

## References

1. **Scikit-learn:** Pedregosa, F., et al. (2011). Scikit-learn: Machine Learning in Python. *Journal of Machine Learning Research*, 12, 2825–2830. https://scikit-learn.org

2. **SHAP:** Lundberg, S. M., & Lee, S.-I. (2017). A Unified Approach to Interpreting Model Predictions. *Advances in Neural Information Processing Systems*, 30. https://shap.readthedocs.io

3. **FastAPI:** Ramírez, S. (2019). FastAPI. https://fastapi.tiangolo.com

4. **Ollama:** Ollama Open Source Project (2023). Run Large Language Models Locally. https://ollama.com

5. **Pandas:** McKinney, W. (2010). Data Structures for Statistical Computing in Python. *Proceedings of the 9th Python in Science Conference*, 51–56. https://pandas.pydata.org

6. **NumPy:** Harris, C. R., et al. (2020). Array programming with NumPy. *Nature*, 585, 357–362. https://numpy.org

7. **React:** Meta Open Source (2013). React: A JavaScript library for building user interfaces. https://react.dev

8. **Chart.js:** Chart.js Contributors (2013). Simple yet flexible JavaScript charting. https://www.chartjs.org

9. **D3.js:** Bostock, M., Ogievetsky, V., & Heer, J. (2011). D³ Data-Driven Documents. *IEEE Transactions on Visualization and Computer Graphics*, 17(12), 2301–2309. https://d3js.org

10. **APScheduler:** Salminen, A. (2012). Advanced Python Scheduler. https://apscheduler.readthedocs.io

11. **TOPSIS (MCDA):** Hwang, C. L., & Yoon, K. (1981). *Multiple Attribute Decision Making: Methods and Applications*. Springer.

12. **Reserve Bank of India — Credit Card Guidelines:** RBI Master Direction on Credit Card and Debit Card — Issuance and Conduct Directions, 2022. https://www.rbi.org.in

13. **RAG (Retrieval-Augmented Generation):** Lewis, P., et al. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. *Advances in Neural Information Processing Systems*, 33.

14. **Shannon Entropy (Spend Diversification):** Shannon, C. E. (1948). A Mathematical Theory of Communication. *Bell System Technical Journal*, 27(3), 379–423.

15. **Random Forests:** Breiman, L. (2001). Random Forests. *Machine Learning*, 45(1), 5–32.

16. **NDCG (Normalized Discounted Cumulative Gain):** Järvelin, K., & Kekäläinen, J. (2002). Cumulated gain-based evaluation of IR techniques. *ACM Transactions on Information Systems*, 20(4), 422–446.
