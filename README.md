# PROOFOS

**Live demo:** [build-with-vexite-proofos.vercel.app](https://build-with-vexite-proofos.vercel.app)

**The AI-native trust layer for hiring.**

A résumé tells you what someone *says* they can do. PROOFOS shows you what they can actually **prove** they can do, including the one skill that now matters most: working with an AI that is confident and wrong.

Built entirely on the Google Gemini API. Works with no API key at all.

```bash
npm install && npm run dev     # http://localhost:3000
```

---

## Contents

1. [The problem, in plain words](#1-the-problem-in-plain-words)
2. [Why everyone else is fixing the wrong thing](#2-why-everyone-else-is-fixing-the-wrong-thing)
3. [What PROOFOS actually does](#3-what-proofos-actually-does)
4. [The two new ideas](#4-the-two-new-ideas)
5. [The four rules we never break](#5-the-four-rules-we-never-break)
6. [A real example, start to finish](#6-a-real-example-start-to-finish)
7. [Why this is worth investing in](#7-why-this-is-worth-investing-in)
8. [How Gemini is used](#8-how-gemini-is-used)
9. [Privacy and the law](#9-privacy-and-the-law)
10. [How it is built](#10-how-it-is-built)
11. [Running it yourself](#11-running-it-yourself)
12. [What is finished and what is not](#12-what-is-finished-and-what-is-not)

---

## 1. The problem, in plain words

Hiring used to work like this. You read a résumé, you believed most of it, and you interviewed the people who looked good.

That is over. Anyone can now generate a perfect résumé in ten seconds. The same goes for cover letters, portfolios, take-home tests and GitHub profiles. Companies used to get a hundred applications and filter down to five. Now all hundred look like the five.

Here is what the research says:

| Number | What it means | Source |
|---|---|---|
| **1 in 4** | Candidate profiles worldwide will be fake by 2028 | Gartner |
| **6%** | Candidates who admit to interview fraud, including sending someone else to the interview | Gartner, survey of 3,000 candidates |
| **4 in 10** | Candidates already using AI when they apply | Gartner |
| **26%** | Applicants who trust AI to judge them fairly | Gartner, July 2025 |

And getting it wrong is expensive:

| Number | What it means | Source |
|---|---|---|
| **30% of first-year pay** | The minimum cost of one bad hire | US Department of Labor |
| **50% to 200% of salary** | The full cost of replacing an employee | SHRM |
| **$5,475** | Average cost to hire one non-executive person | SHRM 2025 Benchmarking Report |

So companies are paying more per hire, for signals that are worth less than ever.

Our landing page does not hard-code those first four numbers. Gemini searches for them live and shows you where it got them, because these figures change every few months.

---

## 2. Why everyone else is fixing the wrong thing

A lot of new products check **whether the person on the video call is a real human**. They watch your webcam. They lock your browser. They match your face.

Two problems with that.

**First, it is becoming free.** Video calling tools are adding fraud detection themselves. When Zoom gives it away, nobody pays a separate company for it.

**Second, and this is the important one, it answers a question that no longer decides anything.** Knowing a real human sat in the chair tells you nothing about whether they can do the job.

Think about what the job actually looks like in 2026. You sit next to an AI all day. It is fast, it writes well, it sounds certain, and sometimes it is completely wrong. Your value is not that you can use it. Everyone can use it. Your value is that **you know when it is wrong.**

Employers have already worked this out. They have stopped asking "do you use AI?" and started asking "can I trust you to supervise it?"

Nobody is measuring that. That is the gap PROOFOS fills.

**The shift in one line:** from *identity verification* (is this a real person?) to *employability verification* (what can this person prove they can do?).

| | What exists today | PROOFOS |
|---|---|---|
| **What it checks** | A human was present | What they did, and how they handled AI while doing it |
| **The unit** | One candidate, one check, one company | One passport, many skills, reused at every company |
| **Expiry** | Never, or a random date | Fades on its own timer, per skill |
| **Who owns it** | The platform, per employer | The candidate, who chooses what to share |
| **What comes out** | A score | Evidence. The score is calculated from it. |

---

## 3. What PROOFOS actually does

Five steps. About sixteen minutes of the candidate's time.

### Step 1. The employer turns a job into a test. 60 seconds.

They paste the job advert. Or upload the PDF. Or take a photo of the whiteboard from the hiring meeting. Gemini reads any of those.

Gemini then works out which of six skills the job really needs, and how much each one matters. It corrects for a known problem with job adverts: they talk a lot about tools and software, and almost nothing about judgement, even though judgement is what the job actually needs.

Then it writes a twelve-minute work simulation set in that world, complete with realistic data, working tools, and four deliberate traps.

### Step 2. The candidate works with an AI colleague. 12 minutes.

This is the core of the product.

The candidate gets an AI teammate. Not a chatbot. A **colleague** that looks things up in real tools, forms an opinion, and states it with confidence.

Four times during the session, that colleague is wrong. Not randomly wrong. Wrong the way a smart, fast, overconfident coworker is wrong:

1. It states a conclusion the data does not support.
2. It is very confident about a fix that the evidence actually contradicts.
3. It hides a small mistake inside otherwise clean, correct work.
4. It quietly changes the goalposts and starts solving a different problem.

The candidate can see which tools it looked at. So when it reads the wrong data and draws a confident conclusion, that is visible right there on screen, for anyone who bothers to look.

### Step 3. We test their sense of when to trust AI. 4 minutes.

The candidate sees ten things an AI has said. For each one they answer two questions: what is this, and how far would you act on it?

The set is built to break the link between *sounding confident* and *being right*:

- Two are **wrong** but said with high confidence.
- Two are **correct** but said cautiously.
- Two are **dangerous** and would cause real damage if you acted on them. One of those is said with *low* confidence, because being unsure does not make a dangerous action safe.
- Two are **partly right**, sensible as far as they go but missing the thing that decides the answer.

We are not scoring whether they got the answers right. We are scoring whether their confidence matched reality.

### Step 4. They defend their own work out loud. 90 seconds.

Gemini reads what the candidate actually built and asks two questions that only the person who built it can answer well.

This replaces webcam spying. You cannot paste an answer to "why did you choose that, and what did it cost you?" You cannot send a friend to answer it. And we never need to see your face to find that out.

If your microphone does not work, you type it instead. Same marks. A broken microphone should never cost anyone a job.

### Step 5. Everything becomes evidence, then a passport they own.

Every single thing that happened is stored as a piece of **evidence**: what they did, quoted in their own words, with a timestamp and a fingerprint.

Then the scores are calculated from that evidence. The candidate gets a signed, portable **Proof Passport** they own and can reuse at any company.

---

## 4. The two new ideas

### AI Judgment Quotient (AJQ)

Being good at writing prompts is a skill with a short shelf life. Every new model release changes what a good prompt looks like. Knowing when the answer in front of you is wrong does not go out of date.

So we measure six things, and each one has its own evidence trail:

| Facet | The question it answers |
|---|---|
| **Detect** | Can you notice that the AI is wrong? |
| **Question** | Can you push back on a claim the evidence does not support? |
| **Verify** | Can you insist on seeing the proof before you act? |
| **Direct** | Can you steer it towards the right approach? |
| **Correct** | Can you fix what it got wrong? |
| **Decide** | Can you tell when not to trust it at all? |

**Decide** matters most and is hardest to fake, because it shows up in what somebody *refuses* to do. Choosing not to act on a confident answer costs you something in the moment. That is exactly why it is a real signal.

### Trust calibration

Most tests ask: did you get it right?

We ask a better question: **was your confidence correct?**

Somebody who is always sure and often wrong is dangerous. Somebody who is unsure about everything is slow and wastes the tool. The person you want is the one whose confidence tracks reality.

We plot every judgement on a chart. The diagonal line is perfect calibration. Above it is over-trust. Below it is under-trust. The bottom-right corner, high confidence in something unsafe, is the one that costs companies money, and we weight it accordingly.

---

## 5. The four rules we never break

These are not slogans. Each one is enforced in the code and covered by tests.

### Rule 1. Evidence is stored. Scores are calculated.

We never save a score. Not once. Every number you see is calculated fresh from the evidence behind it.

If a candidate says "why did I get 71?", the answer is not "the AI decided". The answer is a list of the exact things they did, each one quoted word for word, with a fingerprint, a timestamp, and a label saying whether a computer or a model spotted it. Run the calculation again and you get 71 again.

Our database design file has **no score column anywhere in it**. That is deliberate.

### Rule 2. No evidence, no number.

If a candidate never demonstrated a skill, that skill says **"unproven"**. It does not say 50.

Below two pieces of evidence we show no score at all. With thin evidence we pull the score towards the middle, and only real, repeated evidence moves it to an extreme.

Half the damage done by assessment tools comes from confident-looking numbers built on nothing.

### Rule 3. The AI never decides the score.

Gemini designs the test, plays the colleague, and finds evidence by quoting it. That is all.

- Whether a trap ended up in the final work? Decided by comparing text, character by character.
- The calibration score? Arithmetic, against an answer key the browser never sees.
- Any evidence a model claims to have found, where the quote does not actually appear in the session? **Thrown away** before it can affect anything.

### Rule 4. Coverage, never a verdict.

PROOFOS will tell an employer: *"this person has proven evidence for 82% of what this role needs, and here is the 18% they have not."*

It will never say hire or reject. There is no threshold anywhere in the code that turns a percentage into a recommendation. A human decides, with the evidence in front of them. We have a test that checks the output does not even contain hiring language.

---

## 6. A real example, start to finish

The built-in scenario: a company's payment system started throwing 17% more errors after a deploy on Tuesday. Database CPU has doubled. Three people in the incident chat already think it is the database.

**The AI colleague looks at the database metrics and says:**

> **The database is the bottleneck.** DB CPU has gone from 40% to 82% since Tuesday, and when I sampled the slow requests, 95% of them touch the database. Quickest path: scale the instance up a tier.

This sounds excellent. It is completely wrong.

Almost every request touches the database, so "95% of slow requests touch the database" tells you absolutely nothing. It is like saying 95% of car crashes involve cars.

The real cause is hiding in the deploy. Someone added a `loadTags` call inside a loop. One search page returns 50 results, so it now makes 51 database trips instead of 1. Query volume went up 11 times. Every individual query is still fast. The connection pool is only 34% used with zero waiting.

The database is not the cause. The database is a **victim**.

There is a tool that would show this instantly. It reveals one route at 2140ms and the other three completely normal. On the built-in path the colleague never opens it. With a live API key it sometimes opens it and *still* draws the same wrong conclusion, which is honestly the more interesting failure: the disproving number was right there and the conclusion did not move.

**What separates candidates here:**

- A weak candidate copies the fix. Their record shows the trap text sitting in their final work.
- A strong candidate says "that is correlation, not causation, what do the per-endpoint numbers say?" The colleague then pulls them and admits the problem is one route only.

Challenge it correctly and it backs down. Challenge it with a bad argument and it holds its ground. It is not a pushover, and it is not a doormat.

---

## 7. Why this is worth investing in

### The market is real and already paying

| | |
|---|---|
| Pre-employment testing software, 2026 | around **$2.1 billion** |
| Same market, projected 2035 | around **$3.9 billion** |
| Broader talent assessment software | estimated **$2 to 6 billion**, growing 15 to 30% a year |

Estimates vary a lot between research firms, so treat these as a range rather than a precise figure. The direction is not in doubt.

This is not a market we have to create. Companies already buy assessment tools. We are offering a better one for a problem their current tools do not touch.

### Why now, and not two years ago

Three things only became true recently.

1. **AI-written applications broke the résumé screen.** This finished happening in the last eighteen months.
2. **Working with AI became the actual job.** Employers now want proof of AI skill instead of banning AI. Some are writing AI proficiency into junior role requirements from 2027.
3. **Regulation arrived.** From August 2026, using AI to screen candidates in the EU is a "high-risk" activity with real legal obligations. Most hiring tools were built before this and are scrambling to retrofit. We were designed for it from the first commit.

Timing is the whole game. Two years early and nobody has the problem. Two years late and it is a crowded market.

### Who pays, and why they keep paying

**Employers pay** because a bad hire costs at least 30% of first-year salary, and because they now have a legal duty to document how their AI made hiring decisions. We produce that documentation as a by-product of doing the job.

**The candidate side is where it compounds.** A candidate does the test once and reuses the passport at every company. That means:

- Candidates want to take it, because it saves them repeating tests. Normally candidates hate assessments.
- Every company that accepts a PROOFOS passport makes it more valuable to the next candidate.
- Every candidate holding one makes it more useful for the next company to accept.

That is a two-sided network. It is slow to start and very hard to copy once it turns.

### Why it is hard to copy

Anyone can build an AI that grades a test. Four things are genuinely hard to copy:

1. **The measurement itself.** AJQ and trust calibration are new ways of scoring people. Getting them right needs real data from real sessions, which needs users, which needs the product to already exist.
2. **Being auditable.** Every score reduces to quoted evidence and can be recalculated. A competitor who stored scores instead of evidence cannot retrofit this. They would have to rebuild from the database schema up.
3. **The network.** Portable, reusable credentials get more valuable with every company that accepts one.
4. **Being compliant by design, not by patch.** We collect no biometrics, no video, no demographics, and we produce no automated decision. A competitor built on webcam surveillance cannot simply switch that off, because surveillance *is* their product.

### The honest risks

An investment case that only lists strengths is a sales pitch, not an analysis. The real risks:

- **Adoption is the hard part, not the technology.** Hiring teams change process slowly. The reusable passport only pays off once several employers accept it.
- **Big platforms could add something similar.** Our answer is depth. Anyone can bolt on an AI test. Rebuilding around evidence rather than scores is an architecture decision, not a feature.
- **The measurement needs validating.** We can show AJQ separates candidates who behave very differently. Proving it predicts job performance needs long-term outcome data we do not have yet, and we are not going to claim otherwise.
- **Model dependency.** We are built on Gemini. The abstraction is one file, and every call already falls back through model tiers, but a serious pricing change would still be felt.

### What is different about the way this was built

Most hackathon projects claim capability. This one is measurable:

| | |
|---|---|
| Tests, offline, no API key needed | **72 passing** |
| End-to-end route checks against a live server | **53 passing** |
| Distinct Gemini capabilities in genuine use | **12** |
| Score columns in the database design | **0** |
| Same scenario, two candidates, AI judgment scores | **82 and 17** |

That last row is the point of the whole product. Two people, one scenario, one rubric, and a 65-point gap in how well they handled a machine that was lying to them.

---

## 8. How Gemini is used

Twelve capabilities, each chosen for one specific job. There is a **live call log at `/engine`** showing real requests as they happen.

| Capability | Model | What it does here |
|---|---|---|
| Structured output | `gemini-3.1-pro-preview` | Designs the test, finds evidence, reads job adverts |
| Thinking levels | pro and flash | Deep thinking for design, fast thinking for conversation |
| Function calling | `gemini-3.8-flash` | The AI colleague looking things up in tools |
| Streaming | `gemini-3.8-flash` | Its reply, written from what it found |
| Multimodal input | `gemini-3.1-pro-preview` | Reading a job advert as a PDF or a photograph |
| Google Search grounding | `gemini-3.8-flash` | Live market statistics and role calibration, with citations |
| Audio understanding | `gemini-3.5-transcribe` | The spoken defence |
| Text to speech | `gemini-3.1-flash-tts-preview` | Reading the question out loud |
| Embeddings | `gemini-embedding-2` | Finding evidence and matching skills to roles |
| Seeded generation | `gemini-3.1-pro-preview` | Making evidence extraction repeatable |
| Constrained distribution | `gemini-3.1-pro-preview` | Building the calibration set with the right mix |
| Fallback tiers and key rotation | pro → flash → lite → fixtures | Never failing a candidate mid-session |

**One detail worth understanding.** Every reply from the AI colleague is deliberately **two** Gemini calls, not one. The first is a function-calling turn where it decides what to look up, and the server answers those lookups from the scenario's data. The second streams the actual reply, written from what it found.

Splitting them costs one extra call and buys the single most important thing in the demo: we can show the candidate *which data it chose to read*. That is where the whole product lives.

Every instruction we send to a model lives in one file, [`lib/prompts.ts`](lib/prompts.ts). When somebody challenges a result, the thing being argued about is a file a human can read, not behaviour buried across twenty route handlers. Every prompt carries the same standing instruction: judge only what is visible in the work, and never guess at personality, background, accent, fluency or emotion.

---

## 9. Privacy and the law

From August 2026, using AI to screen candidates in the EU is legally "high-risk" and carries real obligations. We built for that from the start rather than patching it on.

**What we collect:** the work they produce, their messages to the AI colleague, their calibration answers, a text transcript of two short spoken answers, and simple counts like how many times they pasted.

**What we never collect:** video, screen recording, fingerprints, face templates or identity, location, device fingerprinting, or any guess about a person beyond the decisions visible in their work. Voice becomes text and nothing else. Guessing emotion from a face or voice in hiring is banned under Article 5, and frankly it is a useless signal anyway.

**The camera.** The camera is on for the whole test, and every frame is analysed on the candidate's own device by a face-landmark model running in the browser (`components/challenge/camera-guard.tsx`). It watches for three things: a blank or covered picture, a missing or extra face, and eyes off the screen (from gaze blendshapes and head position). Each becomes seconds and counts, shown to the candidate live under their own preview. Not one frame is uploaded, stored or replayed; no identity, embedding or emotion is computed. The counts go on the record next to the focus-mode counts, with the same high thresholds and the same rule: numbers for a person to read, never a verdict.

**Focus mode.** The test runs full screen and counts four things: switching tabs, leaving full screen, copying out of the test, and total seconds away. Three rules make this, and the camera, honest rather than creepy:

1. **Every count is on screen while it is being counted.** No hidden monitoring.
2. **Two warnings, then it ends.** A problem that goes on (leaving the tab or full screen, no face, a second person, eyes away, a dark camera) shows a clear warning on screen. A second one says it is the last. A third ends the test on the spot and scores whatever was done. Nothing hidden, nothing silent.
3. **The counts alone prove nothing.** Leaving the test only becomes evidence when most of the work also arrived by paste, because that pair is what fetching an answer looks like. One interruption is just a life happening, and the flags say counts rather than accusations.

This is as far as we go towards a webcam *proctor*. Recording people and sending the video to a stranger is the thing this product exists to replace. Our camera never leaves the device, the candidate sees everything it produces, and the only automatic action the system ever takes is to stop the clock after two warnings. Even then it does not judge: the record says the test ended itself and why, and the work is scored as it stood.

**What we store on our servers: nothing.** The calibration answer key travels encrypted, so the browser holds something it cannot read and cannot alter. The result travels as a signed credential the candidate owns.

**How we check authorship without biometrics.** The question is not "is this the same face as last time". It is "did the person talking about this work actually make the decisions in it". Two things answer that: whether the work appeared from outside the session, and whether their spoken defence mentions things that only exist in *their* particular submission. The camera adds a third, weaker signal: that somebody was in the chair, looking at the screen, while it happened.

**Freshness.** A credential that never expires stops meaning anything. Each skill fades on its own timer. AI judgment halves in 120 days because the tools change fast. Communication halves in 540 days because writing clearly does not go stale. A stale passport does not read like a fresh one.

**Selective disclosure.** Applying for a job that cares about AI judgment should not require handing over your communication score. Untick it and it is not sent. The signature still works. The employer can see that you held something back, but not what.

**Revocation.** One bit in a public list. An employer checks that bit and learns whether a credential was withdrawn, without telling us which credential they asked about.

---

## 10. How it is built

```
Next.js 16 · React 19 · TypeScript · Tailwind v4 · no configuration required

app/                landing · challenge · passport · employer · verify · engine · demo
app/api/            17 routes
lib/domain.ts       the model: evidence, skills, facets, tests, passports
lib/evidence.ts     the calculator — every number, from evidence, no AI
lib/detect.ts       the non-AI detectors — text comparison and arithmetic only
lib/observer.ts     the Gemini pass, limited to what only reading can catch
lib/evaluate.ts     the pipeline: detect → observe → calibrate → calculate → write
lib/credential.ts   the signed passport, selective disclosure, revocation
lib/seal.ts         encryption, so the answer key never reaches the browser
lib/prompts.ts      every instruction sent to a model, in one readable file
lib/gemini.ts       one door to the API: logging, fallbacks, key rotation
db/schema.sql       what a real deployment stores. No score column anywhere.
```

**Fixture mode.** With no API key, everything runs from fixed, pre-written responses, clearly labelled on every page. Those same responses are the safety net if the API fails halfway through a real session. Nobody's assessment dies because a model was busy.

---

## 11. Running it yourself

```bash
npm install
npm run dev          # works straight away, no key needed

cp .env.example .env.local
# add GEMINI_API_KEY from https://aistudio.google.com/apikey
npm run dev          # same code, live Gemini
```

```bash
npm test             # 72 tests, no key, no network
npm run verify       # lint + typecheck + tests
npm run build
```

Deploy to Vercel: import the repo, optionally add `GEMINI_API_KEY` and `PROOFOS_SECRET`, deploy. Nothing else to set up.

**A note on free API keys.** Google limits each key separately, so one free key runs out after about two calls a minute. Put several in `GEMINI_API_KEYS`, comma separated, and calls rotate between them. Measured on four free keys: six requests at once went from failing on the second to all six succeeding.

### What the tests cover

Node 24 runs TypeScript directly, so there is no test framework and no build step.

- **The calculator.** No evidence means no score. One piece of evidence is below the floor. Thin evidence stays near the middle. The same evidence always gives the same answer.
- **Calibration.** Good calibration beats confident wrongness. Over-trust and under-trust are told apart. Trusting something dangerous is punished harder than being merely wrong.
- **Freshness.** Skills halve at their own rate. Stale evidence stops covering a job requirement.
- **Detectors.** A trap in the final work is recorded. Avoiding a trap only counts if they said something. Traps never shown are ignored completely. Typing the defence scores the same as speaking it. Warning notes state facts, never accusations.
- **The credential.** Tampering breaks it. Forged, repeated and malformed disclosures are all rejected. A stolen signature on inflated scores fails. Revocation is reported without breaking the signature.
- **Repair.** If Gemini writes a trap whose text already appears in the briefing, we drop it rather than blame the candidate for something they could have copied.

---

## 12. What is finished and what is not

**Finished and working:** the whole flow end to end, all 17 API routes, twelve Gemini capabilities, the evidence engine, signed passports with selective disclosure and revocation, job matching, the skill-gap generator, and a full offline mode.

**Honestly not finished:**

- **Revocation is held in memory** and resets when the server restarts. The proper database design is written and shipped in `db/schema.sql`, but not wired up. A revocation list that quietly forgets is worse than none, so we say so.
- **The employer's candidate list lives in the browser.** Sharing it across users needs the database.
- **File Search is not connected.** Grounding a test in a company's own documents is the obvious next capability and we have verified the API works, but we cannot test it properly without more quota, and shipping an untested claim is worse than admitting the gap.
- **The Live API is not connected.** A real-time spoken conversation with the AI colleague would be better than record-then-transcribe.
- **Grading written work is not perfectly repeatable across model versions.** The model, seed and rubric are saved with every result. The non-AI half *is* repeatable, and we test that.
- **Fairness monitoring across demographic groups** needs demographic data we deliberately do not collect, so it has to run on the employer's side.
- **English only.**

---

## Provenance

Built from scratch during the hack day. New repository, new idea, no code carried over from anything earlier. The commit history is the build log.

Before any Gemini code was written, the exact API surface was verified line by line against the SDK's own type definitions and the current documentation. That is why this codebase avoids a deprecated credential wrapper, restricts thinking levels to values the model actually accepts, and enforces two security checks in the credential format that most implementations skip.

MIT licensed. For a three-and-a-half minute walkthrough, open [`/demo`](app/demo/page.tsx).
