import { useState, useRef, useEffect, useMemo, Fragment } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Tooltip, Popup, useMapEvents, useMap, GeoJSON } from 'react-leaflet'
import 'leaflet.heat'
import L from 'leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { LineChart, Line, BarChart, Bar, Cell, ResponsiveContainer, Tooltip as RTooltip, YAxis } from 'recharts'
import { callGbif, MCP_TOOLS, pointInPolygon, getBoundingBox, queryMCPServer, queryProtectedAreas, queryNDVI, getDatasetDOI, queryForestLoss, queryGbifAthena, queryGEE, queryWorldBankBiodiversity, queryTaxaInBbox, queryIucnStatus } from './gbif.js'
import { jsPDF } from 'jspdf'
import { supabase, getSupabaseWithAuth } from './supabase.js'
import * as turf from '@turf/turf'
import { WordRoll, Button, NodeGraphBackground, GlassCard } from 'performative-ui'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'



const DEMO_KEY = import.meta.env.VITE_DEMO_KEY ?? ''
const MODE = import.meta.env.VITE_MODE ?? 'demo'
// 'demo' = REST API only (production/Vercel)
// 'full' = MCP server + S3 (local with server running)

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --sidebar: #0e0e13;
  --navy: #08080b;
  --green: #22c55e;
  --green-lt: #16a34a;
  --green-pale: rgba(34,197,94,0.1);
  --bg: #08080b;
  --card: #0e0e13;
  --warning: #fbbf24;
  --warning-pale: rgba(251,191,36,0.1);
  --danger: #f87171;
  --danger-pale: rgba(248,113,113,0.1);
  --crit: #f87171;
  --text: #f4f4f6;
  --text2: #a3a3b2;
  --text3: #6b6b7a;
  --bd: #1f1f2b;
  --bd2: #2a2a3a;
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --r-sm: 8px;
  --r-md: 12px;
  --r-lg: 18px;
  --r-pill: 999px;
  --sh1: 0 10px 40px rgba(0,0,0,0.55);
  --sh2: 0 30px 80px rgba(0,0,0,0.55);
  --pui-grad: linear-gradient(120deg, #7c3aed, #ec4899, #06b6d4);
  --pui-glow: 0 0 24px rgba(124,58,237,0.45);
  --pui-glow-strong: 0 0 48px rgba(124,58,237,0.55), 0 0 96px rgba(236,72,153,0.25);
  --pui-glass: rgba(15,15,22,.85);
  --pui-glass-deep: rgba(15,15,22,.78);
  --pui-ease: cubic-bezier(.22, 1, .36, 1);
}

[data-theme="light"] {
  --sidebar: #f8f9fa;
  --navy: #ffffff;
  --green: #16a34a;
  --green-lt: #15803d;
  --green-pale: rgba(22,163,74,0.1);
  --bg: #f5f7fa;
  --card: #ffffff;
  --warning: #f97316;
  --warning-pale: rgba(249,115,22,0.1);
  --danger: #ef4444;
  --danger-pale: rgba(239,68,68,0.1);
  --crit: #dc2626;
  --text: #1f2937;
  --text2: #6b7280;
  --text3: #9ca3af;
  --bd: #e5e7eb;
  --bd2: #d1d5db;
  --sh1: 0 1px 2px rgba(0,0,0,0.05);
  --sh2: 0 4px 12px rgba(0,0,0,0.06);
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
  position: relative;
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse at 15% 20%, rgba(124,58,237,0.10) 0%, transparent 50%),
    radial-gradient(ellipse at 85% 10%, rgba(236,72,153,0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 85%, rgba(6,182,212,0.07) 0%, transparent 50%),
    radial-gradient(ellipse at 90% 60%, rgba(124,58,237,0.05) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bd2); border-radius: 3px; }
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
@keyframes pui-grad-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* ── App shell ── */
.app {
  display: grid;
  grid-template-columns: 220px 1fr 340px;
  height: 100vh;
  width: 100vw;
}

/* ── Sidebar ── */
.sidebar {
  background: rgba(8,8,11,0.92);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border-right: 1px solid var(--bd);
  color: var(--text);
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
  background: var(--pui-grad);
  background-size: 200% 200%;
  animation: pui-grad-shift 6s ease infinite;
  display: grid; place-items: center;
  flex-shrink: 0;
}
.logo-sub {
  font-size: 10px; color: var(--text3); margin-top: 4px;
  letter-spacing: 0.04em; text-transform: uppercase; font-weight: 500;
}
.nav-section-label {
  font-size: 10px; color: var(--text3); text-transform: uppercase;
  letter-spacing: 0.08em; padding: 0 10px 8px; font-weight: 600;
}
.nav-item {
  display: flex; align-items: center; gap: 11px;
  padding: 9px 12px; border-radius: var(--r-sm);
  font-size: 13px; color: var(--text2);
  cursor: pointer; font-weight: 500;
  transition: background 0.12s, color 0.12s;
  margin-bottom: 2px;
}
.nav-item:hover { background: rgba(255,255,255,0.05); color: var(--text); }
.nav-item.active {
  background: rgba(124,58,237,0.12);
  border-left: 3px solid #7c3aed;
  color: #c4b5fd;
  font-weight: 600;
  padding-left: 9px;
}
.nav-icon { font-size: 15px; width: 18px; text-align: center; }
.spacer { flex: 1; }
.user-card {
  display: flex; align-items: center; gap: 10px;
  padding: 10px; border-radius: var(--r-md);
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--bd);
}
.avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: var(--pui-grad);
  background-size: 200% 200%;
  animation: pui-grad-shift 6s ease infinite;
  display: grid; place-items: center;
  font-weight: 600; font-size: 13px; color: #fff;
  flex-shrink: 0;
}
.user-info { font-size: 12px; line-height: 1.35; min-width: 0; }
.user-name { color: var(--text); font-weight: 600; }
.user-role { color: var(--text3); font-size: 11px; }
.logout {
  font-size: 11px; color: var(--text3);
  text-decoration: none; padding: 8px 12px;
  display: block; margin-top: 6px;
}
.logout:hover { color: var(--text); }

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
  background: rgba(255,255,255,0.04); border: 1px solid var(--bd);
  border-radius: var(--r-pill); font-weight: 500;
}

/* ── Buttons ── */
.btn {
  background: var(--pui-grad);
  background-size: 200% 200%;
  color: #fff;
  border: none;
  padding: 9px 18px;
  border-radius: var(--r-md);
  font-size: 13px;
  font-weight: 600;
  font-family: var(--font);
  cursor: pointer;
  box-shadow: var(--pui-glow);
  animation: pui-grad-shift 6s ease infinite;
  transition: box-shadow 0.2s, transform 0.06s;
}
.btn:hover {
  box-shadow: var(--pui-glow-strong);
  transform: translateY(-1px);
}

/* ── Cards ── */
.card {
  background: rgba(14,14,19,0.8);
  border: 1px solid var(--bd);
  border-radius: var(--r-lg);
  padding: 18px 20px;
  box-shadow: var(--sh1);
  display: flex; flex-direction: column;
  animation: fadeUp 0.4s ease-out both;
  backdrop-filter: blur(10px);
  transition: border-color 0.2s, transform 0.2s;
}
.card:hover {
  border-color: var(--bd2);
  transform: translateY(-1px);
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
  font-size: 12px; color: #a78bfa; font-weight: 500;
  text-decoration: none; cursor: pointer;
}
.card-link:hover { text-decoration: underline; }

/* ── Grid layout ── */
.grid { display: grid; gap: 18px; margin-bottom: 18px; }
.row-1 { grid-template-columns: 6fr 4fr; }
.row-2 { grid-template-columns: repeat(4, 1fr); }
.row-3 { grid-template-columns: 1fr; }
.row-4 { grid-template-columns: 1fr 1fr; }

/* ── Map ── */
.map-wrap {
  height: 340px; border-radius: var(--r-md); overflow: hidden;
  border: 1px solid var(--bd);
}
.map-wrap.full-width { height: 420px; }
.leaflet-container {
  background: #1a1a2e;
  font-family: var(--font);
}
.leaflet-tile-pane { will-change: transform; }
.leaflet-tile { filter: brightness(0.95); }

/* ── Map legend ── */
.map-legend {
  position: absolute; bottom: 10px; left: 10px;
  background: rgba(8,8,11,0.90);
  border: 1px solid var(--bd);
  border-radius: var(--r-md); padding: 8px 10px;
  display: flex; flex-direction: column; gap: 4px;
  font-size: 11px; box-shadow: var(--sh1);
  z-index: 500; pointer-events: none;
  backdrop-filter: blur(10px);
}
.map-legend-row {
  display: grid; grid-template-columns: 10px 36px 1fr auto;
  align-items: center; gap: 4px;
}
.map-legend-dot { width: 8px; height: 8px; border-radius: 50%; }
.map-legend-name { color: rgba(255,255,255,0.75); }
.map-legend-count {
  color: rgba(255,255,255,0.5); font-weight: 600;
  font-variant-numeric: tabular-nums; margin-left: 6px;
}

/* ── Copilot ── */
.copilot {
  background: rgba(8,8,11,0.92);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border-left: 1px solid var(--bd);
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
  font-size: 9px;
  background: rgba(124,58,237,0.15);
  color: #c4b5fd;
  padding: 2px 6px; border-radius: var(--r-pill);
  font-weight: 700; letter-spacing: 0.05em;
  border: 1px solid rgba(124,58,237,0.3);
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
  background: rgba(255,255,255,0.03); border: 1px solid var(--bd);
  padding: 8px 12px; border-radius: var(--r-md);
  font-size: 12px; color: var(--text2); cursor: pointer;
  text-align: left; font-family: var(--font); line-height: 1.4;
  transition: all 0.12s;
}
.cp-chip:hover {
  background: rgba(124,58,237,0.1);
  border-color: rgba(124,58,237,0.4);
  color: #c4b5fd;
}
.msg { display: flex; flex-direction: column; gap: 8px; }
.msg.user .msg-bubble {
  background: linear-gradient(135deg, #1a1a26, #11111a);
  color: var(--text);
  align-self: flex-end;
  border: 1px solid var(--bd2);
  border-radius: 12px 12px 2px 12px;
  max-width: 85%;
}
.msg.assistant .msg-bubble {
  background: var(--pui-glass-deep);
  color: var(--text);
  align-self: flex-start;
  border: 1px solid rgba(124,58,237,0.35);
  box-shadow: 0 0 32px rgba(124,58,237,0.15);
  border-radius: 12px 12px 12px 2px;
  max-width: 90%;
  line-height: 1.6;
}
.msg-bubble { padding: 10px 14px; font-size: 13px; word-wrap: break-word; }
.msg-line { white-space: pre-wrap; }
.msg-line:empty { height: 4px; }
.msg-bullet { display: flex; gap: 6px; margin: 2px 0; }
.msg-bullet-marker { color: #a78bfa; flex-shrink: 0; line-height: 1.6; }
.msg-dots { display: flex; gap: 4px; padding: 2px 0; }
.msg-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--text2); display: inline-block;
  animation: msgDot 1.4s ease-in-out infinite;
}
.msg-dot:nth-child(2) { animation-delay: 0.2s; }
.msg-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes msgDot {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.9); }
  40% { opacity: 1; transform: scale(1); }
}
.cp-input-bar {
  padding: 12px 14px; border-top: 1px solid var(--bd);
  display: flex; gap: 8px; align-items: center;
  background: rgba(8,8,11,0.9);
}
.cp-input {
  flex: 1; border: 1px solid var(--bd); border-radius: var(--r-pill);
  padding: 9px 14px; font-size: 13px; font-family: var(--font);
  background: rgba(255,255,255,0.03); color: var(--text); outline: none;
}
.cp-input:focus {
  border-color: rgba(124,58,237,0.5);
  box-shadow: 0 0 0 3px rgba(124,58,237,0.1);
}
.cp-send {
  width: 34px; height: 34px; border: none; border-radius: 50%;
  background: var(--pui-grad); background-size: 200% 200%;
  animation: pui-grad-shift 6s ease infinite;
  color: #fff; cursor: pointer;
  display: grid; place-items: center; font-size: 14px;
  box-shadow: var(--pui-glow);
  transition: box-shadow 0.2s;
}
.cp-send:hover:not(:disabled) { box-shadow: var(--pui-glow-strong); }
.cp-send:disabled { background: var(--bd); animation: none; cursor: not-allowed; }

/* ── Spinner ── */
.spinner-sm {
  width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
.spinner-inline {
  display: inline-block; width: 12px; height: 12px;
  border: 2px solid var(--bd); border-top-color: #a78bfa;
  border-radius: 50%; animation: spin 0.7s linear infinite;
  vertical-align: middle;
}

/* ── Findings ── */
.finding {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 0; border-bottom: 1px solid var(--bd); font-size: 13px;
}
.finding:last-child { border-bottom: none; }
.finding-label { display: flex; align-items: center; gap: 10px; color: var(--text); }
.finding-dot { font-size: 10px; }
.finding-val { font-weight: 600; color: var(--text); }

/* ── Stats ── */
.stat-big {
  font-size: 36px; font-weight: 700; letter-spacing: -0.03em;
  color: var(--text); line-height: 1;
}
.stat-sub { font-size: 12px; color: var(--text2); margin-top: 4px; }
.stat-val { font-size: 22px; font-weight: 700; line-height: 1.1; }
.stat-val.warn { color: var(--warning); }
.stat-val.danger { color: var(--danger); }
.stat-desc { font-size: 12px; color: var(--text2); margin-top: 8px; line-height: 1.5; }

/* ── Table ── */
.table-wrap { max-height: 280px; overflow-y: auto; }
.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th {
  text-align: left; font-size: 11px; color: var(--text3);
  text-transform: uppercase; letter-spacing: 0.05em;
  font-weight: 600; padding: 10px 12px;
  border-bottom: 1px solid var(--bd);
}
.table td { padding: 12px; border-bottom: 1px solid var(--bd); color: var(--text); }
.table tr:last-child td { border-bottom: none; }
.table tr:hover td { background: rgba(255,255,255,0.02); }
.iucn {
  display: inline-block; padding: 3px 8px; border-radius: var(--r-sm);
  font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
}
.iucn.en { background: var(--danger-pale); color: var(--danger); }
.iucn.vu { background: var(--warning-pale); color: var(--warning); }
.iucn.cr { background: var(--danger); color: #fff; }

/* ── TNFD ── */
.tnfd-list { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.tnfd-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: var(--r-sm); font-size: 13px;
}
.tnfd-item.done { color: var(--text); background: rgba(34,197,94,0.08); }
.tnfd-item.pending { color: var(--text3); background: rgba(255,255,255,0.02); }
.tnfd-check { font-weight: 700; font-size: 14px; }
.tnfd-item.done .tnfd-check { color: var(--green); }

/* ── Sources ── */
.source-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0; border-bottom: 1px solid var(--bd); font-size: 13px;
}
.source-item:last-child { border-bottom: none; }
.source-left { display: flex; align-items: center; gap: 10px; }
.source-icon { font-size: 16px; }
.source-name { font-weight: 500; }
.source-val { color: var(--text2); font-size: 12px; font-weight: 500; }
.source-meta {
  font-size: 11px; color: var(--text3);
  margin-top: 10px; padding-top: 10px;
  border-top: 1px solid var(--bd);
}
.table-note {
  font-size: 11px; color: var(--text3);
  padding: 10px 4px 0; line-height: 1.5;
}

/* ── New Analysis Wizard ── */
.wiz-shell {
  display: flex; flex-direction: column;
  height: 100vh; overflow: hidden; background: var(--bg);
}
.wiz-header {
  height: 56px; flex-shrink: 0;
  background: rgba(8,8,11,0.9);
  border-bottom: 1px solid var(--bd);
  display: flex; align-items: center; padding: 0 20px;
  backdrop-filter: blur(10px);
}
.wiz-back {
  background: transparent; border: none;
  font-size: 18px; cursor: pointer; color: var(--text2);
  padding: 6px 12px; border-radius: var(--r-sm); font-family: var(--font);
}
.wiz-back:hover { background: rgba(255,255,255,0.05); color: var(--text); }
.wiz-title {
  flex: 1; text-align: center;
  font-size: 15px; font-weight: 600;
  color: var(--text); letter-spacing: -0.01em;
}
.wiz-step-pill {
  font-size: 12px; color: var(--text2);
  background: rgba(255,255,255,0.04); padding: 5px 12px;
  border-radius: var(--r-pill); font-weight: 500;
  border: 1px solid var(--bd);
}
.wiz-body { flex: 1; display: flex; overflow: hidden; min-height: 0; }
.wiz-panel {
  width: 380px; flex-shrink: 0;
  background: rgba(8,8,11,0.9);
  border-right: 1px solid var(--bd);
  padding: 24px;
  display: flex; flex-direction: column; overflow-y: auto;
  backdrop-filter: blur(10px);
}
.wiz-panel h2 {
  font-size: 18px; font-weight: 700;
  letter-spacing: -0.02em; margin-bottom: 6px; color: var(--text);
}
.wiz-sub {
  font-size: 13px; color: var(--text2);
  margin-bottom: 22px; line-height: 1.5;
}
.wiz-label {
  display: block; font-size: 12px; font-weight: 600;
  color: var(--text); margin-bottom: 6px; letter-spacing: -0.005em;
}
.wiz-input, .wiz-select {
  width: 100%; padding: 9px 12px; font-size: 13px;
  font-family: var(--font); color: var(--text);
  background: rgba(255,255,255,0.03); border: 1px solid var(--bd);
  border-radius: var(--r-md); margin-bottom: 16px;
  outline: none; transition: border-color 0.12s, box-shadow 0.12s;
}
.wiz-input:focus, .wiz-select:focus {
  border-color: rgba(124,58,237,0.5);
  box-shadow: 0 0 0 3px rgba(124,58,237,0.1);
}
.wiz-divider { height: 1px; background: var(--bd); margin: 4px 0 18px; }
.wiz-info {
  background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.2);
  border-radius: var(--r-md); padding: 12px;
  font-size: 12px; line-height: 1.5; color: #60A5FA; margin-bottom: 14px;
}
.wiz-select option {
  background: #0e0e13;
  color: var(--text);
}
.wiz-status {
  font-size: 12px; padding: 10px 12px;
  border-radius: var(--r-md); margin-bottom: 12px; line-height: 1.4;
}
.wiz-status.empty { background: rgba(255,255,255,0.02); color: var(--text3); }
.wiz-status.drawing { background: rgba(59,130,246,0.08); color: #60A5FA; }
.wiz-status.closed {
  background: rgba(34,197,94,0.08); color: var(--green); font-weight: 600;
}
.wiz-clear {
  align-self: flex-start;
  background: transparent; border: 1px solid var(--bd);
  padding: 5px 12px; border-radius: var(--r-sm);
  font-size: 12px; cursor: pointer;
  color: var(--text2); font-family: var(--font); margin-bottom: 14px;
}
.wiz-clear:hover { background: rgba(248,113,113,0.08); color: var(--danger); border-color: var(--danger); }
.wiz-run {
  margin-top: auto; width: 100%;
  background: var(--pui-grad); background-size: 200% 200%;
  animation: pui-grad-shift 6s ease infinite;
  color: #fff; border: none; padding: 12px 20px;
  border-radius: var(--r-md); font-size: 14px; font-weight: 600;
  font-family: var(--font); cursor: pointer;
  box-shadow: var(--pui-glow);
  transition: box-shadow 0.2s;
}
.wiz-run:hover:not(:disabled) { box-shadow: var(--pui-glow-strong); }
.wiz-run:disabled {
  background: var(--bd); animation: none;
  color: var(--text3); cursor: not-allowed; box-shadow: none;
}
.wiz-map { flex: 1; position: relative; min-width: 0; }
.wiz-map .leaflet-container { height: 100%; width: 100%; }

/* ── Scan card ── */
.wiz-center {
  flex: 1; display: grid; place-items: center;
  padding: 40px; overflow-y: auto;
}
.scan-card {
  background: rgba(14,14,19,0.9); border: 1px solid var(--bd);
  border-radius: var(--r-lg); padding: 48px; max-width: 520px; width: 100%;
  box-shadow: var(--sh2), 0 0 60px rgba(124,58,237,0.15);
  animation: fadeUp 0.4s ease-out both;
  backdrop-filter: blur(20px);
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
.scan-progress-bar {
  width: 100%; height: 3px;
  background: var(--bd); border-radius: 2px; overflow: hidden;
}
.scan-progress-fill {
  height: 100%;
  background: var(--pui-grad); background-size: 200% 100%;
  animation: pui-grad-shift 2s ease infinite;
  border-radius: 2px; transition: width 0.5s ease-out;
}

/* ── Results card ── */
.results-card {
  background: rgba(14,14,19,0.9); border: 1px solid var(--bd);
  border-radius: var(--r-lg); padding: 48px; max-width: 560px; width: 100%;
  box-shadow: var(--sh2), 0 0 60px rgba(124,58,237,0.15);
  animation: fadeUp 0.4s ease-out both; backdrop-filter: blur(20px);
}
.results-check {
  width: 60px; height: 60px; border-radius: 50%;
  background: var(--pui-grad); background-size: 200% 200%;
  animation: pui-grad-shift 6s ease infinite;
  color: #fff; display: grid; place-items: center;
  font-size: 32px; font-weight: 700; margin: 0 auto 16px;
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
.results-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
.results-stat {
  background: rgba(255,255,255,0.02); border: 1px solid var(--bd);
  border-radius: var(--r-md); padding: 14px;
}
.results-stat-val {
  font-size: 18px; font-weight: 700;
  letter-spacing: -0.02em; line-height: 1.2;
  margin-bottom: 4px; color: var(--text);
}
.results-stat-icon { margin-right: 6px; }
.results-stat-label { font-size: 12px; color: var(--text2); }
.results-insight {
  background: rgba(124,58,237,0.08);
  border: 1px solid rgba(124,58,237,0.2);
  border-radius: var(--r-md); padding: 14px;
  font-size: 13px; line-height: 1.55;
  color: #c4b5fd; margin-bottom: 20px;
}
.results-actions { display: flex; gap: 10px; }
.results-btn {
  flex: 1; padding: 11px 16px; border-radius: var(--r-md);
  font-size: 13px; font-weight: 600;
  font-family: var(--font); cursor: pointer; transition: all 0.12s;
}
.results-btn.primary {
  background: var(--pui-grad); background-size: 200% 200%;
  animation: pui-grad-shift 6s ease infinite;
  color: #fff; border: none; box-shadow: var(--pui-glow);
}
.results-btn.primary:hover { box-shadow: var(--pui-glow-strong); }
.results-btn.ghost {
  background: transparent; color: var(--text); border: 1px solid var(--bd);
}
.results-btn.ghost:hover { background: rgba(255,255,255,0.04); border-color: var(--bd2); }

/* ── Demo banner ── */
.demo-banner {
  background: linear-gradient(135deg, rgba(124,58,237,0.15), rgba(236,72,153,0.1));
  border: 1px solid rgba(124,58,237,0.25);
  border-radius: var(--r-lg); padding: 14px 20px;
  margin: 16px 24px 0;
  display: flex; align-items: center; gap: 16px;
  animation: fadeUp 0.4s ease-out both;
}
.demo-banner-icon { font-size: 24px; line-height: 1; flex-shrink: 0; }
.demo-banner-body { flex: 1; min-width: 0; }
.demo-banner-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
.demo-banner-sub { font-size: 11px; color: var(--text2); line-height: 1.45; }
.demo-banner-cta {
  background: var(--pui-grad); background-size: 200% 200%;
  animation: pui-grad-shift 6s ease infinite;
  color: #fff; border: none; border-radius: var(--r-md);
  padding: 8px 16px; font-size: 12px; font-weight: 600;
  font-family: var(--font); cursor: pointer; flex-shrink: 0;
  box-shadow: var(--pui-glow);
}
.demo-banner-x {
  background: rgba(255,255,255,0.08); color: var(--text);
  border: none; border-radius: 50%;
  width: 24px; height: 24px; font-size: 14px; cursor: pointer;
  display: grid; place-items: center; flex-shrink: 0;
  font-family: var(--font); line-height: 1;
  transition: background 0.12s;
}
.demo-banner-x:hover { background: rgba(255,255,255,0.15); }

/* ── Workflow bar ── */
.workflow {
  display: flex; align-items: center; gap: 0;
  background: rgba(14,14,19,0.8); border: 1px solid var(--bd);
  border-radius: var(--r-lg); padding: 14px 20px;
  margin-bottom: 22px; backdrop-filter: blur(10px);
}
.step { display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0; }
.step-circle {
  width: 26px; height: 26px; border-radius: 50%;
  display: grid; place-items: center;
  font-size: 12px; font-weight: 600;
  background: var(--bd); color: var(--text2); flex-shrink: 0;
  position: relative;
}
.step.done .step-circle {
  background: var(--pui-grad); background-size: 200% 200%;
  animation: pui-grad-shift 6s ease infinite; color: #fff;
}
.step.active .step-circle {
  background: rgba(124,58,237,0.15); color: #c4b5fd;
  border: 2px solid rgba(124,58,237,0.5);
}
.step-label {
  font-size: 13px; font-weight: 500; color: var(--text2);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.step.done .step-label, .step.active .step-label { color: var(--text); font-weight: 600; }
.step-divider { flex: 1; height: 1px; background: var(--bd); margin: 0 12px; max-width: 60px; }

/* ── Taxa breakdown ── */
.taxa-section-title {
  font-size: 13px; font-weight: 600; color: var(--text);
  margin-bottom: 10px; letter-spacing: -0.005em;
}
.taxa-table {
  background: rgba(255,255,255,0.02); border: 1px solid var(--bd);
  border-radius: var(--r-md); padding: 6px 14px;
}
.taxa-row {
  display: grid; grid-template-columns: 24px 1fr auto auto;
  align-items: center; gap: 10px; padding: 8px 0;
  font-size: 13px; border-bottom: 1px solid var(--bd);
}
.taxa-row:last-child { border-bottom: none; }
.taxa-name { color: var(--text); font-weight: 500; }
.taxa-count {
  font-variant-numeric: tabular-nums; font-weight: 700;
  font-size: 14px; min-width: 40px; text-align: right;
}
.taxa-unit { color: var(--text3); font-size: 11px; min-width: 130px; text-align: right; }
.taxa-row-total {
  border-top: 1px solid var(--bd2); padding-top: 10px;
  margin-top: 2px; font-weight: 600;
}
.taxa-sample-note {
  font-size: 11px; color: var(--text3);
  margin-top: 6px; text-align: center; font-style: italic;
}
  .pui-glass-card {
  font-size: 13px !important;
}
.pui-glass-card h3 {
  font-size: 13px !important;
}
.pui-glass-card p {
  font-size: 12px !important;
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

const getNavItems = (t) => [
  { id: 'new', label: t('nav.new'), icon: (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6" /><path d="M8 5v6M5 8h6" /></svg>) },
  { id: 'dashboard', label: t('nav.dashboard'), icon: (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" /><rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" /></svg>) },
  { id: 'projects', label: t('nav.projects'), icon: (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h12M2 8h8M2 12h10" /></svg>) },
  { id: 'reports', label: t('nav.reports'), icon: (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="1" width="10" height="14" rx="1.5" /><path d="M6 5h4M6 8h4M6 11h2" /></svg>) },
  { id: 'monitoring', label: t('nav.monitoring'), icon: (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 12L6 7l3 3 3-4 2 2" /></svg>) },
  { id: 'species', label: t('nav.species'), icon: (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="7" cy="7" r="5" /><path d="M12 12l2.5 2.5" /></svg>) },
  { id: 'sources', label: t('nav.sources'), icon: (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><ellipse cx="8" cy="5" rx="6" ry="2.5" /><path d="M2 5v6c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V5" /><path d="M2 8c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5" /></svg>) },
  { id: 'settings', label: t('nav.settings'), icon: (<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2.5" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" /></svg>) },
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
  AR: [-34, -64],
  BR: [-10, -52],
  CO: [4, -72],
  CL: [-30, -71],
  EC: [-1.8, -78],
  MX: [23, -102],
  PE: [-9, -75],
  BO: [-17, -65],
  UY: [-33, -56],
  PY: [-23, -58],
  CR: [9.7, -83.8],
  PA: [8.5, -80],
  GT: [15.5, -90.3],
  VE: [6.4, -66.6],
  HN: [14.8, -86.2],
  NI: [12.8, -85.2],
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
  { name: 'Aves', abbr: 'AVES', taxon_rank: 'class', group: 'Vertebrates' },
  { name: 'Mammalia', abbr: 'MAMM', taxon_rank: 'class', group: 'Vertebrates' },
  { name: 'Amphibia', abbr: 'AMPH', taxon_rank: 'class', group: 'Vertebrates' },
  { name: 'Reptilia', abbr: 'REPT', taxon_rank: 'class', group: 'Vertebrates' },
  { name: 'Actinopterygii', abbr: 'ACTI', taxon_rank: 'class', group: 'Vertebrates' },
  { name: 'Chondrichthyes', abbr: 'CHON', taxon_rank: 'class', group: 'Vertebrates' },
  { name: 'Cetacea', abbr: 'CETA', taxon_rank: 'order', group: 'Vertebrates' },
  { name: 'Lepidoptera', abbr: 'LEPI', taxon_rank: 'order', group: 'Invertebrates' },
  { name: 'Insecta', abbr: 'INSE', taxon_rank: 'class', group: 'Invertebrates' },
  { name: 'Orchidaceae', abbr: 'ORCH', taxon_rank: 'family', group: 'Plants' },
  { name: 'Pinopsida', abbr: 'PINO', taxon_rank: 'class', group: 'Plants' },
  { name: 'Magnoliopsida', abbr: 'MAGN', taxon_rank: 'class', group: 'Plants' },
  { name: 'Plantae', abbr: 'PLAN', taxon_rank: 'kingdom', group: 'Plants' },
  { name: 'Anura', abbr: 'ANUR', taxon_rank: 'order', group: 'Vertebrates' },
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0' }}>
      <svg viewBox="0 0 200 120" style={{ width: '100%', maxWidth: 140 }}>
        <path
          d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${bgEx} ${bgEy}`}
          fill="none" stroke="var(--bd)" strokeWidth="14" strokeLinecap="round"
        />
        <path
          d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`}
          fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
        />
        <text x="100" y="92" textAnchor="middle" fontSize="32" fontWeight="700" fill={color} letterSpacing="-1">
          {value}
        </text>
        <text x="100" y="112" textAnchor="middle" fontSize="11" fill="#9CA3AF" fontWeight="500">
          / {max}
        </text>
      </svg>
      <div className={labelClass} style={{
        background: value >= 70 ? 'rgba(239,68,68,0.1)' : value >= 40 ? 'rgba(249,115,22,0.1)' : 'rgba(34,197,94,0.1)',
        color
      }}>
        {label}
      </div>
    </div>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ activePage, setActivePage, user, logout, collapsed, onToggle, theme, setTheme, lang, setLang, t }) {
  const NAV_ITEMS = getNavItems(t)
  return (
    <aside className="sidebar" style={{
      width: collapsed ? 56 : undefined,
      transition: 'width 0.2s ease',
      overflow: 'hidden',
    }}>
      <div className="logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {!collapsed && (
          <div className="logo-mark">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
        )}

        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Language toggle */}
            <button
              onClick={() => {
                const next = lang === 'en' ? 'es' : 'en'
                setLang(next)
                localStorage.setItem('lang', next)
              }}
              title={lang === 'en' ? 'Cambiar a Español' : 'Switch to English'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px 6px', borderRadius: 5, color: 'var(--text3)',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.03em',
                transition: 'color 0.15s',
              }}
            >
              {lang === 'en' ? 'ES' : 'EN'}
            </button>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '4px', borderRadius: 5, color: 'var(--text3)',
                display: 'flex', alignItems: 'center',
                transition: 'color 0.15s',
              }}
            >
              {theme === 'dark' ? (
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="8" cy="8" r="3.5" />
                  <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M13.5 10A6 6 0 016 2.5a6 6 0 100 11 6 6 0 007.5-3.5z" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
      {!collapsed && <div className="logo-sub">Biodiversity Intelligence for ESG &amp; TNFD</div>}

      <div className="nav-section-label">Workspace</div>
      <nav>
        {NAV_ITEMS.map(item => (
          <div
            key={item.id}
            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
            onClick={() => setActivePage(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
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
        {!collapsed && (
          <div className="user-info">
            <div className="user-name">{user?.name ?? user?.email ?? 'User'}</div>
            <div className="user-role">{user?.email ?? ''}</div>
          </div>
        )}
      </div>

      <a href="#"
        className="logout"
        onClick={e => { e.preventDefault(); logout({ logoutParams: { returnTo: window.location.origin } }) }}
      >
        {!collapsed && 'Log out'}
      </a>
      <Button
        variant="solid"
        size="sm"
        onClick={onToggle}
        style={{
          width: '100%', marginTop: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        {collapsed ? '→' : '← Hide'}
      </Button>


    </aside>
  )
}



function GbifDensityLayer({ polygon }) {
  const map = useMap()

  useEffect(() => {
    if (!polygon || polygon.length < 3) return

    // Create a clip mask using SVG
    const svgLayer = L.svg().addTo(map)

    return () => map.removeLayer(svgLayer)
  }, [map, polygon])

  return (
    <TileLayer
      url="https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}@1x.png?style=fire.point"
      opacity={0.75}
      attribution="&copy; GBIF"
    />
  )
}

function HexNdviLayer({ features }) {
  const map = useMap()

  useEffect(() => {
    if (!features || features.length === 0) return

    const layers = []

    const getColor = (v) => {
      if (v === null || v === undefined) return '#6B7280'
      if (v < 0) return '#6B7280'
      if (v < 0.1) return '#EF4444'
      if (v < 0.2) return '#F97316'
      if (v < 0.3) return '#EAB308'
      if (v < 0.4) return '#84CC16'
      if (v < 0.5) return '#22C55E'
      return '#16A34A'
    }

    // Calculate hex vertices from center point
    const hexVertices = (lat, lng, radiusDeg) => {
      const vertices = []
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i - 30)
        vertices.push([
          lat + radiusDeg * Math.cos(angle),
          lng + radiusDeg * Math.sin(angle) / Math.cos(lat * Math.PI / 180),
        ])
      }
      return vertices
    }

    const radiusDeg = 0.01 // ~5km at equator

    features.forEach(f => {
      const ndvi = f.properties?.ndvi
      const [lng, lat] = f.geometry.coordinates

      const vertices = hexVertices(lat, lng, radiusDeg)

      const hex = L.polygon(vertices, {
        fillColor: getColor(ndvi),
        fillOpacity: 0.65,
        color: 'rgba(0,0,0,0.15)',
        weight: 0.5,
      }).bindTooltip(
        `NDVI: ${ndvi?.toFixed(3) ?? 'N/A'}<br>MSAVI: ${f.properties?.msavi?.toFixed(3) ?? 'N/A'}`,
        { permanent: false }
      )

      hex.addTo(map)
      layers.push(hex)
    })

    return () => layers.forEach(l => map.removeLayer(l))
  }, [map, features])

  return null
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
        `''OVERLAP: ${area.name}<br/>
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

function HeatmapLayer({ allTaxaRecords, active }) {
  const map = useMap()

  useEffect(() => {
    if (!map || !allTaxaRecords || !active) return

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
  }, [map, allTaxaRecords, active])


  return null
}

function OccurrenceMarker({ occ, color, taxonName, renderer }) {
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
      radius={3}
      renderer={renderer}
      pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 0.5 }}
      eventHandlers={{ click: handleClick }}
    >
      <Popup>
        <Popup autoPan={false}></Popup>
        <div style={{ fontSize: 12, lineHeight: 1.6, minWidth: 200 }}>
          <div style={{ fontWeight: 600, fontStyle: 'italic', marginBottom: 4 }}>
            {occ.scientificName || taxonName}
          </div>
          {occ.eventDate && (
            <div style={{ color: 'var(--text2)', fontSize: 11 }}>
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
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
              Loading dataset info...
            </div>
          )}
          {popupData && (
            <div style={{ marginTop: 6, borderTop: '1px solid #E5E7EB', paddingTop: 6 }}>
              <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 2 }}>
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




function GbifDataIntelligenceCard({ data }) {
  const COUNTRY_RECORD_COUNTS = {
    CO: 33540230,
    CR: 25283188,
    MX: 25135537,
    BR: 23863903,
    CL: 20198612,
    AR: 15354102,
    EC: 11700746,
    PE: 8775278,
    PA: 8397537,
    GT: 4667097,
    VE: 4171936,
    HN: 3367240,
    UY: 1874604,
    NI: 1710881,
    BO: 1528100,
    PY: 1158107,
  }
  const [animated, setAnimated] = useState(false)
  const [counts, setCounts] = useState({
    total: 0, country: 0, polygon: 0, taxa: 0, species: 0
  })

  const targets = {
    total: 2840000000,
    country: COUNTRY_RECORD_COUNTS[data?.riskScore?.country ?? 'AR'] ?? 0,
    polygon: data?.polygonCount ?? 0,
    taxa: data?.taxaInPolygon?.filter(t => t.inPolygon > 0).length ?? 0,
    species: data?.chao1?.estimated ?? 0,
    completeness: data?.chao1?.completeness ?? 0,
  }

  useEffect(() => {
    if (!data?.polygonCount || animated) return
    setAnimated(true)

    const duration = 1500
    const start = performance.now()

    const tick = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)

      setCounts({
        total: Math.round(targets.total * ease),
        country: Math.round(targets.country * ease),
        polygon: Math.round(targets.polygon * ease),
        taxa: Math.round(targets.taxa * ease),
        species: Math.round(targets.species * ease),
      })

      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [data?.polygonCount])

  if (!data?.polygonCount) return null

  const fmtBig = (n) => {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
    return n.toLocaleString('en-US')
  }

  return (
    <div className="card" style={{ marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
      {/* Top green line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, var(--green), transparent)',
      }} />

      <div style={{ padding: '12px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            GBIF Data Intelligence
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 10px', background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.2)', borderRadius: 999,
            fontSize: 10, fontWeight: 600, color: 'var(--green)',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--green)',
              animation: 'pulse 2s ease-in-out infinite',
            }} />
            Live · Snapshot 2026-05-01
          </div>
        </div>

        {/* Main 3 counters */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', gap: 0, marginBottom: 18 }}>
          <div style={{ paddingRight: 20 }}>
            <div style={{
              fontSize: 22, fontWeight: 800, lineHeight: 1, marginBottom: 5,
              fontFamily: 'var(--font)', letterSpacing: '-0.03em', color: 'var(--text)',
            }}>
              {fmtBig(counts.total)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>
              GBIF occurrence records<br />in the global database
            </div>
            <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 3, opacity: 0.6 }}>CC BY 4.0 · Open Data</div>
          </div>

          <div style={{ background: 'var(--bd)', width: 1 }} />

          <div style={{ padding: '0 20px' }}>
            <div style={{
              fontSize: 22, fontWeight: 800, lineHeight: 1, marginBottom: 5,
              fontFamily: 'var(--font)', letterSpacing: '-0.03em', color: 'var(--green)',
            }}>
              {fmtBig(counts.country)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>
              records available<br />for {data?.riskScore ? 'this country' : 'Argentina'}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 3, opacity: 0.6 }}>Partitioned S3 · AWS Athena</div>
          </div>

          <div style={{ background: 'var(--bd)', width: 1 }} />

          <div style={{ paddingLeft: 20, textAlign: 'right' }}>
            <div style={{
              fontSize: 28, fontWeight: 800, lineHeight: 1, marginBottom: 5,
              fontFamily: 'var(--font)', letterSpacing: '-0.03em', color: '#60a5fa',
            }}>
              {fmtBig(counts.polygon)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.4 }}>
              occurrence records<br />in your project area
            </div>
            <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 3, opacity: 0.6 }}>After spatial filter</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--bd)', marginBottom: 14 }} />

        {/* Bottom 4 mini stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { val: counts.taxa, label: 'taxa detected\nin polygon', highlight: true },
            { val: counts.species, label: 'species estimated\n(Chao1)' },
            { val: `${targets.completeness}%`, label: 'sampling\ncompleteness' },
            { val: data?.taxaInPolygon?.length ?? 0, label: 'taxa identified\nfor country' },
          ].map((s, i) => (
            <div key={i} style={{
              background: s.highlight ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${s.highlight ? 'rgba(34,197,94,0.15)' : 'var(--bd)'}`,
              borderRadius: 8, padding: '10px 12px', textAlign: 'center',
            }}>
              <div style={{
                fontSize: 18, fontWeight: 700, lineHeight: 1, marginBottom: 4,
                color: s.highlight ? 'var(--green)' : 'var(--text)',
                fontFamily: 'var(--font)',
              }}>
                {s.val}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.3, whiteSpace: 'pre-line' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--bd)',
          fontSize: 9, color: 'var(--text3)',
        }}>
          <span>Analysis ID: {data?.analysisId ?? '—'}</span>
          <span>Data: gbif.org · Snapshot 2026-05-01 · CC BY 4.0</span>
        </div>
      </div>
    </div>
  )
}


// ─── Cards ───────────────────────────────────────────────────────────────────
function MapCard({ polygon, center, zoom, allTaxaRecords, fullWidth, ndviData, wdpaData, bufferData, geeFeatures, lang }) {
  const mapCenter = center || [-20, -60]
  const mapZoom = zoom ?? 7
  const hasPolygon = polygon && polygon.length >= 3
  const presentTaxa = (allTaxaRecords ?? []).filter(t => t.inPolygon > 0)
  const [viewMode, setViewMode] = useState('points')
  const canvasRenderer = useMemo(() => L.canvas({ padding: 0.5 }), [])

  const clusterMarkers = useMemo(() => {
    if (!hasPolygon) return []
    return allTaxaRecords?.flatMap((taxon, ti) => {
      const color = TAXON_COLORS[taxon.name] || '#18A957'
      const records = taxon.records ?? []
      const limitedRecords = records.length > 500
        ? records.filter((_, i) => i % Math.ceil(records.length / 500) === 0)
        : records
      return limitedRecords.map((occ, i) => (
        (occ.lat != null && occ.lng != null) ? (
          <OccurrenceMarker
            key={`occ-${ti}-${i}`}
            occ={occ}
            color={color}
            taxonName={taxon.name}
            renderer={canvasRenderer}
          />
        ) : null
      ))
    }) ?? []
  }, [allTaxaRecords, hasPolygon, canvasRenderer])

  const mapRef = useRef(null)

  useEffect(() => {
    if (!mapRef.current) return
    const observer = new ResizeObserver(() => {
      mapRef.current?.invalidateSize()
    })
    const container = mapRef.current.getContainer()
    if (container) observer.observe(container)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">
          {lang === 'es' ? 'Área del Proyecto' : 'Project Area'}
          {polygon && polygon.length >= 3 && (
            <span style={{
              fontSize: 10, fontWeight: 400, color: 'var(--text3)',
              marginLeft: 8,
            }}>
              {Math.round(calcPolygonAreaKm2(polygon) ?? 0).toLocaleString('en-US')} km²
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {hasPolygon && (
            <>
              {[
                { id: 'points', label: lang === 'es' ? 'Puntos' : 'Points' },
                { id: 'hex', label: 'Hex NDVI' },
                { id: 'heatmap', label: lang === 'es' ? 'Calor' : 'Heatmap' },
                { id: 'ndvi', label: 'NDVI' },
                { id: 'protected', label: lang === 'es' ? 'Áreas' : 'Areas' },
                { id: 'gbif', label: lang === 'es' ? 'Densidad GBIF' : 'GBIF Density' },
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11,
                    fontWeight: 600, border: '1px solid var(--bd)', cursor: 'pointer',
                    background: viewMode === mode.id ? '#18A957' : 'var(--card)',
                    color: viewMode === mode.id ? 'white' : 'var(--text2)',
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
          whenCreated={map => { mapRef.current = map }}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com">CartoDB</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {hasPolygon && (
            <Polygon
              positions={polygon}
              pathOptions={{
                color: '#22c55e',
                weight: 2,
                fillColor: '#22c55e',
                fillOpacity: viewMode === 'gbif' ? 0 : 0.06,
                dashArray: viewMode === 'gbif' ? '6 4' : undefined,
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
          {hasPolygon && (
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={50}
              disableClusteringAtZoom={14}
              spiderfyOnMaxZoom={true}
              showCoverageOnHover={false}
            >
              {(viewMode === 'points' || viewMode === 'protected') && clusterMarkers}
            </MarkerClusterGroup>
          )}

          {hasPolygon && <HeatmapLayer allTaxaRecords={allTaxaRecords} active={viewMode === 'heatmap'} />}
          {hasPolygon && ndviData && (
            <NdviLayer polygon={polygon} ndviData={viewMode === 'ndvi' ? ndviData : null} />
          )}

          {hasPolygon && wdpaData && (
            <WdpaLayer wdpaData={viewMode === 'protected' ? wdpaData : null} polygon={polygon} />
          )}

          {viewMode === 'gbif' && <GbifDensityLayer polygon={polygon} />}

          {geeFeatures?.length > 0 && (
            <HexNdviLayer features={viewMode === 'hex' ? geeFeatures : []} />
          )}
        </MapContainer>

        {presentTaxa.length > 0 && viewMode === 'points' && (
          <div className="map-legend">
            {presentTaxa.map(t => (
              <div key={t.name} className="map-legend-row">
                <span className="map-legend-dot" style={{ background: TAXON_COLORS[t.name] || '#18A957' }} />
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text2)' }}>{t.abbr}</span>
                <span className="map-legend-name">{t.name}</span>
                <span className="map-legend-count">{t.inPolygon}</span>
              </div>
            ))}
            {presentTaxa.some(t => (t.records?.length ?? 0) < t.inPolygon) && (
              <div style={{
                fontSize: 9, color: 'var(--text3)',
                borderTop: '1px solid var(--bd)',
                marginTop: 6, paddingTop: 6, lineHeight: 1.5
              }}>
                {lang === 'es'
                  ? '⚡ Muestra representativa · conteos reales en el dashboard'
                  : '⚡ Representative sample · full counts in dashboard'}
              </div>
            )}
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
        {viewMode === 'gbif' && (
          <div style={{
            position: 'absolute', bottom: 8, left: 8, right: 8, zIndex: 1000,
            background: 'rgba(8,8,11,0.85)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6, padding: '5px 10px',
            fontSize: 9, color: 'var(--text3)',
            lineHeight: 1.4, backdropFilter: 'blur(8px)',
          }}>
            🌍 Global GBIF occurrence density — 2B+ records from 70,000+ datasets worldwide.
            Darker areas indicate higher sampling effort. Data via GBIF Maps API.
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
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Score breakdown
          </div>
          {breakdown.map((b, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                <span style={{ color: 'var(--text2)' }} title={b.desc}>{b.label} ⓘ</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text)' }}>
                  {b.value}/{b.max}
                </span>
              </div>
              <div style={{ height: 5, background: 'var(--bd)', borderRadius: 3, overflow: 'hidden' }}>
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
            <span style={{ color: 'var(--text)' }}>Total</span>
            <span style={{ color: scoreColor, fontFamily: 'monospace' }}>{score}/100</span>
          </div>
        </div>
      )}

      <div style={{
        margin: '4px 12px 12px', padding: '6px 10px',
        background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)',
        borderRadius: 6, fontSize: 9, color: 'var(--text3)', lineHeight: 1.5,
      }}>
        ⚠ Screening-grade assessment only. Does not replace formal Environmental &amp; Social Impact Assessments (ESIA) or field surveys.
      </div>
    </div>
  )
}

function KeyFindingsCard({ data, loading }) {
  const recentRecords = data?.polygonCount
  const lastDate = recordDate(mostRecentOccurrence(data?.whales?.results))
  const wdpa = data?.wdpa

  // Protected areas — real from WDPA if available
  const protectedAreasVal = loading
    ? <Spinner />
    : wdpa != null
      ? <span style={{ color: wdpa.intersectingCount > 0 ? '#E84C3D' : '#18A957', fontWeight: 600 }}>
        {wdpa.intersectingCount ?? 0}
      </span>
      : <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>—</span>

  const protectedAreasSub = wdpa?.intersectingCount > 0
    ? <div style={{ fontSize: 9, color: '#E84C3D', marginTop: 2 }}>
      {wdpa.intersecting?.slice(0, 2).map((a, i) => (
        <div key={i}>{a.name} ({a.iucnCategory})</div>
      ))}
    </div>
    : wdpa != null
      ? <div style={{ fontSize: 9, color: '#18A957', marginTop: 2 }}>No overlap with project boundary</div>
      : null

  const naField = (tooltip) => (
    <span style={{ color: 'var(--text3)', fontStyle: 'italic', fontSize: 11 }}
      title={tooltip}>
      — <span style={{ fontSize: 9 }}>ⓘ</span>
    </span>
  )

  const items = [
    {
      dot: '🔴',
      label: 'Threatened species',
      val: (() => {
        const iucnMap = data?.iucnMap ?? {}
        const threatened = Object.entries(iucnMap)
          .filter(([, v]) => ['CR', 'EN', 'VU'].includes(v.iucn))
        const count = threatened.length
        return count > 0
          ? <div style={{ textAlign: 'right' }}>
            <span style={{ color: '#E84C3D', fontWeight: 600 }}>{count}</span>
            <div style={{ marginTop: 4 }}>
              {threatened.map(([specieskey, { name, iucn }], i) => (
                <div key={i} style={{ fontSize: 9, fontStyle: 'italic', lineHeight: 1.5 }}>

                  <a href={`https://www.gbif.org/occurrence/search?speciesKey=${specieskey}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#E84C3D', textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                  >
                    {name}
                  </a>
                  <span style={{ fontStyle: 'normal', opacity: 0.7, color: '#E84C3D' }}> ({iucn})</span>
                </div>
              ))}
            </div>
          </div >
          : naField('No CR/EN/VU species detected')
      })(),
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
          background: 'rgba(59,130,246,0.08)',
          border: '1px solid rgba(59,130,246,0.2)',
          color: '#c6c9cc',
          borderRadius: 6,
          fontSize: 9
        }}>
          Protected areas data from WDPA API · Real data
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
  const chao1 = data?.chao1
  const basisCount = data?.basisCount
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
        <><div style={{ height: 80, marginTop: 10 }}>
          <ResponsiveContainer>
            <BarChart
              data={taxaInPolygon.map(t => ({ name: t.abbr, value: t.inPolygon, label: t.name }))}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            >
              <YAxis hide />
              <RTooltip
                contentStyle={{ fontSize: 11, padding: 6, border: '1px solid var(--bd)', borderRadius: 6 }}
                formatter={(value, name, props) => [fmt(value), props.payload.label]}
                labelFormatter={() => ''} />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {taxaInPolygon.map((t, i) => (
                  <Cell key={i} fill={TAXON_COLORS[t.name] || '#18A957'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div><div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 6 }}>
            {taxaInPolygon.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--text2)' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: TAXON_COLORS[t.name] || '#18A957', flexShrink: 0 }} />
                <span>{t.abbr} {t.name}</span>
              </div>
            ))}
          </div></>
      )}

      {recordsByYear.length > 1 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Records by year (temporal baseline)
          </div>
          <div style={{ height: 80 }}>
            <ResponsiveContainer>
              <BarChart data={recordsByYear} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                <YAxis hide />
                <RTooltip
                  contentStyle={{ fontSize: 11, padding: 6, border: '1px solid var(--bd)', borderRadius: 6 }}
                  formatter={(value) => [value, 'records']}
                  labelFormatter={(label) => `Year: ${label}`}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]} fill="#18A957" opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 4 }}>
            Based on eventDate field from GBIF occurrence records
          </div>
        </div>
      )}

      {hasPolygonData && taxaInPolygon.length > 0 && (
        <div style={{ height: 80, marginTop: 10 }}>
          <ResponsiveContainer>
            <BarChart
              data={taxaInPolygon.map(t => ({ name: t.abbr, value: t.inPolygon, label: t.name }))}
              margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
            >
              <YAxis hide />
              <RTooltip
                contentStyle={{ fontSize: 11, padding: 6, border: '1px solid var(--bd)', borderRadius: 6 }}
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

function LandcoverCard({ data, polygon }) {
  const gee = data?.gee

  if (!gee || gee.landcover == null) return null

  const IUCN_HABITAT_CLASSES = {
    1: 'Forest', 2: 'Savanna', 3: 'Shrubland', 4: 'Grassland',
    5: 'Wetlands', 6: 'Rocky areas', 7: 'Caves & subterranean',
    8: 'Desert', 9: 'Marine', 10: 'Marine coastal', 11: 'Artificial',
    14: 'Artificial - Terrestrial', 15: 'Introduced vegetation',
  }

  const iucnClass = gee.iucnHabitat ? Math.floor(gee.iucnHabitat / 100) : null
  const iucnLabel = iucnClass ? (IUCN_HABITAT_CLASSES[iucnClass] ?? `Class ${iucnClass}`) : 'N/A'

  const LANDCOVER = {
    0: { label: 'Water', color: '#3B82F6', icon: '~' },
    1: { label: 'Trees / Forest', color: '#16A34A', icon: 'T' },
    2: { label: 'Grass / Savanna', color: '#84CC16', icon: 'G' },
    3: { label: 'Flooded vegetation', color: '#0891B2', icon: 'F' },
    4: { label: 'Crops / Agriculture', color: '#F59E0B', icon: 'C' },
    5: { label: 'Shrub & scrub', color: '#92400E', icon: 'S' },
    6: { label: 'Built area', color: '#6B7280', icon: 'B' },
    7: { label: 'Bare ground', color: '#D97706', icon: 'X' },
    8: { label: 'Snow & ice', color: '#E0F2FE', icon: '*' },
  }

  const lcClass = Math.round(gee.landcover)
  const lc = LANDCOVER[lcClass] ?? { label: 'Unknown', color: '#9CA3AF', icon: '?' }

  const fire = gee.fire
  const fireRisk = fire > 7 ? 'High' : fire > 4 ? 'Moderate' : 'Low'
  const fireColor = fire > 7 ? '#EF4444' : fire > 4 ? '#F97316' : '#22C55E'

  const water = gee.water
  const waterPresence = water > 50 ? 'Permanent' : water > 10 ? 'Seasonal' : 'Absent'

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Land Cover & Environmental Pressures</div>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 7px',
          borderRadius: 999, background: 'rgba(34,197,94,0.1)',
          color: 'var(--green)', border: '1px solid rgba(34,197,94,0.2)'
        }}>Dynamic World · GEE</span>
      </div>

      <div style={{ padding: '8px 12px' }}>
        {/* Dominant land cover */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Dominant Land Cover (2023)
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 8,
            background: `${lc.color}18`,
            border: `1px solid ${lc.color}40`,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 6,
              background: lc.color, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: 'white',
              flexShrink: 0,
            }}>
              {lc.icon}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{lc.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>Dynamic World class {lcClass}</div>
            </div>
          </div>
        </div>

        {/* Environmental pressures */}
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
          Environmental Pressures
        </div>
        {[
          { label: 'Wildfire risk', value: fireRisk, color: fireColor, source: 'MODIS Fire' },
          { label: 'IUCN Habitat class', value: iucnLabel, color: '#8B5CF6', source: 'IUCN Habitat' },
          { label: 'Surface water', value: waterPresence, color: '#3B82F6', source: 'JRC GSW' },
          { label: 'Tree cover loss', value: gee.lossYear ? `~${Math.round(gee.lossYear) + 2000}` : 'No loss', color: gee.lossYear > 5 ? '#EF4444' : '#22C55E', source: 'Hansen' },
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 0', borderBottom: i < 2 ? '1px solid var(--bd)' : 'none',
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>{item.label}</div>
              <div style={{ fontSize: 9, color: 'var(--text3)' }}>{item.source}</div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, color: item.color,
              padding: '2px 8px', borderRadius: 4,
              background: `${item.color}18`,
            }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <div style={{
        margin: '4px 12px 12px', padding: '6px 10px',
        background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)',
        borderRadius: 6, fontSize: 9, color: 'var(--text3)', lineHeight: 1.5,
      }}>
        Land cover from Google Dynamic World V1 (2023) · Fire from MODIS MOD14A1 ·
        Water from JRC Global Surface Water · Deforestation from Hansen v1.11
      </div>
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
          borderRadius: 999, background: 'rgba(59,130,246,0.1)',
          color: '#1D4ED8', border: '1px solid #BFDBFE'
        }}>🛰 Sentinel-2</span>
      </div>

      {/* NDVI mean */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>NDVI Mean</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: meanColor }}>
            {ndvi.mean.toFixed(3)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{ndvi.interpretation}</span>
        </div>

        {/* NDVI bar */}
        <div style={{
          height: 6, background: 'var(--bd)', borderRadius: 3,
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
          fontSize: 8, color: 'var(--text3)'
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
          background: 'var(--card)', borderRadius: 6,
          padding: '8px 10px'
        }}>
          <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 2 }}>Trend</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: trendColor }}>
            {trendIcon} {ndvi.trend}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text3)' }}>
            {ndvi.slope > 0 ? '+' : ''}{ndvi.slope.toFixed(4)}/period
          </div>
        </div>
        <div style={{
          background: 'var(--card)', borderRadius: 6,
          padding: '8px 10px'
        }}>
          <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 2 }}>ΔYoY</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: ndvi.deltaYoY >= 0 ? '#18A957' : '#E84C3D' }}>
            {ndvi.deltaYoY >= 0 ? '+' : ''}{ndvi.deltaYoY.toFixed(3)}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text3)' }}>
            {ndvi.quarterly?.length ?? 0} periods
          </div>
        </div>
      </div>

      <div style={{
        margin: '0 16px 12px', padding: '5px 8px',
        background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
        borderRadius: 5, fontSize: 9, color: 'var(--text3)',
      }}>
        📅 2023–2024 · Sentinel-2 L2A · quarterly composites
      </div>
    </div>
  )
}

const MITIGATION_ACTIONS = {
  'Wind Energy': [
    { id: 'avoid_siting', label: 'Avoid sensitive habitat zones', desc: 'Relocate turbines 1km+ from WDPA boundaries and identified bird corridors', scoreReduction: 12, hierarchy: 'Avoid' },
    { id: 'seasonal', label: 'Seasonal construction restriction', desc: 'Avoid construction during bird migration season (Sep–Nov)', scoreReduction: 8, hierarchy: 'Minimize', requires: ['Aves'] },
    { id: 'buffer', label: 'Add 500m buffer zone', desc: 'Restrict activity within 500m of protected areas', scoreReduction: 6, hierarchy: 'Minimize' },
    { id: 'monitoring', label: 'Implement bird monitoring', desc: 'Real-time radar monitoring and automatic turbine shutdown', scoreReduction: 4, hierarchy: 'Minimize', requires: ['Aves'] },
    { id: 'bat_monitoring', label: 'Implement bat monitoring', desc: 'Ultrasonic monitoring and shutdown during bat activity peaks', scoreReduction: 4, hierarchy: 'Minimize', requires: ['Chiroptera', 'Mammalia'] },
    { id: 'restore', label: 'Habitat restoration plan', desc: 'Restore equivalent native habitat within project footprint', scoreReduction: 5, hierarchy: 'Restore' },
    { id: 'offset', label: 'Biodiversity net gain offset', desc: 'Fund conservation of equivalent habitat area within same ecoregion', scoreReduction: 4, hierarchy: 'Offset' },
  ],
  'Mining & Extractives': [
    { id: 'avoid_critical', label: 'Avoid critical habitat areas', desc: 'Exclude areas with threatened species records from extraction plan', scoreReduction: 15, hierarchy: 'Avoid' },
    { id: 'water', label: 'Water management plan', desc: 'Zero discharge policy for process water', scoreReduction: 10, hierarchy: 'Minimize' },
    { id: 'buffer', label: 'Riparian buffer zones', desc: 'Maintain 200m undisturbed buffer along waterways', scoreReduction: 6, hierarchy: 'Minimize' },
    { id: 'rehab', label: 'Progressive rehabilitation', desc: 'Restore habitat as extraction progresses, not after closure', scoreReduction: 8, hierarchy: 'Restore' },
    { id: 'offset', label: 'Habitat offset program', desc: 'Fund conservation of equivalent ecosystem type', scoreReduction: 5, hierarchy: 'Offset' },
  ],
  'Agriculture & Forestry': [
    { id: 'avoid_forest', label: 'Avoid native forest conversion', desc: 'Restrict operations to already-degraded land', scoreReduction: 14, hierarchy: 'Avoid' },
    { id: 'pesticides', label: 'Reduce pesticide use', desc: 'Integrated pest management to protect pollinators', scoreReduction: 7, hierarchy: 'Minimize' },
    { id: 'corridors', label: 'Wildlife corridors', desc: 'Maintain 10% of area as native vegetation strips', scoreReduction: 9, hierarchy: 'Minimize' },
    { id: 'native', label: 'Native species planting', desc: 'Replace exotic species with native plants in buffer zones', scoreReduction: 5, hierarchy: 'Restore' },
    { id: 'offset', label: 'Forest conservation offset', desc: 'Fund protection of equivalent native forest area', scoreReduction: 4, hierarchy: 'Offset' },
  ],
  'Infrastructure': [
    { id: 'avoid_wetlands', label: 'Avoid wetlands and riparian zones', desc: 'Route infrastructure 500m+ away from water bodies', scoreReduction: 12, hierarchy: 'Avoid' },
    { id: 'culverts', label: 'Wildlife culverts', desc: 'Install underpasses every 500m for wildlife crossing', scoreReduction: 8, hierarchy: 'Minimize' },
    { id: 'lighting', label: 'Dark sky lighting', desc: 'Directional lighting to reduce nocturnal disturbance', scoreReduction: 5, hierarchy: 'Minimize' },
    { id: 'restore', label: 'Vegetation restoration', desc: 'Restore construction corridor with native species after completion', scoreReduction: 6, hierarchy: 'Restore' },
    { id: 'offset', label: 'Connectivity offset', desc: 'Fund wildlife corridor project in same landscape', scoreReduction: 4, hierarchy: 'Offset' },
  ],
  'Hydroelectric': [
    { id: 'avoid_critical', label: 'Avoid critical fish habitats', desc: 'Exclude spawning areas from reservoir inundation zone', scoreReduction: 14, hierarchy: 'Avoid' },
    { id: 'flow', label: 'Environmental flow regime', desc: 'Maintain minimum ecological flow downstream', scoreReduction: 12, hierarchy: 'Minimize' },
    { id: 'passage', label: 'Fish passage facility', desc: 'Install fish ladder or bypass channel', scoreReduction: 10, hierarchy: 'Minimize' },
    { id: 'riparian', label: 'Riparian restoration', desc: 'Restore 1km of riparian habitat upstream', scoreReduction: 6, hierarchy: 'Restore' },
    { id: 'offset', label: 'Aquatic habitat offset', desc: 'Fund restoration of degraded river habitat in same basin', scoreReduction: 5, hierarchy: 'Offset' },
  ],
  'Oil & Gas': [
    { id: 'avoid_marine', label: 'Avoid marine mammal corridors', desc: 'Exclude known whale and dolphin migration routes from drilling plan', scoreReduction: 14, hierarchy: 'Avoid' },
    { id: 'spill', label: 'Enhanced spill prevention', desc: 'Double-hull infrastructure and rapid response plan', scoreReduction: 10, hierarchy: 'Minimize' },
    { id: 'seasonal', label: 'Seasonal drilling restrictions', desc: 'No drilling during whale calving season', scoreReduction: 8, hierarchy: 'Minimize' },
    { id: 'marine', label: 'Marine mammal observer', desc: 'Halt operations when mammals detected within 500m', scoreReduction: 7, hierarchy: 'Minimize' },
    { id: 'restore', label: 'Seabed restoration plan', desc: 'Restore disturbed seabed habitat post-operations', scoreReduction: 5, hierarchy: 'Restore' },
    { id: 'offset', label: 'Marine conservation offset', desc: 'Fund marine protected area management in same region', scoreReduction: 4, hierarchy: 'Offset' },
  ],
}

function HumanPressureCard({ data, analysisProject }) {
  const sector = analysisProject?.sector || 'Wind Energy'
  const detectedTaxa = data?.taxaInPolygon?.filter(t => t.inPolygon > 0).map(t => t.name) ?? []
  const actions = (MITIGATION_ACTIONS[sector] || MITIGATION_ACTIONS['Wind Energy']).filter(action => {
    if (!action.requires) return true
    return action.requires.some(r => detectedTaxa.includes(r))
  })
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
        padding: '10px 16px', background: 'var(--card)',
        borderBottom: '1px solid #E5E7EB'
      }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 2 }}>Current</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: getColor(baseScore) }}>
            {baseScore}
          </div>
          <div style={{ fontSize: 9, color: getColor(baseScore) }}>{getCategory(baseScore)}</div>
        </div>

        {selected.length > 0 && (
          <>
            <div style={{ fontSize: 18, color: '#18A957' }}>→</div>
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 2 }}>Mitigated</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: getColor(mitigatedScore) }}>
                {mitigatedScore}
              </div>
              <div style={{ fontSize: 9, color: '#18A957' }}>-{reduction} pts</div>
            </div>
          </>
        )}
      </div>

      {/* Actions list grouped by hierarchy */}
      <div style={{ padding: '8px 12px', flex: 1, overflowY: 'auto' }}>
        {['Avoid', 'Minimize', 'Restore', 'Offset'].map(level => {
          const levelActions = actions.filter(a => a.hierarchy === level)
          if (!levelActions.length) return null
          const levelColors = {
            Avoid: { bg: '#FEF2F2', color: '#E84C3D', border: '#FECACA' },
            Minimize: { bg: '#FFFBEB', color: '#F5A623', border: '#FDE68A' },
            Restore: { bg: '#F0FDF4', color: '#18A957', border: '#BBF7D0' },
            Offset: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
          }
          const c = levelColors[level]
          return (
            <div key={level} style={{ marginBottom: 10 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, color: c.color,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                padding: '3px 8px', borderRadius: 4,
                background: c.bg, border: `1px solid ${c.border}`,
                display: 'inline-block', marginBottom: 5,
              }}>
                {level}
              </div>
              {levelActions.map(action => (
                <div
                  key={action.id}
                  onClick={() => toggleAction(action.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '7px 8px', borderRadius: 8, cursor: 'pointer',
                    marginBottom: 3, transition: 'all .15s',
                    background: selected.includes(action.id) ? '#F0FDF4' : 'transparent',
                    border: `1px solid ${selected.includes(action.id) ? '#BBF7D0' : 'transparent'}`,
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
                    background: selected.includes(action.id) ? '#18A957' : 'var(--bd)',
                    border: `1.5px solid ${selected.includes(action.id) ? '#18A957' : '#D1D5DB'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: 'white',
                  }}>
                    {selected.includes(action.id) ? '✓' : ''}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 1 }}>
                      {action.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.4 }}>
                      {action.desc}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#18A957', flexShrink: 0, marginTop: 2 }}>
                    -{action.scoreReduction}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {selected.length === 0 && (
        <div style={{
          margin: '0 12px 12px', padding: '6px 10px',
          background: 'var(--card)', borderRadius: 6,
          fontSize: 9, color: 'var(--text3)', textAlign: 'center'
        }}>
          Select actions to see mitigated risk score
        </div>
      )}
    </div>
  )
}

function KeyIndicatorSpeciesCard({ data }) {
  const allRecords = data?.taxaInPolygon
    ?.filter(t => t.inPolygon > 0)
    ?.flatMap(t => (t.records ?? []).map(r => ({ ...r, taxonGroup: t.name })))
    ?? []

  // Count by species and get IUCN status
  const speciesMap = {}
  for (const r of allRecords) {
    const key = r.scientificName
    if (!key) continue
    if (!speciesMap[key]) {
      speciesMap[key] = {
        scientificName: r.scientificName,
        taxonGroup: r.taxonGroup,
        iucn: r.iucnRedListCategory,
        count: 0,
      }
    }
    speciesMap[key].count++
    if (r.iucnRedListCategory) speciesMap[key].iucn = r.iucnRedListCategory
  }

  // Filter threatened species (CR, EN, VU) sorted by count
  const threatened = Object.values(speciesMap)
    .filter(s => ['CR', 'EN', 'VU'].includes(s.iucn))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // If no threatened species, show top 3 by count as indicator species
  const indicators = threatened.length > 0
    ? threatened
    : Object.values(speciesMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

  if (indicators.length === 0) return null

  const IUCN_COLORS = {
    CR: { bg: '#FEF2F2', color: '#E84C3D', label: 'Critically Endangered' },
    EN: { bg: '#FFF7ED', color: '#F5A623', label: 'Endangered' },
    VU: { bg: '#FFFBEB', color: '#FBBF24', label: 'Vulnerable' },
    NT: { bg: '#F0F9FF', color: '#0369A1', label: 'Near Threatened' },
    LC: { bg: '#F0FDF4', color: '#18A957', label: 'Least Concern' },
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Key Indicator Species</div>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 7px',
          borderRadius: 999, background: '#F0FDF4',
          color: '#18A957', border: '1px solid #BBF7D0'
        }}>GBIF verified</span>
      </div>
      <div style={{ padding: '8px 12px' }}>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10, lineHeight: 1.5 }}>
          {threatened.length > 0
            ? 'Threatened species detected within project boundary — requires priority attention under IFC PS6 and TNFD.'
            : 'Most recorded species within project boundary — key ecological indicators for this area.'}
        </div>
        {indicators.map((s, i) => {
          const iucn = IUCN_COLORS[s.iucn] ?? { bg: 'var(--card)', color: 'var(--text2)', label: s.iucn ?? 'Not assessed' }
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '8px 0', borderBottom: i < indicators.length - 1 ? '1px solid #E5E7EB' : 'none',
            }}>
              <div style={{
                fontSize: 9, fontWeight: 700, padding: '2px 6px',
                borderRadius: 4, background: iucn.bg, color: iucn.color,
                flexShrink: 0, marginTop: 2,
              }}>
                {s.iucn ?? 'NE'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, fontStyle: 'italic', color: 'var(--text)' }}>
                  {s.scientificName}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                  {s.taxonGroup} · {s.count} records · {iucn.label}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{
        margin: '4px 12px 12px', padding: '6px 10px',
        background: 'var(--card)', border: '1px solid var(--bd)',
        borderRadius: 6, fontSize: 9, color: 'var(--text3)',
      }}>
        IUCN Red List status from GBIF occurrence records · Species with CR/EN/VU status require enhanced due diligence under IFC PS6 Critical Habitat policy.
      </div>
    </div>
  )
}

function ThreatenedSpeciesCard({ data, loading }) {
  const queriedAt = data?.queriedAt
  const queriedDate = queriedAt ? new Date(queriedAt).toLocaleDateString() : null

  // Build species list from real taxaInPolygon records
  const allRecords = data?.taxaInPolygon
    ?.filter(t => t.inPolygon > 0)
    ?.flatMap(t => (t.records ?? []).map(r => ({ ...r, taxonGroup: t.name, abbr: t.abbr })))
    ?? []

  // Get unique species with most recent record
  const speciesMap = {}
  for (const r of allRecords) {
    const key = r.scientificName || r.taxonGroup
    if (!speciesMap[key]) {
      speciesMap[key] = {
        scientificName: r.scientificName || r.taxonGroup,
        taxonGroup: r.taxonGroup,
        abbr: r.abbr,
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
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)' }}>
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
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
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
        <span style={{ fontSize: 11, color: 'var(--text2)' }}>
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
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text2)', fontFamily: 'monospace', background: 'var(--bd)', padding: '1px 4px', borderRadius: 3 }}>{s.abbr}</span>
                  <span className="sp-sci">{s.scientificName}</span>
                </td>
                <td style={{ fontSize: 11, color: 'var(--text2)' }}>{s.taxonGroup}</td>
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
                <td style={{ fontSize: 11, color: 'var(--text2)' }}>{s.lastRecord}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-note">
        Real GBIF occurrence records within polygon boundary · Last queried: {queriedDate} ·
        Sample of up to 300 records per taxon
      </div>
      <div style={{
        margin: '0 12px 12px',
        padding: '6px 10px',
        background: 'rgba(249,115,22,0.08)',
        border: '1px solid rgba(249,115,22,0.2)',
        color: '#fb923c',
      }}>
        ⚠ IUCN conservation status not available in this version.
        Species shown are from georeferenced GBIF occurrence records only.
      </div>
    </div>
  )
}

function TemporalBaselineCard({ data }) {
  const basisCount = data?.basisCount
  const allRecords = useMemo(() =>
    data?.taxaInPolygon?.flatMap(t => t.records ?? []) ?? []
    , [data])

  const recordsByYear = useMemo(() => {
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
  }, [allRecords])

  if (recordsByYear.length < 2) return null

  const chao1 = data?.chao1

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--bd)',
      borderRadius: 10, padding: '14px 16px', marginBottom: 18,
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
        Temporal Baseline — Records by Year
      </div>
      <div style={{ height: 80 }}>
        <ResponsiveContainer>
          <BarChart data={recordsByYear} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
            <YAxis hide />
            <RTooltip
              contentStyle={{ fontSize: 11, padding: 6, border: '1px solid var(--bd)', borderRadius: 6 }}
              formatter={(value) => [value, 'records']}
              labelFormatter={(label) => `Year: ${label}`}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]} fill="#18A957" opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {chao1 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Species Richness Estimate (Chao1)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            <div style={{ background: 'var(--card)', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>{chao1.observed}</div>
              <div style={{ fontSize: 9, color: 'var(--text3)' }}>observed</div>
            </div>
            <div style={{ background: 'var(--card)', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#18A957', fontFamily: 'monospace' }}>{chao1.estimated}</div>
              <div style={{ fontSize: 9, color: 'var(--text3)' }}>estimated</div>
            </div>
            <div style={{ background: chao1.completeness >= 80 ? '#F0FDF4' : '#FFFBEB', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: chao1.completeness >= 80 ? '#18A957' : '#F5A623' }}>
                {chao1.completeness}%
              </div>
              <div style={{ fontSize: 9, color: 'var(--text3)' }}>completeness</div>
            </div>
          </div>
          <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 6 }}>
            Chao1 estimator · {chao1.singletons} singletons · {chao1.doubletons} doubletons
          </div>
        </div>
      )}

      {basisCount && Object.keys(basisCount).length > 0 && (
        <div style={{ padding: '8px 12px 4px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Basis of Record
          </div>
          {Object.entries(basisCount)
            .sort(([, a], [, b]) => b - a)
            .map(([basis, count], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                <span style={{ color: 'var(--text2)' }}>
                  {basis === 'HUMAN_OBSERVATION' ? 'Human observation' :
                    basis === 'MACHINE_OBSERVATION' ? 'Machine observation' :
                      basis === 'PRESERVED_SPECIMEN' ? 'Preserved specimen' :
                        basis === 'LIVING_SPECIMEN' ? 'Living specimen' :
                          basis === 'MATERIAL_CITATION' ? 'Material citation' : basis}
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text)' }}>
                  {count.toLocaleString('en-US')}
                </span>
              </div>
            ))}
          <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 4, fontStyle: 'italic' }}>
            Risk score based on HUMAN_OBSERVATION and MACHINE_OBSERVATION only
          </div>
        </div>
      )}
      <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 4 }}>
        Based on eventDate field · Sample of up to 300 records per taxon
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
    'I': { label: 'Priority Conservation Area', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', desc: 'High biodiversity importance and intactness. Priority area to be protected. Maximum risk for new projects.' },
    'II': { label: 'Degraded High-Value Area', color: '#f97316', bg: 'rgba(249,115,22,0.12)', desc: 'High biodiversity importance but already degraded. High effectiveness of nature-positive restoration activities expected.' },
    'III': { label: 'Suitable for Development', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', desc: 'Low biodiversity importance and high intactness. Low conflict with other activities — suitable for renewable energy or infrastructure projects.' },
    'IV': { label: 'Restoration Opportunity', color: 'var(--text2)', bg: 'rgba(255,255,255,0.04)', desc: 'Low biodiversity importance and intactness. Large potential for improvement through restoration activities.' },
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
        background: 'var(--card)', borderRadius: 12, padding: 24,
        width: 440, maxWidth: '90vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            Biodiversity Context Matrix — Methodology
          </div>
          <button type="button" onClick={() => setShowMatrixInfo(false)} style={{
            background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: 'var(--text3)',
          }}>×</button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
          <p style={{ marginBottom: 12 }}>
            The matrix positions your project area across two axes adapted from the
            GBNAT (Think Nature) biodiversity assessment framework.
          </p>

          <div style={{ marginBottom: 12 }}>
            <strong style={{ color: 'var(--text)' }}>Importance axis (vertical)</strong>
            <p style={{ margin: '4px 0 0' }}>
              Calculated from GBIF occurrence data within the polygon:
              60% weighted by occurrence density (records per km²) +
              40% weighted by taxa richness (number of taxonomic groups detected out of 14).
            </p>
          </div>

          <div style={{ marginBottom: 12 }}>
            <strong style={{ color: 'var(--text)' }}>Intactness axis (horizontal)</strong>
            <p style={{ margin: '4px 0 0' }}>
              Derived from Sentinel-2 NDVI mean, scaled from [-1, +1] to [0, 1].
              Higher NDVI indicates denser, healthier vegetation and greater ecosystem intactness.
            </p>
          </div>

          <div style={{ marginBottom: 12 }}>
            <strong style={{ color: 'var(--text)' }}>Quadrant thresholds</strong>
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
              borderRadius: 999, background: 'var(--bd)',
              color: 'var(--text2)', border: '1px solid var(--bd)'
            }}>GBNAT methodology</span>
            <button
              onClick={() => { console.log('ℹ clicked'); setShowMatrixInfo(true) }}
              style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--bd)', border: 'none',
                fontSize: 11, cursor: 'pointer', color: 'var(--text2)',
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
              border: '1px solid var(--bd)',
            }}>
              {/* Quadrant I — top right */}
              <div style={{ background: 'rgba(239,68,68,0.12)', borderRight: '1px solid var(--bd)', borderBottom: '1px solid var(--bd)', order: 2 }} />
              {/* Quadrant II — top left */}
              <div style={{ background: 'rgba(249,115,22,0.12)', borderBottom: '1px solid var(--bd)', order: 1 }} />
              {/* Quadrant III — bottom right */}
              <div style={{ background: 'rgba(34,197,94,0.12)', borderRight: '1px solid var(--bd)', order: 4 }} />
              {/* Quadrant IV — bottom left */}
              <div style={{ background: 'rgba(255,255,255,0.04)', order: 3 }} />
            </div>

            {/* Quadrant labels */}
            <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 8, fontWeight: 700, color: '#ef4444' }}>I</div>
            <div style={{ position: 'absolute', top: 4, left: 4, fontSize: 8, fontWeight: 700, color: '#f97316' }}>II</div>
            <div style={{ position: 'absolute', bottom: 4, right: 4, fontSize: 8, fontWeight: 700, color: '#18A957' }}>III</div>
            <div style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 8, fontWeight: 700, color: 'var(--text2)' }}>IV</div>

            {/* Project dot */}
            {intactness !== null && (
              <div style={{
                position: 'absolute',
                left: `${dotX}%`,
                top: `${dotY}%`,
                transform: 'translate(-50%, -50%)',
                width: 12, height: 12,
                borderRadius: '50%',
                background: q?.color ?? 'var(--bg)',
                border: '2px solid white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                zIndex: 1,
              }} title="Your project area" />
            )}

            {/* Axis labels */}
            <div style={{
              position: 'absolute', bottom: -18, left: 0, right: 0,
              textAlign: 'center', fontSize: 8, color: 'var(--text3)',
            }}>← Intactness (NDVI) →</div>
            <div style={{
              position: 'absolute', top: 0, bottom: 0, left: -22,
              display: 'flex', alignItems: 'center',
              fontSize: 8, color: 'var(--text3)',
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
            }}>← Importance →</div>
          </div>

          {/* Right side info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {!data?.polygonCount ? (
              <div style={{ fontSize: 11, color: 'var(--text3)', paddingTop: 8 }}>
                Run an analysis to see your project's biodiversity context.
              </div>
            ) : intactness === null ? (
              <div style={{ fontSize: 11, color: 'var(--text3)', paddingTop: 8 }}>
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
                <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 8 }}>
                  {q?.desc}
                </p>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                  <div>Importance: {(importance * 100).toFixed(0)}% ({totalInPolygon} records · {taxaFound} taxa)</div>
                  <div>Intactness: {(intactness * 100).toFixed(0)}% (NDVI {ndviMean?.toFixed(3)})</div>
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{
          margin: '0 12px 12px', padding: '6px 10px',
          background: 'var(--card)', borderRadius: 6,
          fontSize: 9, color: 'var(--text3)', lineHeight: 1.5,
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

function EcosystemServicesCard({ data, polygon }) {
  const ndvi = data?.ndvi
  const area = polygon ? calcPolygonAreaKm2(polygon) : null
  if (!area || !ndvi) return null

  const areaHa = area * 100

  // Determine ecosystem type from NDVI
  const ndviMean = ndvi.mean ?? 0
  const ecosystemType = ndviMean > 0.6 ? 'Tropical/Temperate Forest' :
    ndviMean > 0.3 ? 'Grassland/Savanna' :
      ndviMean > 0.1 ? 'Shrubland/Sparse vegetation' : 'Arid/Semi-arid'

  // Values USD/ha/yr from de Groot et al. (2012)
  const VALUES = {
    'Tropical/Temperate Forest': { carbon: 1965, water: 1692, habitat: 1523, pollination: 195 },
    'Grassland/Savanna': { carbon: 133, water: 167, habitat: 131, pollination: 302 },
    'Shrubland/Sparse vegetation': { carbon: 50, water: 44, habitat: 85, pollination: 56 },
    'Arid/Semi-arid': { carbon: 20, water: 15, habitat: 30, pollination: 10 },
  }

  const unitValues = VALUES[ecosystemType]

  // NDVI quality factor (0.3 - 1.0)
  const ndviFactor = Math.min(Math.max(ndviMean * 2, 0.3), 1.0)

  const services = [
    { label: 'Carbon sequestration', value: Math.round(unitValues.carbon * areaHa * ndviFactor), color: '#18A957' },
    { label: 'Water regulation', value: Math.round(unitValues.water * areaHa * ndviFactor), color: '#3B82F6' },
    { label: 'Biodiversity habitat', value: Math.round(unitValues.habitat * areaHa * ndviFactor), color: '#8B5CF6' },
    { label: 'Pollination services', value: Math.round(unitValues.pollination * areaHa * ndviFactor), color: '#F59E0B' },
  ]

  const total = services.reduce((s, sv) => s + sv.value, 0)
  const maxVal = Math.max(...services.map(s => s.value))

  const fmt = (n) => n >= 1000000
    ? `USD ${(n / 1000000).toFixed(1)}M`
    : n >= 1000
      ? `USD ${(n / 1000).toFixed(0)}K`
      : `USD ${n}`

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Ecosystem Services Value</div>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 7px',
          borderRadius: 999, background: '#F0F9FF',
          color: '#0369A1', border: '1px solid #BAE6FD'
        }}>de Groot et al. 2012</span>
      </div>
      <div style={{ padding: '8px 12px' }}>
        <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 10 }}>
          Area: <strong>{area.toLocaleString('en-US')} km²</strong> ·
          Ecosystem: <strong>{ecosystemType}</strong> ·
          NDVI: <strong>{ndviMean.toFixed(3)}</strong>
        </div>
        {services.map((s, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: 'var(--text2)' }}>{s.label}</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text)' }}>{fmt(s.value)}/yr</span>
            </div>
            <div style={{ height: 4, background: 'var(--bd)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                background: s.color,
                width: `${(s.value / maxVal) * 100}%`,
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        ))}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          borderTop: '1px solid #E5E7EB', paddingTop: 8, marginTop: 4,
          fontSize: 12, fontWeight: 700,
        }}>
          <span style={{ color: 'var(--text)' }}>Total estimated value</span>
          <span style={{ color: '#18A957', fontFamily: 'monospace' }}>{fmt(total)}/yr</span>
        </div>
      </div>
      <div style={{
        margin: '4px 12px 12px', padding: '6px 10px',
        background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)',
        borderRadius: 6, fontSize: 9, color: 'var(--text3)', lineHeight: 1.5,
      }}>
        Indicative estimates based on de Groot et al. (2012) global ecosystem service values, adjusted by NDVI quality factor.
        Not a formal ecosystem valuation. For regulatory purposes, consult a certified environmental economist.
      </div>
    </div>
  )
}

function FinancialMaterialityCard({ data, analysisProject }) {
  const score = data?.riskScore?.score
  const sector = analysisProject?.sector || 'Wind Energy'
  if (!score) return null

  const getImpacts = (score, sector) => {
    const delay = score >= 76 ? '12-24 months' : score >= 51 ? '6-12 months' : score >= 26 ? '1-6 months' : 'Minimal'
    const cost = score >= 76 ? 'USD 500K–5M' : score >= 51 ? 'USD 100K–500K' : score >= 26 ? 'USD 10K–100K' : 'USD <10K'
    const license = score >= 76 ? 'High' : score >= 51 ? 'Medium' : score >= 26 ? 'Low' : 'Minimal'
    const reputational = score >= 76 ? 'Significant — investor scrutiny likely' :
      score >= 51 ? 'Moderate — ESG disclosure required' :
        score >= 26 ? 'Low — monitoring recommended' : 'Minimal'
    return { delay, cost, license, reputational }
  }

  const impacts = getImpacts(score, sector)
  const scoreColor = score >= 76 ? '#E84C3D' : score >= 51 ? '#F5A623' : score >= 26 ? '#FBBF24' : '#18A957'

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Financial Materiality</div>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: '2px 7px',
          borderRadius: 999, background: 'rgba(139,92,246,0.08)',
          color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)'
        }}>indicative</span>
      </div>
      <div style={{ padding: '8px 12px' }}>
        <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 10, lineHeight: 1.5 }}>
          Based on Risk Score <strong style={{ color: scoreColor }}>{score}/100</strong> — estimated financial exposure for <strong>{sector}</strong> projects with similar biodiversity risk profiles.
        </div>
        {[
          { label: 'Permitting delay risk', value: impacts.delay, icon: '⏱' },
          { label: 'Remediation cost estimate', value: impacts.cost, icon: '💰' },
          { label: 'License to operate risk', value: impacts.license, icon: '📋' },
          { label: 'Reputational exposure', value: impacts.reputational, icon: '👁' },
        ].map((item, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            padding: '7px 0', borderBottom: i < 3 ? '1px solid #E5E7EB' : 'none',
            gap: 8,
          }}>
            <div style={{ fontSize: 11, color: 'var(--text2)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', textAlign: 'right', maxWidth: '55%' }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
      <div style={{
        margin: '4px 12px 12px', padding: '6px 10px',
        background: 'rgba(235, 233, 240, 0)', border: '1px solid rgba(139,92,246,0.2)',
        borderRadius: 6, fontSize: 9, color: '#e9e7ee', lineHeight: 1.5,
      }}>
        ⚠ Indicative estimates based on industry benchmarks. Not financial advice. Consult environmental legal counsel for project-specific assessment.
      </div>
    </div>
  )
}



function ForestLossCard({ data }) {
  const forestLoss = data?.forestLoss
  if (!forestLoss || forestLoss.totalLoss === 0) return null

  const trendColor = forestLoss.trend === 'Increasing' ? '#E84C3D' :
    forestLoss.trend === 'Decreasing' ? '#18A957' : '#F5A623'
  const trendIcon = forestLoss.trend === 'Increasing' ? '↗' :
    forestLoss.trend === 'Decreasing' ? '↘' : '→'

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Forest Cover Loss</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px',
            borderRadius: 999, background: '#F0FDF4',
            color: '#18A957', border: '1px solid #BBF7D0'
          }}>GFW</span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px',
            borderRadius: 999, background: '#FFF7ED',
            color: '#C2410C', border: '1px solid #FED7AA'
          }}>EUDR</span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: '8px 12px' }}>
        <div style={{ background: 'var(--card)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>
            {forestLoss.totalLoss.toLocaleString('en-US')}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text3)' }}>ha total loss</div>
        </div>
        <div style={{ background: 'var(--card)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>
            {forestLoss.recentLoss.toLocaleString('en-US')}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text3)' }}>ha since 2015</div>
        </div>
        <div style={{ background: 'var(--card)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: trendColor, fontFamily: 'monospace' }}>
            {trendIcon} {forestLoss.trend}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text3)' }}>trend</div>
        </div>
      </div>

      {/* Chart */}
      {forestLoss.byYear?.length > 0 && (
        <div style={{ height: 80, padding: '0 12px' }}>
          <ResponsiveContainer>
            <BarChart data={forestLoss.byYear} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
              <YAxis hide />
              <RTooltip
                contentStyle={{ fontSize: 11, padding: 6, border: '1px solid var(--bd)', borderRadius: 6 }}
                formatter={(value) => [`${value} ha`, 'Forest loss']}
                labelFormatter={(label) => `Year: ${label}`}
              />
              <Bar dataKey="ha" radius={[2, 2, 0, 0]} fill="#E84C3D" opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{
        margin: '4px 12px 12px', padding: '6px 10px',
        background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)',
        borderRadius: 6, fontSize: 9, color: 'var(--text3)',
      }}>
        Tree cover loss data from Global Forest Watch (UMD v1.13, 2001–2025).
        Relevant for EUDR due diligence on deforestation-linked commodities.
      </div>
    </div>
  )
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
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
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
            background: 'var(--card)', borderRadius: 12, padding: 24,
            width: 440, maxWidth: '90vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                Scenario Analysis — Methodology
              </div>
              <button type="button" onClick={() => setShowScenarioInfo(false)} style={{
                background: 'none', border: 'none', fontSize: 20,
                cursor: 'pointer', color: 'var(--text3)',
              }}>×</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
              <p style={{ marginBottom: 12 }}>
                Projects the biodiversity risk score 10 years forward under 3 scenarios
                based on extrapolation of the current Sentinel-2 NDVI trend.
              </p>
              <div style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--text)' }}>Status Quo</strong>
                <p style={{ margin: '4px 0 0' }}>Current NDVI slope continues unchanged.</p>
              </div>
              <div style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--text)' }}>Mitigation Applied</strong>
                <p style={{ margin: '4px 0 0' }}>Slope multiplied by -2 — active habitat management reverses the trend at double the rate.</p>
              </div>
              <div style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--text)' }}>Accelerated Degradation</strong>
                <p style={{ margin: '4px 0 0' }}>Slope multiplied by 3 — increased pressure triples the rate of vegetation decline.</p>
              </div>
              <div style={{ marginBottom: 12 }}>
                <strong style={{ color: 'var(--text)' }}>Risk score projection</strong>
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
              borderRadius: 999, background: 'rgba(59,130,246,0.1)',
              color: '#1D4ED8', border: '1px solid #BFDBFE'
            }}>NDVI-based · 10yr projection</span>
            <button
              type="button"
              onClick={() => setShowScenarioInfo(true)}
              style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--bd)', border: 'none',
                fontSize: 11, cursor: 'pointer', color: 'var(--text2)',
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
                  background: 'var(--card)', borderRadius: 8, padding: '8px 10px',
                  border: `1px solid ${s.color}30`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: s.color, marginBottom: 2 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: getScoreColor(endScore) }}>
                    {endScore}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text3)' }}>
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
                  contentStyle={{ fontSize: 11, padding: 6, border: '1px solid var(--bd)', borderRadius: 6 }}
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
                <span style={{ fontSize: 9, color: 'var(--text2)' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          margin: '0 12px 12px', padding: '6px 10px',
          background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)',
          borderRadius: 6, fontSize: 9, color: 'var(--text3)',
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
    'Unknown': { bg: 'var(--card)', color: 'var(--text3)', border: 'var(--bd)' },
  }[level] || { bg: 'var(--card)', color: 'var(--text3)', border: 'var(--bd)' })

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
            <tr style={{ background: 'var(--card)' }}>
              <th style={{ padding: '6px 12px', textAlign: 'left', color: 'var(--text3)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impact Category</th>
              <th style={{ padding: '6px 12px', textAlign: 'left', color: 'var(--text3)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metric</th>
              <th style={{ padding: '6px 12px', textAlign: 'center', color: 'var(--text3)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Level</th>
              <th style={{ padding: '6px 12px', textAlign: 'left', color: 'var(--text3)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source</th>
            </tr>
          </thead>
          <tbody>
            {impacts.map((imp, i) => (
              <tr key={i} style={{ borderTop: '1px solid #E5E7EB' }}>
                <td style={{ padding: '7px 12px', color: 'var(--text)', fontWeight: 500 }}>{imp.category}</td>
                <td style={{ padding: '7px 12px', color: 'var(--text2)' }}>{imp.metric}</td>
                <td style={{ padding: '7px 12px', textAlign: 'center' }}><Badge level={imp.impact} /></td>
                <td style={{ padding: '7px 12px', color: 'var(--text3)', fontSize: 10 }}>{imp.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{
        margin: '8px 12px 12px', padding: '6px 10px',
        background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)',
        borderRadius: 6, fontSize: 9, color: 'var(--text3)',
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
  }[level] || { bg: 'var(--card)', color: 'var(--text2)', border: 'var(--bd)' })

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
            <tr style={{ background: 'var(--card)' }}>
              <th style={{ padding: '6px 12px', textAlign: 'left', color: 'var(--text3)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ecosystem Service</th>
              <th style={{ padding: '6px 12px', textAlign: 'center', color: 'var(--text3)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dependency</th>
              <th style={{ padding: '6px 12px', textAlign: 'center', color: 'var(--text3)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Financial Risk</th>
              <th style={{ padding: '6px 12px', textAlign: 'left', color: 'var(--text3)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Note</th>
            </tr>
          </thead>
          <tbody>
            {deps.map((d, i) => (
              <tr key={i} style={{ borderTop: '1px solid #E5E7EB' }}>
                <td style={{ padding: '7px 12px', color: 'var(--text)', fontWeight: 500 }}>{d.service}</td>
                <td style={{ padding: '7px 12px', textAlign: 'center' }}><Badge level={d.dependency} /></td>
                <td style={{ padding: '7px 12px', textAlign: 'center' }}><Badge level={d.financial} /></td>
                <td style={{ padding: '7px 12px', color: 'var(--text3)', fontSize: 10 }}>{d.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        margin: '8px 12px 12px', padding: '6px 10px',
        background: 'var(--card)', borderRadius: 6,
        fontSize: 9, color: 'var(--text3)', lineHeight: 1.5,
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
    'EQ-P': { bg: '#F5F3FF', color: '#a78bfa', border: '#DDD6FE' },
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
          borderRadius: 999, background: 'rgba(59,130,246,0.1)',
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
            <tr style={{ background: 'var(--card)', position: 'sticky', top: 0 }}>
              <th style={{ padding: '6px 12px', textAlign: 'left', color: 'var(--text3)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metric</th>
              <th style={{ padding: '6px 12px', textAlign: 'left', color: 'var(--text3)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Value</th>
              <th style={{ padding: '6px 12px', textAlign: 'left', color: 'var(--text3)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Frameworks</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, i) => (
              <tr key={i} style={{ borderTop: '1px solid #E5E7EB' }}>
                <td style={{ padding: '7px 12px', color: 'var(--text2)', fontSize: 10 }}>{m.label}</td>
                <td style={{ padding: '7px 12px', fontWeight: m.real ? 600 : 400, color: m.real ? 'var(--text)' : 'var(--text3)', fontStyle: m.real ? 'normal' : 'italic', fontSize: 10 }}>
                  {m.value}
                </td>
                <td style={{ padding: '7px 12px' }}>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {m.standards.map(std => {
                      const c = STANDARD_COLORS[std] || { bg: 'var(--bd)', color: 'var(--text2)', border: 'var(--bd)' }
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
        background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)',
        borderRadius: 6, fontSize: 9, color: 'var(--text3)',
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
            borderRadius: 999, background: 'rgba(59,130,246,0.1)',
            color: '#1D4ED8', border: '1px solid #BFDBFE'
          }}>CSRD ESRS E4 ✓</span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px',
            borderRadius: 999, background: 'var(--bd)',
            color: 'var(--text2)', border: '1px solid var(--bd)'
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
                <div style={{ fontSize: 9, color: it.done ? '#18A957' : 'var(--text3)', marginTop: 1 }}>
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
          background: 'var(--card)', borderRadius: 6,
          fontSize: 9, color: 'var(--text2)', lineHeight: 1.6,
        }}>
          <strong style={{ color: 'var(--text)' }}>Sector metrics:</strong> {sectorCtx.tnfd}
        </div>
      )}

      <div style={{ fontSize: 10, color: 'var(--text2)', padding: '0 12px 8px', lineHeight: 1.6 }}>
        BioRisk AI supports Strategy (Disclosure D) and Metrics (A, B) pillars of TNFD reporting —
        providing the site-level evidence base that reduces initial biodiversity assessment from months to minutes.
        Field validation recommended for full disclosure.
      </div>
      <div style={{ fontSize: 10, color: 'var(--text3)', padding: '0 12px 12px', fontStyle: 'italic' }}>
        One analysis · Two frameworks — all 14 TNFD disclosures reflected in CSRD ESRS E4
      </div>
    </div>

  )
}

function WorldBankCard({ data }) {
  const wb = data?.worldBank
  if (!wb || wb.length === 0) return null

  const fmt = (val, id) => {
    if (val == null) return '—'
    if (id === 'AG.LND.FRST.ZS' || id === 'ER.PTD.TOTL.ZS' || id === 'EN.CLC.MDAT.ZS')
      return `${val.toFixed(1)}%`
    if (id === 'NY.GDP.PCAP.CD')
      return `$${Math.round(val).toLocaleString('en-US')}`
    return Math.round(val).toLocaleString('en-US')
  }

  const icons = {
    'EN.BIR.THRD.NO': <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 10c2-4 5-6 8-4s4 5 2 8M6 8c1-2 3-3 5-2" /><circle cx="11" cy="5" r="1" /></svg>,
    'EN.MAM.THRD.NO': <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 11c0-3 2-5 5-5s5 2 5 5M6 6c0-1 1-2 2-2s2 1 2 2" /><circle cx="6" cy="9" r="1" /><circle cx="10" cy="9" r="1" /></svg>,
    'EN.FSH.THRD.NO': <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8c2-3 5-4 8-2l2-2v4l-2-2c-1 2-3 3-5 3S3 10 2 8z" /><circle cx="11" cy="7" r="0.8" fill="currentColor" /></svg>,
    'EN.HPT.THRD.NO': <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 14V8M8 8C8 8 4 6 3 3c2 0 4 1 5 3M8 8c0 0 4-2 5-5-2 0-4 1-5 5" /></svg>,
    'AG.LND.FRST.ZS': <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 14V9M8 14V6M12 14V9M2 9l4-5 4 5M6 6l4-5 4 5" /></svg>,
    'ER.PTD.TOTL.ZS': <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2L13 5v5c0 3-2.5 4.5-5 5-2.5-.5-5-2-5-5V5z" /></svg>,
    'EN.CLC.MDAT.ZS': <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2v2M8 12v2M2 8h2M12 8h2M4.2 4.2l1.4 1.4M10.4 10.4l1.4 1.4M4.2 11.8l1.4-1.4M10.4 5.6l1.4-1.4" /><circle cx="8" cy="8" r="3" /></svg>,
    'NY.GDP.PCAP.CD': <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="6" width="12" height="8" rx="1" /><path d="M5 6V4a3 3 0 016 0v2" /><path d="M8 10v2M7 10h2" /></svg>,
  }

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">National Biodiversity Context</div>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>World Bank WDI</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {wb.map((item, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '7px 10px', borderRadius: 7,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--bd)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--text3)', display: 'flex', alignItems: 'center' }}>
                {icons[item.id] ?? <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6" /><path d="M8 5v3M8 11v.5" /></svg>}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>{item.label}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                {fmt(item.value, item.id)}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text3)' }}>{item.year}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 10, borderTop: '1px solid var(--bd)', paddingTop: 8 }}>
        Source: World Bank World Development Indicators · CC BY 4.0
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
  const queriedDate = queriedAt
    ? new Date(queriedAt).toLocaleDateString()
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
      : <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Not queried</span>

  const ndviVal = ndvi
    ? `NDVI ${ndvi.mean} · ${ndvi.quarterly?.length ?? 0} periods`
    : <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Not available</span>

  const gee = data?.gee

  const items = [
    {
      icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2a10 10 0 010 12M8 2a10 10 0 000 12" /></svg>,
      name: 'GBIF Occurrence API', val: gbifVal, real: true,
      note: 'Dynamic taxa per country via facet endpoint'
    },
    {
      icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="12" height="12" rx="1.5" /><path d="M5 8h6M5 5h6M5 11h4" /></svg>,
      name: 'AWS Athena · GBIF S3 Snapshot', val: '2B+ records · partitioned by country', real: true,
      note: 'GBIF occurrence snapshot 2026-05-01'
    },
    {
      icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 12L6 7l3 3 3-4 2 2" /></svg>,
      name: 'Sentinel-2 L2A · NDVI + MSAVI', val: ndviVal, real: ndvi != null,
      note: 'Google Earth Engine · 10m resolution'
    },
    {
      icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" /><rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" /></svg>,
      name: 'Google Dynamic World V1', val: gee?.landcover != null ? 'Land cover 2023' : '—', real: gee?.landcover != null,
      note: 'Near real-time land cover classification · 10m'
    },
    {
      icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 10c1-4 3-7 6-7s5 3 6 7" /><path d="M4 13c1-2 2-4 4-4s3 2 4 4" /></svg>,
      name: 'Hansen Global Forest Change v1.11', val: gee?.lossYear != null ? 'Deforestation 2001–2023' : '—', real: gee?.lossYear != null,
      note: 'University of Maryland · GEE'
    },
    {
      icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2c0 0-5 4-5 8a5 5 0 0010 0c0-4-5-8-5-8z" /></svg>,
      name: 'JRC Global Surface Water', val: gee?.water != null ? 'Water dynamics 1984–2021' : '—', real: gee?.water != null,
      note: 'Joint Research Centre · GEE'
    },
    {
      icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2l1.5 3h3.5l-2.8 2 1 3.5L8 9l-3.2 1.5 1-3.5L3 5h3.5z" /></svg>,
      name: 'MODIS MOD14A1 Fire', val: gee?.fire != null ? 'Fire risk 2019–2024' : '—', real: gee?.fire != null,
      note: 'Thermal anomalies · GEE'
    },
    {
      icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="5" /><path d="M8 4v4l2.5 2.5" /></svg>,
      name: 'IUCN Habitat Classification', val: gee?.iucnHabitat != null ? `Class ${Math.floor(gee.iucnHabitat / 100)}` : '—', real: gee?.iucnHabitat != null,
      note: 'IUCN Habitat v004 · GEE'
    },
    {
      icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3h10v10H3zM3 8h10M8 3v10" /></svg>,
      name: 'WDPA Protected Areas', val: wdpaVal, real: wdpa != null,
      note: 'Protected Planet · real geometries'
    },
    {
      icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="5" /><path d="M8 5v3M8 11v.5" /></svg>,
      name: 'IUCN Red List',
      val: <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Pending API approval</span>,
      real: false,
    },
    {
      icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="5" /><path d="M8 5v3M8 11v.5" /></svg>,
      name: 'Key Biodiversity Areas (KBA)',
      val: <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Pending data access</span>,
      real: false,
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
                  <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>{s.note}</div>
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
        Last queried: {queriedDate} · Occurrence data CC BY 4.0
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
  const phase = analysisProject?.phase || 'Not specified'
  const frameworks = analysisProject?.frameworks?.length > 0
    ? analysisProject.frameworks.join(', ')
    : 'Not specified'
  const investment = analysisProject?.investment
    ? Number(analysisProject.investment) >= 1e9
      ? `USD ${(Number(analysisProject.investment) / 1e9).toFixed(2)}B`
      : `USD ${(Number(analysisProject.investment) / 1e6).toFixed(0)}M`
    : 'Not specified'
  const sectorCtx = SECTOR_CONTEXT[sector] || SECTOR_CONTEXT['Wind Energy']

  const taxaLines = gbifData?.taxaInPolygon
    ?.map(t => `  ${t.abbr} ${t.name}: ${t.inPolygon} records in polygon (sample of ${t.sampleSize})`)
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
  Phase: ${phase}
  Reporting frameworks: ${frameworks}
  Estimated investment: ${investment}
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
- You can provide factual information about environmental regulations and cite sources, but always clarify this is informational, not legal advice
- For regulatory questions, use web search to find current, accurate information and always cite your sources with links
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
  // Remove excessive blank lines
  const cleaned = text.replace(/\n{3,}/g, '\n\n').trim()

  return cleaned.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} style={{ height: 6 }} />

    const isBullet = /^\s*[-•*]\s+/.test(line)
    const isHeader = /^#{1,3}\s+/.test(line)
    const stripped = isBullet
      ? line.replace(/^\s*[-•*]\s+/, '')
      : isHeader
        ? line.replace(/^#{1,3}\s+/, '')
        : line

    // Parse inline: bold, links
    const parts = stripped.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^\)]+\))/g)
    const inline = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return <strong key={j}>{part.slice(2, -2)}</strong>
      }
      const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\)]+)\)$/)
      if (linkMatch) {
        return (
          <a key={j} href={linkMatch[2]} target="_blank" rel="noreferrer"
            style={{ color: 'var(--green)', textDecoration: 'underline', cursor: 'pointer' }}>
            {linkMatch[1]}
          </a>
        )
      }
      return <span key={j}>{part}</span>
    })

    if (isHeader) {
      return (
        <div key={i} style={{ fontWeight: 700, color: 'var(--text)', fontSize: 12, marginTop: 8, marginBottom: 2 }}>
          {inline}
        </div>
      )
    }

    if (isBullet) {
      return (
        <div key={i} className="msg-bullet">
          <span className="msg-bullet-marker">·</span>
          <span>{inline}</span>
        </div>
      )
    }

    return <div key={i} className="msg-line">{inline}</div>
  })
}
const CATEGORY_ICONS = {
  'Risk & Score': (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3l2 2" />
    </svg>
  ),
  'Biodiversity': (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2c0 0-4 3-4 7a4 4 0 008 0c0-4-4-7-4-7z" />
      <path d="M8 9V6M6 8h4" />
    </svg>
  ),
  'Vegetation & Habitat': (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 14V8M8 8C8 8 4 6 3 3c2 0 4 1 5 3M8 8c0 0 4-2 5-5-2 0-4 1-5 5" />
    </svg>
  ),
  'Regulatory & Compliance': (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="2" width="10" height="12" rx="1.5" />
      <path d="M6 6h4M6 9h4M6 12h2" />
    </svg>
  ),
  'Data Gaps': (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3M8 11v.5" />
    </svg>
  ),
}

function buildSuggestedQuestions(gbifData, analysisProject) {
  const topTaxon = gbifData?.taxaInPolygon?.find(t => t.inPolygon > 0)?.name ?? 'the most represented taxon'
  const score = gbifData?.riskScore?.score ?? '—'
  const ndvi = gbifData?.ndvi?.mean?.toFixed(3) ?? '—'
  const country = COUNTRY_NAMES[analysisProject?.country] ?? analysisProject?.country ?? 'the project country'
  const sector = analysisProject?.sector ?? 'this sector'

  return {
    'Risk & Score': [
      `Why is the risk score ${score}/100?`,
      `What are the main ecological risk drivers for ${sector} in ${country}?`,
    ],
    'Biodiversity': [
      `What do the ${topTaxon} records tell us about ecological risk?`,
      'Are there threatened species requiring IFC PS6 critical habitat assessment?',
      'What does the sampling completeness tell us about data reliability?',
    ],
    'Vegetation & Habitat': [
      `What does NDVI ${ndvi} mean for this project?`,
      'Is there evidence of habitat degradation in the project area?',
    ],
    'Regulatory & Compliance': [
      `Which TNFD metrics are relevant for ${sector}?`,
      `What environmental regulations apply to ${sector} projects in ${country}?`,
      'What IFC PS6 requirements are triggered by this analysis?',
    ],
    'Data Gaps': [
      'What data gaps should be flagged in a due diligence review?',
      'What field surveys are recommended before project approval?',
    ],
  }
}
function needsDeepReasoning(text) {
  const deepKeywords = [
    'regulation', 'regulacion', 'ley', 'law', 'compliance', 'tnfd', 'csrd',
    'ifc', 'ps6', 'legal', 'policy', 'politica', 'glaciar', 'glacier',
    'executive summary', 'resumen', 'report', 'reporte', 'recommend',
    'strategy', 'estrategia', 'financial', 'financiero', 'material',
  ]
  const lower = text.toLowerCase()
  return deepKeywords.some(k => lower.includes(k))
}

function CopilotPanel({ gbifData, analysisProject }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const [openCategory, setOpenCategory] = useState('Risk & Score')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const devilAdvocateRef = useRef(false)

  const runDevilAdvocate = () => {
    if (!gbifData?.riskScore || devilAdvocateRef.current) return
    if (!import.meta.env.VITE_DEMO_KEY) return

    devilAdvocateRef.current = true
    setLoading(true)

    const apiKey = import.meta.env.VITE_DEMO_KEY

    fetch('/api/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: buildCopilotSystem(gbifData, analysisProject),
        messages: [{
          role: 'user',
          content: `You are a critical TNFD/IFC reviewer. Based on this biodiversity screening analysis, identify exactly 3 specific technical concerns or data gaps that a due diligence reviewer would flag. Be specific, cite the actual data from the analysis. Format as a numbered list. Start with "Reviewer's notes:" on the first line. Be concise — max 150 words total.`
        }]
      }),
    })
      .then(r => r.json())
      .then(data => {
        const text = data.content?.find(b => b.type === 'text')?.text ?? ''
        if (text) {
          setMessages(prev => [...prev, { role: 'assistant', content: text, isDevilAdvocate: true }])
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  const suggestedQuestions = buildSuggestedQuestions(gbifData, analysisProject)

  async function sendMessage(text) {
    const userText = (text ?? input).trim()
    if (!userText || loading) return

    const isRegulatory = needsDeepReasoning(userText)
    const enhancedText = isRegulatory
      ? `${userText}\n\nSearch the web for current, accurate information and cite your sources with links.`
      : userText

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

      const firstUserIdx = newMessages.findIndex(m => m.role === 'user')
      const history = newMessages
        .slice(firstUserIdx >= 0 ? firstUserIdx : 0)
        .map((m, idx) => ({
          role: m.role,
          content: idx === newMessages.length - 1 - firstUserIdx ? enhancedText : m.content,
        }))

      const body = {
        model: isRegulatory ? 'claude-sonnet-4-20250514' : 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: buildCopilotSystem(gbifData, analysisProject),
        messages: history,
      }

      if (isRegulatory) {
        body.tools = [{
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 3,
        }]
      }

      const response = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'web-search-2025-03-05',
        },
        body: JSON.stringify(body),
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
      const textOut = data.content
        ?.filter(b => b.type === 'text')
        ?.map(b => b.text)
        ?.join('\n') ?? '(no response)'

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

        {/* Reviewer's notes button */}
        {gbifData?.riskScore && !devilAdvocateRef.current && (
          <button
            onClick={runDevilAdvocate}
            disabled={loading}
            style={{
              width: '100%', marginBottom: 10,
              fontSize: 10, padding: '7px 12px',
              background: 'rgba(249,115,22,0.08)',
              border: '1px solid rgba(249,115,22,0.25)',
              borderRadius: 7, color: '#f97316',
              cursor: 'pointer', textAlign: 'left',
              fontWeight: 600, letterSpacing: '0.02em',
            }}
          >
            Generate reviewer's notes — TNFD/IFC critical review
          </button>
        )}

        {/* Categorized questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
          {Object.entries(suggestedQuestions).map(([category, questions]) => (
            <div key={category} style={{ border: '1px solid var(--bd)', borderRadius: 8, overflow: 'hidden' }}>
              <button
                onClick={() => setOpenCategory(openCategory === category ? null : category)}
                style={{
                  width: '100%', padding: '7px 11px',
                  background: openCategory === category ? 'rgba(34,197,94,0.06)' : 'var(--card)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: 10, fontWeight: 700,
                  color: openCategory === category ? 'var(--green)' : 'var(--text2)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {CATEGORY_ICONS[category]}
                  {category}
                </span>
                <span style={{ fontSize: 13, fontWeight: 300 }}>{openCategory === category ? '−' : '+'}</span>
              </button>
              {openCategory === category && (
                <div style={{ padding: '6px 8px 8px', display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--bd)' }}>
                  {questions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      disabled={loading}
                      style={{
                        padding: '7px 11px',
                        background: 'transparent',
                        border: '1px solid var(--bd)',
                        borderRadius: 6,
                        fontSize: 11,
                        color: 'var(--text2)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        lineHeight: 1.5,
                        transition: 'all 0.15s',
                        fontFamily: 'var(--font)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--green)'
                        e.currentTarget.style.color = 'var(--text)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--bd)'
                        e.currentTarget.style.color = 'var(--text2)'
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Messages */}
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

function CountryBorderLayer({ country }) {
  const map = useMap()
  const [border, setBorder] = useState(null)

  useEffect(() => {
    if (!country) return
    setBorder(null) // limpiar contorno anterior

    fetch(`https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson`)
      .then(r => r.json())
      .then(data => {
        const feature = data.features.find(f =>
          f.properties['ISO3166-1-Alpha-2'] === country
        )
        if (feature) setBorder(feature)
      })
      .catch(() => null)
  }, [country])

  if (!border) return null

  return (
    <GeoJSON
      data={border}
      style={{
        color: '#22c55e',
        weight: 1.5,
        fillColor: '#22c55e',
        fillOpacity: 0.04,
        dashArray: '6 4',
      }}
    />
  )
}

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
            color: '#22c55e',
            weight: 2.5,
            fillColor: '#22c55e',
            fillOpacity: 0.08,
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
  onBack, onRunScan, onViewDashboard, onResetWizard, loadCountryTaxa,
  loadingTaxa, scanLogs, scanError, t, lang, scanDuration
}) {
  const center = COUNTRY_CENTERS[analysisProject.country] || [-15, -60]
  const canRun = analysisProject.name.trim() && drawnPolygon
  const [csrdOpen, setCsrdOpen] = useState(false)
  const csrdSectors = ['Agriculture & Forestry', 'Mining & Extractives', 'Oil & Gas', 'Hydroelectric']
  const euExportCountries = ['BR', 'AR', 'CO', 'PE', 'EC', 'BO', 'PY', 'GT', 'HN', 'NI']

  let polyStatus
  if (drawnPolygon) {
    polyStatus = { cls: 'closed', text: lang === 'es' ? `✓ Polígono cerrado — ${drawnPolygon.length} puntos` : `✓ Polygon closed — ${drawnPolygon.length} points` }
  } else if (drawnPoints.length === 0) {
    polyStatus = { cls: 'empty', text: lang === 'es' ? 'Área no definida aún' : 'No area defined yet' }
  } else if (drawnPoints.length < 3) {
    polyStatus = { cls: 'drawing', text: lang === 'es' ? `Dibujando… (${drawnPoints.length} punto${drawnPoints.length === 1 ? '' : 's'} colocado${drawnPoints.length === 1 ? '' : 's'})` : `Drawing… (${drawnPoints.length} point${drawnPoints.length === 1 ? '' : 's'} placed)` }
  } else {
    polyStatus = { cls: 'drawing', text: lang === 'es' ? `Dibujando… (${drawnPoints.length} puntos) — hacé clic en el primer punto para cerrar` : `Drawing… (${drawnPoints.length} points) — click the first point to close` }
  }

  return (
    <div className="wiz-shell">
      <header className="wiz-header">
        <div className="wiz-title">{t('new.title')}</div>
        <div className="wiz-step-pill">{lang === 'es' ? `Paso ${analysisStep} de 3` : `Step ${analysisStep} of 3`}</div>
      </header>

      <div className="wiz-body">
        {analysisStep === 1 && (
          <>
            <aside className="wiz-panel">
              <h2>{t('new.define_area')}</h2>
              <div className="wiz-sub">
                {lang === 'es'
                  ? 'Configurá los detalles del proyecto y dibujá el área de análisis en el mapa.'
                  : 'Set the project details and draw the analysis boundary on the map.'}
              </div>

              <label className="wiz-label">{t('new.project_name')}</label>
              <input
                className="wiz-input"
                placeholder={lang === 'es' ? 'ej. Parque Eólico Offshore – Patagonia' : 'e.g. Offshore Wind Farm – Patagonia'}
                value={analysisProject.name}
                onChange={e => setAnalysisProject(p => ({ ...p, name: e.target.value }))}
              />

              <label className="wiz-label">{t('new.country')}</label>
              <select
                className="wiz-select"
                onChange={e => {
                  setAnalysisProject(p => ({ ...p, country: e.target.value }))
                  loadCountryTaxa(e.target.value)
                }}
              >
                {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
                  <option key={code} value={code}>{name} ({code})</option>
                ))}
              </select>

              <label className="wiz-label">{t('new.sector')}</label>
              <select
                className="wiz-select"
                value={analysisProject.sector}
                onChange={e => setAnalysisProject(p => ({ ...p, sector: e.target.value }))}
              >
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* CSRD Scope Checker */}
              {(csrdSectors.includes(analysisProject.sector) || euExportCountries.includes(analysisProject.country)) && (
                <div style={{
                  background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 8, marginTop: 10,
                }}>
                  <button
                    onClick={() => setCsrdOpen(o => !o)}
                    style={{
                      width: '100%', padding: '7px 12px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      fontSize: 11, fontWeight: 700, color: 'var(--text)',
                      textAlign: 'left',
                    }}
                  >
                    {lang === 'es' ? 'Alerta CSRD' : 'CSRD Scope Alert'}
                    <span style={{ fontSize: 13, fontWeight: 300 }}>{csrdOpen ? '−' : '+'}</span>
                  </button>
                  {csrdOpen && (
                    <div style={{ padding: '0 12px 10px', fontSize: 11, color: '#60A5FA', lineHeight: 1.6 }}>
                      {csrdSectors.includes(analysisProject.sector) && (
                        <div style={{ marginBottom: 3 }}>
                          <strong>{analysisProject.sector}</strong>
                          {lang === 'es'
                            ? ' es un sector de alto impacto bajo los requisitos de divulgación CSRD ESRS E4.'
                            : ' is a high-impact sector under CSRD ESRS E4 biodiversity disclosure requirements.'}
                        </div>
                      )}
                      {euExportCountries.includes(analysisProject.country) && (
                        <div>
                          {lang === 'es'
                            ? <>Empresas en <strong>{COUNTRY_NAMES[analysisProject.country]}</strong> que exportan a la UE con &gt;€150M de ingresos pueden estar sujetas a obligaciones CSRD (Directiva 2022/2464).</>
                            : <>Companies in <strong>{COUNTRY_NAMES[analysisProject.country]}</strong> exporting to the EU with &gt;€150M EU revenue may be subject to CSRD (Directive 2022/2464) reporting obligations.</>
                          }
                        </div>
                      )}
                      <div style={{ marginTop: 6, fontSize: 10, color: '#93C5FD' }}>
                        {lang === 'es'
                          ? 'BioRisk AI provee los datos de línea base de biodiversidad requeridos para la divulgación ESRS E4.'
                          : 'BioRisk AI provides the biodiversity baseline data required for ESRS E4 disclosure.'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Project Phase */}
              <label className="wiz-label" style={{ marginTop: 14 }}>{t('new.phase')}</label>
              <select
                className="wiz-select"
                value={analysisProject.phase ?? ''}
                onChange={e => setAnalysisProject(p => ({ ...p, phase: e.target.value }))}
              >
                <option value="">{lang === 'es' ? 'Seleccionar fase...' : 'Select phase...'}</option>
                <option value="Site Selection / Screening">{lang === 'es' ? 'Selección de Sitio' : 'Site Selection / Screening'}</option>
                <option value="Pre-Feasibility">{lang === 'es' ? 'Pre-Factibilidad' : 'Pre-Feasibility'}</option>
                <option value="Feasibility / ESIA">{lang === 'es' ? 'Factibilidad / ESIA' : 'Feasibility / ESIA'}</option>
                <option value="Due Diligence / Financing">{lang === 'es' ? 'Due Diligence / Financiamiento' : 'Due Diligence / Financing'}</option>
                <option value="Permitting">{lang === 'es' ? 'Permisos' : 'Permitting'}</option>
              </select>

              {/* Reporting Framework */}
              <label className="wiz-label" style={{ marginTop: 14 }}>{t('new.framework')}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {['TNFD LEAP', 'IFC PS6 / Equator Principles', 'CSRD ESRS E4', 'GBF Target 15'].map(fw => (
                  <label key={fw} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={(analysisProject.frameworks ?? []).includes(fw)}
                      onChange={e => {
                        const current = analysisProject.frameworks ?? []
                        setAnalysisProject(p => ({
                          ...p,
                          frameworks: e.target.checked
                            ? [...current, fw]
                            : current.filter(f => f !== fw)
                        }))
                      }}
                      style={{ accentColor: 'var(--green)', width: 14, height: 14 }}
                    />
                    {fw}
                  </label>
                ))}
              </div>

              {/* Investment */}
              <label className="wiz-label" style={{ marginTop: 14 }}>{t('new.investment')}</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text3)', fontSize: 13, pointerEvents: 'none',
                }}>$</span>
                <input
                  type="number"
                  className="wiz-input"
                  placeholder="e.g. 1500000000"
                  value={analysisProject.investment ?? ''}
                  onChange={e => setAnalysisProject(p => ({ ...p, investment: e.target.value }))}
                  style={{ paddingLeft: 22 }}
                />
              </div>
              {analysisProject.investment > 0 && (
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                  {Number(analysisProject.investment) >= 1e9
                    ? `USD ${(Number(analysisProject.investment) / 1e9).toFixed(2)}B`
                    : Number(analysisProject.investment) >= 1e6
                      ? `USD ${(Number(analysisProject.investment) / 1e6).toFixed(0)}M`
                      : `USD ${Number(analysisProject.investment).toLocaleString('en-US')}`}
                </div>
              )}
              <div className="wiz-divider" />

              <div className="wiz-info">
                {lang === 'es'
                  ? '📍 Hacé clic en el mapa para colocar puntos. Hacé clic en el primer punto para cerrar el polígono.'
                  : '📍 Click on the map to place polygon points. Click the starting point to close the polygon.'}
              </div>

              <div className={`wiz-status ${polyStatus.cls}`}>{polyStatus.text}</div>

              {(drawnPoints.length > 0 || drawnPolygon) && (
                <button
                  className="wiz-clear"
                  onClick={() => { setDrawnPoints([]); setDrawnPolygon(null) }}
                >
                  {lang === 'es' ? 'Limpiar' : 'Clear'}
                </button>
              )}

              <button
                className="wiz-run"
                disabled={!canRun}
                onClick={() => {
                  const polygon = drawnPolygon
                  if (!polygon || polygon.length < 3) return
                  const lats = polygon.map(p => p[0])
                  const lngs = polygon.map(p => p[1])
                  const centroidLat = (Math.min(...lats) + Math.max(...lats)) / 2
                  const centroidLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
                  const countryCenter = COUNTRY_CENTERS[analysisProject.country]
                  if (countryCenter) {
                    const latDiff = Math.abs(centroidLat - countryCenter[0])
                    const lngDiff = Math.abs(centroidLng - countryCenter[1])
                    if (latDiff > 15 || lngDiff > 20) {
                      alert(lang === 'es'
                        ? `Tu polígono parece estar fuera de ${COUNTRY_NAMES[analysisProject.country] ?? analysisProject.country}. Por favor redibujá el polígono o seleccioná el país correcto.`
                        : `Your polygon appears to be outside ${COUNTRY_NAMES[analysisProject.country] ?? analysisProject.country}. Please redraw your polygon or select the correct country.`)
                      return
                    }
                  }

                  // Large polygon warning
                  const area = calcPolygonAreaKm2(polygon)
                  if (area > 50000) {
                    const msg = lang === 'es'
                      ? `⚠ Área grande detectada (${Math.round(area).toLocaleString('en-US')} km²)\n\nPara polígonos mayores a 50,000 km², el análisis se enfocará en el área central del polígono para garantizar que se complete en tiempo razonable.\n\n¿Deseas continuar con el análisis del área central?`
                      : `⚠ Large polygon detected (${Math.round(area).toLocaleString('en-US')} km²)\n\nFor polygons larger than 50,000 km², the analysis will focus on the central area of the polygon to ensure it completes in a reasonable time.\n\nDo you want to continue with the central area analysis?`
                    if (!window.confirm(msg)) return
                  }

                  onRunScan()
                }}
              >
                {t('btn.run_scan')}
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
                  attribution='&copy; <a href="https://carto.com">CartoDB</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <MapRecenter center={center} />
                <CountryBorderLayer country={analysisProject.country} />
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
              <div className="scan-title">
                {lang === 'es' ? 'Ejecutando Análisis de Biodiversidad' : 'Running Biodiversity Scan'}
              </div>
              <div className="scan-sub">{analysisProject.name}</div>

              {scanError && (
                <div style={{
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8, padding: '12px 16px', margin: '12px 0',
                  fontSize: 12, color: '#f87171', lineHeight: 1.6,
                }}>
                  ⚠ {scanError}
                  <div style={{ marginTop: 8 }}>
                    <button
                      onClick={() => { setScanError(''); setAnalysisStep(1) }}
                      style={{
                        padding: '4px 12px', background: 'var(--card)',
                        border: '1px solid var(--bd)', borderRadius: 6,
                        fontSize: 11, cursor: 'pointer', color: 'var(--text)',
                      }}
                    >
                      {lang === 'es' ? 'Volver y corregir' : 'Go back and fix'}
                    </button>
                  </div>
                </div>
              )}

              {/* Pipeline timeline */}
              <div style={{ margin: '20px 0', display: 'flex', flexDirection: 'column', gap: 0 }}>
                {(() => {
                  const steps = [
                    { id: 'validate', label: lang === 'es' ? 'Validar área' : 'Validate area' },
                    { id: 'taxa', label: lang === 'es' ? 'Cargar taxa' : 'Load taxonomic groups' },
                    { id: 'gbif', label: lang === 'es' ? 'Datos de ocurrencia GBIF' : 'GBIF occurrence data' },
                    { id: 'satellite', label: lang === 'es' ? 'Análisis satelital' : 'Satellite analysis' },
                    { id: 'wdpa', label: lang === 'es' ? 'Áreas protegidas' : 'Protected areas' },
                    { id: 'risk', label: lang === 'es' ? 'Evaluación de riesgo' : 'Risk assessment' },
                  ]

                  const logMap = {
                    'validate': scanLogs.find(l => l.msg?.includes('km²') || l.msg?.includes('Polygon validated')),
                    'taxa': scanLogs.find(l => l.msg?.includes('taxonomic classes detected')),
                    'gbif': scanLogs.find(l => l.msg?.includes('occurrence records retrieved') || l.msg?.includes('records retrieved') || l.msg?.includes('GBIF REST API') || l.msg?.includes('Snapshot unavailable')),
                    'satellite': scanLogs.find(l => l.msg?.includes('GEE datasets') || l.msg?.includes('satellite') || l.msg?.includes('hex cells')),
                    'wdpa': scanLogs.find(l => l.msg?.includes('Protected areas') || l.msg?.includes('protected areas')),
                    'risk': scanLogs.find(l => l.msg?.includes('Risk Score') || l.msg?.includes('Analysis complete')),
                  }

                  return steps.map((step, i) => {
                    const log = logMap[step.id]
                    const isDone = log?.status === 'done'
                    const isError = log?.status === 'error'
                    const isRunning = !isDone && !isError && scanLogs.length > 0 &&
                      i === steps.findIndex(s => !logMap[s.id] || logMap[s.id]?.status !== 'done')
                    const isPending = !isDone && !isError && !isRunning

                    return (
                      <div key={step.id} style={{ display: 'flex', gap: 14, position: 'relative' }}>
                        {/* Vertical line */}
                        {i < steps.length - 1 && (
                          <div style={{
                            position: 'absolute', left: 10, top: 26, width: 1,
                            height: 'calc(100% + 2px)',
                            background: isDone ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)',
                            transition: 'background 0.5s',
                          }} />
                        )}

                        {/* Dot */}
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          marginTop: 2, zIndex: 1,
                          background: isDone ? 'rgba(34,197,94,0.15)' :
                            isError ? 'rgba(248,113,113,0.15)' :
                              isRunning ? 'rgba(124,58,237,0.15)' :
                                'rgba(255,255,255,0.04)',
                          border: `1px solid ${isDone ? 'rgba(34,197,94,0.4)' :
                            isError ? 'rgba(248,113,113,0.4)' :
                              isRunning ? 'rgba(124,58,237,0.5)' :
                                'rgba(255,255,255,0.1)'}`,
                          transition: 'all 0.3s',
                        }}>
                          {isDone && <span style={{ color: '#22c55e', fontSize: 11 }}>✓</span>}
                          {isError && <span style={{ color: '#f87171', fontSize: 11 }}>✗</span>}
                          {isRunning && (
                            <div style={{
                              width: 10, height: 10, border: '1.5px solid rgba(124,58,237,0.3)',
                              borderTopColor: '#a78bfa', borderRadius: '50%',
                              animation: 'spin 0.8s linear infinite',
                            }} />
                          )}
                          {isPending && (
                            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>{i + 1}</span>
                          )}
                        </div>

                        {/* Content */}
                        <div style={{ paddingBottom: 16, flex: 1 }}>
                          <div style={{
                            fontSize: 12, fontWeight: 600, marginBottom: 2,
                            color: isDone ? '#f4f4f6' :
                              isError ? '#f87171' :
                                isRunning ? '#c4b5fd' :
                                  '#4a4a5a',
                            transition: 'color 0.3s',
                          }}>
                            {step.label}
                          </div>
                          {log && (
                            <div style={{
                              fontSize: 10, color: isDone ? '#22c55e' : isError ? '#f87171' : '#6b6b7a',
                              fontFamily: 'monospace',
                            }}>
                              {log.msg}
                            </div>
                          )}
                          {!log && isRunning && (
                            <div style={{ fontSize: 10, color: '#6b6b7a', fontFamily: 'monospace' }}>
                              {lang === 'es' ? 'procesando...' : 'processing...'}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>

              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 12, lineHeight: 1.5, textAlign: 'center' }}>
                {lang === 'es'
                  ? <>El tiempo depende del tamaño del polígono.<br />Áreas grandes pueden tardar 2–4 minutos.</>
                  : <>Analysis time depends on polygon size.<br />Large areas may take 2–4 minutes.</>
                }
              </div>

              <div className="scan-progress-bar">
                <div className="scan-progress-fill" style={{ width: `${(Math.min(scanProgress, 5) / 5) * 100}%` }} />
              </div>
            </div>
          </div>
        )}

        {analysisStep === 3 && scanResults && (
          <div className="wiz-center">
            <div className="results-card">
              <div className="results-check">✓</div>
              <div className="results-title">
                {lang === 'es' ? 'Análisis Completo' : 'Analysis Complete'}
                {scanDuration && (
                  <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text3)', marginLeft: 8 }}>
                    ({scanDuration}s)
                  </span>
                )}
              </div>
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
                    <div className="taxa-section-title">
                      {lang === 'es' ? 'Registros de Biodiversidad en el Área del Proyecto' : 'Biodiversity Records in Project Area'}
                    </div>
                    <div className="taxa-table">
                      {taxaInPolygon.filter(t => t.inPolygon > 0).map(t => (
                        <div key={t.name} className="taxa-row">
                          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text2)', fontFamily: 'monospace', background: 'var(--bd)', padding: '1px 4px', borderRadius: 3 }}>{t.abbr}</span>
                          <span className="taxa-name">{t.name}</span>
                          <span className="taxa-count" style={{ color: t.inPolygon > 0 ? TAXON_COLORS[t.name] : 'var(--text3)' }}>
                            {fmt(t.inPolygon)}
                          </span>
                          <span className="taxa-unit">{lang === 'es' ? 'registros en polígono' : 'records in polygon'}</span>
                        </div>
                      ))}
                      <div className="taxa-row taxa-row-total">
                        <span className="taxa-name">Total</span>
                        <span className="taxa-count">{fmt(totalInPolygon)}</span>
                        <span className="taxa-unit">{lang === 'es' ? 'ocurrencias georreferenciadas' : 'georeferenced occurrences'}</span>
                      </div>
                    </div>

                    <div className="results-grid" style={{ marginTop: 16 }}>
                      <div className="results-stat">
                        <div className="results-stat-val">
                          <span className="results-stat-icon">📍</span>
                          {drawnPolygon ? `${drawnPolygon.length} ${lang === 'es' ? 'puntos' : 'points'}` : '—'}
                        </div>
                        <div className="results-stat-label">{lang === 'es' ? 'límite del área' : 'area boundary'}</div>
                      </div>
                      <div className="results-stat">
                        <div className="results-stat-val">
                          <span className="results-stat-icon">📅</span>
                          {new Date().toLocaleDateString(lang === 'es' ? 'es-AR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="results-stat-label">{lang === 'es' ? 'fecha del análisis' : 'analysis date'}</div>
                      </div>
                    </div>
                  </>
                )
              })()}

              <div className="results-actions">
                <button className="results-btn primary" onClick={onViewDashboard}>
                  {lang === 'es' ? 'Ver Dashboard →' : 'View Dashboard →'}
                </button>
                <button className="results-btn ghost" onClick={onResetWizard}>
                  {t('btn.new_analysis')}
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
        background: 'var(--card)', borderRadius: 12, padding: '24px',
        width: 480, maxWidth: '90vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
              GBIF Global Occurrence Stats
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
              Live data from GBIF REST API · Not the S3 snapshot
            </div>
          </div>
          <button type="button" onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: 'var(--text3)', padding: '0 4px',
          }}>×</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text3)' }}>
            Querying GBIF API...
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--card)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text2)', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Kingdom</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text2)', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Occurrences</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text2)', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>% of total</th>
                </tr>
              </thead>
              <tbody>
                {(stats ?? []).map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 500, color: 'var(--text)' }}>{r.kingdom}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: 'var(--text)' }}>
                      {r.count.toLocaleString('en-US')}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text2)' }}>
                      {total > 0 ? ((r.count / total) * 100).toFixed(1) : '—'}%
                    </td>
                  </tr>
                ))}
                <tr style={{ borderTop: '2px solid #E5E7EB', background: 'var(--card)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text)' }}>Total</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#18A957' }}>
                    {total.toLocaleString('en-US')}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text2)' }}>100%</td>
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
              border: '1px solid var(--bd)', fontSize: 13,
              outline: 'none', fontFamily: 'Inter, sans-serif',
              background: 'var(--card)',
              color: 'var(--text)',
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
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                  No species found for "{query}"
                </div>
              ) : (
                results.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => loadProfile(s)}
                    style={{
                      background: selected?.key === s.key ? '#F0FDF4' : 'white',
                      border: `1px solid ${selected?.key === s.key ? '#BBF7D0' : 'var(--bd)'}`,
                      borderRadius: 10, padding: '12px 16px', marginBottom: 8,
                      cursor: 'pointer', transition: 'all .15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#18A957'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = selected?.key === s.key ? '#BBF7D0' : 'var(--bd)'}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, fontStyle: 'italic', color: 'var(--text)', marginBottom: 3 }}>
                      {s.scientificName}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, color: 'var(--text2)' }}>{s.rank}</span>
                      {s.kingdom && <span style={{ fontSize: 10, color: 'var(--text3)' }}>· {s.kingdom}</span>}
                      {s.family && <span style={{ fontSize: 10, color: 'var(--text3)' }}>· {s.family}</span>}
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
              background: 'var(--card)', border: '1px solid var(--bd)',
              borderRadius: 10, padding: '20px',
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, fontStyle: 'italic', color: 'var(--text)', marginBottom: 4 }}>
                {selected.scientificName}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 16 }}>
                GBIF Key: {selected.key} ·{' '}

                <a href={`https://www.gbif.org/species/${selected.key}`}
                  target="_blank" rel="noreferrer"
                  style={{ color: '#18A957' }}
                >
                  View on GBIF →
                </a>
              </div>

              {/* Taxonomy */}
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Taxonomy
              </div>
              {['kingdom', 'phylum', 'class', 'order', 'family', 'genus'].map(rank => (
                selected[rank] && (
                  <div key={rank} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', borderBottom: '1px solid #F3F4F6' }}>
                    <span style={{ color: 'var(--text3)', textTransform: 'capitalize' }}>{rank}</span>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{selected[rank]}</span>
                  </div>
                )
              ))}

              {loadingProfile && (
                <div style={{ textAlign: 'center', padding: 16, color: 'var(--text3)', fontSize: 12 }}>
                  Loading occurrence data...
                </div>
              )}

              {profile && (
                <>
                  {/* Occurrences */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      GBIF Occurrences
                    </div>
                    <div style={{
                      background: '#F0FDF4', borderRadius: 8, padding: '10px 14px',
                      fontSize: 20, fontWeight: 700, color: '#18A957',
                    }}>
                      {profile.occurrences?.toLocaleString('en-US') ?? '—'}
                      <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text2)', marginLeft: 8 }}>
                        georeferenced records worldwide
                      </span>
                    </div>
                  </div>

                  {/* Vernacular names */}
                  {profile.vernacularNames.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                        Common Names
                      </div>
                      {profile.vernacularNames.slice(0, 6).map((v, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', borderBottom: '1px solid #F3F4F6' }}>
                          <span style={{ color: 'var(--text)' }}>{v.vernacularName}</span>
                          <span style={{ color: 'var(--text3)', fontSize: 10 }}>{v.language}</span>
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
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
          Monitoring Insights
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.75, marginBottom: 24 }}>
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

function ReportsPage({ projects, t, lang, exportReport }) {
  if (projects.length === 0) {
    return (
      <main className="main">
        <div className="header">
          <div className="h-left">
            <h1>{lang === 'es' ? 'Reportes' : 'Reports'}</h1>
            <div className="h-sub">{lang === 'es' ? 'Comparador de proyectos' : 'Project comparator'}</div>
          </div>
        </div>
        <div style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>📊</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            {lang === 'es' ? 'Sin proyectos para comparar' : 'No projects to compare'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>
            {lang === 'es' ? 'Ejecutá al menos un análisis para ver el comparador.' : 'Run at least one analysis to see the comparator.'}
          </div>
        </div>
      </main>
    )
  }

  const getRiskColor = (score) => {
    if (!score) return 'var(--text3)'
    if (score >= 76) return '#E84C3D'
    if (score >= 51) return '#F5A623'
    if (score >= 26) return '#FBBF24'
    return '#22c55e'
  }

  const getRiskLabel = (category) => {
    if (!category) return '—'
    if (lang === 'es') {
      if (category.includes('Critical')) return 'Crítico'
      if (category.includes('High')) return 'Alto'
      if (category.includes('Moderate')) return 'Moderado'
      return 'Bajo'
    }
    return category
  }

  return (
    <main className="main">
      <div className="header">
        <div className="h-left">
          <h1>{lang === 'es' ? 'Reportes' : 'Reports'}</h1>
          <div className="h-sub">{lang === 'es' ? 'Comparador de proyectos' : 'Project comparator'}</div>
        </div>
      </div>

      <div style={{ padding: '0 24px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {[
                lang === 'es' ? 'Proyecto' : 'Project',
                lang === 'es' ? 'País' : 'Country',
                lang === 'es' ? 'Sector' : 'Sector',
                lang === 'es' ? 'Fase' : 'Phase',
                lang === 'es' ? 'Puntuación' : 'Risk Score',
                lang === 'es' ? 'Categoría' : 'Category',
                lang === 'es' ? 'Taxa' : 'Taxa',
                lang === 'es' ? 'Registros' : 'Records',
                'WDPA',
                'NDVI',
                'IFC PS6',
                lang === 'es' ? 'Inversión' : 'Investment',
                lang === 'es' ? 'Fecha' : 'Date', 'PDF',
              ].map((h, i) => (
                <th key={i} style={{
                  padding: '10px 12px', textAlign: 'left',
                  fontSize: 10, fontWeight: 700, color: 'var(--text3)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  borderBottom: '1px solid var(--bd)',
                  whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((p, i) => {
              const score = p.riskScore?.score
              const ndvi = p.gbifData?.ndvi?.mean
              const wdpa = p.gbifData?.wdpa?.intersectingCount ?? 0
              const taxa = p.gbifData?.taxaInPolygon?.filter(t => t.inPolygon > 0).length ?? 0
              const ifc = p.frameworks?.includes('IFC PS6 / Equator Principles') ? '✓' : '—'
              const investment = p.investment && Number(p.investment) > 0
                ? Number(p.investment) >= 1e9
                  ? `$${(Number(p.investment) / 1e9).toFixed(1)}B`
                  : Number(p.investment) >= 1e6
                    ? `$${(Number(p.investment) / 1e6).toFixed(0)}M`
                    : `$${Number(p.investment).toLocaleString('en-US')}`
                : '—'

              return (<tr key={i} style={{ borderBottom: '1px solid var(--bd)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text)' }}>{p.name}</td>
                <td style={{ padding: '12px', color: 'var(--text2)' }}>{COUNTRY_NAMES[p.country] ?? p.country}</td>
                <td style={{ padding: '12px', color: 'var(--text2)' }}>{p.sector}</td>
                <td style={{ padding: '12px', color: 'var(--text2)', fontSize: 11 }}>{p.phase ?? '—'}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: getRiskColor(score) }}>{score ?? '—'}</span>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>/100</span>
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                    background: getRiskColor(score) + '18',
                    color: getRiskColor(score),
                    border: `1px solid ${getRiskColor(score)}40`,
                  }}>
                    {getRiskLabel(p.riskScore?.category)}
                  </span>
                </td>
                <td style={{ padding: '12px', color: 'var(--text)', fontWeight: 600 }}>{taxa}</td>
                <td style={{ padding: '12px', color: 'var(--text2)' }}>{p.totalInPolygon?.toLocaleString('en-US') ?? '—'}</td>
                <td style={{ padding: '12px', color: wdpa > 0 ? '#F5A623' : 'var(--text3)', fontWeight: wdpa > 0 ? 700 : 400 }}>{wdpa}</td>
                <td style={{ padding: '12px', color: 'var(--text2)' }}>{ndvi ? ndvi.toFixed(3) : '—'}</td>
                <td style={{ padding: '12px', color: ifc === '✓' ? '#22c55e' : 'var(--text3)' }}>{ifc}</td>
                <td style={{ padding: '12px', color: 'var(--text2)', fontSize: 11 }}>{investment}</td>
                <td style={{ padding: '12px', color: 'var(--text3)', fontSize: 11 }}>{p.date}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button
                    onClick={() => exportReport(p.gbifData, { name: p.name, country: p.country, sector: p.sector, phase: p.phase, frameworks: p.frameworks, investment: p.investment }, p.name)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 4, borderRadius: 4, transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ec4899'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
                    title="Export PDF"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 1h6l3 3v10a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" />
                      <path d="M9 1v4h3" />
                      <path d="M5 9h6M5 11.5h4" />
                    </svg>
                  </button>
                </td>
              </tr>)
            })}
          </tbody>
        </table>
      </div>
    </main>
  )
}

function DataSourcesPage({ t, lang }) {
  return (
    <main className="main" style={{ fontSize: '13px' }}>
      <div className="header">
        <div className="h-left">
          <h1>{t('sources.title')}</h1>
          <div className="h-sub">{t('sources.sub')}</div>
        </div>
      </div>
      <div className="sources-grid" style={{ padding: '0 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>
        {[
          {
            icon: '🌐',
            name: lang === 'es' ? 'GBIF — Infraestructura Global de Información sobre Biodiversidad' : 'GBIF — Global Biodiversity Information Facility',
            desc: lang === 'es' ? 'La base de datos de biodiversidad de acceso abierto más grande del mundo con más de 2 mil millones de registros de ocurrencias.' : 'The world\'s largest open-access biodiversity database with over 2 billion occurrence records from 70,000+ datasets worldwide.',
            link: 'https://www.gbif.org', badge: 'CC BY 4.0', stats: '2B+ records · 70K+ datasets · Free API',
          },
          {
            icon: '🛰',
            name: 'Sentinel-2 L2A — Copernicus',
            desc: lang === 'es' ? 'Imágenes satelitales de la ESA a 10m de resolución. Usadas para NDVI y análisis de cobertura del suelo.' : 'ESA satellite imagery at 10m resolution updated every 5 days. Used for NDVI vegetation health and land cover analysis.',
            link: 'https://dataspace.copernicus.eu', badge: 'Free tier', stats: '10m resolution · 5-day revisit · 2017–present',
          },
          {
            icon: '🛡',
            name: lang === 'es' ? 'WDPA — Base de Datos Mundial de Áreas Protegidas' : 'WDPA — World Database of Protected Areas',
            desc: lang === 'es' ? 'La base de datos global más completa de áreas protegidas marinas y terrestres, gestionada por UNEP-WCMC e IUCN.' : 'The most comprehensive global database of marine and terrestrial protected areas, managed by UNEP-WCMC and IUCN.',
            link: 'https://www.protectedplanet.net', badge: 'Free API', stats: '260K+ protected areas · Global coverage',
          },
          {
            icon: '📋',
            name: lang === 'es' ? 'Lista Roja UICN de Especies Amenazadas' : 'IUCN Red List of Threatened Species',
            desc: lang === 'es' ? 'El inventario más completo del estado de conservación de especies. Integración pendiente de aprobación.' : 'The world\'s most comprehensive inventory of species conservation status. Integration pending approval.',
            link: 'https://www.iucnredlist.org', badge: 'Pending', stats: '150K+ species assessed · Updated annually',
          },
          {
            icon: '☁️',
            name: lang === 'es' ? 'AWS Open Data — Snapshot GBIF S3' : 'AWS Open Data — GBIF S3 Snapshot',
            desc: lang === 'es' ? 'Dataset completo de ocurrencias GBIF en formato Parquet en AWS S3. Potencia el Modo de Análisis Completo vía Athena.' : 'Complete GBIF occurrence dataset in Parquet format hosted on AWS S3. Powers Full Analysis Mode via Athena.',
            link: 'https://registry.opendata.aws/gbif/', badge: 'Free access', stats: 'Snapshot 2026-05-01 · ~180GB',
          },
          {
            icon: '🌍',
            name: 'Google Dynamic World V1',
            desc: lang === 'es' ? 'Clasificación de cobertura del suelo en tiempo casi real a 10m usando imágenes Sentinel-2. 9 clases de uso del suelo.' : 'Near real-time land cover classification at 10m resolution using Sentinel-2 imagery. 9 land use classes updated continuously.',
            link: 'https://dynamicworld.app', badge: 'Free · GEE', stats: '10m resolution · 9 classes · 2015–present',
          },
          {
            icon: '🌲',
            name: lang === 'es' ? 'Hansen Cambio Forestal Global v1.11' : 'Hansen Global Forest Change v1.11',
            desc: lang === 'es' ? 'Datos anuales de pérdida y ganancia de cobertura forestal global. Monitorea la deforestación 2001–2023.' : 'Annual global forest cover loss and gain from University of Maryland. Tracks deforestation from 2001 to 2023.',
            link: 'https://glad.umd.edu/projects/global-forest-watch', badge: 'Free · GEE', stats: '30m resolution · 2001–2023 · Annual updates',
          },
          {
            icon: '💧',
            name: lang === 'es' ? 'JRC Agua Superficial Global' : 'JRC Global Surface Water',
            desc: lang === 'es' ? 'Presencia mensual de agua derivada de imágenes Landsat por el Centro de Investigación Conjunto.' : 'Monthly water presence derived from Landsat imagery by the Joint Research Centre. Tracks permanent and seasonal water bodies.',
            link: 'https://global-surface-water.appspot.com', badge: 'Free · GEE', stats: '30m resolution · 1984–2021 · Monthly',
          },
          {
            icon: '🔥',
            name: lang === 'es' ? 'MODIS MOD14A1 — Detección de Incendios' : 'MODIS MOD14A1 — Fire Detection',
            desc: lang === 'es' ? 'Detección global diaria de incendios del satélite NASA MODIS. Evalúa el riesgo de incendios forestales.' : 'Daily global fire detection from NASA MODIS satellite. Assesses wildfire risk over the last 5 years.',
            link: 'https://modis.gsfc.nasa.gov', badge: 'Free · GEE', stats: '1km resolution · Daily · 2000–present',
          },
          {
            icon: '🦎',
            name: lang === 'es' ? 'Clasificación de Hábitat UICN v004' : 'IUCN Habitat Classification v004',
            desc: lang === 'es' ? 'Mapa global de clasificación de hábitat basado en categorías UICN. Identifica el tipo de ecosistema dominante.' : 'Global habitat classification map based on IUCN categories. Identifies dominant ecosystem type within project boundaries.',
            link: 'https://www.iucnredlist.org/resources/habitat-classification-scheme', badge: 'Free · GEE', stats: '300m resolution · Level 2 classification',
          },
          {
            icon: '🗺',
            name: lang === 'es' ? 'Áreas Clave para la Biodiversidad (KBA)' : 'Key Biodiversity Areas (KBA)',
            desc: lang === 'es' ? 'Sitios que contribuyen significativamente a la persistencia global de la biodiversidad. Acceso pendiente de aprobación.' : 'Sites contributing significantly to the global persistence of biodiversity. Data access pending approval from KBA Partnership.',
            link: 'https://www.keybiodiversityareas.org', badge: 'Pending', stats: '16,500+ sites · Global · BirdLife International',
          },
        ].map((s, i) => (
          <GlassCard key={i} breathing glowOnHover style={{ fontSize: '0.78em' }}>
            <GlassCard.Icon>{s.icon}</GlassCard.Icon>
            <GlassCard.Title>{s.name}</GlassCard.Title>
            <GlassCard.Body>
              {s.desc}
              <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6, display: 'block' }}>{s.stats}</span>
            </GlassCard.Body>
            <GlassCard.Link href={s.link} target="_blank" rel="noreferrer">{s.badge}</GlassCard.Link>
          </GlassCard>
        ))}
      </div>
      <div style={{ padding: '16px 24px', fontSize: 10, color: 'var(--text3)' }}>
        {lang === 'es' ? 'Datos de ocurrencias de GBIF.org bajo CC BY 4.0 · BioRisk AI © 2026' : 'Occurrence data from GBIF.org under CC BY 4.0 · BioRisk AI © 2026'}
      </div>
    </main>
  )
}

function WelcomePage({ onStart, t, lang }) {
  return (
    <main className="main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 560, padding: '0 24px', width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{
            fontSize: 26, fontWeight: 700, color: 'var(--text)',
            letterSpacing: '-0.02em', marginBottom: 8,
          }}>
            {t('welcome.title')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
            {lang === 'es' ? (
              <>América Latina alberga el 40% de las especies conocidas del mundo —<br />
                pero la biodiversidad rara vez se considera en las decisiones de inversión.<br />
                <strong style={{ color: 'var(--text)' }}>BioRisk AI cambia eso.</strong></>
            ) : (
              <>Latin America hosts 40% of the world's known species —<br />
                yet biodiversity is rarely factored into investment decisions.<br />
                <strong style={{ color: 'var(--text)' }}>BioRisk AI changes that.</strong></>
            )}
          </p>
        </div>

        {/* What it is */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--bd)',
          borderRadius: 10, padding: '16px 20px', marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.75, marginBottom: 8 }}>
            {lang === 'es'
              ? 'BioRisk AI convierte los datos de ocurrencia abiertos de GBIF en inteligencia de biodiversidad accionable — en minutos, no meses. Dibujá el área de tu proyecto, ejecutá un análisis y obtené un perfil de riesgo respaldado por registros reales de especies, datos satelitales de vegetación y análisis de áreas protegidas.'
              : 'BioRisk AI turns open GBIF occurrence data into actionable biodiversity intelligence — in minutes, not months. Draw your project area, run a scan, and get a screening-grade risk profile backed by real species records, satellite vegetation data, and protected area analysis.'
            }
          </p>
          <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
            {lang === 'es' ? 'Compatible con ' : 'Supports '}
            <strong style={{ color: 'var(--text)' }}>TNFD LEAP</strong>
            {lang === 'es' ? ' y ' : ' and '}
            <strong style={{ color: 'var(--text)' }}>CSRD ESRS E4</strong>
            {lang === 'es'
              ? ' — un análisis, dos marcos. 500+ empresas · 129 instituciones financieras · $17.7T AUM global.'
              : ' — one analysis, two frameworks. 500+ companies · 129 financial institutions · $17.7T AUM globally.'
            }
          </p>
        </div>

        {/* Designed for - WordRoll */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--bd)',
          borderRadius: 10, padding: '14px 20px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t('welcome.designed_for')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)', minHeight: 28 }}>
            <WordRoll
              words={lang === 'es' ? [
                'Analistas ESG preparando divulgaciones TNFD / CSRD',
                'Consultores ambientales evaluando sitios de proyectos',
                'Empresas exportando a la UE bajo el alcance CSRD',
                'Investigadores estudiando impactos antrópicos en biodiversidad',
              ] : [
                'ESG analysts preparing TNFD / CSRD disclosures',
                'Environmental consultants screening project sites',
                'Companies exporting to the EU under CSRD scope',
                'Researchers studying anthropogenic impacts on biodiversity',
              ]}
              intervalMs={3000}
              transitionMs={400}
              direction="up"
              gradient
              style={{ fontWeight: 500 }}
            />
          </div>
        </div>

        {/* Not a replacement */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--bd)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 16,
          fontSize: 11, color: 'var(--text3)',
        }}>
          ⚠ <strong style={{ color: 'var(--text2)' }}>
            {lang === 'es' ? 'No reemplaza:' : 'Not a replacement for:'}
          </strong>
          {lang === 'es'
            ? ' relevamientos de campo formales ni evaluaciones ESIA. Solo resultados de nivel de screening.'
            : ' formal field surveys or ESIA assessments. Screening-grade results only.'
          }
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Button variant="shimmer" sparkle size="lg" onClick={onStart}>
            {t('btn.start_analysis')}
          </Button>
        </div>

        {/* Animated Steps */}
        {(() => {
          const steps = [
            {
              num: '01',
              title: lang === 'es' ? 'Dibujá el polígono' : 'Draw polygon',
              desc: lang === 'es' ? 'Definí el área del proyecto en el mapa' : 'Define your project area on the map',
              color: 'var(--green)',
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 6l4-3 7 4 4-3v13l-4 3-7-4-4 3z" />
                  <path d="M7 3v13M14 7v13" />
                </svg>
              )
            },
            {
              num: '02',
              title: lang === 'es' ? 'Análisis GBIF' : 'GBIF scan',
              desc: lang === 'es' ? 'Taxa más representados en tu país · 16 países LAC' : 'Taxa most represented in your country · 16 LAC countries',
              color: '#3B82F6',
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4-4" />
                  <path d="M8 11h6M11 8v6" />
                </svg>
              )
            },
            {
              num: '03',
              title: lang === 'es' ? 'Reporte de riesgo' : 'Risk report',
              desc: lang === 'es' ? 'Alineado con TNFD · CSRD · IFC PS6' : 'TNFD · CSRD · IFC PS6 aligned',
              color: '#8B5CF6',
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              )
            },
          ]
          const [activeStep, setActiveStep] = useState(0)

          useEffect(() => {
            const interval = setInterval(() => {
              setActiveStep(prev => (prev + 1) % steps.length)
            }, 2000)
            return () => clearInterval(interval)
          }, [])

          return (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {steps.map((step, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveStep(i)}
                    style={{
                      background: activeStep === i ? 'rgba(34,197,94,0.05)' : 'var(--card)',
                      border: `1px solid ${activeStep === i ? step.color : 'var(--bd)'}`,
                      borderRadius: 8, padding: '14px 10px', textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.4s ease',
                      transform: activeStep === i ? 'translateY(-2px)' : 'none',
                      boxShadow: activeStep === i ? `0 4px 12px ${step.color}20` : 'none',
                    }}
                  >
                    <div style={{
                      color: activeStep === i ? step.color : 'var(--text3)',
                      transition: 'color 0.4s ease',
                      marginBottom: 8,
                      display: 'flex', justifyContent: 'center',
                    }}>
                      {step.icon}
                    </div>
                    <div style={{
                      fontSize: 11, fontWeight: 600, marginBottom: 3,
                      color: activeStep === i ? 'var(--text)' : 'var(--text2)',
                      transition: 'color 0.4s ease',
                    }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.5 }}>
                      {step.desc}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'center' }}>
                {steps.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveStep(i)}
                    style={{
                      width: activeStep === i ? 24 : 6,
                      height: 4, borderRadius: 2,
                      background: activeStep === i ? 'var(--green)' : 'var(--bd2)',
                      transition: 'all 0.4s ease',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>
          )
        })()}

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text3)', lineHeight: 1.8 }}>
          {lang === 'es'
            ? 'Cubriendo 16 países de América Latina y el Caribe'
            : 'Covering 16 countries across Latin America and the Caribbean'
          }<br />
          Powered by GBIF · Sentinel-2 · WDPA · Global Forest Watch
        </div>

      </div>
    </main>
  )
}

function ProjectsPage({ projects, onSelectProject, onNewAnalysis, t, lang }) {
  const getRiskColor = (category) => {
    if (!category) return 'var(--text3)'
    if (category.includes('Critical')) return '#E84C3D'
    if (category.includes('High')) return '#F5A623'
    if (category.includes('Moderate')) return '#FBBF24'
    return '#18A957'
  }

  return (
    <main className="main">
      <div className="header">
        <div className="h-left">
          <h1>{t('projects.title')}</h1>
          <div className="h-sub">{t('projects.sub')}</div>
        </div>
        <div className="h-right">
          <Button variant="glow" sparkle size="sm" onClick={onNewAnalysis}>
            {t('btn.new_analysis')}
          </Button>
        </div>
      </div>

      <div style={{ padding: '0 24px' }}>
        {projects.length === 0 ? (
          <div style={{
            background: 'var(--card)', border: '1px solid var(--bd)',
            borderRadius: 12, padding: '60px 32px',
            textAlign: 'center', marginTop: 24,
          }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>📁</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              {lang === 'es' ? 'Sin proyectos aún' : 'No projects yet'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>
              {lang === 'es' ? 'Ejecutá un Nuevo Análisis para ver tus proyectos aquí.' : 'Run a New Analysis to see your projects here.'}
            </div>
            <Button variant="glow" size="sm" onClick={onNewAnalysis}>
              {lang === 'es' ? 'Iniciar tu primer análisis' : 'Start your first analysis'}
            </Button>
          </div>
        ) : (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => onSelectProject(project)}
                style={{
                  background: 'var(--card)', border: '1px solid var(--bd)',
                  borderRadius: 12, padding: '16px 20px',
                  cursor: 'pointer', transition: 'all .15s',
                  display: 'flex', alignItems: 'center', gap: 16,
                  boxShadow: 'var(--sh1)',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#7c3aed'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bd)'}
              >
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
                  <div style={{ fontSize: 8, color: 'var(--text3)' }}>/100</div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                    {project.name}
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                      🌍 {COUNTRY_NAMES[project.country] ?? project.country}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                      ⚙️ {project.sector}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                      📍 {project.totalInPolygon?.toLocaleString('en-US')} {lang === 'es' ? 'ocurrencias' : 'occurrences'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                      📅 {project.date}
                    </span>
                  </div>
                </div>

                <div style={{
                  padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                  flexShrink: 0,
                  background: getRiskColor(project.riskScore?.category) + '18',
                  color: getRiskColor(project.riskScore?.category),
                  border: `1px solid ${getRiskColor(project.riskScore?.category)}40`,
                }}>
                  {project.riskScore?.category ?? (lang === 'es' ? 'Desconocido' : 'Unknown')}
                </div>

                <div style={{ fontSize: 16, color: 'var(--text3)', flexShrink: 0 }}>→</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

const TRANSLATIONS = {
  en: {
    'nav.new': 'New Analysis',
    'nav.dashboard': 'Dashboard',
    'nav.projects': 'Projects',
    'nav.species': 'Species Explorer',
    'nav.sources': 'Data Sources',
    'nav.settings': 'Settings',
    'nav.reports': 'Reports',
    'nav.monitoring': 'Monitoring Insights',
    'dashboard.title': 'Project Analysis',
    'dashboard.overview': 'Overview',
    'dashboard.biodiversity': 'Biodiversity',
    'dashboard.tnfd': 'TNFD & ESG',
    'dashboard.vegetation': 'Vegetation & Forest',
    'dashboard.mitigation': 'Mitigation',
    'btn.executive_summary': 'Executive Summary',
    'btn.export_report': 'Export Report',
    'btn.export_json': 'Export JSON',
    'btn.export_csv': 'Export CSV',
    'btn.new_analysis': 'New Analysis',
    'btn.start_analysis': 'Start New Analysis →',
    'btn.run_scan': 'Run Biodiversity Scan →',
    'btn.hide_copilot': '← Hide',
    'btn.show_copilot': 'Copilot →',
    'welcome.title': 'Welcome to BioRisk AI',
    'welcome.designed_for': 'Designed for',
    'welcome.subtitle': 'Biodiversity risk intelligence for ESG & TNFD reporting across Latin America and the Caribbean.',
    'projects.title': 'Projects',
    'projects.sub': 'Your biodiversity risk analyses',
    'sources.title': 'Data Sources',
    'sources.sub': 'Open data powering BioRisk AI',
    'copilot.title': 'AI Copilot',
    'new.title': 'New Analysis',
    'new.define_area': 'Define Project Area',
    'new.project_name': 'Project name *',
    'new.country': 'Country',
    'new.sector': 'Sector',
    'new.phase': 'Project Phase',
    'new.framework': 'Reporting Framework',
    'new.investment': 'Estimated Investment (USD)',
    'overview.risk_score': 'Risk Score',
    'overview.no_analysis': 'No analysis',
    'overview.records': 'records',
    'overview.taxa_detected': 'taxa detected',
    'overview.buffer_title': 'Indirect Influence Area (5km buffer)',
    'overview.buffer_desc': 'additional occurrence records detected within 5km of the project boundary.',
    'overview.records_in_buffer': 'records in buffer',
    'map.project_area': 'Project Area',
    'map.btn_points': 'Points',
    'map.btn_hex': 'Hex NDVI',
    'map.btn_heatmap': 'Heatmap',
    'map.btn_ndvi': 'NDVI',
    'map.btn_areas': 'Areas',
    'map.btn_gbif': 'GBIF Density',
  },
  es: {
    'nav.new': 'Nuevo Análisis',
    'nav.dashboard': 'Panel',
    'nav.projects': 'Proyectos',
    'nav.species': 'Explorador de Especies',
    'nav.sources': 'Fuentes de Datos',
    'nav.settings': 'Configuración',
    'nav.reports': 'Reportes',
    'nav.monitoring': 'Monitoreo',
    'dashboard.title': 'Análisis de Proyecto',
    'dashboard.overview': 'Resumen',
    'dashboard.biodiversity': 'Biodiversidad',
    'dashboard.tnfd': 'TNFD & ESG',
    'dashboard.vegetation': 'Vegetación & Bosque',
    'dashboard.mitigation': 'Mitigación',
    'btn.executive_summary': 'Resumen Ejecutivo',
    'btn.export_report': 'Exportar Reporte',
    'btn.export_json': 'Exportar JSON',
    'btn.export_csv': 'Exportar CSV',
    'btn.new_analysis': 'Nuevo Análisis',
    'btn.start_analysis': 'Iniciar Nuevo Análisis →',
    'btn.run_scan': 'Ejecutar Análisis →',
    'btn.hide_copilot': '← Ocultar',
    'btn.show_copilot': 'Copilot →',
    'welcome.title': 'Bienvenido a BioRisk AI',
    'welcome.designed_for': 'Diseñado para',
    'welcome.subtitle': 'Inteligencia de riesgo de biodiversidad para reportes ESG y TNFD en América Latina y el Caribe.',
    'projects.title': 'Proyectos',
    'projects.sub': 'Tus análisis de riesgo de biodiversidad',
    'sources.title': 'Fuentes de Datos',
    'sources.sub': 'Datos abiertos que impulsan BioRisk AI',
    'copilot.title': 'Copilot IA',
    'new.title': 'Nuevo Análisis',
    'new.define_area': 'Definir Área del Proyecto',
    'new.project_name': 'Nombre del proyecto *',
    'new.country': 'País',
    'new.sector': 'Sector',
    'new.phase': 'Fase del Proyecto',
    'new.framework': 'Marco de Reporte',
    'new.investment': 'Inversión Estimada (USD)',
    'overview.risk_score': 'Puntuación de Riesgo',
    'overview.no_analysis': 'Sin análisis',
    'overview.records': 'registros',
    'overview.taxa_detected': 'taxa detectados',
    'overview.buffer_title': 'Área de Influencia Indirecta (buffer 5km)',
    'overview.buffer_desc': 'registros de ocurrencia adicionales detectados dentro de 5km del límite del proyecto.',
    'overview.records_in_buffer': 'registros en buffer',
    'map.project_area': 'Área del Proyecto',
    'map.btn_points': 'Puntos',
    'map.btn_hex': 'Hex NDVI',
    'map.btn_heatmap': 'Mapa de calor',
    'map.btn_ndvi': 'NDVI',
    'map.btn_areas': 'Áreas',
    'map.btn_gbif': 'Densidad GBIF',
  }
}
function GlobeBackground() {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const W = window.innerWidth, H = window.innerHeight
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100)
    camera.position.set(0, 0.3, 2.8)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(W, H)
    renderer.setClearColor(0x020408, 1)
    el.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enableZoom = false
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.15
    controls.target.set(0, 0, 0)
    controls.update()

    const globe = new THREE.Group()
    globe.rotation.x = 0.01
    globe.rotation.y = -0.6
    scene.add(globe)
    // Solid sphere with Earth texture
    const textureLoader = new THREE.TextureLoader()
    const earthTexture = textureLoader.load('https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg')
    const solidMat = new THREE.MeshPhongMaterial({ map: earthTexture, shininess: 15, transparent: true, opacity: 0.95 })
    globe.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), solidMat))

    // Wireframe
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.001, 40, 30),
      new THREE.MeshBasicMaterial({ color: 0x0d2010, wireframe: true, transparent: true, opacity: 0.2 })
    ))

    // Atmosphere
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x14532d, transparent: true, opacity: 0.07, side: THREE.BackSide })
    ))

    // Lights
    scene.add(new THREE.AmbientLight(0x071a0a, 1))
    const sun = new THREE.DirectionalLight(0x22ff66, 0.5)
    sun.position.set(5, 3, 4)
    scene.add(sun)
    const purpleLight = new THREE.PointLight(0x7c3aed, 0.8, 8)
    purpleLight.position.set(-3, 1, 3)
    scene.add(purpleLight)

    // Lat/Lng to 3D
    const ll = (lat, lng, r = 1.01) => {
      const phi = (90 - lat) * Math.PI / 180
      const theta = (lng + 180) * Math.PI / 180
      return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      )
    }

    // Hotspots
    const hotspots = [
      [-3, -60, 1.0], [-5, -65, 0.9], [-8, -55, 0.85], [-2, -52, 0.95],
      [-10, -68, 0.8], [0, -70, 0.9], [2, -66, 0.85],
      [-15, -72, 0.8], [-20, -68, 0.75], [-12, -75, 0.85],
      [5, -74, 0.85], [8, -72, 0.8], [-20, -44, 0.85],
      [-40, -68, 0.55], [10, -84, 0.8], [19, -99, 0.7],
      [-25.5, -67.5, 0.9],
    ]

    const dotMeshes = []
    hotspots.forEach(([lat, lng, intensity]) => {
      const pos = ll(lat, lng)
      const size = 0.007 + intensity * 0.010
      const col = new THREE.Color(0x22c55e).lerp(new THREE.Color(0x06b6d4), 1 - intensity)
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(size, 8, 8),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8 })
      )
      dot.position.copy(pos)
      dot.userData = { phase: Math.random() * Math.PI * 2 }
      globe.add(dot)
      dotMeshes.push(dot)

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(size * 2.5, size * 3.5, 16),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.2 * intensity, side: THREE.DoubleSide })
      )
      ring.position.copy(pos)
      ring.lookAt(0, 0, 0)
      globe.add(ring)
    })

    // Litio Galán
    const litioPos = ll(-25.5, -67.5, 1.015)
    const litioDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xec4899 })
    )
    litioDot.position.copy(litioPos)
    globe.add(litioDot)

    const litioRings = []
    for (let i = 0; i < 2; i++) {
      const rm = new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.5 - i * 0.15, side: THREE.DoubleSide })
      const r = new THREE.Mesh(new THREE.RingGeometry(0.025 + i * 0.018, 0.032 + i * 0.018, 24), rm)
      r.position.copy(litioPos)
      r.lookAt(0, 0, 0)
      globe.add(r)
      litioRings.push(r)
    }

    // Arcs
    const addArc = (lat1, lng1, lat2, lng2, color) => {
      const a = ll(lat1, lng1), b = ll(lat2, lng2)
      const mid = a.clone().add(b).normalize().multiplyScalar(1.35)
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
      globe.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(50)),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.25 })
      ))
    }
    addArc(-3, -60, -20, -44, 0x7c3aed)
    addArc(-5, -65, -25.5, -67.5, 0xec4899)
    addArc(5, -74, -15, -72, 0x06b6d4)

    // Stars
    const starVerts = []
    for (let i = 0; i < 3000; i++) {
      const r = 40 + Math.random() * 40
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      starVerts.push(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi))
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3))
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.35 })))

    // Animate
    let t = 0
    let animId
    const animate = () => {
      animId = requestAnimationFrame(animate)
      t += 0.01
      controls.update()
      dotMeshes.forEach(d => { d.scale.setScalar(0.7 + 0.3 * Math.sin(t * 1.5 + d.userData.phase)) })
      litioRings.forEach((r, i) => {
        const p = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.2)
        r.material.opacity = (0.5 - i * 0.15) * p
        r.scale.setScalar(1 + 0.2 * p)
      })
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
}

function ProductTour({ steps, currentStep, onNext, onPrev, onClose, lang }) {
  if (currentStep < 0 || currentStep >= steps.length) return null
  const step = steps[currentStep]

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(2px)',
        }}
      />
      {/* Tooltip */}
      <div style={{
        position: 'fixed', zIndex: 9999,
        background: 'var(--card)',
        border: '1px solid rgba(124,58,237,0.4)',
        borderRadius: 12, padding: '20px 24px',
        maxWidth: 300, width: '90vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.2)',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
      }}>
        {/* Progress */}
        <div style={{
          fontSize: 10, color: 'var(--text3)',
          marginBottom: 12,
          display: 'flex', justifyContent: 'space-between'
        }}>
          <span>{lang === 'es' ? 'Tour de la app' : 'App tour'}</span>
          <span>{currentStep + 1} / {steps.length}</span>
        </div>

        {/* Progress bar */}
        <div style={{
          height: 2, background: 'var(--bd)',
          borderRadius: 1, marginBottom: 14
        }}>
          <div style={{
            height: '100%', borderRadius: 1,
            background: 'linear-gradient(90deg, #7c3aed, #ec4899)',
            width: `${((currentStep + 1) / steps.length) * 100}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>

        {/* Icon + Title */}
        <div style={{ fontSize: 24, marginBottom: 8 }}>{step.icon}</div>
        <div style={{
          fontSize: 14, fontWeight: 700, color: 'var(--text)',
          marginBottom: 8, letterSpacing: '-0.01em'
        }}>
          {step.title}
        </div>
        <div style={{
          fontSize: 12, color: 'var(--text2)',
          lineHeight: 1.7, marginBottom: 20
        }}>
          {step.content}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: 'var(--text3)',
            }}
          >
            {lang === 'es' ? 'Saltar' : 'Skip'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {currentStep > 0 && (
              <button
                onClick={onPrev}
                style={{
                  padding: '7px 14px', borderRadius: 7,
                  background: 'var(--bd)', border: 'none',
                  fontSize: 12, fontWeight: 600, color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                {lang === 'es' ? 'Atrás' : 'Back'}
              </button>
            )}
            <button
              onClick={currentStep === steps.length - 1 ? onClose : onNext}
              style={{
                padding: '7px 14px', borderRadius: 7,
                background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                border: 'none', fontSize: 12, fontWeight: 600, color: 'white',
                cursor: 'pointer',
              }}
            >
              {currentStep === steps.length - 1
                ? (lang === 'es' ? 'Finalizar' : 'Finish')
                : (lang === 'es' ? 'Siguiente' : 'Next')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default function App() {
  const [tourRun, setTourRun] = useState(false)
  const [tourStep, setTourStep] = useState(0)
  const [scanDuration, setScanDuration] = useState(null)
  const { isAuthenticated, isLoading, loginWithRedirect, logout, user, getAccessTokenSilently, getIdTokenClaims } = useAuth0()
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') ?? 'dark')
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])
  const [scanError, setScanError] = useState('')
  const [activePage, setActivePage] = useState('dashboard')
  const [gbifData, setGbifData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [projectName, setProjectName] = useState('Offshore Wind Farm – Patagonia')
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [dashboardTab, setDashboardTab] = useState('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [dynamicTaxa, setDynamicTaxa] = useState(SCAN_TAXA)
  const [loadingTaxa, setLoadingTaxa] = useState(false)
  const [copilotCollapsed, setCopilotCollapsed] = useState(false)
  const [showFullAnalysis, setShowFullAnalysis] = useState(false)
  const [dataSource, setDataSource] = useState('unknown')
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
  const [scanLogs, setScanLogs] = useState([])
  const addLog = (msg, status = 'done') => {
    setScanLogs(prev => [...prev, { msg, status }])
  }
  const [scanStepLabel, setScanStepLabel] = useState('')
  const [showDemoBanner, setShowDemoBanner] = useState(false)
  const [lang, setLang] = useState(() => localStorage.getItem('lang') ?? 'en')
  const t = (key) => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS['en'][key] ?? key

  const tourSteps = [
    {
      icon: '🗺',
      title: lang === 'es' ? 'Bienvenido a BioRisk AI' : 'Welcome to BioRisk AI',
      content: lang === 'es'
        ? 'Esta guía rápida te muestra las funciones principales de la plataforma.'
        : 'This quick guide shows you the main features of the platform.',
    },
    {
      icon: '✏️',
      title: lang === 'es' ? 'Nuevo Análisis' : 'New Analysis',
      content: lang === 'es'
        ? 'Hacé clic en "Nuevo Análisis" para dibujar un polígono en el mapa y ejecutar un análisis de biodiversidad.'
        : 'Click "New Analysis" to draw a polygon on the map and run a biodiversity scan.',
    },
    {
      icon: '📊',
      title: lang === 'es' ? 'Dashboard' : 'Dashboard',
      content: lang === 'es'
        ? 'El dashboard tiene 5 tabs: Resumen, Biodiversidad, TNFD & ESG, Vegetación y Mitigación.'
        : 'The dashboard has 5 tabs: Overview, Biodiversity, TNFD & ESG, Vegetation & Forest, and Mitigation.',
    },
    {
      icon: '🎯',
      title: lang === 'es' ? 'Risk Score' : 'Risk Score',
      content: lang === 'es'
        ? 'El Risk Score resume el nivel de sensibilidad de biodiversidad del área analizada en una escala de 0 a 100.'
        : 'The Risk Score summarizes biodiversity sensitivity on a scale of 0 to 100.',
    },
    {
      icon: '🤖',
      title: lang === 'es' ? 'Copilot IA' : 'AI Copilot',
      content: lang === 'es'
        ? 'El Copilot responde preguntas regulatorias sobre TNFD, IFC PS6 y CSRD basadas en tu análisis real.'
        : 'The Copilot answers regulatory questions about TNFD, IFC PS6 and CSRD based on your actual analysis.',
    },
    {
      icon: '📄',
      title: lang === 'es' ? 'Exportar Reporte' : 'Export Report',
      content: lang === 'es'
        ? 'Exportá un PDF con el TNFD Content Index y la evaluación IFC PS6 Critical Habitat.'
        : 'Export a PDF with the TNFD Content Index and IFC PS6 Critical Habitat assessment.',
    },
  ]

  const [activePolygon, setActivePolygon] = useState(null)
  const [mapCenter, setMapCenter] = useState([-20, -60])
  const [mapZoom, setMapZoom] = useState(3)
  const [copilotKey, setCopilotKey] = useState(0)
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [showExecSummary, setShowExecSummary] = useState(false)
  const [execSummaryText, setExecSummaryText] = useState('')
  const [execSummaryLoading, setExecSummaryLoading] = useState(false)

  useEffect(() => {
    console.log('🔍 useEffect IUCN triggered, analysisId:', gbifData?.analysisId, 'allTaxaRecords:', gbifData?.allTaxaRecords?.length)

    if (!gbifData?.allTaxaRecords) return

    // Extraer specieskeys de allTaxaRecords
    const allRecords = gbifData.allTaxaRecords.flatMap(t => t.records ?? [])
    const speciesMap = {}
    allRecords.forEach(r => {
      if (r.specieskey && r.scientificName) {
        speciesMap[r.specieskey] = r.scientificName
      }
    })
    const speciesKeys = Object.keys(speciesMap)

    if (speciesKeys.length === 0) return

    queryIucnStatus(speciesKeys).then(iucnMap => {
      if (Object.keys(iucnMap).length === 0) return
      setGbifData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          iucnMap: Object.fromEntries(
            Object.entries(iucnMap).map(([key, val]) => [key, { iucn: val, name: speciesMap[key] ?? key }])
          ),
        }
      })
    }).catch(() => { })
  }, [gbifData?.allTaxaRecords])


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
    } else if (id === 'reports') {
      setPage('reports')
    } else {
      setPage('welcome')
    }
  }

  async function loadCountryTaxa(countryCode) {
    setLoadingTaxa(true)
    try {
      // Get top classes by occurrence count for the country
      const facetRes = await fetch(
        `https://api.gbif.org/v1/occurrence/search?country=${countryCode}&limit=0&facet=classKey&facetMincount=500&facetLimit=40`
      )
      const facetData = await facetRes.json()
      const classKeys = facetData.facets?.[0]?.counts?.map(c => c.name) ?? []

      if (classKeys.length === 0) {
        setDynamicTaxa(SCAN_TAXA)
        return
      }

      // Resolve class names
      const resolved = await Promise.all(
        classKeys.slice(0, 30).map(key =>
          fetch(`https://api.gbif.org/v1/species/${key}`)
            .then(r => r.json())
            .then(d => ({ key, name: d.canonicalName, rank: d.rank, kingdom: d.kingdom }))
            .catch(() => null)
        )
      )

      // Filter relevant taxa for ESG analysis
      const EXCLUDE = [
        'Lecanoromycetes', 'Sordariomycetes', 'Eurotiomycetes', 'Dothideomycetes',
        'Jungermanniopsida', 'Bryopsida', 'Polypodiopsida', 'Leotiomycetes',
        'Tremellomycetes', 'Pezizomycetes', 'Arthoniomycetes', 'Thelephorales',
      ]

      const taxa = resolved
        .filter(t => t && t.name && !EXCLUDE.includes(t.name))
        .map(t => ({
          name: t.name,
          abbr: t.name.slice(0, 4).toUpperCase(),
          taxon_rank: t.rank?.toLowerCase() ?? 'class',
          group: t.kingdom === 'Plantae' ? 'Plants' :
            t.kingdom === 'Fungi' ? 'Fungi' :
              t.kingdom === 'Animalia' ? 'Vertebrates' : 'Other',
        }))

      setDynamicTaxa(taxa.length >= 5 ? taxa : SCAN_TAXA)
      console.log(`🔬 Loaded ${taxa.length} taxa for ${countryCode}`)
    } catch (e) {
      console.warn('Failed to load country taxa:', e.message)
      setDynamicTaxa(SCAN_TAXA)
    } finally {
      setLoadingTaxa(false)
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
    const scanStartTime = Date.now()
    setAnalysisStep(2)
    setScanning(true)
    setScanProgress(0)
    setScanStepLabel('')


    const country = analysisProject.country
    const polygon = drawnPolygon
    let bbox = getBoundingBox(polygon)
    // Large polygon protection — reduce bbox for Athena
    const polygonArea = calcPolygonAreaKm2(drawnPolygon)
    if (polygonArea > 20000) {
      const centerLat = (bbox.minLat + bbox.maxLat) / 2
      const centerLng = (bbox.minLng + bbox.maxLng) / 2
      const delta = 1.5
      bbox.minLat = centerLat - delta
      bbox.maxLat = centerLat + delta
      bbox.minLng = centerLng - delta
      bbox.maxLng = centerLng + delta
      addLog(lang === 'es'
        ? `⚠ Polígono grande — análisis enfocado en área central (~${Math.round(delta * 2 * 111)}km × ${Math.round(delta * 2 * 111)}km)`
        : `⚠ Large polygon — analysis focused on central area (~${Math.round(delta * 2 * 111)}km × ${Math.round(delta * 2 * 111)}km)`,
        'done')
    }


    // Detect if polygon centroid matches selected country
    const centroidLat = (bbox.minLat + bbox.maxLat) / 2
    const centroidLng = (bbox.minLng + bbox.maxLng) / 2

    const countryCenter = COUNTRY_CENTERS[country]
    if (countryCenter) {
      const latDiff = Math.abs(centroidLat - countryCenter[0])
      const lngDiff = Math.abs(centroidLng - countryCenter[1])
      if (latDiff > 15 || lngDiff > 20) {
        setScanError(`Your polygon appears to be outside ${COUNTRY_NAMES[country] ?? country}. Please redraw your polygon or select the correct country.`)
        return
      }
    }

    try {
      setScanProgress(1)
      setScanLogs([]) // limpiar logs anteriores
      addLog(`Polygon validated · ${Math.round(calcPolygonAreaKm2(polygon) ?? 0).toLocaleString('en-US')} km² · ${country}`, 'done')
      addLog(`Identifying taxa for ${COUNTRY_NAMES[country] ?? country}...`, 'loading')
      await delay(500)

      setScanProgress(2)
      //addLog(`${dynamicTaxa.length} taxonomic groups identified for ${COUNTRY_NAMES[country] ?? country}`, 'done')
      addLog(`Querying GBIF occurrence data for ${COUNTRY_NAMES[country] ?? country}...`, 'loading')

      let spatialData = null
      if (MODE === 'full') {
        spatialData = await queryMCPServer('analyze_sampling_gaps', {
          taxon_name: 'Aves',
          countries: [country],
          bbox,
        })
      }

      // Query GBIF via Athena (no rate limits) with fallback to REST API
      let taxaOccurrences
      // Query taxa present in bbox first
      addLog('Identifying taxa in project area...', 'loading')
      const bboxTaxa = await queryTaxaInBbox(country, bbox).catch(() => null)
      const taxaToQuery = bboxTaxa ?? dynamicTaxa.map(t => t.name).slice(0, 20)
      console.log(`🔬 Taxa to query: ${taxaToQuery.length}`)
      addLog(`${taxaToQuery.length} taxonomic classes detected in project area`, 'done')

      const athenaRecords = await queryGbifAthena({
        minLat: bbox.minLat,
        maxLat: bbox.maxLat,
        minLng: bbox.minLng,
        maxLng: bbox.maxLng,
        countryCode: country,
        taxa: taxaToQuery,
      }).catch(() => null)
      let basisCount = {}
      if (athenaRecords && athenaRecords.length > 0) {
        console.log(`✅ Using Athena: ${athenaRecords.length} records from ${taxaToQuery.length} taxa`)
        setDataSource('athena')
        addLog(`${athenaRecords.length.toLocaleString('en-US')} records retrieved · GBIF S3 Snapshot via AWS Athena`, 'done')

        // Query IUCN status for unique species keys
        const uniqueSpeciesKeys = [...new Set(athenaRecords.map(r => r.specieskey).filter(Boolean))]

        const byClass = {}
        athenaRecords.forEach(r => {
          const cls = r.class
          if (!byClass[cls]) byClass[cls] = []
          byClass[cls].push({
            scientificName: r.scientificname,
            lat: parseFloat(r.decimallatitude),
            lng: parseFloat(r.decimallongitude),
            eventDate: r.year ? `${r.year}-${String(r.month).padStart(2, '0')}-${String(r.day).padStart(2, '0')}` : null,
            key: r.gbifid,
            specieskey: r.specieskey,
            basisOfRecord: r.basisofrecord,
            iucnRedListCategory: null, // se enriquece en background            
            specieskey: r.specieskey,
          })
          const basis = r.basisofrecord ?? 'UNKNOWN'
          basisCount[basis] = (basisCount[basis] ?? 0) + 1
        })

        taxaOccurrences = taxaToQuery.map(taxonName => ({
          results: byClass[taxonName] ?? [],
          total: byClass[taxonName]?.length ?? 0,
        }))
      } else {
        setDataSource('rest')
        console.log('⚠ Athena unavailable, falling back to GBIF REST API')
        addLog(`GBIF S3 Snapshot unavailable · falling back to GBIF REST API`, 'done')
        addLog(`Querying GBIF REST API for ${dynamicTaxa.slice(0, 15).length} taxonomic groups...`, 'loading')
        taxaOccurrences = []
        for (const taxon of dynamicTaxa.slice(0, 15)) {
          const result = await callGbif('search_occurrences', {
            taxon_name: taxon.name,
            taxon_rank: taxon.taxon_rank,
            has_coordinate: true,
            lat_min: bbox.minLat,
            lat_max: bbox.maxLat,
            lng_min: bbox.minLng,
            lng_max: bbox.maxLng,
            limit: 300,
          }).catch(() => null)
          taxaOccurrences.push(result)
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      const geeArea = calcPolygonAreaKm2(drawnPolygon)
      const geeCellSize = geeArea < 1000 ? 2 :
        geeArea < 3000 ? 3 :
          geeArea < 8000 ? 4 :
            geeArea < 20000 ? 5 : 7

      const [aves, mammalia, gaps, papers, wdpa, ndvi, forestLoss, gee, worldBank] = await Promise.all([
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
        queryForestLoss(drawnPolygon).catch(() => null),
        queryGEE(drawnPolygon, geeCellSize, geeArea).catch(e => { console.error('🔴 GEE error:', e); return null }),
        queryWorldBankBiodiversity(country).catch(() => null),
      ])

      // Per-taxon point-in-polygon refinement.
      const taxaInPolygon = dynamicTaxa.map((taxon, i) => {
        const results = taxaOccurrences[i]?.results ?? []
        const inside = results.filter(occ =>
          occ.lat != null && occ.lng != null &&
          pointInPolygon([occ.lat, occ.lng], polygon)
        )
        const issueFiltered = (taxaOccurrences[i]?.results?.length ?? 0) - results.length
        if (issueFiltered > 0) console.log(`🔍 ${taxon.name}: ${issueFiltered} records excluded by issue filters`)
        return {
          ...taxon,
          total: taxaOccurrences[i]?.total ?? 0,
          sampleSize: results.length,
          inPolygon: inside.length,
          records: inside,
        }
      })

      // Chao1 species richness estimator
      const allRecordsInPolygon = taxaInPolygon.flatMap(t => t.records ?? [])
      const speciesCounts = {}
      allRecordsInPolygon.forEach(r => {
        const sp = r.scientificName ?? 'unknown'
        speciesCounts[sp] = (speciesCounts[sp] ?? 0) + 1
      })
      const sObs = Object.keys(speciesCounts).length
      const n1 = Object.values(speciesCounts).filter(c => c === 1).length // singletons
      const n2 = Object.values(speciesCounts).filter(c => c === 2).length // doubletons
      const chao1 = n2 > 0
        ? Math.round(sObs + (n1 * n1) / (2 * n2))
        : n1 > 0 ? Math.round(sObs + (n1 * (n1 - 1)) / 2) : sObs
      const samplingCompleteness = chao1 > 0 ? Math.round((sObs / chao1) * 100) : 100

      console.log(`🔬 Chao1: ${chao1} estimated species (${sObs} observed, ${samplingCompleteness}% completeness)`)

      const totalInPolygon = taxaInPolygon.reduce((s, t) => s + t.inPolygon, 0)

      // Buffer zone analysis (5km indirect influence area)
      let bufferData = null
      try {
        const turfPolygon = turf.polygon([[...polygon.map(p => [p[1], p[0]]), [polygon[0][1], polygon[0][0]]]])
        const buffered = turf.buffer(turfPolygon, 5, { units: 'kilometers' })
        const bufferCoords = buffered.geometry.coordinates[0].map(c => [c[1], c[0]])

        const inBuffer = dynamicTaxa.map((taxon, i) => {
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
      addLog(`${totalInPolygon.toLocaleString('en-US')} occurrence records retrieved`, 'done')
      addLog(`Filtering records within project boundary...`, 'loading')
      await delay(600)

      setScanProgress(4)
      addLog(`Records filtered within project boundary`, 'done')
      addLog(`Querying satellite data (GEE)`, 'loading')
      addLog(`Calculating risk score...`, 'loading')
      await delay(500)

      const riskScore = calculateRiskScore({
        taxaInPolygon,
        papers: papers?.total ?? 0,
        mode: MODE,
      })

      setScanProgress(5)
      addLog(`Risk Score: ${riskScore?.score ?? '—'}/100 · ${riskScore?.category ?? ''}`, 'done')
      addLog(`Protected areas checked`, 'done')
      addLog(`Analysis complete ✅`, 'done')
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

      console.log('🌍 GEE result before setScanResults:', gee)
      addLog(`Satellite analysis complete · NDVI ${gee?.ndvi?.toFixed(3) ?? '—'}`, 'done')
      addLog(`GEE datasets computed · ${gee?.features?.length ?? 0} hex cells`, 'done')
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
        forestLoss: forestLoss,
        gee: gee,
        basisCount: basisCount,
        chao1: { estimated: chao1, observed: sObs, completeness: samplingCompleteness, singletons: n1, doubletons: n2 },
        worldBank: worldBank,
      })

      const scanDuration = Math.round((Date.now() - scanStartTime) / 1000)
      setScanDuration(scanDuration)
      setAnalysisStep(3)
    } catch (e) {
      console.error('Scan failed:', e)
    } finally {
      setScanning(false)
      setScanStepLabel('')
    }
  }

  function generateAnalysisId(country) {
    const date = new Date().toISOString().slice(0, 10)
    const random = Math.random().toString(36).slice(2, 10).toUpperCase()
    return `BioRisk-${country}-${date}-${random}`
  }

  function viewDashboardFromScan() {

    if (!scanResults) return
    console.log('📊 scanResults.gee:', scanResults?.gee?.features?.length)

    // Save project to list
    const newProject = {
      id: Date.now(),
      name: analysisProject.name,
      country: analysisProject.country,
      sector: analysisProject.sector,
      phase: analysisProject.phase,
      frameworks: analysisProject.frameworks,
      investment: analysisProject.investment,
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
        // Crear gbifData reducido para Supabase (sin registros individuales)
        const gbifDataForStorage = {
          ndvi: newProject.gbifData?.ndvi,
          gee: newProject.gbifData?.gee ? {
            summary: newProject.gbifData.gee.summary,
            ndvi: newProject.gbifData.gee.ndvi,
            msavi: newProject.gbifData.gee.msavi,
            lossYear: newProject.gbifData.gee.lossYear,
            landcover: newProject.gbifData.gee.landcover,
            water: newProject.gbifData.gee.water,
            fire: newProject.gbifData.gee.fire,
            iucnHabitat: newProject.gbifData.gee.iucnHabitat,
            features: newProject.gbifData.gee.features,
          } : null,
          wdpa: newProject.gbifData?.wdpa,
          riskScore: newProject.gbifData?.riskScore,
          chao1: newProject.gbifData?.chao1,
          forestLoss: newProject.gbifData?.forestLoss,
          worldBank: newProject.gbifData?.worldBank,
          polygonCount: newProject.gbifData?.polygonCount,
          taxaInPolygon: newProject.gbifData?.taxaInPolygon?.map(t => ({
            name: t.name,
            abbr: t.abbr,
            inPolygon: t.inPolygon,
            records: (t.records ?? []).map(r => ({
              lat: r.lat,
              lng: r.lng,
              scientificName: r.scientificName,
              key: r.key,
              eventDate: r.eventDate,
            })),
          })),
          queriedAt: newProject.gbifData?.queriedAt,
          analysisId: newProject.gbifData?.analysisId,
        }
        client.from('projects').insert({
          user_id: user.sub,
          name: newProject.name,
          country: newProject.country,
          sector: newProject.sector,
          phase: newProject.phase,
          frameworks: newProject.frameworks,
          investment: newProject.investment,
          risk_score: newProject.riskScore,
          total_in_polygon: newProject.totalInPolygon,
          polygon: newProject.polygon,
          gbif_data: gbifDataForStorage,
          analysis_id: newProject.analysisId,
        }).then(({ error }) => {
          if (error) console.warn('Failed to save project to Supabase:', error.message)
          else console.log('✅ Project saved to Supabase')
        })
      })
    }

    // Update gbifData with real scan results
    const allRecords = scanResults.taxaInPolygon?.flatMap(t => t.records) ?? []
    const analysisId = generateAnalysisId(scanResults.country ?? 'XX')

    console.log('🌳 Forest Loss:', scanResults.forestLoss)
    setGbifData({
      avesCount: scanResults.aves,
      mammaliaCount: scanResults.mammalia,
      gaps: scanResults.gaps,
      whales: {
        total: scanResults.totalInPolygon,
        results: allRecords,
      },
      analysisId: analysisId,
      papers: scanResults.papers,
      gee: scanResults.gee,
      bufferData: scanResults.bufferData,
      riskScore: scanResults.riskScore,
      taxaInPolygon: scanResults.taxaInPolygon,
      allTaxaRecords: scanResults.taxaInPolygon,
      polygonCount: scanResults.totalInPolygon ?? 0,
      polygonSample: 300,
      wdpa: scanResults.wdpa,
      queriedAt: new Date(),
      ndvi: scanResults.ndvi,
      forestLoss: scanResults.forestLoss,
      chao1: scanResults.chao1,
      basisCount: scanResults.basisCount,
      worldBank: scanResults.worldBank,

    })
    console.log('📊 gbifData.gee after setGbifData:', scanResults.gee?.features?.length)


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
          .select('id, name, country, sector, phase, frameworks, investment, risk_score, total_in_polygon, polygon, date, analysis_id')
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
            phase: p.phase,
            frameworks: p.frameworks,
            investment: p.investment,
            riskScore: p.risk_score,
            totalInPolygon: p.total_in_polygon,
            polygon: p.polygon,
            date: new Date(p.date).toLocaleDateString('en-US'),
          })))
        }
      } catch (e) {
        console.warn('Failed to load projects:', e.message)
      }
    }
    loadProjects()
  }, [user])

  function exportJSON(data, project, name) {
    if (!data?.riskScore) {
      alert('Please run an analysis first before exporting.')
      return
    }
    const output = {
      analysisId: data.analysisId,
      generatedAt: new Date().toISOString(),
      project: {
        name: name,
        country: project?.country,
        sector: project?.sector,
      },
      riskScore: data.riskScore,
      biodiversity: {
        totalRecords: data.polygonCount,
        taxaDetected: data.taxaInPolygon?.filter(t => t.inPolygon > 0).length,
        chao1: data.chao1,
        basisCount: data.basisCount,
        taxaInPolygon: data.taxaInPolygon?.map(t => ({
          name: t.name,
          group: t.group,
          recordsInPolygon: t.inPolygon,
          totalInCountry: t.total,
        })),
      },
      vegetation: {
        ndviMean: data.ndvi?.mean,
        ndviTrend: data.ndvi?.trend,
        interpretation: data.ndvi?.interpretation,
      },
      protectedAreas: {
        intersecting: data.wdpa?.intersectingCount,
        areas: data.wdpa?.areas?.map(a => ({
          name: a.name,
          iucnCategory: a.iucnCategory,
          intersects: data.wdpa?.intersecting?.some(i => i.name === a.name),
        })),
      },
      forestLoss: data.forestLoss,
      bufferZone: {
        radiusKm: data.bufferData?.bufferKm,
        recordsInBuffer: data.bufferData?.totalInBuffer,
      },
      dataSource: 'GBIF.org · Sentinel-2 Copernicus · WDPA Protected Planet · Global Forest Watch',
      methodology: 'https://github.com/marcosdzarate/biorisk-ai',
    }

    const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.analysisId ?? 'biorisk-analysis'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportCSV(data, project, name) {
    if (!data?.riskScore) {
      alert('Please run an analysis first before exporting.')
      return
    }
    const rows = [
      ['Analysis ID', data.analysisId ?? 'N/A'],
      ['Generated At', new Date().toISOString()],
      ['Project Name', name],
      ['Country', project?.country],
      ['Sector', project?.sector],
      ['Risk Score', data.riskScore?.score],
      ['Risk Category', data.riskScore?.category],
      ['Total Records in Polygon', data.polygonCount],
      ['Taxa Detected', data.taxaInPolygon?.filter(t => t.inPolygon > 0).length],
      ['Chao1 Estimated Species', data.chao1?.estimated],
      ['Sampling Completeness %', data.chao1?.completeness],
      ['NDVI Mean', data.ndvi?.mean],
      ['NDVI Trend', data.ndvi?.trend],
      ['Protected Areas Intersecting', data.wdpa?.intersectingCount],
      ['Forest Loss Total (ha)', data.forestLoss?.totalLoss],
      ['Forest Loss Trend', data.forestLoss?.trend],
      ['Buffer Zone Records (5km)', data.bufferData?.totalInBuffer],
      [],
      ['Taxa Breakdown'],
      ['Taxon', 'Group', 'Records in Polygon', 'Total in Country'],
      ...(data.taxaInPolygon?.filter(t => t.inPolygon > 0).map(t => [
        t.name, t.group, t.inPolygon, t.total
      ]) ?? []),
    ]

    const csv = rows.map(row => row.map(cell => `"${cell ?? ''}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.analysisId ?? 'biorisk-analysis'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }



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
    // Analysis ID
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...gray)
    doc.text(`Analysis Reference ID: ${data?.analysisId ?? 'N/A'}`, margin, y)
    y += 8

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


    // ─── IFC PS6 Critical Habitat Assessment ───
    if (project?.frameworks?.includes('IFC PS6 / Equator Principles')) {
      if (y > 220) { doc.addPage(); y = 20 }

      section('IFC PS6 Critical Habitat Assessment')

      // Determine habitat classification
      const threatenedSpecies = data.taxaInPolygon
        ?.flatMap(t => t.records ?? [])
        ?.filter(r => ['CR', 'EN'].includes(r.iucnRedListCategory)) ?? []

      const hasWdpaOverlap = (data.wdpa?.intersectingCount ?? 0) > 0
      const hasRamsar = data.wdpa?.intersecting?.some(a =>
        a.name?.toLowerCase().includes('ramsar') ||
        a.designation?.toLowerCase().includes('ramsar') ||
        a.iucnCategory === 'Ramsar'
      )
      const hasCriticalSpecies = threatenedSpecies.length > 0
      const ndviMean = data.ndvi?.mean ?? 0

      const isCritical = hasCriticalSpecies || hasWdpaOverlap || hasRamsar
      const isNatural = !isCritical && ndviMean > 0.1
      const habitatClass = isCritical ? 'CRITICAL HABITAT' : isNatural ? 'NATURAL HABITAT' : 'MODIFIED HABITAT'
      const habitatColor = isCritical ? red : isNatural ? green : orange

      // Habitat classification box
      doc.setFillColor(...(isCritical ? [254, 242, 242] : isNatural ? [240, 253, 244] : [255, 251, 235]))
      doc.roundedRect(margin, y, W - margin * 2, 16, 3, 3, 'F')
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...habitatColor)
      doc.text(habitatClass, margin + 8, y + 10)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...gray)
      doc.text(`IFC PS6 / GN6 Classification · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`, W - margin, y + 10, { align: 'right' })
      y += 22

      // Triggers
      const triggers = [
        { label: 'CR/EN species detected', triggered: hasCriticalSpecies, value: hasCriticalSpecies ? `${threatenedSpecies.length} records` : 'None detected' },
        { label: 'Protected area overlap (WDPA)', triggered: hasWdpaOverlap, value: hasWdpaOverlap ? `${data.wdpa.intersectingCount} area(s)` : 'No overlap' },
        { label: 'Ramsar / internationally recognized area', triggered: !!hasRamsar, value: hasRamsar ? 'Detected' : 'Not detected' },
        { label: 'Declining vegetation trend', triggered: data.ndvi?.trend === 'Declining', value: data.ndvi?.trend ?? 'N/A' },
        { label: 'Estimated species richness (Chao1)', triggered: false, value: data.chao1?.estimated ? `${data.chao1.estimated} species` : 'N/A' },
      ]

      triggers.forEach((t, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(...light)
          doc.rect(margin, y - 2, W - margin * 2, 6, 'F')
        }
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...gray)
        doc.text(t.label, margin + 4, y + 2)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...(t.triggered ? red : green))
        doc.text(t.triggered ? '! TRIGGERED' : 'Clear', margin + 110, y + 2)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...navy)
        doc.text(t.value, margin + 148, y + 2)
        y += 6
      })
      y += 4

      // Obligations
      if (isCritical) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...red)
        doc.text('IFC PS6 Critical Habitat Obligations Triggered:', margin + 4, y)
        y += 6
        const obligations = [
          'Net Positive Impact (NPI) on biodiversity required over project lifetime',
          'Biodiversity Action Plan (BAP) required prior to financing',
          'No-go zones must be defined for CR/EN species habitats',
          'Independent biodiversity specialist required for ESIA',
        ]
        obligations.forEach(ob => {
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...gray)
          doc.text(`• ${ob}`, margin + 6, y)
          y += 5
        })
      }
      y += 6
    }

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

    // ─── TNFD Content Index ───
    if (y > 220) { doc.addPage(); y = 20 }

    section('TNFD Content Index')

    const tnfdIndex = [
      { disclosure: 'Strategy A', pillar: 'Strategy', description: 'Nature-related risks and opportunities', available: data.riskScore != null, source: 'Risk Score' },
      { disclosure: 'Strategy B', pillar: 'Strategy', description: 'Effects on business model', available: data.riskScore != null, source: 'Financial Materiality' },
      { disclosure: 'Strategy D', pillar: 'Strategy', description: 'Sites in/near biodiversity-sensitive areas', available: data.wdpa != null, source: 'WDPA · KBA (planned)' },
      { disclosure: 'Metrics A', pillar: 'Metrics', description: 'Nature-related risk metrics', available: data.riskScore != null, source: 'Risk Score · NDVI' },
      { disclosure: 'Metrics B', pillar: 'Metrics', description: 'Nature-related opportunity metrics', available: data.taxaInPolygon != null, source: 'GBIF occurrence data' },
      { disclosure: 'B8', pillar: 'Metrics', description: 'Area of sites in protected/conservation areas', available: data.wdpa != null, source: 'WDPA' },
      { disclosure: 'B15', pillar: 'Metrics', description: 'Species affected by infrastructure', available: data.taxaInPolygon != null, source: 'GBIF · dynamicTaxa' },
      { disclosure: 'B16', pillar: 'Metrics', description: 'Migratory species in area', available: data.taxaInPolygon != null, source: 'GBIF occurrence data' },
      { disclosure: 'E3', pillar: 'Metrics', description: 'Land/freshwater/ocean use change', available: data.forestLoss != null, source: 'Global Forest Watch' },
      { disclosure: 'E4', pillar: 'Metrics', description: 'Ecosystem health (NDVI)', available: data.ndvi != null, source: 'Sentinel-2' },
    ]

    // Table header
    doc.setFillColor(...navy)
    doc.rect(margin, y, W - margin * 2, 6, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('Disclosure', margin + 2, y + 4)
    doc.text('Pillar', margin + 28, y + 4)
    doc.text('Description', margin + 52, y + 4)
    doc.text('Status', margin + 130, y + 4)
    doc.text('Data Source', margin + 148, y + 4)
    y += 8

    tnfdIndex.forEach((item, i) => {
      if (y > 270) { doc.addPage(); y = 20 }
      if (i % 2 === 0) {
        doc.setFillColor(...light)
        doc.rect(margin, y - 3, W - margin * 2, 6, 'F')
      }
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...navy)
      doc.text(item.disclosure, margin + 2, y + 1)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...gray)
      doc.text(item.pillar, margin + 28, y + 1)
      const descLines = doc.splitTextToSize(item.description, 75)
      doc.text(descLines[0], margin + 52, y + 1)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...(item.available ? green : orange))
      doc.text(item.available ? 'Available' : 'Partial', margin + 130, y + 1)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...gray)
      const srcLines = doc.splitTextToSize(item.source, 45)
      doc.text(srcLines[0], margin + 148, y + 1)
      y += 6
    })

    y += 6

    // CSRD note
    doc.setFontSize(7)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...gray)
    doc.text('All 14 TNFD recommended disclosures are reflected in CSRD ESRS E4 (Directive 2022/2464).', margin + 4, y)
    y += 10

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
  const isReports = page === 'reports'
  return (
    <>
      <ProductTour
        steps={tourSteps}
        currentStep={tourRun ? tourStep : -1}
        onNext={() => setTourStep(s => s + 1)}
        onPrev={() => setTourStep(s => s - 1)}
        onClose={() => { setTourRun(false); setTourStep(0) }}
        lang={lang}
      />
      <style>{CSS}</style>

      {/* Auth0 loading */}
      {isLoading && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999,
        }}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>BioRisk AI</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>Loading...</div>
          </div>
        </div>
      )}

      {/* Login screen */}
      {!isLoading && !isAuthenticated && (
        <div style={{ position: 'fixed', inset: 0, background: '#020408', zIndex: 99999, overflow: 'hidden' }}>

          <GlobeBackground />

          {/* Vignette */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
            background: 'radial-gradient(ellipse at center, transparent 30%, rgba(2,4,8,0.5) 70%, rgba(2,4,8,0.85) 100%)',
          }} />


          {/* Hero text left */}
          <div style={{
            position: 'absolute',
            top: 0, bottom: 0, left: '3%',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            zIndex: 10,
            maxWidth: 480,
            animation: 'fadeUp 1.2s ease 0.6s both',
          }}>


            <h1 style={{
              fontSize: 'clamp(32px, 4.5vw, 54px)',
              fontWeight: 900, lineHeight: 1.05,
              letterSpacing: '-0.03em', marginBottom: 12,
              background: 'linear-gradient(135deg, #f4f4f6 0%, rgba(244,244,246,0.6) 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Biodiversity<br />Risk Intelligence<br />for LAC
            </h1>

            <p style={{ fontSize: 14, color: '#6b6b7a', lineHeight: 1.7, marginBottom: 16, fontWeight: 300, maxWidth: 380 }}>
              Turn <strong style={{ color: '#a1a1b2', fontWeight: 400 }}>2.84 billion GBIF occurrence records</strong> into actionable ESG insights —
              TNFD, CSRD and IFC PS6 aligned. In minutes, not months.
            </p>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
              {[
                { val: '40%', lbl: 'World species in LAC' },
                { val: '16', lbl: 'Countries covered' },
                { val: '$17.7T', lbl: 'AUM under TNFD' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'stretch', gap: 24 }}>
                  {i > 0 && <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />}
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#f4f4f6', letterSpacing: '-0.02em' }}>{s.val}</div>
                    <div style={{ fontSize: 9, color: '#4a4a5a', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{s.lbl}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sign in button */}
            <button
              onClick={() => loginWithRedirect()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '13px 24px',
                width: 'fit-content',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#f4f4f6',
                cursor: 'pointer', letterSpacing: '0.01em',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(124,58,237,0.15)'
                e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'
                e.currentTarget.style.boxShadow = '0 0 24px rgba(124,58,237,0.2)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              Sign in to BioRisk AI
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, flexShrink: 0,
              }}>→</div>
            </button>
          </div>

          {/* Case study badge bottom right */}
          <div style={{
            position: 'absolute', bottom: 36, right: 40, zIndex: 10,
            background: 'rgba(8,10,16,0.75)', backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12, padding: '14px 18px',
            animation: 'fadeUp 1s ease 1.4s both', maxWidth: 220,
          }}>
            <div style={{
              fontSize: 9, color: '#ec4899', textTransform: 'uppercase',
              letterSpacing: '0.1em', marginBottom: 6, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%', background: '#ec4899',
                animation: 'pulseDot 1.5s ease-in-out infinite',
              }} />
              Live case study
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f4f4f6', marginBottom: 4 }}>Litio Galán, Catamarca</div>
            <div style={{ fontSize: 10, color: '#6b6b7a', lineHeight: 1.5 }}>USD 1.5B · Mining · Phoenicoparrus andinus (EN) detected</div>
          </div>

          {/* Powered by bottom left */}
          <div style={{
            position: 'absolute', bottom: 36, left: 40, zIndex: 10,
            fontSize: 10, color: '#3a3a4a', letterSpacing: '0.04em',
            animation: 'fadeUp 1s ease 1.6s both',
          }}>
            Powered by <span style={{ color: '#22c55e' }}>GBIF</span> · Sentinel-2 · AWS Athena · GEE
          </div>

        </div>
      )}

      <div
        className="app"
        style={{
          gridTemplateColumns: isWizard
            ? (sidebarCollapsed ? '56px 1fr' : '220px 1fr')
            : copilotCollapsed
              ? (sidebarCollapsed ? '56px 1fr' : '220px 1fr')
              : (sidebarCollapsed ? '56px 1fr 340px' : '220px 1fr 340px'),
        }}
      >
        <Sidebar
          theme={theme}
          setTheme={setTheme}
          activePage={activePage}
          setActivePage={handleNav}
          user={user}
          logout={logout}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(p => !p)}
          lang={lang}
          setLang={setLang}
          t={t}
        />
        {isWizard ? (
          <NewAnalysisPage
            loadCountryTaxa={loadCountryTaxa}
            scanLogs={scanLogs}
            loadingTaxa={loadingTaxa}
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
            t={t}
            lang={lang}
            scanDuration={scanDuration}
          />
        ) : isWelcome ? (
          <WelcomePage
            onStart={() => { setPage('new-analysis'); setActivePage('new') }}
            t={t}
            lang={lang}
          />
        ) : isProjects ? (
          <ProjectsPage
            projects={projects}
            onSelectProject={async (project) => {
              // Cargar gbif_data desde Supabase primero
              let gbifData = project.gbifData
              if (!gbifData) {
                try {
                  const claims = await getIdTokenClaims()
                  const token = claims?.__raw
                  const client = getSupabaseWithAuth(token)
                  const { data } = await client
                    .from('projects')
                    .select('gbif_data')
                    .eq('id', project.id)
                    .single()
                  gbifData = data?.gbif_data ?? null
                } catch (e) {
                  console.warn('Failed to load gbif_data:', e.message)
                }
              }

              setGbifData(gbifData)
              setShowDemoBanner(false)
              setProjectName(project.name)
              setActivePolygon(project.polygon)
              setAnalysisProject({
                name: project.name,
                country: project.country,
                sector: project.sector,
                phase: project.phase ?? '',
                frameworks: project.frameworks ?? [],
                investment: project.investment ?? '',
              })
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

              // Re-query Athena en background para recuperar puntos del mapa
              setTimeout(async () => {
                if (project.polygon?.length >= 3 && project.country) {
                  try {
                    const bbox = getBoundingBox(project.polygon)
                    const bboxTaxa = await queryTaxaInBbox(project.country, bbox).catch(() => null)
                    const taxaToQuery = bboxTaxa ?? (project.gbifData?.taxaInPolygon?.map(t => t.name) ?? [])

                    if (taxaToQuery.length > 0) {
                      const athenaRecords = await queryGbifAthena({
                        minLat: bbox.minLat,
                        maxLat: bbox.maxLat,
                        minLng: bbox.minLng,
                        maxLng: bbox.maxLng,
                        countryCode: project.country,
                        taxa: taxaToQuery,
                      }).catch(() => null)

                      if (athenaRecords?.length > 0) {
                        const turfPolygon = turf.polygon([[
                          ...project.polygon.map(p => [p[1], p[0]]),
                          [project.polygon[0][1], project.polygon[0][0]]
                        ]])

                        const byClass = {}
                        athenaRecords.forEach(r => {
                          const lat = parseFloat(r.decimallatitude)
                          const lng = parseFloat(r.decimallongitude)
                          if (isNaN(lat) || isNaN(lng)) return
                          try {
                            if (!turf.booleanPointInPolygon(turf.point([lng, lat]), turfPolygon)) return
                          } catch (e) { return }
                          const cls = r.class
                          if (!byClass[cls]) byClass[cls] = []
                          byClass[cls].push({
                            scientificName: r.scientificname,
                            lat, lng,
                            eventDate: r.year ? `${r.year}-${String(r.month).padStart(2, '0')}-${String(r.day).padStart(2, '0')}` : null,
                            key: r.gbifid,
                            basisOfRecord: r.basisofrecord,
                            specieskey: r.specieskey,
                            iucnRedListCategory: null,
                          })
                        })

                        setGbifData(prev => ({
                          ...prev,
                          allTaxaRecords: prev?.taxaInPolygon?.map(t => ({
                            ...t,
                            records: byClass[t.name] ?? [],
                          })) ?? [],
                        }))

                        // Enriquecer con IUCN en background
                        const speciesKeysFromAthena = [...new Set(athenaRecords.map(r => r.specieskey).filter(Boolean))]
                        queryIucnStatus(speciesKeysFromAthena).then(iucnMap => {
                          if (Object.keys(iucnMap).length === 0) return
                          setGbifData(prev => {
                            if (!prev) return prev
                            return {
                              ...prev,
                              allTaxaRecords: prev.allTaxaRecords?.map(taxon => ({
                                ...taxon,
                                records: (taxon.records ?? []).map(r => ({
                                  ...r,
                                  iucnRedListCategory: r.specieskey && iucnMap[r.specieskey]
                                    ? iucnMap[r.specieskey]
                                    : r.iucnRedListCategory,
                                }))
                              }))
                            }
                          })
                        }).catch(() => { })
                      }
                    }
                  } catch (e) {
                    console.warn('Background Athena re-query failed:', e.message)
                  }
                }
              }, 100)
            }}
            onNewAnalysis={() => { setPage('new-analysis'); setActivePage('new') }}
            t={t}
            lang={lang}
          />
        ) : isSpecies ? (
          <SpeciesExplorerPage />
        ) : isMonitoring ? (
          <MonitoringPage />
        ) : isReports ? (
          <ReportsPage projects={projects} t={t} lang={lang} exportReport={exportReport} />
        ) : isSources ? (
          <DataSourcesPage t={t} lang={lang} />
        ) : (
          <>
            <main className="main">
              <div className="header">
                <div className="h-left">
                  <h1>{t('dashboard.title')}</h1>
                  <div className="h-sub">{projectName}</div>
                </div>
                <div className="h-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setTourRun(true); setTourStep(0) }}
                  >
                    {lang === 'es' ? '🗺 Tour' : '🗺 Take a tour'}
                  </Button>
                  <span className="badge">
                    {gbifData?.queriedAt
                      ? new Date(gbifData.queriedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    }
                  </span>

                  <Button variant="glow" size="sm" onClick={() => exportReport(gbifData, analysisProject, projectName)}>
                    {t('btn.export_report')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => exportJSON(gbifData, analysisProject, projectName)}>
                    {t('btn.export_json')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => exportCSV(gbifData, analysisProject, projectName)}>
                    {t('btn.export_csv')}
                  </Button>
                  <span
                    className="badge"
                    style={
                      dataSource === 'athena'
                        ? { background: 'var(--green-pale)', color: 'var(--green)', borderColor: '#BBF7D0', fontWeight: 600 }
                        : { background: 'var(--bg)', color: 'var(--text2)', fontWeight: 600 }
                    }
                    title={dataSource === 'athena' ? 'GBIF S3 Snapshot via AWS Athena' : 'GBIF REST API fallback'}
                  >
                    {dataSource === 'athena' ? 'GBIF S3 · Athena' : dataSource === 'rest' ? 'GBIF REST API' : '—'}
                  </span>
                </div>
              </div>

              {showDemoBanner && (
                <div className="demo-banner" style={{ margin: '0 0 18px' }}>
                  <span className="demo-banner-icon">''</span>
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



              {/* Tab navigation */}
              <div style={{
                display: 'flex', gap: 4, padding: '0 24px 16px',
                borderBottom: '1px solid #E5E7EB', marginBottom: 20,
              }}>
                {[
                  { id: 'overview', label: t('dashboard.overview') },
                  { id: 'biodiversity', label: t('dashboard.biodiversity') },
                  { id: 'tnfd', label: t('dashboard.tnfd') },
                  { id: 'vegetation', label: t('dashboard.vegetation') },
                  { id: 'mitigation', label: t('dashboard.mitigation') },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDashboardTab(tab.id)}
                    style={{
                      padding: '8px 16px', borderRadius: 8, fontSize: 12,
                      fontWeight: 600, border: '1px solid var(--bd)',
                      cursor: 'pointer', transition: 'all .15s',
                      background: dashboardTab === tab.id ? '#18A957' : 'var(--card)',
                      color: dashboardTab === tab.id ? 'white' : 'var(--text2)',
                      borderColor: dashboardTab === tab.id ? '#18A957' : 'var(--bd)',
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
                    {void console.log('🗺 gbifData.gee:', gbifData?.gee?.features?.length)}
                    <MapCard
                      polygon={activePolygon}
                      center={mapCenter}
                      zoom={mapZoom}
                      allTaxaRecords={gbifData?.allTaxaRecords}
                      fullWidth={true}
                      ndviData={gbifData?.ndvi}
                      wdpaData={gbifData?.wdpa}
                      bufferData={gbifData?.bufferData}
                      geeFeatures={gbifData?.gee?.features}
                      lang={lang}
                    />
                    {/* Risk Score overlay queda en el mapa - no lo tocamos */}
                    <div style={{
                      position: 'absolute', bottom: 12, right: 12, zIndex: 1000,
                      background: 'var(--card)', borderRadius: 12,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      border: '1px solid var(--bd)',
                      padding: '16px 20px', minWidth: 160, textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {t('overview.risk_score')}
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
                        {gbifData?.riskScore?.category ?? t('overview.no_analysis')}
                      </div>
                      {gbifData?.riskScore && (
                        <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 6, lineHeight: 1.4 }}>
                          {gbifData.polygonCount?.toLocaleString('en-US')} {t('overview.records')}<br />
                          {gbifData.riskScore.taxaFound} {t('overview.taxa_detected')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* GBIF Data Intelligence */}
                  <GbifDataIntelligenceCard data={gbifData} />

                  {/* Key Findings +  Financial Materiality */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <KeyFindingsCard
                      data={gbifData}
                      loading={loading}
                      key={gbifData?.allTaxaRecords?.flatMap(t => t.records ?? []).filter(r => r.iucnRedListCategory).length ?? 0}
                    />
                    <FinancialMaterialityCard data={gbifData} analysisProject={analysisProject} />
                  </div>

                  {gbifData?.bufferData && (
                    <div style={{
                      background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)',
                      borderRadius: 10, padding: '12px 16px', marginBottom: 18,
                      display: 'flex', alignItems: 'center', gap: 16,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#f97316', marginBottom: 2 }}>
                          {t('overview.buffer_title')}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                          {gbifData.bufferData.totalInBuffer.toLocaleString('en-US')} {t('overview.buffer_desc')}

                        </div>
                      </div>
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#f97316' }}>
                          {gbifData.bufferData.totalInBuffer.toLocaleString('en-US')}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text3)' }}>{t('overview.records_in_buffer')}</div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* BIODIVERSITY TAB */}
              {dashboardTab === 'biodiversity' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
                    <SpeciesRichnessCard data={gbifData} loading={loading} />
                    <KeyIndicatorSpeciesCard data={gbifData} />
                    <ThreatenedSpeciesCard data={gbifData} loading={loading} />
                  </div>

                  <TemporalBaselineCard data={gbifData} />

                  <div className="grid row-3">
                    <BiodiversityMatrixCard data={gbifData} />
                  </div>
                </>
              )}

              {/* TNFD & ESG TAB */}
              {dashboardTab === 'tnfd' && (
                <>
                  {/* Fila 1: TNFD + Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
                    <TnfdCard data={gbifData} analysisProject={analysisProject} />
                    <TnfdMetricsCard data={gbifData} analysisProject={analysisProject} />
                  </div>

                  {/* Fila 2: Dependencies + Impacts + Ecosystem Services */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18, marginBottom: 18 }}>
                    <DependenciesCard data={gbifData} analysisProject={analysisProject} />
                    <ImpactsCard data={gbifData} analysisProject={analysisProject} />
                    <EcosystemServicesCard data={gbifData} polygon={activePolygon} />
                  </div>

                  {/* Fila 3: World Bank */}
                  <WorldBankCard data={gbifData} />
                </>
              )}
              {/* VEGETATION & FOREST TAB */}
              {dashboardTab === 'vegetation' && (
                <>
                  <div className="grid row-2">
                    <EcosystemSensitivityCard data={gbifData} />
                    <LandcoverCard data={gbifData} polygon={activePolygon} />
                    <ScenarioAnalysisCard data={gbifData} />
                  </div>
                  <ForestLossCard data={gbifData} />
                </>
              )}

              {/* MITIGATION TAB */}
              {dashboardTab === 'mitigation' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 12 }}>
                  <RiskScoreCard riskScore={gbifData?.riskScore} />
                  <HumanPressureCard data={gbifData} analysisProject={analysisProject} />
                  <DependenciesCard data={gbifData} analysisProject={analysisProject} />
                  <ImpactsCard data={gbifData} analysisProject={analysisProject} />
                </div>
              )}
              {/* Footer */}
              <div style={{
                padding: '12px 24px',
                borderTop: '1px solid #E5E7EB',
                fontSize: 10, color: 'var(--text3)',
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

              {/* Executive Summary Modal */}
              {showExecSummary && (
                <div style={{
                  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                  zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 24,
                }} onClick={() => setShowExecSummary(false)}>
                  <div style={{
                    background: 'var(--card)', border: '1px solid var(--bd)',
                    borderRadius: 12, padding: 24, maxWidth: 600, width: '100%',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                  }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Executive Summary</div>
                      <button onClick={() => setShowExecSummary(false)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 18, color: 'var(--text3)',
                      }}>×</button>
                    </div>
                    {execSummaryLoading ? (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)' }}>
                        Generating summary...
                      </div>
                    ) : (
                      <>
                        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 16 }}>
                          {execSummaryText}
                        </p>
                        <button
                          onClick={() => navigator.clipboard.writeText(execSummaryText)}
                          style={{
                            padding: '8px 16px', background: 'var(--green)', color: 'white',
                            border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Copy to clipboard
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </main>


            <>
              {!copilotCollapsed && (
                <CopilotPanel
                  key={copilotKey}
                  gbifData={gbifData}
                  analysisProject={analysisProject}
                />
              )}
              <Button
                variant="solid"
                size="sm"
                onClick={() => setCopilotCollapsed(p => !p)}
                style={{
                  position: 'fixed', bottom: 24, right: copilotCollapsed ? 16 : 316,
                  zIndex: 1000, transition: 'right 0.2s ease',
                }}
              >
                {copilotCollapsed ? t('btn.show_copilot') : t('btn.hide_copilot')}
              </Button>
            </>
          </>
        )}
      </div >
    </>
  )
}


