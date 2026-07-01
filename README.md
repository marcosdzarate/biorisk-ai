<p align="center">
  <img src="public/logo.png" alt="BioRisk AI Logo" width="140" />
</p>

**Biodiversity Risk Intelligence for ESG & TNFD Compliance in Latin America and the Caribbean**
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.21114967.svg)](https://doi.org/10.5281/zenodo.21114967)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-biorisk--ai.vercel.app-7c3aed?style=flat-square)](https://biorisk-ai.vercel.app)
[![GBIF](https://img.shields.io/badge/Powered%20by-GBIF%20S3%20Snapshot-18A957?style=flat-square)](https://registry.opendata.aws/gbif/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

BioRisk AI transforms open GBIF occurrence data into actionable, screening-grade biodiversity risk intelligence for ESG analysts, environmental consultants, and project finance teams — in minutes rather than months.

---

## 🚀 Quick Start

**No installation required.** Access the live platform at:

👉 **https://biorisk-ai.vercel.app**

Demo credentials: `demo@biorisk.ai` / `Bior!sk_GBIF_2026#`

---

## 🌎 Why Latin America and the Caribbean?

- **40%** of the world's known species
- **USD 600-800B** annual biodiversity finance gap (IDB, COP16 2024)
- **500+** companies and **129** financial institutions adopting TNFD
- **USD 17.7T** AUM under TNFD frameworks
- Brazil already **mandates** nature-related disclosure
- CSRD ESRS E4 extends to non-EU companies with >€150M EU revenue
- **RIGI** (Argentina's Large Investment Incentive Regime) — USD 95B+ in projects requiring IFC PS6 compliance

---

## 🔬 Case Study: Lithium Triangle, Jujuy, Argentina

The [Lithium Triangle](https://en.wikipedia.org/wiki/Lithium_Triangle) — spanning Argentina, Bolivia, and Chile — holds 49.6% of global lithium resources (OECD/USGS, 2025). BioRisk AI was tested on a lithium project area in the Puna region of Jujuy, Argentina:

- **Location:** High-altitude Andean salt flats, Jujuy Province
- **Sector:** Lithium Mining / RIGI regime
- **GBIF records:** ~70,000 georeferenced occurrences across 11 taxonomic classes
- **Threatened species detected:** Phoenicoparrus andinus (VU), Phoenicoparrus jamesi (NT)
- **Protected areas:** WDPA intersections including Ramsar wetlands
- **IFC PS6 trigger:** Critical Habitat — Vulnerable species present
- **NDVI:** ~0.096 (consistent with high-altitude salt flat ecosystem)
- **Analysis time:** ~90 seconds

---

## ✨ Key Features

- **Draw & analyze** — polygon-based project area definition on interactive map
- **GBIF S3 Snapshot** — 180M+ georeferenced occurrence records across 16 LAC countries via AWS Athena
- **Multi-source enrichment** — 7 GEE datasets in a single Cloud Function call
- **IUCN Red List** — asynchronous species threat status enrichment from GBIF REST API
- **KBA detection** — Key Biodiversity Areas via Google Earth Engine
- **TNFD LEAP assessment** — structured regulatory checklist
- **IFC PS6 Critical Habitat** — automated trigger evaluation
- **AI Copilot** — context-aware regulatory assistant powered by Claude (Anthropic)
- **Chao1 completeness** — sampling completeness estimation and data gap acknowledgment
- **PDF export** — TNFD Content Index + IFC PS6 assessment
- **Project persistence** — Supabase-backed project storage

---

## 🛠 Tech Stack

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat&logo=vite)
![GBIF](https://img.shields.io/badge/GBIF-Open%20Data-4CAF50?style=flat)
![AWS Athena](https://img.shields.io/badge/AWS-Athena-FF9900?style=flat&logo=amazonaws)
![GEE](https://img.shields.io/badge/Google-Earth%20Engine-4285F4?style=flat&logo=google)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

### Frontend
- **React 19 + Vite** — UI framework
- **React Leaflet + Leaflet** — Interactive maps with canvas rendering
- **Three.js** — 3D globe on login screen
- **Recharts** — Data visualization
- **Turf.js** — Spatial operations (point-in-polygon, buffers)
- **jsPDF** — PDF report generation
- **Auth0** — Authentication
- **performative-ui** — AI-native React component library

### Data Infrastructure
- **AWS Athena** — Partitioned queries on GBIF S3 snapshot (180M+ records)
- **AWS Lambda** — Serverless GBIF occurrence API with gzip compression
- **Google Earth Engine** — Satellite data processing (Cloud Function, 7 datasets in single call)
- **Supabase** — Project persistence and user data

### AI
- **Claude Sonnet 4 (Anthropic)** — Regulatory queries with web search, Executive Summaries, Devil's Advocate review
- **Dynamic system prompts** — Grounded in real GBIF analysis data

### Open Data Sources
- **GBIF** — Species occurrence data, CC BY 4.0 (S3 Snapshot 2026-05-01)
- **WDPA / Protected Planet** — Protected area geometries
- **Google Dynamic World** — Land cover classification
- **JRC Global Surface Water** — Water dynamics
- **MODIS MOD14A1** — Fire detection
- **IUCN Habitat Classification v004** — Ecosystem habitat types (GEE)
- **Hansen Global Forest Change v1.11** — Deforestation data
- **WDKBA / KBA Partnership** — Key Biodiversity Areas (GEE, access approved June 2026)
- **World Bank WDI** — National biodiversity indicators (8 indicators)

---

## 🗺 Architecture

```
Browser (React + Vite)
    │
    ├── GBIF REST API ──────────────── Taxa facets + IUCN Red List status (async)
    │
    ├── AWS Lambda ─────────────────── Serverless query orchestration
    │   └── Athena (GBIF S3 snapshot) ─ 180M+ occurrence records, 16 LAC countries
    │                                    Partitioned by countrycode, Parquet format
    │
    ├── GEE Cloud Function ─────────── 7 datasets in a single call:
    │                                   NDVI + MSAVI (Sentinel-2)
    │                                   Hansen deforestation
    │                                   Dynamic World land cover
    │                                   JRC surface water
    │                                   MODIS fire risk
    │                                   IUCN Habitat Classification v004
    │                                   KBA intersection (WDKBA)
    │
    ├── WDPA API ───────────────────── Protected area geometries + Ramsar
    │
    └── Anthropic API ──────────────── AI Copilot
            └── Claude Sonnet 4 ────── Regulatory + complex analysis
                └── web_search tool ── Real-time regulatory information
```

### Spatial Filtering Architecture

BioRisk AI uses a two-stage spatial filtering approach:

1. **Athena bbox query** — retrieves all records within the bounding box of the drawn polygon. Fast and scalable, but includes records outside the polygon boundary.
2. **Turf.js point-in-polygon filter** — precise spatial filter applied in the browser, retaining only records that fall within the exact polygon geometry.

This means the number of records shown in the Analysis Complete screen reflects the true count within the polygon, which will always be ≤ the total retrieved by Athena.

### Large Polygon Handling

For polygons exceeding **20,000 km²**, BioRisk AI automatically reduces the bounding box to a ~330km × 330km area centered on the polygon centroid. This prevents Athena query timeouts while maintaining analytical relevance for large concession areas. Users are warned before the scan proceeds.

The taxa detected in the bbox are queried first via a lightweight `DISTINCT class` query, ensuring only taxonomic groups actually present in the area are analyzed — rather than all taxa in the country database.

---

## 📊 GBIF Data Usage

BioRisk AI directly implements GBIF's recommendations for improving biodiversity disclosure reporting:

1. **Traceability** — Analysis Reference IDs (format: BioRisk-{country}-{date}-{random8}) providing traceability over the GBIF data used in each analysis
2. **Data gap acknowledgment** — Chao1 estimator + sampling completeness % + AI reviewer notes
3. **Sector-specific context** — Mitigation conditioned on detected taxa and project phase
4. **Regulatory alignment** — TNFD Content Index + IFC PS6 Critical Habitat in every PDF export
5. **Full dataset access** — GBIF S3 Snapshot via AWS Athena, not sampled REST API

Data pipeline: GBIF S3 occurrence snapshot → AWS Athena (partitioned by country) → Lambda → BioRisk AI

**GBIF Citation:** GBIF.org (2026). GBIF Occurrence Snapshot 2026-05-01. https://registry.opendata.aws/gbif/

### COUNTRY_RECORD_COUNTS (Real from Athena snapshot 2026-05-01)

```javascript
CO: 33540230, CR: 25283188, MX: 25135537, BR: 23863903, CL: 20198612,
AR: 15354102, EC: 11700746, PE: 8775278, PA: 8397537, GT: 4667097,
VE: 4171936, HN: 3367240, UY: 1874604, NI: 1710881, BO: 1528100, PY: 1158107
```

---

## 📁 Project Structure

```
biorisk-ai/
├── src/
│   ├── App.jsx          # Main application
│   ├── gbif.js          # GBIF API + GEE + Athena queries
│   ├── supabase.js      # Supabase client
│   └── main.jsx         # Auth0 provider wrapper
├── api/
│   └── chat.js          # Vercel serverless proxy for Anthropic API
├── public/              # Static assets (logo, favicon)
├── vite.config.js       # Vite configuration
└── package.json
```

---

## 🤝 Contributing

Contributions welcome. Please open an issue or submit a pull request.

---

## 📄 License

MIT License — see LICENSE file for details.

---

## ⚠️ Current Limitations

BioRisk AI is a screening-grade tool. The following limitations should be considered when interpreting results:

**Data coverage:**
- GBIF occurrence data reflects sampling effort, not true species distribution — areas with fewer naturalists or expeditions will appear data-poor even if ecologically rich
- GBIF S3 Snapshot is dated 2026-05-01 and is not updated in real time
- Coverage limited to 16 LAC countries — expansion planned
- KBA (Key Biodiversity Areas) — access approved via Google Earth Engine (projects/ee-kbas-in-gee/assets/current). KBA intersection detection implemented in GEE Cloud Function; full polygon overlay pending asset path verification.
- IUCN Red List status is retrieved asynchronously from the GBIF REST API (iucnRedListCategory field), enriching detected species with CR/EN/VU classifications linked to GBIF species pages. Direct IUCN Red List API integration pending.

**Methodological:**
- Risk score is a composite index designed for rapid screening — it has not been statistically validated against formal field assessments
- Chao1 species richness estimator assumes random sampling; GBIF data contains known observer bias toward accessible areas and charismatic taxa
- No habitat connectivity or landscape-level fragmentation analysis
- No temporal trend analysis beyond deforestation (Hansen) and NDVI

**Technical:**
- GEE Cloud Function may take 2–4 minutes for large polygons (>20,000 km²)
- AWS Athena queries may timeout under high load — automatic fallback to GBIF REST API activates in this case (limited to 300 records/taxon)
- Not optimized for mobile devices

---

## 👨‍🔬 About the Developer

BioRisk AI was designed and built by **Marcos Zárate**, researcher at CESIMAR-CONICET and administrator of ArOBIS (Argentine node of the Ocean Biodiversity Information System), based in Puerto Madryn, Patagonia, Argentina.

This platform was developed with no dedicated funding — relying entirely on open data, free-tier cloud infrastructure, and the conviction that rigorous biodiversity science should be accessible to those who need it most.

Argentine science operates under severe budget constraints. BioRisk AI is proof that scientific creativity and technical excellence are not determined by the size of a budget — and that researchers at the frontier of biodiversity informatics exist far beyond the traditional centers of global science.
