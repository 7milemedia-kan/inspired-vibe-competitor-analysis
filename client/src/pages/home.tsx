import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { API_BASE } from "@/lib/queryClient";
import { assessWebsites } from "@/lib/website-assessment";
import { clearHandoff } from "@/lib/handoff";
import { CompetitiveProfile, ProcessingComparison } from "@/components/competitive-profile";
import { CompetitiveResults } from "@/components/competitive-results";
import type { ScoreResult } from "../../../server/analyze";

const REVIEW_URL = "https://inspiredvibe.com/contact-us/";
type Result = ScoreResult & { scanId?: number | null };

/** Step 4 and 5 presentation. The existing scorer and stored scan format remain unchanged. */
export default function Home() {
  const [ownUrl, setOwnUrl] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const submitted = useRef({ own: "", competitor: "" });
  const mutation = useMutation<
    { competitor: Result; own: Result | null; ownUnavailable: boolean }, Error,
    { own: string; competitor: string }
  >({
    mutationFn: async (values) => assessWebsites<Result>(values.own, values.competitor, async (website) => {
      const response = await fetch(`${API_BASE}/api/score`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: website }), signal: AbortSignal.timeout(295_000),
      });
      if (!response.ok) throw new Error("We couldn’t complete your comparison. Please try again.");
      return response.json();
    }),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setValidationError(null);
    mutation.reset();
    clearHandoff();
    if (!ownUrl.trim()) { setValidationError("Enter your company’s website to continue."); return; }
    if (!competitorUrl.trim()) { setValidationError("Enter your selected competitor’s website to continue."); return; }
    submitted.current = { own: ownUrl.trim(), competitor: competitorUrl.trim() };
    mutation.mutate(submitted.current);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const reset = () => {
    mutation.reset(); setValidationError(null); clearHandoff();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (mutation.isPending) return <ProcessingComparison ownUrl={submitted.current.own} competitorUrl={submitted.current.competitor} />;
  if (mutation.data && !mutation.isError) return <>
    <CompetitiveResults own={mutation.data.own} competitor={mutation.data.competitor}
      ownUrl={submitted.current.own} competitorUrl={submitted.current.competitor} reviewUrl={REVIEW_URL} />
    <div className="bg-[#062f40] px-6 pb-8 text-center"><button type="button" onClick={reset}
      className="rounded border border-white/50 px-5 py-3 text-sm text-white hover:bg-white/10">Compare another company</button></div>
  </>;
  return <CompetitiveProfile ownUrl={ownUrl} competitorUrl={competitorUrl}
    onOwnUrlChange={setOwnUrl} onCompetitorUrlChange={setCompetitorUrl}
    onSubmit={submit} isPending={false}
    error={validationError || (mutation.isError ? mutation.error.message : null)} />;
}
