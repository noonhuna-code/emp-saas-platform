"use client";

import { useEffect } from "react";

const revealSelector = [
  "main section.section",
  "main .surface",
  "main [data-screenshot-slot]",
  "footer .surface",
  "footer [data-footer-reveal]"
].join(", ");

export function MotionOrchestrator() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const targets = Array.from(document.querySelectorAll<HTMLElement>(revealSelector));

    document.body.dataset.motion = "ready";

    targets.forEach((target, index) => {
      target.classList.add("reveal-up");
      target.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 70}ms`);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -10% 0px"
      }
    );

    targets.forEach((target) => observer.observe(target));

    return () => {
      observer.disconnect();
      delete document.body.dataset.motion;

      targets.forEach((target) => {
        target.classList.remove("reveal-up", "is-visible");
        target.style.removeProperty("--reveal-delay");
      });
    };
  }, []);

  return null;
}
