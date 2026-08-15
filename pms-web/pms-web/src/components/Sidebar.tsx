function Sidebar() {
  const organization = JSON.parse(
    localStorage.getItem("organization") || "{}"
  );

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-950 text-white">

      {/* Logo */}
      <div className="border-b border-slate-800 px-6 py-6">
        <div className="text-2xl font-bold tracking-tight">
          PMS<span className="text-slate-500">.</span>
        </div>
      </div>

      {/* Organization */}
      <div className="border-b border-slate-800 px-6 py-5">
        <p className="text-xs uppercase tracking-wider text-slate-500">
          Organization
        </p>

        <p className="mt-2 truncate font-medium">
          {organization.name || "Your Organization"}
        </p>

        <p className="mt-1 truncate text-xs text-slate-500">
          {user.email || ""}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-5">

        <a
          href="#"
          className="block rounded-lg bg-slate-800 px-3 py-2.5 text-sm font-medium"
        >
          Dashboard
        </a>

        <a
          href="#"
          className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          Properties
        </a>

        <a
          href="#"
          className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          Units
        </a>

        <a
          href="#"
          className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          Tenants
        </a>

        <a
          href="#"
          className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          Leases
        </a>

        <a
          href="#"
          className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          Payments
        </a>

        <a
          href="#"
          className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          Expenses
        </a>

        <a
          href="#"
          className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          Maintenance
        </a>

      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-800 p-4">

        <a
          href="#"
          className="block rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          Settings
        </a>

        <button
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("organization");
            window.location.href = "/login";
          }}
          className="mt-1 w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-400 hover:bg-slate-900 hover:text-white"
        >
          Sign out
        </button>

      </div>

    </aside>
  );
}

export default Sidebar;