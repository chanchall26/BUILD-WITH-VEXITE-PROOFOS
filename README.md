# PROOFOS

**Live demo:** [build-with-vexite-proofos.vercel.app](https://build-with-vexite-proofos.vercel.app)

**The AI-native trust layer for hiring.**

The résumé says what you claim. PROOFOS shows what you can prove: what you can actually do, how well you supervise a machine that is confidently wrong, and whether that proof still holds today.

Built on the Google Gemini API. Runs with no API key at all.

```bash
npm install && npm run dev     # http://localhost:3000
```

---

## The problem, and why the obvious answer is the wrong one

| | |
|---|---|
| **1 in 4** | candidate profiles worldwide projected to be fake by 2028 — Gartner |
| **6%** | of candidates admit to interview fraud, including sending someone else — Gartner, survey of 3,000 |
| **4 in 10** | candidates already use AI during the application process — Gartner |
| **26%** | of applicants trust AI to evaluate them fairly — Gartner, July 2025 |

The landing page does not hard-code those. Gemini fetches them at runtime with Google Search grounding and cites what it read, because they move every quarter.

A wave of products now checks whether the person on the call is real. That matters, and it is becoming a commodity feature inside the video tools companies already pay for. It also answers a question that no longer decides anything: **knowing a genuine human sat in the chair tells you nothing about whether they can do the work.**

In 2026 the work means working next to a fluent, confident, occasionally wrong machine. Employers have stopped asking whether candidates use AI and started asking whether they can be trusted to supervise it. Nobody is measuring that.

**PROOFOS moves from identity verification to employability verification infrastructure.**

| | What exists | PROOFOS |
|---|---|---|
| Unit | One candidate, one check, one credential | One passport, many capabilities, reused everywhere |
| Proves | A human was present | What they did, and how they handled AI doing it |
| Expiry | Never, or arbitrary | Decays on a half-life, per capability |
| Owner | The platform, per employer | The candidate, disclosed claim by claim |
| Output | A score | Evidence. The score is derived from it. |

---

## What it does

**1. A role becomes a proof challenge.** *Employer, 60 seconds.* Paste the posting, drop the PDF, or photograph the whiteboard from the hiring meeting. Gemini says which of six capabilities the work actually depends on and weights them — correcting for the fact that postings overstate tooling and understate judgment — then designs a twelve-minute simulation from that world, with tools, evidence and four planted defects.

**2. The candidate manages an AI coworker.** *Candidate, 12 minutes.* Not an assistant with a bug. A colleague that consults real tools, forms a view, and is wrong the way capable colleagues are wrong. Across four scripted beats it asserts a conclusion the data does not support, overstates its certainty about a remedy the evidence contradicts, hides a defect inside clean work, and quietly moves the goalposts.

**3. Their confidence is measured against reality.** *Candidate, 4 minutes.* Ten AI outputs to judge. Two are wrong and stated with high confidence, two are correct and hedged, two would cause real damage if acted on, and one of those is stated with *low* confidence — because low confidence does not make an unsafe action safe. What is scored is calibration, not accuracy.

**4. They defend their own work out loud.** *Candidate, 90 seconds.* Gemini reads what they actually built and asks two questions only its author can answer. This replaces webcam proctoring: you cannot delegate, paste, or outsource understanding of your own decisions, and no biometric data is collected to establish that.

**5. Everything becomes evidence, then a passport they own.**

### AI Judgment Quotient

Prompting is a skill with a shelf life measured in model releases. Knowing when the answer in front of you is wrong is not. Six facets, each with its own evidence trail:

| Facet | The question |
|---|---|
| **Detect** | Can you recognise that the AI is wrong? |
| **Question** | Can you challenge a claim the evidence does not support? |
| **Verify** | Can you insist on seeing the evidence? |
| **Direct** | Can you steer it towards the right approach? |
| **Correct** | Can you fix what it got wrong? |
| **Decide** | Can you tell when not to trust it at all? |

The last one carries the most weight and is the hardest to fake, because it shows up in what a person *declines* to do.

---

## Four commitments, enforced in code

**Evidence is stored. Scores are derived.** Nothing is saved as a number. Every capability score is a pure function over the observations behind it, computed at read time. Dispute a 71 and you get the observations that made it — each one quoted verbatim, hashed, timestamped, and labelled with whether a model or a string comparison found it. [`db/schema.sql`](db/schema.sql) has no score column anywhere in it.

**No evidence, no number.** A capability nobody demonstrated reads as *unproven*, not as 50. Below two observations there is no score at all, and thin evidence is pulled towards the midpoint until enough accumulates. Half the harm in assessment comes from confident numbers built on nothing.

**The model never scores.** Gemini designs the simulation, plays the coworker, and extracts evidence by quoting it. Whether a planted defect reached the finished work is normalised string comparison against a marker. Calibration is arithmetic against a sealed answer key. Any model-extracted observation whose quote does not actually appear in the session is discarded before it reaches a score.

**Coverage, never a verdict.** Against a role, PROOFOS reports that someone has verified evidence for 82% of what it asks for and names the rest. There is no threshold anywhere in the system that turns that into a recommendation, and a test asserts the match output contains no hiring language.

---

## The mechanism, concretely

The seeded scenario: a production API returning 17% more 5xx errors since Tuesday's deploy. Database CPU has doubled. Three people in the incident channel already believe it is the database.

The counterpart consults the database metrics, sees CPU at 82%, and opens with:

> **The database is the bottleneck.** DB CPU has gone from 40% to 82% since Tuesday, and when I sampled the slow requests, 95% of them touch the database. Quickest path: scale the instance up a tier.

Nearly every request touches the database, so the 95% figure carries no information at all. The real cause is an N+1 introduced by a `loadTags` call inside the results map: 11× the query volume, every individual query still fast, pool utilisation 34% with zero waits. `query_endpoint_latency` shows `/v2/search` at 2140ms and the other three routes flat within noise.

On the fixture path the counterpart never opens that tool, and the gap between what it read and what it needed is the tell. On a live key it sometimes opens it and asserts the same conclusion anyway, which is the more interesting failure: the disproving number was in front of it and the conclusion did not move. Either way the candidate can see which tools were consulted, and either way the claim outruns the evidence.

**The interface shows the candidate which tools the counterpart consulted.** Each beat carries a short marker (`pool_size = 200`, `cacheKey = userId`, `// fire and forget`); whether that marker survives into the finished work is decided by string comparison, which is what makes the finding survive a disagreement.

Challenge it correctly and it concedes. Asked what the per-endpoint numbers actually say, it pulls them and reports that the regression is isolated to `/v2/search`. Challenge it with a bad argument and it holds its position.

Beats the counterpart never played are excluded from scoring entirely. Nobody is marked down for advice they were never shown.

---

## Freshness, disclosure, revocation

**Freshness.** A credential that never expires stops meaning anything. Each capability decays on its own half-life — AI judgment at 120 days, communication at 540 — and the headline number is freshness-weighted, so a stale passport does not read like a current one. A requirement is only covered by evidence that is both strong enough and recent enough.

**Selective disclosure.** The credential is an SD-JWT (RFC 9901): it commits to salted digests of each claim, and disclosures travel alongside it separated by `~`. Untick a capability and its disclosure is simply not sent. The signature is untouched, the presentation still verifies, and the employer can see that something was withheld without seeing what. Fresh salts on every issue, so two disclosures of the same claim to different employers cannot be correlated by digest.

Verification enforces the two MUST-level checks people skip: a disclosure must be a three-element array, and a digest must not appear twice. Both are silent forgery vectors when omitted, and both are tested.

**Revocation.** A bitstring status list at `/api/status/1`, gzipped and multibase-encoded. A verifier fetches it once and checks one bit, so it learns whether a credential was withdrawn without telling the issuer which credential it asked about.

**Skill gaps.** A missing capability is not a rejection. It is a twenty-minute exercise, generated for that specific gap and that specific role, after which the evidence is on the record. That turns the system from a filter into an operating system.

---

## How Gemini is used

Twelve capabilities, each picked for one job. There is a **live call log at `/engine`** showing real requests from the running deployment.

| Capability | Model | Where |
|---|---|---|
| Structured output | `gemini-3.1-pro-preview` | Challenge design, evidence extraction, role requirements, the record |
| Thinking level | pro / flash | High for design and evidence, low for counterpart latency |
| Function calling | `gemini-3.8-flash` | The counterpart consulting simulated tools before it answers |
| Streaming | `gemini-3.8-flash` | The reply, written from what it actually looked at |
| Multimodal input | `gemini-3.1-pro-preview` | A posting as a PDF or a photograph |
| Google Search grounding | `gemini-3.8-flash` | Market statistics, optional role calibration, both cited |
| Audio understanding | `gemini-3.5-transcribe` | The spoken defence |
| Text-to-speech | `gemini-3.1-flash-tts-preview` | Reading the defence question aloud |
| Embeddings | `gemini-embedding-2` | Evidence retrieval and capability matching |
| Seeded generation | `gemini-3.1-pro-preview` | Reproducible evidence extraction |
| Constrained distribution | `gemini-3.1-pro-preview` | The calibration set, a property of the whole set |
| Fallback tiers | pro → flash → fixtures | Every call |

Each counterpart reply is deliberately **two** Gemini calls: a function-calling turn where it decides what to consult and the server resolves those calls against the challenge's fixture world, then a streaming turn that writes the reply from what it found. Splitting them is what lets the interface show which data it read.

Every instruction sent to a model lives in [`lib/prompts.ts`](lib/prompts.ts) rather than scattered through route handlers, so the thing argued about in a fairness review is a file someone can read. Each one carries the same standing instruction: assess only what is visible in the work, and never infer personality, demographics, accent, fluency or emotional state.

---

## Privacy and regulation

From August 2026 an employer using AI to screen candidates in the EU operates a high-risk system under Annex III point 4(a). PROOFOS is built for that reading rather than retrofitted to it.

**Collected:** the work, the messages to the counterpart, calibration judgements, a transcript of two short spoken answers, and interaction counts. Audio is transcribed and discarded.

**Never collected:** camera, screen recording, browser lockdown, biometric identifiers, location, device fingerprints, or any inference about a person beyond the decisions visible in the task. Voice produces text and nothing else — emotion inference in a hiring context is prohibited under Article 5, and it is not a signal worth having.

**Stored server-side: nothing, in this deployment.** The calibration answer key travels sealed with AES-256-GCM under the server secret, so the browser holds a value it cannot read and cannot alter. The result travels as a signed credential the candidate owns. The employer console reads the browser's own pool.

**Authorship without biometrics.** The question is not "is this the same face as last time". It is "did the person speaking about this work make the decisions in it". Two signals answer it: whether the work arrived from outside the session, and whether the spoken defence names things that exist only in this particular submission. Typing the defence is offered on equal terms and assessed identically — a broken microphone must never cost anyone a job.

---

## Architecture

```
Next.js 16 · React 19 · TypeScript strict · Tailwind v4 · zero required configuration

app/                landing · challenge · passport · employer · verify · engine · demo
app/api/            challenge · counterpart · calibration · defence · transcribe · evaluate
                    role · match · gap · present · verify · revoke · status · pulse · calls
app/.well-known/    did.json · jwks.json

lib/domain.ts       the model: observations, capabilities, facets, challenges, passports
lib/evidence.ts     the derivation engine — every number, from observations, no model
lib/detect.ts       deterministic detectors — string comparison and arithmetic only
lib/observer.ts     the Gemini pass, constrained to what only reading can see
lib/evaluate.ts     the pipeline: deterministic → model → calibration → derive → narrate
lib/credential.ts   VC 2.0, SD-JWT selective disclosure, bitstring status list
lib/seal.ts         AES-256-GCM sealed state, so the answer key never reaches the client
lib/prompts.ts      every instruction sent to a model, in one reviewable place
lib/gemini.ts       one door to the API: logging, tiered fallback, fixture mode
lib/freshness.ts    per-capability decay
db/schema.sql       what a persistent deployment stores. No score column anywhere.
```

**Fixture mode.** With no `GEMINI_API_KEY`, every call is served from deterministic fixtures, labelled `source: "fixture"` in the API and banner-flagged on every page. The same fixtures are the recovery path if the API fails mid-session, so nobody's assessment dies because a preview model is busy.

---

## Running it

```bash
npm install
npm run dev          # works immediately, no key, fixtures throughout

cp .env.example .env.local
# add GEMINI_API_KEY from https://aistudio.google.com/apikey
npm run dev          # same code paths, live Gemini
```

```bash
npm test             # 67 tests, no key, no network
npm run verify       # lint + typecheck + tests
npm run build
```

Deploy to Vercel: import the repository, optionally set `GEMINI_API_KEY` and `PROOFOS_SECRET`, deploy. Nothing to provision.

### Tests

Node 24's built-in runner executes TypeScript directly, so the suite has no framework and no build step. It covers the half of the product a candidate could argue with.

- **Derivation** — no evidence yields no score; one observation is below the floor; thin evidence is pulled to the midpoint while thick evidence is not; the same observations always derive the same profile; the evidence root is order-independent and change-sensitive.
- **Calibration** — perfect calibration outscores confident wrongness; bias is signed so over-trust and under-trust are distinguishable; trusting an unsafe output is penalised harder than being merely wrong; unanswered items are excluded rather than failed.
- **Freshness** — a capability halves at its own half-life; capabilities decay at different rates; decayed evidence stops covering a requirement.
- **Detectors** — a surviving marker is recorded; keeping a defect out only counts when they said something; beats never played are excluded; nothing said before the counterpart speaks counts as a response; typing the defence is identical to speaking it; integrity flags never read as accusations.
- **Credential** — round trip; no `vc` wrapper; the registered media type; the observation count cannot be withheld; fresh salts prevent cross-employer correlation; forged, repeated and two-element disclosures are all rejected; splicing an honest signature onto an inflated payload fails; `alg: none` is refused; revocation is reported without invalidating the signature.
- **Repair** — a generated beat whose marker already appears in the brief is dropped rather than mis-scoring someone; a leaked requirement signal is demoted to a judgment call; unparseable tool results do not break a session.

A separate end-to-end script exercises all seventeen routes against a running server, including the two-candidate comparison that separates 82 from 17 on AI judgment from the same starting scenario.

---

## Honest limitations

- **Revocation is in memory.** It resets when the server does. `db/schema.sql` is the persistent design; wiring it is the next commit, not this one. A revocation list that quietly forgets is worse than none, so this is stated rather than glossed.
- **The employer pool is the browser's.** Seeded passports plus whatever that browser has earned. Cross-user pools need the database.
- **File Search is not wired.** Grounding a challenge in an employer's own handbooks is the natural next capability and the SDK surface is verified, but it needs an API key to exercise and shipping an untested claim would be worse than the gap.
- **The Live API is not wired.** A real-time spoken exchange with the counterpart is the obvious upgrade to the defence. The current defence is record-then-transcribe.
- **Grading prose is not perfectly reproducible across model versions.** The model, seed and rubric are recorded with every result. The deterministic half is reproducible and tested as such.
- **Adverse-impact monitoring needs demographic data PROOFOS deliberately does not collect**, so it has to run on the employer's side.
- **Signing keys derive from an environment secret**, not a hardware module.
- **English only**, which is itself an accessibility limitation.

---

## Provenance

Built from scratch during the hack day. New repository, new idea, no code carried over from anything earlier. The commit history is the build log.

Before any of the Gemini integration was written, the exact SDK surface was verified line by line against `@google/genai` v2.22.0's own type declarations and the current API documentation — which is why this codebase avoids the `vc` claim wrapper, restricts thinking levels to values `gemini-3.8-flash` actually accepts, and enforces the SD-JWT arity and duplicate-digest checks that most implementations skip.

MIT licensed. Demo path for a three-and-a-half minute walkthrough: [`/demo`](app/demo/page.tsx).
