import type { ShippingAddress } from "@/types";

const LULU_API_BASE = "https://api.lulu.com";

async function luluFetch(path: string, options: RequestInit = {}) {
  const token = await getLuluAccessToken();
  const res = await fetch(`${LULU_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Lulu API error ${res.status}: ${error}`);
  }
  return res.json();
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getLuluAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }
  const res = await fetch(`${LULU_API_BASE}/auth/realms/glasstree/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.LULU_CLIENT_KEY!,
      client_secret: process.env.LULU_CLIENT_SECRET!,
    }),
  });
  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

export interface LuluOrderOptions {
  pdfUrl: string;
  shippingAddress: ShippingAddress;
  pageCount: number;
  contactEmail: string;
}

export async function submitPrintOrder({
  pdfUrl,
  shippingAddress,
  pageCount,
  contactEmail,
}: LuluOrderOptions) {
  // Square (8x8), hardcover case wrap, premium color, 80# coated, glossy — 24pp
  // Full list: https://developers.lulu.com/pages/pod-packages
  const POD_PACKAGE_ID = "0800X0800FCPREMCS060UW444GXX";

  return luluFetch("/print-jobs/", {
    method: "POST",
    body: JSON.stringify({
      contact_email: contactEmail,
      line_items: [
        {
          title: "My Storybook",
          cover: pdfUrl, // Lulu requires separate cover PDF for some formats
          interior: pdfUrl,
          pod_package_id: POD_PACKAGE_ID,
          quantity: 1,
          page_count: pageCount,
        },
      ],
      shipping_address: {
        name: shippingAddress.name,
        street1: shippingAddress.line1,
        street2: shippingAddress.line2 ?? "",
        city: shippingAddress.city,
        state_code: shippingAddress.state,
        postcode: shippingAddress.postal_code,
        country_code: shippingAddress.country,
      },
      shipping_option: "MAIL",
    }),
  });
}
