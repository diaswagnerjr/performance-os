import { isSupabaseConfigured, supabaseClient, getCurrentUser, signIn, signUp, resetPassword, signOut, upsertProfile } from "./supabase.js";
import { baseline, classifyAdherence, classifyPain, formatDate, renderDashboard, statusText } from "./dashboard.js";

const checklistItems = [
  ["gym_3x", "Academia mínimo 3x"],
  ["cardio_or_tennis", "Corrida e/ou tênis"],
  ["protein_all_meals", "Proteína em todas as refeições"],
  ["whey", "Whey"],
  ["creatine_daily", "Creatina diária"],
  ["no_weekday_sweets", "Sem doces durante a semana"],
  ["clean_eating", "Alimentação limpa"],
  ["sleep_7h", "Sono >= 7h"],
  ["sleep_score_75", "Sleep Score >= 75"],
  ["fatty_fish", "Peixe gorduroso"],
  ["olive_oil", "Azeite"],
  ["nuts", "Castanhas"],
  ["shoulder_mobility", "Mobilidade do ombro"],
  ["tennis_warmup", "Aquecimento pré-tênis"],
  ["adequate_recovery", "Recuperação adequada"]
];

const storeKey = "performance-os-state";
let currentUser = null;
let state = loadLocalState();

document.addEventListener("DOMContentLoaded", init);
window.addEventListener("resize", () => renderAll());

async function init() {
  buildChecklist();
  wireNavigation();
  wireForms();
  setDefaultDates();
  document.getElementById("auth-panel").classList.add("visible");
  document.getElementById("auth-mode-note").textContent = isSupabaseConfigured
    ? "Supabase configurado. Use email e senha cadastrados no projeto wagner-performance-os."
    : "Modo demo local ativo. Substitua SUPABASE_URL e SUPABASE_ANON_KEY em supabase.js para sincronizar.";
  try {
    currentUser = await getCurrentUser();
    if (currentUser && isSupabaseConfigured) {
      await loadRemoteState();
      document.getElementById("auth-panel").classList.remove("visible");
    }
    if (!isSupabaseConfigured) document.getElementById("auth-panel").classList.add("visible");
  } catch (error) {
    document.getElementById("auth-panel").classList.add("visible");
    notify(error.message);
  }
  renderAll();
}

function wireNavigation() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".tab-page").forEach((page) => page.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(`tab-${button.dataset.tab}`).classList.add("active");
      renderAll();
    });
  });
  document.getElementById("theme-toggle").addEventListener("click", () => document.body.classList.toggle("light"));
}

function wireForms() {
  document.getElementById("auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.target;
    try {
      const data = await signIn(form.email.value, form.password.value);
      currentUser = data.user || (await getCurrentUser());
      await ensureProfile(form.name.value);
      if (isSupabaseConfigured) await loadRemoteState();
      document.getElementById("auth-panel").classList.remove("visible");
      renderAll();
    } catch (error) {
      notify(error.message);
    }
  });
  document.getElementById("sign-up").addEventListener("click", async () => {
    const form = document.getElementById("auth-form");
    try {
      const data = await signUp(form.email.value, form.password.value, form.name.value);
      currentUser = data.user || { id: "demo-user", email: form.email.value };
      await ensureProfile(form.name.value);
      notify("Conta criada. Confirme o email se a confirmação estiver ativa no Supabase.");
    } catch (error) {
      notify(error.message);
    }
  });
  document.getElementById("reset-password").addEventListener("click", async () => {
    const email = document.querySelector('[name="email"]').value;
    if (!email) return notify("Informe o email para recuperar a senha.");
    await resetPassword(email);
    notify("Se o email existir, o Supabase enviará o link de recuperação.");
  });
  document.getElementById("sign-out").addEventListener("click", async () => {
    await signOut();
    currentUser = null;
    document.getElementById("auth-panel").classList.add("visible");
  });
  document.getElementById("weekly-form").addEventListener("change", updateWeeklyPreview);
  document.getElementById("weekly-form").addEventListener("submit", saveWeekly);
  document.getElementById("tennis-form").addEventListener("submit", saveTennis);
  document.getElementById("shoulder-form").addEventListener("change", updateShoulderPreview);
  document.getElementById("shoulder-form").addEventListener("submit", saveShoulder);
  document.getElementById("body-form").addEventListener("submit", saveBody);
  document.getElementById("seed-demo").addEventListener("click", seedDemo);
}

function buildChecklist() {
  const container = document.getElementById("weekly-checklist");
  checklistItems.forEach(([name, label]) => {
    const item = document.createElement("label");
    item.className = "check-item";
    item.innerHTML = `<input type="checkbox" name="${name}" /> <span>${label}</span>`;
    container.appendChild(item);
  });
}

function setDefaultDates() {
  const today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('input[type="date"]').forEach((input) => { if (!input.value) input.value = today; });
  updateWeeklyPreview();
  updateShoulderPreview();
}

async function ensureProfile(name) {
  if (!currentUser) return;
  await upsertProfile({ id: currentUser.id, name: name || "Wagner Dias Junior", created_at: new Date().toISOString() });
}

async function loadRemoteState() {
  const tables = ["weekly_reviews", "weekly_checklist", "tennis_matches", "shoulder_tracking", "body_composition"];
  const results = await Promise.all(tables.map((table) => supabaseClient.from(table).select("*").order("created_at", { ascending: true })));
  results.forEach((result) => { if (result.error) throw result.error; });
  state = { weekly_reviews: results[0].data, weekly_checklist: results[1].data, tennis_matches: results[2].data, shoulder_tracking: results[3].data, body_composition: results[4].data.length ? results[4].data : [baseline] };
}

async function saveWeekly(event) {
  event.preventDefault();
  const form = event.target;
  const checklist = Object.fromEntries(checklistItems.map(([name]) => [name, form[name].checked]));
  const adherence = Math.round((Object.values(checklist).filter(Boolean).length / checklistItems.length) * 100);
  const review = rowWithUser({
    week_start: form.week_start.value,
    adherence_percent: adherence,
    status: statusText(classifyAdherence(adherence)),
    weekly_score: Number(form.weekly_score.value),
    sleep_hours_avg: Number(form.sleep_hours_avg.value),
    sleep_score_avg: Number(form.sleep_score_avg.value),
    main_evolution: form.main_evolution.value,
    main_difficulty: form.main_difficulty.value,
    main_learning: form.main_learning.value,
    next_week_focus: form.next_week_focus.value
  });
  const savedReview = await insertRow("weekly_reviews", review);
  const checklistRow = rowWithUser({ weekly_review_id: savedReview.id, ...checklist });
  const savedChecklist = await insertRow("weekly_checklist", checklistRow);
  state.weekly_reviews.push(savedReview);
  state.weekly_checklist.push(savedChecklist);
  persistAndRender();
  form.reset();
  setDefaultDates();
}

async function saveTennis(event) {
  event.preventDefault();
  const form = event.target;
  const previousTotal = state.tennis_matches.at(-1)?.total_points || 932;
  const gained = Number(form.ranking_points.value || 0);
  const row = rowWithUser({
    match_date: form.match_date.value,
    opponent: form.opponent.value,
    score: form.score.value,
    result: form.result.value,
    ranking_points: gained,
    total_points: Number(form.total_points.value || previousTotal + (form.result.value === "win" ? gained : 0)),
    ranking_position: Number(form.ranking_position.value),
    forehand: Number(form.forehand.value),
    backhand: Number(form.backhand.value),
    serve: Number(form.serve.value),
    movement: Number(form.movement.value),
    tactics: Number(form.tactics.value),
    strengths: form.strengths.value,
    weaknesses: form.weaknesses.value,
    next_focus: form.next_focus.value
  });
  state.tennis_matches.push(await insertRow("tennis_matches", row));
  persistAndRender();
  form.reset();
  setDefaultDates();
}

async function saveShoulder(event) {
  event.preventDefault();
  const form = event.target;
  const maxPain = Math.max(Number(form.pain_rest.value), Number(form.pain_movement.value), Number(form.pain_serve.value));
  const row = rowWithUser({ week_start: form.week_start.value, pain_rest: Number(form.pain_rest.value), pain_movement: Number(form.pain_movement.value), pain_serve: Number(form.pain_serve.value), status: statusText(classifyPain(maxPain)), notes: form.notes.value });
  state.shoulder_tracking.push(await insertRow("shoulder_tracking", row));
  persistAndRender();
}

async function saveBody(event) {
  event.preventDefault();
  const form = event.target;
  const raw = Object.fromEntries(new FormData(form).entries());
  const row = rowWithUser({ assessment_date: raw.assessment_date, weight: Number(raw.weight), body_fat: Number(raw.body_fat), muscle_mass: Number(raw.muscle_mass), visceral_fat: Number(raw.visceral_fat), inbody_score: Number(raw.inbody_score), notes: raw.notes });
  state.body_composition.push(await insertRow("body_composition", row));
  persistAndRender();
}

async function insertRow(table, row) {
  if (!isSupabaseConfigured) return row;
  const { data, error } = await supabaseClient.from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}

function rowWithUser(row) {
  return { id: crypto.randomUUID(), user_id: currentUser?.id || "demo-user", created_at: new Date().toISOString(), ...row };
}

function updateWeeklyPreview() {
  const form = document.getElementById("weekly-form");
  const completed = checklistItems.filter(([name]) => form[name]?.checked).length;
  const adherence = Math.round((completed / checklistItems.length) * 100);
  document.getElementById("weekly-score-preview").textContent = `${adherence}%`;
  form.status.value = statusText(classifyAdherence(adherence));
}

function updateShoulderPreview() {
  const form = document.getElementById("shoulder-form");
  const maxPain = Math.max(Number(form.pain_rest.value), Number(form.pain_movement.value), Number(form.pain_serve.value));
  document.getElementById("shoulder-preview").textContent = statusText(classifyPain(maxPain));
}

function renderAll() {
  state.weekly_reviews.sort((a, b) => a.week_start.localeCompare(b.week_start));
  state.tennis_matches.sort((a, b) => a.match_date.localeCompare(b.match_date));
  state.shoulder_tracking.sort((a, b) => a.week_start.localeCompare(b.week_start));
  state.body_composition.sort((a, b) => a.assessment_date.localeCompare(b.assessment_date));
  renderDashboard(state);
  renderWeeklyList();
  renderTennisList();
}

function renderWeeklyList() {
  const list = document.getElementById("weekly-list");
  list.innerHTML = "";
  state.weekly_reviews.slice().reverse().forEach((week) => {
    const status = classifyAdherence(Number(week.adherence_percent));
    list.appendChild(card(`<div class="list-card-row"><strong>Semana de ${formatDate(week.week_start)}</strong><span class="status-pill status-${status}">${week.adherence_percent}%</span></div><p>${week.main_learning || "Sem aprendizado registrado."}</p><small>Próximo foco: ${week.next_week_focus || "definir na próxima revisão"}</small>`));
  });
}

function renderTennisList() {
  const list = document.getElementById("tennis-list");
  list.innerHTML = "";
  state.tennis_matches.slice().reverse().forEach((match) => {
    list.appendChild(card(`<div class="list-card-row"><strong>${formatDate(match.match_date)} · ${match.opponent}</strong><span>${resultLabel(match.result)} · ${match.score || "-"}</span></div><p>FH ${match.forehand} · BH ${match.backhand} · Saque ${match.serve} · Mov ${match.movement} · Tática ${match.tactics}</p><small>Pontos totais: ${match.total_points || 932} · Ranking #${match.ranking_position || 2}</small>`));
  });
}

function card(html) {
  const node = document.createElement("article");
  node.className = "list-card";
  node.innerHTML = html;
  return node;
}
function resultLabel(result) { return { win: "Vitória", loss: "Derrota", cancelled: "Cancelado", wo: "W.O." }[result] || result; }
function persistAndRender() { if (!isSupabaseConfigured) localStorage.setItem(storeKey, JSON.stringify(state)); renderAll(); }
function loadLocalState() {
  const empty = { weekly_reviews: [], weekly_checklist: [], tennis_matches: [], shoulder_tracking: [], body_composition: [baseline] };
  try { return JSON.parse(localStorage.getItem(storeKey)) || empty; } catch { return empty; }
}
function seedDemo() {
  state = {
    weekly_reviews: [
      { id: "w1", week_start: "2026-06-01", adherence_percent: 86, weekly_score: 88, status: "Verde", sleep_hours_avg: 7.2, sleep_score_avg: 79, main_learning: "Boa consistência quando treino cedo.", next_week_focus: "Manter proteína e mobilidade." },
      { id: "w2", week_start: "2026-06-08", adherence_percent: 73, weekly_score: 74, status: "Amarelo", sleep_hours_avg: 6.6, sleep_score_avg: 71, main_learning: "Viagem derrubou sono.", next_week_focus: "Plano mínimo de hotel." },
      { id: "w3", week_start: "2026-06-15", adherence_percent: 87, weekly_score: 89, status: "Verde", sleep_hours_avg: 7.4, sleep_score_avg: 81, main_learning: "Aquecimento reduziu dor.", next_week_focus: "Backhand seguro cruzado." }
    ],
    weekly_checklist: [],
    tennis_matches: [
      { id: "t1", match_date: "2026-05-26", opponent: "Gabriel Benicio", score: "8/2", result: "win", ranking_points: 116, total_points: 1048, ranking_position: 2, forehand: 7, backhand: 6, serve: 6, movement: 8, tactics: 7 },
      { id: "t2", match_date: "2026-06-10", opponent: "Arthur Carvalho", score: "8/5", result: "win", ranking_points: 100, total_points: 1148, ranking_position: 2, forehand: 8, backhand: 7, serve: 6, movement: 8, tactics: 8 }
    ],
    shoulder_tracking: [
      { id: "s1", week_start: "2026-06-01", pain_rest: 1, pain_movement: 2, pain_serve: 3, status: "Amarelo", notes: "Evitar saque máximo." },
      { id: "s2", week_start: "2026-06-08", pain_rest: 0, pain_movement: 1, pain_serve: 2, status: "Verde", notes: "Boa resposta a mobilidade." }
    ],
    body_composition: [baseline, { id: "b2", assessment_date: "2026-07-01", weight: 68.5, body_fat: 17.1, muscle_mass: 32.2, visceral_fat: 5, inbody_score: 81 }]
  };
  persistAndRender();
}
function notify(message) { window.alert(message); }
