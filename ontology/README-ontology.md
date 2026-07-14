# BiodivRisk-Onto v0.1.0

**An OWL 2 ontology for semantic alignment of biodiversity risk disclosure frameworks**

[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
[![OWL 2](https://img.shields.io/badge/OWL-2-blue)](https://www.w3.org/TR/owl2-overview/)
[![Namespace](https://img.shields.io/badge/namespace-w3id.org%2FbiodivrisK--onto-green)](https://w3id.org/biodivrisK-onto)

## Overview

BiodivRisk-Onto provides a formal OWL 2 representation of the semantic relations between four international biodiversity risk disclosure frameworks:

- **TNFD** — Taskforce on Nature-related Financial Disclosures
- **CSRD/ESRS E4** — European Sustainability Reporting Standard on Biodiversity and Ecosystems
- **SBTN** — Science Based Targets Network for Nature
- **GRI 101** — GRI Biodiversity Standard 2024

The ontology formalises a four-category taxonomy of inter-framework semantic relations — **equivalence**, **subsumption**, **complementarity** and **incommensurability** — with particular attention to the data gaps arising from GBIF/OBIS sampling bias in Latin America and the Caribbean (LAC).

This is a **prototype version (v0.1.0)** developed as part of the paper:

> Zárate, M. D. (2026). *Semantic Alignment of Biodiversity Risk Disclosure Frameworks: An Ontological Analysis for Latin America and the Caribbean*. Submitted to AMW 2026 — 17th Alberto Mendelzon International Workshop on Foundations of Data Management, Arequipa, Peru.

---

## Files

| File | Description |
|---|---|
| `biodivrisK-onto.ttl` | OWL 2 ontology in Turtle format |

---

## Namespace

```
Prefix: bro: <https://w3id.org/biodivrisK-onto#>
```

---

## Ontology structure

The ontology follows a four-layer architecture:

### L1 — Foundational & data layer
Classes representing LAC-specific data gaps from GBIF/OBIS sampling bias:
- `bro:DataGap`
- `bro:GeographicSamplingBias`
- `bro:TaxonomicSamplingBias`
- `bro:LACGeographicBias` (named individual)

### L2 — Framework modules
Named individuals for each framework and their key concepts:

| Framework | Key concepts |
|---|---|
| `bro:TNFD` | `TNFDPriorityLocation`, `TNFDImpactDependency`, `TNFDLandUseChangeMetric`, `TNFDEnterpriseMateriality` |
| `bro:ESRS_E4` | `ESRSBiodiversitySensitiveArea`, `ESRSMaterialImpactDependency`, `ESRSLandUseDatapoint`, `ESRSDoubleMateriality` |
| `bro:SBTN` | `SBTNAR3TTarget`, `SBTNMeanSpeciesAbundance` |
| `bro:GRI101` | `GRIOperationsAdjacentProtectedAreas`, `GRIManagementApproach`, `GRIImpactMateriality` |

### L3 — Semantic-relation layer
Object properties implementing the four-category taxonomy:

| Property | Type | Relation category |
|---|---|---|
| `owl:equivalentClass` / `owl:sameAs` | OWL built-in | Equivalence (𝒜≡) |
| `rdfs:subClassOf` | OWL built-in | Subsumption (𝒜⊑) |
| `bro:complements` | Symmetric | Complementarity (𝒜⊕) |
| `bro:incommensurableWith` | Symmetric | Incommensurability (𝒜⊥) |

Every `bro:incommensurableWith` assertion carries a `bro:hasBridgingCondition` annotation documenting the explicit assumption under which a lossy approximation is admissible.

### L4 — Query & reasoning layer
Planned for v0.2.0: SPARQL competency questions and RAG interface (not included in this prototype).

---

## Key findings encoded in this prototype

### Equivalences (rare — only 2 found)
- `TNFDImpactDependency` ≡ `ESRSMaterialImpactDependency` (impact side only)
- `TNFDLandUseChangeMetric` ≡ `ESRSLandUseDatapoint` (same physical quantity in hectares)

### Subsumptions
- `ESRSBiodiversitySensitiveArea` ⊑ `TNFDPriorityLocation` (TNFD is broader)
- `GRIOperationsAdjacentProtectedAreas` ⊑ `TNFDPriorityLocation` (TNFD is broader)

### Incommensurabilities (the critical finding)
- `ESRSDoubleMateriality` ⊥ `TNFDEnterpriseMateriality` (different materiality boundaries)
- `SBTNMeanSpeciesAbundance` ⊥ `GRIManagementApproach` (quantitative vs qualitative)
- `SBTNAR3TTarget` ⊥ `GRIManagementApproach` (target vs policy intent)

---

## How to use

### Load in Protégé
Open `biodivrisK-onto.ttl` directly in [Protégé](https://protege.stanford.edu/) (File → Open).

### Load with rdflib (Python)
```python
from rdflib import Graph
g = Graph()
g.parse("biodivrisK-onto.ttl", format="turtle")
print(f"Loaded {len(g)} triples")

# Query incommensurable concept pairs
query = """
PREFIX bro: <https://w3id.org/biodivrisK-onto#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?a ?b ?bridging WHERE {
    ?a bro:incommensurableWith ?b .
    OPTIONAL { ?a bro:hasBridgingCondition ?bridging }
}
"""
for row in g.query(query):
    print(row)
```

### Run DL reasoning
Load in Protégé and run HermiT or ELK reasoner to surface implicit subsumptions.

---

## Roadmap

| Version | Planned content |
|---|---|
| v0.1.0 (current) | Core taxonomy, 4 frameworks, 15 concepts, 3 incommensurability assertions |
| v0.2.0 | Complete concept coverage per framework, SPARQL competency questions, GBIF/OBIS data-sufficiency sub-module |
| v1.0.0 | Full BiodivRisk-Onto with expert validation, RAG interface, evaluation against official EFRAG-TNFD and GRI-TNFD mappings |

---

## Citation

```bibtex
@misc{biodivrisKonto2026,
  author    = {Zárate, Marcos Daniel},
  title     = {{BiodivRisk-Onto}: An OWL 2 ontology for semantic alignment
               of biodiversity risk disclosure frameworks (v0.1.0)},
  year      = {2026},
  publisher = {GitHub},
  url       = {https://github.com/marcosdzarate/biorisk-ai/tree/main/ontology}
}
```

---

## License

[Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)

© 2026 Marcos Daniel Zárate — CESIMAR-CONICET, Puerto Madryn, Argentina
