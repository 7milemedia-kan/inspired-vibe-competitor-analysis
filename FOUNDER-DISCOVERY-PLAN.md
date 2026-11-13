# Founder and leadership discovery

## Goal
Preserve the existing two-website comparison and existing pillar weights while adding attributable founder/owner/leadership media evidence. A personal channel must never silently become company-owned media, and fame must never supply points.

## Implemented scope
1. Read role-labelled official leadership/bio pages and company Organization founder structured data.
2. Identify named founders, owners and chief executives, distinguishing their reported role rather than declaring every CEO an owner.
3. Accept a person-specific profile only through an exact-name profile path or the named Person's structured sameAs links; exclude generic company navigation/footer links.
4. Where a company-attributed personal profile exists, run bounded public search for a personal website. Require a full-name page title and a reciprocal link to the same known profile. Search snippets alone earn nothing.
5. On a corroborated personal website, inspect own navigation/header/footer and exact Person.sameAs data, not unrelated interview guests or arbitrary body links.
6. Check a same-site dedicated podcast hub linked in that site's navigation. This establishes leadership-associated podcast evidence, not company ownership or measured brand lift. Readable episode dates and inventory remain separately disclosed.
7. Apply the existing social/video criteria to deduplicated attributed profile evidence; audience counts use the existing maximum, not a sum. Associated podcast evidence uses the existing supplied-show thresholds and maximum, never stacks multiple shows. Overall weights stay unchanged.
8. Display names, reported roles, role evidence, associated profiles, metric availability, podcast source and partial-coverage limits in a distinct report section. Mark leadership-enriched comparisons provisional.
9. Keep fetches behind the existing safe DNS/redirect validation and add a bounded enrichment request/time budget. No credentials, live form submissions or model guesses are needed.

## Verification gate
- TypeScript and production build.
- Existing comparison/UI tests plus offline founder attribution, guest/imposter/adjacent-person rejection, unsafe URLs, podcast rubric and report escaping tests.
- Read-only VaynerMedia discovery smoke test, without submitting the production assessment or creating a lead.
- Independent code review before deployment.
- Confirm Vercel production deployment commit and alias after release.

## Next phases, not claimed implemented
- More comprehensive search/platform/podcast directory adapters and rendered-page fallback where permitted.
- Better handling of identity aliases, ambiguous founders, corporate families, multiple shows, syndicated episodes and role changes.
- Versioned evidence graph with retrieval timestamps, scored observation IDs and per-pillar confidence/coverage.
- Benchmark-driven scoring calibration distinguishing owned media from leadership-associated media and reducing false low scores caused by limited coverage.
- Optional grounded OpenAI extraction for semantic affiliation and topic relevance, with citations, structured validation, cost ceilings and no unsupported model-awarded points.
- Persistent job queue/caching and independent integration validation for reliable larger scans.

## Limitations
Public search may be unavailable or challenged; no access restriction is bypassed. Official pages may omit founders or profiles. A company-attributed role is not independent legal ownership verification. Personal media's commercial effect, engagement quality and unique audience are not measurable from this scan. A verified podcast hub without an accessible feed is not evidence of current cadence and does not deserve an automatic 10/10.
