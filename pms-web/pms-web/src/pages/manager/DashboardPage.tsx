import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CloudSun,
  DoorOpen,
  LoaderCircle,
  MapPin,
  Moon,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sun,
  Users,
  Wrench,
  X,
} from "lucide-react";

import { apiRequest } from "../../services/api";

const styles = `
  @import url("https://fonts.googleapis.com/css2?family=Edu+QLD+Hand&family=Kulim+Park:wght@300;400;500;600;700&display=swap");

  .manager-dashboard {
    width: 100%;
    min-height: 100vh;
    box-sizing: border-box;
    padding: 2rem;
    background:
      radial-gradient(circle at 12% 10%, rgba(255, 255, 255, 0.9) 0%, transparent 34%),
      linear-gradient(135deg, #fffdf7 0%, #f4f8fc 48%, #eaf3fb 100%);
    color: #163b66;
  }

  .manager-dashboard__greeting {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    width: fit-content;
    margin: 0;
    padding: 0.2rem 0;
    text-align: left;
    font-family: "Kulim Park", sans-serif;
    font-size: clamp(1.15rem, 2vw, 1.5rem);
    font-weight: 500;
    letter-spacing: -0.015em;
    line-height: 1.3;
    color: #2369a8;
  }

  .manager-dashboard__greeting-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    flex: 0 0 2rem;
    border-radius: 50%;
    background: #e8f2fc;
    color: #2369a8;
  }

  .manager-dashboard__greeting-icon svg {
    width: 1rem;
    height: 1rem;
    stroke-width: 1.8;
  }

  .manager-dashboard__greeting-text {
    display: inline-block;
    overflow: hidden;
    white-space: nowrap;
    border-right: 2px solid #4b8bc4;
    width: 0;
    animation:
      manager-dashboard-type 1.4s steps(16, end) forwards,
      manager-dashboard-caret 0.75s step-end 4;
  }

  @keyframes manager-dashboard-type {
    from { width: 0; }
    to { width: 16ch; }
  }

  @keyframes manager-dashboard-caret {
    0%, 100% { border-color: transparent; }
    50% { border-color: #4b8bc4; }
  }

  .manager-dashboard__portfolio-title {
    display: block;
    width: 100%;
    margin: 3.25rem 0 0;
    text-align: center;
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(1.7rem, 3.5vw, 2.5rem);
    font-weight: 700;
    letter-spacing: 0.07em;
    line-height: 1.15;
    color: #111111;
  }

  .manager-dashboard__organization {
    display: block;
    width: 100%;
    margin: 0.9rem 0 0;
    text-align: center;
    font-family: "Kulim Park", sans-serif;
    font-size: clamp(1.25rem, 2.6vw, 1.75rem);
    font-weight: 600;
    letter-spacing: 0.12em;
    line-height: 1.2;
    text-transform: uppercase;
    color: #8b929a;
  }

  .manager-dashboard__intro {
    display: block;
    width: 100%;
    margin: 1.15rem auto 0;
    overflow: hidden;
    white-space: nowrap;
    text-align: center;
    font-family: "Edu QLD Hand", cursive;
    font-size: clamp(1.15rem, 2.4vw, 1.5rem);
    font-weight: 400;
    line-height: 1.2;
    color: #42698e;
  }

  .manager-dashboard__intro-text {
    display: inline-block;
    overflow: hidden;
    white-space: nowrap;
    width: 0;
    border-right: 2px solid #6d9bc4;
    animation:
      manager-dashboard-intro-type 2.2s steps(27, end) 0.2s forwards,
      manager-dashboard-intro-caret 0.75s step-end 3.2s 3;
  }

  @keyframes manager-dashboard-intro-type {
    from { width: 0; }
    to { width: 27ch; }
  }

  @keyframes manager-dashboard-intro-caret {
    0%, 100% { border-color: transparent; }
    50% { border-color: #6d9bc4; }
  }

  .manager-dashboard__actions {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.9rem;
    margin: 1.4rem auto 0;
  }

  .manager-dashboard__action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-width: 8.5rem;
    padding: 0.7rem 1.1rem;
    border: 1px solid #b8cee2;
    border-radius: 0.7rem;
    background: rgba(255, 255, 255, 0.72);
    color: #245b88;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 5px 14px rgba(55, 94, 125, 0.08);
    transition: transform 160ms ease, background 160ms ease, box-shadow 160ms ease;
  }

  .manager-dashboard__action:hover {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 0 7px 18px rgba(55, 94, 125, 0.12);
  }

  .manager-dashboard__action:focus-visible {
    outline: 2px solid #4b8bc4;
    outline-offset: 2px;
  }

  .manager-dashboard__action svg {
    width: 1rem;
    height: 1rem;
    stroke-width: 1.9;
  }

  @media (max-width: 520px) {
    .manager-dashboard__actions {
      flex-direction: column;
    }

    .manager-dashboard__action {
      width: min(100%, 12rem);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .manager-dashboard__greeting-text,
    .manager-dashboard__intro-text {
      width: auto;
      border-right: 0;
      animation: none;
    }
  }

  /* Dashboard overview additions — kept local to this page. */
  .manager-dashboard__content {
    width: min(100%, 78rem);
    margin: 3.25rem auto 0;
    display: flex;
    flex-direction: column;
    gap: 1.15rem;
  }

  .manager-dashboard__error {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    padding: 0.85rem 1rem;
    border: 1px solid #efcaca;
    border-radius: 0.9rem;
    background: rgba(255, 247, 247, 0.92);
    color: #9c3b3b;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.88rem;
  }

  .manager-dashboard__error svg { flex: none; width: 1rem; margin-top: 0.1rem; }

  .manager-dashboard__stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.85rem;
  }

  .manager-dashboard__card {
    border: 1px solid rgba(190, 210, 226, 0.82);
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.78);
    box-shadow: 0 10px 28px rgba(44, 78, 108, 0.07);
    backdrop-filter: blur(8px);
  }

  .manager-dashboard__stat {
    min-height: 8.4rem;
    padding: 1.1rem 1.15rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .manager-dashboard__stat-label,
  .manager-dashboard__section-kicker {
    margin: 0;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    color: #7b8794;
  }

  .manager-dashboard__stat-value {
    margin: 0.35rem 0 0;
    font-family: "Kulim Park", sans-serif;
    font-size: clamp(1.45rem, 3vw, 2rem);
    font-weight: 700;
    color: #173f68;
    font-variant-numeric: tabular-nums;
  }

  .manager-dashboard__stat--button {\n    width: 100%;\n    border: 1px solid rgba(190, 210, 226, 0.82);\n    text-align: left;\n    cursor: pointer;\n    transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;\n  }\n\n  .manager-dashboard__stat--button:hover {\n    transform: translateY(-2px);\n    border-color: #a9c6dd;\n    box-shadow: 0 14px 30px rgba(44, 78, 108, 0.1);\n  }\n\n  .manager-dashboard__stat-note {
    margin: 0.25rem 0 0;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.76rem;
    color: #7b8794;
  }

  .manager-dashboard__stat-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.15rem;
    height: 2.15rem;
    border-radius: 0.7rem;
    background: #edf5fc;
    color: #2e6b9f;
  }

  .manager-dashboard__stat-icon svg { width: 1.05rem; height: 1.05rem; }

  .manager-dashboard__split {
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(19rem, 0.85fr);
    gap: 1.15rem;
  }

  .manager-dashboard__panel {
    padding: 1.2rem;
  }

  .manager-dashboard__panel-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .manager-dashboard__panel-title {
    margin: 0.18rem 0 0;
    font-family: "Kulim Park", sans-serif;
    font-size: 1.08rem;
    font-weight: 700;
    color: #1b466f;
  }

  .manager-dashboard__link {
    border: 0;
    background: transparent;
    color: #326f9f;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    padding: 0.25rem;
  }

  .manager-dashboard__link:hover { text-decoration: underline; }

  .manager-dashboard__revenue-current {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.8rem 0 1rem;
  }

  .manager-dashboard__revenue-current strong {
    display: block;
    margin-top: 0.2rem;
    font-family: "Kulim Park", sans-serif;
    font-size: clamp(1.7rem, 4vw, 2.35rem);
    color: #173f68;
  }

  .manager-dashboard__revenue-current span {
    font-family: "Kulim Park", sans-serif;
    font-size: 0.78rem;
    color: #7b8794;
  }

  .manager-dashboard__chart {
    height: 9rem;
    display: flex;
    align-items: flex-end;
    gap: 0.55rem;
    padding: 0.8rem 0.25rem 0;
    border-top: 1px solid #e5edf3;
  }

  .manager-dashboard__bar-wrap {
    flex: 1;
    min-width: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    gap: 0.4rem;
  }

  .manager-dashboard__bar {
    width: min(2rem, 72%);
    min-height: 0.25rem;
    border-radius: 0.5rem 0.5rem 0.2rem 0.2rem;
    background: linear-gradient(180deg, #6fa7d5 0%, #2f6f9f 100%);
  }

  .manager-dashboard__bar-label {
    font-family: "Kulim Park", sans-serif;
    font-size: 0.68rem;
    color: #8793a0;
  }

  .manager-dashboard__empty-chart {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    color: #8793a0;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.8rem;
    text-align: center;
  }

  .manager-dashboard__occupancy-number {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
  }

  .manager-dashboard__occupancy-number strong {
    font-family: "Kulim Park", sans-serif;
    font-size: 2.5rem;
    color: #173f68;
  }

  .manager-dashboard__occupancy-number span {
    font-family: "Kulim Park", sans-serif;
    font-size: 0.78rem;
    color: #7b8794;
  }

  .manager-dashboard__progress {
    height: 0.6rem;
    margin: 0.85rem 0 0.7rem;
    overflow: hidden;
    border-radius: 999px;
    background: #e6edf3;
  }

  .manager-dashboard__progress > span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #6fa7d5, #2e6b9f);
  }

  .manager-dashboard__occupancy-copy {
    margin: 0;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.78rem;
    line-height: 1.5;
    color: #71808e;
  }

  .manager-dashboard__money-list {
    display: grid;
    gap: 0.2rem;
    margin-top: 1.15rem;
  }

  .manager-dashboard__money-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.58rem 0;
    border-top: 1px solid #e8eef3;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.82rem;
    color: #627383;
  }

  .manager-dashboard__money-row strong {
    color: #315a7c;
    font-variant-numeric: tabular-nums;
  }

  .manager-dashboard__money-row--net {
    padding-top: 0.75rem;
    font-weight: 700;
    color: #1c4f79;
  }

  .manager-dashboard__commitment {
    margin: 0.8rem 0 0;
    padding: 0.7rem 0.8rem;
    border-radius: 0.75rem;
    background: #f5f8fb;
    color: #657687;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.73rem;
    line-height: 1.45;
  }

  .manager-dashboard__maintenance-summary {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.55rem;
    margin-bottom: 0.9rem;
  }

  .manager-dashboard__maintenance-count {
    padding: 0.7rem;
    border: 1px solid #e1e9f0;
    border-radius: 0.75rem;
    background: rgba(248, 251, 253, 0.9);
  }

  .manager-dashboard__maintenance-count span {
    display: block;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.67rem;
    color: #7c8995;
  }

  .manager-dashboard__maintenance-count strong {
    display: block;
    margin-top: 0.2rem;
    font-family: "Kulim Park", sans-serif;
    font-size: 1.15rem;
    color: #244f73;
  }

  .manager-dashboard__maintenance-list {
    display: grid;
    gap: 0.7rem;
  }

  .manager-dashboard__maintenance-item {
    padding: 0.9rem;
    border: 1px solid #e0e8ef;
    border-radius: 0.85rem;
    background: rgba(255, 255, 255, 0.72);
  }

  .manager-dashboard__maintenance-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .manager-dashboard__maintenance-title {
    margin: 0;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.93rem;
    font-weight: 700;
    color: #244d70;
  }

  .manager-dashboard__maintenance-meta,
  .manager-dashboard__maintenance-description {
    margin: 0.28rem 0 0;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.73rem;
    color: #7a8793;
    line-height: 1.45;
  }

  .manager-dashboard__maintenance-description {
    color: #62717f;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .manager-dashboard__status {
    flex: none;
    padding: 0.27rem 0.55rem;
    border-radius: 999px;
    background: #f0f3f6;
    color: #63707d;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.64rem;
    font-weight: 700;
  }

  .manager-dashboard__status--medium { background: #fff5df; color: #9a6b1c; }
  .manager-dashboard__status--high { background: #ffeadf; color: #a8522c; }
  .manager-dashboard__status--urgent { background: #fde4e4; color: #a73f3f; }
  .manager-dashboard__status--progress { background: #e6f1fb; color: #2b6797; }

  .manager-dashboard__maintenance-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-top: 0.75rem;
    flex-wrap: wrap;
  }

  .manager-dashboard__maintenance-cost {
    font-family: "Kulim Park", sans-serif;
    font-size: 0.76rem;
    font-weight: 700;
    color: #315b7d;
  }

  .manager-dashboard__maintenance-actions {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
  }

  .manager-dashboard__mini-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    min-height: 2rem;
    padding: 0.42rem 0.62rem;
    border: 1px solid #c9d9e7;
    border-radius: 0.6rem;
    background: #fff;
    color: #356b94;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.7rem;
    font-weight: 700;
    cursor: pointer;
  }

  .manager-dashboard__mini-button:hover { background: #f4f8fb; }
  .manager-dashboard__mini-button:disabled { opacity: 0.55; cursor: wait; }
  .manager-dashboard__mini-button svg { width: 0.8rem; height: 0.8rem; }

  .manager-dashboard__properties-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .manager-dashboard__search {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: min(100%, 20rem);
    padding: 0.62rem 0.75rem;
    border: 1px solid #cadbe9;
    border-radius: 0.7rem;
    background: rgba(255, 255, 255, 0.8);
  }

  .manager-dashboard__search svg { width: 0.95rem; height: 0.95rem; color: #7990a2; flex: none; }
  .manager-dashboard__search input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.82rem;
    color: #244d70;
  }

  .manager-dashboard__properties-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.85rem;
  }

  .manager-dashboard__property {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    min-width: 0;
    padding: 1rem;
    border: 1px solid #dbe6ee;
    border-radius: 0.9rem;
    background: rgba(255, 255, 255, 0.72);
    text-align: left;
    box-shadow: 0 7px 18px rgba(44, 78, 108, 0.04);
    cursor: pointer;
    transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
  }

  .manager-dashboard__property:hover {
    transform: translateY(-2px);
    border-color: #a9c6dd;
    box-shadow: 0 12px 24px rgba(44, 78, 108, 0.08);
  }

  .manager-dashboard__property-top {
    display: flex;
    align-items: flex-start;
    gap: 0.7rem;
  }

  .manager-dashboard__property-mark {
    display: grid;
    place-items: center;
    width: 2.4rem;
    height: 2.4rem;
    flex: none;
    border-radius: 0.75rem;
    background: #edf5fc;
    color: #2e6b9f;
  }

  .manager-dashboard__property-mark svg { width: 1rem; height: 1rem; }

  .manager-dashboard__property-name {
    margin: 0;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.95rem;
    font-weight: 700;
    color: #234c6e;
    overflow-wrap: anywhere;
  }

  .manager-dashboard__property-location {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin: 0.18rem 0 0;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.7rem;
    color: #8793a0;
  }

  .manager-dashboard__property-location svg { width: 0.75rem; height: 0.75rem; flex: none; }

  .manager-dashboard__property-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
    padding: 0.75rem 0;
    border-top: 1px solid #e6edf2;
    border-bottom: 1px solid #e6edf2;
  }

  .manager-dashboard__property-metric span {
    display: block;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.61rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #8996a1;
  }

  .manager-dashboard__property-metric strong {
    display: block;
    margin-top: 0.18rem;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.8rem;
    color: #315a7c;
    overflow-wrap: anywhere;
  }

  .manager-dashboard__property-occupancy {
    display: flex;
    flex-direction: column;
    gap: 0.38rem;
  }

  .manager-dashboard__property-occupancy-row {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.7rem;
    color: #7b8792;
  }

  .manager-dashboard__property-occupancy-row strong { color: #315a7c; }

  .manager-dashboard__property-progress {
    height: 0.4rem;
    overflow: hidden;
    border-radius: 999px;
    background: #e6edf3;
  }

  .manager-dashboard__property-progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: #5f98c6;
  }

  .manager-dashboard__property-foot {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.68rem;
    color: #8a959f;
  }

  .manager-dashboard__loading {
    display: grid;
    place-items: center;
    min-height: 8rem;
    color: #7b8794;
    font-family: "Kulim Park", sans-serif;
    font-size: 0.85rem;
  }

  .manager-dashboard__spinner {
    animation: manager-dashboard-spin 0.9s linear infinite;
  }

  @keyframes manager-dashboard-spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 1100px) {
    .manager-dashboard__stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .manager-dashboard__properties-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (max-width: 820px) {
    .manager-dashboard { padding: 1.35rem; }
    .manager-dashboard__content { margin-top: 2.5rem; }
    .manager-dashboard__split { grid-template-columns: 1fr; }
    .manager-dashboard__maintenance-summary { grid-template-columns: repeat(5, minmax(0, 1fr)); overflow-x: auto; }
    .manager-dashboard__maintenance-count { min-width: 5.2rem; }
  }

  @media (max-width: 620px) {
    .manager-dashboard__stats,
    .manager-dashboard__properties-grid { grid-template-columns: 1fr; }
    .manager-dashboard__panel { padding: 1rem; }
    .manager-dashboard__chart { height: 7.5rem; gap: 0.3rem; }
    .manager-dashboard__bar { width: min(1.5rem, 65%); }
    .manager-dashboard__properties-head { align-items: stretch; }
    .manager-dashboard__search { width: 100%; }
    .manager-dashboard__maintenance-summary { gap: 0.4rem; }
  }
`;

type Organization = {
  id?: number | string;
  name?: string;
  currency?: string;
};

type DashboardStats = {
  properties: number;
  units: number;
  occupied_units: number;
  vacant_units: number;
  occupancy: number;
  active_tenants: number;
  active_leases: number;
  monthly_rent: number;
  monthly_revenue: number;
  monthly_maintenance: number;
  monthly_expenses: number;
  net_revenue: number;
  idle_rent: number;
  committed_maintenance: number;
};

type RevenuePoint = { label: string; value: number };

type PropertyRecord = {
  id: number;
  name: string;
  city: string | null;
  country: string | null;
  units_count: number;
  occupied_units: number;
  vacant_units: number;
  active_tenants: number;
  monthly_revenue: number;
  potential_monthly_revenue: number;
  occupancy: number;
};

type MaintenanceItem = {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  estimated_cost: number;
  reported_date: string | null;
  property: { id: number; name: string } | null;
  unit: { id: number; unit_number: string } | null;
  tenant: {
    id: number;
    first_name: string;
    last_name: string;
    phone: string | null;
  } | null;
};

type DashboardPayload = {
  organization: Organization;
  stats: DashboardStats;
  revenue_trend: RevenuePoint[];
  maintenance: {
    needs_action: number;
    open: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    committed_cost: number;
    items: MaintenanceItem[];
  };
  properties_list: PropertyRecord[];
};

const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const textValue = (value: unknown) =>
  typeof value === "string" ? value : "";

const money = (value: number, currency: string) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: currency || "KES",
    maximumFractionDigits: 0,
  }).format(numberValue(value));

const dateOpen = (date: string | null) => {
  if (!date) return "recently";
  const start = new Date(`${date}T00:00:00`).getTime();
  const days = Math.max(0, Math.floor((Date.now() - start) / 86400000));
  if (days === 0) return "Today";
  if (days === 1) return "1 day open";
  return `${days} days open`;
};

const statusLabel = (status: string) => {
  if (status === "in_progress") return "In progress";
  if (status === "cancelled") return "Cancelled";
  if (status === "completed") return "Completed";
  return "Open";
};

function DashboardPage() {
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [propertySearch, setPropertySearch] = useState("");
  const [savingMaintenanceId, setSavingMaintenanceId] = useState<number | null>(null);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const greetingIcon = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) return <Sun aria-hidden="true" />;
    if (hour < 18) return <CloudSun aria-hidden="true" />;
    return <Moon aria-hidden="true" />;
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const payload = (await apiRequest("/dashboard")) as DashboardPayload;
      setDashboard(payload);
      setOrganization(payload.organization ?? null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load the manager dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const organizationName =
    organization?.name ??
    (organization?.id ? `Organization ${organization.id}` : "Organization");

  const currency = organization?.currency || "KES";
  const stats = dashboard?.stats;
  const maintenance = dashboard?.maintenance;

  const filteredProperties = useMemo(() => {
    const needle = propertySearch.trim().toLowerCase();

    return (dashboard?.properties_list ?? []).filter((property) => {
      if (!needle) return true;
      return [property.name, property.city, property.country]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [dashboard?.properties_list, propertySearch]);

  const chartMax = Math.max(
    ...(dashboard?.revenue_trend ?? []).map((point) => point.value),
    0
  );

  async function updateMaintenance(id: number, status: string) {
    if (savingMaintenanceId !== null) return;

    setSavingMaintenanceId(id);
    setError("");

    try {
      await apiRequest(`/maintenance-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await loadDashboard();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not update the maintenance request."
      );
    } finally {
      setSavingMaintenanceId(null);
    }
  }

  return (
    <>
      <style>{styles}</style>

      <DashboardLayout>
        <main className="manager-dashboard">
          <div className="manager-dashboard__greeting">
            <span className="manager-dashboard__greeting-icon" aria-hidden="true">
              {greetingIcon}
            </span>
            <span className="manager-dashboard__greeting-text">{greeting}</span>
          </div>

          <h1 className="manager-dashboard__portfolio-title">
            PORTFOLIO OVERVIEW
          </h1>

          <div className="manager-dashboard__organization">
            {organizationName}
          </div>

          <div
            className="manager-dashboard__intro"
            aria-label="Manage your properties with ease"
          >
            <span className="manager-dashboard__intro-text">
              Manage your properties with ease
            </span>
          </div>

          <div className="manager-dashboard__actions">
            <button
              type="button"
              className="manager-dashboard__action"
              onClick={() => window.location.reload()}
              aria-label="Refresh dashboard"
            >
              <RefreshCw aria-hidden="true" />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="manager-dashboard__action"
              onClick={() => navigate("/manager/properties/add")}
              aria-label="Add property"
            >
              <Plus aria-hidden="true" />
              <span>Add Property</span>
            </button>
          </div>

          <section className="manager-dashboard__content" aria-label="Portfolio details">
            {error && (
              <div className="manager-dashboard__error" role="alert">
                <AlertCircle aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {loading && !dashboard ? (
              <div className="manager-dashboard__card manager-dashboard__loading">
                <LoaderCircle className="manager-dashboard__spinner" />
                <span>Loading your portfolio overview…</span>
              </div>
            ) : (
              <>
                <section className="manager-dashboard__stats" aria-label="Portfolio summary">
                  <button type="button" className="manager-dashboard__card manager-dashboard__stat manager-dashboard__stat--button" onClick={() => navigate("/manager/properties")} aria-label="Open properties">
                    <div>
                      <span className="manager-dashboard__stat-icon"><Building2 /></span>
                      <p className="manager-dashboard__stat-label">Properties</p>
                      <p className="manager-dashboard__stat-value">{stats?.properties ?? 0}</p>
                    </div>
                    <p className="manager-dashboard__stat-note">
                      {stats?.units ?? 0} units tracked
                    </p>
                  </button>

                  <button type="button" className="manager-dashboard__card manager-dashboard__stat manager-dashboard__stat--button" onClick={() => navigate("/manager/units")} aria-label="Open units">
                    <div>
                      <span className="manager-dashboard__stat-icon"><DoorOpen /></span>
                      <p className="manager-dashboard__stat-label">Occupied units</p>
                      <p className="manager-dashboard__stat-value">
                        {stats?.occupied_units ?? 0}/{stats?.units ?? 0}
                      </p>
                    </div>
                    <p className="manager-dashboard__stat-note">
                      {stats?.occupancy ?? 0}% occupancy
                    </p>
                  </button>

                  <button type="button" className="manager-dashboard__card manager-dashboard__stat manager-dashboard__stat--button" onClick={() => navigate("/manager/tenants")} aria-label="Open active tenants">
                    <div>
                      <span className="manager-dashboard__stat-icon"><Users /></span>
                      <p className="manager-dashboard__stat-label">Active tenants</p>
                      <p className="manager-dashboard__stat-value">{stats?.active_tenants ?? 0}</p>
                    </div>
                    <p className="manager-dashboard__stat-note">
                      On active leases
                    </p>
                  </button>

                  <button type="button" className="manager-dashboard__card manager-dashboard__stat manager-dashboard__stat--button" onClick={() => navigate("/manager/payments")} aria-label="Open payments">
                    <div>
                      <span className="manager-dashboard__stat-icon"><CheckCircle2 /></span>
                      <p className="manager-dashboard__stat-label">Net monthly revenue</p>
                      <p className="manager-dashboard__stat-value">
                        {money(stats?.net_revenue ?? 0, currency)}
                      </p>
                    </div>
                    <p className="manager-dashboard__stat-note">
                      {money(stats?.cash_collected_this_month ?? 0, currency)} collected this month
                    </p>
                  </button>
                </section>

                <section className="manager-dashboard__split">
                  <article className="manager-dashboard__card manager-dashboard__panel">
                    <div className="manager-dashboard__panel-head">
                      <div>
                        <p className="manager-dashboard__section-kicker">Cash performance</p>
                        <h2 className="manager-dashboard__panel-title">
                          Revenue over the last six months
                        </h2>
                      </div>
                      <button
                        type="button"
                        className="manager-dashboard__link"
                        onClick={() => navigate("/manager/payments")}
                      >
                        View payments
                      </button>
                    </div>

                    <div className="manager-dashboard__revenue-current">
                      <div>
                        <span>Current month</span>
                        <strong>{money(stats?.monthly_rent ?? 0, currency)}</strong>
                      </div>
                      <span>
                        {dashboard?.revenue_trend?.some((point) => point.value > 0)
                          ? "Payments recorded"
                          : "Revenue history will appear here as payments are recorded."}
                      </span>
                    </div>

                    <div className="manager-dashboard__chart" aria-label="Six month payment history">
                      {(dashboard?.revenue_trend ?? []).length === 0 ? (
                        <div className="manager-dashboard__empty-chart">
                          Revenue history will appear here as payments are recorded.
                        </div>
                      ) : (
                        (dashboard?.revenue_trend ?? []).map((point) => (
                          <div className="manager-dashboard__bar-wrap" key={point.label}>
                            <div
                              className="manager-dashboard__bar"
                              title={`${point.label}: ${money(point.value, currency)}`}
                              style={{
                                height: `${chartMax > 0 ? Math.max((point.value / chartMax) * 82, point.value > 0 ? 8 : 2) : 2}%`,
                              }}
                            />
                            <span className="manager-dashboard__bar-label">{point.label}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </article>

                  <article className="manager-dashboard__card manager-dashboard__panel">
                    <div className="manager-dashboard__panel-head">
                      <div>
                        <p className="manager-dashboard__section-kicker">Occupancy</p>
                        <h2 className="manager-dashboard__panel-title">Portfolio capacity</h2>
                      </div>
                      <button
                        type="button"
                        className="manager-dashboard__link"
                        onClick={() => navigate("/manager/units")}
                      >
                        View units
                      </button>
                    </div>

                    <div className="manager-dashboard__occupancy-number">
                      <strong>{stats?.occupancy ?? 0}%</strong>
                      <span>{stats?.occupied_units ?? 0} of {stats?.units ?? 0} units occupied</span>
                    </div>

                    <div className="manager-dashboard__progress" role="progressbar" aria-valuenow={stats?.occupancy ?? 0} aria-valuemin={0} aria-valuemax={100}>
                      <span style={{ width: `${Math.min(stats?.occupancy ?? 0, 100)}%` }} />
                    </div>

                    <p className="manager-dashboard__occupancy-copy">
                      {stats?.occupied_units ?? 0} occupied · {stats?.vacant_units ?? 0} vacant · {money(stats?.idle_rent ?? 0, currency)} idle rent
                    </p>

                    <div className="manager-dashboard__money-list">
                      <div className="manager-dashboard__money-row">
                        <span>Rent from occupied units</span>
                        <strong>{money(stats?.monthly_rent ?? 0, currency)}</strong>
                      </div>
                      <div className="manager-dashboard__money-row">
                        <span>Collected this month</span>
                        <strong>{money(stats?.cash_collected_this_month ?? 0, currency)}</strong>
                      </div>
                      <div className="manager-dashboard__money-row">
                        <span>Maintenance / expenses</span>
                        <strong>Not deducted</strong>
                      </div>
                      <div className="manager-dashboard__money-row manager-dashboard__money-row--net">
                        <span>Manager revenue</span>
                        <strong>{money(stats?.net_revenue ?? 0, currency)}</strong>
                      </div>
                    </div>

                    {(stats?.committed_maintenance ?? 0) > 0 && (
                      <p className="manager-dashboard__commitment">
                        {money(stats?.committed_maintenance ?? 0, currency)} of open maintenance is committed. The cost is tracked separately and is not deducted from manager revenue because responsibility may belong to the landlord or tenant.
                      </p>
                    )}
                  </article>
                </section>

                <section className="manager-dashboard__card manager-dashboard__panel">
                  <div className="manager-dashboard__panel-head">
                    <div>
                      <p className="manager-dashboard__section-kicker">Maintenance requests</p>
                      <h2 className="manager-dashboard__panel-title">
                        {maintenance?.needs_action ?? 0} need action · {money(maintenance?.committed_cost ?? 0, currency)} committed
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="manager-dashboard__link"
                      onClick={() => navigate("/manager/maintenance")}
                    >
                      Open queue
                    </button>
                  </div>

                  <div className="manager-dashboard__maintenance-summary">
                    <div className="manager-dashboard__maintenance-count">
                      <span>Needs action</span>
                      <strong>{maintenance?.needs_action ?? 0}</strong>
                    </div>
                    <div className="manager-dashboard__maintenance-count">
                      <span>Open</span>
                      <strong>{maintenance?.open ?? 0}</strong>
                    </div>
                    <div className="manager-dashboard__maintenance-count">
                      <span>In progress</span>
                      <strong>{maintenance?.in_progress ?? 0}</strong>
                    </div>
                    <div className="manager-dashboard__maintenance-count">
                      <span>Completed</span>
                      <strong>{maintenance?.completed ?? 0}</strong>
                    </div>
                    <div className="manager-dashboard__maintenance-count">
                      <span>Cancelled</span>
                      <strong>{maintenance?.cancelled ?? 0}</strong>
                    </div>
                  </div>

                  <div className="manager-dashboard__maintenance-list">
                    {(maintenance?.items ?? []).length === 0 ? (
                      <div className="manager-dashboard__loading">No maintenance requests yet.</div>
                    ) : (
                      (maintenance?.items ?? []).map((item) => {
                        const tenantName = [item.tenant?.first_name, item.tenant?.last_name]
                          .filter(Boolean)
                          .join(" ") || "Tenant";
                        const statusClass =
                          item.status === "in_progress"
                            ? "manager-dashboard__status--progress"
                            : `manager-dashboard__status--${item.priority}`;

                        return (
                          <article className="manager-dashboard__maintenance-item" key={item.id}>
                            <div className="manager-dashboard__maintenance-top">
                              <div>
                                <h3 className="manager-dashboard__maintenance-title">
                                  {item.title}
                                </h3>
                                <p className="manager-dashboard__maintenance-meta">
                                  {item.property?.name ?? "Property"} · {item.unit?.unit_number ?? "Unit"} · {tenantName} · {dateOpen(item.reported_date)}
                                </p>
                              </div>
                              <span className={`manager-dashboard__status ${statusClass}`}>
                                {item.status === "in_progress" ? "In progress" : statusLabel(item.status)}
                              </span>
                            </div>

                            {item.description && (
                              <p className="manager-dashboard__maintenance-description">
                                {item.description}
                              </p>
                            )}

                            <div className="manager-dashboard__maintenance-footer">
                              <span className="manager-dashboard__maintenance-cost">
                                {money(item.estimated_cost, currency)} estimated
                              </span>

                              <div className="manager-dashboard__maintenance-actions">
                                {item.tenant?.phone && (
                                  <a
                                    className="manager-dashboard__mini-button"
                                    href={`tel:${item.tenant.phone}`}
                                    aria-label={`Call ${tenantName}`}
                                  >
                                    <Phone />
                                    Call tenant
                                  </a>
                                )}

                                {item.status === "open" && (
                                  <button
                                    type="button"
                                    className="manager-dashboard__mini-button"
                                    disabled={savingMaintenanceId === item.id}
                                    onClick={() => void updateMaintenance(item.id, "in_progress")}
                                  >
                                    {savingMaintenanceId === item.id ? <LoaderCircle className="manager-dashboard__spinner" /> : <Wrench />}
                                    Start work
                                  </button>
                                )}

                                {item.status === "in_progress" && (
                                  <button
                                    type="button"
                                    className="manager-dashboard__mini-button"
                                    disabled={savingMaintenanceId === item.id}
                                    onClick={() => void updateMaintenance(item.id, "completed")}
                                  >
                                    <CheckCircle2 />
                                    Complete
                                  </button>
                                )}

                                {(item.status === "open" || item.status === "in_progress") && (
                                  <button
                                    type="button"
                                    className="manager-dashboard__mini-button"
                                    disabled={savingMaintenanceId === item.id}
                                    onClick={() => void updateMaintenance(item.id, "cancelled")}
                                  >
                                    <X />
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>

                <section className="manager-dashboard__card manager-dashboard__panel">
                  <div className="manager-dashboard__properties-head">
                    <div>
                      <p className="manager-dashboard__section-kicker">Properties</p>
                      <h2 className="manager-dashboard__panel-title">
                        {filteredProperties.length} of {dashboard?.properties_list?.length ?? 0} shown
                      </h2>
                    </div>

                    <div className="manager-dashboard__search">
                      <Search aria-hidden="true" />
                      <input
                        type="search"
                        value={propertySearch}
                        onChange={(event) => setPropertySearch(event.target.value)}
                        placeholder="Search by name or city…"
                        aria-label="Search properties"
                      />
                    </div>
                  </div>

                  <div className="manager-dashboard__properties-grid" style={{ marginTop: "1rem" }}>
                    {filteredProperties.map((property) => (
                      <button
                        type="button"
                        className="manager-dashboard__property"
                        key={property.id}
                        onClick={() => navigate(`/manager/units?property=${property.id}`)}
                        aria-label={`Open units for ${property.name}`}
                      >
                        <div className="manager-dashboard__property-top">
                          <span className="manager-dashboard__property-mark">
                            <Building2 aria-hidden="true" />
                          </span>
                          <div>
                            <h3 className="manager-dashboard__property-name">{property.name}</h3>
                            <p className="manager-dashboard__property-location">
                              <MapPin aria-hidden="true" />
                              {[property.city, property.country].filter(Boolean).join(", ") || "Location not set"}
                            </p>
                          </div>
                        </div>

                        <div className="manager-dashboard__property-metrics">
                          <div className="manager-dashboard__property-metric">
                            <span>Units</span>
                            <strong>{property.units_count}</strong>
                          </div>
                          <div className="manager-dashboard__property-metric">
                            <span>Occupied</span>
                            <strong>{property.occupied_units}/{property.units_count}</strong>
                          </div>
                          <div className="manager-dashboard__property-metric">
                            <span>Tenants</span>
                            <strong>{property.active_tenants}</strong>
                          </div>
                        </div>

                        <div className="manager-dashboard__property-occupancy">
                          <div className="manager-dashboard__property-occupancy-row">
                            <span>Occupancy</span>
                            <strong>{property.occupancy}% full</strong>
                          </div>
                          <div className="manager-dashboard__property-progress">
                            <span style={{ width: `${Math.min(property.occupancy, 100)}%` }} />
                          </div>
                        </div>

                        <div className="manager-dashboard__property-foot">
                          <span>Rent {money(property.monthly_revenue, currency)}</span>
                          <span>
                            {property.vacant_units} vacant · {money(Math.max(property.potential_monthly_revenue - property.monthly_revenue, 0), currency)} idle
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {filteredProperties.length === 0 && (
                    <div className="manager-dashboard__loading">
                      No properties match “{propertySearch}”.
                    </div>
                  )}
                </section>
              </>
            )}
          </section>
        </main>
      </DashboardLayout>
    </>
  );
}

export default DashboardPage;
