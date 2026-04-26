/**
 * Chart Capture Utility
 * Captures rendered Recharts components as image data URLs for PDF embedding
 */

import html2canvas from "html2canvas";

export interface CapturedChart {
  selector: string;
  imageData: string; // data:image/png;base64,...
  width: number;
  height: number;
  explanationText?: string;
  keyInsightText?: string;
}

function extractInsightText(element: HTMLElement): {
  explanationText?: string;
  keyInsightText?: string;
} {
  const explanationEl = element.querySelector(
    '[data-role="chart-explanation-text"]',
  ) as HTMLElement | null;
  const keyInsightEl = element.querySelector(
    '[data-role="chart-key-insight-text"]',
  ) as HTMLElement | null;

  const explanationText = explanationEl?.innerText?.trim();
  const keyInsightText = keyInsightEl?.innerText?.trim();

  return {
    explanationText: explanationText || undefined,
    keyInsightText: keyInsightText || undefined,
  };
}

async function captureChartNode(
  element: HTMLElement,
  selectorLabel: string,
  options?: { scale?: number; backgroundColor?: string },
): Promise<CapturedChart | null> {
  const bounds = element.getBoundingClientRect();
  if (bounds.width < 40 || bounds.height < 40 || !element.offsetParent) {
    console.warn(`Chart element is not visible or too small: ${selectorLabel}`);
    return null;
  }

  const canvas = await html2canvas(element, {
    scale: options?.scale ?? 2,
    backgroundColor: options?.backgroundColor ?? "#ffffff",
    useCORS: true,
    logging: false,
    allowTaint: true,
  });

  return {
    selector: selectorLabel,
    imageData: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
    ...extractInsightText(element),
  };
}

/**
 * Capture a single chart element by CSS selector
 */
export async function captureChartElement(
  selector: string,
  options?: { scale?: number; backgroundColor?: string },
): Promise<CapturedChart | null> {
  try {
    const element = document.querySelector(selector) as HTMLElement | null;
    if (!element) {
      console.warn(`Chart element not found: ${selector}`);
      return null;
    }
    return await captureChartNode(element, selector, options);
  } catch (error) {
    console.error(`Failed to capture chart: ${selector}`, error);
    return null;
  }
}

/**
 * Capture all chart containers in the simulation detail view
 * Returns a map of chart identifiers to their image data
 */
export async function captureAllCharts(): Promise<
  Record<string, CapturedChart>
> {
  const charts = new Map<string, CapturedChart>();

  // Capture all visible chart blocks in DOM order.
  const dynamicNodes = Array.from(
    document.querySelectorAll("[data-chart]"),
  ) as HTMLElement[];
  for (const node of dynamicNodes) {
    const chartName = node.getAttribute("data-chart");
    if (!chartName) continue;
    const chartId = `chart-${chartName}`;
    if (charts.has(chartId)) continue;

    const captured = await captureChartNode(
      node,
      `[data-chart="${chartName}"]`,
    );
    if (captured) {
      charts.set(chartId, captured);
    }

    // Small delay to prevent overwhelming the browser
    await new Promise((r) => setTimeout(r, 50));
  }

  return Object.fromEntries(charts);
}

/**
 * Capture charts in batches to manage memory and UI responsiveness
 * Useful for simulations with many charts
 */
export async function captureChartsBatch(
  selectors: Array<{ id: string; selector: string }>,
  batchSize = 3,
  onProgress?: (current: number, total: number) => void,
): Promise<Record<string, CapturedChart>> {
  const charts = new Map<string, CapturedChart>();
  const total = selectors.length;

  for (let i = 0; i < selectors.length; i += batchSize) {
    const batch = selectors.slice(i, i + batchSize);
    const promises = batch.map(({ id, selector }) =>
      captureChartElement(selector).then((result) => {
        if (result) {
          charts.set(id, result);
        }
        onProgress?.(Math.min(i + batch.length, total), total);
      }),
    );
    await Promise.all(promises);
  }

  return Object.fromEntries(charts);
}

/**
 * Get a specific captured chart by ID
 */
export function getCapturedChart(
  charts: Record<string, CapturedChart>,
  chartId: string,
): CapturedChart | undefined {
  return charts[chartId];
}

/**
 * Estimate total size of captured charts (in MB)
 */
export function estimateChartDataSize(
  charts: Record<string, CapturedChart>,
): number {
  let totalSize = 0;
  for (const chart of Object.values(charts)) {
    // Rough estimate: each base64 character is ~0.75 bytes
    totalSize += (chart.imageData.length * 0.75) / (1024 * 1024);
  }
  return totalSize;
}
