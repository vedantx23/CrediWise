/**
 * AI Backend API — talks to the Python/Flask backend on /ai-api/*
 * Vite proxies /ai-api → http://localhost:5001/api
 */
import axios from 'axios';

const aiApi = axios.create({
  baseURL: '/ai-api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Shadow Audit ─────────────────────────────────────
export async function runAudit(payload) {
  const { data } = await aiApi.post('/audit', payload);
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// ── Persona ──────────────────────────────────────────
export async function runPersona(payload) {
  const { data } = await aiApi.post('/persona', payload);
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// ── Approval Predictor ───────────────────────────────
export async function predictApproval(payload) {
  const { data } = await aiApi.post('/predict-approval', payload);
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// ── Life-Event Simulator ─────────────────────────────
export async function simulate(payload) {
  const { data } = await aiApi.post('/simulate', payload);
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// ── AI Boardroom ─────────────────────────────────────
export async function runBoardroom(payload) {
  const { data } = await aiApi.post('/boardroom', payload);
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// ── Community ────────────────────────────────────────
export async function getOffers(cardId) {
  const url = cardId ? `/offers?card_id=${cardId}` : '/offers';
  const { data } = await aiApi.get(url);
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function createOffer(payload) {
  const { data } = await aiApi.post('/offers', payload);
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function voteOffer(offerId, vote) {
  const { data } = await aiApi.post('/vote', { offer_id: offerId, vote });
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function getLeaderboard(params = {}) {
  const { data } = await aiApi.get('/leaderboard', { params });
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function submitCombo(payload) {
  const { data } = await aiApi.post('/submit-combo', payload);
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// ── Report ───────────────────────────────────────────
export async function generateReport(payload) {
  const response = await aiApi.post('/generate-report', payload, {
    responseType: 'blob',
  });
  return response.data;
}

// ── Alerts (Downgrade Detector) ──────────────────────
export async function getAlerts(cardIds = []) {
  const params = cardIds.length ? { card_ids: cardIds.join(',') } : {};
  const { data } = await aiApi.get('/alerts', { params });
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// ── Reward Expiry ────────────────────────────────────
export async function getRewardExpiries(userId) {
  const { data } = await aiApi.get(`/reward-expiry/${userId}`);
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// ── Health ───────────────────────────────────────────
export async function healthCheck() {
  const { data } = await aiApi.get('/health');
  return data.data;
}

export default aiApi;
