"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PricingTier } from "@/lib/content";

type PricingPersona = {
  id: string;
  label: string;
  title: string;
  description: string;
  recommendedPlan: string;
};

type PricingComparisonRow = {
  feature: string;
  starter: string;
  growth: string;
  enterprise: string;
};

type PricingComparisonGroup = {
  id: string;
  label: string;
  rows: readonly string[];
};

type PricingExperienceProps = {
  tiers: readonly PricingTier[];
  personas: readonly PricingPersona[];
  comparisonRows: readonly PricingComparisonRow[];
  comparisonGroups: readonly PricingComparisonGroup[];
};

export function PricingExperience({
  tiers,
  personas,
  comparisonRows,
  comparisonGroups
}: PricingExperienceProps) {
  const [activePersonaId, setActivePersonaId] = useState(personas[1]?.id ?? personas[0]?.id);
  const [activeGroupId, setActiveGroupId] = useState(comparisonGroups[0]?.id ?? "");

  const activePersona = useMemo(
    () => personas.find((persona) => persona.id === activePersonaId) ?? personas[0],
    [activePersonaId, personas]
  );

  const activeGroup = useMemo(
    () => comparisonGroups.find((group) => group.id === activeGroupId) ?? comparisonGroups[0],
    [activeGroupId, comparisonGroups]
  );

  const visibleRows = useMemo(() => {
    if (!activeGroup) return comparisonRows;

    return activeGroup.rows
      .map((feature) => comparisonRows.find((row) => row.feature === feature))
      .filter((row): row is PricingComparisonRow => Boolean(row));
  }, [activeGroup, comparisonRows]);

  return (
    <section className="section">
      <div className="container">
        <div className="rounded-[2.2rem] border border-slate-200/80 bg-white/82 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] xl:items-end">
            <div className="max-w-xl">
              <p className="eyebrow">Pricing experience</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Choose the plan that matches your rollout shape, not just your headcount.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Start with the buying situation closest to your team. The plan cards, comparison,
                and guidance below all respond to that view so the commercial story feels easier to
                evaluate.
              </p>
            </div>

            <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50/90 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <div className="grid gap-2 md:grid-cols-3">
                {personas.map((persona) => {
                  const isActive = persona.id === activePersona?.id;

                  return (
                    <button
                      key={persona.id}
                      className={`rounded-[1.3rem] px-4 py-4 text-left transition ${
                        isActive
                          ? "bg-slate-950 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]"
                          : "bg-white text-slate-700 hover:bg-slate-100"
                      }`}
                      onClick={() => setActivePersonaId(persona.id)}
                      type="button"
                    >
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                          isActive ? "text-slate-300" : "text-teal-700"
                        }`}
                      >
                        {persona.label}
                      </p>
                      <p className="mt-2 text-sm font-medium leading-6">{persona.title}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-[1.8rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Recommended path
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                  {activePersona?.recommendedPlan} is usually the right commercial starting point.
                </h3>
                <p className="mt-4 text-base leading-7 text-slate-300">{activePersona?.description}</p>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Buyer focus
                </p>
                <p className="mt-2 text-lg font-semibold text-white">{activePersona?.title}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {tiers.map((tier) => {
              const isPersonaRecommended = tier.name === activePersona?.recommendedPlan;
              const isFeatured = tier.featured || isPersonaRecommended;

              return (
                <article
                  key={tier.name}
                  className={`group rounded-[2rem] border p-6 transition duration-300 ${
                    isFeatured
                      ? "border-slate-950 bg-slate-950 text-white shadow-[0_30px_100px_rgba(15,23,42,0.18)]"
                      : "border-slate-200/80 bg-white text-slate-950 shadow-[0_20px_60px_rgba(15,23,42,0.06)] hover:-translate-y-1 hover:shadow-[0_24px_80px_rgba(15,23,42,0.1)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                          isFeatured ? "text-slate-300" : "text-teal-700"
                        }`}
                      >
                        {tier.name}
                      </p>
                      <p className="mt-4 text-4xl font-semibold tracking-tight">{tier.price}</p>
                      <p className={`mt-2 text-sm ${isFeatured ? "text-slate-300" : "text-slate-500"}`}>
                        {tier.cadence}
                      </p>
                    </div>
                    {(tier.featured || isPersonaRecommended) && (
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                          isFeatured
                            ? "border border-white/12 bg-white/10 text-white"
                            : "border border-slate-200 bg-slate-50 text-slate-950"
                        }`}
                      >
                        {isPersonaRecommended ? "Recommended" : "Popular"}
                      </span>
                    )}
                  </div>

                  <p className={`mt-6 text-sm font-medium leading-7 ${isFeatured ? "text-white" : "text-slate-800"}`}>
                    {tier.audience}
                  </p>
                  <p className={`mt-3 text-base leading-7 ${isFeatured ? "text-slate-300" : "text-slate-600"}`}>
                    {tier.description}
                  </p>

                  {tier.highlight ? (
                    <div
                      className={`mt-5 rounded-[1.4rem] px-4 py-4 text-sm leading-7 ${
                        isFeatured
                          ? "border border-white/10 bg-white/5 text-slate-200"
                          : "border border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      {tier.highlight}
                    </div>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                        isFeatured ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {tier.bestFor}
                    </span>
                  </div>

                  <ul className="mt-6 grid gap-3">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className={`rounded-2xl px-4 py-3 text-sm ${
                          isFeatured
                            ? "border border-white/10 bg-white/5 text-slate-200"
                            : "bg-slate-50 text-slate-700"
                        }`}
                      >
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    className={`mt-7 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition sm:w-auto ${
                      isFeatured
                        ? "bg-white text-slate-950 hover:bg-slate-100"
                        : "bg-slate-950 text-white hover:bg-slate-800"
                    }`}
                    href={tier.cta.href}
                  >
                    {tier.cta.label}
                  </Link>
                </article>
              );
            })}
          </div>

          <div className="mt-10 rounded-[1.9rem] border border-slate-200 bg-white/88 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="eyebrow">Decision support</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                  Compare the areas buyers usually ask about first.
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {comparisonGroups.map((group) => {
                  const isActive = group.id === activeGroup?.id;

                  return (
                    <button
                      key={group.id}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "bg-slate-950 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                      onClick={() => setActiveGroupId(group.id)}
                      type="button"
                    >
                      {group.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-slate-200/80 bg-white">
              <table className="min-w-[720px] w-full border-collapse text-left">
                <thead className="bg-slate-950 text-white">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold">Capability</th>
                    <th className="px-6 py-4 text-sm font-semibold">Starter</th>
                    <th className="px-6 py-4 text-sm font-semibold">Growth</th>
                    <th className="px-6 py-4 text-sm font-semibold">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, index) => (
                    <tr
                      key={row.feature}
                      className={index % 2 === 0 ? "bg-white" : "bg-slate-50/80"}
                    >
                      <th className="px-6 py-4 text-sm font-semibold text-slate-950">{row.feature}</th>
                      <td className="px-6 py-4 text-sm text-slate-700">{row.starter}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{row.growth}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{row.enterprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
