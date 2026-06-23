// GBIF API client + MCP_TOOLS definitions
// Copied/adapted from sibling project: C:\Users\Conicet\gbif-mcp-server\gbif-mcp-stripe.jsx

export async function callGbif(name, inp) {
  const B = "https://api.gbif.org/v1";
  const H = { "User-Agent": "biorisk-ai/1.0" };

  async function get(path, p = {}, retries = 3) {
    const u = new URL(B + path);
    for (const [k, v] of Object.entries(p)) {
      if (v != null) {
        Array.isArray(v) ? v.forEach(x => u.searchParams.append(k, x)) : u.searchParams.set(k, String(v));
      }
    }

    for (let attempt = 0; attempt < retries; attempt++) {
      const r = await fetch(u, { headers: H });
      if (r.ok) return r.json();
      if (r.status === 429) {
        const wait = (attempt + 1) * 2000 // 2s, 4s, 6s
        console.warn(`GBIF 429 - waiting ${wait}ms before retry ${attempt + 1}/${retries}`)
        await new Promise(resolve => setTimeout(resolve, wait))
        continue
      }
      throw new Error(`GBIF ${r.status}`)
    }
    throw new Error('GBIF 429 - max retries exceeded')
  }

  async function res(n, rank) {
    let m = await get("/species/match", { name: n, verbose: true });
    if (m?.usageKey && m.confidence >= 80) return m;
    if (rank) {
      m = await get("/species/match", { name: n, rank: rank.toUpperCase(), verbose: true });
      if (m?.usageKey && m.confidence >= 60) return m;
    }
    const s = await get("/species/search", { q: n, rank: rank?.toUpperCase(), limit: 1 });
    const first = s?.results?.[0];
    if (first?.key) return { ...first, usageKey: first.key, confidence: 90 };
    return null;
  }

  switch (name) {
    case "match_species_name": {
      const m = await get("/species/match", { name: inp.name, verbose: true });
      return {
        matched: !!m?.usageKey,
        usageKey: m?.usageKey,
        scientificName: m?.scientificName,
        rank: m?.rank,
        status: m?.status,
        confidence: m?.confidence,
        classification: {
          kingdom: m?.kingdom, phylum: m?.phylum, class: m?.class,
          order: m?.order, family: m?.family
        }
      };
    }
    case "get_species": {
      const t = await get(`/species/${inp.taxon_key}`);
      return {
        key: t.key, scientificName: t.scientificName, rank: t.rank,
        status: t.taxonomicStatus, kingdom: t.kingdom, phylum: t.phylum,
        class: t.class, order: t.order, family: t.family,
        numDescendants: t.numDescendants
      };
    }
    case "count_occurrences": {
      let tk = inp.taxon_key, rn, rank = inp.rank;
      if (!tk && inp.taxon_name) {
        const m = await res(inp.taxon_name, rank);
        if (m) { tk = m.usageKey; rn = m.scientificName; rank = m.rank; }
      }
      if (!tk) throw new Error(`Could not resolve taxon: "${inp.taxon_name}".`);
      const c = await get("/occurrence/count", {
        taxonKey: tk,
        country: inp.country?.toUpperCase(),
        isGeoreferenced: inp.is_georeferenced
      });
      return { count: c, taxonKey: tk, resolvedTaxon: rn, resolvedRank: rank, country: inp.country };
    }
    case "search_occurrences": {
      let tk = inp.taxon_key, rn;
      if (!tk && inp.taxon_name) {
        const m = await res(inp.taxon_name, inp.taxon_rank);
        if (m) { tk = m.usageKey; rn = m.scientificName; }
      }
      // Allow geographic-only searches if no taxon supplied
      const yr = (inp.year_from || inp.year_to)
        ? `${inp.year_from ?? "*"},${inp.year_to ?? "*"}`
        : undefined;
      // Bounding-box pre-filter: prefer lat_min/lat_max/lng_min/lng_max,
      // fall back to legacy lat_range/lng_range (ready-made "min,max" strings).
      const latRange = (inp.lat_min != null && inp.lat_max != null)
        ? `${inp.lat_min},${inp.lat_max}`
        : inp.lat_range;
      const lngRange = (inp.lng_min != null && inp.lng_max != null)
        ? `${inp.lng_min},${inp.lng_max}`
        : inp.lng_range;
      const d = await get("/occurrence/search", {
        taxonKey: tk,
        country: inp.country?.toUpperCase(),
        decimalLatitude: latRange,
        decimalLongitude: lngRange,
        year: yr,
        hasCoordinate: inp.has_coordinate,
        occurrenceStatus: 'PRESENT',
        issues: 'not:ZERO_COORDINATE,not:COORDINATE_OUT_OF_RANGE,not:COORDINATE_INVALID,not:COUNTRY_COORDINATE_MISMATCH',
        limit: inp.limit ?? 10
      });
      return {
        total: d.count,
        resolvedTaxon: rn,
        results: d.results?.map(x => ({
          key: x.key,
          scientificName: x.scientificName,
          country: x.country,
          year: x.year,
          eventDate: x.eventDate,
          lat: x.decimalLatitude,
          lng: x.decimalLongitude,
          iucnRedListCategory: x.iucnRedListCategory
        }))
      };
    }
    case "search_datasets": {
      const d = await get("/dataset", {
        q: inp.query,
        country: inp.country?.toUpperCase(),
        limit: inp.limit ?? 10
      });
      return {
        total: d.count,
        results: d.results?.map(x => ({
          key: x.key, title: x.title, type: x.type,
          publishingCountry: x.publishingCountry,
          occurrenceCount: x.occurrenceCount
        }))
      };
    }
    case "search_literature": {
      let tk = inp.taxon_key;
      if (!tk && inp.taxon_name) {
        const m = await res(inp.taxon_name);
        if (m) tk = m.usageKey;
      }
      const yr = (inp.year_from || inp.year_to)
        ? `${inp.year_from ?? ""},${inp.year_to ?? ""}`
        : undefined;
      const d = await get("/literature/search", {
        gbifTaxonKey: tk,
        countriesOfCoverage: inp.country_of_coverage?.toUpperCase(),
        peerReview: inp.peer_review,
        openAccess: inp.open_access,
        year: yr,
        limit: inp.limit ?? 10
      });
      return {
        total: d.count,
        results: d.results?.map(x => ({
          id: x.id, title: x.title, year: x.year, doi: x.doi,
          openAccess: x.openAccess
        }))
      };
    }
    case "analyze_sampling_gaps": {
      const m = await res(inp.taxon_name, inp.taxon_rank);
      if (!m) throw new Error(`Cannot resolve: "${inp.taxon_name}".`);
      const cs = inp.countries ?? ["AR"];
      const yr = (inp.year_from || inp.year_to)
        ? `${inp.year_from ?? "*"},${inp.year_to ?? "*"}`
        : undefined;
      const counts = await Promise.all(cs.map(async c => {
        const [t, g] = await Promise.all([
          get("/occurrence/count", { taxonKey: m.usageKey, country: c, year: yr }).catch(() => 0),
          get("/occurrence/count", { taxonKey: m.usageKey, country: c, isGeoreferenced: true, year: yr }).catch(() => 0)
        ]);
        return { country: c, total: t ?? 0, georef: g ?? 0, geoPercent: t ? Math.round(((g ?? 0) / t) * 100) : 0 };
      }));
      const sorted = [...counts].sort((a, b) => b.total - a.total);
      return {
        taxon: { usageKey: m.usageKey, scientificName: m.scientificName, rank: m.rank },
        summary: {
          total: sorted.reduce((s, c) => s + c.total, 0),
          wellSampled: sorted.filter(c => c.total >= 100).length,
          undersampled: sorted.filter(c => c.total > 0 && c.total < 100).length,
          absent: sorted.filter(c => c.total === 0).length
        },
        countries: sorted
      };
    }
    case "resolve_taxon_full_profile": {
      const m = await res(inp.name);
      if (!m) throw new Error(`Cannot resolve: ${inp.name}`);
      const [det, syn, vn, ot, og] = await Promise.all([
        get(`/species/${m.usageKey}`),
        get(`/species/${m.usageKey}/synonyms`, { limit: 12 }),
        get(`/species/${m.usageKey}/vernacularNames`, { limit: 60 }),
        get("/occurrence/count", { taxonKey: m.usageKey }),
        get("/occurrence/count", { taxonKey: m.usageKey, isGeoreferenced: true })
      ]);
      const vl = {};
      for (const v of vn.results ?? []) {
        const l = v.language ?? "unk";
        if (!vl[l]) vl[l] = [];
        if (!vl[l].includes(v.vernacularName)) vl[l].push(v.vernacularName);
      }
      return {
        taxonomy: {
          usageKey: m.usageKey,
          scientificName: det.scientificName,
          canonicalName: det.canonicalName,
          rank: det.rank,
          kingdom: m.kingdom, phylum: m.phylum, class: m.class,
          order: m.order, family: m.family
        },
        synonyms: syn.results?.map(x => x.scientificName) ?? [],
        vernacularNames: vl,
        occurrences: {
          total: ot,
          georeferenced: og,
          georeferencedPercent: ot ? Math.round((og / ot) * 100) : 0
        }
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export const MCP_TOOLS = [
  {
    name: "match_species_name",
    description: "Resolve a scientific name to a GBIF backbone taxon with classification.",
    input_schema: {
      type: "object", required: ["name"],
      properties: { name: { type: "string" }, include_synonyms: { type: "boolean" } }
    }
  },
  {
    name: "count_occurrences",
    description: "Count GBIF occurrence records for a taxon, optionally in a country.",
    input_schema: {
      type: "object",
      properties: {
        taxon_name: { type: "string" },
        taxon_rank: { type: "string" },
        country: { type: "string" },
        is_georeferenced: { type: "boolean" }
      }
    }
  },
  {
    name: "search_occurrences",
    description: "Search GBIF occurrence records. Useful for finding species at a location.",
    input_schema: {
      type: "object",
      properties: {
        taxon_name: { type: "string" },
        taxon_rank: { type: "string" },
        country: { type: "string" },
        year_from: { type: "number" },
        year_to: { type: "number" },
        has_coordinate: { type: "boolean" },
        limit: { type: "number" }
      }
    }
  },
  {
    name: "search_datasets",
    description: "Search GBIF datasets.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        country: { type: "string" },
        limit: { type: "number" }
      }
    }
  },
  {
    name: "search_literature",
    description: "Search scientific papers citing GBIF data.",
    input_schema: {
      type: "object",
      properties: {
        taxon_name: { type: "string" },
        country_of_coverage: { type: "string" },
        peer_review: { type: "boolean" },
        open_access: { type: "boolean" },
        limit: { type: "number" }
      }
    }
  },
  {
    name: "resolve_taxon_full_profile",
    description: "Full taxon profile: taxonomy + synonyms + vernacular names + occurrence stats.",
    input_schema: {
      type: "object", required: ["name"],
      properties: { name: { type: "string" } }
    }
  },
  {
    name: "analyze_sampling_gaps",
    description: "Sampling gap analysis across countries. Returns per-country record counts and georef percentages.",
    input_schema: {
      type: "object", required: ["taxon_name"],
      properties: {
        taxon_name: { type: "string" },
        countries: { type: "array", items: { type: "string" } },
        year_from: { type: "number" },
        year_to: { type: "number" }
      }
    }
  }
];

// ─── Spatial helpers (used by MODE='full' polygon analysis) ──────────────────

// Ray-casting point-in-polygon. point: [lat, lng], polygon: array of [lat, lng].
export function pointInPolygon(point, polygon) {
  const [lat, lng] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [lati, lngi] = polygon[i]
    const [latj, lngj] = polygon[j]
    const intersect = ((lngi > lng) !== (lngj > lng)) &&
      (lat < (latj - lati) * (lng - lngi) / (lngj - lngi) + lati)
    if (intersect) inside = !inside
  }
  return inside
}

export function getBoundingBox(polygon) {
  const lats = polygon.map(p => p[0])
  const lngs = polygon.map(p => p[1])
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  }
}

// Fetch occurrences with coordinates from GBIF, then filter to those inside the polygon.
export async function queryOccurrencesInPolygon(polygon, taxonName) {
  const result = await callGbif('search_occurrences', {
    taxon_name: taxonName,
    has_coordinate: true,
    limit: 300,
  })
  if (!result?.results) return { total: 0, inPolygon: 0, records: [] }
  const inside = result.results.filter(occ => {
    if (occ.lat == null || occ.lng == null) return false
    return pointInPolygon([occ.lat, occ.lng], polygon)
  })
  return {
    total: result.total,
    inPolygon: inside.length,
    sampleSize: result.results.length,
    records: inside,
  }
}

const ISO2_TO_ISO3 = {
  AR: 'ARG', BR: 'BRA', CO: 'COL', CL: 'CHL',
  EC: 'ECU', MX: 'MEX', PE: 'PER', BO: 'BOL',
  UY: 'URY', PY: 'PRY', CR: 'CRI', PA: 'PAN',
  GT: 'GTM', VE: 'VEN', HN: 'HND', NI: 'NIC',
}

export async function queryProtectedAreas(bbox, country) {
  const token = import.meta.env.VITE_WDPA_TOKEN
  if (!token || token === 'your_wdpa_token_here') {
    console.warn('No WDPA token configured')
    return null
  }

  if (!country) {
    console.warn('WDPA: no country provided')
    return null
  }

  try {
    const iso3 = ISO2_TO_ISO3[country] ?? country
    const url = `/api/wdpa/v3/protected_areas/search?token=${token}&country=${iso3}&page=1&per_page=50&with_geometry=true`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`WDPA API ${response.status}`)

    const data = await response.json()
    const areas = data.protected_areas ?? []

    return {
      total: areas.length,
      areas: areas.slice(0, 50).map(a => ({
        name: a.name,
        iucnCategory: a.iucn_category?.name ?? 'Unknown',
        designationType: a.designation?.name ?? 'Unknown',
        status: a.legal_status?.name ?? 'Unknown',
        area: a.reported_area,
        link: a.links?.protected_planet ?? null,
        geometry: a.geojson?.geometry ?? null,
      })),
      source: 'wdpa-api',
    }
  } catch (e) {
    console.warn('WDPA query failed:', e.message)
    return null
  }
}

// Hits the local gbif-mcp-server at localhost:3001. Returns null on failure
// so callers can fall back to the public REST API.
export async function queryMCPServer(toolName, input) {
  try {
    const response = await fetch('http://localhost:3001/tools/' + toolName, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!response.ok) throw new Error('MCP server error: ' + response.status)
    return await response.json()
  } catch (e) {
    console.warn('MCP server unavailable, falling back to REST API:', e.message)
    return null
  }
}

// ─── Sentinel Hub NDVI Query ─────────────────────────────────────────────────

async function getSentinelToken() {
  const clientId = import.meta.env.VITE_SENTINEL_CLIENT_ID
  const clientSecret = import.meta.env.VITE_SENTINEL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Sentinel Hub credentials not configured')
  }

  const response = await fetch('/api/sentinel-auth/auth/realms/CDSE/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    })
  })

  if (!response.ok) throw new Error(`Sentinel auth failed: ${response.status}`)
  const data = await response.json()
  return data.access_token
}

export async function queryNDVI(polygon) {
  try {
    const token = await getSentinelToken()

    // Compute bbox from polygon
    const lats = polygon.map(p => p[0])
    const lngs = polygon.map(p => p[1])
    const bbox = [
      Math.min(...lngs), Math.min(...lats),
      Math.max(...lngs), Math.max(...lats)
    ]

    // Statistical API request — gets NDVI stats per month
    // Auto-calculate resolution to stay under 2500x2500 pixel limit
    const bboxWidth = bbox[2] - bbox[0]
    const bboxHeight = bbox[3] - bbox[1]
    // Cap resolution to stay under Sentinel-2 1500m/pixel limit
    // 1500m/pixel ≈ 0.0135 degrees at equator
    const MAX_RES = 0.013
    const resx = Math.min(Math.max(bboxWidth / 400, 0.005), MAX_RES)
    const resy = Math.min(Math.max(bboxHeight / 400, 0.005), MAX_RES)

    const body = {
      input: {
        bounds: {
          bbox,
          properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' }
        },
        data: [{
          dataFilter: { mosaickingOrder: 'leastCC' },
          type: 'sentinel-2-l2a'
        }]
      },
      aggregation: {
        timeRange: {
          from: '2023-01-01T00:00:00Z',
          to: '2024-12-31T00:00:00Z'
        },
        aggregationInterval: { of: 'P3M' },
        evalscript: `//VERSION=3\nfunction setup() { return { input: [{ bands: ["B04", "B08", "dataMask"] }], output: [{ id: "ndvi", bands: 1 }, { id: "dataMask", bands: 1 }] } }\nfunction evaluatePixel(samples) { let ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04); return { ndvi: [ndvi], dataMask: [samples.dataMask] } }`,
        resx: resx,
        resy: resy,
      },
      calculations: {
        ndvi: {
          statistics: {
            default: {
              percentiles: { k: [25, 50, 75] }
            }
          }
        }
      }
    }

    const response = await fetch('/api/sentinel/api/v1/statistics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Sentinel API ${response.status}: ${err}`)
    }

    const data = await response.json()
    const intervals = data.data ?? []

    // Extract yearly NDVI means
    const quarterly = intervals.map(interval => ({
      period: interval.interval?.from?.slice(0, 7) ?? '?',
      mean: interval.outputs?.ndvi?.bands?.B0?.stats?.mean ?? null,
      median: interval.outputs?.ndvi?.bands?.B0?.stats?.percentiles?.['50.0'] ?? null,
      sampleCount: interval.outputs?.ndvi?.bands?.B0?.stats?.sampleCount ?? 0,
    })).filter(y => y.mean !== null)

    if (quarterly.length === 0) return null
    // Calculate trend (simple linear regression slope)
    const means = quarterly.map(y => y.mean)
    const n = means.length
    const avgMean = means.reduce((a, b) => a + b, 0) / n

    const slope = n > 1
      ? means.reduce((s, v, i) => s + (i - (n - 1) / 2) * v, 0) /
      means.reduce((s, _, i) => s + Math.pow(i - (n - 1) / 2, 2), 0)
      : 0

    const deltaYoY = n > 1 ? means[means.length - 1] - means[0] : 0


    return {
      mean: Math.round(avgMean * 1000) / 1000,
      slope: Math.round(slope * 10000) / 10000,
      deltaYoY: Math.round(deltaYoY * 1000) / 1000,
      quarterly,
      interpretation: avgMean > 0.4 ? 'Healthy vegetation' :
        avgMean > 0.2 ? 'Moderate vegetation' :
          avgMean > 0.0 ? 'Sparse vegetation' : 'Bare soil / water',
      trend: slope > 0.002 ? 'Improving' :
        slope < -0.002 ? 'Declining' : 'Stable',
    }

  } catch (e) {
    console.warn('NDVI query failed:', e.message)
    return null
  }
}

export async function getDatasetDOI(datasetKey) {
  if (!datasetKey) return null
  try {
    const r = await fetch(`https://api.gbif.org/v1/dataset/${datasetKey}`, {
      headers: { 'User-Agent': 'biorisk-ai/1.0' }
    })
    if (!r.ok) return null
    const d = await r.json()
    return {
      title: d.title ?? 'Unknown dataset',
      doi: d.doi ?? null,
    }
  } catch {
    return null
  }
}

// ─── Global Forest Watch — Tree Cover Loss ───────────────────────────────────

export async function queryForestLoss(polygon) {
  const apiKey = import.meta.env.VITE_GFW_API_KEY
  if (!apiKey) {
    console.warn('GFW API key not configured')
    return null
  }

  try {
    const geometry = {
      type: 'Polygon',
      coordinates: [[...polygon.map(p => [p[1], p[0]]), [polygon[0][1], polygon[0][0]]]]
    }

    const response = await fetch('/api/gfw/dataset/umd_tree_cover_loss/v1.13/query', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sql: 'SELECT umd_tree_cover_loss__year, SUM(area__ha) as area_ha FROM data GROUP BY umd_tree_cover_loss__year ORDER BY umd_tree_cover_loss__year',
        geometry,
      })
    })

    if (!response.ok) throw new Error(`GFW API ${response.status}`)

    const data = await response.json()
    const rows = data.data ?? []

    if (rows.length === 0) return { totalLoss: 0, byYear: [], trend: 'No forest cover detected' }

    const totalLoss = rows.reduce((s, r) => s + r.area_ha, 0)
    const recent = rows.filter(r => r.umd_tree_cover_loss__year >= 2015)
    const recentLoss = recent.reduce((s, r) => s + r.area_ha, 0)
    const avgAnnual = totalLoss / rows.length

    // Detect trend — compare last 5 years vs previous 5 years
    const last5 = rows.slice(-5).reduce((s, r) => s + r.area_ha, 0) / 5
    const prev5 = rows.slice(-10, -5).reduce((s, r) => s + r.area_ha, 0) / 5
    const trend = last5 > prev5 * 1.2 ? 'Increasing' :
      last5 < prev5 * 0.8 ? 'Decreasing' : 'Stable'

    return {
      totalLoss: Math.round(totalLoss),
      recentLoss: Math.round(recentLoss),
      avgAnnual: Math.round(avgAnnual),
      byYear: rows.map(r => ({
        year: r.umd_tree_cover_loss__year,
        ha: Math.round(r.area_ha * 100) / 100,
      })),
      trend,
      source: 'Global Forest Watch · UMD Tree Cover Loss v1.13',
    }

  } catch (e) {
    console.warn('GFW query failed:', e.message)
    return null
  }
}

// ─── GBIF via AWS Athena (no rate limits) ────────────────────────────────────

export async function queryGbifAthena({ minLat, maxLat, minLng, maxLng, countryCode, taxa }) {
  const url = import.meta.env.VITE_LAMBDA_GBIF_URL
  if (!url) {
    console.warn('Lambda GBIF URL not configured')
    return null
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
      },
      body: JSON.stringify({ minLat, maxLat, minLng, maxLng, countryCode, taxa }),
    })

    if (!response.ok) throw new Error(`Lambda ${response.status}`)

    const data = await response.json()
    console.log(`🔬 Athena: ${data.count} records for ${countryCode}`)
    return data.records ?? []

  } catch (e) {
    console.warn('Athena query failed:', e.message)
    return null
  }
}

// ─── GEE Consolidated Analysis ────────────────────────────────────────────────

export async function queryGEE(polygon, cellSizeKm = 10, polygonArea = null) {
  const url = import.meta.env.VITE_GEE_HEX_URL
  if (!url) {
    console.warn('GEE URL not configured')
    return null
  }

  let geePolygon = polygon
  const area = polygonArea  // usa el área pre-calculada
  if (area && area > 50000) {
    console.warn(`🌍 GEE: polygon too large (${Math.round(area)} km²), using bbox`)
    const lats = polygon.map(p => p[0])
    const lngs = polygon.map(p => p[1])
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
    const delta = 0.5
    geePolygon = [
      [centerLat - delta, centerLng - delta],
      [centerLat - delta, centerLng + delta],
      [centerLat + delta, centerLng + delta],
      [centerLat + delta, centerLng - delta],
    ]
  }

  console.log('🌍 GEE polygon:', geePolygon?.length, 'points, area:', Math.round(area), 'km²')

  try {
    console.log('🌍 Querying GEE...')
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ polygon: geePolygon, cellSizeKm }),
    })

    if (!response.ok) throw new Error(`GEE ${response.status}`)

    const data = await response.json()
    console.log(`🌍 GEE: ${data.features?.length} hex cells · summary:`, data.summary)
    console.log('🌍 GEE kbaCount:', data.kbaCount, 'kbaAreas:', data.kbaAreas?.length)

    return {
      features: data.features ?? [],
      summary: data.summary ?? {},
      ndvi: data.summary?.ndvi ?? null,
      msavi: data.summary?.msavi ?? null,
      lossYear: data.summary?.loss_year ?? null,
      treecover: data.summary?.treecover ?? null,
      landcover: data.summary?.landcover ?? null,
      water: data.summary?.water ?? null,
      fire: data.summary?.fire ?? null,
      iucnHabitat: data.summary?.iucn_habitat ?? null,
      kbaCount: data.kbaCount ?? 0,
      kbaAreas: data.kbaAreas ?? [],
    }
  } catch (e) {
    console.warn('GEE query failed:', e.message)
    return null
  }
}

export async function queryWorldBankBiodiversity(countryCode) {
  console.log('🌍 World Bank query for:', countryCode)
  const indicators = [
    { id: 'EN.BIR.THRD.NO', label: 'Threatened bird species' },
    { id: 'EN.MAM.THRD.NO', label: 'Threatened mammal species' },
    { id: 'EN.FSH.THRD.NO', label: 'Threatened fish species' },
    { id: 'EN.HPT.THRD.NO', label: 'Threatened plant species' },
    { id: 'AG.LND.FRST.ZS', label: 'Forest area (% of land)' },
    { id: 'ER.PTD.TOTL.ZS', label: 'Terrestrial protected areas (% of land)' },
    { id: 'EN.CLC.MDAT.ZS', label: 'Climate risk exposure (% pop affected)' },
    { id: 'NY.GDP.PCAP.CD', label: 'GDP per capita (USD)' },
  ]

  try {
    const results = await Promise.all(
      indicators.map(async ({ id, label }) => {
        const url = `https://api.worldbank.org/v2/country/${countryCode}/indicator/${id}?format=json&mrv=1`
        const res = await fetch(url)
        if (!res.ok) return null
        const data = await res.json()
        const value = data?.[1]?.[0]?.value
        const year = data?.[1]?.[0]?.date
        return { id, label, value: value != null ? value : null, year }
      })
    )
    console.log('🌍 World Bank results:', results.filter(r => r && r.value != null).length, 'indicators')

    return results.filter(r => r && r.value != null)
  } catch (e) {
    console.warn('World Bank query failed:', e.message)
    return null
  }
}

export async function queryTaxaInBbox(countryCode, bbox) {
  const url = import.meta.env.VITE_LAMBDA_GBIF_URL
  if (!url) return null

  try {
    console.log('🔬 Querying taxa in bbox for:', countryCode)
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taxaOnly: true,
        countryCode,
        minLat: bbox.minLat,
        maxLat: bbox.maxLat,
        minLng: bbox.minLng,
        maxLng: bbox.maxLng,
      }),
    })
    if (!response.ok) return null
    const data = await response.json()
    console.log(`🔬 Taxa in bbox: ${data.taxa?.length} classes found`)
    return data.taxa ?? null
  } catch (e) {
    console.warn('Taxa bbox query failed:', e.message)
    return null
  }
}

export async function queryIucnStatus(speciesKeys) {
  if (!speciesKeys?.length) return {}

  const uniqueKeys = [...new Set(speciesKeys.filter(Boolean))]
  console.log(`🔴 Querying IUCN status for ${uniqueKeys.length} species...`)

  const iucnMap = {}
  // Process in batches of 5 with 300ms delay
  // Process in batches of 10 without delay
  for (let i = 0; i < uniqueKeys.length; i += 10) {
    const batch = uniqueKeys.slice(i, i + 10)
    const results = await Promise.all(
      batch.map(key =>
        fetch(`https://api.gbif.org/v1/occurrence/search?speciesKey=${key}&limit=1`)
          .then(r => r.ok ? r.json() : null)
          .then(d => ({ key, iucn: d?.results?.[0]?.iucnRedListCategory ?? null }))
          .catch(() => ({ key, iucn: null }))
      )
    )
    results.forEach(({ key, iucn }) => {
      if (iucn) iucnMap[key] = iucn
    })
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`🔴 IUCN: ${Object.values(iucnMap).filter(v => ['CR', 'EN', 'VU'].includes(v)).length} threatened species found`)
  return iucnMap
}