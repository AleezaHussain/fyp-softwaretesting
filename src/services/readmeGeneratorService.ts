/**
 * Service to generate a README-style markdown document from simulation data
 * by calling Groq API directly. Downloads as a .md file.
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
const GROQ_MODEL = "llama-3.1-8b-instant";

interface ReadmeRequest {
  simulationId: string;
  simulationName: string;
  simulationType: string;
  simulationData: Record<string, any>;
}

/**
 * Compact simulation data to reduce payload size for API call
 */
function compactSimulationData(data: Record<string, any>): Record<string, any> {
  const compacted: Record<string, any> = {};

  // Keep simulation metadata
  if (data.simulation) {
    compacted.simulation = {
      id: data.simulation.id,
      name: data.simulation.name,
      simulation_type: data.simulation.simulation_type,
      status: data.simulation.status,
    };
  }

  // Keep result metadata (not hourly data)
  if (data.result) {
    compacted.result = {
      runtime_minutes: data.result.runtime_minutes,
      energy_consumed_kwh: data.result.energy_consumed_kwh,
      cooling_efficiency: data.result.cooling_efficiency,
      cost_saving_percent: data.result.cost_saving_percent,
      completed_at: data.result.completed_at,
    };
  }

  // Extract only summaries and key metrics from result_data
  if (data.result?.result_data) {
    const resultData = data.result.result_data;
    compacted.result_data = {
      summary: resultData.summary,
      results: resultData.results,
      metrics: resultData.metrics,
      economics: resultData.economics,
      mlRecommendation: resultData.mlRecommendation,
      projection: resultData.projection,
      phase4Gates: resultData.phase4Gates,
      // Note: hourly arrays are intentionally omitted to reduce payload size
    };
  }

  return compacted;
}

export async function generateAndDownloadReadme(
  request: ReadmeRequest,
): Promise<void> {
  if (!GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is not configured. Set VITE_GROQ_API_KEY in .env.local",
    );
  }

  // Compact the data to avoid 413 (too large) errors
  const compactedData = compactSimulationData(request.simulationData);
  const dataJson = JSON.stringify(compactedData, null, 2);

  // Create the prompt for Groq
  const systemPrompt =
    "You are a technical writer who creates clear, well-structured README documents. " +
    "Write in plain English, explain technical terms when used, and use markdown formatting. " +
    "Keep the tone professional but accessible.";

  const userPrompt =
    `Generate a comprehensive README-style markdown document for this simulation result. ` +
    `The document should explain the simulation inputs, key outputs, and recommendations in human language. ` +
    `Use clear headings (##, ###), paragraphs (no bullet points unless necessary), and concrete numbers from the data. ` +
    `Target 1500-2500 words. ` +
    `If data is missing, note it explicitly. ` +
    `Start with a title "# Simulation Results: ${request.simulationName}" and include these sections: Overview, Inputs and Setup, Key Results, Efficiency Metrics, Costs and Savings, Environmental Impact, Visualizations Summary, and Conclusions.\n\n` +
    `Simulation Data:\n${dataJson}`;

  // Call Groq API
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 3000,
      }),
    },
  );

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Groq API failed (${response.status}): ${errorData}`);
  }

  const data = await response.json();
  const markdown = data.choices?.[0]?.message?.content?.trim();

  if (!markdown) {
    throw new Error("Groq returned empty response");
  }

  // Download as .md file
  downloadMarkdownFile(markdown, `${request.simulationName}.md`);
}

function downloadMarkdownFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
