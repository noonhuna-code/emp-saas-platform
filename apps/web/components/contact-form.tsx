"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type ContactFormMode = "contact" | "demo";

type FormSnapshot = {
  name: string;
  company: string;
  sourcePath: string;
  mode: ContactFormMode;
};

const teamSizes = ["1-25", "26-100", "101-250", "251-1,000", "1,000+"] as const;
const buyerRoles = ["Founder / CEO", "HR leader", "Operations leader", "Finance lead", "Manager"] as const;
const buyingTimelines = ["Immediate", "This quarter", "Next 6 months", "Researching"] as const;

type ContactFormProps = {
  mode?: ContactFormMode;
};

export function ContactForm({ mode = "demo" }: ContactFormProps) {
  const [submitted, setSubmitted] = useState<FormSnapshot | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const [utmFields, setUtmFields] = useState({
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmContent: "",
    utmTerm: ""
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    setUtmFields({
      utmSource: params.get("utm_source") ?? "",
      utmMedium: params.get("utm_medium") ?? "",
      utmCampaign: params.get("utm_campaign") ?? "",
      utmContent: params.get("utm_content") ?? "",
      utmTerm: params.get("utm_term") ?? ""
    });
  }, []);

  const isDemo = mode === "demo";

  return (
    <div className="surface rounded-[2rem] p-6 sm:p-8" id="request-demo">
      {submitted ? (
        <div
          aria-live="polite"
          className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-6"
          role="status"
        >
          <p className="eyebrow !border-emerald-200 !bg-white !text-emerald-700">
            {submitted.mode === "demo" ? "Demo request captured" : "Message received"}
          </p>
          <h2 className="mt-4 text-2xl font-semibold text-slate-950">
            Thanks, {submitted.name}.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-700">
            {submitted.mode === "demo"
              ? `Your request for ${submitted.company} has been received. Our team can use this information to prepare a more relevant product conversation and follow up with the right next step.`
              : `Your message for ${submitted.company} has been received. The EMP team can now review your context and follow up with the right next step.`}
          </p>
          <button
            className="mt-6 inline-flex items-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:border-slate-950"
            onClick={() => setSubmitted(null)}
            type="button"
          >
            Submit another request
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <p className="eyebrow">{isDemo ? "Book demo" : "Contact"}</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
              {isDemo
                ? "Tell us how your workforce operates today."
                : "Tell us what you need help with."}
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              {isDemo
                ? "Share your structure, team size, and the workflows you want to unify. We&apos;ll shape the conversation around operational fit."
                : "Share your structure, team size, and the questions you want to work through. We&apos;ll route the conversation toward product fit, rollout planning, or direct follow-up."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {(isDemo
                ? ["30-45 minute conversation", "Enterprise rollout fit", "Sales-assisted evaluation"]
                : ["Direct product contact", "Rollout planning", "Buyer questions answered"]
              ).map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <form
            aria-busy={isPending}
            className="grid gap-5"
            data-analytics-form={isDemo ? "demo-request" : "contact-request"}
            onSubmit={async (event) => {
              event.preventDefault();
              setError(null);

              const formData = new FormData(event.currentTarget);
              const name = String(formData.get("name") ?? "").trim();
              const company = String(formData.get("company") ?? "").trim();

              try {
                setIsPending(true);

                const response = await fetch("/api/contact", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    kind: isDemo ? "demo" : "contact",
                    name,
                    email: String(formData.get("email") ?? "").trim(),
                    company,
                    teamSize: String(formData.get("teamSize") ?? "").trim(),
                    buyerRole: String(formData.get("buyerRole") ?? "").trim(),
                    timeline: String(formData.get("timeline") ?? "").trim(),
                    message: String(formData.get("message") ?? "").trim(),
                    sourcePath: String(formData.get("sourcePath") ?? pathname ?? "/"),
                    utmSource: String(formData.get("utmSource") ?? "").trim(),
                    utmMedium: String(formData.get("utmMedium") ?? "").trim(),
                    utmCampaign: String(formData.get("utmCampaign") ?? "").trim(),
                    utmContent: String(formData.get("utmContent") ?? "").trim(),
                    utmTerm: String(formData.get("utmTerm") ?? "").trim(),
                    website: String(formData.get("website") ?? "").trim()
                  })
                });

                const result = (await response.json().catch(() => null)) as
                  | { ok?: boolean; error?: string }
                  | null;

                if (!response.ok || !result?.ok) {
                  throw new Error(result?.error || "Unable to submit your request right now");
                }

                setSubmitted({
                  name: name || "there",
                  company: company || "your team",
                  sourcePath: String(formData.get("sourcePath") ?? pathname ?? "/"),
                  mode
                });

                event.currentTarget.reset();
              } catch (submitError) {
                setError(
                  submitError instanceof Error
                    ? submitError.message
                    : "Unable to submit your request right now"
                );
              } finally {
                setIsPending(false);
              }
            }}
          >
            <input name="sourcePath" type="hidden" value={pathname ?? "/"} />
            <input name="utmSource" type="hidden" value={utmFields.utmSource} />
            <input name="utmMedium" type="hidden" value={utmFields.utmMedium} />
            <input name="utmCampaign" type="hidden" value={utmFields.utmCampaign} />
            <input name="utmContent" type="hidden" value={utmFields.utmContent} />
            <input name="utmTerm" type="hidden" value={utmFields.utmTerm} />
            <input autoComplete="off" className="hidden" name="website" tabIndex={-1} type="text" />

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input
                  autoComplete="name"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-950"
                  name="name"
                  placeholder="Aisha Khan"
                  required
                  type="text"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Work email</span>
                <input
                  autoComplete="email"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-950"
                  name="email"
                  placeholder="aisha@company.com"
                  required
                  type="email"
                />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Company</span>
                <input
                  autoComplete="organization"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-950"
                  name="company"
                  placeholder="Northstar Group"
                  required
                  type="text"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Team size</span>
                <select
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none focus:border-slate-950"
                  defaultValue=""
                  name="teamSize"
                  required
                >
                  <option disabled value="">
                    Select range
                  </option>
                  {teamSizes.map((teamSize) => (
                    <option key={teamSize} value={teamSize}>
                      {teamSize}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Your role</span>
                <select
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none focus:border-slate-950"
                  defaultValue=""
                  name="buyerRole"
                  required
                >
                  <option disabled value="">
                    Select role
                  </option>
                  {buyerRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Buying timeline</span>
                <select
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none focus:border-slate-950"
                  defaultValue=""
                  name="timeline"
                  required
                >
                  <option disabled value="">
                    Select timeline
                  </option>
                  {buyingTimelines.map((timeline) => (
                    <option key={timeline} value={timeline}>
                      {timeline}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Message</span>
              <textarea
                className="min-h-36 resize-y rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-950"
                name="message"
                placeholder="We're replacing spreadsheets for attendance, leave, approvals, and manager visibility across five departments."
                required
              />
            </label>

            {error ? (
              <div
                aria-live="polite"
                className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                role="status"
              >
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <p className="max-w-md text-sm leading-6 text-slate-500">
                {isDemo
                  ? "Share enough context for the team to tailor the conversation around your operating model, rollout timing, and priorities."
                  : "Share enough context for the team to route the message toward the right product, rollout, or support conversation."}
              </p>
              <button
                data-analytics-action="submit-demo-request"
                data-analytics-location="contact-form"
                className="inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
                disabled={isPending}
                type="submit"
              >
                {isPending ? "Sending..." : isDemo ? "Request demo" : "Contact team"}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
