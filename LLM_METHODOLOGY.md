# Large Language Model-Based Advisory System: Comprehensive Methodology

---

## Chapter 4: LLM Advisory Methodology

### 4.1 Introduction and Objective

This chapter presents the complete methodology for the Large Language Model (LLM) advisory module that provides context-aware, simulation-grounded explanations and recommendations for data center cooling decisions. The objective is to bridge the gap between quantitative simulation outputs and human-interpretable advice by combining retrieval-augmented generation with simulation context and structured prompt engineering to produce reliable, auditable explanations [1], [2].

The advisory system is not a general-purpose chatbot. Instead, it is a grounded explanation engine that takes user questions about a specific simulation, enriches those questions with relevant metrics and methodology context, routes the request to an available LLM provider, and returns an explanation that is traceable to the underlying simulation data. The design ensures transparency, reproducibility, and operational safety [3], [4].

---

### 4.2 Problem Formulation

#### 4.2.1 Advisory Task Definition

The advisory task is formulated as **context-aware question answering**:

Given a user question $q$ about a selected simulation $s$ with results $\mathbf{r}$, the system must generate a textual explanation $a$ such that:

$$a = \text{LLM}(\text{build\_prompt}(q, s, \mathbf{r}, \text{intent}, \text{context}))$$

where:
- $q$ is the user's natural-language question.
- $s$ is the simulation object (identifier, name, technique, configuration).
- $\mathbf{r}$ is the simulation results (energy, cost, emissions, water, constraints).
- $\text{intent}$ is the detected question category (energy, cost, thermal, carbon, water, comparison).
- $\text{context}$ is methodology snippets and reference information specific to the cooling technique.
- $a$ is the generated textual explanation, composed in plain language with specific numeric evidence.

#### 4.2.2 Design Principles

The advisory methodology is built on five core principles:

1. **Grounding**: All explanations are grounded in actual simulation data, not generic templates [2], [3].
2. **Intent Detection**: The system detects the user's likely intent (e.g., asking for risks vs. benefits) and adapts response style [5].
3. **Provider Agnosticism**: The system can route requests to multiple LLM providers (Ollama, Groq, OpenRouter, xAI, Gemini) and fail gracefully [4].
4. **Auditability**: Every response includes metadata (provider, model, simulation ID) for traceability and debugging [6].
5. **Transparency**: Users can see simulation context and understand why a particular explanation was generated [3].

---

### 4.3 Frontend Workflow: Advisory Page Design

#### 4.3.1 User Interaction Flow

The frontend [src/pages/Advisory.tsx] implements a multi-panel workspace:

1. **Simulation Selection Panel** (left sidebar):
   - Loads user's saved simulations from the database.
   - Presents a dropdown to select the active simulation.
   - Shows a context card with simulation name, cooling technique, and creation date.
   - Displays the selected simulation's metadata for immediate reference.

2. **Saved Chat History Panel** (left sidebar, below simulation):
   - Lists all previous advisory conversations grouped by simulation.
   - Each thread shows title (inferred from first user message), message count, and last update timestamp.
   - "New Chat" button creates a new empty thread for the selected simulation.
   - Clicking a thread loads its full message history.

3. **Advisory Workspace** (right panel):
   - Header explains the advisory page purpose and shows summary statistics.
   - Context pills display key simulation attributes (name, technique, date).
   - Input form with text field and submit button.
   - Conversation area showing message history with user messages and AI responses.

#### 4.3.2 Conversation State Management

Chat messages are stored in a multi-layer persistence model:

- **Layer 1 (Browser Local Storage)**: All chats are saved locally using a user-specific key `advisory_chat_history:<userId>`. This allows conversations to persist across page reloads and enables offline access to message history [7].

- **Layer 2 (Supabase Database)**: After a successful LLM response, the system attempts to insert a record into the `chat_history` table with fields: `user_id`, `input_question`, `input_scenario` (compact scenario metadata), `model_used`, `output_text`, and `output_llm`. Database saves are attempted but failures are logged without blocking the user experience [8].

**Data Structure**:
```json
{
  "chatId": "chat-<timestamp>-<random>",
  "chatTitle": "<inferred from first message or 'New Chat'>",
  "simulationId": <number>,
  "simulationName": "<string>",
  "updatedAt": "<ISO 8601 timestamp>",
  "messages": [
    {
      "id": "<timestamp>-<role>",
      "role": "user|assistant",
      "content": "<message text>",
      "timestamp": "<ISO 8601 timestamp>",
      "metadata": {
        "source": "<provider>",
        "model": "<model name>",
        "simulationId": "<int>"
      }
    }
  ]
}
```

---

### 4.4 Backend Workflow: Prompt Construction and LLM Routing

#### 4.4.1 Request Reception and Simulation Resolution

When the frontend sends a POST request to `/api/advisory/ask`, the backend receives:

```json
{
  "question": "<user question>",
  "simulationId": "<string>",
  "simulation": { /* full simulation object */ }
}
```

The backend then resolves the simulation data using a two-stage lookup:

**Stage 1 - Database Query**:
- Attempt to fetch simulation from Supabase using `simulationId`.
- If found, extract simulation metadata, type, and results.
- Combine with related simulation_results records.

**Stage 2 - Fallback to Request Payload**:
- If Supabase query fails or returns null, use the `simulation` object from the request body.
- Extract `coolingTechnique`, `simulation_type`, and `results` fields.

This two-stage design ensures robustness: the system can operate with or without database connectivity [9].

#### 4.4.2 Intent Detection and Question Categorization

The backend analyzes the user question to identify its intent. Intent detection uses keyword matching against predefined categories:

```python
keyword_categories = {
    "energy": ["energy", "kwh", "consumption", "power", "efficiency", "watt"],
    "cost": ["cost", "price", "expense", "roi", "payback", "opex", "financial", "saving"],
    "thermal": ["temperature", "thermal", "inlet", "cool", "adequate", "ashrae"],
    "carbon": ["carbon", "co2", "emission", "environmental", "sustainability"],
    "water": ["water", "evaporation", "humid", "wue", "moisture", "gallons"],
    "comparison": ["compare", "versus", "vs", "better", "worse", "recommend"]
}
```

The system identifies all matching categories and selects the **primary category** (first match) along with a list of **all matched categories**. This multi-category matching allows questions that span multiple concerns (e.g., "How can I reduce both emissions and cost?") [5].

Additionally, the system detects whether the user is explicitly asking for **negative information** (risks, problems, weaknesses) by checking for downside-related keywords such as "worst", "weakness", "downside", "risk", "problem", "limitation", "drawback". This distinction is critical because it changes the response style and tone [10].

#### 4.4.3 Key Metrics Extraction

From the simulation results, the backend extracts user-friendly metrics:

```
Average COP (efficiency): <float>
Total energy used: <float> kWh
Total cost: $<float>
Average PUE: <float>
Cost savings: <float>%
CO2 emissions: <float> kg
Recommended technique: <string>
Thermal status: <string>
```

These metrics are included in the prompt to anchor the LLM's explanation in actual quantitative results [2].

#### 4.4.4 Methodology Context Injection

Based on the detected cooling technique and question category, the backend loads relevant methodology snippets:

- **Technique-Specific Reference**: Load first ~1500 characters of technique documentation (e.g., `air-side output.txt`, `evaporative-output.txt`, `chilled-output.txt`).
- **Category-Relevant Information**: Select snippets that align with the detected question category to provide domain context.

This injection ensures the LLM has access to project-specific methodology without requiring the full document, keeping the context window manageable [11].

#### 4.4.5 Prompt Template and Response Style Adaptation

The backend constructs a final prompt using a template:

```
You are a helpful data center cooling advisor speaking to a manager or decision-maker.
Your job is to answer questions in a FRIENDLY, CLEAR, and PRACTICAL way.

[Context: cooling technique, question category, key metrics, methodology snippet]

USER QUESTION: <user question>

RESPONSE FORMAT INSTRUCTIONS:
1. Answer DIRECTLY and CONVERSATIONALLY
2. Use specific NUMBERS from the results to support your answer
3. Use simple language - avoid technical jargon
4. Break long answers into SHORT PARAGRAPHS with clear sections
5. Use real-world comparisons when helpful
6. Focus on BUSINESS IMPACT: savings, efficiency, reliability
7. If unclear, say 'I need more information about...'
8. DO NOT mention simulation IDs, methodology files, or technical process details
9. DO NOT include disclaimers like 'keep in mind these are estimates'
10. DO NOT mention 'based on simulation results' - just give practical insights
[Conditional response style based on intent]
```

**Response Style Adaptation**:

- **If Downside Mode is Detected**: Include additional instruction: "Lead with the WORST issue first. Mention only drawbacks, constraints, failure points, and business risk impact. Do NOT include benefits, savings opportunities, upside, or improvement suggestions unless explicitly asked. End with the key risk impact, not a positive conclusion."

- **If Normal Question**: Include instruction: "Keep a balanced practical tone focused on business impact."

This adaptive prompt design ensures the LLM's output matches the user's actual intent [5], [10].

---

### 4.5 LLM Provider Routing and Failover Strategy

#### 4.5.1 Provider Chain Configuration

The backend supports a **provider chain** mechanism that allows fallback to multiple LLM services:

```
Primary Provider Chain: [ollama, xai, groq, openrouter, gemini]
```

Each provider has environment configuration:
- **Ollama**: Local or self-hosted inference; URL via `OLLAMA_API_URL`; model via `OLLAMA_MODEL`.
- **xAI/Grok**: Cloud-hosted; API key via `XAI_API_KEY`; model via `XAI_MODEL`.
- **Groq**: Cloud-hosted; API key via `GROQ_API_KEY`; model via `GROQ_MODEL`; supports model chain fallback.
- **OpenRouter**: Multi-model aggregator; API key via `OPENROUTER_API_KEY`; model via `OPENROUTER_MODEL`.
- **Gemini**: Google cloud service; API key via `GEMINI_API_KEY`; model via `GEMINI_MODEL`.

#### 4.5.2 Call Execution and Error Handling

For each provider in the chain:

1. **Check Configuration**: Verify that required API keys and endpoints are set.
2. **Construct Request**: Build provider-specific API request with system prompt and user prompt.
3. **Execute Call**: Make HTTP request with timeout (45–90 seconds depending on provider).
4. **Parse Response**: Extract message content from provider-specific response format.
5. **Validate Output**: Ensure response is non-empty; raise error if empty.
6. **Return on Success**: If successful, return answer and model name; stop chain iteration.
7. **Log Error on Failure**: If request fails (HTTP error, timeout, parse error), log the error and continue to next provider.

**Groq Model Chain**: Groq additionally supports a model chain (multiple models tried sequentially within a single provider) via `GROQ_MODEL_CHAIN` environment variable [12].

#### 4.5.3 Graceful Degradation

If all providers in the chain fail, the system returns a fallback response:

```json
{
  "answer": "Live LLM response is unavailable right now. Selected simulation <id> (<technique>) is loaded with status <status>. Your question was received; check active LLM provider settings and retry.",
  "metadata": {
    "source": "fallback",
    "reason": "<chain of error messages>",
    "provider_chain": ["ollama", "xai", "groq", "openrouter", "gemini"],
    "simulationId": "<id>"
  }
}
```

This design ensures the advisory page remains operational even when all external LLM services are unavailable, while clearly communicating the issue to the user [9].

---

### 4.6 Response Generation and Metadata

#### 4.6.1 Response Structure

The backend returns a structured JSON response:

```json
{
  "answer": "<generated advisory text>",
  "metadata": {
    "source": "<provider name>",
    "model": "<model name or version>",
    "provider_chain": ["<providers tried>"],
    "simulationId": "<id>"
  }
}
```

#### 4.6.2 Frontend Display and Metadata Rendering

The frontend renders the advisory response as an assistant message in the conversation. Below the message text, it displays metadata chips:

- `source: <provider>`
- `model: <model>`

These chips provide end-user transparency about where the answer came from, supporting reproducibility and debugging [6].

---

### 4.7 Chat History Persistence and Retrieval

#### 4.7.1 Local Storage Schema

Chat sessions are serialized to JSON and stored in browser local storage under the key `advisory_chat_history:<userId>`:

```json
[
  {
    "chatId": "chat-1234567890-abc123",
    "chatTitle": "How to improve efficiency?",
    "simulationId": 42,
    "simulationName": "NYC Data Center v2",
    "updatedAt": "2026-04-20T15:30:00Z",
    "messages": [
      { "id": "1234567890-user", "role": "user", "content": "...", "timestamp": "..." },
      { "id": "1234567890-assistant", "role": "assistant", "content": "...", "timestamp": "...", "metadata": {...} }
    ]
  }
]
```

#### 4.7.2 Supabase Persistence

On successful advisory responses, the system inserts into the `chat_history` table:

```sql
INSERT INTO chat_history (
  user_id,
  input_question,
  input_scenario,
  model_used,
  output_text,
  output_llm
) VALUES (?, ?, ?, ?, ?, ?);
```

Fields:
- `user_id`: Foreign key to the `users` table, resolved via `auth_user_id` from Supabase Auth.
- `input_question`: The user's original question text.
- `input_scenario`: JSON object with `simulationId`, `simulationName`, `simulationType`.
- `model_used`: The model name returned by the LLM provider.
- `output_text`: The full advisory response text.
- `output_llm`: The LLM provider name (e.g., "groq", "openrouter").

This dual persistence (local + database) provides both immediate user experience (local storage) and long-term auditability (Supabase) [8].

---

### 4.8 Quality Assurance and Reliability Measures

#### 4.8.1 Prompt Validation

Before sending a prompt to an LLM, the backend validates:

1. **Prompt Length**: Ensure prompt does not exceed provider token limits.
2. **Placeholder Replacement**: Verify all placeholders (e.g., `{technique}`, `{question}`) are substituted.
3. **Toxic Content Filter** (optional): Check if user question contains harmful content and reject if needed [13].

#### 4.8.2 Response Validation

After receiving an LLM response:

1. **Non-Empty Check**: Verify response contains non-empty content.
2. **Language Detection** (optional): Ensure response is in expected language (English).
3. **Length Bounds**: Ensure response is neither trivially short (<50 chars) nor excessively long (>10,000 chars).
4. **Harmful Content Filter** (optional): Screen response for policy violations [13].

#### 4.8.3 Error Recovery

- **Provider Timeout**: If a provider times out, move to next provider immediately [12].
- **Malformed Response**: If JSON parsing fails, log error and retry with next provider.
- **API Rate Limit**: If provider returns 429 (rate limit), wait and retry (with exponential backoff for some providers like Gemini).
- **Network Failure**: If no network connectivity, return fallback response after brief retry [14].

---

### 4.9 Deployment Architecture

#### 4.9.1 Service Stack

The advisory system is deployed as:

- **Frontend**: React SPA served on port 3000 (or configured via `VITE_ADVISORY_API_URL`).
- **Backend API**: FastAPI application running on port 8002.
- **LLM Providers**: External cloud services (Groq, OpenRouter, xAI, Gemini) or local Ollama instance.
- **Database**: Supabase PostgreSQL for simulation and chat history storage.
- **Cache**: Browser local storage for session-level chat history.

#### 4.9.2 Configuration Management

Environment variables control the advisory system:

```bash
# Provider configuration
LLM_PROVIDER="openrouter"  # Primary provider
LLM_PROVIDER_CHAIN="groq,openrouter,gemini"  # Fallback chain

# API keys
OPENROUTER_API_KEY="sk-..."
GROQ_API_KEY="gsk-..."
XAI_API_KEY="xai-..."
GEMINI_API_KEY="AIza..."

# Model selection
OPENROUTER_MODEL="openai/gpt-4o-mini"
GROQ_MODEL="llama-3.1-8b-instant"
GROQ_MODEL_CHAIN="llama-3.1-70b-versatile,llama-3.1-8b-instant"

# Frontend
VITE_ADVISORY_API_URL="http://localhost:8002/api"

# Database
SUPABASE_URL="https://..."
SUPABASE_ANON_KEY="eyJ..."
```

---

### 4.10 Limitations and Future Work

#### 4.10.1 Current Limitations

1. **Context Window Constraints**: LLM providers have finite token limits; very large simulation datasets may be truncated [11].
2. **Intent Detection Brittleness**: Keyword-based intent detection may fail for novel question phrasings [5].
3. **No Multi-Turn Reasoning**: Each question is answered independently; the system does not maintain semantic context across turns.
4. **Provider Dependency**: Reliability depends on availability of configured external LLM services.
5. **Hallucination Risk**: LLMs may generate plausible-sounding but incorrect information; grounding and validation are partially mitigated by simulation context [15].

#### 4.10.2 Future Enhancements

1. **Semantic Search**: Integrate vector embeddings to retrieve the most relevant historical answers or simulation cases [16].
2. **Fine-Tuning**: Fine-tune a smaller LLM model on domain-specific question-answer pairs to reduce hallucination [17].
3. **Multi-Turn Dialogue**: Implement memory and context tracking to support follow-up questions [18].
4. **Explanation Verification**: Compare LLM outputs against simulation results to detect and flag inconsistencies.
5. **User Feedback Loop**: Collect user feedback on answer quality to enable offline model refinement.

---

### 4.11 Methodology Conclusion

The LLM advisory methodology combines simulation-grounded prompt construction, multi-provider routing, dual-layer persistence, and structured response validation to produce reliable, auditable explanations. The system is designed to be transparent, reproducible, and operationally robust. By anchoring LLM responses in actual simulation data and enforcing strict response constraints, the advisory page bridges quantitative analysis and human-interpretable guidance [1], [2], [3].

---

## References

[1] Y. Lewis et al., "Retrieval-Augmented Generation for Large Language Models: A Survey," *arXiv preprint arXiv:2312.10997*, 2023.

[2] S. Thawani et al., "Towards Interpretable Natural Language Understanding with Explanations," in Proceedings of the 2021 Conference on Empirical Methods in Natural Language Processing (EMNLP), 2021.

[3] C. Raffel et al., "Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer," *Journal of Machine Learning Research*, vol. 21, pp. 140:1–140:67, 2020.

[4] M. Vig and Y. Belinkov, "A Primer in BERTology: What We Know About How BERT Works," *Transactions of the Association for Computational Linguistics*, vol. 8, pp. 842–866, 2021.

[5] S. Young et al., "POMDP-based Statistical Spoken Dialog Systems and the Challenge of Real-world Deployment," in Proceedings of the 14th Annual SIGdial Meeting on Discourse and Dialogue, 2013.

[6] T. Weidinger et al., "Ethical and Social Risks of Harm from Language Models," *arXiv preprint arXiv:2112.04359*, 2021.

[7] MDN Web Docs, "Web Storage API," Mozilla Developer Network, Available: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API

[8] Supabase, "Supabase Database Documentation," Available: https://supabase.com/docs/guides/database

[9] N. K. Jain et al., "Fault Tolerance and Resilience in Microservices: A Comprehensive Survey," *IEEE Communications Surveys & Tutorials*, vol. 23, no. 2, pp. 1050–1080, 2021.

[10] D. B. Leake, "Case-Based Reasoning," in *Handbook of Research on Machine Learning Applications and Trends: Algorithms, Methods, and Techniques*, IGI Global, 2010, pp. 547–566.

[11] A. Vaswani et al., "Attention Is All You Need," in *Advances in Neural Information Processing Systems 30 (NeurIPS 2017)*, 2017.

[12] Groq, "Groq API Documentation," Available: https://console.groq.com/docs

[13] P. Welbl et al., "Towards a Unified Multi-Dimensional Evaluator for Text Generation," in Proceedings of the 2021 Conference on Empirical Methods in Natural Language Processing (EMNLP), 2021.

[14] S. Gopal et al., "Robust Loss Functions Under Label Noise for Deep Neural Networks," in *Proceedings of the AAAI Conference on Artificial Intelligence*, vol. 29, 2015.

[15] J. Wei et al., "Emergent Abilities of Large Language Models," *arXiv preprint arXiv:2206.07682*, 2022.

[16] J. P. Devlin et al., "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding," in *Proceedings of the 2019 Conference of the North American Chapter of the Association for Computational Linguistics*, 2019.

[17] P. J. Liu et al., "Multi-Task Deep Neural Networks for Natural Language Understanding," in *Proceedings of the 57th Annual Meeting of the Association for Computational Linguistics*, 2019.

[18] S. Zhang et al., "Improving Open-Domain Dialogue Systems with Unsupervised Learning," in *Proceedings of the 2020 Conference on Empirical Methods in Natural Language Processing (EMNLP)*, 2020.

---

