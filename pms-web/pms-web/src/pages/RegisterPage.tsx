import { useState } from "react";
import type { FormEvent } from "react";

function RegisterPage() {
  const [organizationName, setOrganizationName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          organization_name: organizationName,
          name,
          email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          const firstError = Object.values(data.errors)[0] as string[];
          setError(firstError[0]);
        } else {
          setError(data.message || "Registration failed.");
        }

        return;
      }

      // Save authentication information
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem(
        "organization",
        JSON.stringify(data.organization)
      );

      console.log("Registration successful:", data);

      // Temporary success message
      alert("Account created successfully!");

    } catch (error) {
      console.error(error);
      setError(
        "Unable to connect to the server. Make sure Laravel is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          <div className="mb-10 text-center">
            <div className="mb-6 text-2xl font-bold tracking-tight">
              PMS<span className="text-slate-500">.</span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">
              Create your account
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Set up your organization and start managing your properties.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label
                htmlFor="organizationName"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Organization name
              </label>

              <input
                id="organizationName"
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="e.g. Siana Properties"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3.5 text-white outline-none placeholder:text-slate-500 focus:border-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Your name
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3.5 text-white outline-none placeholder:text-slate-500 focus:border-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3.5 text-white outline-none placeholder:text-slate-500 focus:border-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3.5 text-white outline-none placeholder:text-slate-500 focus:border-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="password_confirmation"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Confirm password
              </label>

              <input
                id="password_confirmation"
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder="Confirm your password"
                required
                minLength={8}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3.5 text-white outline-none placeholder:text-slate-500 focus:border-slate-400"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>

          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <button className="font-medium text-white hover:underline">
              Sign in
            </button>
          </p>

        </div>
      </div>
    </main>
  );
}

export default RegisterPage;