# Test Strategy

## DataCenter Cooling Simulation & Optimization Platform

**Date:** April 26, 2026

---

**Group Members:**

| Name | Roll No. |
|------|----------|
| [Member 1 Name] | [Roll No.] |
| [Member 2 Name] | [Roll No.] |
| [Member 3 Name] | [Roll No.] |
| [Member 4 Name] | [Roll No.] |

---

---

## Document Control

### Author

| Position | Name |
|----------|------|
| Project Lead / Developer | [Name] |
| Backend Developer | [Name] |
| Frontend Developer | [Name] |
| ML / AI Engineer | [Name] |

---

### Stakeholders and Other Contributors

| Position | Name |
|----------|------|
| FYP Supervisor | [Supervisor Name] |
| External Examiner | [Examiner Name] |
| Industry Advisor (if any) | [Advisor Name] |

---

### Revision History

| Version | Issue Date | Author/Editor | Description/Summary of Changes |
|---------|------------|---------------|-------------------------------|
| 1.0 | April 26, 2026 | [Author Name] | Initial draft of Test Strategy Document |
| | | | |

---

### Reviewed By

| Version | Issue Date | Name | Position | Review Date |
|---------|------------|------|----------|-------------|
| 1.0 | April 26, 2026 | [Reviewer Name] | FYP Supervisor | April 26, 2026 |
| | | | | |

---

### Approvals

Approval refers to the approver's acceptance of the content and overall intention of this document, including acceptance of any commitments described in order to successfully deliver the initiative. The approver, where relevant, also confirms that this document complies with relevant strategies, policies and regulatory requirements.

| Version | Issue Date | Name | Position | Approval Date |
|---------|------------|------|----------|---------------|
| 1.0 | April 26, 2026 | [Approver Name] | FYP Supervisor | April 26, 2026 |
| | | | | |

---

### Related Documents

| Document | Location |
|----------|----------|
| API Complete Summary | `API_COMPLETE_SUMMARY.md` |
| API Setup Guide | `API_SETUP_GUIDE.md` |
| Flow Diagram | `chilled-water-system/FLOW_DIAGRAM.md` |
| Simulation Methodology | `chilled-water-system/METHODOLOGY.md` |
| ML Recommendation Methodology | `ML_RECOMMENDATION_METHODOLOGY.md` |
| LLM Advisory Methodology | `LLM_METHODOLOGY.md` |
| Swagger API Docs | `http://localhost:8080/swagger-ui.html` |

---

---

## 1. Introduction

### 1.1 Product Description

The **DataCenter Cooling Simulation & Optimization Platform** is a full-stack Final Year Project (FYP) designed to simulate, analyze, and optimize cooling strategies for modern data centers. The platform enables engineers and data center operators to model three distinct cooling techniques — **Air-Side Economizer**, **Chilled Water Cooling**, and **Evaporative Cooling** — and compare their performance across energy consumption, operational cost, water usage, and carbon emissions.

The system integrates a **React + TypeScript** frontend with a **Java Spring Boot** backend simulation engine powered by **CloudSim Plus**, supplemented by two **Python FastAPI** microservices: one for **Machine Learning-based cooling recommendations** (Random Forest) and one for an **LLM-powered advisory system** (supporting Groq, OpenRouter, Gemini, Ollama, and XAI providers).

The platform performs **8,760-hour annual simulations** (full year at hourly granularity), computing metrics such as Power Usage Effectiveness (PUE), Water Usage Effectiveness (WUE), Coefficient of Performance (COP), Net Present Value (NPV), carbon liability, and Phase 4 gate compliance checks. Results are visualized through interactive charts and can be exported as PDF, PPT, CSV, or PNG reports.

### 1.2 Scope

This Test Strategy document defines the overall testing approach for the DataCenter Cooling Simulation & Optimization Platform. It covers:

- **Who will review this document:** The FYP supervisor, group members, and the external examiner.
- **Who will approve this document:** The FYP supervisor.
- **Software testing activities and timelines:**

| Activity | Timeline |
|----------|----------|
| Unit Testing (Backend Java) | Week 1–2 of testing phase |
| Unit Testing (Python APIs) | Week 1–2 of testing phase |
| Integration Testing | Week 3 of testing phase |
| System Testing | Week 4–5 of testing phase |
| Performance & Load Testing | Week 5 of testing phase |
| Security Testing | Week 5–6 of testing phase |
| User Acceptance Testing (UAT) | Week 6 of testing phase |
| Regression Testing | Ongoing throughout |

---

## 2. Standards to Be Used

The following standards and guidelines govern the testing activities for this project:

1. **IEEE 829 – Standard for Software Test Documentation:** All test plans, test cases, and test reports follow the structure recommended by IEEE 829.
2. **ISO/IEC 25010 – Software Quality Model:** Testing criteria are aligned with the quality characteristics defined in ISO/IEC 25010, including functional suitability, performance efficiency, reliability, security, usability, and maintainability.
3. **ASHRAE TC 9.9 Guidelines:** Thermal compliance thresholds used in simulation validation (e.g., inlet temperature limits, humidity ranges) are benchmarked against ASHRAE data center standards.
4. **OWASP Top 10:** Security testing follows the OWASP Top 10 vulnerability checklist for web applications.
5. **REST API Design Standards:** API endpoint testing follows RESTful conventions and HTTP status code standards (RFC 7231).
6. **Java Code Style (Google Java Style Guide):** Backend code quality and static analysis adhere to the Google Java Style Guide.
7. **PEP 8 – Python Style Guide:** Python microservices (recommendation and advisory APIs) follow PEP 8 coding standards.

---

## 3. System Test Methodology

### 3.1 Process of Testing

The testing process follows a structured lifecycle aligned with the project's development phases:

1. **Test Planning:** Define scope, objectives, resources, and schedule. Identify features to be tested and tools to be used. (Completed in this document.)
2. **Test Design:** Write test cases for each module — frontend components, backend simulation engine, Python APIs, and ML model. Define expected inputs and outputs for each test.
3. **Test Environment Setup:** Configure local development environments, set up the Java Spring Boot server on port 8080, Python FastAPI services on ports 8001 and 8002, and the React frontend on port 5173 (Vite dev server).
4. **Test Execution:** Execute unit tests, integration tests, system tests, and non-functional tests in sequence. Log all defects in the bug-tracking system.
5. **Defect Reporting & Tracking:** All bugs are logged with severity (Critical, Major, Minor, Trivial), steps to reproduce, expected vs. actual behavior, and assigned owner.
6. **Regression Testing:** After each bug fix, re-run affected test cases to confirm resolution and ensure no new defects are introduced.
7. **Test Closure:** Verify exit criteria are met, generate test summary report, and archive all test artifacts.

---

### 3.2 Testing Levels

**Level 1 – Unit Testing**

Unit testing is performed at the individual component or function level. Each module is tested in isolation with mocked dependencies.

- **Backend (Java):** JUnit 5 is used to test individual service methods in `ChilledWaterSimulationService`, utility classes (`PsychrometricCalculator`, `ChillerAutoSizer`, `AirDensityCalculator`, `CarbonTaxEscalation`), and physics models (`ChilledWaterPhysics`, `CoolingCostCalculator`).
- **Python APIs:** pytest is used to test individual route handlers in `recommend_api.py` and `advisory_api.py`, including ML model inference logic and LLM fallback chain behavior.
- **Frontend (React/TypeScript):** Vitest + React Testing Library is used to test individual UI components such as the 5-step simulation wizard, chart components, and form validation logic.

**Level 2 – Integration Testing**

Integration testing verifies that different modules communicate correctly when combined.

- Frontend ↔ Chilled Water API (port 8080): Verify that simulation requests from the React wizard are correctly serialized and that responses are correctly deserialized and displayed.
- Frontend ↔ Recommendation API (port 8001): Verify that ML recommendation requests are sent with correct payload and that the returned recommendation is rendered in the UI.
- Frontend ↔ Advisory API (port 8002): Verify that user questions are forwarded with simulation context and that LLM responses are displayed correctly.
- Backend ↔ CloudSim Plus: Verify that the 8,760-hour simulation loop integrates correctly with the CloudSim Plus datacenter model.
- LLM Fallback Chain: Verify that when the primary LLM provider (e.g., Groq) fails, the system correctly falls back to the next provider (OpenRouter → Gemini → Ollama → XAI).

**Level 3 – System Testing**

System testing validates the complete end-to-end behavior of the platform as a whole, simulating real user workflows from login to report generation.

**Level 4 – User Acceptance Testing (UAT)**

UAT is conducted with the FYP supervisor and selected evaluators to confirm that the system meets the stated requirements and is ready for final demonstration.

---

### 3.3 Types of Testing

**3.3.1 Functional Testing**

Functional testing verifies that each feature of the platform behaves according to its specification. This includes testing the 5-step simulation wizard, all three cooling technique simulations, Phase 4 gate validation, report generation, and user authentication.

*Justification:* Functional correctness is the primary quality attribute for this system. Incorrect simulation outputs (e.g., wrong PUE, incorrect cost calculations) would directly undermine the academic and practical validity of the FYP.

**3.3.2 Performance Testing**

Performance testing measures the system's response time and throughput under expected workloads. Key benchmarks include:
- The 8,760-hour simulation must complete within an acceptable time (target: under 30 seconds for a full annual run).
- The frontend must render 8,760 hourly data points in charts without UI freezing.
- API response times for `/recommend` and `/ask` endpoints must be under 5 seconds under normal load.

*Justification:* The simulation engine processes 8,760 iterations per run with complex physics calculations. Without performance testing, the system may be too slow for practical use during the FYP demonstration.

**3.3.3 Load Testing**

Load testing evaluates system behavior under concurrent user requests. Simulated scenarios include multiple simultaneous simulation requests to the Spring Boot API and concurrent advisory queries to the LLM service.

*Justification:* Although this is an academic project, the platform is designed as a multi-user web application. Load testing ensures the backend does not crash or produce incorrect results when multiple requests are processed simultaneously, which is critical for the live demonstration environment.

**3.3.4 Security Testing**

Security testing identifies vulnerabilities in the web application and APIs. Tests include:
- Input validation and sanitization on all API endpoints (prevention of injection attacks).
- Authentication and session management testing (JWT token expiry, unauthorized access attempts).
- API key exposure checks (ensuring `.env` secrets are not leaked to the frontend bundle).
- CORS policy validation on all three backend services.

*Justification:* The platform handles user credentials (via Supabase authentication) and API keys for LLM providers (Groq, OpenRouter, Gemini). A security breach could expose sensitive credentials, making security testing essential even for an academic project.

**3.3.5 Usability Testing**

Usability testing evaluates the ease of use of the 5-step simulation wizard, results dashboard, and advisory interface. Evaluators (FYP supervisor, peers) are asked to complete defined tasks and provide feedback.

*Justification:* The platform targets engineers who may not be software experts. A confusing UI would reduce the practical value of the tool and negatively impact FYP evaluation scores.

**3.3.6 Regression Testing**

Regression testing is performed after every bug fix or code change to ensure that previously passing tests continue to pass. Automated test suites (JUnit, pytest, Vitest) are re-run after each significant commit.

*Justification:* The project has three interconnected services (Java backend, two Python APIs) and a complex frontend. A change in one module (e.g., modifying the simulation request DTO) can silently break another module. Regression testing prevents such cascading failures.

**3.3.7 API Testing**

API testing validates all REST endpoints exposed by the three backend services using Postman and automated scripts. Tests cover correct HTTP status codes, response schema validation, error handling (400, 404, 500 responses), and boundary conditions (e.g., zero IT load, extreme temperatures).

*Justification:* The entire platform is API-driven. The frontend, ML service, and advisory service all depend on the correctness of the REST APIs. API testing provides a fast feedback loop independent of the frontend.

**3.3.8 Simulation Accuracy Testing**

Simulation accuracy testing validates that the physics-based calculations produce results consistent with established engineering benchmarks. This includes:
- COP values for chillers at various ambient temperatures (validated against ASHRAE and manufacturer data).
- PUE values within the industry-standard range (1.1–2.0 for data centers).
- Water usage calculations for evaporative cooling validated against known evaporation rate formulas.
- Carbon emissions calculations cross-checked against EPA emissions factors.

*Justification:* This is the core academic contribution of the FYP. Incorrect physics calculations would invalidate the entire simulation, making accuracy testing the most critical testing activity in this project.

---

## 4. Features to Be Tested

The following features are in scope for testing, organized by system layer:

**User Authentication & Management**
- User registration (sign up with email and password)
- User login and session management
- Password reset via email
- Profile settings update (theme, units, notifications)
- API key management (add/update/delete LLM provider keys)

**Simulation Wizard (5-Step Input)**
- Step 1: Basic configuration (data center name, location, IT load in kW, number of racks)
- Step 2: Cooling technique selection (Air-Side Economizer, Chilled Water, Evaporative, Hybrid)
- Step 3: Advanced parameters (chiller COP, EIR coefficients, water loop temperatures, fouling factor)
- Step 4: Environmental data (weather file upload, electricity tariff, carbon intensity, carbon tax escalation)
- Step 5: Review and submit — correct serialization of all inputs into API request payload

**Chilled Water Simulation Engine (Java Spring Boot — Port 8080)**
- `POST /api/v1/chilled-water/simulate` — full 8,760-hour simulation run
- `GET /api/v1/chilled-water/health` — health check endpoint
- `GET /api/v1/chilled-water/info` — API metadata endpoint
- COP calculation accuracy across temperature ranges
- PUE and WUE metric computation
- Phase 4 gate validation (Thermal Compliance, Water Constraint, Carbon Liability, Economic Viability)
- CAPEX, OPEX, NPV, and payback period calculations
- Altitude correction for air density effects
- Time-of-Use (TOU) electricity pricing logic
- Bayesian calibration module (`BayesianCalibrator`)
- Climate risk assessment (`ClimateRiskAssessor`)

**Air-Side Economizer Simulation**
- Free cooling hours calculation based on outdoor temperature
- Psychrometric calculations (wet-bulb, dew point, enthalpy)
- Economizer effectiveness at various ambient conditions

**Evaporative Cooling Simulation**
- Evaporative pad effectiveness calculation
- Water consumption rate computation
- Humidity constraint enforcement

**ML Recommendation API (Python FastAPI — Port 8001)**
- `POST /recommend` — Random Forest model inference
- Weighted scoring (Cost 50%, Emissions 30%, Water 20%)
- Feasibility checking and constraint violation detection
- LLM-generated justification for recommendations
- Correct ranking of all three cooling techniques

| Test ID | Description | Steps | Expected Output | Actual Output | Pass/Fail | Technique |
|---------|-------------|-------|-----------------|---------------|-----------|-----------|
| TC-ML-01 | Recommendations tab loads for completed Chilled Water simulation | 1. Open simulation 18 (Chilled Water, completed) 2. Click Recommendations tab | ML Recommended technique shown, Why This Is Recommended paragraph present, Future Impact paragraph present, Comparison Table with 3 rows visible | ML Recommended technique shown, Why This Is Recommended paragraph present, Future Impact paragraph present, Comparison Table with 3 rows visible | PASS | Equivalence Partitioning |
| TC-ML-02 | API returns valid recommendation for Chilled Water scenario | POST /recommend with tempC:30, rh:65, itLoadKW:800, electricityPrice:0.12, 3 techniques in body | Response contains model_recommendation, why_this_is_recommended array with 7+ sentences, future_impact_paragraph string, comparison_table array with 3 rows | Response contains model_recommendation, why_this_is_recommended array with 7+ sentences, future_impact_paragraph string, comparison_table array with 3 rows | PASS | Equivalence Partitioning |
| TC-ML-03 | API returns ChilledWater when both Air and Evap are infeasible | POST /recommend with feasible:false and violations:2 for both AirEconomizer and Evaporative | model_recommendation = ChilledWater, ChilledWater row shows feasible:true in comparison table | model_recommendation = ChilledWater, ChilledWater row shows feasible:true in comparison table | PASS | Decision Table |
| TC-ML-04 | Recommended technique is highlighted in comparison table on frontend | 1. Open simulation 18 2. Click Recommendations tab 3. Inspect comparison table | Recommended technique row has green background and "✓ Recommended" badge. Annual cost, CO₂, and water columns show formatted numbers with $ and commas | Recommended technique row has green background and "✓ Recommended" badge. Annual cost, CO₂, and water columns show formatted numbers with $ and commas | PASS | Equivalence Partitioning |
| TC-ML-05 | ML recommendation appears correctly in downloaded PDF | 1. Open simulation 18 2. Click Recommendations tab 3. Click Download PDF 4. Open PDF and go to Recommendations section | PDF contains recommended technique name, justification text, and comparison table with all 3 techniques listed | PDF contains recommended technique name, justification text, and comparison table with all 3 techniques listed | PASS | Equivalence Partitioning |

**LLM Advisory API (Python FastAPI — Port 8002)**
- `POST /ask` — context-aware Q&A about simulation results
- LLM provider fallback chain (Groq → OpenRouter → Gemini → Ollama → XAI)
- Hourly data extraction for specific hour queries
- Simulation-grounded responses with exact metric values

| Test ID | Description | Input | Expected Output | Actual Output | Pass/Fail | Technique |
|---------|-------------|-------|-----------------|---------------|-----------|-----------|
| TC-LLM-01 | Valid energy question with real simulation data | Select Air Side (ID=15), ask: "What is the total energy used and average PUE?" | Returns 9,302 kWh and PUE 1.29 — real DB values | Returns 9,302 kWh and PUE 1.29 — real DB values | PASS | Equivalence Partitioning |
| TC-LLM-02 | Valid cost/ROI question with chilled water data | Select Chilled Water (ID=2), ask: "What is the total cost and annual savings?" | Returns real DB cost figures and annual savings of $2,570. LLM may return CAPEX ($400,000) or OpEx ($25,705) — both valid | Returns CAPEX $400,000 as total cost, annual savings $2,570 | PASS | Equivalence Partitioning |
| TC-LLM-03 | Downside/risk question | Ask: "What are the worst risks of this system?" | Answer leads with risks/drawbacks only — no positive framing, no benefits | Returns risks-only answer — leads with 50yr payback period, covers low COP, high OpEx $25,705, water 268,342L, carbon 95,608kg. No positive framing. All real DB values | PASS | Equivalence Partitioning |
| TC-LLM-04 | Empty question field — min length validation | Send: question: "", simulationId: "15" | HTTP 422 Unprocessable Entity — validation error on question field | HTTP 422 — String should have at least 1 character validation error on question field | PASS | Boundary Value Analysis |
| TC-LLM-05 | Question with exactly 1 character — min boundary | Send: question: "?", simulationId: "15" | Request accepted — returns an answer (passes min_length=1) | HTTP 200 OK — question '?' accepted, returns valid answer with PUE 1.29. min_length=1 validation passed | PASS | Boundary Value Analysis |
| TC-LLM-06 | Empty simulationId — min length validation | Send: question: "What is the PUE?", simulationId: "" | HTTP 422 Unprocessable Entity — validation error on simulationId | HTTP 422 Unprocessable Entity — validation error on simulationId | PASS | Boundary Value Analysis |
| TC-LLM-07 | simulationId not in DB + body present | Send: simulationId: "99999", simulation: {valid air data in body} | Falls back to body data — returns a valid answer | HTTP 200 OK — simulationId 99999 not found in DB, fell back to request body simulation data, returns valid PUE answer | PASS | Decision Table |
| TC-LLM-08 | simulationId not in DB + no body | Send: simulationId: "99999", no simulation field | Returns: "I don't have access to this simulation's data" | HTTP 200 OK — returns 'I don't have any information about a specific simulation' — no DB record and no body data provided | PASS | Decision Table |
| TC-LLM-09 | Empty request body | Send: {} | HTTP 422 — both required fields missing | HTTP 422 — both required fields missing | PASS | Decision Table |
| TC-LLM-10 | Valid hourly query | Select Evaporative (ID=3), ask: "What was the PUE at hour 10?" | Returns exact DB values: PUE = 1.0057 | Returns exact PUE 1.0057 for hour 10 from DB hourlyData | PASS | Equivalence Partitioning |
| TC-LLM-11 | Invalid hour — typo in hour number | Select Evaporative (ID=3), ask: "What was the PUE at hour q0?" | Returns: "It looks like the hour number might have a typo. Could you please re-enter a valid hour number between 0 and 8759?" | Returns: "It looks like the hour number might have a typo. Could you please re-enter a valid hour number between 0 and 8759?" | PASS | Negative Testing |
| TC-LLM-12 | SQL Injection attempt in question field | Send: question: "'; DROP TABLE simulations;--", simulationId: "15" | Treated as plain text — no DB error, returns normal answer | SQL injection treated as plain text — no DB error, no crash, returns normal simulation answer | PASS | Security Testing |
| TC-LLM-13 | Wrong HTTP method on advisory endpoint | Send GET /api/advisory/ask instead of POST | HTTP 405 Method Not Allowed | HTTP 405 — Method Not Allowed returned for GET request on POST-only endpoint | PASS | Negative Testing |
| TC-LLM-14 | Health check returns correct structure | GET /api/health | status: "healthy", provider_chain array present, timestamp in ISO format ending with Z | HTTP 200 — status: healthy, provider_chain: [groq], groq_configured: true, timestamp present in ISO format | PASS | Equivalence Partitioning |

**Results Dashboard**
- Annual metrics display (energy, cost, water, carbon)
- Performance metrics display (PUE, WUE, COP, peak cooling load)
- Interactive charts (Chart.js and Recharts) rendering 8,760 hourly data points
- Technique comparison view
- Phase 4 gate compliance indicators

**Reporting Module**
- Executive report template generation
- Technical report template generation
- Sustainability report template generation
- Export to PDF, PPT, PNG, and CSV formats
- Report history and re-generation

**Simulation History**
- List of past simulations with metadata
- Ability to reload and compare previous simulation results

---

## 5. Features Not to Be Tested

The following features are explicitly excluded from the testing scope for this release:

| Feature | Reason for Exclusion |
|---------|----------------------|
| Supabase database persistence (optional integration) | Supabase integration is marked optional in the codebase. The core simulation functionality operates without it. Testing is deferred to a future release. |
| Hybrid cooling technique (combined Air + Water) | The hybrid mode is listed as a UI option but the backend simulation logic for hybrid operation is not fully implemented in the current version. |
| Real-time weather data API integration | The system uses uploaded weather files (.epw/.csv). Live weather API integration is not part of the current scope. |
| Mobile responsiveness | The platform is designed for desktop use by engineers. Mobile layout testing is out of scope. |
| Third-party LLM provider billing and rate limits | Testing actual API billing behavior of Groq, OpenRouter, Gemini, etc. is outside the project's control. |
| CloudSim Plus internal simulation accuracy | CloudSim Plus is a well-established, externally validated simulation framework. Its internal correctness is assumed and not re-tested. |
| Browser compatibility (non-Chrome browsers) | The platform is tested on Google Chrome. Cross-browser testing for Firefox, Safari, and Edge is deferred. |

---

## 6. Configurations to Be Tested and Excluded

| Configuration | Tested |
|---------------|--------|
| Windows 11 + Chrome + Node.js 20 + Java 17 + Python 3.11 | Yes |
| Windows 10 + Chrome + Node.js 20 + Java 17 + Python 3.11 | Yes |
| macOS / Safari / Firefox | No — out of scope |
| Java 21 / Python 3.12 | No — project targets Java 17 and Python 3.11 |

---

## 7. Test Environment

| Component | Details |
|-----------|---------|
| Operating System | Windows 11 |
| Browser | Google Chrome (latest) |
| Node.js | v20.x |
| Java JDK | 17 |
| Python | 3.11.x |

**Service Ports**

| Service | Port |
|---------|------|
| React Frontend | 3000 |
| Java Spring Boot API | 8080 |
| Python Recommendation API | 8001 |
| Python Advisory API | 8002 |

**Test Data:** Sample weather CSV, JSON simulation fixtures, and synthetic data files are used as inputs. All test data is version-controlled in the repository.

---

## 8. Testing Tools

| Tool | Purpose |
|------|---------|
| JUnit 5 | Unit testing for Java backend |
| pytest | Unit testing for Python APIs |
| Vitest | Unit testing for React frontend |
| PowerShell / curl | Manual API testing |
| Chrome DevTools | Frontend debugging and network inspection |
| Supabase Dashboard | Database verification during testing |

che 2.0 | Unlimited |
| GitHub Actions | Commercial (Free Tier) | CI/CD pipeline for automated test execution | Freemium | Unlimited (public repos) |
| Swagger UI | Open Source | Interactive API documentation and manual testing | Apache 2.0 | Unlimited |

### 8.2 Static Analysis Tools

| Tool | Purpose |
|------|---------|
| ESLint + TypeScript ESLint | Frontend code quality and type checking |
| Checkstyle (Maven plugin) | Java code style enforcement |
| Flake8 / pylint | Python code quality checks |

---

## 9. System Test Entry and Exit Criteria

### 9.1 Entry Criteria

The software must meet the criteria below before system testing can begin:

**Generic Criteria:**
1. All basic functionality must work (simulation wizard completes without errors, API returns valid responses).
2. All unit tests run without error (JUnit, pytest, and Vitest test suites pass with 0 failures).
3. The code is frozen and contains complete functionality for the current release scope.
4. All code compiles and builds on the appropriate platforms (`mvn package` succeeds for Java; `npm run build` succeeds for frontend; Python services start without import errors).
5. All known problems are posted to the bug-tracking system (GitHub Issues).

**Project-Specific Criteria:**
6. The Spring Boot API (`/api/v1/chilled-water/health`) returns HTTP 200 on the test machine.
7. Both Python FastAPI services start successfully and respond to health check requests.
8. At least one complete end-to-end simulation run (from wizard input to results display) has been manually verified by a team member.
9. Sample weather data files are available and correctly formatted for test input.
10. All required environment variables in `.env` are configured on the test machine.

### 9.2 Exit Criteria

The software must meet the criteria below before system testing can be considered complete:

**Generic Criteria:**
1. All system tests have been executed (not necessarily all passed, but all executed and results recorded).
2. Successful execution of the complete "Getting Started" sequence: user registration → login → simulation wizard → results view → report export.
3. Results of executed tests have been discussed with the FYP supervisor (product management equivalent).
4. Successful generation of executable artifacts: `mvn package` produces a runnable JAR; `npm run build` produces a deployable frontend bundle; Python services run via `uvicorn`.
5. Code is completely frozen for the submission version.
6. Documentation review is complete (README, API docs, methodology documents are up to date).
7. There are fewer than **2 critical bugs** and fewer than **5 major bugs** open at exit. All critical bugs related to simulation accuracy must be resolved before exit.

**Project-Specific Criteria:**
8. Simulation accuracy tests pass: PUE values are within the range 1.1–2.0 for all test scenarios; COP values are within ±5% of ASHRAE benchmark values.
9. The ML recommendation API returns a valid recommendation for all three cooling techniques across at least 10 diverse test scenarios.
10. The LLM advisory system successfully responds to at least 5 standard simulation questions using the fallback chain.
11. All Phase 4 gate validation results (Thermal Compliance, Water Constraint, Carbon Liability, Economic Viability) are correctly computed and displayed.

---

## 10. Test Deliverables

The following artifacts are produced as outputs of the testing process:

- **Test Strategy Document** (this document) — defines the overall testing approach, scope, and criteria.
- **Test Cases Document** — detailed test cases for each feature listed in Section 4, including test ID, preconditions, steps, expected result, and actual result.
- **Automated Unit Test Suite (Java)** — JUnit 5 test classes for all backend service and utility classes, located in `chilled-water-system/src/test/`.
- **Automated Unit Test Suite (Python)** — pytest test files for `recommend_api.py` and `advisory_api.py`.
- **Automated Frontend Test Suite** — Vitest + React Testing Library test files for key UI components.
- **Postman Collection** — exported Postman collection covering all REST API endpoints for the three backend services, including environment variables and test scripts.
- **Load Test Scripts** — Apache JMeter test plan (`.jmx` file) for performance and load testing of the simulation API.
- **Security Scan Report** — OWASP ZAP automated scan report for the web application.
- **Simulation Accuracy Validation Report** — spreadsheet comparing simulation outputs against ASHRAE benchmark values and known-good baselines.
- **Bug Report Log** — GitHub Issues export listing all defects found during testing, with severity, status, and resolution.
- **Test Summary Report** — final document summarizing test execution results, pass/fail counts, defect metrics, and overall quality assessment.

---

## 11. Risk Analysis

| # | Risk | Probability | Impact | Mitigation Plan | Contingency Plan |
|---|------|-------------|--------|-----------------|------------------|
| 1 | **Simulation physics inaccuracy** — COP, PUE, or water usage calculations produce incorrect results due to formula implementation errors. | Medium | Critical | Cross-validate all physics formulas against ASHRAE standards and published engineering references during development. Implement simulation accuracy tests with known-good baselines. | If inaccuracies are found late, document the deviation, apply a correction factor, and clearly state the limitation in the FYP report. |
| 2 | **LLM API unavailability** — External LLM providers (Groq, OpenRouter, Gemini) are unavailable or rate-limited during testing or demonstration. | Medium | High | Implement and test the full fallback chain (Groq → OpenRouter → Gemini → Ollama → XAI). Maintain a local Ollama instance as the final fallback. | If all cloud providers fail, use the local Ollama instance exclusively for the demonstration. Pre-generate sample advisory responses for offline demo backup. |
| 3 | **Java Spring Boot performance degradation** — The 8,760-hour simulation loop takes too long (>60 seconds) on the demo machine. | Low | High | Profile the simulation loop early using Java VisualVM. Optimize inner-loop calculations (avoid object creation in hot paths, use primitive arrays). | If performance is insufficient, reduce simulation granularity to 2-hour intervals for the demo, or pre-compute and cache results for the standard demo scenario. |
| 4 | **Frontend build failure** — `npm run build` fails due to TypeScript type errors or dependency conflicts. | Low | Medium | Run `npm run build` as part of the CI pipeline on every commit. Resolve all TypeScript errors before the testing phase begins. | Roll back to the last known-good commit. Use the Vite development server (`npm run dev`) for the demonstration if the production build fails. |
| 5 | **Python dependency conflicts** — `recommend_api.py` or `advisory_api.py` fail to start due to incompatible package versions. | Medium | Medium | Pin all Python dependencies in `requirements.txt` with exact versions. Test in a clean virtual environment (`.venv`). | Use `pip install --force-reinstall` to restore the pinned environment. Maintain a Docker image as a backup deployment option. |
| 6 | **Weather data file format errors** — Uploaded `.epw` or `.csv` weather files are malformed, causing the simulation to crash. | Medium | Medium | Implement robust input validation in the backend for weather data parsing. Test with multiple real-world weather files from different sources. | Provide a set of pre-validated sample weather files for the demonstration. Display a clear user-facing error message for malformed files. |
| 7 | **ML model overfitting** — The Random Forest recommendation model performs well on training data but gives poor recommendations on new scenarios. | Low | Medium | Use cross-validation during model training. Test the model on a held-out test set of diverse scenarios. | If model quality is poor, fall back to a rule-based recommendation system using the weighted scoring formula directly, without the ML model. |
| 8 | **Supabase authentication failure** — Supabase service is unavailable, preventing user login during the demonstration. | Low | High | Implement a local authentication fallback or demo mode that bypasses Supabase for the demonstration. | Use a pre-authenticated session (stored token) for the demonstration. Clearly document that Supabase is an optional integration. |
| 9 | **Port conflicts on demo machine** — Ports 8080, 8001, or 8002 are already in use on the demonstration machine. | Low | Medium | Document port configuration clearly. Test startup scripts on a clean machine before the demonstration. | Configure all services to use alternative ports (e.g., 8090, 8011, 8012) via environment variables if conflicts occur. |
| 10 | **Insufficient test coverage** — Critical simulation paths are not covered by automated tests, leading to undetected bugs. | Medium | High | Define a minimum code coverage target of 70% for backend Java services (measured by JaCoCo). Prioritize test coverage for all physics calculation methods. | Supplement automated tests with structured manual test execution using the documented test cases before the final submission. |

---

*Document prepared in accordance with IEEE 829 Software Test Documentation Standard.*
*Font: Times New Roman, Size 12, Line Spacing 1.15, Justified.*
