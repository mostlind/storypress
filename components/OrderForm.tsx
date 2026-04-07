"use client";

import { useState } from "react";
import type { ShippingAddress } from "@/types";

export default function OrderForm({ projectId }: { projectId: string }) {
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState<ShippingAddress>({
    name: "", line1: "", line2: "", city: "", state: "", postal_code: "", country: "US",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, email, shippingAddress: address }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create order");
      setLoading(false);
      return;
    }

    setClientSecret(data.clientSecret);
    setLoading(false);
  }

  if (clientSecret) {
    // In production: render <stripe Elements> payment form here using clientSecret
    return (
      <div className="p-6 bg-green-50 rounded-xl text-green-700">
        <p className="font-medium">Order created! Proceed to payment.</p>
        <p className="text-sm mt-1 text-green-600">
          (Integrate Stripe Elements here using the clientSecret)
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email — for order confirmation
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {(["name", "line1", "line2", "city", "state", "postal_code"] as const).map((field) => (
        <div key={field}>
          <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
            {field.replace("_", " ")}
            {field === "line2" ? " (optional)" : ""}
          </label>
          <input
            value={address[field] ?? ""}
            onChange={(e) => setAddress((a) => ({ ...a, [field]: e.target.value }))}
            required={field !== "line2"}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      ))}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "Processing..." : "Place order — $49.99"}
      </button>
    </form>
  );
}
