# Changelog

## 0.3.1 — 2026-09-18

Maintenance release focused on conservative semantic alignment and
reproducibility.

- Replaced the unsupported `owl:equivalentClass` assertion between
  `bro:TNFDLandUseChangeMetric` and `bro:ESRSLandUseDatapoint` with
  `skos:closeMatch`, following the semantic and scope differences documented in
  the official TNFD–ESRS correspondence mapping.
- Clarified that no pair among TNFD, ESRS E4, SBTN and GRI 101 is asserted as
  extensionally equivalent. The `bro:Biome`–ENVO equivalence is an external
  reuse alignment.
- Replaced the unreproducible claim of 35 semantic relations with 12 unique
  interoperability pairs: 2 close matches, 2 cross-framework subsumptions, 2
  complementarities and 6 incommensurabilities.
- Added a SPARQL control query that reproduces the interoperability-pair count.
- Updated CQ1, README statistics, WIDOCO metadata and generated documentation.
- Preserved the graph size at 770 explicit RDF triples; Turtle and RDF/XML
  serializations remain isomorphic.

## 0.3.0 — 2026-09-17

- Added explicit information-loss records for all six incommensurability pairs.
- Added ordered sector-priority entries and biome links.
- Added SPARQL validation, HermiT verification and structural checks.
- Populated the ontology from the Santander Peru and CEBDS Brazil case studies.
