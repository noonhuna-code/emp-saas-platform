import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section">
      <div className="container">
        <div className="surface mx-auto max-w-2xl rounded-[2rem] p-10 text-center">
          <p className="eyebrow">Page not found</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            The page you requested is not available.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Head back to the EMP marketing site and continue exploring the platform, modules, and
            demo flow.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              className="inline-flex items-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              href="/"
            >
              Go home
            </Link>
            <Link
              className="inline-flex items-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:border-slate-950"
              href="/demo"
            >
              Book demo
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
