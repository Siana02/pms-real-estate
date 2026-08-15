function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="flex items-center justify-between px-8 py-6 lg:px-16">
        <div className="text-xl font-bold tracking-tight">
          PMS<span className="text-slate-500">.</span>
        </div>

        <button className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium hover:bg-slate-900">
          Sign in
        </button>
      </nav>

      <section className="mx-auto flex min-h-[calc(100vh-88px)] max-w-6xl items-center px-8 py-16 lg:px-16">
        <div className="max-w-3xl">
          <p className="mb-6 text-sm font-medium uppercase tracking-[0.3em] text-slate-400">
            Property Management, Simplified
          </p>

          <h1 className="text-5xl font-semibold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Everything your
            <br />
            properties need.
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-8 text-slate-400">
            Manage properties, units, tenants, leases, payments, expenses,
            and maintenance from one powerful workspace.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <button className="rounded-xl bg-white px-7 py-3.5 font-semibold text-slate-950 transition hover:bg-slate-200">
              Create an account
            </button>

            <button className="rounded-xl border border-slate-700 px-7 py-3.5 font-semibold text-white transition hover:bg-slate-900">
              Sign in
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;