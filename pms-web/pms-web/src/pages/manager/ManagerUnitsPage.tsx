import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  DoorOpen,
  Plus,
  Pencil,
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
  description: string;
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
    description: asString(record.description),
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
  lockedPropertyId: number | null;
  editingUnit?: UnitRecord | null;
  onClose: () => void;
  onSaved: () => void;
}
 
function AddUnitDrawer({
  properties,
  lockedPropertyId,
  editingUnit,
  onClose,
  onSaved,
}: AddUnitDrawerProps) {
  const [propertyId, setPropertyId] = useState(
    lockedPropertyId
      ? String(lockedPropertyId)
      : properties.length > 0
      ? String(properties[0].id)
      : ""
  );
  const [unitNumber, setUnitNumber] = useState(editingUnit?.unit_number ?? "");
  const [unitType, setUnitType] = useState(editingUnit?.unit_type ?? "");
  const [rent, setRent] = useState(editingUnit ? String(editingUnit.monthly_rent) : "");
  const [deposit, setDeposit] = useState(editingUnit ? String(editingUnit.deposit_amount) : "");
  const [description, setDescription] = useState(editingUnit?.description ?? "");
  const [status, setStatus] = useState(editingUnit?.status || "vacant");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
 
  const lockedProperty = lockedPropertyId
    ? properties.find((property) => property.id === lockedPropertyId) ?? null
    : null;
 
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
 
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
 
  const valid =
    propertyId.length > 0 &&
    unitNumber.trim().length > 0 &&
    Number(rent) >= 0 &&
    Number(deposit) >= 0;
 
  async function handleSubmit() {
    if (!valid || saving) return;
 
    setSaving(true);
    setError("");
 
    try {
      await apiRequest(
        editingUnit ? "/units/" + editingUnit.id : "/units",
        {
          method: editingUnit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            property_id: Number(propertyId),
            unit_number: unitNumber.trim(),
            unit_type: unitType.trim() || null,
            monthly_rent: Number(rent),
            deposit_amount: Number(deposit),
            description: description.trim() || null,
            status,
          }),
        }
      );
 
      onSaved();
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
            <h2 className="mg-drawer__title">
              {editingUnit ? `Edit unit ${editingUnit.unit_number}` : lockedProperty ? `Add a unit to ${lockedProperty.name}` : "Add a unit"}
            </h2>
            <p className="mg-drawer__sub">
              {editingUnit
                ? "Update the standard pricing and details for this unit."
                : "Units always belong to a property and carry the standard pricing a lease will use by default."}
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
            {editingUnit || lockedProperty ? (
              <input
                id="un-property"
                className="mg-input"
                value={(editingUnit ? editingUnit.property?.name : lockedProperty?.name) || "Current property"}
                disabled
                readOnly
              />
            ) : (
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
            )}
            <p className="mg-hint">
              The property stays unchanged when editing a unit.
            </p>
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
              <p className="mg-hint">How this unit is labelled on-site.</p>
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
                placeholder="e.g. One bedroom"
              />
              <p className="mg-hint">Used to group similar units together.</p>
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
              <p className="mg-hint">
                The standard rent a new lease will use unless a lease-specific amount is agreed.
              </p>
            </div>
 
            <div className="mg-field">
              <label className="mg-label" htmlFor="un-deposit">
                Standard deposit
              </label>
              <input
                id="un-deposit"
                className="mg-input"
                type="number"
                min="0"
                value={deposit}
                onChange={(event) => setDeposit(event.target.value)}
                placeholder="45000"
              />
              <p className="mg-hint">
                The standard deposit expected for this unit.
              </p>
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
              <p className="mg-hint">
                Occupied units still need a lease — add that from Tenants.
              </p>
            </div>
          </div>
 
          <div className="mg-field">
            <label className="mg-label" htmlFor="un-description">
              Notes <span className="mg-optional">(optional)</span>
            </label>
            <textarea
              id="un-description"
              className="mg-textarea"
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Anything worth remembering about this unit…"
            />
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
            {editingUnit ? <Pencil /> : <Plus />}
            {saving ? "Saving…" : editingUnit ? "Save changes" : "Add unit"}
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
  const [properties, setProperties] = useState<{ id: number; name: string }[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [drawer, setDrawer] = useState(false);
  const [drawerPropertyId, setDrawerPropertyId] = useState<number | null>(null);
  const [editingUnit, setEditingUnit] = useState<UnitRecord | null>(null);
 
  const propertyFilter = params.get("property") ?? "";
 
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
 
    try {
      // Properties are fetched independently of units so a property with
      // zero units yet still shows up (and can immediately receive one) —
      // deriving the list from `units` alone hid brand-new properties.
      const [unitsPayload, propertiesPayload] = await Promise.all([
        apiRequest("/units"),
        apiRequest("/properties"),
      ]);
      setUnits(parseUnits(unitsPayload));
      setProperties(
        rows(propertiesPayload).map((record) => ({
          id: asNumber(record.id),
          name: asString(record.name) || "Untitled property",
        }))
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load units.");
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => {
    void load();
  }, [load]);
 
  function openAddUnit(propertyId: number | null) {
    setEditingUnit(null);
    setDrawerPropertyId(propertyId);
    setDrawer(true);
  }

  function openEditUnit(unit: UnitRecord) {
    setEditingUnit(unit);
    setDrawerPropertyId(unit.property?.id ?? null);
    setDrawer(true);
  }
 
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
 
  const propertyGroups = useMemo(() => {
    const scoped = propertyFilter
      ? properties.filter((property) => String(property.id) === propertyFilter)
      : properties;
 
    return scoped.map((property) => ({
      property,
      units: visible.filter((unit) => unit.property?.id === property.id),
    }));
  }, [properties, propertyFilter, visible]);
 
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
 
              {properties.length === 0 ? (
                <button
                  type="button"
                  className="mg-btn mg-btn--primary"
                  onClick={() => navigate("/manager/properties/add")}
                >
                  <Building2 />
                  Add a property first
                </button>
              ) : (
                <button
                  type="button"
                  className="mg-btn mg-btn--primary"
                  onClick={() =>
                    openAddUnit(activeProperty ? activeProperty.id : null)
                  }
                >
                  <Plus />
                  {activeProperty ? `Add unit to ${activeProperty.name}` : "Add unit"}
                </button>
              )}
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
 
          {properties.length === 0 ? (
            <section className="mg-panel">
              <div className="mg-empty">
                <Building2 />
                <p className="mg-empty__title">Add a property before adding units</p>
                <p className="mg-empty__text">
                  Units always live under a property. Create your first
                  property, then come back here to build out its unit
                  inventory.
                </p>
                <button
                  type="button"
                  className="mg-btn mg-btn--primary"
                  onClick={() => navigate("/manager/properties/add")}
                >
                  <Plus />
                  Add a property
                </button>
              </div>
            </section>
          ) : loading ? (
            <section className="mg-panel">
              <div className="mg-panel__body">
                {[0, 1, 2, 3].map((key) => (
                  <span
                    key={key}
                    className="mg-skeleton"
                    style={{ height: "2.25rem", marginBottom: "0.625rem" }}
                  />
                ))}
              </div>
            </section>
          ) : (
            propertyGroups.map(({ property, units: groupUnits }) => (
              <section className="mg-panel" key={property.id}>
                <div className="mg-panel__head">
                  <h2 className="mg-panel__title">
                    <DoorOpen />
                    {property.name}
                  </h2>
                  <div className="mg-panel__head-actions">
                    <span className="mg-panel__meta">
                      {groupUnits.length} unit{groupUnits.length === 1 ? "" : "s"}
                    </span>
                    <button
                      type="button"
                      className="mg-btn mg-btn--ghost mg-btn--sm"
                      onClick={() => openAddUnit(property.id)}
                    >
                      <Plus />
                      Add unit
                    </button>
                  </div>
                </div>
 
                {groupUnits.length === 0 ? (
                  <div className="mg-empty">
                    <DoorOpen />
                    <p className="mg-empty__title">
                      {query || status !== "all"
                        ? "No units match this filter"
                        : "No units yet"}
                    </p>
                    <p className="mg-empty__text">
                      {query || status !== "all"
                        ? "Clear the search or status filter to see this property's units."
                        : "Add this property's first unit to start tracking rent and leases."}
                    </p>
                  </div>
                ) : (
                  <div className="mg-tablewrap">
                    <table className="mg-table">
                      <thead>
                        <tr>
                          <th scope="col">Unit</th>
                          <th scope="col">Tenant</th>
                          <th scope="col">Lease ends</th>
                          <th scope="col" className="mg-num">
                            Rent
                          </th>
                          <th scope="col">Status</th>
                          <th scope="col" aria-label="Actions"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupUnits.map((unit) => (
                          <tr key={unit.id}>
                            <td data-label="Unit">
                              <span className="mg-strong">{unit.unit_number}</span>
                              <span className="mg-sub">
                                {unit.unit_type || "Type not set"}
                                {unit.size_sqm > 0 ? ` · ${unit.size_sqm} m²` : ""}
                              </span>
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
                            <td data-label="Actions" className="mg-num">
                              <button
                                type="button"
                                className="mg-iconbtn"
                                onClick={() => openEditUnit(unit)}
                                aria-label={"Edit unit " + unit.unit_number}
                                title="Edit unit"
                              >
                                <Pencil />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))
          )}
        </div>
 
        {drawer && (
          <AddUnitDrawer
            properties={properties}
            lockedPropertyId={drawerPropertyId}
            editingUnit={editingUnit}
            onClose={() => {
              setDrawer(false);
              setEditingUnit(null);
            }}
            onSaved={() => {
              setDrawer(false);
              setEditingUnit(null);
              void load();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
 
export default ManagerUnitsPage;
