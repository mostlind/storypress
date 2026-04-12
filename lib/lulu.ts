import type { ShippingAddress } from "@/types";

const LULU_API_BASE =
  process.env.LULU_API_BASE ?? "https://api.sandbox.lulu.com";
const LULU_CLIENT_KEY = process.env.LULU_CLIENT_KEY!;
const LULU_CLIENT_SECRET = process.env.LULU_CLIENT_SECRET!;

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
  const res = await fetch(
    `${LULU_API_BASE}/auth/realms/glasstree/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: LULU_CLIENT_KEY,
        client_secret: LULU_CLIENT_SECRET,
      }),
    },
  );
  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

export interface LuluOrderOptions {
  orderId: string;
  interiorPdfUrl: string;
  coverPdfUrl: string;
  shippingAddress: ShippingAddress;
  contactEmail: string;
}

export async function submitPrintOrder({
  orderId,
  interiorPdfUrl,
  coverPdfUrl,
  shippingAddress,
  contactEmail,
}: LuluOrderOptions) {
  // Square (8x8), hardcover case wrap, premium color, 80# coated, glossy
  // Full list: https://developers.lulu.com/pages/pod-packages
  const POD_PACKAGE_ID = "0850X0850.FC.PRE.CW.080CW444.GXX";

  const payload = {
    external_id: orderId,
    contact_email: contactEmail,
    line_items: [
      {
        title: "My Storybook",
        quantity: 1,
        printable_normalization: {
          cover: { source_url: coverPdfUrl },
          interior: { source_url: interiorPdfUrl },
          pod_package_id: POD_PACKAGE_ID,
        },
      },
    ],
    shipping_address: {
      name: shippingAddress.name,
      phone_number: shippingAddress.phone,
      street1: shippingAddress.line1,
      street2: shippingAddress.line2 ?? "",
      city: shippingAddress.city,
      state_code: shippingAddress.state,
      postcode: shippingAddress.postal_code,
      country_code: shippingAddress.country,
    },
    shipping_level: "MAIL",
  };

  return luluFetch("/print-jobs/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
