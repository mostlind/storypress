"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { ShippingAddress } from "@/types";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ── Step 1: Shipping + email form ────────────────────────────────────────────

export default function OrderForm({ projectId }: { projectId: string }) {
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState<ShippingAddress>({
    name: "", phone: "", line1: "", line2: "", city: "", state: "", postal_code: "", country: "US",
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
    return (
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: "stripe",
            variables: { colorPrimary: "#9333ea" },
          },
        }}
      >
        <PaymentForm clientSecret={clientSecret} />
      </Elements>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
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

      {(["name", "phone", "line1", "line2", "city", "state", "postal_code"] as const).map((field) => (
        <div key={field}>
          <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
            {field.replace("_", " ")}
            {field === "line2" ? " (optional)" : field === "postal_code" ? " (zip)" : ""}
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
        {loading ? "Processing..." : "Continue to payment — $49.99"}
      </button>
    </form>
  );
}

// ── Step 2: Stripe payment form ───────────────────────────────────────────────

function PaymentForm({ clientSecret }: { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders/confirmation`,
      },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed");
      setLoading(false);
      return;
    }

    setSucceeded(true);
    setLoading(false);
  }

  if (succeeded) {
    return (
      <div className="p-6 bg-green-50 rounded-xl text-green-700 max-w-md">
        <p className="font-semibold text-lg mb-1">Order placed!</p>
        <p className="text-sm text-green-600">
          You'll receive a confirmation email when your book ships. It usually takes 5–7 business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <PaymentElement />

      <button
        type="submit"
        disabled={loading || !stripe}
        className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "Processing..." : "Pay $49.99"}
      </button>
    </form>
  );
}
