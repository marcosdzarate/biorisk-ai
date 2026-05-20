# BioRisk AI — Claude Code Context

## What this project is
Enterprise ESG/TNFD biodiversity risk intelligence platform.
Powered by GBIF occurrence data + Claude AI.
Target users: ESG managers, environmental consultants, sustainability officers.

## Stack
- React + Vite
- Leaflet + react-leaflet (maps)
- Recharts (charts)
- Inline CSS (no Tailwind — same approach as sibling project)

## Design system
- Sidebar: #06152B
- Accent green: #18A957
- Background: #F5F7FA
- Cards: #FFFFFF
- Warning: #F5A623
- Danger: #E84C3D
- Text: #1F2937
- Font: Inter

## Layout
3-column: Sidebar (220px) | Main dashboard | AI Copilot panel (340px)

## Key files
- src/App.jsx — main app
- src/gbif.js — all GBIF API calls (copied from sibling project)
- .env — VITE_DEMO_KEY

## Running
npm run dev → localhost:5187

## Related project
C:\Users\Conicet\gbif-mcp-server — source of GBIF logic to reuse

## Core principle
NOT a chatbot. An enterprise biodiversity risk intelligence platform.
Every answer is grounded in real GBIF data.

---

# BioRisk AI — Behavioral & Analytical Rules

## Purpose

This document defines how the BioRisk AI application should behave when:

* calculating biodiversity scores
* generating ecological insights
* interpreting biodiversity occurrences
* estimating uncertainty
* producing ESG/TNFD-oriented outputs
* interacting through AI explanations

The goal is to ensure:

* scientific consistency
* explainability
* transparency
* conservative ecological reasoning
* enterprise-grade trustworthiness

This document should guide:

* LLM agents
* backend services
* scoring engines
* reporting modules
* AI copilots
* future autonomous workflows

---

# CORE PRINCIPLES

## 1. Never overstate ecological certainty

The application MUST:

* acknowledge uncertainty
* explain data limitations
* avoid deterministic conclusions
* avoid claiming absence of species
* avoid regulatory conclusions

The system should prefer:

```text
"No records were found"
```

instead of:

```text
"The species is absent"
```

---

## 2. Biodiversity occurrences are observational evidence

GBIF records represent:

* observations
* collected occurrences
* reported presences

They do NOT represent:

* complete inventories
* exhaustive biodiversity assessments
* guaranteed current distributions

The AI must always frame biodiversity data as:

```text
observational evidence
```

---

## 3. Explainability is mandatory

Every score or ecological assessment MUST be explainable.

The system must never produce opaque scores.

Each output should explain:

* why the score was generated
* which variables contributed most
* what uncertainties exist
* which datasets were used

---

## 4. Conservative ecological reasoning

The application should behave conservatively.

When uncertainty exists:

* increase caution
* avoid minimizing risk
* explicitly mention missing information

---

# RISK SCORE ENGINE

## Purpose

Transform biodiversity complexity into interpretable ESG/TNFD-oriented indicators.

The score is:

```text
an ecological sensitivity indicator
```

NOT:

* a legal determination
* a permit recommendation
* an environmental authorization
* a regulatory approval

---

# BIODIVERSITY RISK SCORE

## Range

```text
0 → 100
```

## Categories

| Range  | Category      |
| ------ | ------------- |
| 0–25   | Low Risk      |
| 26–50  | Moderate Risk |
| 51–75  | High Risk     |
| 76–100 | Critical Risk |

---

# SCORE COMPONENTS

## Recommended weights

| Variable                       | Weight |
| ------------------------------ | ------ |
| Threatened species occurrences | 40%    |
| Protected areas proximity      | 20%    |
| Species richness               | 15%    |
| Ecosystem sensitivity          | 15%    |
| Data uncertainty               | 10%    |

---

# THREATENED SPECIES CONTRIBUTION

## Logic

Threatened species should strongly increase the score.

Suggested weighting:

| IUCN Category | Impact    |
| ------------- | --------- |
| CR            | Very High |
| EN            | High      |
| VU            | Moderate  |
| NT            | Low       |

## Additional modifiers

Increase contribution if:

* records are recent
* records are spatially close
* multiple occurrences exist
* endemic species are present

---

# DISTANCE MODIFIERS

Occurrences closer to the project should increase sensitivity.

Suggested buffers:

| Distance | Modifier  |
| -------- | --------- |
| <5 km    | Very High |
| 5–10 km  | High      |
| 10–20 km | Medium    |
| >20 km   | Low       |

---

# TEMPORAL RELEVANCE

Recent observations should weigh more heavily.

Suggested weighting:

| Record Age | Weight    |
| ---------- | --------- |
| <3 years   | Very High |
| 3–10 years | Medium    |
| >10 years  | Low       |

---

# SPECIES RICHNESS

## Purpose

Estimate biodiversity complexity.

## Important

High richness does NOT automatically mean:

* high conservation value
* high impact
* high regulatory sensitivity

The AI must avoid simplistic interpretations.

---

# ECOSYSTEM SENSITIVITY

## Purpose

Estimate ecological fragility.

## Inputs

Suggested factors:

* proximity to protected areas
* endemic species density
* threatened species density
* habitat fragmentation
* ecological uniqueness

---

# DATA UNCERTAINTY ENGINE

## One of the most important modules

The system MUST evaluate:

* observational density
* temporal gaps
* coordinate uncertainty
* taxonomic uncertainty
* sampling bias
* uneven spatial coverage

---

# UNCERTAINTY RULES

## If observational density is low

The system should state:

```text
"Limited biodiversity observations are available for this region."
```

## If observations are old

```text
"Most records are historical and may not reflect current ecological conditions."
```

## If data coverage is uneven

```text
"Spatial observation coverage is uneven across the project area."
```

## Important behavioral rule

Uncertainty should NEVER decrease caution.

Instead:

* maintain conservative interpretation
* communicate limitations explicitly

---

# AI COPILOT BEHAVIOR

## Tone

The AI should behave as:

```text
professional
scientific
transparent
conservative
non-alarmist
```

The AI must avoid:

* dramatic language
* unsupported claims
* exaggerated certainty
* legal conclusions

---

# AI RESPONSE STYLE

Responses should:

* be concise first
* allow expandable details
* explain reasoning
* mention evidence
* mention uncertainty

---

# EXAMPLE RESPONSE STYLE

Good:

```text
12 threatened species occurrences were identified within a 20 km buffer around the project area. Most recent observations correspond to vulnerable bird species recorded between 2022 and 2025.
```

Bad:

```text
This project will severely damage biodiversity.
```

---

# IMPORTANT RESTRICTIONS

The AI MUST NOT:

* provide legal advice
* approve projects
* deny projects
* replace formal environmental assessments
* claim regulatory compliance
* guarantee ecological safety

---

# TNFD / ESG OUTPUT RULES

## The application supports TNFD-related workflows.

It does NOT:

* certify TNFD compliance
* perform formal audits
* replace sustainability consultants

## TNFD OUTPUT STYLE

Use language such as:

```text
"This analysis may support TNFD Locate and Assess activities."
```

Avoid:

```text
"This project is TNFD compliant."
```

---

# MAP VISUALIZATION RULES

## Maps are contextual tools

Maps should:

* support interpretation
* show observational evidence
* avoid implying exhaustive coverage

## MAP DISPLAY GUIDELINES

Use:

* clusters
* transparency
* uncertainty indicators
* legends
* scale bars

Avoid:

* visually overstating precision
* implying exact species ranges

---

# SPECIES TABLE RULES

Species tables should include:

* scientific name
* conservation status
* last observation date
* distance to project
* occurrence count

## Important

The app should prioritize:

```text
scientific names
```

Common names are optional.

---

# REPORT GENERATION RULES

Reports should:

* explain methodology
* cite datasets
* mention query dates
* describe uncertainty
* explain limitations

## Required disclaimer (include in every report)

```text
This analysis is based on publicly available biodiversity occurrence data and should be interpreted as supporting ecological evidence rather than a substitute for formal environmental assessments.
```

---

# SCIENTIFIC TRANSPARENCY

The application should always expose:

* data sources
* query dates
* methodologies
* score logic
* uncertainty indicators

---

# PREFERRED UX BEHAVIOR

The platform should feel:

* modern
* trustworthy
* explainable
* executive-friendly
* science-based

Avoid:

* overly academic interfaces
* excessive ecological jargon
* cluttered GIS workflows

---

# TARGET USERS

Primary users:

* ESG managers
* sustainability officers
* environmental consultants
* investment analysts
* compliance teams

Secondary users:

* biodiversity researchers
* NGOs
* public agencies

---

# FUTURE EXPANSION GUIDELINES

Potential future modules:

* temporal biodiversity trends
* satellite integration
* habitat fragmentation analysis
* climate exposure
* restoration prioritization
* scenario simulations

---

# FINAL DESIGN PHILOSOPHY

BioRisk AI should behave as:

```text
an explainable biodiversity intelligence assistant
```

NOT:

```text
a black-box ESG scoring engine
```

The application should prioritize:

* transparency
* explainability
* scientific caution
* practical usability
* enterprise simplicity
