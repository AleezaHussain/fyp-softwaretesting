# Functional Requirements — COOlience Data Center Cooling Platform

## 1. Simulations Page (`/simulations`)

### 1.1 Summary Statistics Bar

- Display total simulation count
- Display completed simulation count
- Display currently running simulation count
- Display average PUE across all completed simulations (technique-aware extraction)

### 1.2 Search and Filtering

- Full-text search across simulation name and description
- Filter by status: All / Completed / Running / Pending / Failed
- Filter by cooling technique: All / Air-Side Economizer / Chilled Water / Evaporative Cooling
- Filters reset pagination to page 1 on change

### 1.3 View Modes

- Grid view: 3-column card layout
- List view: compact single-row layout with inline metadata
- Toggle between views persists within session

### 1.4 Simulation Card (Grid View)

Each card displays:

- Simulation name and status badge (colour-coded: green=completed, blue=running, yellow=pending, red=failed, orange=cancelled)
- Description text
- Cooling technique with colour-coded label
- PUE (technique-aware: evaporative uses pue_average, air uses averagePUE, chilled uses metrics.pue)
- Total Energy (kWh)
- Annual Cost (USD)
- Carbon emissions (kg CO₂)
- Technique-specific extra metric: evaporative shows PUE Max + Max Inlet Temp; air/chilled shows Payback Period
- Created date
- Action buttons: View Details, Download PDF, Delete

### 1.5 Simulation Row (List View)

Each row displays:

- Name, status badge, description (truncated)
- Technique tag with icon, created date, simulation ID
- Action buttons: View Details, Download PDF, Delete

### 1.6 Pagination

- 5 items per page
- Smart page number display (ellipsis for large page counts)
- Previous / Next navigation buttons

### 1.7 Delete Simulation

- Confirmation modal before deletion
- Removes simulation from DB and updates UI without page reload
- Dispatches `simulation-deleted` custom event

### 1.8 Download PDF from List

- Generates PDF report directly from simulation result data
- Works from both grid and list view

### 1.9 Resume Cancelled Simulation

- Resume button appears on cancelled simulations
- Re-runs simulation using stored `_api_payload` from result data

### 1.10 Empty State

- Contextual message: no results found (filters active) vs no simulations yet
- Call-to-action button to start first simulation

---

## 2. Simulation Detail Page (`/simulation/:id`)

### 2.1 Page Header

- Simulation name and description
- Technique icon and gradient badge (colour per technique)
- Status/Created/Completed/Technique info strip (4 cards)
- Export PDF button with loading spinner during capture

### 2.2 Tab Navigation

Five tabs: Overview, Charts, Detailed Metrics, Recommendations, Raw Data

### 2.3 Overview Tab

- Performance Summary: 4 KPI cards, technique-specific values
  - Evaporative: Runtime, PUE Average, Cooling Cap Avg, Annual Cost
  - Air-Side: Runtime, Energy Consumed, Energy Savings %, Annual Savings
  - Chilled Water: Runtime, Energy Consumed, PUE, Annual Cost
- Simulation Info table: ID, type, status, created, completed, runtime

### 2.4 Charts Tab

- Dropdown selector to navigate between all available charts
- Previous / Next navigation buttons
- Chart counter (e.g. "3 / 12")
- Charts rendered at 480px height with full-width ResponsiveContainer
- LLM-generated explanation text below each chart (cached in localStorage)
- Parameter reference panel showing source field names

### 2.5 Detailed Metrics Tab

- Technique badge and source attribution label
- AI Metrics Analysis block (LLM-generated, cached per simulation)
- KPI grid: all technique-specific metrics with hover tooltips (ⓘ)
- Phase 4 Compliance Gates (chilled water): PASS/FAIL badges per gate
- Airflow Analysis section (air-side): violation hours, mode breakdown, warning messages
- CloudSim Workload metadata (if enabled): mode, utilisation, rack stats

### 2.6 Recommendations Tab

- ML-powered technique recommendation with methodology-based decision trace
- Cross-technique comparison table (Air, Evaporative, Chilled) with score, feasibility, violations, and annual cost/emissions/water
- Final decision logic visibility: model prediction, feasibility filtering, and fallback-to-lowest-feasible-score when needed
- Future impact analysis paragraph

### 2.7 Raw Data Tab

- Warning banner explaining raw array data
- Expandable array sections grouped by category (Raw API, Derived, Summary, Assessment, ML)
- Each section shows row count, source field path, CSV download button
- Paginated table (50 rows/page) with all columns
- AI raw data explanation (field guide + pattern summary, cached in localStorage)

### 2.8 PDF Export

- Switches to Charts tab, waits 800ms for mount
- Captures every chart via html2canvas (scale 2x, 1.4s animation wait)
- Fetches AI metrics explanation (cached by simulation ID)
- Generates multi-section PDF: Cover, Overview, Charts, Detailed Metrics, Recommendations
- Button disabled with spinner during export

### 2.9 Status Handling

- Running: animated spinner with "Simulation in progress" message
- Failed: error icon with failure reason if available
- Cancelled: orange icon with cancellation message
- No results: generic placeholder

---

## 3. Reporting Page (`/reports`)

### 3.1 Simulation Results Table

- Lists all completed simulations with columns: Name, Type, Status, Energy (kWh), Efficiency (PUE), Cost Savings %, Runtime, Completed date
- Pagination with configurable page size
- Click row to navigate to simulation detail

### 3.2 Report Generation

- Select simulation and report type (Executive / Technical / Sustainability)
- Generate PDF report with charts and AI insights
- Export formats: PDF, Json

### 3.4 Report History

- List of previously generated reports
- Re-download or delete past reports

---

## 4. Technical Guide Page (`/technical-guide`)

### 4.1 Tab Navigation

Five tabs: Overview, Air-Side Economizer, Chilled Water, Evaporative Cooling, Reading Results

### 4.2 Overview Tab

- Introduction to data center cooling concepts
- Comparison of all three techniques (PUE ranges, water usage, cost profiles)
- When to use each technique decision guide

### 4.3 Air-Side Economizer Tab

- Collapsible sections: System Overview, Input Parameters, Operating Modes, Airflow & Rack Geometry, Thermal Mass
- Field reference tables: field name, unit, default, range, description
- Operating mode explanation: FULL_ECON / PARTIAL_TRIM / MECHANICAL_ONLY with threshold conditions

### 4.4 Chilled Water Tab

- Collapsible sections: System Overview, Chiller Configuration, Water Stress, Economic Parameters
- Field reference tables with all configuration parameters
- Phase 4 Gate explanations: Thermal Compliance, Water Constraint, Carbon Liability, Economic Viability

### 4.5 Evaporative Cooling Tab

- Collapsible sections: System Overview, Cooling Architecture, Advanced Parameters
- DEC / IEC / Hybrid mode explanations with effectiveness percentages
- ASHRAE compliance requirements

### 4.6 Reading Results Tab

- Output metric cards: PUE, WUE, CUE, COP, each with good/bad thresholds and explanation
- How to interpret Phase 4 gates
- How to read the 5-year projection charts
- ML recommendation methodology explanation: six-feature inference input, climate-aware estimation for non-simulated techniques, feasibility thresholds, and composite-score fallback
- How cross-technique comparison determines final recommendation (model pick vs final feasible pick)

---

## 5. Profile Page (`/profile`)

### 5.1 Profile Tab

- Display and edit: full name, email
- Simulations ran counter (read-only)
- Save changes with success/error feedback

### 5.2 Preferences Tab

- Theme toggle: Light / Dark
- Save preferences

### 5.3 Security Tab

- Change password form (current password, new password, confirm)
- Password strength indicator
- Two-factor authentication toggle (UI)
- Active sessions list with revoke option
- Account deletion with confirmation modal

### 5.4 Data & Exports Tab

- Export all simulation data as JSON
- Export all simulation data as PDF and Json (ZIP)
- Download activity log
- Clear cached AI explanations from localStorage

---

## 6. Dashboard Page (`/dashboard`)

### 6.1 Welcome Header

- Personalised greeting with user name
- Quick action cards: New Simulation, View Reports, Compare Methods (Advisory page khaitjaa)

### 6.2 Summary Statistics

- Real-time stats fetched from backend (polled every 5 seconds)
- Cards: Total Simulations, Completed, Running, Average PUE

### 6.3 CO₂ Factor & Tariff by Country Chart

- Bar/scatter chart of electricity tariff and grid carbon intensity per country
- Data from tariff/location API

### 6.4 Charts Section (visible when simulations exist)

**Row 1 — Technique Analysis:**

- Energy Consumed by Technique (Pie chart): total kWh per cooling technique
- Average PUE by Technique (Bar chart): avg PUE per technique, only completed sims

**Row 2 — Data Center Analysis:**

- Energy Consumed by Data Center (Pie chart): grouped by `dataCenterName` from result_data
- Average Annual Cost by Technique (Bar chart): avg annual operating cost per technique

**Row 3 — Timeline & Comparison:**

- Simulation Runtime History (Bar chart): runtime in minutes per simulation, ordered by date, coloured by technique
- Technique Performance Radar (Radar chart): normalised 0–10 scores across Low Energy, Low PUE, Low Cost, Efficiency — only shown when multiple techniques exist

### 6.5 Quick Actions Section

- New Simulation card → navigates to `/input-management`
- View Reports card → navigates to `/reports`
- Compare Methods card → navigates to `/advisory`

### 6.6 Recent Simulations Table

- Last 5 simulations with name, location, technique, status
- View and Download action buttons per row

### 6.7 Recent Activity Feed

- Paginated activity log (5 per page, up to 50 fetched)
- Activity types: simulation created/viewed/completed/deleted, report exported, login/logout, profile updated
- Colour-coded icons per activity type
- Clickable rows navigate to relevant simulation or report
- Time-ago display + full date
- Loading spinner while fetching

---

## 7. Login Page (`/login`)

### 7.3 Login Form

- Email input field with icon and inline validation error
- Password input field with show/hide toggle and inline validation error
- Remember Me checkbox — persists email to localStorage (`coolsim_remembered_email`)
- Forgot Password link → navigates to `/forgot-password`
- Submit button with loading spinner ("Signing in...")
- Global error banner for invalid credentials or server errors
- "Don't have an account? Sign up now" link → `/signup`

### 7.4 Validation Rules

- Email: required, must match `\S+@\S+\.\S+` pattern
- Password: required, minimum 6 characters
- Errors shown inline below each field with warning icon

### 7.5 Post-Login Behaviour

- On success: saves/clears remembered email based on checkbox, navigates to `/dashboard`
- On failure: displays error message in red banner, stays on login page

---

## 8. Sign Up Page (`/signup`)

### 8.3 Registration Form

- Full Name input (with icon)
- Email input (with icon)
- Password input with show/hide toggle
- Confirm Password input with show/hide toggle
- Password requirements indicator (live, shown when password field has content):
  - 8+ characters
  - Uppercase letter
  - Lowercase letter
  - Number
  - Each requirement shows green dot when satisfied
- Terms & Conditions checkbox with links to `/terms` and `/privacy`
- Submit button with loading spinner ("Creating account...")
- Global error banner for registration failures
- "Already have an account? Sign in here" link → `/login`

### 8.4 Validation Rules

- Full Name: required
- Email: required, valid format
- Password: required, min 8 chars, must contain uppercase + lowercase + number
- Confirm Password: must match password
- Terms checkbox: must be checked

### 8.5 Email Confirmation Screen

- Shown immediately after successful registration (overlays the page)
- Displays email address the confirmation was sent to
- Instruction to click the link in the email to verify account
- "Go to Login" button → `/login`
- Note: "Didn't receive it? Check your spam folder."
- Supabase requires email confirmation before the user can sign in

---

## 9. Forgot Password Page (`/forgot-password`)

### 9.2 Two-Step Flow

**Step 1 — Email Verification:**

- Email input field with icon and inline validation
- "Continue" button with loading spinner
- Calls `authService.resetPassword(email)` to verify the email exists
- On success: advances to Step 2
- On failure: shows inline error "Unable to verify this email"

**Step 2 — New Password Entry:**

- New Password input with show/hide toggle
- Password strength bar (animated, colour-coded: red=Weak, amber=Fair, green=Good/Strong/Very Strong)
- Password strength label below bar
- Confirm Password input with show/hide toggle
- "Reset Password" button with loading spinner
- Calls `authService.updatePassword(email, newPassword)` to apply the change
- On success: navigates to `/login`
- On failure: shows inline error on confirm password field

### 9.3 Validation Rules — Step 1

- Email: required, valid format

### 9.4 Validation Rules — Step 2

- New Password: required, min 8 chars, must contain uppercase letter, must contain number
- Confirm Password: must match new password

### 9.5 Password Strength Scoring

- Score 0: Weak (red)
- Score 1: Fair (amber)
- Score 2: Good (green)
- Score 3: Strong (green)
- Score 4: Very Strong (green)
- Score increments for: length ≥ 8, uppercase present, digit present, special character present
