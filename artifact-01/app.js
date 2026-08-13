const DATA_URL = "data/target-count-histogram.csv";
const SERIES = [
  { key: "Allatori", fill: "url(#allatori-dots)", color: "#F4C27C" },
  { key: "ProGuard", fill: "url(#proguard-lines)", color: "#AECFEF" },
  { key: "yGuard", fill: "url(#yguard-lines)", color: "#D1CAF9" },
];
const chart = document.getElementById("chart");
const tooltip = document.getElementById("tooltip");

function parseCSV(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const keys = header.split(",");
  return lines.map((line) => Object.fromEntries(keys.map((key, index) => [key, line.split(",")[index]])))
    .map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, key === "target_count" ? value : +value])));
}

function showTooltip(event, label, series, value) {
  tooltip.innerHTML = `<strong>${series}</strong><br>${label} targets per focal method<br>${value.toLocaleString()} focal methods`;
  tooltip.style.left = `${Math.min(event.clientX + 14, innerWidth - 260)}px`;
  tooltip.style.top = `${event.clientY + 14}px`;
  tooltip.hidden = false;
}

function render(rows) {
  // These dimensions mirror the pgfplots figure in the paper: a shallow plotting
  // region, compact legend, narrow bars, and a scientific-notation y-axis.
  const width = 1040, height = 365, margin = { top: 52, right: 25, bottom: 85, left: 88 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const ymax = 30000;
  const y = (value) => margin.top + plotH - (value / ymax) * plotH;
  const groupW = plotW / rows.length;
  const barW = Math.min(15, groupW * .19);
  // A small overlap prevents antialiasing from producing a white seam between
  // adjacent bars; pgfplots draws these as a contiguous three-bar cluster.
  const barStep = barW - 0.8;
  const base = margin.top + plotH;
  const svg = [
    `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Distribution of target mapping references per L0 focal method">`,
    `<defs>
      <pattern id="allatori-dots" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#F4C27C"/><circle cx="1.5" cy="1.5" r=".7" fill="#636363"/></pattern>
      <pattern id="proguard-lines" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#AECFEF"/><line x1="0" y1="0" x2="0" y2="6" stroke="#636363" stroke-width=".75"/></pattern>
      <pattern id="yguard-lines" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="6" height="6" fill="#D1CAF9"/><line x1="0" y1="0" x2="0" y2="6" stroke="#636363" stroke-width=".75"/></pattern>
    </defs>`,
  ];
  let legendX = width / 2 - 142;
  SERIES.forEach((series) => {
    svg.push(`<rect x="${legendX}" y="20" width="12" height="12" fill="${series.fill}" stroke="#252525" stroke-width=".55"/><text x="${legendX + 18}" y="30" class="legend-text">${series.key}</text>`);
    legendX += series.key === "Allatori" ? 107 : 116;
  });
  svg.push(`<rect x="${margin.left}" y="${margin.top}" width="${plotW}" height="${plotH}" class="plot-bg"/>`);
  for (let tick = 0; tick <= ymax; tick += 5000) {
    svg.push(`<line x1="${margin.left}" y1="${y(tick)}" x2="${margin.left + plotW}" y2="${y(tick)}" class="grid"/>`);
    const tickLabel = tick === 0 ? "0" : `${tick / 10000}`;
    svg.push(`<text x="${margin.left - 9}" y="${y(tick) + 3.5}" text-anchor="end" class="y-tick">${tickLabel}</text>`);
  }
  svg.push(`<text x="${margin.left - 28}" y="${margin.top - 17}" class="scale-label">·10<tspan baseline-shift="super" font-size="7">4</tspan></text>`);
  svg.push(`<text x="24" y="${margin.top + plotH / 2}" text-anchor="middle" transform="rotate(-90 24 ${margin.top + plotH / 2})" class="axis-title">Number of focal methods</text>`);
  rows.forEach((row, index) => {
    const center = margin.left + groupW * (index + .5);
    SERIES.forEach((series, seriesIndex) => {
      const value = row[series.key];
      const x = center + (seriesIndex - 1) * barStep - barW / 2;
      const h = base - y(value);
      const labelX = x + barW / 2 + [-7, 0, 7][seriesIndex];
      const label = value < 1000 ? `<text x="${labelX}" y="${y(value) - 3}" text-anchor="middle" transform="rotate(-90 ${labelX} ${y(value) - 3})" class="value">${value}</text>` : "";
      svg.push(`<rect class="bar" data-label="${row.target_count}" data-series="${series.key}" data-value="${value}" x="${x}" y="${y(value)}" width="${barW}" height="${h}" fill="${series.fill}"/>${label}`);
    });
    svg.push(`<text x="${center + 4}" y="${base + 17}" text-anchor="end" transform="rotate(-45 ${center + 4} ${base + 17})" class="x-tick">${row.target_count}</text>`);
  });
  svg.push(`<text x="${margin.left + plotW / 2}" y="${height - 13}" text-anchor="middle" class="axis-title">Number of targets per focal method</text></svg>`);
  chart.innerHTML = svg.join("");
  document.querySelectorAll(".bar").forEach((bar) => {
    bar.addEventListener("mouseenter", (event) => showTooltip(event, bar.dataset.label, bar.dataset.series, +bar.dataset.value));
    bar.addEventListener("mousemove", (event) => { tooltip.style.left = `${Math.min(event.clientX + 14, innerWidth - 260)}px`; tooltip.style.top = `${event.clientY + 14}px`; });
    bar.addEventListener("mouseleave", () => { tooltip.hidden = true; });
  });
}

document.getElementById("figure-menu").addEventListener("change", (event) => {
  if (event.target.value !== "target-count-histogram") location.assign(event.target.value);
});

fetch(DATA_URL).then((response) => {
  if (!response.ok) throw new Error("The figure data could not be loaded.");
  return response.text();
}).then((text) => render(parseCSV(text))).catch((error) => { chart.textContent = error.message; });
