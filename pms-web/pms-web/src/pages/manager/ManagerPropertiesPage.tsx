import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  DoorOpen,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Users,
  Wallet,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";
import { managerStyles } from "../../styles/managerUI";
import {
  asNumber,
  asString,
  formatMoney,
  formatNumber,
  readCurrency,
  rows,
  titleCase,
} from "../../services/format";
 
/* ------------------------------------------------------------------ */
/*  PAGE STYLES                                                        */
/* ------------------------------------------------------------------ */
 
const pageStyles = `
.pr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
  gap: 1rem;
}
 
.pr-card {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  height: 100%;
  padding: 1.25rem;
  border-radius: var(--mg-radius-lg);
  border: 1px solid var(--pms-border-soft);
  background: var(--pms-surface);
  text-align: left;
  transition: border-color 0.2s ease, transform 0.2s ease;
}
 
.pr-card:hover {
  border-color: var(--pms-accent);
  transform: translateY(-2px);
}
 
.pr-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}
 
.pr-card__name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--pms-heading);
  overflow-wrap: anywhere;
}
 
.pr-card__where {
  display: flex;
  align-items: center;
  gap: 0.3125rem;
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: var(--pms-muted);
}
 
.pr-card__where svg { width: 0.8125rem; height: 0.8125rem; flex: none; }
 
.pr-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.625rem;
  padding: 0.75rem 0;
  border-top: 1px solid var(--pms-border-soft);
  border-bottom: 1px solid var(--pms-border-soft);
}
 
.pr-metric__label {
  margin: 0;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--pms-faint);
}
 
.pr-metric__value {
  margin: 0.25rem 0 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--pms-text);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
 
.pr-occ {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-top: auto;
}
 
.pr-occ__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--pms-muted);
}
 
.pr-occ__pct { font-weight: 600; color: var(--pms-heading); }
`;
 
/* ------------------------------------------------------------------ */
/*  TYPES & PARSING                                                     */
/* ------------------------------------------------------------------ */
 
interface PropertyRecord {
  id: number;
  name: string;
  city: string;
  country: string;
  property_type: string;
  units_count: number;
  occupied_units: number;
  vacant_units: number;
  reserved_units: number;
  active_tenants: number;
  monthly_revenue: number;
  potential_monthly_revenue: number;
  occupancy: number;
}
 
function parseProperties(payload: unknown): PropertyRecord[] {
  return rows(payload).map((record) => {
    const units = asNumber(record.units_count);
    const occupied = asNumber(record.occupied_units);
    const reserved = asNumber(record.reserved_units);
 
    return {
      id: asNumber(record.id),
      name: asString(record.name) || "Untitled property",
      city: asString(record.city),
      country: asString(record.country),
      property_type: asString(record.property_type) || "residential",
      units_count: units,
      occupied_units: occupied,
      vacant_units:
        typeof record.vacant_units === "number" ||
        typeof record.vacant_units === "string"
          ? asNumber(record.vacant_units)
          : Math.max(units - occupied - reserved, 0),
      reserved_units: reserved,
      active_tenants: asNumber(record.active_tenants),
      monthly_revenue: asNumber(record.monthly_revenue),
      potential_monthly_revenue: asNumber(record.potential_monthly_revenue),
      occupancy: units > 0 ? Math.round((occupied / units) * 100) : 0,
    };
  });
}
 
/* ------------------------------------------------------------------ */
/*  PAGE                                                                */
/* ------------------------------------------------------------------ */
 
function ManagerPropertiesPage() {
  const navigate = useNavigate();
  const currency = useMemo(readCurrency, []);
 
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
 
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
 
    try {
      const payload = await apiRequest("/properties");
      setProperties(parseProperties(payload));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load properties."
      );
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => {
    void load();
  }, [load]);
 
  const types = useMemo(() => {
    const found = new Set(properties.map((property) => property.property_type));
    return ["all", ...Array.from(found).sort()];
  }, [properties]);
 
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
 
    return properties.filter((property) => {
      if (type !== "all" && property.property_type !== type) return false;
      if (!needle) return true;
 
      return [property.name, property.city, property.country, property.property_type]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [properties, query, type]);
 
  const totals = useMemo(() => {
    const units = properties.reduce((sum, item) => sum + item.units_count, 0);
    const occupied = properties.reduce((sum, item) => sum + item.occupied_units, 0);
    const reserved = properties.reduce((sum, item) => sum + item.reserved_units, 0);
    const revenue = properties.reduce((sum, item) => sum + item.monthly_revenue, 0);
    const potential = properties.reduce(
      (sum, item) => sum + item.potential_monthly_revenue,
      0
    );
 
    return {
      units,
      occupied,
      reserved,
      vacant: properties.reduce((sum, item) => sum + item.vacant_units, 0),
      revenue,
      idle: Math.max(potential - revenue, 0),
      occupancy: units > 0 ? Math.round((occupied / units) * 100) : 0,
    };
  }, [properties]);
 
  return (
    <DashboardLayout>
      <div className="mg-root">
        <style>{managerStyles}</style>
        <style>{pageStyles}</style>
 
        <div className="mg-shell">
          <header className="mg-header">
            <div>
              <span className="mg-eyebrow">
                <Building2 />
                Portfolio
              </span>
              <h1 className="mg-title">Properties</h1>
              <p className="mg-subtitle">
                Every building in your organization with its occupancy, rent roll
                and idle capacity. Open a property to work through its units.
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
                onClick={() => navigate("/manager/properties/add")}
              >
                <Plus />
                Add property
              </button>
            </div>
          </header>
 
          {error && (
            <div className="mg-alert" role="alert">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}
 
          <section className="mg-stats" aria-label="Portfolio summary">
            <article className="mg-stat">
              <p className="mg-stat__label">Properties</p>
              <p className="mg-stat__value">{formatNumber(properties.length)}</p>
            </article>
 
            <article className="mg-stat">
              <p className="mg-stat__label">Units</p>
              <p className="mg-stat__value">{formatNumber(totals.units)}</p>
              <p className="mg-stat__hint">
                {totals.vacant} vacant · {totals.reserved} reserved
              </p>
            </article>
 
            <article className="mg-stat">
              <p className="mg-stat__label">Occupancy</p>
              <p className="mg-stat__value">{totals.occupancy}%</p>
              <p className="mg-stat__hint">
                {totals.occupied}/{totals.units} occupied
              </p>
            </article>
 
            <article className="mg-stat">
              <p className="mg-stat__label">Monthly rent roll</p>
              <p className="mg-stat__value">
                {formatMoney(totals.revenue, currency)}
              </p>
            </article>
 
            <article className="mg-stat">
              <p className="mg-stat__label">Idle rent</p>
              <p className="mg-stat__value">{formatMoney(totals.idle, currency)}</p>
              <p className="mg-stat__hint mg-stat__hint--warn">
                Lost to vacant units
              </p>
            </article>
          </section>
 
          <div className="mg-toolbar">
            <div className="mg-search">
              <Search />
              <label className="mg-label" htmlFor="pr-search" hidden>
                Search properties
              </label>
              <input
                id="pr-search"
                className="mg-input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, city or type…"
              />
            </div>
 
            <div className="mg-chips" role="group" aria-label="Filter by type">
              {types.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`mg-chip${value === type ? " mg-chip--on" : ""}`}
                  onClick={() => setType(value)}
                  aria-pressed={value === type}
                >
                  {value === "all" ? "All" : titleCase(value)}
                </button>
              ))}
            </div>
          </div>
 
          {loading ? (
            <div className="pr-grid">
              {[0, 1, 2].map((key) => (
                <article className="pr-card" key={key}>
                  <span className="mg-skeleton" style={{ width: "60%" }} />
                  <span className="mg-skeleton" style={{ width: "40%" }} />
                  <span className="mg-skeleton" style={{ height: "3rem" }} />
                  <span className="mg-skeleton" style={{ width: "80%" }} />
                </article>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="mg-panel">
              <div className="mg-empty">
                <Building2 />
                <p className="mg-empty__title">
                  {properties.length === 0
                    ? "No properties yet"
                    : "Nothing matches that search"}
                </p>
                <p className="mg-empty__text">
                  {properties.length === 0
                    ? "Add your first building and its units to start tracking leases, rent and maintenance."
                    : "Try a different name, city or property type."}
                </p>
                {properties.length === 0 && (
                  <button
                    type="button"
                    className="mg-btn mg-btn--primary"
                    onClick={() => navigate("/manager/properties/add")}
                  >
                    <Plus />
                    Add property
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="pr-grid">
              {visible.map((property) => (
                <button
                  key={property.id}
                  type="button"
                  className="pr-card"
                  onClick={() =>
                    navigate(`/manager/units?property=${property.id}`)
                  }
                >
                  <div className="pr-card__top">
                    <div>
                      <h2 className="pr-card__name">{property.name}</h2>
                      <p className="pr-card__where">
                        <MapPin />
                        {[property.city, property.country]
                          .filter(Boolean)
                          .join(", ") || "Location not set"}
                      </p>
                    </div>
                    <span className="mg-badge">
                      {titleCase(property.property_type)}
                    </span>
                  </div>
 
                  <div className="pr-metrics">
                    <div>
                      <p className="pr-metric__label">Units</p>
                      <p className="pr-metric__value">
                        {property.occupied_units}/{property.units_count}
                      </p>
                    </div>
                    <div>
                      <p className="pr-metric__label">Tenants</p>
                      <p className="pr-metric__value">{property.active_tenants}</p>
                    </div>
                    <div>
                      <p className="pr-metric__label">Rent</p>
                      <p className="pr-metric__value">
                        {formatMoney(property.monthly_revenue, currency)}
                      </p>
                    </div>
                  </div>
 
                  <div className="pr-occ">
                    <div className="pr-occ__row">
                      <span>Occupancy</span>
                      <span className="pr-occ__pct">{property.occupancy}%</span>
                    </div>
                    <div
                      className="mg-progress"
                      role="progressbar"
                      aria-valuenow={property.occupancy}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${property.name} occupancy`}
                    >
                      <div
                        className="mg-progress__bar"
                        style={{ width: `${property.occupancy}%` }}
                      />
                    </div>
                    <div className="pr-occ__row">
                      <span>
                        {property.vacant_units} vacant ·{" "}
                        {property.reserved_units} reserved ·{" "}
                        {formatMoney(
                          Math.max(
                            property.potential_monthly_revenue -
                              property.monthly_revenue,
                            0
                          ),
                          currency
                        )}{" "}
                        idle
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
 
          <section className="mg-panel" aria-label="Quick links">
            <div className="mg-panel__head">
              <h2 className="mg-panel__title">
                <Wallet />
                Next steps
              </h2>
            </div>
            <div className="mg-panel__body mg-toolbar">
              <button
                type="button"
                className="mg-btn mg-btn--ghost"
                onClick={() => navigate("/manager/units")}
              >
                <DoorOpen />
                All units
              </button>
              <button
                type="button"
                className="mg-btn mg-btn--ghost"
                onClick={() => navigate("/manager/tenants")}
              >
                <Users />
                Tenants
              </button>
              <button
                type="button"
                className="mg-btn mg-btn--ghost"
                onClick={() => navigate("/manager/leases")}
              >
                <Building2 />
                Leases
              </button>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
 
export default ManagerPropertiesPage;
