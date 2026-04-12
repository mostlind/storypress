import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createPaymentIntent, STORYBOOK_PRICE_CENTS } from "@/lib/stripe";
import { z } from "zod";

const CreateOrderSchema = z.object({
  projectId: z.string().uuid(),
  email: z.string().email(),
  shippingAddress: z.object({
    name: z.string().min(1),
    phone: z.string().min(1),
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    postal_code: z.string().min(1),
    country: z.string().length(2),
  }),
});

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { projectId, email, shippingAddress } = parsed.data;

  // Verify project is ready
  const { data: project } = await supabase
    .from("projects")
    .select("id, status")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (project.status !== "ready") {
    return NextResponse.json({ error: "Storybook is not ready yet" }, { status: 409 });
  }

  // Get storybook
  const { data: storybook } = await supabase
    .from("storybooks")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "ready")
    .single();

  if (!storybook) return NextResponse.json({ error: "Storybook not found" }, { status: 404 });

  // Block duplicate paid orders for the same project
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "paid")
    .limit(1)
    .single();

  if (existingOrder) {
    return NextResponse.json({ error: "This storybook has already been ordered." }, { status: 409 });
  }

  // Create order record
  const { data: order } = await supabase
    .from("orders")
    .insert({
      project_id: projectId,
      storybook_id: storybook.id,
      user_id: user.id,
      contact_email: email,
      status: "pending",
      shipping_address: shippingAddress,
      amount_cents: STORYBOOK_PRICE_CENTS,
    })
    .select()
    .single();

  if (!order) return NextResponse.json({ error: "Failed to create order" }, { status: 500 });

  // Create Stripe payment intent
  const paymentIntent = await createPaymentIntent(order.id);

  await supabase
    .from("orders")
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .eq("id", order.id);

  return NextResponse.json({
    orderId: order.id,
    clientSecret: paymentIntent.client_secret,
    amountCents: STORYBOOK_PRICE_CENTS,
  });
}
