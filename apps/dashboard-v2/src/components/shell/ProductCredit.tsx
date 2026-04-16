"use client";

import { Mail, Phone, UserRound } from "lucide-react";
import { productOwnerContact } from "@/lib/site";

export const ProductCredit = () => {
  return (
    <footer className="overflow-hidden rounded-2xl border border-gray-200 bg-white/92 shadow-sm dark:border-gray-800 dark:bg-gray-900/92">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Product owner
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">
            {productOwnerContact.name}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[640px]">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200">
            <UserRound className="h-4 w-4 shrink-0 text-brand-500 dark:text-brand-400" />
            <span className="truncate">{productOwnerContact.name}</span>
          </div>
          <a
            href={`tel:${productOwnerContact.phone}`}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-sm text-slate-700 transition hover:border-brand-200 hover:bg-brand-50/70 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10"
          >
            <Phone className="h-4 w-4 shrink-0 text-brand-500 dark:text-brand-400" />
            <span className="truncate">{productOwnerContact.phone}</span>
          </a>
          <a
            href={`mailto:${productOwnerContact.email}`}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-sm text-slate-700 transition hover:border-brand-200 hover:bg-brand-50/70 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/10"
          >
            <Mail className="h-4 w-4 shrink-0 text-brand-500 dark:text-brand-400" />
            <span className="truncate">{productOwnerContact.email}</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
