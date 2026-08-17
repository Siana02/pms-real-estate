import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { apiRequest } from "../../services/api";
import { managerStyles } from "../../styles/managerUI";
import {
  asNumber,
  asString,
  daysBetween,
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
 
interface ExpenseRecord {
  id: number;
  property: { id: number; name: string } | null;
  amount: number;
  expense_date: string | null;
  category: string;
  vendor: string | null;
  reference: string | null;
  notes: string | null;
}
 
const CATEGORIES = [
  "repairs",
  "utilities",
  "security",
  "cleaning",
  "legal",
  "taxes",
  "insurance",
  "other",
];
 
const RANGES: { id: string; label: string; days: number }[] = [
  { id: "30", label: "Last 30 days", days: 30 },
  { id: "90", label: "Last 90 days", days: 90 },
  { id: "365", label: "Last 12 months", days: 365 },
  { id: "all", label: "All time", days: 0 },
];
 
function parseExpenses(payload: unknown): ExpenseRecord[] {
  return rows(payload).map((record) => ({
    id: asNumber(record.id),
    property: namedRef(record.property, "name"),
    amount: asNumber(record.amount),
    expense_date: asString(record.expense_date) || null,
    category: asString(record.category) || "other",
    vendor: asString(record.vendor) || null,
    reference: asString(record.reference) || null,
    notes: asString(record.notes) || asString(record.description) || null,
  }));
}
 
/* ------------------------------------------------------------------ */
/*  ADD EXPENSE DRAWER                                                  */
/* ------------------------------------------------------------------ */
 
interface AddExpenseDrawerProps {
  properties: { id: number; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}
 
function AddExpenseDrawer({
  properties,
  onClose,
  onCreated,
}: AddExpenseDrawerProps) {
  const [propertyId, setPropertyId] = useState(
    properties.length > 0 ? String(properties[0].id) : ""
  );
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("repairs");
  const [vendor, setVendor] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
 
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
 
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
 
  const valid = Number(amount) > 0 && date.length > 0;
 
  async function handleSubmit() {
    if (!valid || saving) return;
 
    setSaving(true);
    setError("");
 
    try {
      await apiRequest("/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: propertyId ? Number(propertyId) : null,
          amount: Number(amount),
          expense_date: date,
          category,
          vendor: vendor.trim() || null,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
        }),
      });
 
      onCreated();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save the expense."
      );
    } finally {
      setSaving(false);
    }
  }
 
  return (
    <div
      className="mg-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Add an expense"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mg-drawer__panel">
        <div className="mg-drawer__head">
          <div>
            <h2 className="mg-drawer__title">Add an expense</h2>
            <p className="mg-drawer__sub">
              Costs are recorded against a property so net income per building
              stays accurate.
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
            <label className="mg-label" htmlFor="ex-property">
              Property
            </label>
            <select
              id="ex-property"
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
              <label className="mg-label" htmlFor="ex-amount">
                Amount
              </label>
              <input
                id="ex-amount"
                className="mg-input"
                type="number"
                min="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="34000"
              />
            </div>
 
            <div className="mg-field">
              <label className="mg-label" htmlFor="ex-date">
                Date
              </label>
              <input
                id="ex-date"
                className="mg-input"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
          </div>
 
          <div className="mg-grid2">
            <div className="mg-field">
              <label className="mg-label" htmlFor="ex-category">
                Category
              </label>
              <select
                id="ex-category"
                className="mg-select"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {titleCase(value)}
                  </option>
                ))}
              </select>
            </div>
 
            <div className="mg-field">
              <label className="mg-label" htmlFor="ex-vendor">
                Vendor
              </label>
              <input
                id="ex-vendor"
                className="mg-input"
                value={vendor}
                onChange={(event) => setVendor(event.target.value)}
                placeholder="Who was paid"
              />
            </div>
          </div>
 
          <div className="mg-field">
            <label className="mg-label" htmlFor="ex-ref">
              Invoice / receipt
            </label>
            <input
              id="ex-ref"
              className="mg-input"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="INV-4410"
            />
          </div>
 
          <div className="mg-field">
            <label className="mg-label" htmlFor="ex-notes">
              Notes
            </label>
            <textarea
              id="ex-notes"
              className="mg-textarea"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What the money was for."
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
            <Plus />
            {saving ? "Saving…" : "Add expense"}
          </button>
        </div>
      </div>
    </div>
  );
}
 
/* ------------------------------------------------------------------ */
/*  PAGE                                                                */
/* ------------------------------------------------------------------ */
 
function ManagerExpensesPage() {
  const currency = useMemo(readCurrency, []);
 
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [range, setRange] = useState("90");
  const [propertyId, setPropertyId] = useState("all");
  const [drawer, setDrawer] = useState(false);
 
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
 
    try {
      const payload = await apiRequest("/expenses");
      setExpenses(parseExpenses(payload));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load expenses."
      );
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => {
    void load();
  }, [load]);
 
  const properties = useMemo(() => {
    const map = new Map<number, string>();
    expenses.forEach((expense) => {
      if (expense.property) map.set(expense.property.id, expense.property.name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [expenses]);
 
  const scoped = useMemo(() => {
    const selected = RANGES.find((item) => item.id === range);
 
    return expenses.filter((expense) => {
      if (propertyId !== "all" && String(expense.property?.id ?? "") !== propertyId) {
        return false;
      }
      if (!selected || selected.days === 0) return true;
 
      const age = daysBetween(expense.expense_date);
      return age === null || Math.abs(age) <= selected.days;
    });
  }, [expenses, range, propertyId]);
 
  const categories = useMemo(() => {
    const found = new Set(scoped.map((expense) => expense.category));
    return ["all", ...Array.from(found).sort()];
  }, [scoped]);
 
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
 
    return scoped
      .filter((expense) => {
        if (category !== "all" && expense.category !== category) return false;
        if (!needle) return true;
 
        return [
          expense.category,
          expense.vendor ?? "",
          expense.reference ?? "",
          expense.notes ?? "",
          expense.property?.name ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => ((a.expense_date ?? "") < (b.expense_date ?? "") ? 1 : -1));
  }, [scoped, category, query]);
 
  const totals = useMemo(() => {
    const spent = scoped.reduce((sum, expense) => sum + expense.amount, 0);
    const byCategory = new Map<string, number>();
 
    scoped.forEach((expense) => {
      byCategory.set(
        expense.category,
        (byCategory.get(expense.category) ?? 0) + expense.amount
      );
    });
 
    const top = Array.from(byCategory).sort((a, b) => b[1] - a[1])[0];
 
    return {
      spent,
      count: scoped.length,
      average: scoped.length > 0 ? Math.round(spent / scoped.length) : 0,
      topCategory: top ? titleCase(top[0]) : "—",
      topAmount: top ? top[1] : 0,
    };
  }, [scoped]);
 
  return (
    <DashboardLayout>
      <div className="mg-root">
        <style>{managerStyles}</style>
 
        <div className="mg-shell">
          <header className="mg-header">
            <div>
              <span className="mg-eyebrow">
                <Receipt />
                Money out
              </span>
              <h1 className="mg-title">Expenses</h1>
              <p className="mg-subtitle">
                Everything spent keeping the portfolio running, grouped by
                property and category so net income per building is real.
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
              >
                <Plus />
                Add expense
              </button>
            </div>
          </header>
 
          {error && (
            <div className="mg-alert" role="alert">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}
 
          <section className="mg-stats" aria-label="Spending summary">
            <article className="mg-stat">
              <p className="mg-stat__label">Total spent</p>
              <p className="mg-stat__value">{formatMoney(totals.spent, currency)}</p>
              <p className="mg-stat__hint">
                {RANGES.find((item) => item.id === range)?.label}
              </p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Entries</p>
              <p className="mg-stat__value">{formatNumber(totals.count)}</p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Average</p>
              <p className="mg-stat__value">
                {formatMoney(totals.average, currency)}
              </p>
            </article>
            <article className="mg-stat">
              <p className="mg-stat__label">Biggest category</p>
              <p className="mg-stat__value">{totals.topCategory}</p>
              <p className="mg-stat__hint">
                {formatMoney(totals.topAmount, currency)}
              </p>
            </article>
          </section>
 
          <div className="mg-toolbar">
            <div className="mg-search">
              <Search />
              <label className="mg-label" htmlFor="ex-search" hidden>
                Search expenses
              </label>
              <input
                id="ex-search"
                className="mg-input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by vendor, invoice, note or property…"
              />
            </div>
 
            <div className="mg-field" style={{ flex: "0 0 12rem" }}>
              <label className="mg-label" htmlFor="ex-range" hidden>
                Period
              </label>
              <select
                id="ex-range"
                className="mg-select"
                value={range}
                onChange={(event) => setRange(event.target.value)}
              >
                {RANGES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
 
            <div className="mg-field" style={{ flex: "0 0 13rem" }}>
              <label className="mg-label" htmlFor="ex-property-filter" hidden>
                Property
              </label>
              <select
                id="ex-property-filter"
                className="mg-select"
                value={propertyId}
                onChange={(event) => setPropertyId(event.target.value)}
              >
                <option value="all">All properties</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
 
          <div className="mg-chips" role="group" aria-label="Filter by category">
            {categories.map((value) => (
              <button
                key={value}
                type="button"
                className={`mg-chip${value === category ? " mg-chip--on" : ""}`}
                onClick={() => setCategory(value)}
                aria-pressed={value === category}
              >
                {value === "all" ? "All categories" : titleCase(value)}
              </button>
            ))}
          </div>
 
          <section className="mg-panel">
            <div className="mg-panel__head">
              <h2 className="mg-panel__title">
                <Receipt />
                Expense ledger
              </h2>
              <span className="mg-panel__meta">
                {visible.length} of {expenses.length}
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
                <Receipt />
                <p className="mg-empty__title">
                  {expenses.length === 0 ? "No expenses yet" : "No expenses match"}
                </p>
                <p className="mg-empty__text">
                  {expenses.length === 0
                    ? "Record what you spend on repairs, utilities and services to see true net income."
                    : "Widen the period or clear the filters to see more entries."}
                </p>
              </div>
            ) : (
              <div className="mg-tablewrap">
                <table className="mg-table">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Category</th>
                      <th scope="col">Property</th>
                      <th scope="col">Vendor</th>
                      <th scope="col" className="mg-num">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((expense) => (
                      <tr key={expense.id}>
                        <td data-label="Date" className="mg-nowrap">
                          {formatDate(expense.expense_date)}
                          {expense.reference && (
                            <span className="mg-sub">{expense.reference}</span>
                          )}
                        </td>
                        <td data-label="Category">
                          <span className="mg-badge">
                            {titleCase(expense.category)}
                          </span>
                          {expense.notes && (
                            <span className="mg-sub">{expense.notes}</span>
                          )}
                        </td>
                        <td data-label="Property">
                          {expense.property?.name ?? "Organization-wide"}
                        </td>
                        <td data-label="Vendor">{expense.vendor ?? "—"}</td>
                        <td data-label="Amount" className="mg-num">
                          <span className="mg-strong">
                            {formatMoney(expense.amount, currency)}
                          </span>
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
          <AddExpenseDrawer
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
 
export default ManagerExpensesPage;