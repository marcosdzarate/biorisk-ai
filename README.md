# 🌿 BioRisk AI

### AI-Powered Biodiversity Risk Intelligence for ESG & TNFD

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite)
![GBIF](https://img.shields.io/badge/GBIF-Open%20Data-4CAF50?style=flat)
![AWS Athena](https://img.shields.io/badge/AWS-Athena-FF9900?style=flat&logo=amazonaws)
![GEE](https://img.shields.io/badge/Google-Earth%20Engine-4285F4?style=flat&logo=google)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

> **Empowering ESG analysts and environmental consultants with AI-driven biodiversity intelligence for TNFD, CSRD and IFC PS6 compliance — in minutes, not months.**

[Features](#-features) • [Demo](#-live-demo) • [How It Works](#-how-it-works) • [Installation](#-installation) • [Tech Stack](#️-tech-stack) • [Architecture](#-architecture)

---

## 📖 About

BioRisk AI is a site-level biodiversity risk screening platform built specifically for Latin America and the Caribbean — a region hosting 40% of the world's known species yet facing a USD 99 billion annual biodiversity finance gap. Inspired by GBIF's October 2025 post on species occurrence data and corporate sustainability frameworks, BioRisk AI bridges open biodiversity data with corporate nature disclosure obligations under TNFD, CSRD ESRS E4, IFC Performance Standard 6, and the Kunming-Montreal Global Biodiversity Framework Target 15.

**Live Demo:** https://biorisk-ai.vercel.app  
**Demo credentials:** demo@biorisk.ai / Bior!sk_GBIF_2026#

---

## 🎯 Problem Statement

Companies operating in Latin America face:

- **USD 17.7T** in assets under management adopting TNFD frameworks
- **CSRD ESRS E4** extending mandatory biodiversity disclosure to non-EU companies with >€150M EU revenue
- **IFC PS6** requirements for any project financed by multilateral development banks
- **USD 95B+** in RIGI-approved projects in Argentina alone requiring biodiversity compliance
- **No accessible tool** for rapid site-level biodiversity baseline assessment in LAC
- **Months of consultant time** to produce what BioRisk AI delivers in minutes

---

## 🚀 How It Works

### 3-Step Workflow

```
1. DRAW         →    2. SCAN              →    3. REPORT
Draw a polygon       GBIF S3 Snapshot          Risk score + TNFD
on the map           AWS Athena query           Content Index PDF
                     GEE satellite data         AI Copilot insights
                     WDPA protected areas       IFC PS6 assessment
```

### Case Study: Litio Galán, Catamarca (Argentina)

A USD 1.5B lithium project under Argentina's RIGI regime:

| Finding | Value |
|---------|-------|
| GBIF occurrence records | 912 |
| Taxonomic groups detected | 13 (Aves, Mammalia, Amphibia, Squamata, Insecta...) |
| Protected areas intersecting | 2 (Los Andes Cat IV + Laguna de los Pozuelos **Ramsar**) |
| Threatened species | *Phoenicoparrus andinus* (EN) — Andean flamingo |
| NDVI (vegetation health) | 0.093 (sparse Puna vegetation) |
| IFC PS6 classification | **Critical Habitat triggered** |
| Analysis time | < 2 minutes |

---

## 💡 Our Solution

BioRisk AI provides:

- Dynamic taxa identification per country using GBIF occurrence facets
- Site-level occurrence analysis via **partitioned AWS Athena table on GBIF S3 snapshot** (2B+ records, no rate limits, 99.6% cost reduction vs REST API)
- Satellite vegetation health (NDVI + MSAVI) via Google Earth Engine
- Interactive hexagonal NDVI grid overlay
- Land cover classification (Dynamic World), deforestation (Hansen), fire risk (MODIS), surface water (JRC), IUCN Habitat Classification v004
- Protected area intersection with real WDPA geometries
- **IFC PS6 Critical Habitat Assessment** — automatic classification (Modified/Natural/Critical) based on detected CR/EN species
- AI Copilot with Devil's Advocate reviewer, web search for real-time regulatory information, and Executive Summary generator
- TNFD Content Index in PDF export aligned with CSRD ESRS E4
- Bilingual interface (English / Spanish)

---

## ✨ Features

### 🔬 Biodiversity Intelligence
| Feature | Description |
|---------|-------------|
| 🌍 Dynamic Taxa | Country-specific taxonomic groups from GBIF occurrence facets |
| 📊 Chao1 Estimator | Species richness estimation with sampling completeness % |
| 🔴 IUCN Status | Key indicator species with Red List categories from GBIF |
| 🛡 WDPA Intersection | Real protected area geometry analysis with spatial operations |
| 📍 Occurrence Mapping | Points, Heatmap, NDVI, Protected Areas, GBIF Density, Hex NDVI |

### 🛰 Satellite & Earth Observation
| Feature | Description |
|---------|-------------|
| 🌱 NDVI + MSAVI | Vegetation health via Sentinel-2 (Google Earth Engine) |
| 🔶 Hexagonal Grid | 200-cell NDVI hex overlay computed by GEE Cloud Function |
| 🌳 Deforestation | Hansen Global Forest Change v1.11 (2001–2023) |
| 💧 Surface Water | JRC Global Surface Water dynamics |
| 🔥 Fire Risk | MODIS MOD14A1 thermal anomaly detection |
| 🗺 Land Cover | Google Dynamic World V1 + IUCN Habitat Classification v004 |

### 📋 ESG & TNFD Compliance
| Feature | Description |
|---------|-------------|
| 📑 TNFD Content Index | PDF table mapping findings to 14 TNFD disclosures |
| 🇪🇺 CSRD ESRS E4 | Dual alignment — one analysis, two frameworks |
| 🏦 IFC PS6 Critical Habitat | Automatic Modified/Natural/Critical classification |
| 💰 Financial Materiality | Permitting delay, remediation cost and license risk estimates |
| 🌿 Ecosystem Services | Valuation based on de Groot et al. (2012) |
| ⚖️ Mitigation Hierarchy | Avoid → Minimize → Restore → Offset conditioned on detected taxa |
| 📋 Project Phase | Site Selection / Pre-Feasibility / Feasibility / Due Diligence / Permitting |
| 🌐 Reporting Framework | TNFD LEAP / IFC PS6 / CSRD ESRS E4 / GBF Target 15 |

### 🤖 AI Copilot
| Feature | Description |
|---------|-------------|
| 🎯 Devil's Advocate | TNFD/IFC critical reviewer notes on demand |
| 📄 Executive Summary | TNFD-ready disclosure paragraph generator |
| 🔍 Web Search | Real-time regulatory information with cited sources |
| 💬 Contextual Chat | Responses grounded in real GBIF data from the analysis |
| 🧠 Mixed Models | Haiku for simple queries, Sonnet for regulatory/complex analysis |

### 📁 Data Management
| Feature | Description |
|---------|-------------|
| 🔑 Analysis ID | Persistent reference ID per analysis (DOI pathway) |
| 💾 Project Storage | Supabase persistence for portfolio management |
| 📤 Export | JSON, CSV, and PDF with TNFD Content Index + IFC PS6 Critical Habitat |
| 🌐 Bilingual | English / Spanish interface toggle |

---

## 🗺 GBIF Data Pipeline

```
GBIF.org
  └── S3 Occurrence Snapshot (2026-05-01)
        └── AWS S3 (sa-east-1, São Paulo) — ~180 GB Parquet
              └── AWS Athena (partitioned by countrycode)
                    └── AWS Lambda (biorisk-gbif-query)
                          └── BioRisk AI frontend
```

**Why this matters:**
- **No rate limits** — standard GBIF REST API is limited to 300 records/taxon
- **Full dataset** — all 2B+ records available, not sampled
- **Cost-efficient** — ~$0.002 per analysis vs ~$2.47 on global table (99.6% reduction)
- **16 LAC countries** pre-partitioned: AR, BR, CL, CO, PE, BO, EC, PY, UY, VE, CR, MX, GT, HN, NI, PA
- **Fallback** — automatic fallback to GBIF REST API if Athena is unavailable

---

## 🚀 Installation

### Prerequisites
- Node.js 20.x or later
- npm or yarn
- API keys (see below)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/marcosdzarate/biorisk-ai.git
cd biorisk-ai

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run the development server
npm run dev
```

Open http://localhost:5173

### Operating Instructions

1. Go to https://biorisk-ai.vercel.app
2. Log in with: **demo@biorisk.ai / Bior!sk_GBIF_2026#**
3. Click **New Analysis** in the sidebar
4. Fill in project details (name, country, sector, phase, frameworks, investment)
5. Draw a polygon on the map by clicking to place points — click the first point to close
6. Click **Run Biodiversity Scan**
7. Wait 1–3 minutes for the analysis to complete
8. Explore the 5 dashboard tabs: Overview, Biodiversity, TNFD & ESG, Vegetation & Forest, Mitigation
9. Use the **AI Copilot** panel to ask questions about the analysis
10. Click **Export Report** to download a PDF with TNFD Content Index

### Recommended Test Case: Litio Galán

- **Country:** Argentina
- **Sector:** Mining & Extractives
- **Phase:** Due Diligence / Financing
- **Frameworks:** TNFD LEAP + IFC PS6 / Equator Principles
- **Investment:** 1500000000
- **Polygon:** Draw around coordinates -25.5°, -67.5° in Catamarca province

### Environment Variables

```env
VITE_DEMO_KEY=               # Anthropic API key
VITE_AUTH0_DOMAIN=           # Auth0 domain
VITE_AUTH0_CLIENT_ID=        # Auth0 client ID
VITE_SUPABASE_URL=           # Supabase project URL
VITE_SUPABASE_ANON_KEY=      # Supabase anon key
VITE_WDPA_TOKEN=             # Protected Planet API token
VITE_SENTINEL_CLIENT_ID=     # Copernicus Sentinel-2
VITE_SENTINEL_CLIENT_SECRET= # Copernicus Sentinel-2
VITE_GFW_API_KEY=            # Global Forest Watch API
VITE_LAMBDA_GBIF_URL=        # AWS Lambda endpoint
VITE_GEE_HEX_URL=            # Google Earth Engine Cloud Function
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18 + Vite** — SPA with fast HMR
- **Leaflet** — Interactive maps with custom layers
- **Recharts** — Data visualization
- **Turf.js** — Spatial operations (point-in-polygon, buffers)
- **jsPDF** — PDF report generation
- **Auth0** — Authentication
- **performative-ui** — AI-native React component library

### Data Infrastructure
- **AWS Athena** — Partitioned queries on GBIF S3 snapshot (2B+ records)
- **AWS Lambda** — Serverless GBIF occurrence API
- **Google Earth Engine** — Satellite data processing (Cloud Function, 6 datasets in single call)
- **Supabase** — Project persistence and user data

### AI
- **Claude Sonnet (Anthropic)** — Regulatory queries with web search + contextual analysis
- **Claude Haiku (Anthropic)** — Fast responses for biodiversity data queries
- **Dynamic system prompts** — Grounded in real GBIF analysis data

### Open Data Sources
- **GBIF** — Species occurrence data, CC BY 4.0 (S3 Snapshot 2026-05-01)
- **Sentinel-2 / Copernicus** — Vegetation indices (NDVI, MSAVI)
- **WDPA / Protected Planet** — Protected area geometries
- **Global Forest Watch** — Deforestation data (Hansen v1.11)
- **Google Dynamic World** — Land cover classification
- **JRC Global Surface Water** — Water dynamics
- **MODIS MOD14A1** — Fire detection
- **IUCN Habitat Classification v004** — Ecosystem habitat types (GEE)

---

## 🏗 Architecture

```
Browser (React + Vite)
    │
    ├── GBIF REST API ──────────────── Taxa facets per country (dynamic)
    │
    ├── AWS Lambda ─────────────────── Serverless query orchestration
    │   └── Athena (GBIF S3 snapshot) ─ 2B+ occurrence records, 16 LAC countries
    │                                    Partitioned by countrycode, Parquet format
    │
    ├── GEE Cloud Function ─────────── 6 datasets in a single call:
    │                                   NDVI + MSAVI (Sentinel-2)
    │                                   Hansen deforestation
    │                                   Dynamic World land cover
    │                                   JRC surface water
    │                                   MODIS fire risk
    │                                   IUCN Habitat Classification v004
    │
    ├── WDPA API ───────────────────── Protected area geometries + Ramsar
    │
    ├── Global Forest Watch API ─────── Forest cover loss 2001–2023
    │
    └── Anthropic API ──────────────── AI Copilot
            ├── Claude Sonnet ────────── Regulatory + complex analysis
            │   └── web_search tool ──── Real-time regulatory information
            └── Claude Haiku ─────────── Simple biodiversity queries
```

---

## 🌎 Why Latin America and the Caribbean?

- **40%** of the world's known species
- **USD 99B** annual biodiversity finance gap (OECD, 2025)
- **500+** companies and **129** financial institutions adopting TNFD
- **USD 17.7T** AUM under TNFD frameworks
- Brazil already **mandates** nature-related disclosure
- CSRD ESRS E4 extends to non-EU companies with >€150M EU revenue
- **RIGI** (Argentina's Large Investment Incentive Regime) — USD 95B+ in projects requiring IFC PS6 compliance

---

## 📊 GBIF Data Usage

BioRisk AI directly implements GBIF's recommendations for improving biodiversity disclosure reporting:

1. **Traceability** — Analysis Reference IDs (format: BioRisk-{country}-{date}-{random8}) with DOI pathway via GBIF Derived Dataset API
2. **Data gap acknowledgment** — Chao1 estimator + sampling completeness % + AI reviewer notes
3. **Sector-specific context** — Mitigation conditioned on detected taxa and project phase
4. **Regulatory alignment** — TNFD Content Index + IFC PS6 Critical Habitat in every PDF export
5. **Full dataset access** — GBIF S3 Snapshot via AWS Athena, not sampled REST API

Data pipeline: GBIF S3 occurrence snapshot → AWS Athena (partitioned by country) → Lambda → BioRisk AI

**GBIF Citation:** GBIF.org (2026). GBIF Occurrence Snapshot 2026-05-01. https://registry.opendata.aws/gbif/

---

## 📁 Project Structure

```
biorisk-ai/
├── src/
│   ├── App.jsx          # Main application (~7000 lines)
│   ├── gbif.js          # GBIF API + GEE + GFW + Athena queries
│   ├── supabase.js      # Supabase client
│   └── main.jsx         # Auth0 provider wrapper
├── public/              # Static assets
├── .env                 # Environment variables (not committed)
├── vite.config.js       # Vite + API proxies
└── package.json
```

---

## 🤝 Contributing

Contributions welcome. Please open an issue or submit a pull request.

---

## 📄 License

MIT License — see LICENSE file for details.

---

## 🔗 References

- Rodrigues, A. (2025). *Species Occurrence Data and Corporate Sustainability Frameworks*. GBIF Data Blog. https://data-blog.gbif.org/post/2025-10-28-species-occurrence-data-and-corporate-sustainability-frameworks/
- de Groot et al. (2012). Global estimates of the value of ecosystems and their services. *Ecosystem Services*, 1(1), 50–61.
- TNFD (2023). Recommendations of the Taskforce on Nature-related Financial Disclosures.
- IFC (2012). Performance Standard 6: Biodiversity Conservation and Sustainable Management of Living Natural Resources.
- GBIF.org (2026). GBIF Occurrence Snapshot 2026-05-01. https://registry.opendata.aws/gbif/

---

*Powered by GBIF open data · Submitted by Marcos Daniel Zárate, CESIMAR-CONICET / ArOBIS*
