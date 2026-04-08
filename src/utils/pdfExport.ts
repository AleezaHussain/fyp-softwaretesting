import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface SimulationPDFData {
  simulation: {
    id: number;
    name: string;
    description?: string;
    simulation_type: string;
    created_at: string;
    status: string;
  };
  result: {
    energy_consumed_kwh: number;
    cooling_efficiency: number;
    cost_saving_percent: number;
    runtime_minutes: number;
    completed_at?: string;
    result_data: any;
  };
}

// RGB tuples
type RGB = [number, number, number];
const PRIMARY: RGB = [5, 165, 233];
const ACCENT: RGB = [92, 225, 229];
const DARK: RGB = [26, 31, 58];
const MID: RGB = [63, 74, 104];
const LIGHT: RGB = [241, 245, 249];
const WHITE: RGB = [255, 255, 255];
const GREEN: RGB = [16, 185, 129];
const RED: RGB = [239, 68, 68];
const YELLOW: RGB = [245, 158, 11];

// jsPDF v4 requires separate r,g,b args — no spread
const fc = (doc: jsPDF, c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
const tc = (doc: jsPDF, c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
const dc = (doc: jsPDF, c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);

function fmt(v: any, decimals = 2): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return v.toFixed(decimals);
  return String(v);
}

function addPageNumbers(doc: jsPDF) {
  const total = (doc.internal as any).getNumberOfPages?.() ?? 1;
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    tc(doc, MID);
    doc.text(`Page ${i} of ${total}`, pw / 2, ph - 6, { align: "center" });
  }
}

function sectionHeader(doc: jsPDF, title: string, y: number): number {
  const pw = doc.internal.pageSize.getWidth();
  fc(doc, DARK);
  doc.rect(14, y, pw - 28, 8, "F");
  fc(doc, ACCENT);
  doc.rect(14, y, 3, 8, "F");
  doc.setFontSize(10);
  tc(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.text(title, 20, y + 5.5);
  doc.setFont("helvetica", "normal");
  return y + 12;
}

function kpiRow(
  doc: jsPDF,
  y: number,
  kpis: { label: string; value: string; unit?: string; color: RGB }[],
): number {
  const pw = doc.internal.pageSize.getWidth();
  const cw = (pw - 28 - (kpis.length - 1) * 3) / kpis.length;
  kpis.forEach((k, i) => {
    const cx = 14 + i * (cw + 3);
    fc(doc, LIGHT);
    doc.roundedRect(cx, y, cw, 18, 2, 2, "F");
    fc(doc, k.color);
    doc.roundedRect(cx, y, 3, 18, 1, 1, "F");
    doc.setFontSize(7);
    tc(doc, MID);
    doc.text(k.label, cx + 5, y + 5);
    doc.setFontSize(10);
    tc(doc, DARK);
    doc.setFont("helvetica", "bold");
    doc.text(k.value, cx + 5, y + 13);
    doc.setFont("helvetica", "normal");
    if (k.unit) {
      doc.setFontSize(7);
      tc(doc, MID);
      doc.text(k.unit, cx + 5 + doc.getTextWidth(k.value) + 1, y + 13);
    }
  });
  return y + 22;
}

function sparkline(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  values: number[],
  color: RGB,
  title: string,
) {
  if (!values || values.length < 2) return;
  const min = Math.min(...values);
  const max = Math.max(...values, min + 0.001);
  const step = w / (values.length - 1);

  doc.setFontSize(8);
  tc(doc, DARK);
  doc.setFont("helvetica", "bold");
  doc.text(title, x, y - 2);
  doc.setFont("helvetica", "normal");

  fc(doc, LIGHT);
  doc.roundedRect(x, y, w, h, 2, 2, "F");
  dc(doc, color);
  doc.setLineWidth(0.8);
  for (let i = 1; i < values.length; i++) {
    const x1 = x + (i - 1) * step;
    const y1 = y + h - ((values[i - 1] - min) / (max - min)) * (h - 4) - 2;
    const x2 = x + i * step;
    const y2 = y + h - ((values[i] - min) / (max - min)) * (h - 4) - 2;
    doc.line(x1, y1, x2, y2);
  }
  doc.setFontSize(6);
  tc(doc, MID);
  doc.text(`min ${min.toFixed(2)}`, x + 1, y + h - 1);
  doc.text(`max ${max.toFixed(2)}`, x + w - 1, y + 1, { align: "right" });
}

function miniBar(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  data: { label: string; value: number; color: RGB }[],
  title: string,
) {
  if (!data || data.length === 0) return;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const bw = (w - 10) / data.length - 2;

  doc.setFontSize(8);
  tc(doc, DARK);
  doc.setFont("helvetica", "bold");
  doc.text(title, x, y - 2);
  doc.setFont("helvetica", "normal");

  dc(doc, MID);
  doc.setLineWidth(0.3);
  doc.line(x, y, x, y + h);
  doc.line(x, y + h, x + w, y + h);

  data.forEach((d, i) => {
    const bh = Math.max((d.value / maxVal) * (h - 4), 0.5);
    const bx = x + 5 + i * (bw + 2);
    const by = y + h - bh;
    fc(doc, d.color);
    doc.roundedRect(bx, by, bw, bh, 1, 1, "F");
    doc.setFontSize(6);
    tc(doc, MID);
    const lbl = d.label.length > 8 ? d.label.slice(0, 7) + "…" : d.label;
    doc.text(lbl, bx + bw / 2, y + h + 4, { align: "center" });
    tc(doc, DARK);
    doc.text(
      d.value > 999 ? `${(d.value / 1000).toFixed(1)}k` : d.value.toFixed(1),
      bx + bw / 2,
      by - 1,
      { align: "center" },
    );
  });
}

function coverPage(doc: jsPDF, data: SimulationPDFData) {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  fc(doc, DARK);
  doc.rect(0, 0, pw, ph, "F");
  fc(doc, MID);
  doc.rect(0, ph * 0.65, pw, ph * 0.35, "F");
  fc(doc, ACCENT);
  doc.rect(0, 0, 6, ph, "F");

  // Logo pill
  fc(doc, PRIMARY);
  doc.roundedRect(20, 20, 44, 14, 3, 3, "F");
  doc.setFontSize(11);
  tc(doc, WHITE);
  doc.setFont("helvetica", "bold");
  doc.text("COOLience Simulation Report", 42, 29, { align: "center" });

  // Title
  doc.setFontSize(26);
  tc(doc, WHITE);
  doc.text("Technical Simulation", 20, 78);
  doc.text("Report", 20, 92);

  fc(doc, ACCENT);
  doc.rect(20, 97, 55, 1.5, "F");

  // Sim name
  doc.setFontSize(13);
  tc(doc, ACCENT);
  doc.setFont("helvetica", "normal");
  const nameLines = doc.splitTextToSize(data.simulation.name, pw - 40);
  doc.text(nameLines, 20, 110);

  // Meta
  const meta: [string, string][] = [
    ["Type", data.simulation.simulation_type.toUpperCase()],
    ["Status", data.simulation.status.toUpperCase()],
    ["Created", new Date(data.simulation.created_at).toLocaleString()],
    [
      "Completed",
      data.result.completed_at
        ? new Date(data.result.completed_at).toLocaleString()
        : "—",
    ],
    ["Generated", new Date().toLocaleString()],
  ];
  let my = 130;
  doc.setFontSize(9);
  meta.forEach(([k, v]) => {
    tc(doc, ACCENT);
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, 20, my);
    tc(doc, WHITE);
    doc.setFont("helvetica", "normal");
    doc.text(v, 58, my);
    my += 8;
  });

  if (data.simulation.description) {
    doc.setFontSize(9);
    doc.setTextColor(170, 180, 205);
    const dl = doc.splitTextToSize(data.simulation.description, pw - 40);
    doc.text(dl.slice(0, 4), 20, my + 5);
  }

  doc.setFontSize(8);
  tc(doc, MID);
  doc.text("CONFIDENTIAL — Generated by CoolSim Platform", pw / 2, ph - 10, {
    align: "center",
  });
}

export const generateSimulationPDF = (data: SimulationPDFData) => {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const pw = doc.internal.pageSize.getWidth();
    const rd = data.result.result_data ?? {};

    // ── Page 1: Cover ────────────────────────────────────────────────────────
    coverPage(doc, data);

    // ── Page 2: Executive Summary ────────────────────────────────────────────
    doc.addPage();
    let y = 20;
    y = sectionHeader(doc, "1. Executive Summary", y);

    y = kpiRow(doc, y, [
      {
        label: "Energy Consumed",
        value: (data.result.energy_consumed_kwh ?? 0).toFixed(2),
        unit: "kWh",
        color: PRIMARY,
      },
      {
        label: "Cooling Eff. (PUE)",
        value: (data.result.cooling_efficiency ?? 0).toFixed(3),
        unit: "",
        color: ACCENT,
      },
      {
        label: "Cost Savings",
        value: (data.result.cost_saving_percent ?? 0).toFixed(1),
        unit: "%",
        color: GREEN,
      },
      {
        label: "Runtime",
        value: (data.result.runtime_minutes ?? 0).toFixed(2),
        unit: "min",
        color: [139, 92, 246] as RGB,
      },
    ]);

    const annual  = rd?.results?.annual  ?? rd?.summary ?? {};
    const metrics = rd?.results?.metrics ?? {};
    const econ    = rd?.results?.economics ?? {};
    const s       = rd?.summary ?? {};

    // Detect technique from result data
    const isChilledPDF  = !!(rd?.results?.metrics?.averageCOP !== undefined || rd?.coolingTechnique === "chilled_water");
    const isAirPDF      = !!(rd?.airflowViolations || rd?.coolingTechnique === "air_economizer" || s.totalItEnergy_kWh);
    const isEvapPDF     = !isChilledPDF && !isAirPDF;

    // Build technique-specific summary rows
    const commonRows: [string, string][] = [
      ["PUE",                   fmt(metrics.pue ?? s.averagePUE)],
      ["CUE",                   fmt(metrics.cue ?? s.averageCUE)],
      ["Total Energy (kWh)",    fmt(annual.energyConsumption_kWh ?? s.totalEnergy_kWh)],
      ["Carbon Emissions (kg)", fmt(annual.carbonEmissions_kg ?? s.totalCarbonEmissions_kg)],
      ["Annual Cost (USD)",     fmt(annual.cost_USD ?? econ.opex_annual_USD ?? s.annualOpExUSD)],
      ["Payback (yrs)",         fmt(econ.paybackPeriod_years ?? s.paybackPeriodYears)],
    ];

    const chilledRows: [string, string][] = isChilledPDF ? [
      ["Average COP",           fmt(metrics.averageCOP)],
      ["WUE (L/kWh)",           fmt(metrics.wue)],
      ["Peak Cooling Load (kW)", fmt(metrics.peakCoolingLoad_kW)],
      ["Cooling Load (kWh)",    fmt(annual.coolingLoad_kWh)],
      ["Water Usage (L)",       fmt(annual.waterUsage_L)],
      ["CAPEX (USD)",           fmt(econ.capex_USD)],
      ["Annual OPEX (USD)",     fmt(econ.opex_annual_USD)],
      ["LCCP (USD)",            fmt(econ.lccp_USD)],
      ["NPV (USD)",             fmt(econ.npv_USD)],
    ] : [];

    const airRows: [string, string][] = isAirPDF ? [
      ["IT Energy (kWh)",       fmt(s.totalItEnergy_kWh)],
      ["Cooling Energy (kWh)",  fmt(s.totalCoolingEnergy_kWh)],
      ["Electricity Cost (USD)", fmt(s.electricityCostUSD)],
      ["Carbon Tax (USD)",      fmt(s.carbonTaxCostUSD)],
      ["Annual OpEx (USD)",     fmt(s.annualOpExUSD)],
      ["Annual Savings (USD)",  fmt(s.annualSavingsUSD)],
      ["Energy Savings %",      fmt(s.energySavingsPercent)],
      ["Carbon Savings (kg)",   fmt(s.carbonSavings_kg)],
      ["CAPEX (USD)",           fmt(s.totalCapexUSD)],
      ["Water Usage (L)",       fmt(s.waterUsage_liters)],
    ] : [];

    const evapRows: [string, string][] = isEvapPDF ? [
      ["Average COP",           fmt(metrics.averageCOP)],
      ["WUE (L/kWh)",           fmt(metrics.wue)],
      ["Cooling Load (kWh)",    fmt(annual.coolingLoad_kWh)],
      ["Water Usage (L)",       fmt(annual.waterUsage_L)],
      ["CAPEX (USD)",           fmt(econ.capex_USD)],
      ["Annual OPEX (USD)",     fmt(econ.opex_annual_USD)],
      ["LCCP (USD)",            fmt(econ.lccp_USD)],
      ["NPV (USD)",             fmt(econ.npv_USD)],
    ] : [];

    const summaryRows: [string, string][] = [
      ...commonRows,
      ...chilledRows,
      ...airRows,
      ...evapRows,
    ].filter(([, v]) => v !== "—") as [string, string][];

    autoTable(doc, {
      startY: y,
      head: [["Metric", "Value"]],
      body: summaryRows,
      theme: "grid",
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
      alternateRowStyles: { fillColor: LIGHT },
      columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Phase 4 gates
    const gates = rd?.results?.phase4Gates;
    if (gates && Object.keys(gates).length > 0) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      y = sectionHeader(doc, "Phase 4 Compliance Gates", y);
      const gateRows = Object.entries(gates).map(([k, v]) => [
        k.replace(/([A-Z])/g, " $1").trim(),
        String(v),
      ]);
      autoTable(doc, {
        startY: y,
        head: [["Gate", "Result"]],
        body: gateRows,
        theme: "grid",
        margin: { left: 14, right: 14 },
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: DARK, textColor: WHITE },
        didParseCell: (d) => {
          if (d.column.index === 1) {
            const v = String(d.cell.raw);
            if (v === "PASS") d.cell.styles.textColor = GREEN;
            else if (v === "FAIL") d.cell.styles.textColor = RED;
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── Page 3: Visualizations ───────────────────────────────────────────────
    doc.addPage();
    y = 20;
    y = sectionHeader(doc, "2. Visualizations & Charts", y);

    const hourly: any[] = rd?.results?.hourlyResults ?? rd?.hourlyResults ?? [];
    const yearly: any[] = rd?.projection?.yearlyData ?? rd?.results?.projection?.yearlyData ?? [];
    const comp: any[]   = rd?.mlRecommendation?.comparison_table ?? [];
    const copOverTime: number[] = Array.isArray(rd?.copOverTime) ? rd.copOverTime : [];

    // ── Chilled water: COP over time from copOverTime array ──────────────────
    if (isChilledPDF && copOverTime.length > 0) {
      const step = Math.ceil(copOverTime.length / 120);
      const cops = copOverTime.filter((_, i) => i % step === 0);
      sparkline(doc, 14, y, pw - 28, 35, cops, ACCENT, "COP Over Time — results.hourlyResults[i].cop (sampled)");
      y += 45;
    }

    // ── Chilled water: Chiller power + IT load ───────────────────────────────
    if (isChilledPDF && hourly.length > 0) {
      const step = Math.ceil(hourly.length / 120);
      const chillerPow = hourly.filter((_, i) => i % step === 0).map(h => h.chillerPower_kW ?? 0);
      const itLoad     = hourly.filter((_, i) => i % step === 0).map(h => h.itLoad_kW ?? 0);
      if (chillerPow.some(v => v > 0)) {
        sparkline(doc, 14, y, (pw - 32) / 2, 30, chillerPow, PRIMARY, "Chiller Power kW — hourlyResults[i].chillerPower_kW");
        sparkline(doc, 14 + (pw - 32) / 2 + 4, y, (pw - 32) / 2, 30, itLoad, ACCENT, "IT Load kW — hourlyResults[i].itLoad_kW");
        y += 40;
      }
      // Water usage
      const water = hourly.filter((_, i) => i % step === 0).map(h => h.waterUsage_L ?? 0);
      if (water.some(v => v > 0)) {
        sparkline(doc, 14, y, pw - 28, 30, water, [59, 130, 246] as RGB, "Hourly Water Usage (L) — hourlyResults[i].waterUsage_L");
        y += 40;
      }
    }

    // ── Air economizer: IT load + fan/mech power ─────────────────────────────
    if (isAirPDF && hourly.length > 0) {
      const step = Math.ceil(hourly.length / 120);
      const itLoad  = hourly.filter((_, i) => i % step === 0).map(h => h.itLoad_kW ?? 0);
      const fanPow  = hourly.filter((_, i) => i % step === 0).map(h => h.fanPower_kW ?? 0);
      const mechPow = hourly.filter((_, i) => i % step === 0).map(h => h.mechPower_kW ?? 0);
      if (itLoad.some(v => v > 0)) {
        sparkline(doc, 14, y, (pw - 32) / 2, 30, itLoad, ACCENT, "IT Load kW — hourlyResults[i].itLoad_kW");
        sparkline(doc, 14 + (pw - 32) / 2 + 4, y, (pw - 32) / 2, 30, fanPow, GREEN, "Fan Power kW — hourlyResults[i].fanPower_kW");
        y += 40;
      }
      if (mechPow.some(v => v > 0)) {
        sparkline(doc, 14, y, pw - 28, 30, mechPow, YELLOW, "Mechanical Cooling kW — hourlyResults[i].mechPower_kW");
        y += 40;
      }
    }

    // ── Shared: hourly IT load (fallback for any technique) ──────────────────
    if (!isChilledPDF && !isAirPDF && hourly.length > 0) {
      const step = Math.ceil(hourly.length / 120);
      const loads = hourly.filter((_, i) => i % step === 0).map(h => h.itLoad_kW ?? h.it_kW ?? h.coolingLoad_kW ?? 0);
      if (loads.some(v => v > 0)) {
        sparkline(doc, 14, y, pw - 28, 35, loads, PRIMARY, "Hourly IT Load kW (sampled)");
        y += 45;
      }
    }

    if (yearly.length > 0) {
      const half = (pw - 28) / 2 - 4;
      miniBar(
        doc,
        14,
        y + 8,
        half,
        40,
        yearly.map((d) => ({
          label: `Y${d.year}`,
          value: d.totalCostUSD ?? 0,
          color: PRIMARY,
        })),
        "5-Year Cost (USD)",
      );
      miniBar(
        doc,
        14 + half + 8,
        y + 8,
        half,
        40,
        yearly.map((d) => ({
          label: `Y${d.year}`,
          value: Math.max(d.costSavingsUSD ?? 0, 0),
          color: GREEN,
        })),
        "5-Year Savings (USD)",
      );
      y += 60;
    }

    if (comp.length > 0) {
      const half = (pw - 28) / 2 - 4;
      miniBar(
        doc,
        14,
        y + 8,
        half,
        40,
        comp.map((r) => ({
          label: r.tech ?? "",
          value: r.annual_cost ?? 0,
          color: PRIMARY,
        })),
        "Annual Cost by Technique (USD)",
      );
      miniBar(
        doc,
        14 + half + 8,
        y + 8,
        half,
        40,
        comp.map((r) => ({
          label: r.tech ?? "",
          value: r.annual_emissions_kg ?? 0,
          color: YELLOW,
        })),
        "Annual CO₂ by Technique (kg)",
      );
      y += 60;
    }

    // ── Page 4: ML Recommendation ────────────────────────────────────────────
    const mlRec = rd?.mlRecommendation;
    if (mlRec) {
      doc.addPage();
      y = 20;
      y = sectionHeader(doc, "3. ML Recommendation Analysis", y);

      fc(doc, GREEN);
      doc.roundedRect(14, y, pw - 28, 14, 3, 3, "F");
      doc.setFontSize(11);
      tc(doc, WHITE);
      doc.setFont("helvetica", "bold");
      doc.text(
        `Recommended: ${mlRec.model_recommendation ?? "—"}`,
        pw / 2,
        y + 9,
        { align: "center" },
      );
      doc.setFont("helvetica", "normal");
      y += 20;

      if (
        Array.isArray(mlRec.why_this_is_recommended) &&
        mlRec.why_this_is_recommended.length > 0
      ) {
        y = sectionHeader(doc, "Why This Is Recommended", y);
        doc.setFontSize(9);
        tc(doc, DARK);
        const lines = doc.splitTextToSize(
          mlRec.why_this_is_recommended.join(" "),
          pw - 28,
        );
        doc.text(lines, 14, y);
        y += lines.length * 4.5 + 6;
      }

      if (
        mlRec.future_impact_paragraph &&
        !mlRec.future_impact_paragraph.includes("available when")
      ) {
        if (y > 230) {
          doc.addPage();
          y = 20;
        }
        y = sectionHeader(doc, "Future Impact Projection (1-5 Years)", y);
        doc.setFontSize(9);
        tc(doc, DARK);
        const lines = doc.splitTextToSize(
          mlRec.future_impact_paragraph,
          pw - 28,
        );
        doc.text(lines, 14, y);
        y += lines.length * 4.5 + 6;
      }

      if (
        Array.isArray(mlRec.comparison_table) &&
        mlRec.comparison_table.length > 0
      ) {
        if (y > 220) {
          doc.addPage();
          y = 20;
        }
        y = sectionHeader(doc, "Technique Comparison Table", y);
        const rows = mlRec.comparison_table.map((r: any) => [
          r.tech ?? "—",
          r.feasible ? "Yes" : "No",
          fmt(r.score, 4),
          `$${(r.annual_cost ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          `${(r.annual_emissions_kg ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kg`,
          `${(r.annual_water_liters ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} L`,
          String(r.violations ?? 0),
        ]);
        autoTable(doc, {
          startY: y,
          head: [
            [
              "Technique",
              "Feasible",
              "Score",
              "Annual Cost",
              "CO₂",
              "Water",
              "Violations",
            ],
          ],
          body: rows,
          theme: "grid",
          margin: { left: 14, right: 14 },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
          didParseCell: (d) => {
            if (d.section === "body" && d.column.index === 0) {
              if (String(d.cell.raw) === mlRec.model_recommendation) {
                d.cell.styles.fillColor = [220, 252, 231] as any;
                d.cell.styles.fontStyle = "bold";
              }
            }
          },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }
    }

    // ── Page 5: Hourly Data Sample ───────────────────────────────────────────
    if (hourly.length > 0) {
      doc.addPage();
      y = 20;
      y = sectionHeader(doc, "4. Hourly Simulation Data (First 50 Hours)", y);

      // Use technique-specific columns for clarity
      let cols: string[];
      if (isChilledPDF) {
        cols = ["hour", "ambientTemp_C", "itLoad_kW", "coolingLoad_kW", "chillerPower_kW", "cop", "waterUsage_L", "cost_USD"];
      } else if (isAirPDF) {
        cols = ["hour", "outdoorTempC", "outdoorRH", "itLoad_kW", "fanPower_kW", "mechPower_kW", "totalPower_kW", "pue"];
      } else {
        cols = Object.keys(hourly[0] ?? {}).slice(0, 8);
      }
      // Filter to only cols that exist in the data
      const availCols = cols.filter(c => c in (hourly[0] ?? {}));
      const rows = hourly.slice(0, 50).map(h => availCols.map(c => fmt(h[c])));

      autoTable(doc, {
        startY: y,
        head: [availCols],
        body: rows,
        theme: "striped",
        margin: { left: 14, right: 14 },
        styles: { fontSize: 7, cellPadding: 1.5, overflow: "ellipsize" },
        headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold", fontSize: 7 },
        alternateRowStyles: { fillColor: LIGHT },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
      doc.setFontSize(8);
      tc(doc, MID);
      doc.text(`Showing 50 of ${hourly.length} hourly records. Technique: ${isChilledPDF ? "Chilled Water" : isAirPDF ? "Air Economizer" : "Evaporative"}`, 14, y);
    }

    // ── Page 6: 5-Year Projection ────────────────────────────────────────────
    if (yearly.length > 0) {
      doc.addPage();
      y = 20;
      y = sectionHeader(doc, "5. 5-Year Financial Projection", y);
      const projRows = yearly.map((d) => [
        `Year ${d.year}`,
        `${(d.energyKWh ?? 0).toFixed(0)} kWh`,
        `$${(d.energyCostUSD ?? 0).toFixed(2)}`,
        `$${(d.carbonTaxUSD ?? 0).toFixed(2)}`,
        `$${(d.totalCostUSD ?? 0).toFixed(2)}`,
        `$${(d.costSavingsUSD ?? 0).toFixed(2)}`,
        `$${(d.cumulativeCost ?? 0).toFixed(2)}`,
        `$${(d.cumulativeSavings ?? 0).toFixed(2)}`,
      ]);
      autoTable(doc, {
        startY: y,
        head: [
          [
            "Year",
            "Energy",
            "Energy Cost",
            "Carbon Tax",
            "Total Cost",
            "Savings",
            "Cumul. Cost",
            "Cumul. Savings",
          ],
        ],
        body: projRows,
        theme: "grid",
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: DARK, textColor: WHITE, fontStyle: "bold" },
        alternateRowStyles: { fillColor: LIGHT },
        didParseCell: (d) => {
          if (d.section === "body" && d.column.index === 5) {
            const v = parseFloat(String(d.cell.raw).replace(/[$,]/g, ""));
            d.cell.styles.textColor = (v >= 0 ? GREEN : RED) as any;
            d.cell.styles.fontStyle = "bold";
          }
        },
      });
    }

    addPageNumbers(doc);

    const fileName = `TechnicalReport_${data.simulation.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  } catch (err) {
    console.error("[PDF Export] Failed:", err);
    alert(
      `PDF generation failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
};
