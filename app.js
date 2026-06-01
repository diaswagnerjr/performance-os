import {
  getRememberSession,
  isSupabaseConfigured,
  resetPassword,
  setRememberSession,
  signIn,
  signOut,
  signUp,
  supabaseClient,
  getCurrentUser,
  upsertProfile
} from "./supabase.js";
import {
  baseline,
  classifyAdherence,
  classifyPain,
  formatDate,
  journey,
  renderDashboard,
  statusText,
  technicalSkills
} from "./dashboard.js";
import { preventionPlaybookImage } from "./prevention-image.js";

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

const preventionLibrary = [
  ["Mobilidade", "left center", ["Ombro", "Escápula", "Coluna torácica", "Quadril", "Tornozelo"]],
  ["Ativação Muscular", "center center", ["Manguito rotador", "Escápulas", "Core", "Glúteos", "Panturrilhas"]],
  ["Preparação Específica para o Tênis", "right center", ["Split step", "Movimentação lateral", "Shadow forehand", "Shadow backhand", "Shadow serve", "Aceleração", "Mudança de direção"]]
];

const storeKey = "performance-os-state-v2";
let currentUser = null;
let state = emptyState();

document.addEventListener("DOMContentLoaded", init);
window.addEventListener("resize", debounce(() => renderAll(), 150));

async function init() {
  buildChecklist();
  buildSkillOptions();
  buildPrepLibrary();
  wireNavigation();
  wireForms();
  setDefaultDates();
  document.querySelector('[name="remember"]').checked = getRememberSession();
  document.getElementById("auth-mode-note").textContent = isSupabaseConfigured
    ? "Supabase configurado. Os registros serão salvos online após login."
    : "Modo local. Configure Supabase para salvar online.";

  await restoreSession();
  renderAll();
}

async function restoreSession() {
  showAuth(true);
  try {
    currentUser = await getCurrentUser();
    if (currentUser && isSupabaseConfigured) {
      await ensureProfile();
      await loadRemoteState();
      showAuth(false);
      setText("session-state", `Online · ${currentUser.email || "usuário"}`);
      return;
    }
    if (!isSupabaseConfigured) {
      state = loadLocalState();
      setText("session-state", "Modo local");
    } else {
      setText("session-state", "Faça login");
    }
  } catch (error) {
    showAuth(true);
    setText("session-state", "Sessão expirada");
    notify(`Sessão expirada ou ausente. Faça login novamente. ${error.message}`);
  }
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
      setRememberSession(form.remember.checked);
      const data = await signIn(form.email.value, form.password.value, form.remember.checked);
      currentUser = data.user || (await getCurrentUser());
      await ensureProfile(form.name.value);
      await loadRemoteState();
      showAuth(false);
      renderAll();
    } catch (error) {
      notify(error.message);
    }
  });

  document.getElementById("sign-up").addEventListener("click", async () => {
    const form = document.getElementById("auth-form");
    try {
      setRememberSession(form.remember.checked);
      const data = await signUp(form.email.value, form.password.value, form.name.value, form.remember.checked);
      currentUser = data.user || (await getCurrentUser());
      await ensureProfile(form.name.value);
      await loadRemoteState();
      showAuth(!currentUser);
      notify("Conta criada. Se o Supabase exigir confirmação, valide o email antes do primeiro login.");
      renderAll();
    } catch (error) {
      notify(error.message);
    }
  });

  document.getElementById("reset-password").addEventListener("click", async () => {
    const email = document.querySelector('[name="email"]').value;
    if (!email) return notify("Informe o email para recuperar a senha.");
    try {
      await resetPassword(email);
      notify("Se o email existir, o Supabase enviará o link de recuperação.");
    } catch (error) {
      notify(error.message);
    }
  });

  document.getElementById("sign-out").addEventListener("click", async () => {
    await signOut();
    currentUser = null;
    state = emptyState();
    showAuth(true);
    setText("session-state", "Logout concluído");
    renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  bindForm("weekly-form", saveWeekly);
  bindForm("tennis-form", saveTennis);
  bindForm("shoulder-form", saveShoulder);
  bindForm("body-form", saveBody);
  bindForm("lesson-form", saveLesson);
  bindForm("technical-form", saveTechnicalProgress);
  document.getElementById("weekly-form").addEventListener("change", updateWeeklyPreview);
  document.getElementById("shoulder-form").addEventListener("change", updateShoulderPreview);
}

function bindForm(id, handler) {
  document.getElementById(id).addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      if (isSupabaseConfigured && !currentUser) {
        showAuth(true);
        return notify("Faça login para salvar online.");
      }
      await handler(event);
    } catch (error) {
      if (String(error.message).toLowerCase().includes("auth")) {
        showAuth(true);
        notify("Sessão expirada. Faça login novamente para continuar salvando online.");
      } else {
        notify(error.message);
      }
    }
  });
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

function buildSkillOptions() {
  const select = document.getElementById("skill-select");
  technicalSkills.forEach((skill) => {
    const option = document.createElement("option");
    option.value = skill;
    option.textContent = skill;
    select.appendChild(option);
  });
}

function buildPrepLibrary() {
  document.getElementById("playbook-board-image").src = preventionPlaybookImage;
  const container = document.getElementById("prep-library");
  preventionLibrary.forEach(([title, focus, items]) => {
    const card = document.createElement("article");
    card.className = "prep-card";
    card.innerHTML = `<div class="media-slot visual"><img src="${preventionPlaybookImage}" alt="${title}" style="--focus:${focus}" /></div><h4>${title}</h4><ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
    container.appendChild(card);
  });
}

function setDefaultDates() {
  const today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('input[type="date"]').forEach((input) => { if (!input.value) input.value = today; });
  document.querySelector('#weekly-form [name="week_start"]').value = "2026-06-01";
  updateWeeklyPreview();
  updateShoulderPreview();
}

async function ensureProfile(name) {
  if (!currentUser) return;
  await upsertProfile({
    id: currentUser.id,
    name: name || currentUser.user_metadata?.name || currentUser.email || "Wagner Dias Junior",
    journey_start: "2026-06-01",
    journey_end: "2026-08-31",
    initial_ranking_position: journey.initialRanking,
    initial_ranking_points: journey.initialPoints,
    target_private_lessons: journey.targetLessons,
    created_at: new Date().toISOString()
  });
}

async function loadRemoteState() {
  const tables = ["weekly_reviews", "weekly_checklist", "tennis_matches", "shoulder_tracking", "body_composition", "technical_lessons", "technical_progress"];
  const results = await Promise.all(tables.map((table) => supabaseClient.from(table).select("*").order("created_at", { ascending: true })));
  results.forEach((result) => { if (result.error) throw result.error; });
  state = {
    weekly_reviews: results[0].data,
    weekly_checklist: results[1].data,
    tennis_matches: results[2].data,
    shoulder_tracking: results[3].data,
    body_composition: results[4].data.length ? results[4].data : [baseline],
    technical_lessons: results[5].data,
    technical_progress: results[6].data
  };
}

async function saveWeekly(event) {
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
  const savedReview = await upsertRow("weekly_reviews", review, "user_id,week_start");
  const savedChecklist = await upsertRow("weekly_checklist", rowWithUser({ weekly_review_id: savedReview.id, ...checklist }), "weekly_review_id");
  replaceByKey(state.weekly_reviews, savedReview, "id");
  replaceByKey(state.weekly_checklist, savedChecklist, "weekly_review_id");
  afterSave(form);
}

async function saveTennis(event) {
  const form = event.target;
  const row = rowWithUser({
    match_date: form.match_date.value,
    opponent: form.opponent.value,
    score: form.score.value,
    result: form.result.value,
    ranking_points: Number(form.ranking_points.value || 0),
    total_points: Number(form.total_points.value || journey.initialPoints),
    ranking_position: Number(form.ranking_position.value || journey.initialRanking),
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
  afterSave(form);
}

async function saveShoulder(event) {
  const form = event.target;
  const maxPain = Math.max(Number(form.pain_rest.value), Number(form.pain_movement.value), Number(form.pain_serve.value));
  const row = rowWithUser({
    week_start: form.week_start.value,
    pain_rest: Number(form.pain_rest.value),
    pain_movement: Number(form.pain_movement.value),
    pain_serve: Number(form.pain_serve.value),
    status: statusText(classifyPain(maxPain)),
    notes: form.notes.value
  });
  replaceByKey(state.shoulder_tracking, await upsertRow("shoulder_tracking", row, "user_id,week_start"), "week_start");
  afterSave(form);
}

async function saveBody(event) {
  const raw = Object.fromEntries(new FormData(event.target).entries());
  const row = rowWithUser({
    assessment_date: raw.assessment_date,
    weight: Number(raw.weight),
    body_fat: Number(raw.body_fat),
    muscle_mass: Number(raw.muscle_mass),
    visceral_fat: Number(raw.visceral_fat),
    inbody_score: Number(raw.inbody_score),
    notes: raw.notes
  });
  replaceByKey(state.body_composition, await upsertRow("body_composition", row, "user_id,assessment_date"), "assessment_date");
  afterSave(event.target);
}

async function saveLesson(event) {
  const form = event.target;
  const row = rowWithUser({ lesson_date: form.lesson_date.value, teacher: form.teacher.value, notes: form.notes.value });
  state.technical_lessons.push(await insertRow("technical_lessons", row));
  afterSave(form);
}

async function saveTechnicalProgress(event) {
  const form = event.target;
  const row = rowWithUser({
    assessment_date: form.assessment_date.value,
    skill: form.skill.value,
    current_score: Number(form.current_score.value),
    target_score: Number(form.target_score.value),
    notes: form.notes.value
  });
  state.technical_progress.push(await insertRow("technical_progress", row));
  afterSave(form);
}

async function insertRow(table, row) {
  if (!isSupabaseConfigured) return row;
  const { data, error } = await supabaseClient.from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}

async function upsertRow(table, row, onConflict) {
  if (!isSupabaseConfigured) return row;
  const { data, error } = await supabaseClient.from(table).upsert(row, { onConflict }).select().single();
  if (error) throw error;
  return data;
}

function rowWithUser(row) {
  return { id: crypto.randomUUID(), user_id: currentUser?.id || "demo-user", created_at: new Date().toISOString(), ...row };
}

function afterSave(form) {
  persistLocalIfNeeded();
  renderAll();
  form.reset();
  setDefaultDates();
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
  sortState();
  renderDashboard(state, checklistItems);
  renderWeeklyList();
  renderTennisList();
  renderLessons();
}

function renderWeeklyList() {
  const list = document.getElementById("weekly-list");
  list.innerHTML = "";
  state.weekly_reviews.slice().reverse().forEach((week, index, all) => {
    const checklist = state.weekly_checklist.find((item) => item.weekly_review_id === week.id);
    const done = checklist ? checklistItems.filter(([key]) => checklist[key]).map(([, label]) => label) : [];
    const missed = checklist ? checklistItems.filter(([key]) => !checklist[key]).map(([, label]) => label) : [];
    const previous = all[index + 1];
    const diff = previous ? Number(week.adherence_percent) - Number(previous.adherence_percent) : 0;
    list.appendChild(card(`
      <div class="list-card-row"><strong>Semana de ${formatDate(week.week_start)}</strong><span class="status-pill status-${classifyAdherence(Number(week.adherence_percent))}">${week.adherence_percent}%</span></div>
      <p><strong>Realizado:</strong> ${done.slice(0, 6).join(", ") || "Sem itens marcados."}</p>
      <p><strong>Não realizado:</strong> ${missed.slice(0, 6).join(", ") || "Nenhum gargalo nesta semana."}</p>
      <small>${diff ? `Comparação: ${diff > 0 ? "+" : ""}${Math.round(diff)} p.p. vs semana anterior.` : "Primeira semana registrada."} Próximo foco: ${week.next_week_focus || "definir"}</small>
    `));
  });
}

function renderTennisList() {
  const list = document.getElementById("tennis-list");
  list.innerHTML = "";
  state.tennis_matches.slice().reverse().forEach((match) => {
    list.appendChild(card(`<div class="list-card-row"><strong>${formatDate(match.match_date)} · ${match.opponent}</strong><span>#${match.ranking_position || journey.initialRanking}</span></div><p>${resultLabel(match.result)} · ${match.score || "-"} · ${match.ranking_points || 0} pts</p><small>FH ${match.forehand} · BH ${match.backhand} · Saque ${match.serve} · Mov ${match.movement} · Tática ${match.tactics}</small>`));
  });
}

function renderLessons() {
  const list = document.getElementById("lesson-list");
  list.innerHTML = "";
  state.technical_lessons.slice().reverse().forEach((lesson) => {
    list.appendChild(card(`<div class="list-card-row"><strong>Aula em ${formatDate(lesson.lesson_date)}</strong><span>${lesson.teacher || "Professor"}</span></div><p>${lesson.notes || "Sem observações."}</p>`));
  });
}

function card(html) {
  const node = document.createElement("article");
  node.className = "list-card";
  node.innerHTML = html;
  return node;
}

function showAuth(visible) {
  document.getElementById("auth-panel").classList.toggle("visible", visible);
}

function persistLocalIfNeeded() {
  if (!isSupabaseConfigured) localStorage.setItem(storeKey, JSON.stringify(state));
}

function loadLocalState() {
  try { return JSON.parse(localStorage.getItem(storeKey)) || emptyState(); } catch { return emptyState(); }
}

function emptyState() {
  return {
    weekly_reviews: [],
    weekly_checklist: [],
    tennis_matches: [],
    shoulder_tracking: [],
    body_composition: [baseline],
    technical_lessons: [],
    technical_progress: []
  };
}

function sortState() {
  state.weekly_reviews.sort((a, b) => a.week_start.localeCompare(b.week_start));
  state.tennis_matches.sort((a, b) => a.match_date.localeCompare(b.match_date));
  state.shoulder_tracking.sort((a, b) => a.week_start.localeCompare(b.week_start));
  state.body_composition.sort((a, b) => a.assessment_date.localeCompare(b.assessment_date));
  state.technical_lessons.sort((a, b) => a.lesson_date.localeCompare(b.lesson_date));
  state.technical_progress.sort((a, b) => a.assessment_date.localeCompare(b.assessment_date));
}

function replaceByKey(rows, row, key) {
  const index = rows.findIndex((item) => item[key] === row[key]);
  if (index >= 0) rows[index] = row;
  else rows.push(row);
}

function resultLabel(result) {
  return { win: "Vitória", loss: "Derrota", cancelled: "Cancelado", wo: "W.O." }[result] || result;
}

function notify(message) {
  window.alert(message);
}

function setText(id, text) {
  const node = document.getElementById(id);
  if (node) node.textContent = text;
}

function debounce(fn, wait) {
  let timeout;
  return () => {
    clearTimeout(timeout);
    timeout = setTimeout(fn, wait);
  };
}
