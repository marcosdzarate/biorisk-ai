# BiodivRisk-Onto competency questions

This document provides the natural-language competency questions (CQs) used to
validate BiodivRisk-Onto v0.3.0 and their executable SPARQL 1.1 translations.
The queries are designed for the explicit ontology graph distributed as
`ontology.owl`; they do not require OWL entailment unless explicitly stated.

## How to run the queries

Load `ontology.owl` into a SPARQL 1.1-compatible RDF store (for example,
GraphDB, Apache Jena Fuseki, RDF4J, Protégé with a SPARQL plug-in, or RDFLib).
Each query includes all prefixes required for direct execution.

> **Modelling note.** BiodivRisk-Onto deliberately uses OWL 2 punning for a
> small set of framework concepts. Consequently, some resources occur both as
> `owl:Class` entities in the TBox and as `owl:NamedIndividual` entities in the
> assertional graph. The queries below follow the representation appropriate
> to each CQ.

## CQ1 — TNFD–ESRS E4 equivalence

**Natural-language question.** What concepts of TNFD are semantically
equivalent to concepts of ESRS E4?

```sparql
PREFIX bro:  <https://w3id.org/biodivrisK-onto#>
PREFIX owl:  <http://www.w3.org/2002/07/owl#>

SELECT DISTINCT ?tnfdConcept ?esrsConcept
WHERE {
  ?tnfdConcept bro:definedBy bro:TNFD ;
               (owl:equivalentClass|^owl:equivalentClass) ?esrsConcept .
  ?esrsConcept bro:definedBy bro:ESRS_E4 .
}
ORDER BY ?tnfdConcept ?esrsConcept
```

**Expected result.** One pair: `bro:TNFDLandUseChangeMetric` and
`bro:ESRSLandUseDatapoint`.

## CQ2 — TNFD concepts covered by ESRS E4 but not GRI 101

**Natural-language question.** What concepts of TNFD are covered by ESRS E4
but not by GRI 101?

```sparql
PREFIX bro: <https://w3id.org/biodivrisK-onto#>

SELECT DISTINCT ?tnfdConcept
WHERE {
  ?tnfdConcept bro:definedBy bro:TNFD ;
               bro:coveredByFramework bro:ESRS_E4 .
  FILTER NOT EXISTS {
    ?tnfdConcept bro:coveredByFramework bro:GRI101 .
  }
}
ORDER BY ?tnfdConcept
```

**Expected result.** Four TNFD concepts.

## CQ3 — ESRS E4 sensitive areas and TNFD priority locations

**Natural-language question.** How are the biodiversity-sensitive areas of
ESRS E4 related to TNFD priority locations?

```sparql
PREFIX bro:  <https://w3id.org/biodivrisK-onto#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?esrsConcept ?tnfdConcept
WHERE {
  BIND(bro:ESRSBiodiversitySensitiveArea AS ?esrsConcept)
  BIND(bro:TNFDPriorityLocation AS ?tnfdConcept)
  ?esrsConcept rdfs:subClassOf+ ?tnfdConcept .
}
```

**Expected result.** `bro:ESRSBiodiversitySensitiveArea` is a subclass of
`bro:TNFDPriorityLocation`.

## CQ4 — ENCORE/TNFD and GRI 101 materiality

**Natural-language question.** Do the ENCORE/TNFD materiality approach and the
GRI 101 impact-materiality approach produce equivalent results for the same
sector?

```sparql
PREFIX bro:  <https://w3id.org/biodivrisK-onto#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?source ?target ?informationLoss ?lossDescription ?bridgingCondition
WHERE {
  VALUES (?source ?target) {
    (bro:ENCOREMateriality bro:GRI101ImpactMateriality)
  }
  ?source bro:incommensurableWith ?target ;
          bro:hasInformationLoss ?informationLoss .
  ?informationLoss bro:sourceConcept ?source ;
                   bro:targetConcept ?target ;
                   rdfs:comment ?lossDescription ;
                   bro:hasBridgingCondition ?bridgingCondition .
}
```

**Expected result.** The approaches are explicitly incommensurable; the query
returns the associated information-loss record and bridging condition.

## CQ5 — GRI 101 protected areas/KBAs and TNFD priority locations

**Natural-language question.** Are the protected areas and key biodiversity
areas of GRI 101 a subset of TNFD priority locations?

```sparql
PREFIX bro:  <https://w3id.org/biodivrisK-onto#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?griConcept ?tnfdConcept
WHERE {
  BIND(bro:GRIOperationsAdjacentProtectedAreas AS ?griConcept)
  BIND(bro:TNFDPriorityLocation AS ?tnfdConcept)
  ?griConcept rdfs:subClassOf+ ?tnfdConcept .
}
```

**Expected result.** The GRI concept is transitively subsumed by the TNFD
priority-location concept.

## CQ6 — GRI 101 and ESRS E4 sensitive-area criteria

**Natural-language question.** Do ESRS E4 and GRI 101 use the same criteria for
defining biodiversity-sensitive areas?

```sparql
PREFIX bro:  <https://w3id.org/biodivrisK-onto#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?griConcept ?esrsConcept
WHERE {
  BIND(bro:GRIOperationsAdjacentProtectedAreas AS ?griConcept)
  BIND(bro:ESRSBiodiversitySensitiveArea AS ?esrsConcept)
  ?griConcept rdfs:subClassOf+ ?esrsConcept .
}
```

**Expected result.** The GRI concept is narrower than, rather than equivalent
to, the ESRS E4 concept.

## CQ7 — National and international sector classifications

**Natural-language question.** Does a bijective semantic correspondence exist
between national industrial classifications (CNAE, CIIU) and international
standards used by TNFD/ENCORE (GICS, SASB/SICS)?

```sparql
PREFIX bro: <https://w3id.org/biodivrisK-onto#>

SELECT DISTINCT ?nationalClassification ?internationalClassification
                ?informationLoss ?bridgingCondition
WHERE {
  VALUES ?nationalClassification { bro:CNAE bro:CIIU }
  VALUES ?internationalClassification { bro:GICS bro:SASB_SICS }
  ?nationalClassification bro:mappableTo ?internationalClassification ;
                          bro:incommensurableWith ?internationalClassification ;
                          bro:hasInformationLoss ?informationLoss .
  ?informationLoss bro:sourceConcept ?nationalClassification ;
                   bro:targetConcept ?internationalClassification ;
                   bro:hasBridgingCondition ?bridgingCondition .
}
ORDER BY ?nationalClassification ?internationalClassification
```

**Expected result.** The graph records non-bijective, lossy mappings from CNAE
and CIIU to GICS. CIIU is also mappable to SASB/SICS, but the explicit
information-loss record targets GICS.

## CQ8 — TNFD LEAP and SBTN AR3T complementarity

**Natural-language question.** What information does TNFD LEAP provide that
SBTN AR3T does not cover, and vice versa?

```sparql
PREFIX bro: <https://w3id.org/biodivrisK-onto#>

SELECT DISTINCT ?assessment ?target
WHERE {
  ?assessment a bro:LEAPAssessment ;
              bro:informsTargetSetting ?target .
  ?target a bro:SBTNAR3TTarget ;
          bro:requiresInputFrom ?assessment .
}
ORDER BY ?assessment
```

**Expected result.** Two LEAP assessments provide inputs to the SBTN AR3T
target instance: the Santander Peru and CEBDS Brazil assessments.

## CQ9 — CEBDS sector priorities

**Natural-language question.** Which sectors are prioritised by the CEBDS
heatmap and what is their explicit ordinal ranking?

```sparql
PREFIX bro: <https://w3id.org/biodivrisK-onto#>

SELECT ?sector ?rank
WHERE {
  bro:CEBDSHeatmapResult bro:hasSectorPriority ?priority .
  ?priority a bro:SectorPriority ;
            bro:prioritySector ?sector ;
            bro:priorityRank ?rank .
}
ORDER BY ?rank
```

**Expected result.** Four sectors ordered from 1 to 4: Consumer Staples,
Consumer Discretionary, Utilities, and Industrials.

## CQ10 — Data requirements and geographic gaps

**Natural-language question.** What biodiversity data sources are required for
TNFD LEAP L3 in a given LAC biome, and what gaps exist in GBIF/OBIS for that
biome?

The current graph represents the required data sources and biome-level gaps,
but does not assert a direct relation between a particular LEAP assessment and
its biome. The CQ is therefore evaluated through two queries rather than an
unsupported join. In the second query, replace `bro:Cerrado` with the biome of
interest.

### CQ10a — Sources required by LEAP assessments

```sparql
PREFIX bro: <https://w3id.org/biodivrisK-onto#>

SELECT DISTINCT ?assessment ?dataSource
WHERE {
  ?assessment a bro:LEAPAssessment ;
              bro:requiresDataFrom ?dataSource .
  ?dataSource a bro:BiodiversityDataSource .
}
ORDER BY ?assessment ?dataSource
```

### CQ10b — Sampling gaps affecting a selected biome and TNFD

```sparql
PREFIX bro: <https://w3id.org/biodivrisK-onto#>

SELECT DISTINCT ?gap ?biome
WHERE {
  VALUES ?biome { bro:Cerrado }
  ?gap a bro:GeographicSamplingBias ;
       bro:affectsBiome ?biome ;
       bro:affectsFramework bro:TNFD .
}
ORDER BY ?gap
```

**Expected result.** CQ10a returns the sources required by each of the two LEAP
assessments. For `bro:Cerrado`, CQ10b returns `bro:CerradoDataGap` and the
broader `bro:LACGeographicBias`.

## CQ11 — TNFD requirements absent from internal policy

**Natural-language question.** What TNFD disclosure requirements are not
covered by an organisation's existing internal environmental-risk policy?

```sparql
PREFIX bro: <https://w3id.org/biodivrisK-onto#>

SELECT DISTINCT ?requirement
WHERE {
  ?requirement a bro:DisclosureRequirement ;
               bro:definedBy bro:TNFD .
  FILTER NOT EXISTS {
    ?policy a bro:InternalPolicy ;
            bro:coversRequirement ?requirement .
  }
}
ORDER BY ?requirement
```

**Expected result.** `bro:TNFDStrategyD` is not covered by the represented
internal policy. The policy explicitly covers only `bro:GRIProtectedAreaKBA`.

## CQ12 — SBTN mean species abundance and GRI 101

**Natural-language question.** Can SBTN mean species abundance be represented
by a GRI 101 management-approach disclosure without information loss?

```sparql
PREFIX bro:  <https://w3id.org/biodivrisK-onto#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?source ?target ?informationLoss ?lossDescription ?bridgingCondition
WHERE {
  BIND(bro:SBTNMeanSpeciesAbundance AS ?source)
  BIND(bro:GRIManagementApproach AS ?target)
  ?source bro:incommensurableWith ?target ;
          bro:hasInformationLoss ?informationLoss .
  ?informationLoss bro:sourceConcept ?source ;
                   bro:targetConcept ?target ;
                   rdfs:comment ?lossDescription ;
                   bro:hasBridgingCondition ?bridgingCondition .
}
```

**Expected result.** No lossless conversion exists; the result describes the
lost ecological-state information and the condition for a proxy conversion.

## CQ13 — SBTN targets and GRI 101 management approaches

**Natural-language question.** Can SBTN science-based targets be converted to
GRI 101 qualitative management-approach disclosures without material
information loss?

```sparql
PREFIX bro:  <https://w3id.org/biodivrisK-onto#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?informationLoss ?lossDescription ?bridgingCondition
WHERE {
  ?informationLoss a bro:InformationLoss ;
                   bro:sourceConcept bro:SBTNAR3TTarget ;
                   bro:targetConcept bro:GRIManagementApproach ;
                   rdfs:comment ?lossDescription ;
                   bro:hasBridgingCondition ?bridgingCondition .
}
```

**Expected result.** The conversion loses the quantitative target value,
scientific baseline, time horizon, and verifiability unless the documented
bridging condition is satisfied.

## CQ14 — TNFD and ESRS E4 materiality for water stress

**Natural-language question.** Do TNFD financial materiality and ESRS E4
double materiality produce comparable results for the same water-stress asset?

```sparql
PREFIX bro:  <https://w3id.org/biodivrisK-onto#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?risk ?tnfdMateriality ?esrsMateriality ?informationLoss
       ?lossDescription ?bridgingCondition
WHERE {
  ?risk a bro:WaterStressRisk ;
        bro:affectsRiskAssessment ?tnfdMateriality .
  ?tnfdMateriality bro:definedBy bro:TNFD ;
                   bro:incommensurableWith ?esrsMateriality ;
                   bro:hasInformationLoss ?informationLoss .
  ?esrsMateriality bro:definedBy bro:ESRS_E4 .
  ?informationLoss bro:sourceConcept ?tnfdMateriality ;
                   bro:targetConcept ?esrsMateriality ;
                   rdfs:comment ?lossDescription ;
                   bro:hasBridgingCondition ?bridgingCondition .
}
```

**Expected result.** `bro:AndeanWaterStressRisk` affects TNFD enterprise-value
materiality, which is explicitly incommensurable with ESRS double materiality.

## CQ15 — Semantic ambiguity in classification mappings

**Natural-language question.** Does a semantically unambiguous correspondence
exist between national industrial classifications and TNFD/ENCORE
international standards?

```sparql
PREFIX bro: <https://w3id.org/biodivrisK-onto#>

SELECT DISTINCT ?nationalClassification ?internationalClassification ?ambiguity
WHERE {
  VALUES ?nationalClassification { bro:CNAE bro:CIIU }
  ?nationalClassification a bro:IndustrialClassification ;
                          bro:mappableTo ?internationalClassification ;
                          bro:hasAmbiguity ?ambiguity .
  ?ambiguity a bro:SemanticAmbiguity .
  FILTER(?internationalClassification IN (bro:GICS, bro:SASB_SICS))
}
ORDER BY ?nationalClassification ?internationalClassification
```

**Expected result.** Two ambiguity instances are identified, one for CNAE and
one for CIIU. The CIIU resource is also declared mappable to SASB/SICS; the
same CIIU ambiguity record applies to that correspondence.

## Validation scope

These queries validate whether the explicit v0.3.0 graph contains the
knowledge needed to answer each CQ. They are not intended to infer facts absent
from the ontology or to treat `skos:closeMatch`, `rdfs:subClassOf`, and
`owl:equivalentClass` as interchangeable relations. Query results should be
reviewed together with the ontology's provenance annotations and documented
bridging conditions.
