import React from "react";

// Genuine assets used by the INSPIRED Vibe Visibility Assessment.
export const VISIBILITY_LOGO = "https://buildyourbusiness.inspiredvibe.com/hs-fs/hubfs/logiimg.png?width=325&height=73&name=logiimg.png";
export const VISIBILITY_STAR = "https://buildyourbusiness.inspiredvibe.com/hs-fs/hubfs/starimg.png?width=55&height=63&name=starimg.png";

export function VisibilityLogo() {
  return <img src={VISIBILITY_LOGO} alt="INSPIRED Vibe — Business Development Agency" width={325} height={72} className="visibility-logo block h-auto w-[240px] max-w-full sm:w-[325px]" />;
}
export function VisibilityStar() {
  return <img src={VISIBILITY_STAR} alt="" aria-hidden="true" width={55} height={63} className="visibility-star h-auto w-9 shrink-0 sm:w-[55px]" />;
}
