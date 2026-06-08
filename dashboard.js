import { drawBarChart, drawLineChart, drawMultiLineChart } from "./charts.js";

export const journey = {
  start: new Date("2026-06-01T00:00:00"),
  end: new Date("2026-08-31T23:59:59"),
  totalDays: 92,
  totalWeeks: 13,
  initialRanking: 2,
  initialPoints: 932,
  targetLessons: 4
};

export const baseline = {
  assessment_date: "2026-05-12",
  weight: 69.4,
  body_fat: 18.5,
  muscle_mass: 32.1,
  visceral_fat: 5,
  inbody_score: 79
};

export const targets = {
  weight: { label: "Peso", baseline: 69.4, min: 67, max: 68, suffix: "kg", lowerIsBetter: true },
  body_fat: { label: "BF", baseline: 18.5, min: 15, max: 16, suffix: "%", lowerIsBetter: true },
  muscle_mass: { label: "Massa muscular", baseline: 32.1, min: 32, suffix: "kg", lowerIsBetter: false },
  visceral_fat: { label: "Gordura visceral", baseline: 5, min: 5, max: 5, suffix: "", lowerIsBetter: true },
  inbody_score: { label: "InBody Score", baseline: 79, min: 82, suffix: "", lowerIsBetter: false }
};

export const technicalSkills = [
  "Forehand",
  "Backhand",
  "Movimentação",
  "Tática",
  "Saque",
  "Voleio",
  "Devolução de saque",
  "Transição ataque/defesa",
  "Consistência mental durante os jogos"
];

export function classifyAdherence(value) { return value >= 80 ? "green" : value >= 60 ? "yellow" : "red"; }
export function classifyPain(value) { return value <= 2 ? "green" : value <= 5 ? "yellow" : "red"; }
export function statusText(status) { return { green: "Verde", yellow: "Amarelo", red: "Vermelho" }[status] || status; }
export function formatDate(value) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "-"; }
export function computeJourney(today = new Date()) {
  const clamped = Math.min(Math.max(today.getTime(), journey.start.getTime()), journey.end.getTime());
  const day = Math.floor((clamped - journey.start.getTime()) / 86400000) + 1;
  return { day, percent: Math.min(100, Math.round((day / journey.totalDays) * 100)) };
}

export function renderDashboard(state, checklistItems) {
  const weeks = state.weekly_reviews;
  const matches = state.tennis_matches;
  const shoulder = state.shoulder_tracking;
  const body = state.body_composition.at(-1) || baseline;
  const lessons = state.technical_lessons || [];
  const adherenceAvg = avg(weeks.map((week) => week.adherence_percent));
  const greenWeeks = weeks.filter((week) => Number(week.adherence_percent) >= 80).length;
  const latestMatch = matches.at(-1);
  const currentRanking = Number(latestMatch?.ranking_position || journey.initialRanking);
  const rankingDelta = journey.initialRanking - currentRanking;
  const currentPoints = computeCurrentRankingPoints(matches);
  const pointsDeltaPercent = ((currentPoints - journey.initialPoints) / journey.initialPoints) * 100;
  const sleepScoreAvg = avg(weeks.map((week) => week.sleep_score_avg));
  const sleepHoursAvg = avg(weeks.map((week) => week.sleep_hours_avg));
  const latestShoulder = shoulder.at(-1);
  const maxPain = latestShoulder ? Math.max(latestShoulder.pain_rest, latestShoulder.pain_movement, latestShoulder.pain_serve) : null;
  const journeyState = computeJourney();

  setText("journey-day", `Dia ${journeyState.day} da jornada`);
  setText("journey-percent", `${journeyState.percent}%`);
  document.getElementById("journey-progress").value = journeyState.percent;
  setText("avg-adherence", `${Math.round(adherenceAvg)}%`);
  setText("green-weeks", `${greenWeeks} verdes`);
  setText("ranking-trend", rankingDelta > 0 ? `Subiu ${rankingDelta}` : rankingDelta < 0 ? `Caiu ${Math.abs(rankingDelta)}` : "Estável");
  setText("ranking-summary", `Inicial #${journey.initialRanking} · atual #${currentRanking}`);
  setText("lesson-state", `${lessons.length}/${journey.targetLessons}`);
  setText("lesson-counter", `${lessons.length}/${journey.targetLessons}`);

  const overall = classifyAdherence(adherenceAvg || 0);
  const status = document.getElementById("overall-status");
  status.className = `status-pill status-${overall}`;
  status.textContent = statusText(overall);
  setText("trend-summary", weeks.length ? `${weeks.length} semanas concluídas, ${trendLabel(weeks.map((w) => w.adherence_percent))}.` : "Semana de 01/06/2026 pronta para começar.");

  renderMetrics([
    ["Semanas", String(weeks.length), `${Math.round((weeks.length / journey.totalWeeks) * 100)}% do ciclo`],
    ["Ranking", `#${currentRanking}`, rankingDelta > 0 ? `+${rankingDelta} posições` : rankingDelta < 0 ? `${rankingDelta} posições` : "Sem variação"],
    ["Pontos", String(currentPoints), `${pointsDeltaPercent >= 0 ? "+" : ""}${pointsDeltaPercent.toFixed(1)}% vs baseline`],
    ["Aulas", `${lessons.length}/4`, "Meta do ciclo"],
    ["Peso", `${Number(body.weight).toFixed(1)} kg`, "Meta: 67-68 kg"],
    ["BF", `${Number(body.body_fat).toFixed(1)}%`, "Meta: 15-16%"],
    ["Sono", sleepScoreAvg ? `${Math.round(sleepScoreAvg)}` : "-", `${sleepHoursAvg ? sleepHoursAvg.toFixed(1) : "-"}h média`],
    ["Ombro", maxPain === null ? "-" : `${maxPain}/10`, maxPain === null ? "Sem registro" : statusText(classifyPain(maxPain))]
  ]);

  setText("shoulder-state", maxPain === null ? "Sem dados" : `${maxPain}/10`);
  setText("shoulder-note", maxPain === null ? "Registre dor semanalmente." : `Status ${statusText(classifyPain(maxPain))}; proteja o saque.`);
  setText("sleep-state", sleepScoreAvg ? `${Math.round(sleepScoreAvg)}/100` : "Sem dados");
  setText("sleep-note", sleepScoreAvg >= 75 ? "Sono sustentando performance." : "Sono abaixo da meta; revisar rotina.");

  drawBarChart(document.getElementById("adherence-chart"), weeks.map((week) => ({ value: Number(week.adherence_percent) })));
  drawLineChart(document.getElementById("points-chart"), matches.map((match) => ({ value: Number(match.ranking_position || journey.initialRanking) })), { min: 1, max: 10, color: "#ff8a35" });
  drawMultiLineChart(document.getElementById("body-chart"), [
    { color: "#62b7ff", points: state.body_composition.map((item) => ({ value: Number(item.weight) })) },
    { color: "#ff8a35", points: state.body_composition.map((item) => ({ value: Number(item.body_fat) })) }
  ]);
  drawMultiLineChart(document.getElementById("recovery-chart"), [
    { color: "#27d36f", points: shoulder.map((item) => ({ value: Math.max(item.pain_rest, item.pain_movement, item.pain_serve) })) },
    { color: "#62b7ff", points: weeks.map((item) => ({ value: Number(item.sleep_score_avg || 0) / 10 })) }
  ]);

  renderBodyTargets(body);
  renderRankingTargets(matches, currentPoints, pointsDeltaPercent);
  renderWeeklyAnalysis(state, checklistItems);
  renderTechnicalAnalysis(state);
  renderInsights(state, checklistItems);
}

function renderMetrics(items) {
  const grid = document.getElementById("metric-grid");
  const template = document.getElementById("metric-template");
  grid.innerHTML = "";
  items.forEach(([label, value, note]) => {
    const node = template.content.cloneNode(true);
    node.querySelector("span").textContent = label;
    node.querySelector("strong").textContent = value;
    node.querySelector("small").textContent = note;
    grid.appendChild(node);
  });
}

function renderBodyTargets(body) {
  const container = document.getElementById("body-targets");
  container.innerHTML = "";
  Object.entries(targets).forEach(([key, target]) => {
    const current = Number(body[key]);
    const goal = target.lowerIsBetter ? target.max ?? target.min : target.min;
    const total = Math.abs(target.baseline - goal) || 1;
    const moved = target.lowerIsBetter ? target.baseline - current : current - target.baseline;
    const progress = Math.max(0, Math.min(100, Math.round((moved / total) * 100)));
    container.appendChild(targetRow(target.label, `${current}${target.suffix}`, `Meta ${target.min}${target.max && target.max !== target.min ? `-${target.max}` : ""}${target.suffix}`, progress));
  });
}

function renderRankingTargets(matches, currentPoints, pointsDeltaPercent) {
  const container = document.getElementById("ranking-targets");
  const latest = matches.at(-1);
  const current = Number(latest?.ranking_position || journey.initialRanking);
  const delta = journey.initialRanking - current;
  container.innerHTML = "";
  container.appendChild(targetRow("Posição atual", `#${current}`, delta > 0 ? `Subiu ${delta} posição(ões)` : delta < 0 ? `Caiu ${Math.abs(delta)} posição(ões)` : "Estável", current <= 3 ? 100 : 35));
  container.appendChild(targetRow("Pontos", String(currentPoints), `${pointsDeltaPercent >= 0 ? "+" : ""}${pointsDeltaPercent.toFixed(1)}% desde 932`, matches.length ? 70 : 0));
}

export function computeCurrentRankingPoints(matches) {
  return journey.initialPoints + (matches || []).reduce((total, match) => total + Number(match.ranking_points || 0), 0);
}

export function buildRankingProgress(matches) {
  let runningTotal = journey.initialPoints;
  return [...(matches || [])]
    .sort((a, b) => `${a.match_date || ""}${a.created_at || ""}`.localeCompare(`${b.match_date || ""}${b.created_at || ""}`))
    .map((match) => {
      runningTotal += Number(match.ranking_points || 0);
      return { ...match, computed_total_points: runningTotal };
    });
}

export function renderWeeklyAnalysis(state, checklistItems) {
  const container = document.getElementById("weekly-analysis");
  if (!container) return;
  const analysis = buildWeeklyAnalysis(state, checklistItems);
  container.innerHTML = "";
  analysis.forEach((item) => {
    const card = document.createElement("div");
    card.className = "analysis-card";
    card.innerHTML = `<strong>${item.title}</strong><p>${item.text}</p>`;
    container.appendChild(card);
  });
}

export function buildWeeklyAnalysis(state, checklistItems) {
  const rows = state.weekly_checklist || [];
  if (!rows.length) return [{ title: "Semanas", text: "Registre a primeira semana para ativar análise de gargalos." }];
  const keys = checklistItems.map(([key]) => key);
  const labels = Object.fromEntries(checklistItems);
  const failures = keys.map((key) => ({ key, label: labels[key], count: rows.filter((row) => row[key] === false).length }));
  const strengths = failures.filter((item) => item.count === 0).map((item) => item.label).slice(0, 3);
  const weak = failures.sort((a, b) => b.count - a.count).slice(0, 3);
  return [
    { title: "Gargalos recorrentes", text: weak.map((item) => `${item.label}: ${item.count} falha(s)`).join(" · ") },
    { title: "Hábitos fortes", text: strengths.length ? strengths.join(" · ") : "Ainda sem hábito 100% consistente." },
    { title: "Tendência", text: trendLabel(state.weekly_reviews.map((week) => week.adherence_percent)) }
  ];
}

function renderTechnicalAnalysis(state) {
  const container = document.getElementById("technical-analysis");
  if (!container) return;
  const progress = state.technical_progress || [];
  const lessons = state.technical_lessons || [];
  const latestBySkill = new Map();
  progress.forEach((item) => latestBySkill.set(item.skill, item));
  container.innerHTML = "";
  [
    ["Aulas particulares", `${lessons.length}/${journey.targetLessons}`, "Meta total do ciclo"],
    ["Fundamentos avaliados", String(latestBySkill.size), "Checklist técnico"],
    ["Maior oportunidade", weakestSkill(progress), "Prioridade técnica"]
  ].forEach(([title, value, text]) => {
    const card = document.createElement("div");
    card.className = "analysis-card";
    card.innerHTML = `<strong>${title}</strong><p>${value}</p><small>${text}</small>`;
    container.appendChild(card);
  });
}

export function renderInsights(state, checklistItems) {
  const list = document.getElementById("insight-list");
  list.innerHTML = "";
  buildInsights(state, checklistItems).forEach((insight) => {
    const item = document.createElement("div");
    item.className = "insight";
    item.textContent = insight;
    list.appendChild(item);
  });
}

export function buildInsights(state, checklistItems) {
  const insights = [];
  const weeks = state.weekly_reviews;
  const matches = state.tennis_matches;
  const shoulder = state.shoulder_tracking;
  const progress = state.technical_progress || [];
  const avgAdherence = avg(weeks.map((week) => week.adherence_percent));
  const last5 = state.weekly_checklist.slice(-5);
  const sleepFails = last5.filter((row) => !row.sleep_7h || !row.sleep_score_75).length;
  if (last5.length >= 3 && sleepFails) insights.push(`Você falhou na meta de sono em ${sleepFails} das últimas ${last5.length} semanas.`);
  if (avgAdherence >= 80) {
    const weak = buildWeeklyAnalysis(state, checklistItems)[0]?.text || "recuperação";
    insights.push(`Sua aderência média é de ${Math.round(avgAdherence)}%, mas ${weak} merece atenção.`);
  }
  const backhand = progress.filter((item) => item.skill === "Backhand").sort((a, b) => a.assessment_date.localeCompare(b.assessment_date));
  if (backhand.length >= 2) insights.push(`Seu Backhand evoluiu de ${backhand[0].current_score} para ${backhand.at(-1).current_score}.`);
  const latestRanking = matches.at(-1)?.ranking_position;
  if (latestRanking) {
    const delta = journey.initialRanking - Number(latestRanking);
    if (delta > 0) insights.push(`Você ganhou ${delta} posição(ões) no ranking desde o início da jornada.`);
    if (delta < 0) insights.push(`Você caiu ${Math.abs(delta)} posição(ões); revisar consistência competitiva.`);
  }
  const stableShoulder = consecutiveStableShoulder(shoulder);
  if (stableShoulder >= 4) insights.push(`Seu ombro permanece estável há ${stableShoulder} semanas.`);
  if (!insights.length) insights.push("Registre semanas, partidas e aulas para ativar insights mais profundos.");
  insights.push("Prioridade do ciclo: performance sustentável antes de volume ou intensidade máxima.");
  return insights;
}

function targetRow(title, value, note, progress) {
  const row = document.createElement("div");
  row.className = "target-row";
  row.innerHTML = `<div class="target-head"><strong>${title}</strong><span>${value}</span></div><small>${note}</small><progress max="100" value="${progress}"></progress>`;
  return row;
}

function weakestSkill(progress) {
  if (!progress.length) return "Registrar baseline técnico";
  const latest = new Map();
  progress.forEach((item) => latest.set(item.skill, item));
  return [...latest.values()].sort((a, b) => Number(a.current_score) - Number(b.current_score))[0]?.skill || "Registrar baseline";
}

function consecutiveStableShoulder(rows) {
  let count = 0;
  [...rows].reverse().some((row) => {
    const maxPain = Math.max(row.pain_rest, row.pain_movement, row.pain_serve);
    if (maxPain <= 2) {
      count += 1;
      return false;
    }
    return true;
  });
  return count;
}

function avg(values) {
  const valid = values.map(Number).filter(Number.isFinite);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
}

function trendLabel(values) {
  if (values.length < 2) return "tendência em formação";
  const first = Number(values[0]);
  const last = Number(values.at(-1));
  if (last > first + 3) return "melhorando";
  if (last < first - 3) return "piorando";
  return "estável";
}

function setText(id, text) {
  const node = document.getElementById(id);
  if (node) node.textContent = text;
}
