"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SkeletonLoader } from "@/components/ui/SkeletonLoader";

export const LazyVisual = ({
  minHeight = 140,
  children
}: {
  minHeight?: number;
  children: ReactNode;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "120px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ minHeight }}>
      {visible ? children : <SkeletonLoader rows={3} />}
    </div>
  );
};

export type FlowStep = {
  label: string;
  state: "done" | "active" | "pending" | "blocked";
};

export const FlowStepper = ({
  title,
  steps
}: {
  title: string;
  steps: FlowStep[];
}) => {
  return (
    <div className="flow-stepper">
      <p className="flow-stepper__title">{title}</p>
      <div className="flow-stepper__row">
        {steps.map((step, index) => (
          <div className="flow-stepper__step-wrap" key={`${title}-${step.label}`}>
            <div className={`flow-step flow-step--${step.state}`}>
              <span className="flow-step__dot" aria-hidden="true" />
              <span className="flow-step__label">{step.label}</span>
            </div>
            {index < steps.length - 1 ? <span className="flow-stepper__connector" aria-hidden="true" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
};
