# BiodivRisk-Onto

**An OWL 2 DL ontology for semantic alignment of biodiversity risk disclosure frameworks**

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![OWL 2 DL](https://img.shields.io/badge/OWL-2%20DL-blue)](https://www.w3.org/TR/owl2-overview/)
[![Namespace](https://img.shields.io/badge/namespace-w3id.org%2FbiodivrisK--onto-green)](https://w3id.org/biodivrisK-onto)
[![Version](https://img.shields.io/badge/version-0.2.0-orange)](https://github.com/marcosdzarate/biorisk-ai/tree/main/ontology)

## Overview

BiodivRisk-Onto provides a formal OWL 2 DL representation of the semantic relations between four international biodiversity risk disclosure frameworks:

- **TNFD** — Taskforce on Nature-related Financial Disclosures
- **CSRD/ESRS E4** — European Sustainability Reporting Standard on Biodiversity and Ecosystems
- **SBTN** — Science Based Targets Network for Nature
- **GRI 101** — GRI Biodiversity Standard 2024

The ontology formalises a four-category taxonomy of inter-framework semantic relations — **equivalence**, **subsumption**, **complementarity** and **incommensurability** — populated with real-world instances from two LAC case studies:

- **UC1:** Santander Peru TNFD LEAP assessment (Global Canopy, 2025)
- **UC2:** CEBDS Brazil collective TNFD Locate phase pilot (CEBDS/EY, 2024)

**Persistent URI:** https://w3id.org/biodivrisK-onto

---

## Files

| File | Description |
|---|---|
| `biodivrisK-onto.ttl` | OWL 2 DL ontology v0.1.0 — core taxonomy and axioms (Turtle) |
| `biodivrisK-onto.owl` | OWL 2 DL ontology v0.1.0 — core taxonomy and axioms (RDF/XML) |
| `biodivrisK-onto-v02.ttl` | OWL 2 DL ontology v0.2.0 — with real-world instances (Turtle) |
| `biodivrisK-onto-v02.rdf` | OWL 2 DL ontology v0.2.0 — with real-world instances (RDF/XML) |

---

## Namespace

```
Prefix: bro: <https://w3id.org/biodivrisK-onto#>
```

---

## Ontology Statistics (v0.2.0)

| Element | Count |
|---|---|
| RDF triples | 653 |
| OWL classes | 21 |
| Object properties | 22 |
| Named individuals | 43 |
| Semantic relations | 35 |

### Semantic relations by category

| Category | Property | Pairs |
|---|---|---|
| Equivalence (𝒜≡) | `owl:equivalentClass` | 4 |
| Subsumption (𝒜⊑) | `rdfs:subClassOf` | 23 |
| Complementarity (𝒜⊕) | `bro:complements` | 2 |
| Incommensurability (𝒜⊥) | `bro:incommensurableWith` | 6 |

---

## Architecture (4 layers)

**L1 — Foundational & data layer**
Reuses ENVO (biomes), schema.org (organizations), PROV-O (assessments), GeoSPARQL (features). Includes LAC-specific data gap instances: `bro:AndeanDataGap`, `bro:CerradoDataGap`.

**L2 — Framework modules**
Named individuals for TNFD, CSRD/ESRS E4, SBTN and GRI 101, plus their key concepts as OWL classes. Real-world instances: 6 financial institutions, 6 sectors, 4 industrial classification standards, 5 biodiversity data sources.

**L3 — Semantic-relation layer**
Four-category taxonomy with OWL axioms. Every `bro:incommensurableWith` assertion carries `bro:hasBridgingCondition` and `skos:note`.

**L4 — Query & reasoning layer**
15 SPARQL competency questions validated at 100% coverage. Compatible with HermiT and ELK reasoners.

---

## Real-world instances

### Case 1 — Santander Peru (UC1)
```
bro:SantanderPeru a bro:FinancialInstitution
bro:SantanderPeruL4Assessment a bro:LEAPAssessment
bro:SantanderPeruESCCPolicy a bro:InternalPolicy
bro:AndeanDataGap a bro:GeographicSamplingBias
bro:AndeanWaterStressRisk a bro:WaterStressRisk
```

### Case 2 — CEBDS Brazil (UC2)
```
bro:BNDES, bro:Bradesco, bro:Caixa,
bro:ItauUnibanco, bro:SantanderBrasil a bro:FinancialInstitution
bro:CEBDSBrazilLocateAssessment a bro:LEAPAssessment
bro:CEBDSHeatmapResult a bro:MaterialityResult
bro:CNAEtoGICSAmbiguity a bro:SemanticAmbiguity
bro:CerradoDataGap a bro:GeographicSamplingBias
```

---

## How to use

### Load with rdflib (Python)
```python
from rdflib import Graph
g = Graph()
g.parse("biodivrisK-onto-v02.ttl", format="turtle")
print(f"Loaded {len(g)} triples")
```

### Example SPARQL query — CQ1
```sparql
PREFIX bro: <https://w3id.org/biodivrisK-onto#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>

SELECT ?tnfdConcept ?esrsConcept WHERE {
    ?tnfdConcept bro:definedBy bro:TNFD ;
                 owl:equivalentClass ?esrsConcept .
    ?esrsConcept bro:definedBy bro:ESRS_E4 .
}
```

### Example SPARQL query — CQ10
```sparql
PREFIX bro: <https://w3id.org/biodivrisK-onto#>

SELECT ?gap WHERE {
    ?gap a bro:GeographicSamplingBias ;
         bro:affectsFramework bro:TNFD .
}
```

---

## Validation

| Criterion | Result |
|---|---|
| Competency questions (15/15) | ✅ 100% coverage |
| OOPS! structural pitfalls | ✅ 0 errors, 23 warnings (justified) |
| OWL 2 DL syntax | ✅ Validated with rdflib |
| GRI-TNFD mapping coverage | 6/61 incommensurabilities formalized |

---

## Methodology

Developed following the **LOT methodology** (Poveda-Villalón et al., 2022) with 3 implementation sprints:

- **Sprint 1 (v0.1.0):** Core taxonomy, four-category semantic relation framework
- **Sprint 2 (v0.2.0):** Organizational, geographic and evaluation modules + real-world instances
- **Sprint 3:** CQ validation, OOPS! structural evaluation, quantitative benchmarking

---

## Citation

```bibtex
@misc{biodivrisKonto2026,
  author    = {Zárate, Marcos Daniel and Nuñez, Gustavo},
  title     = {{BiodivRisk-Onto}: An OWL 2 Ontology for Semantic Alignment
               of Biodiversity Risk Disclosure Frameworks (v0.2.0)},
  year      = {2026},
  publisher = {GitHub},
  url       = {https://github.com/marcosdzarate/biorisk-ai/tree/main/ontology}
}
```

---

## License

[Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)

© 2026 Marcos Daniel Zárate & Gustavo Nuñez — CESIMAR-CONICET, Puerto Madryn, Argentina
