import type { FAQItem } from "@/lib/content";

type FAQListProps = {
  items: FAQItem[];
};

export function FAQList({ items }: FAQListProps) {
  return (
    <div className="grid gap-4">
      {items.map((item, index) => (
        <details
          key={item.question}
          className="group rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur"
          open={index === 0}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-lg font-semibold text-slate-950">
            <span>{item.question}</span>
            <span className="text-2xl leading-none text-teal-700 transition group-open:rotate-45">+</span>
          </summary>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
