import React from "react";

// Genuine assets from the approved November 2026 funnel design handoff.
export const VISIBILITY_LOGO = "/brand/iv_logo_white.svg";
export const VISIBILITY_STAR = "/brand/IV-star.svg";

export function VisibilityLogo() {
  return <img src={VISIBILITY_LOGO} alt="INSPIRED Vibe — Business Development Agency" width={325} height={72} className="visibility-logo block h-auto w-[240px] max-w-full sm:w-[325px]" />;
}
export function VisibilityStar() {
  return <img src={VISIBILITY_STAR} alt="" aria-hidden="true" width={55} height={63} className="visibility-star h-auto w-9 shrink-0 sm:w-[55px]" />;
}
