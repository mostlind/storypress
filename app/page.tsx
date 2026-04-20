import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center">
      {/* Nav */}
      <nav className="w-full max-w-6xl flex items-center justify-between px-6 py-4">
        <span className="text-xl font-bold text-brand-700">Storybook</span>
        <div className="flex gap-4">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 py-24 max-w-3xl">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-6">
          Your memories,{" "}
          <span className="text-brand-600">beautifully printed</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10">
          Upload your photos, describe your story, and we'll turn it into a
          hardcover storybook delivered to your door — powered by AI.
        </p>
        <Link
          href="/create"
          className="bg-brand-600 text-white text-lg px-8 py-4 rounded-xl hover:bg-brand-700 transition-colors"
        >
          Create your storybook
        </Link>
      </section>

      {/* How it works */}
      <section className="w-full max-w-4xl px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: "1", title: "Tell your story", desc: "Describe your trip, gathering, or event in a few sentences." },
            { step: "2", title: "Upload your photos", desc: "Add photos of the people, places, and moments that matter." },
            { step: "3", title: "We do the rest", desc: "AI writes the narrative and designs the layout. We print and ship it." },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex flex-col items-center text-center p-6 rounded-2xl bg-brand-50">
              <div className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center text-xl font-bold mb-4">
                {step}
              </div>
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-gray-500 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
