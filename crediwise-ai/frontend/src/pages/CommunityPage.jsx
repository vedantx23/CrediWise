/**
 * CommunityPage.jsx — Community Intelligence UI
 *
 * Tabs:
 *   1. Offer Validator  — vote on whether offers actually work
 *   2. Card Combo Leaderboard — top stacks by city + persona
 *   3. Submit Your Stack — contribute your combo
 */

import { useState, useEffect } from "react";
import { inr } from "../utils/format";
import api from "../api";

const PERSONAS = [
  "The Stealth Nomad",
  "The High-Street Architect",
  "The Reward Arbitrageur",
  "The Frugal Zen Master",
];

const TABS = [
  { key: "leaderboard", label: "🏆 Leaderboard" },
  { key: "submit",      label: "➕ Submit Stack" },
  { key: "offers",      label: "🗳️ Offer Votes" },
];

// ── Leaderboard ───────────────────────────────────────────────────────────────
function Leaderboard() {
  const [city, setCity]       = useState("");
  const [persona, setPersona] = useState("");
  const [combos, setCombos]   = useState([]);
  const [cities, setCities]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/api/leaderboard/cities").then(({ data }) => {
      if (data.success) setCities(data.data.all_cities || []);
    });
    fetchBoard();
  }, []);

  const fetchBoard = async (c = city, p = persona) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (c) params.set("city", c);
      if (p) params.set("persona", p);
      params.set("top_n", "10");
      const { data } = await api.get(`/api/leaderboard?${params}`);
      if (data.success) setCombos(data.data.combos);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => fetchBoard(city, persona);

  return (
    <div className="flex flex-col gap-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">City</label>
          <select value={city} onChange={e => setCity(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500">
            <option value="">All Cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Persona</label>
          <select value={persona} onChange={e => setPersona(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500">
            <option value="">All Personas</option>
            {PERSONAS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <button onClick={handleFilter} disabled={loading}
          className="btn-primary disabled:opacity-50 self-end">
          {loading ? "Loading…" : "Filter"}
        </button>
      </div>

      {/* Results */}
      {combos.length === 0 ? (
        <p className="text-slate-400 text-sm py-8 text-center">
          No combos yet for this filter. Be the first to submit!
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {combos.map((combo, i) => (
            <div key={combo.combo_id}
              className="glass rounded-xl p-4 flex gap-4 items-start hover:border-slate-500 transition-colors">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-vault-gold/20 text-vault-gold
                              flex items-center justify-center font-bold text-sm">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium leading-relaxed">
                  {combo.display}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {combo.card_names?.map((name, ci) => (
                    <span key={ci}
                      className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                      {name}
                    </span>
                  ))}
                </div>
                <div className="flex gap-4 mt-2 text-xs text-slate-400">
                  <span>📍 {combo.city || "India"}</span>
                  {combo.persona && <span>👤 {combo.persona}</span>}
                  <span>📊 {combo.submissions} submission{combo.submissions !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold text-teal-400">{inr(combo.nav_score)}</p>
                <p className="text-xs text-slate-400">avg/year</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Submit Stack ──────────────────────────────────────────────────────────────
function SubmitStack() {
  const [cards, setCards]     = useState("");
  const [city, setCity]       = useState("Mumbai");
  const [persona, setPersona] = useState(PERSONAS[2]);
  const [navScore, setNav]    = useState("");
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const submit = async () => {
    setError("");
    const cardList = cards.split(",").map(s => s.trim()).filter(Boolean);
    if (!cardList.length) { setError("Enter at least one card ID."); return; }

    setLoading(true);
    try {
      const { data } = await api.post("/api/submit-combo", {
        cards:     cardList,
        city,
        persona,
        nav_score: +navScore || 0,
      });
      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError("Submission failed. Check card IDs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-xl">
      <p className="text-slate-400 text-sm">
        Share your winning card stack. Deduplicates automatically —
        your submission improves the community average.
      </p>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Card IDs (comma-separated)</label>
          <input value={cards} onChange={e => setCards(e.target.value)}
            placeholder="e.g. hdfc_regalia, axis_ace, sbi_simplyclick"
            className="glass rounded-lg px-3 py-2 text-sm text-white border border-slate-700 focus:border-teal-500 focus:outline-none" />
          <p className="text-xs text-slate-500">
            Use IDs like: hdfc_regalia, hdfc_millennia, icici_amazon, axis_ace, kotak_811
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">City</label>
            <select value={city} onChange={e => setCity(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500">
              {["Mumbai","Delhi","Bangalore","Hyderabad","Chennai","Kolkata","Pune","Other"]
                .map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Your Persona</label>
            <select value={persona} onChange={e => setPersona(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500">
              {PERSONAS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Your Annual NAV (₹) — optional</label>
          <input value={navScore} onChange={e => setNav(e.target.value)} type="number"
            placeholder="e.g. 18400"
            className="glass rounded-lg px-3 py-2 text-sm text-white border border-slate-700 focus:border-teal-500 focus:outline-none" />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button onClick={submit} disabled={loading}
        className="btn-primary self-start disabled:opacity-50">
        {loading ? "Submitting…" : "Submit My Stack"}
      </button>

      {result && (
        <div className="glass rounded-xl p-4 border border-teal-500/30">
          <p className="text-teal-400 text-sm font-semibold mb-2">✅ Stack submitted!</p>
          <p className="text-white text-sm">{result.display}</p>
          <p className="text-xs text-slate-400 mt-2">
            {result.submissions} total submission{result.submissions !== 1 ? "s" : ""}
            {" · "}avg NAV {inr(result.nav_score)}/yr
          </p>
        </div>
      )}
    </div>
  );
}

// ── Offer Votes ───────────────────────────────────────────────────────────────
function OfferVotes() {
  const [offers, setOffers]     = useState([]);
  const [cardFilter, setFilter] = useState("");
  const [loading, setLoading]   = useState(false);
  const [newOffer, setNewOffer]  = useState({ card_id: "", offer_text: "", offer_rate: "" });
  const [creating, setCreating] = useState(false);

  const fetchOffers = async (cardId = cardFilter) => {
    setLoading(true);
    try {
      const params = cardId ? `?card_id=${cardId}` : "";
      const { data } = await api.get(`/api/offers${params}`);
      if (data.success) setOffers(data.data.offers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOffers(); }, []);

  const handleVote = async (offerId, vote) => {
    try {
      const { data } = await api.post("/api/vote", { offer_id: offerId, vote });
      if (data.success) {
        setOffers(prev => prev.map(o =>
          o.offer_id === offerId ? { ...o, ...data.data } : o
        ));
      }
    } catch {}
  };

  const handleCreate = async () => {
    if (!newOffer.card_id || !newOffer.offer_text) return;
    setCreating(true);
    try {
      const { data } = await api.post("/api/offers", {
        card_id:    newOffer.card_id,
        offer_text: newOffer.offer_text,
        offer_rate: newOffer.offer_rate ? +newOffer.offer_rate : undefined,
      });
      if (data.success) {
        setOffers(prev => [data.data, ...prev]);
        setNewOffer({ card_id: "", offer_text: "", offer_rate: "" });
      }
    } finally {
      setCreating(false);
    }
  };

  const AcceptancePill = ({ rate, total }) => {
    if (rate === null || total === 0)
      return <span className="text-xs text-slate-500 px-2 py-0.5 rounded-full bg-slate-700/40">No votes yet</span>;
    const color = rate >= 70 ? "text-green-400 bg-green-500/10 border-green-500/20"
                : rate >= 40 ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                             : "text-red-400 bg-red-500/10 border-red-500/20";
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>
        {rate}% confirmed ({total} votes)
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Create new offer */}
      <div className="glass rounded-xl p-4 flex flex-col gap-3">
        <h4 className="text-xs font-semibold text-teal-400 uppercase tracking-wide">Add an Offer</h4>
        <div className="grid grid-cols-3 gap-2">
          <input value={newOffer.card_id} onChange={e => setNewOffer({...newOffer, card_id: e.target.value})}
            placeholder="Card ID (e.g. axis_ace)"
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 col-span-1" />
          <input value={newOffer.offer_text} onChange={e => setNewOffer({...newOffer, offer_text: e.target.value})}
            placeholder="Offer description"
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 col-span-1" />
          <div className="flex gap-2">
            <input value={newOffer.offer_rate} onChange={e => setNewOffer({...newOffer, offer_rate: e.target.value})}
              placeholder="Rate %" type="number"
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 flex-1 w-20" />
            <button onClick={handleCreate} disabled={creating}
              className="btn-primary text-xs px-3 disabled:opacity-50">
              {creating ? "…" : "Add"}
            </button>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 items-center">
        <input value={cardFilter} onChange={e => setFilter(e.target.value)}
          placeholder="Filter by card ID…"
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 w-56" />
        <button onClick={() => fetchOffers(cardFilter)} disabled={loading}
          className="btn-primary text-xs px-4 disabled:opacity-50">
          {loading ? "…" : "Search"}
        </button>
        {cardFilter && (
          <button onClick={() => { setFilter(""); fetchOffers(""); }}
            className="text-xs text-slate-400 hover:text-white px-2">
            Clear
          </button>
        )}
      </div>

      {/* Offers list */}
      {offers.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">
          No offers yet. Add one above!
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {offers.map(offer => (
            <div key={offer.offer_id} className="glass rounded-xl p-4 flex gap-4 items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                    {offer.card_name || offer.card_id}
                  </span>
                  {offer.offer_rate && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                      {offer.offer_rate}%
                    </span>
                  )}
                </div>
                <p className="text-white text-sm">{offer.offer_text}</p>
                <div className="mt-2">
                  <AcceptancePill rate={offer.acceptance_rate} total={offer.total_votes} />
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <button onClick={() => handleVote(offer.offer_id, "up")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                             bg-green-500/10 text-green-400 border border-green-500/20
                             hover:bg-green-500/20 transition-colors">
                  👍 {offer.upvotes}
                </button>
                <button onClick={() => handleVote(offer.offer_id, "down")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                             bg-red-500/10 text-red-400 border border-red-500/20
                             hover:bg-red-500/20 transition-colors">
                  👎 {offer.downvotes}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CommunityPage() {
  const [tab, setTab] = useState("leaderboard");

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Community Intelligence</h1>
        <p className="text-slate-400 mt-1">
          Crowdsourced card stacks, offer validation, and city-level leaderboards
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 p-1 bg-slate-800/60 rounded-xl w-fit">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === key
                ? "bg-vault-card text-vault-gold shadow"
                : "text-slate-400 hover:text-white"
              }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="glass rounded-2xl p-6">
        {tab === "leaderboard" && <Leaderboard />}
        {tab === "submit"      && <SubmitStack />}
        {tab === "offers"      && <OfferVotes />}
      </div>
    </div>
  );
}
