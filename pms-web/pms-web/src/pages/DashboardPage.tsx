import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { apiRequest } from "../services/api";

function DashboardPage() {
  const organization = JSON.parse(
    localStorage.getItem("organization") || "{}"
  );

  const [dashboard, setDashboard] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [dashboardData, propertiesData] = await Promise.all([
          apiRequest("/dashboard"),
          apiRequest("/properties"),
        ]);

        setDashboard(dashboardData);
        setProperties(
          Array.isArray(propertiesData)
            ? propertiesData
            : propertiesData.data || []
        );
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const stats = dashboard?.stats || {};

  return (
    <DashboardLayout>
      <div className="p-8">

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-medium text-slate-500">
            Overview
          </p>

          <h1 className="mt-1 text-3xl font-semibold text-slate-900">
            Welcome to {organization.name || "your organization"}
          </h1>

          <p className="mt-2 text-slate-500">
            Manage your properties, tenants, leases and finances from one
            place.
          </p>
        </div>

        {/* Statistics */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">

          {/* Properties */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">
              Properties
            </p>

            <p className="mt-3 text-3xl font-semibold text-slate-900">
              {loading ? "..." : stats.properties ?? 0}
            </p>
          </div>

          {/* Units */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">
              Units
            </p>

            <p className="mt-3 text-3xl font-semibold text-slate-900">
              {loading ? "..." : stats.units ?? 0}
            </p>
          </div>

          {/* Active Tenants */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">
              Active Tenants
            </p>

            <p className="mt-3 text-3xl font-semibold text-slate-900">
              {loading ? "..." : stats.active_tenants ?? 0}
            </p>
          </div>

          {/* Monthly Revenue */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-500">
              Monthly Revenue
            </p>

            <p className="mt-3 text-3xl font-semibold text-slate-900">
              {loading
                ? "..."
                : `KSh ${Number(stats.monthly_revenue ?? 0).toLocaleString()}`}
            </p>
          </div>

        </div>

        {/* Properties */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Properties
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your organization's properties.
              </p>
            </div>
          </div>

          <div className="mt-6">
            {loading ? (
              <p className="text-sm text-slate-500">
                Loading properties...
              </p>
            ) : properties.length === 0 ? (
              <p className="text-sm text-slate-500">
                No properties have been added yet.
              </p>
            ) : (
              <div className="space-y-3">
                {properties.map((property) => (
                  <div
                    key={property.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <p className="font-medium text-slate-900">
                      {property.name}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {property.city}, {property.country}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}

export default DashboardPage;