# Storybook Generator

A web platform that interviews you about a trip or event, generates an illustrated storybook from your story and photos, and ships a printed hardcover copy to your door.

## Stack

- **Next.js 15** — web app and API routes
- **Supabase** — database, auth, and file storage
- **Google Gemini** (`gemini-3.1-flash-image-preview`) — conversational interview + image generation
- **BullMQ + Redis** — background job queue
- **Stripe** — payments
- **Lulu Direct** — print-on-demand fulfillment
- **pdf-lib** — print-ready PDF generation

## Local Development

### Prerequisites

- Node.js 22+
- Docker (for Redis)

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the example env file and fill in your keys:
   ```bash
   cp .env.local.example .env.local
   ```

3. Start Redis:
   ```bash
   docker compose up redis -d
   ```

4. Run the Next.js dev server:
   ```bash
   npm run dev
   ```

5. Run the worker in a separate terminal:
   ```bash
   npm run worker
   ```

6. Forward Stripe webhooks locally:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `GOOGLE_AI_API_KEY` | Google Gemini API key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `LULU_API_BASE` | Lulu API base URL (use `https://api.lulu.com` for production) |
| `LULU_CLIENT_KEY` | Lulu API client key |
| `LULU_CLIENT_SECRET` | Lulu API client secret |
| `REDIS_URL` | Redis connection URL (default: `redis://localhost:6379`) |

## Utility Scripts

Manually enqueue background jobs — useful for retrying failed orders:

```bash
# Re-run storybook generation for a project
npm run enqueue:storybook <projectId>

# Re-generate PDFs for an order (and re-submit to Lulu)
npm run enqueue:pdf <orderId>

# Re-submit an existing order directly to Lulu
npm run enqueue:print <orderId>
```

## Deployment (VPS)

The app runs as four Docker services: **web**, **worker**, **redis**, and **caddy** (for automatic SSL).

### First deploy

1. Provision a VPS (Hetzner CX22 or similar). Point your domain's DNS A record at the server IP.

2. Install Docker on the server:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

3. Clone the repo and add your env file:
   ```bash
   git clone <your-repo>
   cd storybook-generator
   cp .env.local.example .env.local
   # fill in .env.local, then add:
   echo "DOMAIN=yourdomain.com" >> .env.local
   ```

4. Build and start everything:
   ```bash
   docker compose up -d --build
   ```

   Caddy will automatically provision an SSL certificate for your domain.

### Redeploying after a code change

```bash
git pull
docker compose up -d --build web worker
```

This rebuilds only the app containers — Redis data and SSL certs are preserved.

### Viewing logs

```bash
docker compose logs -f          # all services
docker compose logs -f worker   # worker only
docker compose logs -f web      # web only
```
