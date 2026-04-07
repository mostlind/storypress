import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

// Print cost: $15.51 (Lulu square hardcover, 24pp, premium color, glossy)
// Pricing: $49.99 gives ~$34 margin before payment processing fees
export const STORYBOOK_PRICE_CENTS = 4999; // $49.99

export async function createPaymentIntent(orderId: string) {
  return stripe.paymentIntents.create({
    amount: STORYBOOK_PRICE_CENTS,
    currency: "usd",
    metadata: { orderId },
  });
}
