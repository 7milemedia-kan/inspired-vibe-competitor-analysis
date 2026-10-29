import React, { type FormEvent } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Logo } from "@/components/brand";

export interface CompetitiveProfileProps {
  ownUrl: string;
  competitorUrl: string;
  onOwnUrlChange: (value: string) => void;
  onCompetitorUrlChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset?: () => void;
  isPending: boolean;
  error?: string | null;
}

const navy = "#042d3e";
const cyan = "#16b7c9";
const heading = { fontFamily: 'Balboa, "Arial Narrow", sans-serif' };

function BrandHeader() {
  return <header className="mx-auto flex max-w-6xl items-center gap-3 px-6 pb-10 pt-7 sm:px-10">
    <Logo className="h-8 w-8 text-white" />
    <a href="https://inspiredvibe.com" target="_blank" rel="noopener noreferrer" className="text-xl font-semibold tracking-tight text-white">INSPIRED Vibe</a>
  </header>;
}

export function ProcessingComparison({ ownUrl, competitorUrl }: Pick<CompetitiveProfileProps, "ownUrl" | "competitorUrl">) {
  return <main className="min-h-screen bg-white" style={{ color: navy }}>
    <section style={{ background: navy }} className="text-white">
      <BrandHeader />
      <div className="mx-auto max-w-5xl px-6 pb-16 pt-6 sm:px-10 sm:pb-24" role="status" aria-live="polite">
        <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{ color: cyan }}>Competitive Presence Analysis</p>
        <LoaderCircle className="mt-8 h-10 w-10 animate-spin" aria-hidden="true" style={{ color: cyan }} />
        <h1 className="mt-5 max-w-3xl text-4xl font-bold uppercase leading-tight sm:text-6xl" style={heading}>Comparing your company and your selected competitor…</h1>
        <p className="mt-7 text-base">Your details have been submitted.</p>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/85">We’re reviewing all available public information for your company and your selected competitor using the same scoring criteria.</p>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/85">The comparison will give you a starting point for understanding what buyers can learn before they speak with your team.</p>
      </div>
    </section>
    <section className="mx-auto max-w-5xl px-6 py-12 sm:px-10">
      <h2 className="text-3xl font-bold uppercase" style={heading}>Comparison details</h2>
      <dl className="mt-7 grid gap-7 sm:grid-cols-2">
        <div><dt className="text-sm font-semibold">Your company</dt><dd className="mt-2 break-all text-sm">{ownUrl}</dd></div>
        <div><dt className="text-sm font-semibold">Your selected competitor</dt><dd className="mt-2 break-all text-sm">{competitorUrl}</dd></div>
      </dl>
      <p className="mt-9 border-l-2 pl-4 text-sm leading-relaxed" style={{ borderColor: cyan }}>The comparison looks at what is publicly available, not everything either company knows or delivers.</p>
    </section>
  </main>;
}

export function CompetitiveProfile(props: CompetitiveProfileProps) {
  const { ownUrl, competitorUrl, onOwnUrlChange, onCompetitorUrlChange, onSubmit, isPending, error } = props;
  if (isPending) return <ProcessingComparison ownUrl={ownUrl} competitorUrl={competitorUrl} />;
  const inputClass = "mt-3 block min-h-12 w-full rounded-sm border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-600/25";
  return <main className="min-h-screen bg-white" style={{ color: navy }}>
    <section className="relative overflow-hidden text-white" style={{ background: navy }}>
      <BrandHeader />
      <div className="mx-auto grid max-w-6xl gap-8 px-6 pb-24 pt-4 sm:px-10 sm:pt-8 md:grid-cols-2 md:gap-14 md:pb-32">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{ color: cyan }}>Competitive Presence Profile</p>
          <h1 className="mt-5 max-w-lg text-4xl font-bold uppercase leading-[1.05] sm:text-5xl lg:text-6xl" style={heading}>You’ve watched the masterclass. Now see how your company compares.</h1>
          <span className="mt-6 block text-5xl text-red-600" aria-hidden="true">✶</span>
        </div>
        <div className="space-y-5 text-sm leading-relaxed text-white/90 sm:text-base md:pt-8">
          <p>Enter your company’s website and the website of one competitor your buyers would consider with you.</p>
          <p>We’ll compare both companies using the same public signals and show the existing weighted scores side by side. See where your company scores higher, where your competitor scores higher, and where the comparison deserves a closer look.</p>
          <p className="font-semibold text-white">You don’t need to diagnose the problem first. Start with the two websites below. We’ll take it from there.</p>
        </div>
      </div>
      <svg viewBox="0 0 1440 100" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-12 w-full sm:h-20" aria-hidden="true"><path d="M0 50 C400 -55 850 165 1440 35 L1440 100 L0 100Z" fill="white" stroke={cyan} strokeWidth="6" /></svg>
    </section>

    <form onSubmit={onSubmit} noValidate>
      <section className="mx-auto max-w-6xl px-6 py-10 sm:px-10 sm:py-14">
        <h2 className="text-lg font-semibold">Start with both websites.</h2>
        <p className="mt-2 text-sm text-slate-500">Only the two website fields are required.</p>
        <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-16">
          <section className="flex flex-col border-t-[3px] pt-5" style={{ borderColor: navy }}>
            <h3 className="text-3xl font-bold uppercase" style={heading}>Your company</h3>
            <p className="mt-4 font-semibold">Show us where buyers can find you.</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">Enter your company’s website.</p>
            <div className="mt-7 md:mt-auto md:pt-9">
              <label htmlFor="profile-own-url" className="text-sm font-semibold">Your Company’s Website <span className="text-red-600" aria-hidden="true">*</span></label>
              <input id="profile-own-url" name="ownUrl" data-testid="input-own-url" type="text" inputMode="url" autoComplete="url" required maxLength={300} value={ownUrl} onChange={e => onOwnUrlChange(e.target.value)} placeholder="Your company website" aria-describedby="profile-own-help" className={inputClass} />
              <p id="profile-own-help" className="mt-3 text-xs leading-relaxed text-slate-500">Use the main website buyers visit to learn about your business and your approach.</p>
            </div>
          </section>
          <section className="flex flex-col border-t-[3px] pt-5" style={{ borderColor: cyan }}>
            <h3 className="text-3xl font-bold uppercase" style={heading}>Your selected competitor</h3>
            <p className="mt-4 font-semibold">Who do buyers consider alongside you?</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">Choose one company that a customer would consider as a relevant alternative to your business, not simply the largest or most recognizable name in your industry.</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">This could be a company buyers mention in sales conversations or one competing for the same customers.</p>
            <p className="mt-3 text-sm font-semibold">Your analysis will compare your company with your primary competitor.</p>
            <div className="mt-7">
              <label htmlFor="profile-competitor-url" className="text-sm font-semibold">Competitor’s Website <span className="text-red-600" aria-hidden="true">*</span></label>
              <input id="profile-competitor-url" name="competitorUrl" data-testid="input-url" type="text" inputMode="url" autoComplete="url" required maxLength={300} value={competitorUrl} onChange={e => onCompetitorUrlChange(e.target.value)} placeholder="Competitor website" aria-describedby="profile-competitor-help" className={inputClass} />
              <p id="profile-competitor-help" className="mt-3 text-xs leading-relaxed text-slate-500">Use the website buyers would visit to evaluate this company.</p>
            </div>
          </section>
        </div>
        {error && <p role="alert" className="mt-8 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      </section>
      <section className="px-6 py-12 text-center text-white sm:px-10" style={{ background: navy }}>
        <h2 className="text-3xl font-bold uppercase sm:text-4xl" style={heading}>Ready to see how you compare?</h2>
        <p className="mt-5 text-sm leading-relaxed text-white/85">Check that both websites are correct.</p>
        <p className="mt-2 text-sm text-white/85">Then run your side-by-side comparison.</p>
        <button type="submit" data-testid="button-score" className="mx-auto mt-7 flex min-h-12 w-full max-w-xs items-center justify-between gap-5 rounded-sm bg-[#c6282e] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#a61d25] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Compare My Company <ArrowRight size={22} aria-hidden="true" /></button>
        <p className="mt-5 text-xs font-semibold">Your company. One competitor. The same scoring model, side by side.</p>
        <p className="mt-3 text-xs leading-relaxed text-white/70">Your personalized Competitive Presence Analysis is already included with your Masterclass purchase.</p>
      </section>
    </form>
    <section className="mx-auto grid max-w-6xl gap-7 px-6 py-12 sm:px-10 md:grid-cols-[1fr_2fr] md:gap-16 md:py-16">
      <div><h2 className="max-w-xs text-3xl font-bold uppercase leading-tight" style={heading}>What your scores mean</h2><div className="mt-5 h-1 w-10" style={{ background: cyan }} /></div>
      <div className="space-y-4 text-sm leading-relaxed text-slate-600">
        <p>Your results compare what buyers can find and understand about your company and your selected competitor before speaking with sales. They reflect the public information available for review, not a rating of your product quality, your team’s expertise, or your sales performance.</p>
        <p>A lower score is a reason to look more closely at the public evidence. It is not proof that another company is better.</p>
        <p className="font-semibold" style={{ color: navy }}>The goal is not just a higher number. It is to see what buyers can learn before the call and what your team may still need to explain live.</p>
      </div>
    </section>
  </main>;
}
