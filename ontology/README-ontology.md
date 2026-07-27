# BiodivRisk-Onto

**An OWL 2 DL ontology for semantic alignment of biodiversity risk disclosure frameworks**

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![OWL 2 DL](https://img.shields.io/badge/OWL-2%20DL-blue)](https://www.w3.org/TR/owl2-overview/)
[![Namespace](https://img.shields.io/badge/namespace-w3id.org%2FbiodivrisK--onto-green)](https://w3id.org/biodivrisK-onto)
[![Version](https://img.shields.io/badge/version-0.2.0-orange)](https://github.com/marcosdzarate/biorisk-ai/tree/main/ontology)
[![Documentation](https://img.shields.io/badge/docs-WIDOCO-blue)](https://marcosdzarate.github.io/biorisk-ai/)

## Overview

BiodivRisk-Onto provides a formal OWL 2 DL representation of the semantic relations between four international biodiversity risk disclosure frameworks:

- **TNFD** — Taskforce on Nature-related Financial Disclosures
- **CSRD/ESRS E4** — European Sustainability Reporting Standard on Biodiversity and Ecosystems
- **SBTN** — Science Based Targets Network for Nature
- **GRI 101** — GRI Biodiversity Standard 2024

The ontology formalises a four-category taxonomy of inter-framework semantic relations:

| Category | OWL construct | Description |
|---|---|---|
| Equivalence (𝒜≡) | `owl:equivalentClass` | Concepts with the same extension |
| Subsumption (𝒜⊑) | `rdfs:subClassOf` | One concept is more specific than another |
| Complementarity (𝒜⊕) | `bro:complements` | Concepts from different frameworks that together provide a more complete picture |
| Incommensurability (𝒜⊥) | `bro:incommensurableWith` | Concepts that cannot be compared without material information loss |

The ontology is grounded in two published real-world assessments from LAC:

- **UC1:** Santander Peru TNFD LEAP pilot (Global Canopy & Santander Peru, 2025)
- **UC2:** CEBDS Brazil collective TNFD LEAP assessment (CEBDS/EY, 2024)

**Persistent URI:** https://w3id.org/biodivrisK-onto  
**Documentation:** https://marcosdzarate.github.io/biorisk-ai/  
**Repository:** https://github.com/marcosdzarate/biorisk-ai/tree/main/ontology

---

## Files

| File | Description |
|---|---|
| `biodivrisK-onto.ttl` | OWL 2 DL ontology v0.1.0 — core taxonomy and semantic relation axioms (Turtle) |
| `biodivrisK-onto.owl` | OWL 2 DL ontology v0.1.0 — core taxonomy (OWL/XML) |
| `biodivrisK-onto-v02.ttl` | OWL 2 DL ontology v0.2.0 — with real-world instances from LAC case studies (Turtle) |
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
| RDF triples | 659 |
| OWL classes | 21 |
| Object properties | 22 |
| Named individuals | 56 |
| Semantic relations | 35 |

### Semantic relations by category

| Category | Property | Pairs |
|---|---|---|
| Equivalence (𝒜≡) | `owl:equivalentClass` | 3 |
| Close match | `skos:closeMatch` | 1 |
| Subsumption (𝒜⊑) | `rdfs:subClassOf` | 23 |
| Complementarity (𝒜⊕) | `bro:complements` | 2 |
| Incommensurability (𝒜⊥) | `bro:incommensurableWith` | 6 |

---

## Architecture (4 layers)

**L1 — Foundational & data layer**  
Reuses ENVO (biomes), schema.org (organisations), PROV-O (assessments), GeoSPARQL (features). Includes LAC-specific data gap instances: `bro:AndeanDataGap`, `bro:CerradoDataGap`.

**L2 — Framework module layer**  
Named individuals for TNFD, CSRD/ESRS E4, SBTN and GRI 101, plus their key concepts as OWL classes. Real-world instances: 6 financial institutions, 6 economic sectors, 4 industrial classification standards, 5 biodiversity data sources.

**L3 — Semantic relation layer**  
Four-category taxonomy with OWL axioms. Every `bro:incommensurableWith` assertion carries `bro:hasBridgingCondition` and `skos:note` documenting what information is lost in any lossy conversion.

**L4 — Query & reasoning layer**  
15 SPARQL competency questions validated at 100% coverage. Consistent under Pellet (OWL 2 DL reasoner): 0 errors, 0 unsatisfiable classes.

---

## Design notes

### OWL 2 Punning
Six resources are declared as both `owl:Class` (for subsumption reasoning) and `owl:NamedIndividual` (as relata of `bro:incommensurableWith` and `bro:complements`). OWL 2 DL explicitly permits this under the metamodeling facility (§5.8.3). Affected resources: `bro:ESRSDoubleMateriality`, `bro:GRIManagementApproach`, `bro:SBTNAR3TTarget`, `bro:SBTNMeanSpeciesAbundance`, `bro:TNFDEnterpriseMateriality`, `bro:TNFDImpactDependency`.

### skos:closeMatch vs owl:equivalentClass
`bro:TNFDImpactDependency skos:closeMatch bro:ESRSMaterialImpactDependency` — close match (not equivalence) because the materiality boundaries differ: TNFD applies enterprise-value materiality; ESRS E4 applies double materiality. `owl:equivalentClass` would incorrectly collapse this distinction.

---

## Real-world instances (selected)

### Case 1 — Santander Peru (UC1)
```turtle
bro:SantanderPeru a bro:FinancialInstitution
bro:SantanderPeruL4Assessment a bro:LEAPAssessment
bro:SantanderPeruESCCPolicy a bro:InternalPolicy
bro:AndeanDataGap a bro:GeographicSamplingBias
bro:AndeanWaterStressRisk a bro:WaterStressRisk
```

### Case 2 — CEBDS Brazil (UC2)
```turtle
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
g.parse("biodivrisK-onto.ttl", format="turtle")
g.parse("biodivrisK-onto-v02.ttl", format="turtle")
print(f"Loaded {len(g)} triples")
```

### Example SPARQL — CQ1: Equivalences between TNFD and ESRS E4
```sparql
PREFIX bro: <https://w3id.org/biodivrisK-onto#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>

SELECT ?tnfdConcept ?esrsConcept WHERE {
    ?tnfdConcept bro:definedBy bro:TNFD ;
                 owl:equivalentClass ?esrsConcept .
    ?esrsConcept bro:definedBy bro:ESRS_E4 .
}
```

### Example SPARQL — CQ7: Classification incommensurabilities
```sparql
PREFIX bro: <https://w3id.org/biodivrisK-onto#>

SELECT ?c1 ?c2 ?ambiguity WHERE {
    ?c1 a bro:IndustrialClassification ;
        bro:incommensurableWith ?c2 ;
        bro:hasAmbiguity ?ambiguity .
}
```

### Example SPARQL — CQ10: Data gaps in LAC biomes
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
| Logical consistency (Pellet) | ✅ Consistent |
| Unsatisfiable classes | ✅ 0 / 21 classes |
| Competency questions (15/15) | ✅ 100% coverage |
| OOPS! structural pitfalls | ✅ 0 errors, 23 warnings (justified) |
| External consistency (EFRAG-TNFD) | ✅ 7/7 relations consistent |

---

## Methodology

Developed following **LOT** (Linked Open Terms, Poveda-Villalón et al., 2022) in three implementation sprints:

- **Sprint 1 (v0.1.0):** Core taxonomy, four-category semantic relation framework, 15 competency questions
- **Sprint 2 (v0.2.0):** Organizational, geographic and evaluation modules + real-world instances from UC1 and UC2
- **Sprint 3:** CQ validation (Pellet), OOPS! structural evaluation, quantitative benchmarking vs GRI-TNFD and EFRAG-TNFD mappings

---

## Citation

If you use BiodivRisk-Onto in your research, please cite:

```bibtex
@misc{biodivrisKonto2026,
  author    = {Zárate, Marcos Daniel and Nuñez, Gustavo},
  title     = {{BiodivRisk-Onto}: An OWL 2 Ontology for Semantic Alignment
               of Biodiversity Risk Disclosure Frameworks (v0.2.0)},
  year      = {2026},
  publisher = {GitHub},
  url       = {https://github.com/marcosdzarate/biorisk-ai/tree/main/ontology},
  note      = {Persistent URI: https://w3id.org/biodivrisK-onto}
}
```

---

## License

[Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)

© 2026 Marcos Daniel Zárate & Gustavo Nuñez — CESIMAR-CONICET, Puerto Madryn, Argentina  
Contact: zarate@cenpat-conicet.gob.ar
