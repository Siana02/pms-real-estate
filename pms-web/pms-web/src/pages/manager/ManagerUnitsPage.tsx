import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  DoorOpen,
  Plus,
  RefreshCw,
  Search,
  Wrench,
  X,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";
import { managerStyles } from "../../styles/managerUI";
import {
  asNumber,
  asString,
  formatDate,
  formatMoney,
  formatNumber,
  namedRef,
  readCurrency,
  rows,
  titleCase,
} from "../../services/format";
 
/* ------------------------------------------------------------------ */
/*  TYPES & PARSING                                                     */
/* ------------------------------------------------------------------ */
 
interface UnitRecord {
  id: number;
  unit_number: string;
  unit_type: string;
  bedrooms: number;
  bathrooms: number;
  size_sqm: number;
  monthly_rent: number;
  deposit_amount: number;
  status: string;
  property: { id: number; name: string } | null;
  tenant: { id: number; name: string } | null;
  lease_end_date: string | null;
  open_maintenance_requests: number;
}
 
const STATUSES = ["all", "occupied", "vacant", "maintenance"];
 
function parseUnits(payload: unknown): UnitRecord[] {
  return rows(payload).map((record) => ({
    id: asNumber(record.id),
    unit_number: asString(record.unit_number) || "—",
    unit_type: asString(record.unit_type),
    bedrooms: asNumber(record.bedrooms),
    bathrooms: asNumber(record.bathrooms),
    size_sqm: asNumber(record.size_sqm),
    monthly_rent: asNumber(record.monthly_rent),
    deposit_amount: asNumber(record.deposit_amount),
    status: asString(record.status) || "vacant",
    property: namedRef(record.property, "name"),
    tenant: namedRef(record.tenant, "name"),
    lease_end_date: asString(record.lease_end_date) || null,
    open_maintenance_requests: asNumber(record.open_maintenance_requests),
  }));
}
 
function statusBadge(status: string): string {
  if (status === "occupied") return "mg-badge mg-badge--ok";
  if (status === "maintenance") return "mg-badge mg-badge--warn";
  return "mg-badge mg-badge--info";
}
 
/* ------------------------------------------------------------------ */
/*  ADD UNIT DRAWER                                                     */
/* ------------------------------------------------------------------ */
 
interface AddUnitDrawerProps {
  properties: { id: number; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}
 
function AddUnitDrawer({ properties, onClose, onCreated }: AddUnitDrawerProps) {
  const [propertyId, setPropertyId] = useState(
    properties.length > 0 ? String(properties[0].id) : ""
  );
  const [unitNumber, setUnitNumber] = useState("");
  const [unitType, setUnitType] = useState("");
  const [bedrooms, setBedrooms] = useState("1");
  const [bathrooms, setBathrooms] = useState("1");
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [status, setStatus] = useState("vacant");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
 
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
 
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
 
  const valid =
    propertyId.length > 0 && unitNumber.trim().length > 0 && Number(rent) > 0;
 
  async function handleSubmit() {
    if (!valid || saving) return;
 
    setSaving(true);
    setError("");
 
    try {
      await apiRequest("/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: Number(propertyId),
          unit_number: unitNumber.trim(),
          unit_type: unitType.trim() || null,
          bedrooms: Number(bedrooms) || 0,
          bathrooms: Number(bathrooms) || 0,
          monthly_rent: Number(rent),
          deposit_amount: Number(deposit) || 0,
          status,
        }),
      });
 
      onCreated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add the unit.");
    } finally {
      setSaving(false);
    }
  }
 
  return (
    <div
      className="mg-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Add a unit"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mg-drawer__panel">
        <div className="mg-drawer__head">
          <div>
            <h2 className="mg-drawer__title">Add a unit</h2>
            <p className="mg-drawer__sub">
              Units belong to a property and carry the rent a lease is written
              against.
            </p>
          </div>
          <button
            type="button"
            className="mg-iconbtn"
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </button>
        </div>
 
        <div className="mg-drawer__body">
          {error && (
            <div className="mg-alert" role="alert">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}
 
          <div className="mg-field">
            <label className="mg-label" htmlFor="un-property">
              Property
            </label>
            <select
              id="un-property"
              className="mg-select"
              value={propertyId}
              onChange={(event) => setPropertyId(event.target.value)}
            >
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>
 
          <div className="mg-grid2">
            <div className="mg-field">
              <label className="mg-label" htmlFor="un-number">
                Unit number
              </label>
              <input
                id="un-number"
                className="mg-input"
                value={unitNumber}
                onChange={(event) => setUnitNumber(event.target.value)}
                placeholder="e.g. B4"
              />
            </div>
 
            <div className="mg-field">
              <label className="mg-label" htmlFor="un-type">
                Unit type
              </label>
              <input
                id="un-type"
                className="mg-input"
                value={unitType}
                onChange={(event) => setUnitType(event.target.value)}
                placeholder="e.g. 2 bedroom"
              />
            </div>
          </div>
 
          <div className="mg-grid2">
            <div className="mg-field">
              <label className="mg-label" htmlFor="un-beds">
                Bedrooms
              </label>
              <input
                id="un-beds"
                className="mg-input"
                type="number"
                min="0"
                value={bedrooms}
                onChange={(event) => setBedrooms(event.target.value)}
              />
            </div>
 
            <div className="mg-field">
              <label className="mg-label" htmlFor="un-baths">
                Bathrooms
              </label>
              <input
                id="un-baths"
                className="mg-input"
                type="number"
                min="0"
                value={bathrooms}
                onChange={(event) => setBathrooms(event.target.value)}
              />
            </div>
          </div>
 
          <div className="mg-grid2">
            <div className="mg-field">
              <label className="mg-label" htmlFor="un-rent">
                Monthly rent
              </label>
              <input
                id="un-rent"
                className="mg-input"
                type="number"
                min="0"
                value={rent}
                onChange={(event) => setRent(event.target.value)}
                placeholder="45000"
              />
            </div>
 
            <div className="mg-field">
              <label className="mg-label" htmlFor="un-deposit">
                Deposit
              </label>
              <input
                id="un-deposit"
                className="mg-input"
                type="number"
                min="0"
                value={deposit}
                onChange={(event) => setDeposit(event.target.value)}
                placeholder="90000"
              />
            </div>
          </div>
 
          <div className="mg-field">
            <label className="mg-label" htmlFor="un-status">
              Status
            </label>
            <select
              id="un-status"
              className="mg-select"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="vacant">Vacant</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Under maintenance</option>
            </select>
          </div>
        </div>
 
        <div className="mg-drawer__foot">
          <button type="button" className="mg-btn mg-btn--subtle" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="mg-btn mg-btn--primary"
            onClick={() => void handleSubmit()}
            disabled={!valid || saving}
          >
            <Plus />
            {saving ? "Adding…" : "Add unit"}
          </button>
        </div>
      </div>
    </div>
  );
}
 
/* ------------------------------------------------------------------ */
/*  PAGE                                                                */
/* ------------------------------------------------------------------ */
 
function ManagerUnitsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const currency = useMemo(readCurrency, []);
 
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [drawer, setDrawer] = useState(false);
 
  const propertyFilter = params.get("property") ?? "";
 
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
 
    try {
      const payload = await apiRequest("/units");
      setUnits(parseUnits(payload));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load units.");
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => {
    void load();
  }, [load]);
 
  const properties = useMemo(() => {
    const map = new Map<number, string>();
    units.forEach((unit) => {
      if (unit.property) map.set(unit.property.id, unit.property.name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [units]);
 
  const activeProperty = useMemo(() => {
    if (!propertyFilter) return null;
    const id = Number(propertyFilter);
    return properties.find((property) => property.id === id) ?? null;
  }, [propertyFilter, properties]);
 
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
 
    return units.filter((unit) => {
      if (propertyFilter && String(unit.property?.id ?? "") !== propertyFilter) {
        return false;
      }
      if (status !== "all" && unit.status !== status) return false;
      if (!needle) return true;
 
      return [
        unit.unit_number,
        unit.unit_type,
        unit.property?.name ?? "",
        unit.tenant?.name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [units, query, status, propertyFilter]);
 
  const counts = useMemo(
    () => ({
      all: units.length,
      occupied: units.filter((unit) => unit.status === "occupied").length,
      vacant: units.filter((unit) => unit.status === "vacant").length,
      maintenance: units.filter((unit) => unit.status === "maintenance").length,
    }),
    [units]
  );
 
  const rentRoll = useMemo(
    () =>
      units
        .filter((unit) => unit.status === "occupied")
        .reduce((sum, unit) => sum + unit.monthly_rent, 0),
    [units]
  );
 
  const idleRent = useMemo(
    () =>
      units
        .filter((unit) => unit.status !== "occupied")
        .reduce((sum, unit) => sum + unit.monthly_rent, 0),
    [units]
  );
 
  function clearProperty() {
    const next = new URLSearchParams(params);
    next.delete("property");
    setParams(next, { replace: true });
  }
 
  return (
    <DashboardLayout>
      <div className="mg-root">
        <style>{managerStyles}</style>
 
        <div className="mg-shell">
          <header className="mg-header">
            <div>
              <span className="mg-eyebrow">
                <DoorOpen />
                Inventory
              </span>
              <h1 className="mg-title">Units</h1>
              <p className="mg-subtitle">
                Every rentable space, who is in it and what it earns. Vacant units
                are the ones costing you money.
              </p>
            </div>
 
            <div className="mg-actions">
              <button
                type="button"
                className="mg-btn mg-btn--subtle"
                onClick={() => void load()}
                disabled={loading}
              >
                <RefreshCw className={loading ? "mg-spin" : undefined} />
                Refresh
              </button>
 
              <button
                type="button"
                className="mg-btn mg-btn--primary"
                onClick={() => setDrawer(true)}
                disabled={properties.length === 0}
              >
                <Plus />
                Add unit
              </button>
            </div>
          </header>
 
          {error && (
            <div className="mg-alert" role="alert">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}
 
          {activeProperty && (
            <div className="mg-toolbar">
              <span className="mg-badge mg-badge--info">
                <Building2 />
                {activeProperty.name}
              </span>
              <button
                type="button"
                className="mg-btn mg-btn--subtle mg-btn--sm"
                onClick={clearProperty}
              >
                <X />
                Clear property filter
              </button>
            </div>
          )}
 
          <section className="mg-stats" aria-label="Unit summary">
            <article className="mg-stat">
              <p className="mg-stat__label">Units</p>
              <p className="mg-stat__value">{formatNumber(counts.all)}</p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Occupied</p>
              <p className="mg-stat__value">{formatNumber(counts.occupied)}</p>
              <p className="mg-stat__hint mg-stat__hint--ok">
                {counts.all > 0
                  ? Math.round((counts.occupied / counts.all) * 100)
                  : 0}
                % occupancy
              </p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Vacant</p>
              <p className="mg-stat__value">{formatNumber(counts.vacant)}</p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Rent roll</p>
              <p className="mg-stat__value">{formatMoney(rentRoll, currency)}</p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Idle rent</p>
              <p className="mg-stat__value">{formatMoney(idleRent, currency)}</p>
              <p className="mg-stat__hint mg-stat__hint--warn">
                Not earning this month
              </p>
            </article>
          </section>
 
          <div className="mg-toolbar">
            <div className="mg-search">
              <Search />
              <label className="mg-label" htmlFor="un-search" hidden>
                Search units
              </label>
              <input
                id="un-search"
                className="mg-input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by unit, property, type or tenant…"
              />
            </div>
 
            <div className="mg-chips" role="group" aria-label="Filter by status">
              {STATUSES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`mg-chip${value === status ? " mg-chip--on" : ""}`}
                  onClick={() => setStatus(value)}
                  aria-pressed={value === status}
                >
                  {value === "all" ? "All" : titleCase(value)}
                  <span className="mg-chip__count">
                    {counts[value as keyof typeof counts]}
                  </span>
                </button>
              ))}
            </div>
          </div>
 
          <section className="mg-panel">
            <div className="mg-panel__head">
              <h2 className="mg-panel__title">
                <DoorOpen />
                {activeProperty ? activeProperty.name : "All units"}
              </h2>
              <span className="mg-panel__meta">
                {visible.length} of {units.length}
              </span>
            </div>
 
            {loading ? (
              <div className="mg-panel__body">
                {[0, 1, 2, 3].map((key) => (
                  <span
                    key={key}
                    className="mg-skeleton"
                    style={{ height: "2.25rem", marginBottom: "0.625rem" }}
                  />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="mg-empty">
                <DoorOpen />
                <p className="mg-empty__title">
                  {units.length === 0 ? "No units yet" : "No units match"}
                </p>
                <p className="mg-empty__text">
                  {units.length === 0
                    ? "Add units to a property so tenants can be placed on leases."
                    : "Adjust the search or status filter to see more units."}
                </p>
              </div>
            ) : (
              <div className="mg-tablewrap">
                <table className="mg-table">
                  <thead>
                    <tr>
                      <th scope="col">Unit</th>
                      <th scope="col">Property</th>
                      <th scope="col">Tenant</th>
                      <th scope="col">Lease ends</th>
                      <th scope="col" className="mg-num">
                        Rent
                      </th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((unit) => (
                      <tr key={unit.id}>
                        <td data-label="Unit">
                          <span className="mg-strong">{unit.unit_number}</span>
                          <span className="mg-sub">
                            {unit.unit_type || "Type not set"}
                            {unit.size_sqm > 0 ? ` · ${unit.size_sqm} m²` : ""}
                          </span>
                        </td>
                        <td data-label="Property">
                          {unit.property?.name ?? "—"}
                        </td>
                        <td data-label="Tenant">
                          {unit.tenant ? (
                            <button
                              type="button"
                              className="mg-rowlink"
                              onClick={() => navigate("/manager/tenants")}
                            >
                              {unit.tenant.name}
                            </button>
                          ) : (
                            <span className="mg-sub">Vacant</span>
                          )}
                        </td>
                        <td data-label="Lease ends" className="mg-nowrap">
                          {formatDate(unit.lease_end_date)}
                        </td>
                        <td data-label="Rent" className="mg-num">
                          {formatMoney(unit.monthly_rent, currency)}
                        </td>
                        <td data-label="Status">
                          <span className={statusBadge(unit.status)}>
                            {titleCase(unit.status)}
                          </span>
                          {unit.open_maintenance_requests > 0 && (
                            <span
                              className="mg-badge mg-badge--warn"
                              style={{ marginLeft: "0.375rem" }}
                            >
                              <Wrench />
                              {unit.open_maintenance_requests} open
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
 
        {drawer && (
          <AddUnitDrawer
            properties={properties}
            onClose={() => setDrawer(false)}
            onCreated={() => {
              setDrawer(false);
              void load();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
 
export default ManagerUnitsPage;
