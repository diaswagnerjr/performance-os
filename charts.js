const colors = {
  green: "#27d36f",
  yellow: "#f1c84b",
  red: "#ef5350",
  blue: "#62b7ff",
  orange: "#ff8a35",
  muted: "rgba(240,247,251,.42)",
  text: "#f0f7fb"
};

function setup(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(260, canvas.getBoundingClientRect().width || canvas.parentElement?.clientWidth || 260);
  const height = Number(canvas.getAttribute("height")) || 170;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.font = "11px system-ui";
  return { ctx, width, height };
}

function axes(ctx, width, height) {
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, 14);
  ctx.lineTo(30, height - 24);
  ctx.lineTo(width - 10, height - 24);
  ctx.stroke();
}

export function drawBarChart(canvas, values) {
  const { ctx, width, height } = setup(canvas);
  ctx.clearRect(0, 0, width, height);
  axes(ctx, width, height);
  if (!values.length) return empty(ctx, "Sem registros");
  const gap = 6;
  const plot = height - 48;
  const barWidth = Math.max(10, Math.min(38, (width - 52 - gap * values.length) / values.length));
  values.slice(-12).forEach((item, index) => {
    const value = clamp(Number(item.value), 0, 100);
    const x = 38 + index * (barWidth + gap);
    const h = value / 100 * plot;
    const y = height - 24 - h;
    ctx.fillStyle = value >= 80 ? colors.green : value >= 60 ? colors.yellow : colors.red;
    ctx.fillRect(x, y, barWidth, h);
    ctx.fillStyle = colors.text;
    ctx.fillText(`${Math.round(value)}%`, x - 2, y - 5);
  });
}

export function drawLineChart(canvas, points, options = {}) {
  const { ctx, width, height } = setup(canvas);
  ctx.clearRect(0, 0, width, height);
  axes(ctx, width, height);
  if (!points.length) return empty(ctx, "Sem registros");
  drawSeries(ctx, width, height, points.slice(-12), options);
}

export function drawMultiLineChart(canvas, series) {
  const { ctx, width, height } = setup(canvas);
  ctx.clearRect(0, 0, width, height);
  axes(ctx, width, height);
  const all = series.flatMap((item) => item.points.map((point) => Number(point.value))).filter(Number.isFinite);
  if (!all.length) return empty(ctx, "Sem registros");
  const min = Math.min(...all);
  const max = Math.max(...all);
  series.forEach((item, index) => drawSeries(ctx, width, height, item.points.slice(-12), {
    min,
    max,
    color: item.color || [colors.green, colors.orange, colors.blue][index % 3],
    label: item.label
  }));
}

function drawSeries(ctx, width, height, points, options = {}) {
  if (!points.length) return;
  const values = points.map((point) => Number(point.value));
  const min = Math.min(...values, options.min ?? values[0]);
  const max = Math.max(...values, options.max ?? values[0]);
  const spread = Math.max(1, max - min);
  const step = (width - 48) / Math.max(1, points.length - 1);
  const coords = points.map((point, index) => ({
    x: 30 + index * step,
    y: height - 24 - ((Number(point.value) - min) / spread) * (height - 48)
  }));
  ctx.strokeStyle = options.color || colors.blue;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  coords.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
  ctx.stroke();
  coords.forEach((point, index) => {
    ctx.fillStyle = options.color || colors.green;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (index === coords.length - 1) {
      ctx.fillStyle = colors.text;
      ctx.fillText(String(points[index].value), point.x - 12, point.y - 8);
    }
  });
}

function empty(ctx, text) {
  ctx.fillStyle = colors.muted;
  ctx.fillText(text, 42, 78);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
