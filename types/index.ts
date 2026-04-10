export type ProjectStatus =
  | "draft"
  | "generating"
  | "ready"
  | "failed"
  | "ordered"
  | "printing"
  | "shipped";

export type OrderStatus =
  | "pending"
  | "paid"
  | "submitted_to_printer"
  | "printing"
  | "shipped"
  | "delivered"
  | "failed";

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: string;
  project_id: string;
  storage_path: string;
  public_url: string;
  order: number;
  caption: string | null;
  created_at: string;
}

export interface StoryBeat {
  text: string;
  image_path: string | null; // storage path in "storybooks" bucket
}

export interface Storybook {
  id: string;
  project_id: string;
  beats: StoryBeat[];
  cover_image_path: string | null;
  pdf_path: string | null;
  status: "generating" | "generating_images" | "ready" | "failed";
  created_at: string;
}

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface Order {
  id: string;
  project_id: string;
  storybook_id: string;
  stripe_payment_intent_id: string;
  lulu_order_id: string | null;
  status: OrderStatus;
  shipping_address: ShippingAddress;
  amount_cents: number;
  created_at: string;
}
