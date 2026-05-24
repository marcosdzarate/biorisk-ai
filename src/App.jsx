import { useState, useRef, useEffect, useMemo, Fragment } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Tooltip, Popup, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet.heat'
import L from 'leaflet'
import { LineChart, Line, BarChart, Bar, Cell, ResponsiveContainer, Tooltip as RTooltip, YAxis } from 'recharts'
import { callGbif, MCP_TOOLS, pointInPolygon, getBoundingBox, queryMCPServer, queryProtectedAreas, queryNDVI, getDatasetDOI } from './gbif.js'
import { jsPDF } from 'jspdf'
import { supabase, getSupabaseWithAuth } from './supabase.js'
import * as turf from '@turf/turf'

const DEMO_KEY = import.meta.env.VITE_DEMO_KEY ?? ''
const MODE = import.meta.env.VITE_MODE ?? 'demo'
// 'demo' = REST API only (production/Vercel)
// 'full' = MCP server + S3 (local with server running)

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --sidebar: #06152B;
  --navy: #0F2544;
  --green: #18A957;
  --green-lt: #1fc863;
  --green-pale: #E6F7EC;
  --bg: #F5F7FA;
  --card: #FFFFFF;
  --warning: #F5A623;
  --warning-pale: #FEF3E0;
  --danger: #E84C3D;
  --danger-pale: #FDE8E5;
  --crit: #8E1B0F;
  --text: #1F2937;
  --text2: #6B7280;
  --text3: #9CA3AF;
  --bd: #E5E7EB;
  --bd2: #D1D5DB;

  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --r-sm: 6px;
  --r-md: 8px;
  --r-lg: 12px;
  --r-pill: 999px;
  --sh1: 0 1px 2px rgba(15, 37, 68, 0.05), 0 1px 3px rgba(15, 37, 68, 0.04);
  --sh2: 0 4px 12px rgba(15, 37, 68, 0.06), 0 2px 4px rgba(15, 37, 68, 0.04);
}

html, body, #root { height: 100%; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
}

::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bd2); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--text3); }

@keyframes pulseDot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.35); opacity: 0.7; }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── App shell ── */
.app {
  display: grid;
  grid-template-columns: 220px 1fr 340px;
  height: 100vh;
  width: 100vw;
}

/* ── Sidebar ── */
.sidebar {
  background: var(--sidebar);
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
  overflow-y: auto;
}
.logo { margin-bottom: 28px; padding: 0 6px; }
.logo-title {
  font-size: 18px; font-weight: 700; letter-spacing: -0.02em;
  display: flex; align-items: center; gap: 8px;
}
.logo-mark {
  width: 28px; height: 28px; border-radius: 7px;
  background: linear-gradient(135deg, var(--green) 0%, var(--green-lt) 100%);
  display: grid; place-items: center; font-size: 15px;
}
.logo-sub {
  font-size: 10px; color: var(--green-lt); margin-top: 4px;
  letter-spacing: 0.04em; text-transform: uppercase; font-weight: 500;
}
.nav-section-label {
  font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase;
  letter-spacing: 0.08em; padding: 0 10px 8px; font-weight: 600;
}
.nav-item {
  display: flex; align-items: center; gap: 11px;
  padding: 9px 12px; border-radius: var(--r-sm);
  font-size: 13px; color: rgba(255,255,255,0.75);
  cursor: pointer; font-weight: 500;
  transition: background 0.12s, color 0.12s;
  margin-bottom: 2px;
}
.nav-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
.nav-item.active {
  background: rgba(24, 169, 87, 0.15);
  border-left: 3px solid #18A957;
  color: #18A957;
  font-weight: 600;
  padding-left: 9px;
}
.nav-icon { font-size: 15px; width: 18px; text-align: center; }
.spacer { flex: 1; }
.user-card {
  display: flex; align-items: center; gap: 10px;
  padding: 10px; border-radius: var(--r-md);
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
}
.avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, #18A957, #1fc863);
  display: grid; place-items: center;
  font-weight: 600; font-size: 13px; color: #fff;
  flex-shrink: 0;
}
.user-info { font-size: 12px; line-height: 1.35; min-width: 0; }
.user-name { color: #fff; font-weight: 600; }
.user-role { color: rgba(255,255,255,0.55); font-size: 11px; }
.logout {
  font-size: 11px; color: rgba(255,255,255,0.5);
  text-decoration: none; padding: 8px 12px;
  display: block; margin-top: 6px;
}
.logout:hover { color: #fff; }

/* ── Main area ── */
.main { overflow-y: auto; padding: 24px 28px 40px; }
.header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 22px;
}
.h-left h1 {
  font-size: 22px; font-weight: 700; letter-spacing: -0.02em;
  color: var(--text); margin-bottom: 4px;
}
.h-left .h-sub { color: var(--text2); font-size: 14px; }
.h-right { display: flex; align-items: center; gap: 10px; }
.badge {
  font-size: 11px; color: var(--text2); padding: 5px 10px;
  background: var(--card); border: 1px solid var(--bd); border-radius: var(--r-pill);
  font-weight: 500;
}
.btn {
  background: var(--green); color: #fff; border: none;
  padding: 9px 18px; border-radius: var(--r-md);
  font-size: 13px; font-weight: 600; font-family: var(--font);
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(24, 169, 87, 0.3);
  transition: background 0.12s, transform 0.06s;
}
.btn:hover { background: var(--green-lt); }
.btn:active { transform: translateY(1px); }
.btn-ghost {
  background: transparent; color: var(--green);
  border: 1px solid var(--bd);
  padding: 6px 12px; border-radius: var(--r-md);
  font-size: 12px; font-weight: 600; font-family: var(--font);
  cursor: pointer;
}
.btn-ghost:hover { background: var(--green-pale); border-color: var(--green); }

/* ── Workflow bar ── */
.workflow {
  display: flex; align-items: center; gap: 0;
  background: var(--card); border: 1px solid var(--bd);
  border-radius: var(--r-lg); padding: 14px 20px;
  margin-bottom: 22px;
}
.step { display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0; }
.step-circle {
  width: 26px; height: 26px; border-radius: 50%;
  display: grid; place-items: center;
  font-size: 12px; font-weight: 600;
  background: var(--bd); color: var(--text2);
  flex-shrink: 0;
}
.step.done .step-circle { background: var(--green); color: #fff; }
.step.active .step-circle {
  background: var(--card); color: var(--green);
  border: 2px solid var(--green);
}
.step.active .step-circle::after {
  content: ''; position: absolute;
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--green);
  animation: pulseDot 1.4s ease-in-out infinite;
}
.step-circle { position: relative; }
.step-label {
  font-size: 13px; font-weight: 500; color: var(--text2);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.step.done .step-label, .step.active .step-label { color: var(--text); font-weight: 600; }
.step-divider {
  flex: 1; height: 1px; background: var(--bd);
  margin: 0 12px; max-width: 60px;
}

/* ── Grid layout ── */
.grid { display: grid; gap: 18px; margin-bottom: 18px; }
.row-1 { grid-template-columns: 6fr 4fr; }
.row-2 { grid-template-columns: repeat(4, 1fr); }
.row-3 { grid-template-columns: 1fr; }
.row-4 { grid-template-columns: 1fr 1fr; }

.card {
  background: var(--card); border: 1px solid var(--bd);
  border-radius: var(--r-lg); padding: 18px 20px;
  box-shadow: var(--sh1);
  display: flex; flex-direction: column;
  animation: fadeUp 0.4s ease-out both;
}
.card-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 14px;
}
.card-title {
  font-size: 14px; font-weight: 600; color: var(--text);
  letter-spacing: -0.005em;
}
.card-link {
  font-size: 12px; color: var(--green); font-weight: 500;
  text-decoration: none; cursor: pointer;
}
.card-link:hover { text-decoration: underline; }

/* ── Map ── */
.map-wrap {
  height: 280px; border-radius: var(--r-md); overflow: hidden;
  border: 1px solid var(--bd);
}
.map-wrap.full-width {
  height: 420px;
}
.leaflet-container { background: #aedee8; font-family: var(--font); }

/* ── Gauge ── */
.gauge-wrap { display: flex; flex-direction: column; align-items: center; padding: 8px 0; }
.gauge-svg { width: 100%; max-width: 240px; }
.gauge-value {
  font-size: 38px; font-weight: 700; color: var(--text);
  letter-spacing: -0.03em; line-height: 1;
}
.gauge-max { font-size: 14px; color: var(--text3); font-weight: 500; }
.gauge-label {
  margin-top: 4px; padding: 4px 12px; border-radius: var(--r-pill);
  background: var(--danger-pale); color: var(--danger);
  font-size: 12px; font-weight: 600;
}
.gauge-desc {
  font-size: 12px; color: var(--text2); text-align: center;
  margin-top: 14px; line-height: 1.5;
}

/* ── Risk score explainability ── */
.explain-box {
  background: var(--bg);
  border: 1px solid var(--bd);
  border-radius: var(--r-md);
  padding: 10px 12px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text2);
  margin-top: 12px;
}
.explain-box strong { color: var(--text); font-weight: 600; }

/* ── Findings ── */
.finding {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--bd);
  font-size: 13px;
}
.finding:last-child { border-bottom: none; }
.finding-label { display: flex; align-items: center; gap: 10px; color: var(--text); }
.finding-dot { font-size: 10px; }
.finding-val { font-weight: 600; color: var(--text); }

/* ── Stat cards (row 2) ── */
.stat-big {
  font-size: 36px; font-weight: 700; letter-spacing: -0.03em;
  color: var(--text); line-height: 1;
}
.stat-sub { font-size: 12px; color: var(--text2); margin-top: 4px; }
.stat-val { font-size: 22px; font-weight: 700; line-height: 1.1; }
.stat-val.warn { color: var(--warning); }
.stat-val.danger { color: var(--danger); }
.stat-desc { font-size: 12px; color: var(--text2); margin-top: 8px; line-height: 1.5; }
.stat-illus { font-size: 36px; text-align: center; margin: 6px 0; }

/* ── Table ── */
.table-wrap { max-height: 280px; overflow-y: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th {
  text-align: left; font-size: 11px; color: var(--text3);
  text-transform: uppercase; letter-spacing: 0.05em;
  font-weight: 600; padding: 10px 12px;
  border-bottom: 1px solid var(--bd);
}
.table td {
  padding: 12px; border-bottom: 1px solid var(--bd);
  color: var(--text);
}
.table tr:last-child td { border-bottom: none; }
.table tr:hover td { background: var(--bg); }
.sp-icon { display: inline-block; margin-right: 8px; font-size: 16px; vertical-align: middle; }
.sp-sci { font-style: italic; font-weight: 500; }
.iucn {
  display: inline-block; padding: 3px 8px; border-radius: var(--r-sm);
  font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
}
.iucn.en { background: var(--danger-pale); color: var(--danger); }
.iucn.vu { background: var(--warning-pale); color: var(--warning); }
.iucn.cr { background: var(--crit); color: #fff; }

/* ── TNFD ── */
.tnfd-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.tnfd-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: var(--r-sm);
  font-size: 13px;
}
.tnfd-item.done { color: var(--text); background: var(--green-pale); }
.tnfd-item.pending { color: var(--text3); background: var(--bg); }
.tnfd-check { font-weight: 700; font-size: 14px; }
.tnfd-item.done .tnfd-check { color: var(--green); }

/* ── Sources ── */
.source-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0; border-bottom: 1px solid var(--bd);
  font-size: 13px;
}
.source-item:last-child { border-bottom: none; }
.source-left { display: flex; align-items: center; gap: 10px; }
.source-icon { font-size: 16px; }
.source-name { font-weight: 500; }
.source-val { color: var(--text2); font-size: 12px; font-weight: 500; }

/* ── Copilot ── */
.copilot {
  background: var(--card); border-left: 1px solid var(--bd);
  display: flex; flex-direction: column;
  height: 100vh; overflow: hidden;
}
.cp-head {
  padding: 16px 18px; border-bottom: 1px solid var(--bd);
  display: flex; align-items: center; justify-content: space-between;
}
.cp-title { display: flex; align-items: center; gap: 8px; }
.cp-h1 { font-size: 14px; font-weight: 600; }
.cp-beta {
  font-size: 9px; background: var(--green-pale); color: var(--green);
  padding: 2px 6px; border-radius: var(--r-pill);
  font-weight: 700; letter-spacing: 0.05em;
}
.cp-icons { display: flex; gap: 6px; color: var(--text3); }
.cp-icons span { cursor: pointer; padding: 4px; font-size: 14px; }
.cp-icons span:hover { color: var(--text); }
.cp-body {
  flex: 1; overflow-y: auto;
  padding: 16px 18px;
  display: flex; flex-direction: column; gap: 12px;
}
.cp-section-label {
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--text3); font-weight: 600; margin-bottom: 4px;
}
.cp-suggestions { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
.cp-chip {
  background: var(--bg); border: 1px solid var(--bd);
  padding: 8px 12px; border-radius: var(--r-md);
  font-size: 12px; color: var(--text); cursor: pointer;
  text-align: left; font-family: var(--font); line-height: 1.4;
  transition: all 0.12s;
}
.cp-chip:hover {
  background: var(--green-pale); border-color: var(--green);
  color: var(--green);
}
.msg { display: flex; flex-direction: column; gap: 8px; }
.msg.user .msg-bubble {
  background: var(--green); color: #fff;
  align-self: flex-end;
  border-radius: 12px 12px 2px 12px;
  max-width: 85%;
}
.msg.assistant .msg-bubble {
  background: #F9FAFB; color: var(--text);
  align-self: flex-start;
  border: 1px solid var(--bd);
  border-radius: 12px 12px 12px 2px;
  max-width: 90%;
  line-height: 1.6;
}
.msg-bubble {
  padding: 10px 14px;
  font-size: 13px;
  word-wrap: break-word;
}
.msg-line { white-space: pre-wrap; }
.msg-line:empty { height: 4px; }
.msg-bullet {
  display: flex; gap: 6px;
  margin: 2px 0;
}
.msg-bullet-marker {
  color: var(--green); flex-shrink: 0;
  line-height: 1.6;
}
.msg-dots {
  display: flex; gap: 4px; padding: 2px 0;
}
.msg-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--text2);
  display: inline-block;
  animation: msgDot 1.4s ease-in-out infinite;
}
.msg-dot:nth-child(2) { animation-delay: 0.2s; }
.msg-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes msgDot {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.9); }
  40% { opacity: 1; transform: scale(1); }
}
.cp-rows {
  display: flex; flex-direction: column; gap: 6px;
  margin-top: 8px;
}
.cp-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border-radius: var(--r-md);
  font-size: 13px; font-weight: 500;
}
.cp-row.vu { background: var(--warning-pale); color: var(--warning); }
.cp-row.en { background: var(--danger-pale); color: var(--danger); }
.cp-row.cr { background: #fce4e0; color: var(--crit); }
.cp-row-val { font-weight: 700; }
.cp-action {
  margin-top: 8px;
  padding: 8px 12px; border-radius: var(--r-md);
  background: var(--card); border: 1px solid var(--green);
  color: var(--green); font-size: 12px; font-weight: 600;
  cursor: pointer; font-family: var(--font); text-align: center;
}
.cp-action:hover { background: var(--green-pale); }
.cp-input-bar {
  padding: 12px 14px; border-top: 1px solid var(--bd);
  display: flex; gap: 8px; align-items: center;
  background: var(--card);
}
.cp-input {
  flex: 1; border: 1px solid var(--bd); border-radius: var(--r-pill);
  padding: 9px 14px; font-size: 13px; font-family: var(--font);
  background: var(--bg); color: var(--text); outline: none;
}
.cp-input:focus { border-color: var(--green); background: var(--card); }
.cp-send {
  width: 34px; height: 34px; border: none; border-radius: 50%;
  background: var(--green); color: #fff; cursor: pointer;
  display: grid; place-items: center; font-size: 14px;
  transition: background 0.12s;
}
.cp-send:hover:not(:disabled) { background: var(--green-lt); }
.cp-send:disabled { background: var(--text3); cursor: not-allowed; }
.spinner-sm {
  width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.spinner-inline {
  display: inline-block; width: 12px; height: 12px;
  border: 2px solid var(--bd); border-top-color: var(--green);
  border-radius: 50%; animation: spin 0.7s linear infinite;
  vertical-align: middle;
}
.table-note {
  font-size: 11px; color: var(--text3);
  padding: 10px 4px 0; line-height: 1.5;
}
.source-meta {
  font-size: 11px; color: var(--text3);
  margin-top: 10px; padding-top: 10px;
  border-top: 1px solid var(--bd);
}
.cp-status {
  font-size: 11px; color: var(--text3); padding: 4px 12px;
  font-style: italic;
}

/* ── Taxa breakdown (Analysis Complete) ── */
.taxa-section-title {
  font-size: 13px; font-weight: 600;
  color: var(--text); margin-bottom: 10px;
  letter-spacing: -0.005em;
}
.taxa-table {
  background: var(--bg);
  border: 1px solid var(--bd);
  border-radius: var(--r-md);
  padding: 6px 14px;
}
.taxa-row {
  display: grid;
  grid-template-columns: 24px 1fr auto auto;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px solid var(--bd);
}
.taxa-row:last-child { border-bottom: none; }
.taxa-emoji { font-size: 16px; text-align: center; line-height: 1; }
.taxa-name { color: var(--text); font-weight: 500; }
.taxa-count {
  font-variant-numeric: tabular-nums;
  font-weight: 700; font-size: 14px;
  min-width: 40px; text-align: right;
}
.taxa-unit {
  color: var(--text3); font-size: 11px;
  min-width: 130px; text-align: right;
}
.taxa-row-total {
  border-top: 1px solid var(--bd2);
  padding-top: 10px; margin-top: 2px;
  font-weight: 600;
}
.taxa-row-total .taxa-name { color: var(--text); }
.taxa-row-total .taxa-count { color: var(--text); }
.taxa-sample-note {
  font-size: 11px; color: var(--text3);
  margin-top: 6px; text-align: center;
  font-style: italic;
}

/* ── Map legend ── */
.map-legend {
  position: absolute;
  bottom: 10px; left: 10px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--bd);
  border-radius: var(--r-md);
  padding: 8px 10px;
  display: flex; flex-direction: column;
  gap: 4px;
  font-size: 11px;
  box-shadow: 0 1px 3px rgba(15, 37, 68, 0.08);
  z-index: 500;
  pointer-events: none;
}
.map-legend-row {
  display: grid;
  grid-template-columns: 10px 14px 1fr auto;
  align-items: center; gap: 6px;
}
.map-legend-dot {
  width: 8px; height: 8px; border-radius: 50%;
}
.map-legend-emoji { font-size: 12px; line-height: 1; }
.map-legend-name { color: var(--text); }
.map-legend-count {
  color: var(--text2); font-weight: 600;
  font-variant-numeric: tabular-nums;
  margin-left: 6px;
}

/* ── Demo banner ── */
.demo-banner {
  background: linear-gradient(135deg, #0F2544 0%, #18A957 100%);
  border-radius: 10px;
  padding: 14px 20px;
  margin: 16px 24px 0;
  display: flex;
  align-items: center;
  gap: 16px;
  animation: fadeUp 0.4s ease-out both;
}
.demo-banner-icon { font-size: 24px; line-height: 1; flex-shrink: 0; }
.demo-banner-body { flex: 1; min-width: 0; }
.demo-banner-title {
  font-size: 13px; font-weight: 600; color: #fff;
  margin-bottom: 2px;
}
.demo-banner-sub {
  font-size: 11px; color: rgba(255,255,255,0.75);
  line-height: 1.45;
}
.demo-banner-cta {
  background: #18A957; color: #fff; border: none;
  border-radius: 6px; padding: 8px 16px;
  font-size: 12px; font-weight: 600;
  font-family: var(--font); cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s;
}
.demo-banner-cta:hover { background: var(--green-lt); }
.demo-banner-x {
  background: rgba(255,255,255,0.15); color: #fff;
  border: none; border-radius: 50%;
  width: 24px; height: 24px;
  font-size: 14px; cursor: pointer;
  display: grid; place-items: center;
  flex-shrink: 0; font-family: var(--font);
  line-height: 1;
  transition: background 0.12s;
}
.demo-banner-x:hover { background: rgba(255,255,255,0.28); }

/* ── New Analysis Wizard ── */
.wiz-shell {
  display: flex; flex-direction: column;
  height: 100vh; overflow: hidden;
  background: var(--bg);
}
.wiz-header {
  height: 56px; flex-shrink: 0;
  background: var(--card);
  border-bottom: 1px solid var(--bd);
  display: flex; align-items: center;
  padding: 0 20px;
}
.wiz-back {
  background: transparent; border: none;
  font-size: 18px; cursor: pointer;
  color: var(--text2);
  padding: 6px 12px; border-radius: var(--r-sm);
  font-family: var(--font);
}
.wiz-back:hover { background: var(--bg); color: var(--text); }
.wiz-title {
  flex: 1; text-align: center;
  font-size: 15px; font-weight: 600;
  color: var(--text); letter-spacing: -0.01em;
}
.wiz-step-pill {
  font-size: 12px; color: var(--text2);
  background: var(--bg); padding: 5px 12px;
  border-radius: var(--r-pill); font-weight: 500;
  border: 1px solid var(--bd);
}
.wiz-body {
  flex: 1; display: flex; overflow: hidden; min-height: 0;
}
.wiz-panel {
  width: 380px; flex-shrink: 0;
  background: var(--card);
  border-right: 1px solid var(--bd);
  padding: 24px;
  display: flex; flex-direction: column;
  overflow-y: auto;
}
.wiz-panel h2 {
  font-size: 18px; font-weight: 700;
  letter-spacing: -0.02em; margin-bottom: 6px;
  color: var(--text);
}
.wiz-sub {
  font-size: 13px; color: var(--text2);
  margin-bottom: 22px; line-height: 1.5;
}
.wiz-label {
  display: block; font-size: 12px; font-weight: 600;
  color: var(--text); margin-bottom: 6px;
  letter-spacing: -0.005em;
}
.wiz-input, .wiz-select {
  width: 100%; padding: 9px 12px; font-size: 13px;
  font-family: var(--font); color: var(--text);
  background: var(--card); border: 1px solid var(--bd);
  border-radius: var(--r-md); margin-bottom: 16px;
  outline: none; transition: border-color 0.12s;
}
.wiz-input:focus, .wiz-select:focus { border-color: var(--green); }
.wiz-divider {
  height: 1px; background: var(--bd);
  margin: 4px 0 18px;
}
.wiz-info {
  background: #EFF6FF; border: 1px solid #BFDBFE;
  border-radius: var(--r-md); padding: 12px;
  font-size: 12px; line-height: 1.5; color: #1E40AF;
  margin-bottom: 14px;
}
.wiz-status {
  font-size: 12px; padding: 10px 12px;
  border-radius: var(--r-md); margin-bottom: 12px;
  line-height: 1.4;
}
.wiz-status.empty { background: var(--bg); color: var(--text3); }
.wiz-status.drawing { background: #EFF6FF; color: #1E40AF; }
.wiz-status.closed {
  background: var(--green-pale); color: var(--green);
  font-weight: 600;
}
.wiz-clear {
  align-self: flex-start;
  background: transparent; border: 1px solid var(--bd);
  padding: 5px 12px; border-radius: var(--r-sm);
  font-size: 12px; cursor: pointer;
  color: var(--text2); font-family: var(--font);
  margin-bottom: 14px;
}
.wiz-clear:hover {
  background: var(--bg); color: var(--danger);
  border-color: var(--danger);
}
.wiz-run {
  margin-top: auto; width: 100%;
  background: var(--green); color: #fff;
  border: none; padding: 12px 20px;
  border-radius: var(--r-md);
  font-size: 14px; font-weight: 600;
  font-family: var(--font); cursor: pointer;
  box-shadow: 0 1px 3px rgba(24, 169, 87, 0.3);
  transition: background 0.12s;
}
.wiz-run:hover:not(:disabled) { background: var(--green-lt); }
.wiz-run:disabled {
  background: var(--bd2); color: #fff;
  cursor: not-allowed; box-shadow: none;
}
.wiz-map { flex: 1; position: relative; min-width: 0; }
.wiz-map .leaflet-container { height: 100%; width: 100%; }

/* Scan running view */
.wiz-center {
  flex: 1; display: grid; place-items: center;
  padding: 40px; overflow-y: auto;
}
.scan-card {
  background: var(--card); border: 1px solid var(--bd);
  border-radius: var(--r-lg);
  padding: 48px; max-width: 520px; width: 100%;
  box-shadow: var(--sh2);
  animation: fadeUp 0.4s ease-out both;
}
.scan-spinner {
  width: 48px; height: 48px;
  border: 4px solid var(--bd);
  border-top-color: var(--green);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 20px;
}
.scan-title {
  font-size: 20px; font-weight: 700;
  text-align: center; letter-spacing: -0.02em;
  margin-bottom: 4px; color: var(--text);
}
.scan-sub {
  font-size: 13px; color: var(--text2);
  text-align: center; margin-bottom: 28px;
}
.scan-steps {
  display: flex; flex-direction: column;
  gap: 14px; margin-bottom: 24px;
}
.scan-step {
  display: flex; align-items: center; gap: 12px;
  font-size: 13px; color: var(--text3);
  transition: color 0.2s;
}
.scan-step.done { color: var(--text); }
.scan-step.active { color: var(--text); font-weight: 500; }
.scan-step-icon {
  width: 24px; height: 24px; border-radius: 50%;
  display: grid; place-items: center; flex-shrink: 0;
  font-size: 11px; font-weight: 700;
  background: var(--bd); color: var(--text3);
  transition: all 0.2s;
}
.scan-step.done .scan-step-icon {
  background: var(--green); color: #fff;
}
.scan-step.active .scan-step-icon {
  background: var(--card);
  border: 2px solid var(--green);
  position: relative;
}
.scan-step.active .scan-step-icon::after {
  content: ''; width: 8px; height: 8px;
  background: var(--green); border-radius: 50%;
  animation: pulseDot 1.2s ease-in-out infinite;
}
.scan-progress-bar {
  width: 100%; height: 4px;
  background: var(--bd); border-radius: 2px;
  overflow: hidden;
}
.scan-progress-fill {
  height: 100%; background: var(--green);
  border-radius: 2px;
  transition: width 0.5s ease-out;
}

/* Results view */
.results-card {
  background: var(--card); border: 1px solid var(--bd);
  border-radius: var(--r-lg);
  padding: 48px; max-width: 560px; width: 100%;
  box-shadow: var(--sh2);
  animation: fadeUp 0.4s ease-out both;
}
.results-check {
  width: 60px; height: 60px; border-radius: 50%;
  background: var(--green); color: #fff;
  display: grid; place-items: center;
  font-size: 32px; font-weight: 700;
  margin: 0 auto 16px;
}
.results-title {
  font-size: 22px; font-weight: 700;
  text-align: center; letter-spacing: -0.02em;
  margin-bottom: 4px; color: var(--text);
}
.results-sub {
  font-size: 13px; color: var(--text2);
  text-align: center; margin-bottom: 24px;
}
.results-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 12px; margin-bottom: 20px;
}
.results-stat {
  background: var(--bg); border: 1px solid var(--bd);
  border-radius: var(--r-md); padding: 14px;
}
.results-stat-val {
  font-size: 18px; font-weight: 700;
  letter-spacing: -0.02em; line-height: 1.2;
  margin-bottom: 4px; color: var(--text);
}
.results-stat-icon { margin-right: 6px; }
.results-stat-label {
  font-size: 12px; color: var(--text2);
}
.results-insight {
  background: #F0FDF4; border: 1px solid #BBF7D0;
  border-radius: var(--r-md); padding: 14px;
  font-size: 13px; line-height: 1.55;
  color: #166534; margin-bottom: 20px;
}
.results-actions {
  display: flex; gap: 10px;
}
.results-btn {
  flex: 1; padding: 11px 16px;
  border-radius: var(--r-md);
  font-size: 13px; font-weight: 600;
  font-family: var(--font); cursor: pointer;
  transition: all 0.12s;
}
.results-btn.primary {
  background: var(--green); color: #fff; border: none;
  box-shadow: 0 1px 3px rgba(24, 169, 87, 0.3);
}
.results-btn.primary:hover { background: var(--green-lt); }
.results-btn.ghost {
  background: transparent; color: var(--text);
  border: 1px solid var(--bd);
}
.results-btn.ghost:hover {
  background: var(--bg); border-color: var(--text2);
}
`

// ─── Sample data ──────────────────────────────────────────────────────────────

const POLYGON = [
  [-41.8, -65.5], [-41.5, -63.8], [-42.8, -63.5], [-43.2, -65.2]
]

const OCCURRENCE_POINTS = [
  [-42.0, -65.0], [-41.9, -64.3], [-42.3, -64.0], [-42.6, -64.5],
  [-42.9, -64.8], [-42.4, -65.1], [-42.1, -64.6], [-43.0, -64.2]
]

const NAV_ITEMS = [
  { id: 'new', icon: '➕', label: 'New Analysis' },
  { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
  { id: 'projects', icon: '📁', label: 'Projects' },
  { id: 'reports', icon: '📄', label: 'Reports' },
  { id: 'monitoring', icon: '🔭', label: 'Monitoring Insights' },
  { id: 'species', icon: '🐾', label: 'Species Explorer' },
  { id: 'sources', icon: '🗄', label: 'Data Sources' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
]


// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = n => n == null ? '—' : Number(n).toLocaleString('en-US')

const delay = ms => new Promise(r => setTimeout(r, ms))

const COUNTRY_NAMES = {
  AR: 'Argentina',
  BR: 'Brazil',
  CO: 'Colombia',
  CL: 'Chile',
  EC: 'Ecuador',
  MX: 'Mexico',
  PE: 'Peru',
  BO: 'Bolivia',
  UY: 'Uruguay',
  PY: 'Paraguay',
  CR: 'Costa Rica',
  PA: 'Panama',
  GT: 'Guatemala',
  VE: 'Venezuela',
  HN: 'Honduras',
  NI: 'Nicaragua',
}

const COUNTRY_CENTERS = {
  AR: [-34, -64], BR: [-10, -52], CO: [4, -72], CL: [-30, -71],
  EC: [-1.8, -78], MX: [23, -102], PE: [-9, -75], BO: [-17, -65],
  UY: [-33, -56], PY: [-23, -58],
}

const SECTORS = [
  'Wind Energy', 'Mining & Extractives', 'Agriculture & Forestry',
  'Infrastructure', 'Hydroelectric', 'Oil & Gas',
]

const SCAN_STEPS = [
  'Validating project area',
  'Querying GBIF occurrence data',
  'Calculating biodiversity indicators',
  'Identifying threatened species',
  'Preparing analysis results',
]

const SCAN_TAXA = [
  { name: 'Aves', emoji: '🐦', taxon_rank: 'class', group: 'Vertebrates' },
  { name: 'Mammalia', emoji: '🐾', taxon_rank: 'class', group: 'Vertebrates' },
  { name: 'Amphibia', emoji: '🐸', taxon_rank: 'class', group: 'Vertebrates' },
  { name: 'Reptilia', emoji: '🦎', taxon_rank: 'class', group: 'Vertebrates' },
  { name: 'Actinopterygii', emoji: '🐟', taxon_rank: 'class', group: 'Vertebrates' },
  { name: 'Chondrichthyes', emoji: '🦈', taxon_rank: 'class', group: 'Vertebrates' },
  { name: 'Cetacea', emoji: '🐋', taxon_rank: 'order', group: 'Vertebrates' },
  { name: 'Lepidoptera', emoji: '🦋', taxon_rank: 'order', group: 'Invertebrates' },
  { name: 'Insecta', emoji: '🐛', taxon_rank: 'class', group: 'Invertebrates' },
  { name: 'Orchidaceae', emoji: '🌸', taxon_rank: 'family', group: 'Plants' },
  { name: 'Pinopsida', emoji: '🌲', taxon_rank: 'class', group: 'Plants' },
  { name: 'Magnoliopsida', emoji: '🌿', taxon_rank: 'class', group: 'Plants' },
  { name: 'Plantae', emoji: '🌱', taxon_rank: 'kingdom', group: 'Plants' },
  { name: 'Anura', emoji: '🐸', taxon_rank: 'order', group: 'Vertebrates' },
]
const TAXON_COLORS = {
  Aves: '#18A957',
  Mammalia: '#F5A623',
  Amphibia: '#3B82F6',
  Reptilia: '#8B5CF6',
  Lepidoptera: '#F59E0B',
  Orchidaceae: '#EC4899',
  Actinopterygii: '#06B6D4',
  Chondrichthyes: '#0EA5E9',
  Cetacea: '#0284C7',
  Insecta: '#84CC16',
  Pinopsida: '#15803D',
  Magnoliopsida: '#16A34A',
  Plantae: '#4ADE80',
  Anura: '#6366F1',
}

// Conservative scoring: less data → more uncertainty → higher score (per CLAUDE.md).
function calculateRiskScore({ taxaInPolygon, papers, mode }) {
  const totalInPolygon = taxaInPolygon?.reduce((s, t) => s + t.inPolygon, 0) ?? 0
  const taxaFound = taxaInPolygon?.filter(t => t.inPolygon > 0).length ?? 0

  const richnessScore = Math.min(taxaFound * 5, 20)
  const densityScore = totalInPolygon > 100 ? 15
    : totalInPolygon > 50 ? 20
      : totalInPolygon > 10 ? 25 : 30
  const litScore = papers > 10 ? 5 : papers > 3 ? 10 : 15
  const baseScore = 30

  const total = Math.min(
    Math.round(baseScore + richnessScore + densityScore + litScore),
    100
  )

  return {
    score: total,
    category: total >= 76 ? 'Critical Risk'
      : total >= 51 ? 'High Risk'
        : total >= 26 ? 'Moderate Risk'
          : 'Low Risk',
    color: total >= 76 ? '#E84C3D'
      : total >= 51 ? '#F5A623'
        : total >= 26 ? '#F5A623'
          : '#18A957',
    components: {
      base: baseScore,
      richness: richnessScore,
      density: densityScore,
      literature: litScore,
    },
    totalInPolygon,
    taxaFound,
    papers: papers ?? 0,
    mode,
  }
}

function mostRecentOccurrence(results) {
  if (!Array.isArray(results) || !results.length) return null
  return [...results]
    .map(o => ({ ...o, _sortKey: o.eventDate || (o.year ? `${o.year}-12-31` : '') }))
    .filter(o => o._sortKey)
    .sort((a, b) => b._sortKey.localeCompare(a._sortKey))[0] || null
}

function recordDate(occ) {
  if (!occ) return null
  if (occ.eventDate) return String(occ.eventDate).slice(0, 10)
  if (occ.year) return String(occ.year)
  return null
}

const Spinner = () => <span className="spinner-inline" aria-label="loading" />

// ─── Gauge component ──────────────────────────────────────────────────────────
function Gauge({ value, max = 100 }) {
  const pct = Math.min(1, value / max)
  // Semicircle: from 180° (left) to 0° (right). Center: (100, 100), r = 80.
  const cx = 100, cy = 100, r = 80
  const startA = Math.PI            // 180°
  const endA = Math.PI - pct * Math.PI

  const sx = cx + r * Math.cos(startA), sy = cy - r * Math.sin(startA)
  const ex = cx + r * Math.cos(endA), ey = cy - r * Math.sin(endA)
  const bgEx = cx + r * Math.cos(0), bgEy = cy - r * Math.sin(0)

  // Color: green < 40, orange < 70, red >= 70
  const color = value >= 70 ? '#E84C3D' : value >= 40 ? '#F5A623' : '#18A957'
  const label = value >= 70 ? 'High Risk' : value >= 40 ? 'Medium Risk' : 'Low Risk'
  const labelClass = value >= 70 ? 'gauge-label' : 'gauge-label'

  return (
    <div className="gauge-wrap">
      <svg viewBox="0 0 200 120" className="gauge-svg">
        <path
          d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${bgEx} ${bgEy}`}
          fill="none" stroke="#E5E7EB" strokeWidth="14" strokeLinecap="round"
        />
        <path
          d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`}
          fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
        />
        <text x="100" y="92" textAnchor="middle" fontSize="32" fontWeight="700" fill="#1F2937" letterSpacing="-1">
          {value}
        </text>
        <text x="100" y="112" textAnchor="middle" fontSize="11" fill="#9CA3AF" fontWeight="500">
          / {max}
        </text>
      </svg>
      <div className={labelClass} style={{
        background: value >= 70 ? '#FDE8E5' : value >= 40 ? '#FEF3E0' : '#E6F7EC',
        color
      }}>
        {label}
      </div>
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ activePage, setActivePage, user, logout }) {
  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-title">
          <span className="logo-mark">🌿</span>
          BioRisk AI
        </div>
        <div className="logo-sub">Biodiversity Intelligence for ESG &amp; TNFD</div>
      </div>

      <div className="nav-section-label">Workspace</div>
      <nav>
        {NAV_ITEMS.map(item => (
          <div
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => setActivePage(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      <div className="spacer" />
      <div className="user-card">
        <div className="avatar">
          {user?.picture
            ? <img src={user.picture} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            : (user?.name?.[0] ?? 'U').toUpperCase()
          }
        </div>
        <div className="user-info">
          <div className="user-name">{user?.name ?? user?.email ?? 'User'}</div>
          <div className="user-role">{user?.email ?? ''}</div>
        </div>
      </div>

      <a href="#"
        className="logout"
        onClick={e => { e.preventDefault(); logout({ logoutParams: { returnTo: window.location.origin } }) }}
      >
        Log out
      </a>



    </aside>
  )
}

// ─── Workflow bar ────────────────────────────────────────────────────────────
function WorkflowBar() {
  const steps = [
    { n: 1, label: 'Define Area', state: 'done' },
    { n: 2, label: 'Biodiversity Scan', state: 'done' },
    { n: 3, label: 'Risk Assessment', state: 'active' },
    { n: 4, label: 'Report', state: 'pending' },
  ]
  return (
    <div className="workflow">
      {steps.map((s, i) => (
        <Fragment key={s.n}>
          <div className={`step ${s.state}`}>
            <div className="step-circle">
              {s.state === 'done' ? '✓' : s.state === 'active' ? '' : s.n}
            </div>
            <div className="step-label">{s.label}</div>
          </div>
          {i < steps.length - 1 && <div className="step-divider" />}
        </Fragment>
      ))}
    </div>
  )
}

function NdviLayer({ polygon, ndviData }) {
  const map = useMap()

  useEffect(() => {
    if (!polygon || !ndviData) return

    const lats = polygon.map(p => p[0])
    const lngs = polygon.map(p => p[1])
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    const mean = ndviData.mean ?? 0
    const trend = ndviData.trend

    // Color based on NDVI mean
    const color = mean > 0.6 ? '#15803D' :
      mean > 0.4 ? '#18A957' :
        mean > 0.2 ? '#FBBF24' :
          mean > 0.0 ? '#F5A623' : '#E84C3D'

    const rect = L.rectangle(
      [[minLat, minLng], [maxLat, maxLng]],
      {
        color: color,
        weight: 1,
        fillColor: color,
        fillOpacity: 0.35,
      }
    ).addTo(map)

    const trendIcon = trend === 'Improving' ? '↗' : trend === 'Declining' ? '↘' : '→'
    rect.bindTooltip(
      `NDVI: ${mean.toFixed(3)} · ${ndviData.interpretation}<br/>Trend: ${trendIcon} ${trend}`,
      { permanent: false, sticky: true }
    )

    return () => map.removeLayer(rect)
  }, [map, polygon, ndviData])

  return null
}

function WdpaLayer({ wdpaData, polygon }) {
  const map = useMap()

  useEffect(() => {
    if (!wdpaData?.areas?.length || !polygon) return

    const layers = []

    // Convert user polygon to turf format for intersection check
    const userPolygon = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[...polygon.map(p => [p[1], p[0]]), [polygon[0][1], polygon[0][0]]]]
      }
    }

    wdpaData.areas.forEach(area => {
      if (!area.geometry) return

      let intersects = false
      try {
        const areaFeature = { type: 'Feature', geometry: area.geometry }
        intersects = turf.booleanIntersects(userPolygon, areaFeature)
      } catch (e) {
        intersects = false
      }

      // Only show areas that intersect with project polygon
      if (!intersects) return

      const layer = L.geoJSON(area.geometry, {
        style: {
          color: '#E84C3D',
          weight: 2,
          fillColor: '#E84C3D',
          fillOpacity: 0.25,
        }
      }).addTo(map)

      layer.bindTooltip(
        `⚠️ OVERLAP: ${area.name}<br/>
     IUCN Cat. ${area.iucnCategory} · ${area.designationType}<br/>
     <strong style="color:#E84C3D">Intersects with project area</strong>`,
        { permanent: false, sticky: true, maxWidth: 250 }
      )

      layers.push(layer)
    })

    return () => layers.forEach(l => map.removeLayer(l))
  }, [map, wdpaData, polygon])

  return null
}

function HeatmapLayer({ allTaxaRecords }) {
  const map = useMap()

  useEffect(() => {
    if (!map || !allTaxaRecords) return

    // Collect all points with intensity
    const points = allTaxaRecords.flatMap(taxon =>
      (taxon.records ?? [])
        .filter(r => r.lat != null && r.lng != null)
        .map(r => [r.lat, r.lng, 1.0])
    )
    console.log('🌡 HeatmapLayer points:', points.length)  // ← agregá esto


    if (points.length === 0) return


    // Create heatmap layer
    const heat = L.heatLayer(points, {
      radius: 25,
      blur: 20,
      maxZoom: 10,
      gradient: {
        0.2: '#3B82F6',
        0.4: '#18A957',
        0.6: '#FBBF24',
        0.8: '#F5A623',
        1.0: '#E84C3D',
      }
    }).addTo(map)

    return () => {
      map.removeLayer(heat)
    }
  }, [map, allTaxaRecords])

  return null
}

function OccurrenceMarker({ occ, color, taxonName }) {
  const [popupData, setPopupData] = useState(null)
  const [loadingDOI, setLoadingDOI] = useState(false)

  async function handleClick() {
    if (popupData) return
    setLoadingDOI(true)
    const dataset = await getDatasetDOI(occ.datasetKey)
    setPopupData(dataset)
    setLoadingDOI(false)
  }

  return (
    <CircleMarker
      center={[occ.lat, occ.lng]}
      radius={4}
      pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 1 }}
      eventHandlers={{ click: handleClick }}
    >
      <Popup>
        <div style={{ fontSize: 12, lineHeight: 1.6, minWidth: 200 }}>
          <div style={{ fontWeight: 600, fontStyle: 'italic', marginBottom: 4 }}>
            {occ.scientificName || taxonName}
          </div>
          {occ.eventDate && (
            <div style={{ color: '#6B7280', fontSize: 11 }}>
              📅 {occ.eventDate?.slice(0, 10)}
            </div>
          )}
          <div style={{ marginTop: 6 }}>
            <a
              href={`https://www.gbif.org/occurrence/${occ.key}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#18A957', fontSize: 11, textDecoration: 'none' }}
            >
              🔗 View on GBIF (ID: {occ.key})
            </a>
          </div>
          {loadingDOI && (
            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>
              Loading dataset info...
            </div>
          )}
          {popupData && (
            <div style={{ marginTop: 6, borderTop: '1px solid #E5E7EB', paddingTop: 6 }}>
              <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 2 }}>
                Dataset: {popupData.title}
              </div>
              {popupData.doi && (
                <a
                  href={`https://doi.org/${popupData.doi}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#3B82F6', fontSize: 10, textDecoration: 'none' }}
                >
                  📄 DOI: {popupData.doi}
                </a>
              )}
            </div>
          )}
        </div>
      </Popup>
    </CircleMarker >
  )
}

// ─── Cards ───────────────────────────────────────────────────────────────────
function MapCard({ polygon, center, zoom, allTaxaRecords, fullWidth = false, ndviData, wdpaData, bufferData }) {
  const mapCenter = center || [-20, -60]
  const mapZoom = zoom ?? 7
  const hasPolygon = polygon && polygon.length >= 3
  const presentTaxa = (allTaxaRecords ?? []).filter(t => t.inPolygon > 0)
  const [viewMode, setViewMode] = useState('points')

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Project Area</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {hasPolygon && (
            <>
              {[
                { id: 'points', label: '📍 Points' },
                { id: 'heatmap', label: '🌡 Heatmap' },
                { id: 'ndvi', label: '🛰 NDVI' },
                { id: 'protected', label: '🛡 Areas' },
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11,
                    fontWeight: 600, border: '1px solid #E5E7EB', cursor: 'pointer',
                    background: viewMode === mode.id ? '#18A957' : '#F9FAFB',
                    color: viewMode === mode.id ? 'white' : '#6B7280',
                  }}>
                  {mode.label}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
      <div className={`map-wrap${fullWidth ? ' full-width' : ''}`} style={{ position: 'relative' }}>
        <MapContainer
          key={mapCenter.toString() + mapZoom}
          center={mapCenter}
          zoom={mapZoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {hasPolygon && (
            <Polygon
              positions={polygon}
              pathOptions={{
                color: '#ffffff', weight: 2,
                fillColor: '#ffffff', fillOpacity: 0.04
              }}
            />
          )}
          {/* Buffer zone polygon */}
          {hasPolygon && bufferData?.polygon && (
            <Polygon
              positions={bufferData.polygon}
              pathOptions={{
                color: '#F5A623', weight: 1.5,
                fillColor: '#F5A623', fillOpacity: 0.06,
                dashArray: '6 4',
              }}
            />
          )}
          {hasPolygon && (viewMode === 'points' || viewMode === 'protected') && allTaxaRecords?.flatMap((taxon, ti) => {
            const color = TAXON_COLORS[taxon.name] || '#18A957'
            return (taxon.records ?? []).map((occ, i) => (
              (occ.lat != null && occ.lng != null) ? (
                <OccurrenceMarker
                  key={`occ-${ti}-${i}`}
                  occ={occ}
                  color={color}
                  taxonName={taxon.name}
                />
              ) : null
            ))
          })}
          {hasPolygon && viewMode === 'heatmap' && (
            <HeatmapLayer allTaxaRecords={allTaxaRecords} />
          )}

          {/* NDVI Layer */}
          {hasPolygon && viewMode === 'ndvi' && ndviData && (
            <NdviLayer polygon={polygon} ndviData={ndviData} />
          )}

          {/* Protected Areas Layer */}
          {hasPolygon && viewMode === 'protected' && wdpaData && (
            <WdpaLayer wdpaData={wdpaData} polygon={polygon} />
          )}
        </MapContainer>

        {presentTaxa.length > 0 && viewMode === 'points' && (
          <div className="map-legend">
            {presentTaxa.map(t => (
              <div key={t.name} className="map-legend-row">
                <span
                  className="map-legend-dot"
                  style={{ background: TAXON_COLORS[t.name] || '#18A957' }}
                />
                <span className="map-legend-emoji">{t.emoji}</span>
                <span className="map-legend-name">{t.name}</span>
                <span className="map-legend-count">{t.inPolygon}</span>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'heatmap' && hasPolygon && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8, right: 8, zIndex: 1000,
            background: 'rgba(255,251,235,0.95)',
            border: '1px solid #FDE68A',
            borderRadius: 6, padding: '5px 10px',
            fontSize: 9, color: '#92400E',
            lineHeight: 1.4,
          }}>
            ⚠ Heatmap reflects GBIF observation density, not confirmed habitat connectivity.
          </div>
        )}
      </div>
    </div>
  )
}

function RiskScoreCard({ riskScore }) {
  const score = riskScore?.score ?? 72
  const category = riskScore?.category ?? 'High Risk'
  const components = riskScore?.components

  const scoreColor = score >= 76 ? '#E84C3D' :
    score >= 51 ? '#F5A623' :
      score >= 26 ? '#FBBF24' : '#18A957'

  const maxTotal = 100
  const breakdown = components ? [
    { label: 'Baseline', value: components.base, max: 30, color: '#6366F1', desc: 'Conservative precautionary baseline' },
    { label: 'Species Richness', value: components.richness, max: 20, color: '#18A957', desc: `${riskScore.taxaFound} taxa detected (5pts each, max 20)` },
    { label: 'Occurrence Density', value: components.density, max: 30, color: '#F5A623', desc: `${riskScore.totalInPolygon?.toLocaleString('en-US')} records in polygon` },
    { label: 'Literature Gap', value: components.literature, max: 20, color: '#E84C3D', desc: `${riskScore.papers} papers found (fewer = higher uncertainty)` },
  ] : null

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Biodiversity Risk Score</div>
      </div>
      <Gauge value={score} max={100} />
      <div className="gauge-desc">
        {riskScore ? (
          <>
            This area shows <strong>{category.toLowerCase()}</strong> ecological sensitivity
            based on observational evidence within your project boundary.
          </>
        ) : (
          <>The area presents <strong>high ecological sensitivity</strong> mainly due to threatened species,
            ecosystem importance and moderate data uncertainty.</>
        )}
      </div>

      {/* Score breakdown */}
      {breakdown && (
        <div style={{ padding: '8px 12px 4px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Score breakdown
          </div>
          {breakdown.map((b, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                <span style={{ color: '#6B7280' }} title={b.desc}>{b.label} ⓘ</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1F2937' }}>
                  {b.value}/{b.max}
                </span>
              </div>
              <div style={{ height: 5, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: b.color,
                  width: `${(b.value / b.max) * 100}%`,
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          ))}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            borderTop: '1px solid #E5E7EB', paddingTop: 6, marginTop: 4,
            fontSize: 10, fontWeight: 700,
          }}>
            <span style={{ color: '#1F2937' }}>Total</span>
            <span style={{ color: scoreColor, fontFamily: 'monospace' }}>{score}/100</span>
          </div>
        </div>
      )}

      <div style={{
        margin: '4px 12px 12px', padding: '6px 10px',
        background: '#FFFBEB', border: '1px solid #FDE68A',
        borderRadius: 6, fontSize: 9, color: '#92400E', lineHeight: 1.5,
      }}>
        ⚠ Screening-grade assessment only. Does not replace formal Environmental &amp; Social Impact Assessments (ESIA) or field surveys.
      </div>
    </div>
  )
}

function KeyFindingsCard({ data, loading }) {
  const recentRecords = data?.whales?.total
  const lastDate = recordDate(mostRecentOccurrence(data?.whales?.results))
  const wdpa = data?.wdpa

  // Protected areas — real from WDPA if available
  const protectedAreasVal = loading
    ? <Spinner />
    : wdpa != null
      ? <span style={{ color: '#18A957', fontWeight: 600 }}>{wdpa.total}</span>
      : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }} title="Add VITE_WDPA_TOKEN to enable">—</span>

  const protectedAreasSub = wdpa?.total > 0
    ? <div style={{ fontSize: 9, color: '#18A957', marginTop: 2 }}>
      {wdpa.areas.slice(0, 2).map((a, i) => (
        <div key={i}>🛡 {a.name} ({a.iucnCategory})</div>
      ))}
    </div>
    : null

  const naField = (tooltip) => (
    <span style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: 11 }}
      title={tooltip}>
      — <span style={{ fontSize: 9 }}>ⓘ</span>
    </span>
  )

  const items = [
    {
      dot: '🔴',
      label: 'Threatened species',
      val: naField('Requires IUCN Red List integration'),
    },
    {
      dot: '🟠',
      label: 'Endemic species',
      val: naField('Requires regional endemic species database'),
    },
    {
      dot: '🟢',
      label: 'KBAs intersected',
      val: naField('Requires KBA polygon database'),
    },
    {
      dot: '🛡',
      label: 'Protected areas',
      val: protectedAreasVal,
      sub: protectedAreasSub,
    },
    {
      dot: '🟡',
      label: 'Data uncertainty',
      val: <span style={{ color: '#F5A623', fontWeight: 500 }}>Medium</span>,
    },
    {
      dot: '📍',
      label: 'Recent records',
      val: loading ? <Spinner /> : (recentRecords != null ? fmt(recentRecords) : '—'),
    },
    {
      dot: '🕒',
      label: 'Last GBIF record',
      val: loading ? <Spinner /> : (lastDate || '—'),
    },
  ]

  return (
    <div className="card">
      <div className="card-head"><div className="card-title">Key Findings</div></div>
      <div>
        {items.map((f, i) => (
          <div className="finding" key={i}>
            <div className="finding-label">
              <span className="finding-dot">{f.dot}</span>
              <span>{f.label}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="finding-val">{f.val}</div>
              {f.sub}
            </div>
          </div>
        ))}
      </div>
      {wdpa != null && (
        <div style={{
          margin: '0 12px 12px',
          padding: '6px 10px',
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: 6,
          fontSize: 9,
          color: '#1D4ED8'
        }}>
          🛡 Protected areas data from WDPA API · Real data
        </div>
      )}
    </div>
  )
}

function SpeciesRichnessCard({ data, loading }) {
  const aves = data?.avesCount?.count
  const mam = data?.mammaliaCount?.count
  const polygonCount = data?.polygonCount
  const polygonSample = data?.polygonSample
  const hasPolygonData = polygonCount != null && polygonCount > 0
  const taxaInPolygon = data?.taxaInPolygon?.filter(t => t.inPolygon > 0) ?? []
  // Temporal baseline — records by year
  const recordsByYear = useMemo(() => {
    const allRecords = data?.taxaInPolygon?.flatMap(t => t.records ?? []) ?? []
    const yearMap = {}
    allRecords.forEach(r => {
      const year = r.eventDate?.slice(0, 4)
      if (year && year >= '2000' && year <= '2026') {
        yearMap[year] = (yearMap[year] ?? 0) + 1
      }
    })
    return Object.entries(yearMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, count]) => ({ year, count }))
  }, [data])

  const bigValue = hasPolygonData
    ? fmt(polygonCount)
    : (aves != null || mam != null) ? fmt((aves ?? 0) + (mam ?? 0)) : '214'

  const subtitle = hasPolygonData
    ? 'occurrence records inside polygon boundary'
    : (loading || (aves == null && mam == null))
      ? 'species observed in area'
      : 'Aves + Mammalia records (country)'

  // Country totals for representation %
  const countryTotals = {
    Aves: data?.avesCount?.count ?? null,
    Mammalia: data?.mammaliaCount?.count ?? null,
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Species Richness (Observed)</div>
      </div>
      <div className="stat-big">
        {loading ? <Spinner /> : bigValue}
      </div>
      <div className="stat-sub">{subtitle}</div>
      {hasPolygonData && (
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, lineHeight: 1.4 }}>
          Sample of up to {fmt(polygonSample ?? 300)} records per taxon · {taxaInPolygon.length} taxa detected
        </div>
      )}

      {/* Representation % table */}
      {hasPolygonData && taxaInPolygon.length > 0 && (
        <div style={{ height: 80, marginTop: 10 }}>
          <ResponsiveContainer>
            <BarChart
              data={taxaInPolygon.map(t => ({ name: t.emoji, value: t.inPolygon, label: t.name }))}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            >
              <YAxis hide />
              <RTooltip
                contentStyle={{ fontSize: 11, padding: 6, border: '1px solid #E5E7EB', borderRadius: 6 }}
                formatter={(value, name, props) => [fmt(value), props.payload.label]}
                labelFormatter={() => ''}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {taxaInPolygon.map((t, i) => (
                  <Cell key={i} fill={TAXON_COLORS[t.name] || '#18A957'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {recordsByYear.length > 1 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Records by year (temporal baseline)
          </div>
          <div style={{ height: 80 }}>
            <ResponsiveContainer>
              <BarChart data={recordsByYear} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                <YAxis hide />
                <RTooltip
                  contentStyle={{ fontSize: 11, padding: 6, border: '1px solid #E5E7EB', borderRadius: 6 }}
                  formatter={(value) => [value, 'records']}
                  labelFormatter={(label) => `Year: ${label}`}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]} fill="#18A957" opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 4 }}>
            Based on eventDate field from GBIF occurrence records
          </div>
        </div>
      )}

      {hasPolygonData && taxaInPolygon.length > 0 && (
        <div style={{ height: 80, marginTop: 10 }}>
          <ResponsiveContainer>
            <BarChart
              data={taxaInPolygon.map(t => ({ name: t.emoji, value: t.inPolygon, label: t.name }))}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            >
              <YAxis hide />
              <RTooltip
                contentStyle={{ fontSize: 11, padding: 6, border: '1px solid #E5E7EB', borderRadius: 6 }}
                formatter={(value, name, props) => [fmt(value), props.payload.label]}
                labelFormatter={() => ''}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {taxaInPolygon.map((t, i) => (
                  <Cell key={i} fill={TAXON_COLORS[t.name] || '#18A957'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

        </div>
      )}
    </div>
  )
}

function EcosystemSensitivityCard({ data }) {
  const ndvi = data?.ndvi

  if (!ndvi) {
    return (
      <div className="card">
        <div className="card-head"><div className="card-title">Ecosystem Sensitivity</div></div>
        <div className="stat-illus">🪸</div>
        <div className="stat-val warn">High</div>
        <div className="stat-desc">
          Area includes ecologically important marine habitats and high productivity zones.
        </div>
        <a className="card-link" style={{ marginTop: 'auto', paddingTop: 12 }}>View habitats →</a>
      </div>
    )
  }

  const meanColor = ndvi.mean > 0.4 ? '#18A957' :
    ndvi.mean > 0.2 ? '#F5A623' : '#E84C3D'

  const trendIcon = ndvi.trend === 'Improving' ? '↗' :
    ndvi.trend === 'Declining' ? '↘' : '→'

  const trendColor = ndvi.trend === 'Improving' ? '#18A957' :
    ndvi.trend === 'Declining' ? '#E84C3D' : '#F5A623'

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Vegetation Health</div>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 7px',
          borderRadius: 999, background: '#EFF6FF',
          color: '#1D4ED8', border: '1px solid #BFDBFE'
        }}>🛰 Sentinel-2</span>
      </div>

      {/* NDVI mean */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>NDVI Mean</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: meanColor }}>
            {ndvi.mean.toFixed(3)}
          </span>
          <span style={{ fontSize: 12, color: '#6B7280' }}>{ndvi.interpretation}</span>
        </div>

        {/* NDVI bar */}
        <div style={{
          height: 6, background: '#E5E7EB', borderRadius: 3,
          overflow: 'hidden', margin: '8px 0'
        }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: `linear-gradient(to right, #E84C3D, #F5A623, #18A957)`,
            width: `${Math.min(Math.max((ndvi.mean + 1) / 2 * 100, 0), 100)}%`,
          }} />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 8, color: '#9CA3AF'
        }}>
          <span>-1 (water)</span>
          <span>0</span>
          <span>+1 (dense veg)</span>
        </div>
      </div>

      {/* Trend stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 8, padding: '12px 16px'
      }}>
        <div style={{
          background: '#F9FAFB', borderRadius: 6,
          padding: '8px 10px'
        }}>
          <div style={{ fontSize: 9, color: '#9CA3AF', marginBottom: 2 }}>Trend</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: trendColor }}>
            {trendIcon} {ndvi.trend}
          </div>
          <div style={{ fontSize: 9, color: '#9CA3AF' }}>
            {ndvi.slope > 0 ? '+' : ''}{ndvi.slope.toFixed(4)}/period
          </div>
        </div>
        <div style={{
          background: '#F9FAFB', borderRadius: 6,
          padding: '8px 10px'
        }}>
          <div style={{ fontSize: 9, color: '#9CA3AF', marginBottom: 2 }}>ΔYoY</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: ndvi.deltaYoY >= 0 ? '#18A957' : '#E84C3D' }}>
            {ndvi.deltaYoY >= 0 ? '+' : ''}{ndvi.deltaYoY.toFixed(3)}
          </div>
          <div style={{ fontSize: 9, color: '#9CA3AF' }}>
            {ndvi.quarterly?.length ?? 0} periods
          </div>
        </div>
      </div>

      <div style={{
        margin: '0 16px 12px',
        padding: '5px 8px',
        background: '#F0FDF4', border: '1px solid #BBF7D0',
        borderRadius: 5, fontSize: 9, color: '#166534'
      }}>
        📅 2023–2024 · Sentinel-2 L2A · quarterly composites
      </div>
    </div>
  )
}

const MITIGATION_ACTIONS = {
  'Wind Energy': [
    { id: 'seasonal', label: 'Seasonal construction restriction', desc: 'Avoid construction during bird migration season (Sep–Nov)', scoreReduction: 8 },
    { id: 'buffer', label: 'Add 500m buffer zone', desc: 'Restrict activity within 500m of protected areas', scoreReduction: 6 },
    { id: 'monitoring', label: 'Implement bird monitoring', desc: 'Real-time radar monitoring for bird activity', scoreReduction: 4 },
  ],
  'Mining & Extractives': [
    { id: 'water', label: 'Water management plan', desc: 'Zero discharge policy for process water', scoreReduction: 10 },
    { id: 'rehab', label: 'Progressive rehabilitation', desc: 'Restore habitat as extraction progresses', scoreReduction: 8 },
    { id: 'buffer', label: 'Riparian buffer zones', desc: 'Maintain 200m undisturbed buffer along waterways', scoreReduction: 6 },
  ],
  'Agriculture & Forestry': [
    { id: 'corridors', label: 'Wildlife corridors', desc: 'Maintain 10% of area as native vegetation strips', scoreReduction: 9 },
    { id: 'pesticides', label: 'Reduce pesticide use', desc: 'Integrated pest management to protect pollinators', scoreReduction: 7 },
    { id: 'native', label: 'Native species planting', desc: 'Replace exotic species with native plants', scoreReduction: 5 },
  ],
  'Infrastructure': [
    { id: 'culverts', label: 'Wildlife culverts', desc: 'Install underpasses every 500m for wildlife crossing', scoreReduction: 8 },
    { id: 'lighting', label: 'Dark sky lighting', desc: 'Directional lighting to reduce nocturnal disturbance', scoreReduction: 5 },
    { id: 'noise', label: 'Noise barriers', desc: 'Install barriers in sensitive habitat areas', scoreReduction: 4 },
  ],
  'Hydroelectric': [
    { id: 'flow', label: 'Environmental flow regime', desc: 'Maintain minimum ecological flow downstream', scoreReduction: 12 },
    { id: 'passage', label: 'Fish passage facility', desc: 'Install fish ladder or bypass channel', scoreReduction: 10 },
    { id: 'riparian', label: 'Riparian restoration', desc: 'Restore 1km of riparian habitat upstream', scoreReduction: 6 },
  ],
  'Oil & Gas': [
    { id: 'spill', label: 'Enhanced spill prevention', desc: 'Double-hull infrastructure and rapid response plan', scoreReduction: 10 },
    { id: 'marine', label: 'Marine mammal observer', desc: 'Halt operations when mammals detected within 500m', scoreReduction: 7 },
    { id: 'seasonal', label: 'Seasonal drilling restrictions', desc: 'No drilling during whale calving season', scoreReduction: 8 },
  ],
}

function HumanPressureCard({ data, analysisProject }) {
  const sector = analysisProject?.sector || 'Wind Energy'
  const actions = MITIGATION_ACTIONS[sector] || MITIGATION_ACTIONS['Wind Energy']
  const baseScore = data?.riskScore?.score ?? 72
  const [selected, setSelected] = useState([])

  const toggleAction = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const reduction = actions
    .filter(a => selected.includes(a.id))
    .reduce((s, a) => s + a.scoreReduction, 0)

  const mitigatedScore = Math.max(baseScore - reduction, 0)

  const getColor = (score) =>
    score >= 76 ? '#E84C3D' :
      score >= 51 ? '#F5A623' :
        score >= 26 ? '#FBBF24' : '#18A957'

  const getCategory = (score) =>
    score >= 76 ? 'Critical Risk' :
      score >= 51 ? 'High Risk' :
        score >= 26 ? 'Moderate Risk' : 'Low Risk'

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Mitigation Scenarios</div>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 7px',
          borderRadius: 999, background: '#F0FDF4',
          color: '#166534', border: '1px solid #BBF7D0'
        }}>{sector}</span>
      </div>

      {/* Score comparison */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', background: '#F9FAFB',
        borderBottom: '1px solid #E5E7EB'
      }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 9, color: '#9CA3AF', marginBottom: 2 }}>Current</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: getColor(baseScore) }}>
            {baseScore}
          </div>
          <div style={{ fontSize: 9, color: getColor(baseScore) }}>{getCategory(baseScore)}</div>
        </div>

        {selected.length > 0 && (
          <>
            <div style={{ fontSize: 18, color: '#18A957' }}>→</div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 9, color: '#9CA3AF', marginBottom: 2 }}>Mitigated</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: getColor(mitigatedScore) }}>
                {mitigatedScore}
              </div>
              <div style={{ fontSize: 9, color: '#18A957' }}>-{reduction} pts</div>
            </div>
          </>
        )}
      </div>

      {/* Actions list */}
      <div style={{ padding: '8px 12px', flex: 1, overflowY: 'auto' }}>
        {actions.map(action => (
          <div
            key={action.id}
            onClick={() => toggleAction(action.id)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '8px', borderRadius: 8, cursor: 'pointer',
              marginBottom: 4, transition: 'all .15s',
              background: selected.includes(action.id) ? '#F0FDF4' : 'transparent',
              border: `1px solid ${selected.includes(action.id) ? '#BBF7D0' : 'transparent'}`,
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
              background: selected.includes(action.id) ? '#18A957' : '#E5E7EB',
              border: `1.5px solid ${selected.includes(action.id) ? '#18A957' : '#D1D5DB'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: 'white',
            }}>
              {selected.includes(action.id) ? '✓' : ''}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#1F2937', marginBottom: 1 }}>
                {action.label}
              </div>
              <div style={{ fontSize: 10, color: '#9CA3AF', lineHeight: 1.4 }}>
                {action.desc}
              </div>
            </div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#18A957',
              flexShrink: 0, marginTop: 2
            }}>
              -{action.scoreReduction}
            </div>
          </div>
        ))}
      </div>

      {selected.length === 0 && (
        <div style={{
          margin: '0 12px 12px', padding: '6px 10px',
          background: '#F9FAFB', borderRadius: 6,
          fontSize: 9, color: '#9CA3AF', textAlign: 'center'
        }}>
          Select actions to see mitigated risk score
        </div>
      )}
    </div>
  )
}
function ThreatenedSpeciesCard({ data, loading }) {
  const queriedAt = data?.queriedAt
    ? data.queriedAt.toLocaleDateString()
    : new Date().toLocaleDateString()

  // Build species list from real taxaInPolygon records
  const allRecords = data?.taxaInPolygon
    ?.filter(t => t.inPolygon > 0)
    ?.flatMap(t => (t.records ?? []).map(r => ({ ...r, taxonGroup: t.name, emoji: t.emoji })))
    ?? []

  // Get unique species with most recent record
  const speciesMap = {}
  for (const r of allRecords) {
    const key = r.scientificName || r.taxonGroup
    if (!speciesMap[key]) {
      speciesMap[key] = {
        scientificName: r.scientificName || r.taxonGroup,
        taxonGroup: r.taxonGroup,
        emoji: r.emoji,
        lastRecord: r.eventDate?.slice(0, 10) ?? '—',
        count: 0,
      }
    }
    speciesMap[key].count++
    if (r.eventDate && r.eventDate > (speciesMap[key].lastRecord || '')) {
      speciesMap[key].lastRecord = r.eventDate.slice(0, 10)
    }
  }

  const species = Object.values(speciesMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const totalSpecies = Object.keys(speciesMap).length

  if (loading || !data?.taxaInPolygon) {
    return (
      <div className="card">
        <div className="card-head">
          <div className="card-title">Species Records in Polygon</div>
        </div>
        <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF' }}>
          <Spinner /> Loading...
        </div>
      </div>
    )
  }

  if (species.length === 0) {
    return (
      <div className="card">
        <div className="card-head">
          <div className="card-title">Species Records in Polygon</div>
        </div>
        <div style={{ padding: 32, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
          No species records found in this polygon.<br />
          <span style={{ fontSize: 11 }}>Try drawing a larger area or a different location.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Species Records in Polygon</div>
        <span style={{ fontSize: 11, color: '#6B7280' }}>
          {totalSpecies} unique species · top {species.length} shown
        </span>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Species</th>
              <th>Group</th>
              <th>Records</th>
              <th>Last Record</th>
            </tr>
          </thead>
          <tbody>
            {species.map((s, i) => (
              <tr key={i}>
                <td>
                  <span className="sp-icon">{s.emoji}</span>
                  <span className="sp-sci">{s.scientificName}</span>
                </td>
                <td style={{ fontSize: 11, color: '#6B7280' }}>{s.taxonGroup}</td>
                <td>
                  <span style={{
                    background: '#F0FDF4', color: '#18A957',
                    border: '1px solid #BBF7D0',
                    borderRadius: 999, padding: '1px 8px',
                    fontSize: 11, fontWeight: 600,
                  }}>
                    {s.count}
                  </span>
                </td>
                <td style={{ fontSize: 11, color: '#6B7280' }}>{s.lastRecord}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-note">
        Real GBIF occurrence records within polygon boundary · Last queried: {queriedAt} ·
        Sample of up to 300 records per taxon
      </div>
      <div style={{
        margin: '0 12px 12px',
        padding: '6px 10px',
        background: '#FFFBEB', border: '1px solid #FDE68A',
        borderRadius: 6, fontSize: 9, color: '#92400E',
      }}>
        ⚠ IUCN conservation status not available in this version.
        Species shown are from georeferenced GBIF occurrence records only.
      </div>
    </div>
  )
}

function BiodiversityMatrixCard({ data }) {
  const totalInPolygon = data?.polygonCount ?? 0
  const taxaFound = data?.taxaInPolygon?.filter(t => t.inPolygon > 0).length ?? 0
  const ndviMean = data?.ndvi?.mean ?? null

  // Importance: based on occurrence density and taxa richness (0-1)
  const importance = Math.min(
    (totalInPolygon / 500) * 0.6 + (taxaFound / 14) * 0.4,
    1
  )

  // Intactness: based on NDVI (0-1), scaled from [-1,1] to [0,1]
  const intactness = ndviMean !== null
    ? Math.min(Math.max((ndviMean + 1) / 2, 0), 1)
    : null

  // Determine quadrant
  const getQuadrant = () => {
    if (intactness === null) return null
    if (importance >= 0.5 && intactness >= 0.5) return 'I'
    if (importance >= 0.5 && intactness < 0.5) return 'II'
    if (importance < 0.5 && intactness >= 0.5) return 'III'
    return 'IV'
  }

  const quadrant = getQuadrant()

  const QUADRANTS = {
    'I': { label: 'Priority Conservation Area', color: '#E84C3D', bg: '#FEF2F2', desc: 'High biodiversity importance and intactness. Priority area to be protected. Maximum risk for new projects.' },
    'II': { label: 'Degraded High-Value Area', color: '#F5A623', bg: '#FFFBEB', desc: 'High biodiversity importance but already degraded. High effectiveness of nature-positive restoration activities expected.' },
    'III': { label: 'Suitable for Development', color: '#18A957', bg: '#F0FDF4', desc: 'Low biodiversity importance and high intactness. Low conflict with other activities — suitable for renewable energy or infrastructure projects.' },
    'IV': { label: 'Restoration Opportunity', color: '#6B7280', bg: '#F9FAFB', desc: 'Low biodiversity importance and intactness. Large potential for improvement through restoration activities.' },
  }

  const q = quadrant ? QUADRANTS[quadrant] : null

  // Position dot on matrix (percentage from bottom-left)
  const dotX = intactness !== null ? intactness * 100 : 50
  const dotY = (1 - importance) * 100
  const [showMatrixInfo, setShowMatrixInfo] = useState(false)

  const MatrixInfoModal = () => (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={() => setShowMatrixInfo(false)}>
      <div style={{
        background: 'white', borderRadius: 12, padding: 24,
        width: 440, maxWidth: '90vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1F2937' }}>
            Biodiversity Context Matrix — Methodology
          </div>
          <button type="button" onClick={() => setShowMatrixInfo(false)} style={{
            background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: '#9CA3AF',
          }}>×</button>
        </div>

        <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.7 }}>
          <p style={{ marginBottom: 12 }}>
            The matrix positions your project area across two axes adapted from the
            GBNAT (Think Nature) biodiversity assessment framework.
          </p>

          <div style={{ marginBottom: 12 }}>
            <strong style={{ color: '#1F2937' }}>Importance axis (vertical)</strong>
            <p style={{ margin: '4px 0 0' }}>
              Calculated from GBIF occurrence data within the polygon:
              60% weighted by occurrence density (records per km²) +
              40% weighted by taxa richness (number of taxonomic groups detected out of 14).
            </p>
          </div>

          <div style={{ marginBottom: 12 }}>
            <strong style={{ color: '#1F2937' }}>Intactness axis (horizontal)</strong>
            <p style={{ margin: '4px 0 0' }}>
              Derived from Sentinel-2 NDVI mean, scaled from [-1, +1] to [0, 1].
              Higher NDVI indicates denser, healthier vegetation and greater ecosystem intactness.
            </p>
          </div>

          <div style={{ marginBottom: 12 }}>
            <strong style={{ color: '#1F2937' }}>Quadrant thresholds</strong>
            <p style={{ margin: '4px 0 0' }}>
              Both axes are divided at 0.5 (50%). Areas above 0.5 on importance
              are considered high-value biodiversity areas. Areas above 0.5 on
              intactness are considered ecologically intact.
            </p>
          </div>

          <div style={{
            background: '#FFFBEB', border: '1px solid #FDE68A',
            borderRadius: 6, padding: '8px 10px', fontSize: 10, color: '#92400E',
          }}>
            ⚠ This is a proxy-based screening tool. Importance uses observational
            GBIF records (up to 300/taxon) which may reflect sampling bias.
            Intactness uses quarterly NDVI composites which may not capture
            seasonal variation. Field validation is recommended.
          </div>
        </div>

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button type="button" onClick={() => setShowMatrixInfo(false)} style={{
            padding: '8px 20px', background: '#18A957', color: 'white',
            border: 'none', borderRadius: 6, fontSize: 12,
            fontWeight: 600, cursor: 'pointer',
          }}>Close</button>
        </div>
      </div>
    </div>
  )
  return (
    <>
      {showMatrixInfo && <MatrixInfoModal />}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Biodiversity Context Matrix</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 7px',
              borderRadius: 999, background: '#F3F4F6',
              color: '#6B7280', border: '1px solid #E5E7EB'
            }}>GBNAT methodology</span>
            <button
              onClick={() => { console.log('ℹ clicked'); setShowMatrixInfo(true) }}
              style={{
                width: 20, height: 20, borderRadius: '50%',
                background: '#E5E7EB', border: 'none',
                fontSize: 11, cursor: 'pointer', color: '#6B7280',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700,
              }}
              title="How is this calculated?"
            >ℹ</button>
          </div>
        </div>

        <div style={{ padding: '12px 16px', display: 'flex', gap: 16 }}>
          {/* Matrix grid */}
          <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
            {/* Grid lines */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              border: '1px solid #E5E7EB',
            }}>
              {/* Quadrant I — top right */}
              <div style={{ background: '#FEF2F2', borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB', order: 2 }} />
              {/* Quadrant II — top left */}
              <div style={{ background: '#FFFBEB', borderBottom: '1px solid #E5E7EB', order: 1 }} />
              {/* Quadrant III — bottom right */}
              <div style={{ background: '#F0FDF4', borderRight: '1px solid #E5E7EB', order: 4 }} />
              {/* Quadrant IV — bottom left */}
              <div style={{ background: '#F9FAFB', order: 3 }} />
            </div>

            {/* Quadrant labels */}
            <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 8, fontWeight: 700, color: '#E84C3D' }}>I</div>
            <div style={{ position: 'absolute', top: 4, left: 4, fontSize: 8, fontWeight: 700, color: '#F5A623' }}>II</div>
            <div style={{ position: 'absolute', bottom: 4, right: 4, fontSize: 8, fontWeight: 700, color: '#18A957' }}>III</div>
            <div style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 8, fontWeight: 700, color: '#6B7280' }}>IV</div>

            {/* Project dot */}
            {intactness !== null && (
              <div style={{
                position: 'absolute',
                left: `${dotX}%`,
                top: `${dotY}%`,
                transform: 'translate(-50%, -50%)',
                width: 12, height: 12,
                borderRadius: '50%',
                background: q?.color ?? '#06152B',
                border: '2px solid white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                zIndex: 1,
              }} title="Your project area" />
            )}

            {/* Axis labels */}
            <div style={{
              position: 'absolute', bottom: -18, left: 0, right: 0,
              textAlign: 'center', fontSize: 8, color: '#9CA3AF',
            }}>← Intactness (NDVI) →</div>
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: -22,
              display: 'flex', alignItems: 'center',
              fontSize: 8, color: '#9CA3AF',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
            }}>← Importance →</div>
          </div>

          {/* Right side info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {!data?.polygonCount ? (
              <div style={{ fontSize: 11, color: '#9CA3AF', paddingTop: 8 }}>
                Run an analysis to see your project's biodiversity context.
              </div>
            ) : intactness === null ? (
              <div style={{ fontSize: 11, color: '#9CA3AF', paddingTop: 8 }}>
                NDVI data required for full matrix analysis. Enable Sentinel-2 integration.
              </div>
            ) : (
              <>
                <div style={{
                  display: 'inline-block',
                  padding: '3px 10px', borderRadius: 999,
                  background: q?.bg, border: `1px solid ${q?.color}40`,
                  fontSize: 11, fontWeight: 700, color: q?.color,
                  marginBottom: 8,
                }}>
                  Quadrant {quadrant} — {q?.label}
                </div>
                <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.6, marginBottom: 8 }}>
                  {q?.desc}
                </p>
                <div style={{ fontSize: 10, color: '#9CA3AF' }}>
                  <div>Importance: {(importance * 100).toFixed(0)}% ({totalInPolygon} records · {taxaFound} taxa)</div>
                  <div>Intactness: {(intactness * 100).toFixed(0)}% (NDVI {ndviMean?.toFixed(3)})</div>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{
          margin: '0 12px 12px', padding: '6px 10px',
          background: '#F9FAFB', borderRadius: 6,
          fontSize: 9, color: '#9CA3AF', lineHeight: 1.5,
        }}>
          Methodology adapted from GBNAT (Think Nature). Importance = GBIF occurrence density + taxa richness.
          Intactness = Sentinel-2 NDVI proxy.
        </div>
      </div>
    </>
  )
}

// Haversine formula to calculate polygon area in km²
function calcPolygonAreaKm2(polygon) {
  if (!polygon || polygon.length < 3) return null
  const R = 6371 // Earth radius km
  let area = 0
  const n = polygon.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const lat1 = polygon[i][0] * Math.PI / 180
    const lat2 = polygon[j][0] * Math.PI / 180
    const lng1 = polygon[i][1] * Math.PI / 180
    const lng2 = polygon[j][1] * Math.PI / 180
    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2))
  }
  area = Math.abs(area) * R * R / 2
  return Math.round(area * 100) / 100
}

function ScenarioAnalysisCard({ data }) {
  const ndvi = data?.ndvi
  const baseScore = data?.riskScore?.score ?? null
  const currentNdvi = ndvi?.mean ?? null
  const slope = ndvi?.slope ?? 0
  const [showScenarioInfo, setShowScenarioInfo] = useState(false)


  if (!baseScore || !ndvi) {
    return (
      <div className="card">
        <div className="card-head"><div className="card-title">Scenario Analysis</div></div>
        <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>
          Run an analysis with NDVI data to see scenario projections.
        </div>
      </div>
    )
  }

  // Project NDVI 10 years forward under 3 scenarios
  const years = [0, 2, 5, 10]

  const scenarios = [
    {
      id: 'statusquo',
      label: 'Status Quo',
      desc: 'Current NDVI trend continues unchanged',
      color: '#F5A623',
      slopeMultiplier: 1,
    },
    {
      id: 'mitigation',
      label: 'Mitigation Applied',
      desc: 'Active habitat management reverses trend',
      color: '#18A957',
      slopeMultiplier: -2,
    },
    {
      id: 'degradation',
      label: 'Accelerated Degradation',
      desc: 'Increased pressure doubles decline rate',
      color: '#E84C3D',
      slopeMultiplier: 3,
    },
  ]

  // Calculate projected NDVI and risk score for each scenario/year
  const getProjectedScore = (ndviVal) => {
    if (ndviVal > 0.6) return Math.max(baseScore - 15, 10)
    if (ndviVal > 0.4) return Math.max(baseScore - 8, 10)
    if (ndviVal > 0.2) return baseScore
    if (ndviVal > 0.0) return Math.min(baseScore + 8, 100)
    return Math.min(baseScore + 15, 100)
  }

  const chartData = years.map(yr => {
    const point = { year: yr === 0 ? 'Now' : `+${yr}y` }
    scenarios.forEach(s => {
      const projNdvi = currentNdvi + (slope * s.slopeMultiplier * yr * 4) // 4 quarters/year
      point[s.id] = getProjectedScore(Math.max(-1, Math.min(1, projNdvi)))
    })
    return point
  })

  const getScoreColor = (score) =>
    score >= 76 ? '#E84C3D' : score >= 51 ? '#F5A623' : score >= 26 ? '#FBBF24' : '#18A957'

  return (
    <>
      {showScenarioInfo && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setShowScenarioInfo(false)}>
          <div style={{
            background: 'white', borderRadius: 12, padding: 24,
            width: 440, maxWidth: '90vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1F2937' }}>
                Scenario Analysis — Methodology
              </div>
              <button type="button" onClick={() => setShowScenarioInfo(false)} style={{
                background: 'none', border: 'none', fontSize: 20,
                cursor: 'pointer', color: '#9CA3AF',
              }}>×</button>
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.7 }}>
              <p style={{ marginBottom: 12 }}>
                Projects the biodiversity risk score 10 years forward under 3 scenarios
                based on extrapolation of the current Sentinel-2 NDVI trend.
              </p>
              <div style={{ marginBottom: 12 }}>
                <strong style={{ color: '#1F2937' }}>Status Quo</strong>
                <p style={{ margin: '4px 0 0' }}>Current NDVI slope continues unchanged.</p>
              </div>
              <div style={{ marginBottom: 12 }}>
                <strong style={{ color: '#1F2937' }}>Mitigation Applied</strong>
                <p style={{ margin: '4px 0 0' }}>Slope multiplied by -2 — active habitat management reverses the trend at double the rate.</p>
              </div>
              <div style={{ marginBottom: 12 }}>
                <strong style={{ color: '#1F2937' }}>Accelerated Degradation</strong>
                <p style={{ margin: '4px 0 0' }}>Slope multiplied by 3 — increased pressure triples the rate of vegetation decline.</p>
              </div>
              <div style={{ marginBottom: 12 }}>
                <strong style={{ color: '#1F2937' }}>Risk score projection</strong>
                <p style={{ margin: '4px 0 0' }}>
                  NDVI {'>'}0.6 → -15pts · NDVI 0.4-0.6 → -8pts ·
                  NDVI 0.2-0.4 → unchanged · NDVI 0-0.2 → +8pts · NDVI {'<'}0 → +15pts
                </p>
              </div>
              <div style={{
                background: '#FFFBEB', border: '1px solid #FDE68A',
                borderRadius: 6, padding: '8px 10px', fontSize: 10, color: '#92400E',
              }}>
                ⚠ Heuristic projections based on linear NDVI extrapolation. Not a predictive ecological model.
              </div>
            </div>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button type="button" onClick={() => setShowScenarioInfo(false)} style={{
                padding: '8px 20px', background: '#18A957', color: 'white',
                border: 'none', borderRadius: 6, fontSize: 12,
                fontWeight: 600, cursor: 'pointer',
              }}>Close</button>
            </div>
          </div>
        </div>
      )}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Scenario Analysis</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 7px',
              borderRadius: 999, background: '#EFF6FF',
              color: '#1D4ED8', border: '1px solid #BFDBFE'
            }}>NDVI-based · 10yr projection</span>
            <button
              type="button"
              onClick={() => setShowScenarioInfo(true)}
              style={{
                width: 20, height: 20, borderRadius: '50%',
                background: '#E5E7EB', border: 'none',
                fontSize: 11, cursor: 'pointer', color: '#6B7280',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700,
              }}
            >ℹ</button>
          </div>
        </div>

        <div style={{ padding: '8px 16px' }}>
          {/* Scenario summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {scenarios.map(s => {
              const endScore = chartData[chartData.length - 1][s.id]
              const delta = endScore - baseScore
              return (
                <div key={s.id} style={{
                  background: '#F9FAFB', borderRadius: 8, padding: '8px 10px',
                  border: `1px solid ${s.color}30`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: s.color, marginBottom: 2 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: getScoreColor(endScore) }}>
                    {endScore}
                  </div>
                  <div style={{ fontSize: 9, color: '#9CA3AF' }}>
                    in 10 years ({delta >= 0 ? '+' : ''}{delta} pts)
                  </div>
                </div>
              )
            })}
          </div>

          {/* Chart */}
          <div style={{ height: 140 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <YAxis domain={[0, 100]} hide />
                <RTooltip
                  contentStyle={{ fontSize: 11, padding: 6, border: '1px solid #E5E7EB', borderRadius: 6 }}
                  formatter={(value, name) => {
                    const s = scenarios.find(sc => sc.id === name)
                    return [value, s?.label ?? name]
                  }}
                />
                {scenarios.map(s => (
                  <Line
                    key={s.id}
                    type="monotone"
                    dataKey={s.id}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={{ r: 3, fill: s.color }}
                    strokeDasharray={s.id === 'statusquo' ? '4 2' : undefined}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
            {scenarios.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 20, height: 2, background: s.color, borderRadius: 1 }} />
                <span style={{ fontSize: 9, color: '#6B7280' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          margin: '0 12px 12px', padding: '6px 10px',
          background: '#FFFBEB', border: '1px solid #FDE68A',
          borderRadius: 6, fontSize: 9, color: '#92400E',
        }}>
          ⚠ Projections are heuristic estimates based on NDVI trend extrapolation. Not a predictive ecological model.
        </div>
      </div>
    </>
  )
}


function ImpactsCard({ data, analysisProject }) {
  const sector = analysisProject?.sector || 'Wind Energy'
  const totalInPolygon = data?.polygonCount ?? 0
  const taxaFound = data?.taxaInPolygon?.filter(t => t.inPolygon > 0) ?? []
  const ndvi = data?.ndvi
  const wdpa = data?.wdpa
  const riskScore = data?.riskScore

  // Calculate polygon area from records bbox (approximation)
  const allRecords = data?.taxaInPolygon?.flatMap(t => t.records ?? []) ?? []
  const lats = allRecords.map(r => r.lat).filter(Boolean)
  const lngs = allRecords.map(r => r.lng).filter(Boolean)
  const areaKm2 = lats.length > 2
    ? calcPolygonAreaKm2(lats.map((lat, i) => [lat, lngs[i]]))
    : null

  const getImpactColor = (level) => ({
    'Significant': { bg: '#FEF2F2', color: '#E84C3D', border: '#FECACA' },
    'Moderate': { bg: '#FFFBEB', color: '#F5A623', border: '#FDE68A' },
    'Low': { bg: '#F0FDF4', color: '#18A957', border: '#BBF7D0' },
    'Unknown': { bg: '#F9FAFB', color: '#9CA3AF', border: '#E5E7EB' },
  }[level] || { bg: '#F9FAFB', color: '#9CA3AF', border: '#E5E7EB' })

  const getImpactLevel = () => {
    const score = riskScore?.score ?? 0
    if (score >= 76) return 'Significant'
    if (score >= 51) return 'Moderate'
    if (score >= 26) return 'Low'
    return 'Unknown'
  }

  const impactLevel = getImpactLevel()
  const ic = getImpactColor(impactLevel)

  const impacts = [
    {
      category: 'Habitat affected',
      metric: areaKm2 ? `~${areaKm2.toLocaleString('en-US')} km²` : 'Polygon area',
      impact: totalInPolygon > 500 ? 'Significant' : totalInPolygon > 100 ? 'Moderate' : 'Low',
      source: 'Polygon geometry',
    },
    {
      category: 'Species groups potentially affected',
      metric: `${taxaFound.length} of 14 taxa detected`,
      impact: taxaFound.length >= 8 ? 'Significant' : taxaFound.length >= 4 ? 'Moderate' : 'Low',
      source: 'GBIF',
    },
    {
      category: 'Ecosystem integrity',
      metric: ndvi ? `NDVI ${ndvi.mean.toFixed(3)} — ${ndvi.interpretation}` : '—',
      impact: ndvi
        ? ndvi.mean > 0.4 ? 'Low' : ndvi.mean > 0.2 ? 'Moderate' : 'Significant'
        : 'Unknown',
      source: 'Sentinel-2',
    },
    {
      category: 'Vegetation trend',
      metric: ndvi ? `${ndvi.trend} (${ndvi.slope > 0 ? '+' : ''}${ndvi.slope.toFixed(4)}/period)` : '—',
      impact: ndvi
        ? ndvi.trend === 'Declining' ? 'Significant' : ndvi.trend === 'Stable' ? 'Low' : 'Low'
        : 'Unknown',
      source: 'Sentinel-2',
    },
    {
      category: 'Protected areas proximity',
      metric: wdpa ? `${wdpa.total} areas in region` : '—',
      impact: wdpa
        ? wdpa.total >= 5 ? 'Significant' : wdpa.total >= 2 ? 'Moderate' : 'Low'
        : 'Unknown',
      source: 'WDPA',
    },
    {
      category: 'Overall biodiversity impact',
      metric: riskScore ? `Risk score ${riskScore.score}/100` : '—',
      impact: impactLevel,
      source: 'BioRisk AI',
    },
  ]

  const Badge = ({ level }) => {
    const c = getImpactColor(level)
    return (
      <span style={{
        padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600,
        background: c.bg, color: c.color, border: `1px solid ${c.border}`,
        whiteSpace: 'nowrap',
      }}>{level}</span>
    )
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Impacts Assessment</div>
        <span style={{
          padding: '2px 10px', borderRadius: 999, fontSize: 10, fontWeight: 600,
          background: ic.bg, color: ic.color, border: `1px solid ${ic.border}`,
        }}>
          {impactLevel} Impact
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#F9FAFB' }}>
              <th style={{ padding: '6px 12px', textAlign: 'left', color: '#9CA3AF', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impact Category</th>
              <th style={{ padding: '6px 12px', textAlign: 'left', color: '#9CA3AF', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metric</th>
              <th style={{ padding: '6px 12px', textAlign: 'center', color: '#9CA3AF', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Level</th>
              <th style={{ padding: '6px 12px', textAlign: 'left', color: '#9CA3AF', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source</th>
            </tr>
          </thead>
          <tbody>
            {impacts.map((imp, i) => (
              <tr key={i} style={{ borderTop: '1px solid #E5E7EB' }}>
                <td style={{ padding: '7px 12px', color: '#1F2937', fontWeight: 500 }}>{imp.category}</td>
                <td style={{ padding: '7px 12px', color: '#6B7280' }}>{imp.metric}</td>
                <td style={{ padding: '7px 12px', textAlign: 'center' }}><Badge level={imp.impact} /></td>
                <td style={{ padding: '7px 12px', color: '#9CA3AF', fontSize: 10 }}>{imp.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        margin: '8px 12px 12px', padding: '6px 10px',
        background: '#FFFBEB', border: '1px solid #FDE68A',
        borderRadius: 6, fontSize: 9, color: '#92400E',
      }}>
        ⚠ Impact levels are screening-grade proxies based on observational data. Formal ESIA required for regulatory purposes.
      </div>
    </div>
  )
}

const DEPENDENCIES = {
  'Wind Energy': [
    { service: 'Wind resources', dependency: 'High', financial: 'High', note: 'Core operational dependency' },
    { service: 'Land/habitat', dependency: 'High', financial: 'High', note: 'Project footprint and buffer zones' },
    { service: 'Pollination', dependency: 'Low', financial: 'Low', note: 'Indirect supply chain dependency' },
    { service: 'Species habitat', dependency: 'Moderate', financial: 'High', note: 'Regulatory and reputational risk' },
    { service: 'Migratory corridors', dependency: 'Moderate', financial: 'High', note: 'Bird/bat collision risk' },
    { service: 'Water supply', dependency: 'Low', financial: 'Low', note: 'Minimal operational use' },
  ],
  'Mining & Extractives': [
    { service: 'Soil/subsoil resources', dependency: 'High', financial: 'High', note: 'Core extractive dependency' },
    { service: 'Water supply', dependency: 'High', financial: 'High', note: 'Processing and dust suppression' },
    { service: 'Water quality', dependency: 'High', financial: 'High', note: 'Regulatory compliance risk' },
    { service: 'Species habitat', dependency: 'Moderate', financial: 'High', note: 'License to operate risk' },
    { service: 'Pollination', dependency: 'Low', financial: 'Low', note: 'Indirect supply chain' },
    { service: 'Climate regulation', dependency: 'Moderate', financial: 'Moderate', note: 'Carbon offsetting obligations' },
  ],
  'Agriculture & Forestry': [
    { service: 'Soil fertility', dependency: 'High', financial: 'High', note: 'Direct productivity dependency' },
    { service: 'Pollination', dependency: 'High', financial: 'High', note: 'Crop yield dependency' },
    { service: 'Water supply', dependency: 'High', financial: 'High', note: 'Irrigation dependency' },
    { service: 'Pest control', dependency: 'Moderate', financial: 'Moderate', note: 'Natural predator services' },
    { service: 'Climate regulation', dependency: 'Moderate', financial: 'Moderate', note: 'Microclimate stability' },
    { service: 'Species habitat', dependency: 'Moderate', financial: 'Moderate', note: 'Biodiversity net gain targets' },
  ],
  'Infrastructure': [
    { service: 'Land/habitat', dependency: 'High', financial: 'High', note: 'Project footprint' },
    { service: 'Species habitat', dependency: 'High', financial: 'High', note: 'Environmental permitting' },
    { service: 'Water regulation', dependency: 'Moderate', financial: 'Moderate', note: 'Flood risk management' },
    { service: 'Climate regulation', dependency: 'Low', financial: 'Moderate', note: 'Resilience planning' },
    { service: 'Pollination', dependency: 'Low', financial: 'Low', note: 'Indirect dependency' },
    { service: 'Migratory corridors', dependency: 'Moderate', financial: 'Moderate', note: 'Wildlife crossing requirements' },
  ],
  'Hydroelectric': [
    { service: 'Water supply', dependency: 'High', financial: 'High', note: 'Core operational dependency' },
    { service: 'Water quality', dependency: 'High', financial: 'High', note: 'Turbine and regulatory risk' },
    { service: 'Species habitat', dependency: 'High', financial: 'High', note: 'Fish migration and aquatic biodiversity' },
    { service: 'Climate regulation', dependency: 'High', financial: 'High', note: 'Rainfall pattern dependency' },
    { service: 'Soil stability', dependency: 'Moderate', financial: 'Moderate', note: 'Sedimentation risk' },
    { service: 'Pollination', dependency: 'Low', financial: 'Low', note: 'Indirect dependency' },
  ],
  'Oil & Gas': [
    { service: 'Marine/terrestrial habitat', dependency: 'High', financial: 'High', note: 'Spill liability and permitting' },
    { service: 'Water quality', dependency: 'High', financial: 'High', note: 'Contamination risk' },
    { service: 'Species habitat', dependency: 'High', financial: 'High', note: 'License to operate' },
    { service: 'Climate regulation', dependency: 'Moderate', financial: 'High', note: 'Carbon pricing exposure' },
    { service: 'Pollination', dependency: 'Low', financial: 'Low', note: 'Indirect dependency' },
    { service: 'Migratory corridors', dependency: 'Moderate', financial: 'Moderate', note: 'Seasonal operational restrictions' },
  ],
}

function DependenciesCard({ data, analysisProject }) {
  const sector = analysisProject?.sector || 'Wind Energy'
  const deps = DEPENDENCIES[sector] || DEPENDENCIES['Wind Energy']

  const getColor = (level) => ({
    'High': { bg: '#FEF2F2', color: '#E84C3D', border: '#FECACA' },
    'Moderate': { bg: '#FFFBEB', color: '#F5A623', border: '#FDE68A' },
    'Low': { bg: '#F0FDF4', color: '#18A957', border: '#BBF7D0' },
  }[level] || { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' })

  const Badge = ({ level }) => {
    const c = getColor(level)
    return (
      <span style={{
        padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600,
        background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      }}>{level}</span>
    )
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Ecosystem Dependencies</div>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 7px',
          borderRadius: 999, background: '#F0FDF4',
          color: '#166534', border: '1px solid #BBF7D0'
        }}>{sector}</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#F9FAFB' }}>
              <th style={{ padding: '6px 12px', textAlign: 'left', color: '#9CA3AF', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ecosystem Service</th>
              <th style={{ padding: '6px 12px', textAlign: 'center', color: '#9CA3AF', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dependency</th>
              <th style={{ padding: '6px 12px', textAlign: 'center', color: '#9CA3AF', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Financial Risk</th>
              <th style={{ padding: '6px 12px', textAlign: 'left', color: '#9CA3AF', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Note</th>
            </tr>
          </thead>
          <tbody>
            {deps.map((d, i) => (
              <tr key={i} style={{ borderTop: '1px solid #E5E7EB' }}>
                <td style={{ padding: '7px 12px', color: '#1F2937', fontWeight: 500 }}>{d.service}</td>
                <td style={{ padding: '7px 12px', textAlign: 'center' }}><Badge level={d.dependency} /></td>
                <td style={{ padding: '7px 12px', textAlign: 'center' }}><Badge level={d.financial} /></td>
                <td style={{ padding: '7px 12px', color: '#9CA3AF', fontSize: 10 }}>{d.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        margin: '8px 12px 12px', padding: '6px 10px',
        background: '#F9FAFB', borderRadius: 6,
        fontSize: 9, color: '#9CA3AF', lineHeight: 1.5,
      }}>
        Dependencies based on sector-specific analysis. Adapted from TNFD LEAP framework and IFC PS6 methodology.
      </div>
    </div>
  )
}

function TnfdMetricsCard({ data, analysisProject }) {
  const sector = analysisProject?.sector || 'Wind Energy'
  const totalInPolygon = data?.polygonCount ?? 0
  const taxaFound = data?.taxaInPolygon?.filter(t => t.inPolygon > 0).length ?? 0
  const ndvi = data?.ndvi
  const wdpa = data?.wdpa
  const riskScore = data?.riskScore

  const metrics = [
    {
      label: 'Species affected (proxy)',
      value: taxaFound > 0 ? `${taxaFound} taxonomic groups` : '—',
      source: 'GBIF',
      real: taxaFound > 0,
      tnfd: 'B15',
      standards: ['TNFD', 'ESRS E4', 'GRI 304'],
    },
    {
      label: 'Occurrence records in AOI',
      value: totalInPolygon > 0 ? totalInPolygon.toLocaleString('en-US') : '—',
      source: 'GBIF',
      real: totalInPolygon > 0,
      tnfd: 'B16',
      standards: ['TNFD', 'IFC PS6'],
    },
    {
      label: 'Ecosystem integrity (NDVI)',
      value: ndvi ? `${ndvi.mean.toFixed(3)} — ${ndvi.interpretation}` : '—',
      source: 'Sentinel-2',
      real: ndvi != null,
      tnfd: 'E4',
      standards: ['TNFD', 'ESRS E4', 'ISSB BEES'],
    },
    {
      label: 'Vegetation trend',
      value: ndvi ? `${ndvi.trend} (${ndvi.slope > 0 ? '+' : ''}${ndvi.slope.toFixed(4)}/period)` : '—',
      source: 'Sentinel-2',
      real: ndvi != null,
      tnfd: 'E4',
      standards: ['TNFD', 'ESRS E4'],
    },
    {
      label: 'Protected areas intersected',
      value: wdpa ? `${wdpa.intersectingCount ?? wdpa.total} areas` : '—',
      source: 'WDPA',
      real: wdpa != null,
      tnfd: 'B8',
      standards: ['TNFD', 'ESRS E4', 'IFC PS6', 'EQ-P'],
    },
    {
      label: 'Biodiversity risk score',
      value: riskScore ? `${riskScore.score}/100 (${riskScore.category})` : '—',
      source: 'BioRisk AI',
      real: riskScore != null,
      tnfd: 'B1',
      standards: ['TNFD', 'IFC PS6', 'EQ-P'],
    },
    {
      label: 'Scientific literature',
      value: data?.papers?.total != null ? `${data.papers.total} papers` : '—',
      source: 'GBIF Literature',
      real: data?.papers?.total != null,
      tnfd: 'B2',
      standards: ['TNFD', 'GRI 304'],
    },
    {
      label: 'Land use change (NDVI ΔYoY)',
      value: ndvi ? `${ndvi.deltaYoY > 0 ? '+' : ''}${ndvi.deltaYoY.toFixed(3)}` : '—',
      source: 'Sentinel-2',
      real: ndvi != null,
      tnfd: 'E3',
      standards: ['TNFD', 'ESRS E4', 'EUDR'],
    },
  ]

  const STANDARD_COLORS = {
    'TNFD': { bg: '#F0FDF4', color: '#18A957', border: '#BBF7D0' },
    'ESRS E4': { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
    'IFC PS6': { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
    'EQ-P': { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' },
    'GRI 304': { bg: '#FFF1F2', color: '#BE123C', border: '#FECDD3' },
    'EUDR': { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
    'ISSB BEES': { bg: '#F0F9FF', color: '#0369A1', border: '#BAE6FD' },
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Core Metrics & Standards</div>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 7px',
          borderRadius: 999, background: '#EFF6FF',
          color: '#1D4ED8', border: '1px solid #BFDBFE'
        }}>screening-grade</span>
      </div>

      {/* Standards legend */}
      <div style={{ padding: '6px 12px 8px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {Object.entries(STANDARD_COLORS).map(([std, c]) => (
          <span key={std} style={{
            fontSize: 8, fontWeight: 700, padding: '1px 6px',
            borderRadius: 3, background: c.bg, color: c.color,
            border: `1px solid ${c.border}`,
          }}>{std}</span>
        ))}
      </div>

      <div style={{ overflowY: 'auto', maxHeight: 280 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: '#F9FAFB', position: 'sticky', top: 0 }}>
              <th style={{ padding: '6px 12px', textAlign: 'left', color: '#9CA3AF', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metric</th>
              <th style={{ padding: '6px 12px', textAlign: 'left', color: '#9CA3AF', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Value</th>
              <th style={{ padding: '6px 12px', textAlign: 'left', color: '#9CA3AF', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Frameworks</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, i) => (
              <tr key={i} style={{ borderTop: '1px solid #E5E7EB' }}>
                <td style={{ padding: '7px 12px', color: '#6B7280', fontSize: 10 }}>{m.label}</td>
                <td style={{ padding: '7px 12px', fontWeight: m.real ? 600 : 400, color: m.real ? '#1F2937' : '#9CA3AF', fontStyle: m.real ? 'normal' : 'italic', fontSize: 10 }}>
                  {m.value}
                </td>
                <td style={{ padding: '7px 12px' }}>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {m.standards.map(std => {
                      const c = STANDARD_COLORS[std] || { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' }
                      return (
                        <span key={std} style={{
                          fontSize: 8, fontWeight: 700, padding: '1px 5px',
                          borderRadius: 3, background: c.bg,
                          color: c.color, border: `1px solid ${c.border}`,
                          whiteSpace: 'nowrap',
                        }}>{std}</span>
                      )
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        margin: '8px 12px 12px', padding: '6px 10px',
        background: '#FFFBEB', border: '1px solid #FDE68A',
        borderRadius: 6, fontSize: 9, color: '#92400E',
      }}>
        ⚠ Screening-grade metrics. Framework references are indicative — formal disclosure requires qualified assessment.
      </div>
    </div>
  )
}

function TnfdCard({ data, analysisProject }) {
  const sector = analysisProject?.sector || 'Wind Energy'
  const hasGbif = (data?.polygonCount ?? 0) > 0
  const hasNdvi = data?.ndvi != null
  const hasWdpa = data?.wdpa != null
  const hasPapers = (data?.papers?.total ?? 0) > 0
  const sectorCtx = SECTOR_CONTEXT[sector]

  const items = [
    {
      label: 'Locate',
      desc: 'Identify nature-related issues across operations',
      done: hasGbif || hasWdpa,
      evidence: hasWdpa
        ? data.wdpa.intersectingCount > 0
          ? `${data.wdpa.intersectingCount} protected area${data.wdpa.intersectingCount > 1 ? 's' : ''} intersecting project boundary`
          : 'No protected areas intersecting project boundary'
        : hasGbif ? 'Project area mapped with GBIF data' : null,
    },
    {
      label: 'Evaluate',
      desc: 'Evaluate dependencies and impacts on nature',
      done: hasGbif,
      evidence: hasGbif
        ? `${data.polygonCount?.toLocaleString('en-US')} records across ${data.taxaInPolygon?.filter(t => t.inPolygon > 0).length ?? 0} taxa`
        : null,
    },
    {
      label: 'Assess',
      desc: 'Assess material nature-related risks and opportunities',
      done: hasGbif && data?.riskScore != null,
      evidence: data?.riskScore
        ? `Risk score: ${data.riskScore.score}/100 (${data.riskScore.category})`
        : null,
    },
    {
      label: 'Prepare',
      desc: 'Prepare disclosures and response strategies',
      done: false,
      evidence: 'Requires formal environmental assessment',
    },
  ]

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">TNFD & CSRD Alignment</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px',
            borderRadius: 999, background: '#F0FDF4',
            color: '#18A957', border: '1px solid #BBF7D0'
          }}>TNFD ✓</span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px',
            borderRadius: 999, background: '#EFF6FF',
            color: '#1D4ED8', border: '1px solid #BFDBFE'
          }}>CSRD ESRS E4 ✓</span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px',
            borderRadius: 999, background: '#F3F4F6',
            color: '#6B7280', border: '1px solid #E5E7EB'
          }}>{sector}</span>
        </div>
      </div>

      <div className="tnfd-list">
        {items.map((it, i) => (
          <div key={i} className={`tnfd-item ${it.done ? 'done' : 'pending'}`}>
            <span className="tnfd-check">{it.done ? '✓' : '—'}</span>
            <div style={{ flex: 1 }}>
              <div>{it.label}</div>
              {it.evidence && (
                <div style={{ fontSize: 9, color: it.done ? '#18A957' : '#9CA3AF', marginTop: 1 }}>
                  {it.evidence}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {sectorCtx && (
        <div style={{
          margin: '8px 12px', padding: '7px 10px',
          background: '#F9FAFB', borderRadius: 6,
          fontSize: 9, color: '#6B7280', lineHeight: 1.6,
        }}>
          <strong style={{ color: '#1F2937' }}>Sector metrics:</strong> {sectorCtx.tnfd}
        </div>
      )}

      <div style={{ fontSize: 10, color: '#9CA3AF', padding: '0 12px 12px' }}>
        Screening-grade. Field validation recommended for regulatory sign-off.
      </div>
      <div style={{ fontSize: 10, color: '#9CA3AF', padding: '0 12px 12px', fontStyle: 'italic' }}>
        One analysis · Two frameworks — all 14 TNFD disclosures reflected in CSRD ESRS E4
      </div>
    </div>

  )
}
function DataSourcesCard({ data, loading, onShowStats }) {
  const avesCount = data?.avesCount?.count
  const papersTotal = data?.papers?.total ?? 0
  const wdpa = data?.wdpa
  const ndvi = data?.ndvi
  const queriedAt = data?.queriedAt
    ? data.queriedAt.toLocaleDateString()
    : new Date().toLocaleDateString()

  const gbifVal = loading
    ? <Spinner />
    : (avesCount != null ? `${fmt(avesCount)} records` : '—')

  const litVal = loading
    ? <Spinner />
    : `${fmt(papersTotal)} papers`

  const wdpaVal = loading
    ? <Spinner />
    : wdpa != null
      ? `${wdpa.total} areas found`
      : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Not queried</span>

  const ndviVal = ndvi
    ? `NDVI ${ndvi.mean} · ${ndvi.quarterly?.length ?? 0} periods`
    : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Not available</span>

  const items = [
    {
      icon: '🌐', name: 'GBIF Occurrence API', val: gbifVal, real: true,
      note: 'Complementary data source — not a substitute for field surveys'
    },
    { icon: '📚', name: 'GBIF Literature Index', val: litVal, real: true },
    { icon: '🛡', name: 'WDPA Protected Areas', val: wdpaVal, real: wdpa != null },
    { icon: '🛰', name: 'Sentinel-2 L2A (NDVI)', val: ndviVal, real: ndvi != null },
    {
      icon: '📋', name: 'IUCN Red List',
      val: <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Pending integration ⓘ</span>,
      real: false,
      tooltip: 'IUCN Red List API access requested — pending approval'
    },
  ]

  return (
    <div className="card">
      <div className="card-head"><div className="card-title">Data Sources</div></div>
      <div>
        {items.map((s, i) => (
          <div key={i} className="source-item" title={s.tooltip ?? ''}>
            <div className="source-left">
              <span className="source-icon">{s.icon}</span>
              <div>
                <span className="source-name">{s.name}</span>
                {s.note && (
                  <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 1 }}>{s.note}</div>
                )}
              </div>
              {s.real && (
                <span style={{
                  fontSize: 8, fontWeight: 700, marginLeft: 4,
                  color: '#18A957', background: '#F0FDF4',
                  border: '1px solid #BBF7D0', borderRadius: 999,
                  padding: '1px 5px', flexShrink: 0,
                }}>✓ live</span>
              )}
            </div>
            <div className="source-val">{s.val}</div>
          </div>
        ))}
      </div>
      <div className="source-meta">
        Last queried: {queriedAt} · Occurrence data CC BY 4.0
      </div>
      <button
        type="button"
        onClick={onShowStats}
        style={{
          margin: '8px 12px 12px', padding: '6px 12px',
          background: '#F0FDF4', border: '1px solid #BBF7D0',
          borderRadius: 6, fontSize: 11, color: '#18A957',
          cursor: 'pointer', fontWeight: 600, width: 'calc(100% - 24px)',
          textAlign: 'left',
        }}
      >
        📊 View GBIF global snapshot stats →
      </button>
    </div>
  )
}

// ─── Copilot ─────────────────────────────────────────────────────────────────
const SECTOR_CONTEXT = {
  'Wind Energy': {
    risks: 'Bird strike and bat collision risk, habitat fragmentation from turbine infrastructure, noise disturbance to marine mammals if offshore.',
    metrics: 'Bird collision risk (Aves density), bat activity (Lepidoptera/Insecta as proxy), marine mammal proximity (Cetacea/Mammalia), migratory routes.',
    tnfd: 'TNFD metrics: B15 (species affected by infrastructure), B16 (migratory species), E7 (ecosystem fragmentation).',
    questions: 'Ask about: bird species at risk, seasonal migration patterns, offshore mammal records, construction timing restrictions.',
  },
  'Mining & Extractives': {
    risks: 'Habitat destruction, water contamination, dust and noise affecting terrestrial fauna, tailings impact on aquatic ecosystems.',
    metrics: 'Amphibia density (water quality indicator), aquatic species (Actinopterygii, Chondrichthyes), soil biodiversity (Plantae, Orchidaceae), endemic species.',
    tnfd: 'TNFD metrics: B11 (freshwater ecosystems), B14 (soil biodiversity), E5 (pollution), E6 (water use).',
    questions: 'Ask about: water body proximity, amphibian records, endemic plant species, downstream ecosystem sensitivity.',
  },
  'Agriculture & Forestry': {
    risks: 'Habitat conversion, pesticide runoff affecting pollinators, deforestation reducing species richness, invasive species introduction.',
    metrics: 'Pollinator density (Lepidoptera, Insecta), plant diversity (Orchidaceae, Magnoliopsida), bird diversity (Aves), soil indicators.',
    tnfd: 'TNFD metrics: B12 (pollinators), B13 (soil health), E3 (land use change), E4 (deforestation).',
    questions: 'Ask about: pollinator species, native plant coverage, deforestation pressure, NDVI vegetation trends.',
  },
  'Infrastructure': {
    risks: 'Linear infrastructure fragmenting habitats, road mortality for wildlife, light and noise pollution, hydrological changes.',
    metrics: 'Mammal corridor species (Mammalia), reptile road mortality (Reptilia), amphibian breeding sites (Amphibia, Anura), connectivity.',
    tnfd: 'TNFD metrics: B15 (species affected), B16 (migratory corridors), E7 (fragmentation), E8 (connectivity).',
    questions: 'Ask about: wildlife corridors, road mortality risk species, amphibian breeding areas, habitat connectivity.',
  },
  'Hydroelectric': {
    risks: 'River flow alteration affecting aquatic biodiversity, fish migration barriers, riparian habitat flooding, downstream ecosystem changes.',
    metrics: 'Fish species (Actinopterygii), aquatic mammals (Cetacea), riparian vegetation (Plantae), amphibians (Amphibia, Anura).',
    tnfd: 'TNFD metrics: B11 (freshwater), B17 (fish migration), E5 (water quality), E6 (water flow).',
    questions: 'Ask about: fish migration routes, aquatic mammal records, riparian vegetation health, downstream impacts.',
  },
  'Oil & Gas': {
    risks: 'Spill risk to terrestrial and marine ecosystems, habitat fragmentation, air quality impacts on vegetation, offshore drilling impacts.',
    metrics: 'Marine mammals (Cetacea, Mammalia), seabirds (Aves), coastal vegetation (Plantae), sensitive marine taxa (Chondrichthyes).',
    tnfd: 'TNFD metrics: B18 (marine ecosystems), E5 (pollution risk), E9 (spill sensitivity), B14 (coastal habitats).',
    questions: 'Ask about: marine mammal density, spill sensitivity zones, coastal ecosystem vulnerability, protected area proximity.',
  },
}

function buildCopilotSystem(gbifData, analysisProject) {
  const projectName = analysisProject?.name || 'Offshore Wind Farm – Patagonia'
  const country = analysisProject?.country || 'AR'
  const countryName = COUNTRY_NAMES[country] || country
  const sector = analysisProject?.sector || 'Wind Energy'
  const sectorCtx = SECTOR_CONTEXT[sector] || SECTOR_CONTEXT['Wind Energy']

  const taxaLines = gbifData?.taxaInPolygon
    ?.map(t => `  ${t.emoji} ${t.name}: ${t.inPolygon} records in polygon (sample of ${t.sampleSize})`)
    .join('\n') || '  No taxa data available yet'

  const totalInPolygon = gbifData?.polygonCount ?? 0
  const riskScore = gbifData?.riskScore
  const papers = gbifData?.papers?.total ?? 0
  const ndvi = gbifData?.ndvi
  const wdpa = gbifData?.wdpa

  const ndviContext = ndvi
    ? `  NDVI mean: ${ndvi.mean} (${ndvi.interpretation}) · Trend: ${ndvi.trend} (slope: ${ndvi.slope}/period)`
    : '  NDVI: not available'

  const wdpaContext = wdpa
    ? `  Protected areas: ${wdpa.total} found · ${wdpa.areas?.slice(0, 2).map(a => a.name).join(', ')}`
    : '  Protected areas: not queried'

  return `You are BioRisk AI's biodiversity intelligence copilot.
You help ESG managers, environmental consultants and sustainability
officers understand biodiversity risk for their projects.

CURRENT PROJECT:
  Name: ${projectName}
  Country: ${countryName}
  Sector: ${sector}
  Analysis mode: ${MODE === 'full' ? 'Full S3 snapshot' : 'REST API sample'}

SECTOR-SPECIFIC CONTEXT (${sector}):
  Key risks: ${sectorCtx.risks}
  Priority metrics: ${sectorCtx.metrics}
  ${sectorCtx.tnfd}
  Focus questions: ${sectorCtx.questions}

REAL GBIF DATA FOR THIS ANALYSIS:
${taxaLines}
  Total occurrences in polygon: ${totalInPolygon}
  Scientific papers (GBIF Literature): ${papers}

VEGETATION & HABITAT DATA:
${ndviContext}
${wdpaContext}

BIODIVERSITY RISK ASSESSMENT:
  Score: ${riskScore?.score ?? 'not calculated'} / 100
  Category: ${riskScore?.category ?? 'unknown'}
  Taxa groups detected: ${riskScore?.taxaFound ?? 0} of 6
  Methodology: Conservative baseline + richness + density + literature uncertainty

BEHAVIORAL RULES (from CLAUDE.md):
- Never say a species is "absent" — say "no records found"
- Frame all data as "observational evidence" not confirmed presence
- Always mention sample size limitations (up to 300 records per taxon from REST API)
- Be concise first, offer detail on request
- Never provide legal advice or regulatory conclusions
- Never claim TNFD compliance — say "may support TNFD activities"
- Conservative interpretation: uncertainty increases caution, not reduces it
- Always frame sector-specific risks in context of observed GBIF data

RESPONSE STYLE:
- Professional, scientific, transparent
- Use bullet points for lists
- Mention evidence and uncertainty
- Keep first response under 150 words
- Cite GBIF as data source
- Highlight sector-specific risks first

DISCLAIMER TO INCLUDE WHEN RELEVANT:
"This analysis is based on publicly available GBIF occurrence data
and should be interpreted as supporting ecological evidence rather
than a substitute for formal environmental assessments."`
}

// Renders one assistant message with minimal markdown support:
// **bold** → <strong>, leading "-" or "•" → bullet, newlines preserved.
function renderAssistantContent(text) {
  return text.split('\n').map((line, i) => {
    const isBullet = /^\s*[-•*]\s+/.test(line)
    const stripped = isBullet ? line.replace(/^\s*[-•*]\s+/, '') : line
    const inline = stripped.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return <strong key={j}>{part.slice(2, -2)}</strong>
      }
      return <span key={j}>{part}</span>
    })
    if (isBullet) {
      return (
        <div key={i} className="msg-bullet">
          <span className="msg-bullet-marker">•</span>
          <span>{inline}</span>
        </div>
      )
    }
    return <div key={i} className="msg-line">{inline}</div>
  })
}

function buildSuggestedQuestions(gbifData) {
  if (gbifData?.taxaInPolygon) {
    const firstPresent = gbifData.taxaInPolygon.find(t => t.inPolygon > 0)?.name ?? 'Aves'
    return [
      `What do the ${firstPresent} records tell us about ecological risk?`,
      'How reliable is this biodiversity data?',
      'What are the main ecological concerns for this project?',
      'Which TNFD metrics are relevant here?',
      `Why is the risk score ${gbifData.riskScore?.score ?? 72}?`,
    ]
  }
  return [
    'What threatened species are in or near the area?',
    'How reliable is the data?',
    'What are the main ecological risks?',
    'Which TNFD metrics apply here?',
  ]
}

function CopilotPanel({ gbifData, analysisProject }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your biodiversity intelligence copilot. I can help you understand the ecological risks, species data, and ESG implications for this project. What would you like to know?",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const suggestedQuestions = buildSuggestedQuestions(gbifData)

  async function sendMessage(text) {
    const userText = (text ?? input).trim()
    if (!userText || loading) return

    const userMessage = { role: 'user', content: userText }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const apiKey = import.meta.env.VITE_DEMO_KEY
      if (!apiKey || apiKey === 'your-key-here') {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'No API key configured. Please add VITE_DEMO_KEY to your .env file.',
        }])
        return
      }

      // Drop the leading greeting so the API receives a user-first history.
      const firstUserIdx = newMessages.findIndex(m => m.role === 'user')
      const history = newMessages
        .slice(firstUserIdx >= 0 ? firstUserIdx : 0)
        .map(m => ({ role: m.role, content: m.content }))

      const response = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: buildCopilotSystem(gbifData, analysisProject),
          messages: history,
        }),
      })

      if (!response.ok) {
        let msg = `API ${response.status}`
        try {
          const err = await response.json()
          if (err?.error?.message) msg = err.error.message
        } catch { }
        throw new Error(msg)
      }

      const data = await response.json()
      const textOut = data.content?.find(b => b.type === 'text')?.text ?? '(no response)'

      setMessages(prev => [...prev, { role: 'assistant', content: textOut }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${e.message}. Please check your API key and try again.`,
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <aside className="copilot">
      <div className="cp-head">
        <div className="cp-title">
          <div className="cp-h1">AI Copilot</div>
          <span className="cp-beta">BETA</span>
        </div>
        <div className="cp-icons">
          <span title="Settings">⚙</span>
          <span title="Close">✕</span>
        </div>
      </div>

      <div className="cp-body">
        <div className="cp-section-label">Suggested questions</div>
        <div className="cp-suggestions">
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              className="cp-chip"
              onClick={() => sendMessage(q)}
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>

        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            <div className="msg-bubble">
              {m.role === 'assistant' ? renderAssistantContent(m.content) : m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="msg assistant">
            <div className="msg-bubble">
              <div className="msg-dots">
                <span className="msg-dot" />
                <span className="msg-dot" />
                <span className="msg-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="cp-input-bar">
        <input
          className="cp-input"
          placeholder="Ask a follow-up..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          disabled={loading}
        />
        <button
          className="cp-send"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
        >
          {loading ? <span className="spinner-sm" /> : '➤'}
        </button>
      </div>
    </aside>
  )
}

// ─── New Analysis Wizard ─────────────────────────────────────────────────────

// MUST be a separate component (outside App) so the Leaflet hooks are stable.
function DrawingLayer({ drawnPoints, setDrawnPoints, drawnPolygon, setDrawnPolygon }) {
  const map = useMapEvents({
    click(e) {
      if (drawnPolygon) return
      const { lat, lng } = e.latlng
      if (drawnPoints.length > 2) {
        const firstPx = map.latLngToContainerPoint(drawnPoints[0])
        const clickPx = map.latLngToContainerPoint(e.latlng)
        const dist = Math.hypot(firstPx.x - clickPx.x, firstPx.y - clickPx.y)
        if (dist < 25) {
          setDrawnPolygon([...drawnPoints])
          setDrawnPoints([])
          map.getContainer().style.cursor = ''
          return
        }
      }
      setDrawnPoints(prev => [...prev, [lat, lng]])
    }
  })

  useEffect(() => {
    const container = map.getContainer()
    if (drawnPolygon) {
      container.style.cursor = ''
    } else {
      container.style.cursor = 'crosshair'
    }
    return () => {
      container.style.cursor = ''
    }
  }, [drawnPolygon, map])

  return (
    <>
      {/* Completed polygon */}
      {drawnPolygon && drawnPolygon.length >= 3 && (
        <Polygon
          positions={drawnPolygon}
          pathOptions={{
            color: '#ffffff', weight: 2,
            fillColor: '#ffffff', fillOpacity: 0.04
          }}
        />
      )}

      {/* Lines connecting points while drawing */}
      {drawnPoints.length > 1 && (
        <Polyline
          positions={drawnPoints}
          pathOptions={{ color: '#18A957', weight: 2, dashArray: '6 4', opacity: 0.8 }}
        />
      )}
      {/* Closing line preview */}
      {drawnPoints.length > 2 && (
        <Polyline
          positions={[drawnPoints[drawnPoints.length - 1], drawnPoints[0]]}
          pathOptions={{ color: '#18A957', weight: 1.5, dashArray: '4 4', opacity: 0.5 }}
        />
      )}
      {/* Point markers while drawing */}
      {drawnPoints.map((p, i) => (
        <CircleMarker
          key={i}
          center={p}
          radius={i === 0 ? 7 : 4}
          pathOptions={{
            color: '#18A957',
            fillColor: i === 0 ? '#18A957' : 'white',
            fillOpacity: 1,
            weight: 2,
          }}
        />
      ))}
    </>
  )
}

// Re-center the map when the country changes.
function MapRecenter({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, 5, { duration: 0.6 })
  }, [center[0], center[1]])
  return null
}

function NewAnalysisPage({
  analysisStep, setAnalysisStep,
  drawnPoints, setDrawnPoints,
  drawnPolygon, setDrawnPolygon,
  analysisProject, setAnalysisProject,
  scanResults, scanProgress, scanStepLabel,
  onBack, onRunScan, onViewDashboard, onResetWizard,
}) {
  const center = COUNTRY_CENTERS[analysisProject.country] || [-34, -64]
  const canRun = analysisProject.name.trim() && drawnPolygon

  let polyStatus
  if (drawnPolygon) {
    polyStatus = { cls: 'closed', text: `✓ Polygon closed — ${drawnPolygon.length} points` }
  } else if (drawnPoints.length === 0) {
    polyStatus = { cls: 'empty', text: 'No area defined yet' }
  } else if (drawnPoints.length < 3) {
    polyStatus = { cls: 'drawing', text: `Drawing… (${drawnPoints.length} point${drawnPoints.length === 1 ? '' : 's'} placed)` }
  } else {
    polyStatus = { cls: 'drawing', text: `Drawing… (${drawnPoints.length} points) — click the first point to close` }
  }

  return (
    <div className="wiz-shell">
      <header className="wiz-header">
        <button className="wiz-back" onClick={onBack} aria-label="Back">←</button>
        <div className="wiz-title">New Analysis</div>
        <div className="wiz-step-pill">Step {analysisStep} of 3</div>
      </header>

      <div className="wiz-body">
        {analysisStep === 1 && (
          <>
            <aside className="wiz-panel">
              <h2>Define Project Area</h2>
              <div className="wiz-sub">
                Set the project details and draw the analysis boundary on the map.
              </div>

              <label className="wiz-label">Project name *</label>
              <input
                className="wiz-input"
                placeholder="e.g. Offshore Wind Farm – Patagonia"
                value={analysisProject.name}
                onChange={e => setAnalysisProject(p => ({ ...p, name: e.target.value }))}
              />

              <label className="wiz-label">Country</label>
              <select
                className="wiz-select"
                value={analysisProject.country}
                onChange={e => setAnalysisProject(p => ({ ...p, country: e.target.value }))}
              >
                {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
                  <option key={code} value={code}>{name} ({code})</option>
                ))}
              </select>

              <label className="wiz-label">Sector</label>
              <select
                className="wiz-select"
                value={analysisProject.sector}
                onChange={e => setAnalysisProject(p => ({ ...p, sector: e.target.value }))}
              >
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* CSRD Scope Checker */}
              {(() => {
                const csrdSectors = ['Agriculture & Forestry', 'Mining & Extractives', 'Oil & Gas', 'Hydroelectric']
                const euExportCountries = ['BR', 'AR', 'CO', 'PE', 'EC', 'BO', 'PY', 'GT', 'HN', 'NI']
                const isHighRiskSector = csrdSectors.includes(analysisProject.sector)
                const isEuExportCountry = euExportCountries.includes(analysisProject.country)

                if (!isHighRiskSector && !isEuExportCountry) return null

                return (
                  <div style={{
                    background: '#EFF6FF', border: '1px solid #BFDBFE',
                    borderRadius: 8, padding: '10px 12px', marginTop: 10,
                    fontSize: 11, color: '#1D4ED8', lineHeight: 1.6,
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                      ⚠ CSRD Scope Alert
                    </div>
                    {isHighRiskSector && (
                      <div style={{ marginBottom: 3 }}>
                        <strong>{analysisProject.sector}</strong> is a high-impact sector
                        under CSRD ESRS E4 biodiversity disclosure requirements.
                      </div>
                    )}
                    {isEuExportCountry && (
                      <div>
                        Companies in <strong>{COUNTRY_NAMES[analysisProject.country]}</strong> exporting
                        to the EU with &gt;€150M EU revenue may be subject to
                        CSRD (Directive 2022/2464) reporting obligations.
                      </div>
                    )}
                    <div style={{ marginTop: 6, fontSize: 10, color: '#3B82F6' }}>
                      BioRisk AI provides the biodiversity baseline data required for ESRS E4 disclosure.
                    </div>
                  </div>
                )
              })()}

              <div className="wiz-divider" />

              <div className="wiz-info">
                📍 Click on the map to place polygon points.
                Click the starting point (shown in orange) to close the polygon.
              </div>

              <div className={`wiz-status ${polyStatus.cls}`}>{polyStatus.text}</div>

              {(drawnPoints.length > 0 || drawnPolygon) && (
                <button
                  className="wiz-clear"
                  onClick={() => { setDrawnPoints([]); setDrawnPolygon(null) }}
                >
                  Clear
                </button>
              )}

              <button
                className="wiz-run"
                disabled={!canRun}
                onClick={onRunScan}
              >
                Run Biodiversity Scan →
              </button>
            </aside>

            <div className="wiz-map">
              <MapContainer
                key="drawing-map"
                center={center}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapRecenter center={center} />
                <DrawingLayer
                  drawnPoints={drawnPoints}
                  setDrawnPoints={setDrawnPoints}
                  drawnPolygon={drawnPolygon}
                  setDrawnPolygon={setDrawnPolygon}
                />
              </MapContainer>
            </div>
          </>
        )}

        {analysisStep === 2 && (
          <div className="wiz-center">
            <div className="scan-card">
              <div className="scan-spinner" />
              <div className="scan-title">Running Biodiversity Scan</div>
              <div className="scan-sub">{analysisProject.name}</div>

              <div className="scan-steps">
                {SCAN_STEPS.map((label, i) => {
                  const stepNum = i + 1
                  const state = scanProgress > stepNum ? 'done'
                    : scanProgress === stepNum ? 'active'
                      : 'pending'
                  const displayLabel = state === 'active' && scanStepLabel ? scanStepLabel : label
                  return (
                    <div key={i} className={`scan-step ${state}`}>
                      <div className="scan-step-icon">
                        {state === 'done' ? '✓' : state === 'active' ? '' : stepNum}
                      </div>
                      <span>{displayLabel}</span>
                    </div>
                  )
                })}
              </div>

              <div className="scan-progress-bar">
                <div
                  className="scan-progress-fill"
                  style={{ width: `${(Math.min(scanProgress, 5) / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {analysisStep === 3 && scanResults && (
          <div className="wiz-center">
            <div className="results-card">
              <div className="results-check">✓</div>
              <div className="results-title">Analysis Complete</div>
              <div className="results-sub">{analysisProject.name}</div>

              {(() => {
                const taxaInPolygon = scanResults?.taxaInPolygon ?? []
                const totalInPolygon = scanResults?.totalInPolygon ?? 0
                const taxaFound = scanResults?.riskScore?.taxaFound
                  ?? taxaInPolygon.filter(t => t.inPolygon > 0).length
                const category = scanResults?.riskScore?.category ?? 'unknown'
                const papers = scanResults?.papers?.total ?? 0
                return (
                  <>
                    <div className="taxa-section-title">Biodiversity Records in Project Area</div>
                    <div className="taxa-table">
                      {taxaInPolygon.filter(t => t.inPolygon > 0).map(t => (
                        <div key={t.name} className="taxa-row">
                          <span className="taxa-emoji">{t.emoji}</span>
                          <span className="taxa-name">{t.name}</span>
                          <span
                            className="taxa-count"
                            style={{ color: t.inPolygon > 0 ? TAXON_COLORS[t.name] : 'var(--text3)' }}
                          >
                            {fmt(t.inPolygon)}
                          </span>
                          <span className="taxa-unit">records in polygon</span>
                        </div>
                      ))}
                      <div className="taxa-row taxa-row-total">
                        <span className="taxa-emoji" />
                        <span className="taxa-name">Total</span>
                        <span className="taxa-count">{fmt(totalInPolygon)}</span>
                        <span className="taxa-unit">georeferenced occurrences</span>
                      </div>
                    </div>
                    <div className="taxa-sample-note">
                      (sample of 300 per taxon from REST API)
                    </div>

                    <div className="results-grid" style={{ marginTop: 16 }}>
                      <div className="results-stat">
                        <div className="results-stat-val">
                          <span className="results-stat-icon">📍</span>
                          {drawnPolygon ? `${drawnPolygon.length} points` : '—'}
                        </div>
                        <div className="results-stat-label">area boundary</div>
                      </div>
                      <div className="results-stat">
                        <div className="results-stat-val">
                          <span className="results-stat-icon">📅</span>
                          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="results-stat-label">analysis date</div>
                      </div>
                    </div>

                    <div className="results-insight">
                      Detected <strong>{taxaFound}</strong> taxonomic group{taxaFound === 1 ? '' : 's'} with
                      {' '}<strong>{fmt(totalInPolygon)}</strong> occurrence records within the project
                      boundary. <strong>{category}</strong> ecological sensitivity based on observational
                      evidence (sample of up to 300 records per taxon).
                      {' '}<strong>{fmt(papers)}</strong> scientific paper{papers === 1 ? '' : 's'} found
                      for this region.
                    </div>
                  </>
                )
              })()}

              <div className="results-actions">
                <button className="results-btn primary" onClick={onViewDashboard}>
                  View Dashboard →
                </button>
                <button className="results-btn ghost" onClick={onResetWizard}>
                  New Analysis
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function GbifStatsModal({ onClose }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      // GBIF kingdom taxonKeys (backbone taxonomy)
      const kingdoms = [
        { name: 'Animalia', key: 1 },
        { name: 'Plantae', key: 6 },
        { name: 'Fungi', key: 5 },
        { name: 'Bacteria', key: 3 },
        { name: 'Chromista', key: 4 },
        { name: 'Protozoa', key: 7 },
        { name: 'Archaea', key: 2 },
        { name: 'Viruses', key: 8 },
        { name: 'incertae sedis', key: 0 },
      ]
      try {
        const results = await Promise.all(
          kingdoms.map(async k => {
            const r = await fetch(
              `https://api.gbif.org/v1/occurrence/count?taxonKey=${k.key}`,
              { headers: { 'User-Agent': 'biorisk-ai/1.0' } }
            )
            if (!r.ok) return { kingdom: k.name, count: 0 }
            const count = await r.json()
            return { kingdom: k.name, count: typeof count === 'number' ? count : 0 }
          })
        )
        results.sort((a, b) => b.count - a.count)
        setStats(results)
      } catch (e) {
        console.warn('GBIF stats failed:', e)
        setStats([]) // evita el null crash
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const total = stats?.reduce((s, r) => s + r.count, 0) ?? 0

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 12, padding: '24px',
        width: 480, maxWidth: '90vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>
              GBIF Global Occurrence Stats
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
              Live data from GBIF REST API · Not the S3 snapshot
            </div>
          </div>
          <button type="button" onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: '#9CA3AF', padding: '0 4px',
          }}>×</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>
            Querying GBIF API...
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: '#6B7280', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Kingdom</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: '#6B7280', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Occurrences</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: '#6B7280', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>% of total</th>
                </tr>
              </thead>
              <tbody>
                {(stats ?? []).map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500, color: '#1F2937' }}>{r.kingdom}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#1F2937' }}>
                      {r.count.toLocaleString('en-US')}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#6B7280' }}>
                      {total > 0 ? ((r.count / total) * 100).toFixed(1) : '—'}%
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #E5E7EB', background: '#F9FAFB' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 700, color: '#1F2937' }}>Total</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#18A957' }}>
                    {total.toLocaleString('en-US')}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#6B7280' }}>100%</td>
                </tr>
              </tbody>
            </table>

            <div style={{
              marginTop: 12, padding: '8px 12px',
              background: '#FFFBEB', border: '1px solid #FDE68A',
              borderRadius: 6, fontSize: 10, color: '#92400E',
            }}>
              ⚠ These figures are from the GBIF REST API and may differ from the S3 Parquet snapshot (2026-05-01). Enable Full Analysis Mode for exact snapshot figures.
            </div>
          </>
        )}

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button type="button" onClick={onClose} style={{
            padding: '8px 20px', background: '#18A957', color: 'white',
            border: 'none', borderRadius: 6, fontSize: 12,
            fontWeight: 600, cursor: 'pointer',
          }}>Close</button>
        </div>
      </div>
    </div>
  )
}

function SpeciesExplorerPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(false)

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    setResults(null)
    setSelected(null)
    setProfile(null)
    try {
      const r = await fetch(
        `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(query)}&limit=10&status=ACCEPTED`,
        { headers: { 'User-Agent': 'biorisk-ai/1.0' } }
      )
      const d = await r.json()
      setResults(d.results ?? [])
    } catch (e) {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  async function loadProfile(species) {
    setSelected(species)
    setLoadingProfile(true)
    setProfile(null)
    try {
      const [occ, vn] = await Promise.all([
        fetch(`https://api.gbif.org/v1/occurrence/count?taxonKey=${species.key}`)
          .then(r => r.json()),
        fetch(`https://api.gbif.org/v1/species/${species.key}/vernacularNames?limit=10`)
          .then(r => r.json()),
      ])
      setProfile({ occurrences: occ, vernacularNames: vn.results ?? [] })
    } catch (e) {
      setProfile({ occurrences: null, vernacularNames: [] })
    } finally {
      setLoadingProfile(false)
    }
  }

  return (
    <main className="main">
      <div className="header">
        <div className="h-left">
          <h1>Species Explorer</h1>
          <div className="h-sub">Search species in the GBIF backbone taxonomy</div>
        </div>
      </div>

      <div style={{ padding: '0 24px', maxWidth: 900 }}>
        {/* Search bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Search by scientific or common name... e.g. Eubalaena australis"
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 8,
              border: '1px solid #E5E7EB', fontSize: 13,
              outline: 'none', fontFamily: 'Inter, sans-serif',
            }}
          />
          <button
            onClick={search}
            style={{
              padding: '10px 20px', background: '#18A957', color: 'white',
              border: 'none', borderRadius: 8, fontSize: 13,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            {loading ? '...' : 'Search'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
          {/* Results list */}
          {results && (
            <div>
              {results.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                  No species found for "{query}"
                </div>
              ) : (
                results.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => loadProfile(s)}
                    style={{
                      background: selected?.key === s.key ? '#F0FDF4' : 'white',
                      border: `1px solid ${selected?.key === s.key ? '#BBF7D0' : '#E5E7EB'}`,
                      borderRadius: 10, padding: '12px 16px', marginBottom: 8,
                      cursor: 'pointer', transition: 'all .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#18A957'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = selected?.key === s.key ? '#BBF7D0' : '#E5E7EB'}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, fontStyle: 'italic', color: '#1F2937', marginBottom: 3 }}>
                      {s.scientificName}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, color: '#6B7280' }}>{s.rank}</span>
                      {s.kingdom && <span style={{ fontSize: 10, color: '#9CA3AF' }}>· {s.kingdom}</span>}
                      {s.family && <span style={{ fontSize: 10, color: '#9CA3AF' }}>· {s.family}</span>}
                      {s.status && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '1px 6px',
                          borderRadius: 999, background: '#F0FDF4',
                          color: '#18A957', border: '1px solid #BBF7D0',
                        }}>{s.status}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Species profile */}
          {selected && (
            <div style={{
              background: 'white', border: '1px solid #E5E7EB',
              borderRadius: 10, padding: '20px',
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, fontStyle: 'italic', color: '#1F2937', marginBottom: 4 }}>
                {selected.scientificName}
              </div>
              <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 16 }}>
                GBIF Key: {selected.key} ·{' '}

                <a href={`https://www.gbif.org/species/${selected.key}`}
                  target="_blank" rel="noreferrer"
                  style={{ color: '#18A957' }}
                >
                  View on GBIF →
                </a>
              </div>

              {/* Taxonomy */}
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Taxonomy
              </div>
              {['kingdom', 'phylum', 'class', 'order', 'family', 'genus'].map(rank => (
                selected[rank] && (
                  <div key={rank} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{ color: '#9CA3AF', textTransform: 'capitalize' }}>{rank}</span>
                    <span style={{ color: '#1F2937', fontWeight: 500 }}>{selected[rank]}</span>
                  </div>
                )
              ))}

              {loadingProfile && (
                <div style={{ textAlign: 'center', padding: 16, color: '#9CA3AF', fontSize: 12 }}>
                  Loading occurrence data...
                </div>
              )}

              {profile && (
                <>
                  {/* Occurrences */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      GBIF Occurrences
                    </div>
                    <div style={{
                      background: '#F0FDF4', borderRadius: 8, padding: '10px 14px',
                      fontSize: 20, fontWeight: 700, color: '#18A957',
                    }}>
                      {profile.occurrences?.toLocaleString('en-US') ?? '—'}
                      <span style={{ fontSize: 10, fontWeight: 400, color: '#6B7280', marginLeft: 8 }}>
                        georeferenced records worldwide
                      </span>
                    </div>
                  </div>

                  {/* Vernacular names */}
                  {profile.vernacularNames.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                        Common Names
                      </div>
                      {profile.vernacularNames.slice(0, 6).map((v, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', borderBottom: '1px solid #F3F4F6' }}>
                          <span style={{ color: '#1F2937' }}>{v.vernacularName}</span>
                          <span style={{ color: '#9CA3AF', fontSize: 10 }}>{v.language}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function MonitoringPage() {
  return (
    <main className="main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: '0 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔭</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937', marginBottom: 8 }}>
          Monitoring Insights
        </h1>
        <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.75, marginBottom: 24 }}>
          Re-run analyses over time to track biodiversity trends in your project areas.
          Compare risk scores across different dates and detect early warning signals.
        </p>
        <div style={{
          background: '#F0FDF4', border: '1px solid #BBF7D0',
          borderRadius: 10, padding: '16px 20px',
          fontSize: 12, color: '#166534', fontWeight: 600,
        }}>
          🚧 Coming soon — available after Challenge submission
        </div>
      </div>
    </main>
  )
}

function DataSourcesPage() {
  return (
    <main className="main">
      <div className="header">
        <div className="h-left">
          <h1>Data Sources</h1>
          <div className="h-sub">Open data powering BioRisk AI</div>
        </div>
      </div>
      <div style={{ padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>
        {[
          {
            icon: '🌐', name: 'GBIF — Global Biodiversity Information Facility',
            desc: 'The world\'s largest open-access biodiversity database with over 2 billion occurrence records from 70,000+ datasets worldwide.',
            link: 'https://www.gbif.org',
            badge: 'CC BY 4.0', badgeColor: '#18A957',
            stats: '2B+ records · 70K+ datasets · Free API',
          },
          {
            icon: '🛰', name: 'Sentinel-2 L2A — Copernicus Programme',
            desc: 'ESA satellite imagery at 10m resolution updated every 5 days. Used for NDVI vegetation health and land cover analysis.',
            link: 'https://dataspace.copernicus.eu',
            badge: 'Free tier', badgeColor: '#3B82F6',
            stats: '10m resolution · 5-day revisit · 2017–present',
          },
          {
            icon: '🛡', name: 'WDPA — World Database of Protected Areas',
            desc: 'The most comprehensive global database of marine and terrestrial protected areas, managed by UNEP-WCMC and IUCN.',
            link: 'https://www.protectedplanet.net',
            badge: 'Free API', badgeColor: '#18A957',
            stats: '260K+ protected areas · Global coverage',
          },
          {
            icon: '📚', name: 'GBIF Literature Index',
            desc: 'Scientific papers that cite GBIF data, providing peer-reviewed evidence for biodiversity assessments.',
            link: 'https://www.gbif.org/literature-search',
            badge: 'CC BY 4.0', badgeColor: '#18A957',
            stats: '10K+ papers indexed · Peer-reviewed',
          },
          {
            icon: '📋', name: 'IUCN Red List of Threatened Species',
            desc: 'The world\'s most comprehensive inventory of species conservation status. Integration pending approval.',
            link: 'https://www.iucnredlist.org',
            badge: 'Pending', badgeColor: '#F5A623',
            stats: '150K+ species assessed · Updated annually',
          },
          {
            icon: '☁️', name: 'AWS Open Data — GBIF S3 Snapshot',
            desc: 'Complete GBIF occurrence dataset in Parquet format hosted on AWS S3 in São Paulo. Powers Full Analysis Mode.',
            link: 'https://registry.opendata.aws/gbif/',
            badge: 'Free access', badgeColor: '#3B82F6',
            stats: 'Snapshot 2026-05-01 · sa-east-1 · ~180GB',
          },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'white', border: '1px solid #E5E7EB',
            borderRadius: 12, padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 28 }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1F2937', marginBottom: 4 }}>{s.name}</div>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 7px',
                  borderRadius: 999, background: s.badgeColor + '18',
                  color: s.badgeColor, border: `1px solid ${s.badgeColor}40`,
                }}>{s.badge}</span>
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.6, marginBottom: 8 }}>{s.desc}</p>
            <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 8 }}>{s.stats}</div>
            <a href={s.link} target="_blank" rel="noreferrer"
              style={{ fontSize: 11, color: '#18A957', textDecoration: 'none', fontWeight: 600 }}>
              Visit source →
            </a>
          </div>
        ))}
      </div>
      <div style={{ padding: '16px 24px', fontSize: 10, color: '#9CA3AF' }}>
        Occurrence data from GBIF.org under CC BY 4.0 · BioRisk AI © 2026
      </div>
    </main>
  )
}

function WelcomePage({ onStart }) {
  return (
    <main className="main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 560, padding: '0 24px', width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
          <h1 style={{
            fontSize: 26, fontWeight: 700, color: '#1F2937',
            letterSpacing: '-0.02em', marginBottom: 8,
          }}>
            Welcome to BioRisk AI
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7 }}>
            Latin America hosts 40% of the world's known species —<br />
            yet biodiversity is rarely factored into investment decisions.<br />
            <strong style={{ color: '#1F2937' }}>BioRisk AI changes that.</strong>
          </p>
        </div>

        {/* What it is */}
        <div style={{
          background: '#F9FAFB', border: '1px solid #E5E7EB',
          borderRadius: 10, padding: '16px 20px', marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.75, marginBottom: 10 }}>
            BioRisk AI turns open GBIF occurrence data into actionable biodiversity
            intelligence — in minutes, not months. Draw your project area, run a scan,
            and get a screening-grade risk profile backed by real species records,
            satellite vegetation data, and protected area analysis.
          </p>
          <p style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.6 }}>
            Supports <strong style={{ color: '#1F2937' }}>TNFD LEAP</strong> and{' '}
            <strong style={{ color: '#1F2937' }}>CSRD ESRS E4</strong> — a single analysis
            covers both frameworks. Used by 500+ companies and 129 financial institutions
            representing $17.7T in assets globally.
          </p>
        </div>

        {/* Designed for */}
        <div style={{
          background: '#F0FDF4', border: '1px solid #BBF7D0',
          borderRadius: 10, padding: '14px 20px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Designed for
          </div>
          {[
            'ESG analysts preparing TNFD / CSRD disclosures',
            'Environmental consultants screening project sites',
            'Multilateral Development Banks applying IFC PS6 / Equator Principles safeguards',
            'Companies exporting to the EU under CSRD scope (Directive 2022/2464)',
            'Researchers studying anthropogenic impacts on biodiversity',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 12, color: '#166534' }}>
              <span style={{ color: '#18A957', flexShrink: 0 }}>✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* Not a replacement */}
        <div style={{
          background: '#FFFBEB', border: '1px solid #FDE68A',
          borderRadius: 10, padding: '10px 16px', marginBottom: 28,
          fontSize: 11, color: '#92400E',
        }}>
          ⚠ <strong>Not a replacement for:</strong> formal field surveys or ESIA assessments.
          Screening-grade results only.
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <button
            onClick={onStart}
            style={{
              background: '#18A957', color: 'white', border: 'none',
              borderRadius: 10, padding: '14px 40px',
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(24,169,87,0.35)',
              transition: 'all .15s', display: 'inline-block',
            }}
          >
            Start New Analysis →
          </button>
        </div>

        {/* Steps */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10, marginBottom: 24,
        }}>
          {[
            { icon: '🗺', title: 'Draw polygon', desc: 'Define your project area on the map' },
            { icon: '🔬', title: 'GBIF scan', desc: '14 taxa · 16 LAC countries' },
            { icon: '📊', title: 'Risk report', desc: 'TNFD · CSRD · IFC PS6 aligned' },
          ].map((step, i) => (
            <div key={i} style={{
              background: 'white', border: '1px solid #E5E7EB',
              borderRadius: 8, padding: '14px 10px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{step.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#1F2937', marginBottom: 3 }}>
                {step.title}
              </div>
              <div style={{ fontSize: 10, color: '#9CA3AF', lineHeight: 1.5 }}>
                {step.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 10, color: '#9CA3AF', lineHeight: 1.8 }}>
          Covering 16 countries across Latin America and the Caribbean<br />
          Powered by GBIF · Sentinel-2 · WDPA · FAO Whisp · Global Forest Watch
        </div>

      </div>
    </main>
  )
}

function ProjectsPage({ projects, onSelectProject, onNewAnalysis }) {
  const getRiskColor = (category) => {
    if (!category) return '#9CA3AF'
    if (category.includes('Critical')) return '#E84C3D'
    if (category.includes('High')) return '#F5A623'
    if (category.includes('Moderate')) return '#FBBF24'
    return '#18A957'
  }

  return (
    <main className="main">
      <div className="header">
        <div className="h-left">
          <h1>Projects</h1>
          <div className="h-sub">Your biodiversity risk analyses</div>
        </div>
        <div className="h-right">
          <button className="btn" onClick={onNewAnalysis}>
            ➕ New Analysis
          </button>
        </div>
      </div>

      <div style={{ padding: '0 24px' }}>
        {projects.length === 0 ? (
          <div style={{
            background: 'white', border: '1px solid #E5E7EB',
            borderRadius: 12, padding: '60px 32px',
            textAlign: 'center', marginTop: 24,
          }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>📁</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', marginBottom: 6 }}>
              No projects yet
            </div>
            <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 24 }}>
              Run a New Analysis to see your projects here.
            </div>
            <button className="btn" onClick={onNewAnalysis}>
              ➕ Start your first analysis
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => onSelectProject(project)}
                style={{
                  background: 'white', border: '1px solid #E5E7EB',
                  borderRadius: 12, padding: '16px 20px',
                  cursor: 'pointer', transition: 'all .15s',
                  display: 'flex', alignItems: 'center', gap: 16,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#18A957'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E7EB'}
              >
                {/* Risk score badge */}
                <div style={{
                  width: 56, height: 56, borderRadius: 12, flexShrink: 0,
                  background: getRiskColor(project.riskScore?.category) + '18',
                  border: `2px solid ${getRiskColor(project.riskScore?.category)}`,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    fontSize: 18, fontWeight: 700,
                    color: getRiskColor(project.riskScore?.category),
                    lineHeight: 1,
                  }}>
                    {project.riskScore?.score ?? '—'}
                  </div>
                  <div style={{ fontSize: 8, color: '#9CA3AF' }}>/100</div>
                </div>

                {/* Project info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1F2937', marginBottom: 4 }}>
                    {project.name}
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>
                      🌍 {COUNTRY_NAMES[project.country] ?? project.country}
                    </span>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>
                      ⚙️ {project.sector}
                    </span>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>
                      📍 {project.totalInPolygon?.toLocaleString('en-US')} occurrences
                    </span>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>
                      📅 {project.date}
                    </span>
                  </div>
                </div>

                {/* Risk category */}
                <div style={{
                  padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                  flexShrink: 0,
                  background: getRiskColor(project.riskScore?.category) + '18',
                  color: getRiskColor(project.riskScore?.category),
                  border: `1px solid ${getRiskColor(project.riskScore?.category)}40`,
                }}>
                  {project.riskScore?.category ?? 'Unknown'}
                </div>

                <div style={{ fontSize: 16, color: '#9CA3AF', flexShrink: 0 }}>→</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

// ─── Main app ────────────────────────────────────────────────────────────────
export default function App() {
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user, getAccessTokenSilently, getIdTokenClaims } = useAuth0()
  const [activePage, setActivePage] = useState('dashboard')
  const [gbifData, setGbifData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [projectName, setProjectName] = useState('Offshore Wind Farm – Patagonia')
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [dashboardTab, setDashboardTab] = useState('overview')
  const [showFullAnalysis, setShowFullAnalysis] = useState(false)

  // ─── New Analysis wizard state ───
  const [page, setPage] = useState('welcome')
  const [analysisStep, setAnalysisStep] = useState(1)
  const [drawnPoints, setDrawnPoints] = useState([])
  const [drawnPolygon, setDrawnPolygon] = useState(null)
  const [analysisProject, setAnalysisProject] = useState({
    name: '',
    country: 'AR',
    sector: 'Wind Energy',
  })
  const [scanResults, setScanResults] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanStepLabel, setScanStepLabel] = useState('')
  const [showDemoBanner, setShowDemoBanner] = useState(true)
  const [activePolygon, setActivePolygon] = useState(null)
  const [mapCenter, setMapCenter] = useState([-20, -60])
  const [mapZoom, setMapZoom] = useState(3)
  const [copilotKey, setCopilotKey] = useState(0)
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)

  function handleNav(id) {
    setActivePage(id)
    if (id === 'new') {
      setPage('new-analysis')
      setAnalysisStep(1)
      setActivePolygon(null)
      setAnalysisProject({ name: '', country: 'AR', sector: 'Wind Energy' })
      setDrawnPoints([])
      setDrawnPolygon(null)
      setScanResults(null)
    } else if (id === 'dashboard') {
      setPage(gbifData?.polygonCount > 0 ? 'dashboard' : 'welcome')
    } else if (id === 'projects') {
      setPage('projects')
    } else if (id === 'species') {
      setPage('species')
    } else if (id === 'sources') {
      setPage('sources')
    } else if (id === 'monitoring') {
      setPage('monitoring')
    } else {
      setPage('welcome')
    }
  }

  function resetWizard() {
    setAnalysisStep(1)
    setDrawnPoints([])
    setDrawnPolygon(null)
    setScanResults(null)
    setScanProgress(0)
    setScanning(false)
    setAnalysisProject({ name: '', country: 'AR', sector: 'Wind Energy' })
    setActivePolygon(null)
  }

  async function runScan() {
    setAnalysisStep(2)
    setScanning(true)
    setScanProgress(0)
    setScanStepLabel('')

    const country = analysisProject.country
    const polygon = drawnPolygon
    const bbox = getBoundingBox(polygon)

    try {
      setScanProgress(1)
      await delay(500)

      setScanProgress(2)
      setScanStepLabel(`Querying GBIF for ${SCAN_TAXA.length} taxonomic groups...`)

      let spatialData = null
      if (MODE === 'full') {
        spatialData = await queryMCPServer('analyze_sampling_gaps', {
          taxon_name: 'Aves',
          countries: [country],
          bbox,
        })
      }

      // 6 parallel bbox-filtered occurrence queries (one per taxon)
      // plus the existing country-level metadata queries.
      const [taxaOccurrences, aves, mammalia, gaps, papers, wdpa, ndvi] = await Promise.all([
        Promise.all(
          SCAN_TAXA.map(taxon =>
            callGbif('search_occurrences', {
              taxon_name: taxon.name,
              taxon_rank: taxon.taxon_rank,
              has_coordinate: true,
              lat_min: bbox.minLat,
              lat_max: bbox.maxLat,
              lng_min: bbox.minLng,
              lng_max: bbox.maxLng,
              limit: 300,
            }).catch(() => null)
          )
        ),
        callGbif('count_occurrences', { taxon_name: 'Aves', country }).catch(() => null),
        callGbif('count_occurrences', { taxon_name: 'Mammalia', country }).catch(() => null),
        callGbif('analyze_sampling_gaps', { taxon_name: 'Aves', countries: [country] }).catch(() => null),
        callGbif('search_literature', {
          taxon_name: 'Aves',
          country_of_coverage: country,
          peer_review: true, limit: 5,
        }).catch(() => null),
        queryProtectedAreas(bbox, country).catch(() => null),
        queryNDVI(drawnPolygon).catch(() => null),


      ])

      // Per-taxon point-in-polygon refinement.
      const taxaInPolygon = SCAN_TAXA.map((taxon, i) => {
        const results = taxaOccurrences[i]?.results ?? []
        const inside = results.filter(occ =>
          occ.lat != null && occ.lng != null &&
          pointInPolygon([occ.lat, occ.lng], polygon)
        )
        return {
          ...taxon,
          total: taxaOccurrences[i]?.total ?? 0,
          sampleSize: results.length,
          inPolygon: inside.length,
          records: inside,
        }
      })
      const totalInPolygon = taxaInPolygon.reduce((s, t) => s + t.inPolygon, 0)

      // Buffer zone analysis (5km indirect influence area)
      let bufferData = null
      try {
        const turfPolygon = turf.polygon([[...polygon.map(p => [p[1], p[0]]), [polygon[0][1], polygon[0][0]]]])
        const buffered = turf.buffer(turfPolygon, 5, { units: 'kilometers' })
        const bufferCoords = buffered.geometry.coordinates[0].map(c => [c[1], c[0]])

        const inBuffer = SCAN_TAXA.map((taxon, i) => {
          const results = taxaOccurrences[i]?.results ?? []
          const insideBuffer = results.filter(occ =>
            occ.lat != null && occ.lng != null &&
            pointInPolygon([occ.lat, occ.lng], bufferCoords) &&
            !pointInPolygon([occ.lat, occ.lng], polygon)
          )
          return {
            name: taxon.name,
            inBuffer: insideBuffer.length,
          }
        })

        bufferData = {
          totalInBuffer: inBuffer.reduce((s, t) => s + t.inBuffer, 0),
          byTaxa: inBuffer,
          bufferKm: 5,
          polygon: bufferCoords,
        }
      } catch (e) {
        console.warn('Buffer calculation failed:', e.message)
      }

      setScanProgress(3)
      setScanStepLabel(`Filtering ${totalInPolygon} records by polygon boundary...`)
      await delay(600)

      setScanProgress(4)
      setScanStepLabel('Calculating biodiversity risk score...')
      await delay(500)

      const riskScore = calculateRiskScore({
        taxaInPolygon,
        papers: papers?.total ?? 0,
        mode: MODE,
      })

      setScanProgress(5)
      setScanStepLabel('')
      await delay(400)

      // Calculate WDPA areas that intersect with the polygon
      let wdpaIntersecting = []
      if (wdpa?.areas?.length && polygon) {
        const turfPolygon = turf.polygon([[...polygon.map(p => [p[1], p[0]]), [polygon[0][1], polygon[0][0]]]])
        wdpaIntersecting = wdpa.areas.filter(area => {
          if (!area.geometry) return false
          try {
            const areaFeature = { type: 'Feature', geometry: area.geometry }
            return turf.booleanIntersects(turfPolygon, areaFeature)
          } catch (e) {
            return false
          }
        })
      }

      const wdpaEnriched = wdpa ? {
        ...wdpa,
        intersecting: wdpaIntersecting,
        intersectingCount: wdpaIntersecting.length,
      } : null

      setScanResults({
        aves,
        mammalia,
        gaps,
        bufferData,
        papers,
        wdpa: wdpaEnriched,
        ndvi,
        spatialData,
        riskScore,
        taxaInPolygon,
        totalInPolygon,
        mode: MODE,
        polygon,
        country,
      })

      setAnalysisStep(3)
    } catch (e) {
      console.error('Scan failed:', e)
    } finally {
      setScanning(false)
      setScanStepLabel('')
    }
  }

  function viewDashboardFromScan() {
    if (!scanResults) return

    // Save project to list
    const newProject = {
      id: Date.now(),
      name: analysisProject.name,
      country: analysisProject.country,
      sector: analysisProject.sector,
      riskScore: scanResults.riskScore,
      totalInPolygon: scanResults.totalInPolygon,
      date: new Date().toLocaleDateString('en-US'),
      polygon: drawnPolygon,
      gbifData: {
        avesCount: scanResults.aves,
        mammaliaCount: scanResults.mammalia,
        gaps: scanResults.gaps,
        whales: { total: scanResults.totalInPolygon, results: scanResults.taxaInPolygon?.flatMap(t => t.records) ?? [] },
        papers: scanResults.papers,
        riskScore: scanResults.riskScore,
        taxaInPolygon: scanResults.taxaInPolygon,
        allTaxaRecords: scanResults.taxaInPolygon,
        polygonCount: scanResults.totalInPolygon ?? 0,
        polygonSample: 300,
        wdpa: scanResults.wdpa,
        ndvi: scanResults.ndvi,
        queriedAt: new Date(),
      }
    }

    // Save to state
    setProjects(prev => [newProject, ...prev])

    // Save to Supabase if user is logged in
    if (user?.sub) {
      getIdTokenClaims().then(claims => {
        const token = claims?.__raw
        const client = getSupabaseWithAuth(token)
        client.from('projects').insert({
          user_id: user.sub,
          name: newProject.name,
          country: newProject.country,
          sector: newProject.sector,
          risk_score: newProject.riskScore,
          total_in_polygon: newProject.totalInPolygon,
          polygon: newProject.polygon,
          gbif_data: newProject.gbifData,
        }).then(({ error }) => {
          if (error) console.warn('Failed to save project to Supabase:', error.message)
          else console.log('✅ Project saved to Supabase')
        })
      })
    }

    // Update gbifData with real scan results
    const allRecords = scanResults.taxaInPolygon?.flatMap(t => t.records) ?? []
    setGbifData({
      avesCount: scanResults.aves,
      mammaliaCount: scanResults.mammalia,
      gaps: scanResults.gaps,
      whales: {
        total: scanResults.totalInPolygon,
        results: allRecords,
      },
      papers: scanResults.papers,
      bufferData: scanResults.bufferData,
      riskScore: scanResults.riskScore,
      taxaInPolygon: scanResults.taxaInPolygon,
      allTaxaRecords: scanResults.taxaInPolygon,
      polygonCount: scanResults.totalInPolygon ?? 0,
      polygonSample: 300,
      wdpa: scanResults.wdpa,
      queriedAt: new Date(),
      ndvi: scanResults.ndvi,

    })

    // Update project name in header
    setProjectName(analysisProject.name)

    // Update map polygon, center, and zoom
    if (drawnPolygon && drawnPolygon.length >= 3) {
      setActivePolygon(drawnPolygon)
      const centroid = drawnPolygon
        .reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0])
        .map(v => v / drawnPolygon.length)
      setMapCenter(centroid)
      setMapZoom(7)
    }

    // Hide demo banner permanently
    setShowDemoBanner(false)

    // Force copilot to remount with a fresh greeting + new context
    setCopilotKey(k => k + 1)

    // Return to dashboard
    setPage('dashboard')
    setActivePage('dashboard')
    setAnalysisStep(1)
  }

  useEffect(() => {
    let cancelled = false
    async function fetchAll() {
      const safe = (label, p) => p.catch(e => { console.error(`[GBIF] ${label} failed:`, e); return null })
      try {
        const [gaps, avesCount, mammaliaCount, whales, papers, whaleProfile] = await Promise.all([
          safe('analyze_sampling_gaps', callGbif('analyze_sampling_gaps', { taxon_name: 'Aves', countries: ['AR'] })),
          safe('count_occurrences:Aves', callGbif('count_occurrences', { taxon_name: 'Aves', country: 'AR' })),
          safe('count_occurrences:Mammalia', callGbif('count_occurrences', { taxon_name: 'Mammalia', country: 'AR' })),
          safe('search_occurrences:whales', callGbif('search_occurrences', { taxon_name: 'Eubalaena australis', country: 'AR', limit: 10 })),
          safe('search_literature:Aves', callGbif('search_literature', { taxon_name: 'Aves', country_of_coverage: 'AR', peer_review: true, limit: 5 })),
          safe('resolve_taxon_full_profile', callGbif('resolve_taxon_full_profile', { name: 'Eubalaena australis' })),
        ])
        if (cancelled) return
        const data = { gaps, avesCount, mammaliaCount, whales, papers, whaleProfile, queriedAt: new Date() }
        setGbifData(data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAll()
    return () => { cancelled = true }
  }, [])


  useEffect(() => {
    if (!user?.sub) return
    async function loadProjects() {
      try {
        const claims = await getIdTokenClaims()
        const token = claims?.__raw
        const client = getSupabaseWithAuth(token)
        const { data, error } = await client
          .from('projects')
          .select('*')
          .eq('user_id', user.sub)
          .order('date', { ascending: false })
        if (error) {
          console.warn('Failed to load projects:', error.message)
          return
        }
        if (data) {
          setProjects(data.map(p => ({
            id: p.id,
            name: p.name,
            country: p.country,
            sector: p.sector,
            riskScore: p.risk_score,
            totalInPolygon: p.total_in_polygon,
            polygon: p.polygon,
            gbifData: p.gbif_data,
            date: new Date(p.date).toLocaleDateString('en-US'),
          })))
        }
      } catch (e) {
        console.warn('Failed to load projects:', e.message)
      }
    }
    loadProjects()
  }, [user])


  function exportReport(data, project, name) {
    if (!data?.riskScore) {
      alert('Please run an analysis first before exporting a report.')
      return
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W = 210
    const margin = 16
    let y = 20

    // ─── Colors ───
    const green = [24, 169, 87]
    const navy = [6, 21, 43]
    const gray = [107, 114, 128]
    const light = [245, 247, 250]
    const red = [232, 76, 61]
    const orange = [245, 166, 35]

    // ─── Header ───
    doc.setFillColor(...navy)
    doc.rect(0, 0, W, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('BioRisk AI', margin, 12)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Biodiversity Risk Intelligence · ESG & TNFD Screening', margin, 20)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, W - margin, 20, { align: 'right' })
    y = 38

    // ─── Project title ───
    doc.setTextColor(...navy)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(name || 'Biodiversity Risk Report', margin, y)
    y += 6

    const country = COUNTRY_NAMES[project?.country] || project?.country || 'Argentina'
    const sector = project?.sector || 'Wind Energy'
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...gray)
    doc.text(`${country} · ${sector} · ${new Date().toLocaleDateString()}`, margin, y)
    y += 10

    // ─── Divider ───
    doc.setDrawColor(...green)
    doc.setLineWidth(0.5)
    doc.line(margin, y, W - margin, y)
    y += 8

    // ─── Risk Score box ───
    const score = data.riskScore?.score ?? 0
    const category = data.riskScore?.category ?? 'Unknown'
    const scoreColor = score >= 76 ? red : score >= 51 ? orange : green

    doc.setFillColor(...light)
    doc.roundedRect(margin, y, W - margin * 2, 28, 3, 3, 'F')

    doc.setFontSize(28)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...scoreColor)
    doc.text(`${score}`, margin + 8, y + 18)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...navy)
    doc.text(`/ 100 — ${category}`, margin + 24, y + 18)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...gray)
    doc.text(`Based on ${(data.polygonCount ?? 0).toLocaleString('en-US')} occurrence records · ${data.riskScore?.taxaFound ?? 0} taxa detected`, margin + 8, y + 24)
    y += 36

    // ─── Section helper ───
    const section = (title) => {
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...navy)
      doc.text(title, margin, y)
      doc.setDrawColor(...green)
      doc.setLineWidth(0.3)
      doc.line(margin, y + 2, W - margin, y + 2)
      y += 8
    }

    // ─── Taxa breakdown ───
    section('Biodiversity Scan Results')
    const taxa = data.taxaInPolygon?.filter(t => t.inPolygon > 0) ?? []
    taxa.forEach(t => {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...gray)
      doc.text(`${t.name}`, margin + 4, y)
      doc.setTextColor(...navy)
      doc.setFont('helvetica', 'bold')
      doc.text(`${t.inPolygon} records`, margin + 60, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...gray)
      doc.text(`(sample of ${t.sampleSize ?? 300})`, margin + 90, y)
      y += 5.5
    })
    y += 4

    // ─── NDVI ───
    if (data.ndvi) {
      section('Vegetation Health (Sentinel-2 NDVI)')
      const ndvi = data.ndvi
      const rows = [
        ['NDVI Mean', ndvi.mean.toFixed(3), ndvi.interpretation],
        ['Trend', ndvi.trend, `${ndvi.slope > 0 ? '+' : ''}${ndvi.slope.toFixed(4)}/period`],
        ['ΔYoY', `${ndvi.deltaYoY > 0 ? '+' : ''}${ndvi.deltaYoY.toFixed(3)}`, `${ndvi.quarterly?.length ?? 0} periods analyzed`],
      ]
      rows.forEach(([label, val, note]) => {
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...gray)
        doc.text(label, margin + 4, y)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...navy)
        doc.text(val, margin + 50, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...gray)
        doc.text(note, margin + 80, y)
        y += 5.5
      })
      y += 4
    }

    // ─── Protected Areas ───
    if (data.wdpa) {
      section('Protected Areas (WDPA)')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...gray)
      doc.text(`${data.wdpa.total} protected areas identified in region`, margin + 4, y)
      y += 5.5
      data.wdpa.areas?.slice(0, 4).forEach(a => {
        doc.text(`• ${a.name} (IUCN Cat. ${a.iucnCategory})`, margin + 8, y)
        y += 5
      })
      y += 4
    }

    // ─── TNFD ───
    section('TNFD LEAP Assessment')
    const leapItems = [
      { label: 'Locate', done: (data.polygonCount ?? 0) > 0 || data.wdpa != null },
      { label: 'Evaluate', done: (data.polygonCount ?? 0) > 0 },
      { label: 'Assess', done: data.riskScore != null },
      { label: 'Prepare', done: false },
    ]
    leapItems.forEach(item => {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...(item.done ? green : gray))
      doc.text(item.done ? '✓' : '—', margin + 4, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...navy)
      doc.text(item.label, margin + 12, y)
      y += 5.5
    })
    y += 4

    // ─── Disclaimer ───
    if (y > 240) { doc.addPage(); y = 20 }

    doc.setFillColor(...light)
    doc.roundedRect(margin, y, W - margin * 2, 22, 3, 3, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...gray)
    const disclaimer = 'This report is a screening-grade assessment based on publicly available GBIF occurrence data. It does not replace formal Environmental & Social Impact Assessments (ESIA) or field surveys. Occurrence data from GBIF.org under CC BY 4.0.'
    const lines = doc.splitTextToSize(disclaimer, W - margin * 2 - 8)
    doc.text(lines, margin + 4, y + 7)
    y += 26

    // ─── Footer ───
    doc.setFontSize(7)
    doc.setTextColor(...gray)
    doc.text('BioRisk AI · Powered by GBIF · Sentinel-2 · WDPA · Generated ' + new Date().toISOString().slice(0, 10), W / 2, 290, { align: 'center' })

    // ─── Save ───
    const filename = `BioRisk-AI-${(name || 'Report').replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`
    doc.save(filename)
  }

  const isWizard = page === 'new-analysis'
  const isWelcome = page === 'welcome'
  const isProjects = page === 'projects'
  const isSpecies = page === 'species'
  const isSources = page === 'sources'
  const isMonitoring = page === 'monitoring'
  return (
    <>
      <style>{CSS}</style>

      {/* Auth0 loading */}
      {isLoading && (
        <div style={{
          position: 'fixed', inset: 0, background: '#06152B',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999,
        }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>BioRisk AI</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>Loading...</div>
          </div>
        </div>
      )}

      {/* Login screen */}
      {!isLoading && !isAuthenticated && (
        <div style={{
          position: 'fixed', inset: 0, background: '#06152B',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999,
        }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: '48px 40px',
            width: 400, maxWidth: '90vw', textAlign: 'center',
            boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
            <h1 style={{
              fontSize: 24, fontWeight: 700, color: '#1F2937',
              marginBottom: 8, letterSpacing: '-0.02em',
            }}>BioRisk AI</h1>
            <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 8, lineHeight: 1.6 }}>
              Biodiversity risk intelligence for ESG & TNFD
            </p>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 32, lineHeight: 1.6 }}>
              Powered by GBIF · Sentinel-2 · WDPA
            </p>

            <button
              onClick={() => loginWithRedirect()}
              style={{
                width: '100%', padding: '14px',
                background: '#18A957', color: 'white',
                border: 'none', borderRadius: 10,
                fontSize: 15, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(24,169,87,0.35)',
                marginBottom: 12,
              }}
            >
              Sign in
            </button>

            <div style={{ fontSize: 10, color: '#9CA3AF', lineHeight: 1.6 }}>
              For demo access contact:<br />
              <strong style={{ color: '#6B7280' }}>demo@biorisk.ai</strong>
            </div>
          </div>
        </div>
      )}
      {showStatsModal && (
        <GbifStatsModal onClose={() => setShowStatsModal(false)} />
      )}

      <div
        className="app"
        style={{
          gridTemplateColumns: isWizard ? '220px 1fr' : '220px 1fr 340px',
        }}
      >
        <Sidebar activePage={activePage} setActivePage={handleNav} user={user} logout={logout} />
        {isWizard ? (
          <NewAnalysisPage
            analysisStep={analysisStep}
            setAnalysisStep={setAnalysisStep}
            drawnPoints={drawnPoints}
            setDrawnPoints={setDrawnPoints}
            drawnPolygon={drawnPolygon}
            setDrawnPolygon={setDrawnPolygon}
            analysisProject={analysisProject}
            setAnalysisProject={setAnalysisProject}
            scanResults={scanResults}
            scanProgress={scanProgress}
            scanStepLabel={scanStepLabel}
            onBack={() => { setPage('dashboard'); setActivePage('dashboard') }}
            onRunScan={runScan}
            onViewDashboard={viewDashboardFromScan}
            onResetWizard={resetWizard}
          />
        ) : isWelcome ? (
          <WelcomePage onStart={() => { setPage('new-analysis'); setActivePage('new') }} />
        ) : isProjects ? (
          <ProjectsPage
            projects={projects}
            onSelectProject={(project) => {
              setGbifData(project.gbifData)
              setProjectName(project.name)
              setActivePolygon(project.polygon)
              setAnalysisProject({ name: project.name, country: project.country, sector: project.sector })
              if (project.polygon?.length >= 3) {
                const centroid = project.polygon
                  .reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0])
                  .map(v => v / project.polygon.length)
                setMapCenter(centroid)
                setMapZoom(7)
              }
              setPage('dashboard')
              setActivePage('dashboard')
              setCopilotKey(k => k + 1)
            }}
            onNewAnalysis={() => { setPage('new-analysis'); setActivePage('new') }}
          />
        ) : isSpecies ? (
          <SpeciesExplorerPage />
        ) : isMonitoring ? (
          <MonitoringPage />
        ) : isSources ? (
          <DataSourcesPage />
        ) : (
          <>
            <main className="main">
              <div className="header">
                <div className="h-left">
                  <h1>Project Analysis</h1>
                  <div className="h-sub">{projectName}</div>
                </div>
                <div className="h-right">
                  <span className="badge">ID · BR-2026-0142</span>
                  <span className="badge">May 13, 2026</span>
                  <button className="btn" onClick={() => exportReport(gbifData, analysisProject, projectName)}>
                    Export Report
                  </button>
                  <span
                    className="badge"
                    style={
                      MODE === 'full'
                        ? { background: 'var(--green-pale)', color: 'var(--green)', borderColor: '#BBF7D0', fontWeight: 600 }
                        : { background: 'var(--bg)', color: 'var(--text2)', fontWeight: 600 }
                    }
                    title={MODE === 'full'
                      ? 'Connected to local MCP server with S3-backed analyses'
                      : 'Direct GBIF REST API mode'}
                  >
                    {MODE === 'full' ? '🔬 Full Analysis Mode — S3' : '⚡ Demo Mode — REST API'}
                  </span>
                </div>
              </div>

              {showDemoBanner && (
                <div className="demo-banner" style={{ margin: '0 0 18px' }}>
                  <span className="demo-banner-icon">🌿</span>
                  <div className="demo-banner-body">
                    <div className="demo-banner-title">You're viewing a demo analysis</div>
                    <div className="demo-banner-sub">
                      This dashboard shows a pre-loaded example for an Offshore Wind Farm
                      in Patagonia, Argentina. Run your own analysis to see real biodiversity
                      data for your project area.
                    </div>
                  </div>
                  <button
                    className="demo-banner-cta"
                    onClick={() => {
                      setPage('new-analysis')
                      setActivePage('new')
                      setAnalysisStep(1)
                    }}
                  >
                    Run your own analysis →
                  </button>
                  <button
                    className="demo-banner-x"
                    aria-label="Dismiss"
                    onClick={() => setShowDemoBanner(false)}
                  >
                    ×
                  </button>
                </div>
              )}

              <WorkflowBar />

              {/* Tab navigation */}
              <div style={{
                display: 'flex', gap: 4, padding: '0 24px 16px',
                borderBottom: '1px solid #E5E7EB', marginBottom: 20,
              }}>
                {[
                  { id: 'overview', label: '🏠 Overview' },
                  { id: 'tnfd', label: '📋 TNFD & ESG' },
                  { id: 'vegetation', label: '🛰 Vegetation' },
                  { id: 'mitigation', label: '🛡 Mitigation' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDashboardTab(tab.id)}
                    style={{
                      padding: '8px 16px', borderRadius: 8, fontSize: 12,
                      fontWeight: 600, border: '1px solid #E5E7EB',
                      cursor: 'pointer', transition: 'all .15s',
                      background: dashboardTab === tab.id ? '#18A957' : '#F9FAFB',
                      color: dashboardTab === tab.id ? 'white' : '#6B7280',
                      borderColor: dashboardTab === tab.id ? '#18A957' : '#E5E7EB',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* OVERVIEW TAB */}
              {dashboardTab === 'overview' && (
                <>
                  <div style={{ position: 'relative', marginBottom: 18 }}>
                    <MapCard
                      polygon={activePolygon}
                      center={mapCenter}
                      zoom={mapZoom}
                      allTaxaRecords={gbifData?.allTaxaRecords}
                      fullWidth={true}
                      ndviData={gbifData?.ndvi}
                      wdpaData={gbifData?.wdpa}
                      bufferData={gbifData?.bufferData}
                    />
                    {/* Risk Score flotante */}
                    <div style={{
                      position: 'absolute', bottom: 12, right: 12, zIndex: 1000,
                      background: 'white', borderRadius: 12,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      border: '1px solid #E5E7EB',
                      padding: '16px 20px', minWidth: 160, textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Risk Score
                      </div>
                      <div style={{
                        fontSize: 36, fontWeight: 700, lineHeight: 1,
                        color: gbifData?.riskScore?.score >= 76 ? '#E84C3D' :
                          gbifData?.riskScore?.score >= 51 ? '#F5A623' :
                            gbifData?.riskScore?.score >= 26 ? '#FBBF24' : '#18A957'
                      }}>
                        {gbifData?.riskScore?.score ?? '—'}
                      </div>
                      <div style={{
                        fontSize: 10, marginTop: 4, fontWeight: 600,
                        color: gbifData?.riskScore?.score >= 76 ? '#E84C3D' :
                          gbifData?.riskScore?.score >= 51 ? '#F5A623' : '#18A957'
                      }}>
                        {gbifData?.riskScore?.category ?? 'No analysis'}
                      </div>
                      {gbifData?.riskScore && (
                        <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 6, lineHeight: 1.4 }}>
                          {gbifData.polygonCount?.toLocaleString('en-US')} records<br />
                          {gbifData.riskScore.taxaFound} taxa detected
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid row-2">
                    <KeyFindingsCard data={gbifData} loading={loading} />
                    <SpeciesRichnessCard data={gbifData} loading={loading} />
                  </div>

                  {/* Temporal baseline */}
                  {gbifData?.taxaInPolygon && (() => {
                    const allRecords = gbifData.taxaInPolygon.flatMap(t => t.records ?? [])
                    const yearMap = {}
                    allRecords.forEach(r => {
                      const year = r.eventDate?.slice(0, 4)
                      if (year && year >= '2000' && year <= '2026') {
                        yearMap[year] = (yearMap[year] ?? 0) + 1
                      }
                    })
                    const recordsByYear = Object.entries(yearMap)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([year, count]) => ({ year, count }))

                    if (recordsByYear.length < 2) return null

                    return (
                      <div style={{
                        background: 'white', border: '1px solid #E5E7EB',
                        borderRadius: 10, padding: '14px 16px', marginBottom: 18,
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1F2937', marginBottom: 10 }}>
                          Temporal Baseline — Records by Year
                        </div>
                        <div style={{ height: 80 }}>
                          <ResponsiveContainer>
                            <BarChart data={recordsByYear} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                              <YAxis hide />
                              <RTooltip
                                contentStyle={{ fontSize: 11, padding: 6, border: '1px solid #E5E7EB', borderRadius: 6 }}
                                formatter={(value) => [value, 'records']}
                                labelFormatter={(label) => `Year: ${label}`}
                              />
                              <Bar dataKey="count" radius={[2, 2, 0, 0]} fill="#18A957" opacity={0.8} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 4 }}>
                          Based on eventDate field · Sample of up to 300 records per taxon
                        </div>
                      </div>
                    )
                  })()}

                  {/* Buffer zone info */}
                  {gbifData?.bufferData && (
                    <div style={{
                      background: '#FFFBEB', border: '1px solid #FDE68A',
                      borderRadius: 10, padding: '12px 16px', marginBottom: 18,
                      display: 'flex', alignItems: 'center', gap: 16,
                    }}>
                      <div style={{ fontSize: 24 }}>🔶</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 2 }}>
                          Indirect Influence Area (5km buffer)
                        </div>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>
                          {gbifData.bufferData.totalInBuffer.toLocaleString('en-US')} additional occurrence records
                          detected within 5km of the project boundary — representing potential indirect biodiversity impacts.
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#F5A623' }}>
                          {gbifData.bufferData.totalInBuffer.toLocaleString('en-US')}
                        </div>
                        <div style={{ fontSize: 9, color: '#9CA3AF' }}>records in buffer</div>
                      </div>
                    </div>
                  )}

                  {/* Progressive disclosure */}
                  {!showFullAnalysis ? (
                    <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                      <button
                        onClick={() => setShowFullAnalysis(true)}
                        style={{
                          padding: '10px 24px', borderRadius: 8,
                          background: '#F0FDF4', border: '1px solid #BBF7D0',
                          color: '#18A957', fontSize: 12, fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        + Show full analysis
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid row-2">
                        <EcosystemSensitivityCard data={gbifData} />
                        <HumanPressureCard data={gbifData} analysisProject={analysisProject} />
                      </div>
                      <div className="grid row-3">
                        <ThreatenedSpeciesCard data={gbifData} loading={loading} />
                        <BiodiversityMatrixCard data={gbifData} />
                      </div>
                      <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <button
                          onClick={() => setShowFullAnalysis(false)}
                          style={{
                            padding: '6px 16px', borderRadius: 8,
                            background: '#F9FAFB', border: '1px solid #E5E7EB',
                            color: '#9CA3AF', fontSize: 11, cursor: 'pointer',
                          }}
                        >
                          − Hide full analysis
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* TNFD & ESG TAB */}
              {dashboardTab === 'tnfd' && (
                <>
                  <div className="grid row-4">
                    <TnfdCard data={gbifData} analysisProject={analysisProject} />
                    <TnfdMetricsCard data={gbifData} analysisProject={analysisProject} />
                    <DataSourcesCard data={gbifData} loading={loading} onShowStats={() => setShowStatsModal(true)} />
                  </div>
                  <div className="grid row-5">
                    <DependenciesCard data={gbifData} analysisProject={analysisProject} />
                    <ImpactsCard data={gbifData} analysisProject={analysisProject} />
                  </div>
                </>
              )}

              {/* VEGETATION TAB */}
              {dashboardTab === 'vegetation' && (
                <>
                  <div className="grid row-2">
                    <EcosystemSensitivityCard data={gbifData} />
                    <ScenarioAnalysisCard data={gbifData} />
                  </div>
                  <div className="grid row-3">
                    <BiodiversityMatrixCard data={gbifData} />
                  </div>
                </>
              )}

              {/* MITIGATION TAB */}
              {dashboardTab === 'mitigation' && (
                <>
                  <div className="grid row-1">
                    <RiskScoreCard riskScore={gbifData?.riskScore} />
                    <HumanPressureCard data={gbifData} analysisProject={analysisProject} />
                  </div>
                  <div className="grid row-2">
                    <DependenciesCard data={gbifData} analysisProject={analysisProject} />
                    <ImpactsCard data={gbifData} analysisProject={analysisProject} />
                  </div>
                </>
              )}

              {/* Footer */}
              <div style={{
                padding: '12px 24px',
                borderTop: '1px solid #E5E7EB',
                fontSize: 10, color: '#9CA3AF',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>
                  Occurrence data from{' '}
                  <a href="https://www.gbif.org" target="_blank" rel="noreferrer"
                    style={{ color: '#18A957' }}>GBIF.org</a>
                  {' '}under CC BY 4.0 · Sentinel-2 via Copernicus Data Space ·
                  Protected areas from WDPA/Protected Planet
                </span>
                <span>BioRisk AI © 2026</span>
              </div>
            </main>

            <CopilotPanel
              key={copilotKey}
              gbifData={gbifData}
              analysisProject={analysisProject}
            />
          </>
        )}
      </div>
    </>
  )
}


