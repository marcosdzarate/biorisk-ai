<p align="center">
  <img src="public/logo.png" alt="BioRisk AI Logo" width="140" />
</p>

<p align="center">
  Biodiversity risk screening for ESG, TNFD, and IFC PS6 workflows in Latin America and the Caribbean
</p>

<p align="center">
  <a href="https://doi.org/10.5281/zenodo.21114967"><img src="https://zenodo.org/badge/DOI/10.5281/zenodo.21114967.svg" alt="DOI"></a>
  <a href="https://biorisk-ai.vercel.app"><img src="https://img.shields.io/badge/Live%20Demo-biorisk--ai.vercel.app-7c3aed?style=flat-square" alt="Live Demo"></a>
  <a href="https://registry.opendata.aws/gbif/"><img src="https://img.shields.io/badge/Data-GBIF%20S3%20Snapshot-18A957?style=flat-square" alt="GBIF"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License: MIT"></a>
</p>

BioRisk AI is an open-source platform that integrates GBIF occurrence data, protected area boundaries (WDPA), and satellite-derived environmental indicators (Google Earth Engine) into a single polygon-based screening workflow. It is designed to support biodiversity risk assessment for ESG analysts, environmental consultants, and financial institutions applying disclosure frameworks such as TNFD, CSRD/ESRS E4, and IFC Performance Standard 6 in the LAC region.

BioRisk AI was developed as an entry to the 2026 GBIF Ebbe Nielsen Challenge. It is a screening-grade tool intended to support — not replace — formal environmental impact assessments; see [Current Limitations](#current-limitations) below.

---

## Quick Start

No installation required — access the live platform at
**https://biorisk-ai.vercel.app**

Demo credentials: `demo@biorisk.ai` / `Bior!sk_GBIF_2026#`

---

## Regulatory context

Biodiversity-related financial disclosure is an active area of regulatory development in Latin America and the Caribbean:

- The region holds an estimated 40% of the world's known species
- The Inter-American Development Bank estimates a USD 600–800B annual biodiversity finance gap in the region (IDB, COP16 2024)
- TNFD adoption reported 500+ corporate and 129 financial institution adopters representing USD 17.7T in AUM as of 2026
- Brazil has introduced mandatory nature-related disclosure requirements
- EU CSRD/ESRS E4 applies extraterritorially to non-EU companies with >€150M in EU-derived revenue
- Argentina's RIGI (Régimen de Incentivo para Grandes Inversiones) covers USD 95B+ in projects subject to IFC PS6 compliance requirements

---

## Case study: Lithium Triangle, Jujuy, Argentina

The [Lithium Triangle](https://en.wikipedia.org/wiki/Lithium_Triangle) — spanning Argentina, Bolivia, and Chile — holds an estimated 49.6% of global lithium resources (OECD/USGS, 2025). BioRisk AI was validated on a lithium project area in the Puna region of Jujuy, Argentina:

| Parameter | Value |
|---|---|
| Location | High-altitude Andean salt flats, Jujuy Province |
| Sector | Lithium mining / RIGI regime |
| GBIF records | ~70,000 georeferenced occurrences across 11 taxonomic classes |
| Threatened species detected | *Phoenicoparrus andinus* (VU), *Phoenicoparrus jamesi* (NT) |
| Protected areas | WDPA intersections including Ramsar wetlands |
| IFC PS6 trigger | Critical Habitat — vulnerable species present |
| NDVI | ~0.096 (consistent with high-altitude salt flat ecosystem) |
| Analysis time | ~90 seconds |

---

## Key features

- **Draw & analyze** — polygon-based project area definition on an interactive map
- **GBIF S3 Snapshot** — 180M+ georeferenced occurrence records across 16 LAC countries via AWS Athena
- **Multi-source enrichment** — 7 Google Earth Engine datasets retrieved in a single Cloud Function call
- **IUCN Red List** — asynchronous species threat status enrichment from the GBIF REST API
- **KBA detection** — Key Biodiversity Area intersection via Google Earth Engine
- **TNFD LEAP assessment** — structured regulatory checklist
- **IFC PS6 Critical Habitat** — automated trigger evaluation
- **AI Copilot** — context-aware regulatory assistant powered by Claude (Anthropic)
- **Chao1 completeness** — sampling completeness estimation and data gap acknowledgment
- **PDF export** — TNFD Content Index and IFC PS6 assessment report
- **Project persistence** — Supabase-backed project storage

---

## Tech stack

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat&logo=vite)
![GBIF](https://img.shields.io/badge/GBIF-Open%20Data-4CAF50?style=flat)
![AWS Athena](https://img.shields.io/badge/AWS-Athena-FF9900?style=flat&logo=amazonaws)
![GEE](https://img.shields.io/badge/Google-Earth%20Engine-4285F4?style=flat&logo=google)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

### Frontend
- **React 19 + Vite** — UI framework
- **React Leaflet + Leaflet** — interactive maps with canvas rendering
- **Three.js** — 3D globe on the login screen
- **Recharts** — data visualization
- **Turf.js** — spatial operations (point-in-polygon, buffers)
- **jsPDF** — PDF report generation
- **Auth0** — authentication
- **performative-ui** — AI-native React component library

### Data infrastructure
- **AWS Athena** — partitioned queries on the GBIF S3 snapshot (180M+ records)
- **AWS Lambda** — serverless GBIF occurrence API with gzip compression
- **Google Earth Engine** — satellite data processing (Cloud Function, 7 datasets in a single call)
- **Supabase** — project persistence and user data

### AI
- **Claude Sonnet 4 (Anthropic)** — regulatory queries with web search, executive summaries, devil's advocate review
- **Dynamic system prompts** — grounded in the analysis data of the active project

### Open data sources
- **GBIF** — species occurrence data, CC BY 4.0 (S3 Snapshot 2026-05-01)
- **WDPA / Protected Planet** — protected area geometries
- **Google Dynamic World** — land cover classification
- **JRC Global Surface Water** — water dynamics
- **MODIS MOD14A1** — fire detection
- **IUCN Habitat Classification v004** — ecosystem habitat types (GEE)
- **Hansen Global Forest Change v1.11** — deforestation data
- **WDKBA / KBA Partnership** — Key Biodiversity Areas (GEE, access approved June 2026)
- **World Bank WDI** — national biodiversity indicators (8 indicators)

---

## Architecture

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

### Spatial filtering architecture

BioRisk AI uses a two-stage spatial filtering approach:

1. **Athena bbox query** — retrieves all records within the bounding box of the drawn polygon. Fast and scalable, but includes records outside the polygon boundary.
2. **Turf.js point-in-polygon filter** — precise spatial filter applied in the browser, retaining only records that fall within the exact polygon geometry.

The number of records shown in the Analysis Complete screen reflects the true count within the polygon, which will always be ≤ the total retrieved by Athena.

### Large polygon handling

For polygons exceeding **20,000 km²**, BioRisk AI automatically reduces the bounding box to a ~330 km × 330 km area centered on the polygon centroid. This prevents Athena query timeouts while maintaining analytical relevance for large concession areas. Users are warned before the scan proceeds.

Taxa present in the bounding box are queried first via a lightweight `DISTINCT class` query, ensuring only taxonomic groups actually present in the area are analyzed rather than all taxa in the country database.

---

## GBIF data usage

BioRisk AI implements GBIF's recommendations for improving biodiversity disclosure reporting:

1. **Traceability** — Analysis Reference IDs (format: `BioRisk-{country}-{date}-{random8}`) providing traceability over the GBIF data used in each analysis
2. **Data gap acknowledgment** — Chao1 estimator, sampling completeness percentage, and AI reviewer notes
3. **Sector-specific context** — mitigation guidance conditioned on detected taxa and project phase
4. **Regulatory alignment** — TNFD Content Index and IFC PS6 Critical Habitat assessment included in every PDF export
5. **Full dataset access** — GBIF S3 Snapshot via AWS Athena, not the sampled REST API

Data pipeline: GBIF S3 occurrence snapshot → AWS Athena (partitioned by country) → Lambda → BioRisk AI

**GBIF citation:** GBIF.org (2026). GBIF Occurrence Snapshot 2026-05-01. https://registry.opendata.aws/gbif/

### Country record counts (from Athena snapshot, 2026-05-01)

```javascript
CO: 33540230, CR: 25283188, MX: 25135537, BR: 23863903, CL: 20198612,
AR: 15354102, EC: 11700746, PE: 8775278, PA: 8397537, GT: 4667097,
VE: 4171936, HN: 3367240, UY: 1874604, NI: 1710881, BO: 1528100, PY: 1158107
```

---

## Project structure

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

## Contributing

Contributions are welcome. Please open an issue or submit a pull request.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Current limitations

BioRisk AI is a screening-grade tool. The following limitations should be considered when interpreting results.

**Data coverage:**
- GBIF occurrence data reflects sampling effort, not true species distribution — areas with less survey history will appear data-poor even where they are ecologically rich
- The GBIF S3 Snapshot is dated 2026-05-01 and is not updated in real time
- Coverage is limited to 16 LAC countries; expansion is planned
- KBA (Key Biodiversity Areas) access was approved via Google Earth Engine (`projects/ee-kbas-in-gee/assets/current`). Intersection detection is implemented in the GEE Cloud Function; full polygon overlay is pending asset path verification.
- IUCN Red List status is retrieved asynchronously from the GBIF REST API (`iucnRedListCategory` field), enriching detected species with CR/EN/VU classifications linked to GBIF species pages. Direct IUCN Red List API integration is pending.

**Methodological:**
- The risk score is a composite index designed for rapid screening; it has not been statistically validated against formal field assessments
- The Chao1 species richness estimator assumes random sampling, while GBIF data carries known observer bias toward accessible areas and charismatic taxa
- No habitat connectivity or landscape-level fragmentation analysis is included
- No temporal trend analysis beyond deforestation (Hansen) and NDVI

**Technical:**
- The GEE Cloud Function may take 2–4 minutes for large polygons (>20,000 km²)
- AWS Athena queries may time out under high load; an automatic fallback to the GBIF REST API activates in this case, limited to 300 records per taxon
- The interface is not optimized for mobile devices

---

## About the developer

BioRisk AI was designed and built by **Marcos Zárate**, researcher at CESIMAR-CONICET and administrator of ArOBIS (Argentine node of the Ocean Biodiversity Information System), based in Puerto Madryn, Patagonia, Argentina.

The platform was developed with no dedicated funding, relying on open data and free-tier cloud infrastructure.
