import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fablebound — Your memories, bound into a storybook",
  description:
    "Fablebound turns your photos and memories into a hand-illustrated hardcover storybook, printed and shipped to your door.",
  alternates: { canonical: "/" },
};

const STEPS = [
  {
    step: "1",
    title: "Tell the story",
    desc: "Chat with our interviewer about the trip, the wedding, the summer, the year. It asks the questions a good friend would.",
  },
  {
    step: "2",
    title: "Add the cast",
    desc: "Upload photos and name the people who matter. We paint a character portrait for each one so they look like themselves on every page.",
  },
  {
    step: "3",
    title: "Watch it illustrate",
    desc: "Twelve story beats, twelve original illustrations — one consistent art style from cover to cover. Don't love a page? Regenerate it.",
  },
  {
    step: "4",
    title: "Hold it in your hands",
    desc: "We print it as an 8×8\" premium-color hardcover and ship it anywhere in the world.",
  },
];

const FEATURES = [
  {
    title: "Characters that stay themselves",
    desc: "Most AI tools redraw a new face every page. Fablebound locks in a reference portrait for each person, so Grandma looks like Grandma on page one and page twelve.",
  },
  {
    title: "One art style, start to finish",
    desc: "Every illustration is painted against the pages that came before it — same palette, same line quality, same world.",
  },
  {
    title: "Written from your own words",
    desc: "No templates and no mad libs. The narrative comes out of your interview, built on the details only you would have mentioned.",
  },
  {
    title: "You stay the editor",
    desc: "Rewrite any beat, correct any illustration, reshape the arc. Nothing goes to print until you say so.",
  },
  {
    title: "Actually a real book",
    desc: "Premium color interior, glossy hardcover, square format — printed by a professional book printer, not a photo kiosk.",
  },
  {
    title: "Private by default",
    desc: "Your photos and your story belong to you. Books are tied to your account and never shown publicly.",
  },
];

const FAQS = [
  {
    q: "How long does it take?",
    a: "The interview takes about ten minutes. Illustrations are usually finished within the hour. Printing and shipping typically takes 5–10 business days depending on where you are.",
  },
  {
    q: "How many pages do I get?",
    a: "Every Fablebound book is twelve illustrated story beats across a 24-page hardcover, plus a printed cover.",
  },
  {
    q: "What if I don't like an illustration?",
    a: "Regenerate it. You can also leave a note — \"she had short hair that summer\", \"the boat was red\" — and we'll repaint the page with the correction.",
  },
  {
    q: "Do I need good photos?",
    a: "Phone photos are fine. They're used as reference for faces, places, and details — the final art is illustrated, not photo-edited, so lighting and framing don't have to be perfect.",
  },
  {
    q: "Can I order more than one copy?",
    a: "Yes. Once a book is finished you can reorder it as many times as you like — handy for siblings, grandparents, and wedding parties.",
  },
  {
    q: "Who owns the book?",
    a: "You do. Your story, your photos, your finished book.",
  },
];

const OCCASIONS = [
  "The honeymoon",
  "A kid's first year",
  "The road trip",
  "Grandpa's stories",
  "The wedding weekend",
  "A dog's whole life",
  "The year we moved",
  "Summer at the lake",
];

const INCLUDED = [
  "8×8\" square hardcover, premium color interior",
  "12 original full-bleed illustrations",
  "A custom story written from your interview",
  "Character portraits for everyone in the book",
  "Unlimited rewrites and regenerations before printing",
  "Printing and shipping included",
];

export default function LandingPage() {
  return (
    <div className="bg-[#fdfaf6] text-stone-800">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-stone-200/70 bg-[#fdfaf6]/85 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Bookmark />
            <span className="text-xl font-semibold tracking-tight text-stone-900">
              Fablebound
            </span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#how" className="text-sm text-stone-600 hover:text-stone-900">
              How it works
            </a>
            <a href="#craft" className="text-sm text-stone-600 hover:text-stone-900">
              The craft
            </a>
            <a href="#pricing" className="text-sm text-stone-600 hover:text-stone-900">
              Pricing
            </a>
            <a href="#faq" className="text-sm text-stone-600 hover:text-stone-900">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-stone-600 hover:text-stone-900">
              Sign in
            </Link>
            <Link
              href="/create"
              className="rounded-full bg-brand-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Start a book
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_40rem_at_70%_-10%,#fae8ff,transparent),radial-gradient(40rem_30rem_at_5%_10%,#fde9c9,transparent)]"
          />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-16 px-6 py-20 md:py-28 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/70 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-brand-700">
                Printed &amp; shipped to your door
              </span>
              <h1 className="mt-6 text-5xl font-semibold leading-[1.05] tracking-tight text-stone-900 md:text-6xl">
                Your memories,
                <br />
                <span className="text-brand-600">bound into a storybook.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone-600">
                Tell Fablebound about a trip, a year, or a person you love. We
                interview you, illustrate twelve original pages in a single
                hand-painted style, and send you a real hardcover book.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/create"
                  className="rounded-full bg-brand-600 px-8 py-4 text-center text-base font-medium text-white shadow-lg shadow-brand-600/20 transition-colors hover:bg-brand-700"
                >
                  Create your storybook
                </Link>
                <a
                  href="#how"
                  className="rounded-full border border-stone-300 bg-white/70 px-8 py-4 text-center text-base font-medium text-stone-700 transition-colors hover:border-stone-400"
                >
                  See how it works
                </a>
              </div>
              <p className="mt-5 text-sm text-stone-500">
                $49.99 per hardcover, printing and shipping included. Free to
                create and preview — nothing prints until you approve it.
              </p>
            </div>

            <BookMockup />
          </div>
        </section>

        {/* Occasions */}
        <section className="border-y border-stone-200/70 bg-white/60">
          <div className="mx-auto w-full max-w-6xl px-6 py-10">
            <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-stone-400">
              Stories worth binding
            </p>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {OCCASIONS.map((occasion) => (
                <li
                  key={occasion}
                  className="rounded-full border border-stone-200 bg-[#fdfaf6] px-4 py-2 text-sm text-stone-600"
                >
                  {occasion}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-24">
          <SectionHeading
            eyebrow="How it works"
            title="Four steps from memory to mailbox"
            subtitle="You do the remembering. Fablebound does the writing, the illustrating, the printing, and the posting."
          />
          <ol className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ step, title, desc }) => (
              <li
                key={step}
                className="rounded-3xl border border-stone-200 bg-white p-7 shadow-sm"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-lg font-semibold text-brand-700">
                  {step}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-stone-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* The craft */}
        <section id="craft" className="scroll-mt-24 border-y border-stone-200/70 bg-white">
          <div className="mx-auto w-full max-w-6xl px-6 py-24">
            <SectionHeading
              eyebrow="The craft"
              title="Why a Fablebound book holds together"
              subtitle="Anyone can make twelve pretty pictures. Making twelve pictures that belong in the same book is the hard part — and it's the part we built the product around."
            />
            <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ title, desc }) => (
                <div
                  key={title}
                  className="rounded-3xl border border-stone-200 bg-[#fdfaf6] p-7"
                >
                  <h3 className="text-base font-semibold text-stone-900">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-stone-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-24">
          <SectionHeading
            eyebrow="Pricing"
            title="One book, one price"
            subtitle="No subscription, no credits, no surprises at checkout."
          />
          <div className="mx-auto mt-14 max-w-xl overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-xl shadow-stone-900/5">
            <div className="bg-brand-600 px-8 py-5 text-center">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100">
                The Fablebound hardcover
              </p>
            </div>
            <div className="px-8 py-10 text-center">
              <p className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-semibold tracking-tight text-stone-900">
                  $49.99
                </span>
                <span className="text-stone-500">per book</span>
              </p>
              <ul className="mx-auto mt-8 space-y-3 text-left">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-stone-700">
                    <Check />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/create"
                className="mt-9 block rounded-full bg-brand-600 px-8 py-4 text-base font-medium text-white transition-colors hover:bg-brand-700"
              >
                Start your book
              </Link>
              <p className="mt-4 text-xs text-stone-500">
                You only pay when you order the print.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 border-t border-stone-200/70 bg-white">
          <div className="mx-auto w-full max-w-3xl px-6 py-24">
            <SectionHeading eyebrow="FAQ" title="Questions, answered" />
            <div className="mt-12 divide-y divide-stone-200 border-y border-stone-200">
              {FAQS.map(({ q, a }) => (
                <details key={q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-medium text-stone-900 [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="shrink-0 text-xl leading-none text-stone-400 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-stone-600">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto w-full max-w-6xl px-6 py-24">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-stone-900 px-8 py-20 text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_25rem_at_50%_0%,rgba(168,85,247,0.35),transparent)]"
            />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight text-white">
                The story is already yours. Let&apos;s give it a spine.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-stone-300">
                Start with a single memory. Ten minutes from now you&apos;ll be
                reading the first page of it.
              </p>
              <Link
                href="/create"
                className="mt-10 inline-block rounded-full bg-white px-9 py-4 text-base font-medium text-stone-900 transition-colors hover:bg-stone-100"
              >
                Create your storybook
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 sm:flex-row">
          <div className="flex items-center gap-2">
            <Bookmark />
            <span className="font-semibold text-stone-900">Fablebound</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-stone-500">
            <a href="#how" className="hover:text-stone-800">
              How it works
            </a>
            <a href="#pricing" className="hover:text-stone-800">
              Pricing
            </a>
            <a href="#faq" className="hover:text-stone-800">
              FAQ
            </a>
            <Link href="/login" className="hover:text-stone-800">
              Sign in
            </Link>
          </div>
          <p className="text-sm text-stone-400">
            © {new Date().getFullYear()} Fablebound
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-600">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-4xl font-semibold tracking-tight text-stone-900">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-lg leading-relaxed text-stone-600">{subtitle}</p>
      ) : null}
    </div>
  );
}

// CSS-only cover art stand-in, so the page ships without needing sample imagery.
function BookMockup() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="relative aspect-square rotate-[-2deg] rounded-l-sm rounded-r-xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-[6px] shadow-2xl shadow-stone-900/25">
        <div className="absolute inset-y-0 left-0 w-4 rounded-l-sm bg-black/20" />
        <div className="flex h-full w-full flex-col items-center justify-center rounded-r-lg bg-gradient-to-b from-[#fef6e7] to-[#f6e3c6] px-10 text-center">
          <p className="text-[0.6rem] font-medium uppercase tracking-[0.35em] text-stone-500">
            A Fablebound book
          </p>
          <div className="my-6 h-px w-16 bg-stone-300" />
          <p className="font-serif text-3xl leading-tight text-stone-800">
            The Summer
            <br />
            We Drove
            <br />
            North
          </p>
          <div className="my-6 h-px w-16 bg-stone-300" />
          <p className="text-xs tracking-wide text-stone-500">
            Illustrated from a true story
          </p>
        </div>
      </div>
      <div className="absolute -bottom-8 -right-2 w-32 rotate-6 rounded-lg border border-stone-200 bg-white p-2 shadow-xl">
        <div className="aspect-square rounded bg-gradient-to-br from-[#cfe4ff] via-[#ffe6c7] to-[#f8cfe0]" />
        <p className="mt-2 text-center text-[0.65rem] text-stone-500">Page 7</p>
      </div>
      <div className="absolute -left-4 bottom-10 w-24 -rotate-6 rounded-lg border border-stone-200 bg-white p-2 shadow-xl">
        <div className="aspect-square rounded bg-gradient-to-br from-[#e6d6ff] via-[#ffd9c0] to-[#cde9d8]" />
        <p className="mt-2 text-center text-[0.65rem] text-stone-500">Page 2</p>
      </div>
    </div>
  );
}

function Bookmark() {
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
        <path d="M6 2.5h9a3 3 0 0 1 3 3v15.2a.8.8 0 0 1-1.25.66L12 18.1l-4.75 3.26A.8.8 0 0 1 6 20.7V2.5Z" />
      </svg>
    </span>
  );
}

function Check() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.79 6.8-6.8a1 1 0 0 1 1.4 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
