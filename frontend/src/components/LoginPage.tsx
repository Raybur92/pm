"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        router.push("/");
      } else {
        setError("Invalid username or password");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#209dd7] to-[#753991] px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-center text-3xl font-bold text-[#032147] mb-2">
            Kanban Studio
          </h1>
          <p className="text-center text-[#888888] text-sm mb-8">
            Sign in to your project
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-[#032147] mb-2"
              >
                Username
              </label>
              <input
                id="username"
                data-testid="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="user"
                className="w-full px-4 py-2 border border-[#888888] rounded-lg outline-none focus:border-[#209dd7] focus:ring-2 focus:ring-[#209dd7]/20 transition"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#032147] mb-2"
              >
                Password
              </label>
              <input
                id="password"
                data-testid="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-[#888888] rounded-lg outline-none focus:border-[#209dd7] focus:ring-2 focus:ring-[#209dd7]/20 transition"
                required
              />
            </div>

            {error && (
              <div
                data-testid="error-message"
                className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              data-testid="login-button"
              className="w-full bg-[#753991] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-[#888888] text-xs mt-6">
            Demo credentials: user / password
          </p>
        </div>
      </div>
    </div>
  );
}
