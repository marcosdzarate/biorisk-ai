# BioRisk AI

**Biodiversity risk intelligence for ESG & TNFD screening across Latin America and the Caribbean.**

BioRisk AI turns open GBIF occurrence data into actionable biodiversity intelligence — in minutes, not months. Draw your project area, run a scan, and get a screening-grade risk profile backed by real species records, satellite vegetation data, and protected area analysis.

---

## Why Latin America & the Caribbean?

Latin America and the Caribbean (LAC) is the world's most biodiverse region — home to **40% of the world's known species** and more than 50% of the world's tropical forests (Mongabay, 2026). Yet biodiversity is rarely factored into investment and development decisions.

### The problem

Despite growing foreign direct investment in extractive industries, energy infrastructure and agribusiness, **biodiversity screening during project development remains largely absent** across the region due to:

- Weak or inconsistently enforced environmental regulatory frameworks
- Limited access to spatially-explicit, open biodiversity data
- Absence of standardized screening tools adapted to LAC contexts
- Growing pressure from illegal mining, logging and agricultural expansion (CEPAL, 2025)

The region faces an **annual biodiversity financing gap of USD 99 billion until 2030** (OECD, 2025), while the tropics lost a record 6.7 million hectares of primary rainforest in 2024 alone (Mongabay, 2026).

### The opportunity

International financial institutions operating in LAC — including the IDB, World Bank, CAF and commercial banks under the Equator Principles — are increasingly required to apply IFC Performance Standard 6 safeguards during project categorization. TNFD and CSRD disclosure requirements are also expanding globally, with 500+ companies and 129 financial institutions representing **$17.7 trillion in assets** already adopting TNFD (TNFD, 2025).

**BioRisk AI fills this gap** by translating GBIF occurrence data into actionable biodiversity risk intelligence — available for all 16 LAC countries, in minutes, at no cost.

---

## Target Users

1. **ESG analysts and sustainability officers** preparing TNFD or CSRD (ESRS E4) disclosures who need rapid baseline biodiversity assessments for project sites

2. **Environmental consultants** conducting due diligence and pre-feasibility studies who need to screen multiple sites before commissioning formal ESIA studies

3. **Multilateral Development Banks** (IDB, World Bank, IFC, CAF) and commercial banks under Equator Principles applying IFC Performance Standard 6 safeguard frameworks during project categorization

4. **Companies exporting to the EU** under CSRD scope (Directive 2022/2464) — non-EU companies with more than 150M EUR EU revenue in high-impact sectors (agriculture, extractives, energy)

5. **Researchers and academics** studying anthropogenic impacts on biodiversity who need a quick way to characterize ecological context for study sites

---

## Key Features

- **14-taxa GBIF scan** — real-time query of occurrence records for vertebrates, invertebrates and plants within any project polygon
- **TNFD LEAP alignment** — Locate, Evaluate, Assess and Prepare phases with real data evidence
- **CSRD ESRS E4 support** — all 14 TNFD recommended disclosures are reflected in ESRS; one analysis covers both frameworks
- **Sentinel-2 NDVI** — vegetation health, trend and 10-year scenario projections via Copernicus Data Space
- **WDPA protected areas** — real geometry with polygon intersection detection
- **Buffer zone analysis** — 5km indirect influence area with separate occurrence count
- **Biodiversity Context Matrix** — 2x2 importance/intactness positioning (adapted from GBNAT methodology)
- **Deforestation risk** — FAO Whisp API for commodity-linked deforestation risk (Agriculture & Forestry sector)
- **Forest cover loss** — Global Forest Watch API for annual deforestation trends
- **AI Copilot** — conversational biodiversity intelligence powered by Claude
- **Multi-standard alignment** — IFC PS6, Equator Principles, CSRD (ESRS E4), GRI 304, EUDR, ISSB BEES
- **Project persistence** — analyses saved per user via Auth0 + Supabase

---

## Data Sources

| Source | Description | License |
|--------|-------------|---------|
| GBIF | 2B+ occurrence records across all kingdoms | CC BY 4.0 |
| Sentinel-2 L2A | 10m satellite imagery, NDVI analysis | Free |
| WDPA | World Database of Protected Areas | Free |
| GBIF Literature Index | Scientific papers citing GBIF data | CC BY 4.0 |
| FAO Whisp | Deforestation and commodity risk | Open |
| Global Forest Watch | Annual forest cover loss | Open |
| IUCN Red List | Species conservation status | Pending |

---

## Coverage

| Country | ISO | GBIF records (approx) |
|---------|-----|----------------------|
| Brazil | BR | ~80M |
| Mexico | MX | ~25M |
| Colombia | CO | ~15M |
| Argentina | AR | ~15M |
| Chile | CL | ~8M |
| Peru | PE | ~6M |
| Ecuador | EC | ~5M |
| Costa Rica | CR | ~4M |
| Bolivia | BO | ~2M |
| Paraguay | PY | ~1M |
| Uruguay | UY | ~800K |
| Panama | PA | ~600K |
| Guatemala | GT | ~500K |
| Venezuela | VE | ~500K |
| Honduras | HN | ~300K |
| Nicaragua | NI | ~200K |

---

## Tech Stack

- **Frontend:** React + Vite + Leaflet + Recharts
- **AI:** Claude (Anthropic) via API
- **Auth:** Auth0 SPA
- **Database:** Supabase (PostgreSQL)
- **Satellite:** Sentinel Hub Statistical API (Copernicus Data Space)
- **Spatial:** Turf.js
- **Hosting:** Vercel

---

## Local Development

Clone the repository and install dependencies:

    git clone https://github.com/marcosdzarate/biorisk-ai.git
    cd biorisk-ai
    npm install
    cp .env.example .env
    npm run dev

### Required environment variables

    VITE_DEMO_KEY=              # Anthropic API key
    VITE_WDPA_TOKEN=            # Protected Planet API token
    VITE_SENTINEL_CLIENT_ID=    # Copernicus Data Space OAuth
    VITE_SENTINEL_CLIENT_SECRET=
    VITE_AUTH0_DOMAIN=          # Auth0 domain
    VITE_AUTH0_CLIENT_ID=       # Auth0 client ID
    VITE_SUPABASE_URL=          # Supabase project URL
    VITE_SUPABASE_ANON_KEY=     # Supabase anon key

---

## Methodology

BioRisk AI is a **screening-grade tool** based on observational GBIF occurrence data. It does not replace formal Environmental & Social Impact Assessments (ESIA) or field surveys.

### Risk Score

The biodiversity risk score (0-100) combines four components:

- **Baseline (30pts):** Conservative precautionary baseline
- **Species Richness (20pts):** Number of taxa detected (5pts each, max 20)
- **Occurrence Density (30pts):** Record concentration within polygon
- **Literature Gap (20pts):** Fewer papers = higher uncertainty = higher score

### Biodiversity Context Matrix

Adapted from GBNAT (Think Nature) methodology. Importance axis = GBIF occurrence density + taxa richness. Intactness axis = Sentinel-2 NDVI proxy. Thresholds at 0.5 on both axes.

### Data Quality

Follows Species Occurrence Cubes methodology for coordinate quality filtering. Occurrence records filtered for occurrenceStatus = PRESENT and coordinate issue flags (ZERO_COORDINATE, COORDINATE_OUT_OF_RANGE, COORDINATE_INVALID, COUNTRY_COORDINATE_MISMATCH).

---

## Disclaimer

Occurrence data from GBIF.org under CC BY 4.0. Results are screening-grade and should be interpreted as supporting ecological evidence, not a substitute for formal environmental assessments.

---

## References

- CEPAL (2025). Biodiversity and development: thoughts from Latin America and the Caribbean. LC/TS.2024/95.
- OECD (2025). Latin American Economic Outlook 2025.
- Mongabay (2026). Latin America in 2025: Conservation promises collide with crime and extraction.
- IDB (2021). Impact Investment for Biodiversity Conservation: Cases from Latin America and the Caribbean.
- TNFD (2025). Status Report 2025.
- Green Finance Institute (2025). TNFD and CSRD alignment.

---

## License

MIT License — see LICENSE for details.

Developed for the GBIF Ebbe Nielsen Challenge 2026.
