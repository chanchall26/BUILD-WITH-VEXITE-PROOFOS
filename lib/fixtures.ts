/**
 * Deterministic fixtures.
 *
 * These are served whenever no GEMINI_API_KEY is configured, and they are the
 * recovery path if the API is unreachable mid-session. Everything built from
 * them is labelled `source: "fixture"` in the API and banner-flagged in the UI.
 *
 * The seeded scenario is deliberately one where the obvious answer is wrong:
 * a deploy made one endpoint slow through an N+1 query, the database looks
 * busy as a consequence, and the counterpart blames the database. A candidate
 * who reads the endpoint-level numbers sees it. A candidate who accepts a
 * confident summary does not.
 */

import type {
  CalibrationKey,
  ChallengeSpec,
  Passport,
  RoleSpec,
} from "./domain";

export const FIXTURE_ROLE_INPUT = `Backend Engineer (Junior–Mid) — Platform, Bengaluru (hybrid)

You'll own the request path: the public API, the search service, and the jobs
that keep them fed. Node/TypeScript, Postgres, Redis. We're small enough that
you will carry a pager for what you ship.

We care far more about how you reason under incomplete information than about
which frameworks you've memorised. You will work alongside AI tooling every
day here, and we want to see you use it well rather than take it at its word.`;

// ---------------------------------------------------------------- challenge

export const FIXTURE_CHALLENGE: ChallengeSpec = {
  id: "ch_fixture_api_regression",
  domain: "software",
  title: "The 17% error spike",
  roleContext: "Backend engineer on the platform team, second week on the pager.",
  situation:
    "Since Tuesday's 14:40 deploy, the public API is returning 17% more 5xx errors. Support has three enterprise customers asking what is going on. Nobody has reproduced it locally. The incident call is in twelve minutes and you are expected to arrive with an opinion.",
  deliverable:
    "Work out what actually changed, write the fix or the rollback you would ship, and leave a short note the next on-call engineer can act on without you.",
  workspaceSeed: `# Incident notes — API 5xx spike

## What I think is happening


## Evidence


## What I would ship


## For the next on-call

`,
  requirements: [
    {
      id: "r1",
      text: "Name the specific endpoint that regressed rather than the system as a whole.",
      signal: "/v2/search",
    },
    {
      id: "r2",
      text: "Identify the change in Tuesday's deploy that caused it.",
      signal: "n+1",
    },
    {
      id: "r3",
      text: "State what you would ship or roll back, and why that and not the alternative.",
      signal: "roll back",
    },
    {
      id: "r4",
      text: "Say what you would alert on so this is caught in minutes next time.",
      signal: "alert",
    },
  ],
  contextDocs: [
    {
      label: "#platform-incident — Meera, 09:12",
      kind: "message",
      body: "3 enterprise accounts on the phone. 5xx up 17% since Tue. Dashboards are red on database CPU. Can someone confirm it's the DB so I can tell them something?",
    },
    {
      label: "#platform-incident — Arjun, 09:14",
      kind: "message",
      body: "DB CPU is at 82%, was 40% last week. Pretty clearly the database. I'd just scale the instance and move on, we can dig in after the call.",
    },
    {
      label: "PagerDuty — 02:51",
      kind: "log",
      body: "API_5XX_RATE breached 2% for 5m\nupstream timeout: GET /v2/search (2 of 3 retries exhausted)\nupstream timeout: GET /v2/search\nupstream ok: GET /v2/orders 41ms",
    },
    {
      label: "Deploy log",
      kind: "doc",
      body: "Tue 14:40 — release 2026.09.08\n  * search: include tag metadata on result cards (#4471)\n  * chore: bump pg driver 8.11 -> 8.13\n  * copy: pricing page footer",
    },
  ],
  tools: [
    {
      name: "query_endpoint_latency",
      description:
        "p50/p95/p99 latency and error rate per endpoint, comparing the last 24 hours against the week before the deploy.",
      parameters: {
        type: "object",
        properties: {
          window: {
            type: "string",
            description: "Time window, for example '24h' or '7d'.",
          },
        },
        required: ["window"],
      },
      result: {
        window: "24h vs pre-deploy baseline",
        endpoints: [
          {
            route: "GET /v2/search",
            p50_before_ms: 74,
            p50_now_ms: 610,
            p95_before_ms: 180,
            p95_now_ms: 2140,
            error_rate_before: "0.3%",
            error_rate_now: "9.8%",
            requests_per_min: 1420,
          },
          {
            route: "GET /v2/orders",
            p50_before_ms: 38,
            p50_now_ms: 41,
            p95_before_ms: 96,
            p95_now_ms: 103,
            error_rate_before: "0.2%",
            error_rate_now: "0.2%",
            requests_per_min: 3100,
          },
          {
            route: "POST /v2/checkout",
            p50_before_ms: 121,
            p50_now_ms: 118,
            p95_before_ms: 340,
            p95_now_ms: 352,
            error_rate_before: "0.4%",
            error_rate_now: "0.4%",
            requests_per_min: 260,
          },
          {
            route: "GET /v2/account",
            p50_before_ms: 29,
            p50_now_ms: 30,
            p95_before_ms: 71,
            p95_now_ms: 74,
            error_rate_before: "0.1%",
            error_rate_now: "0.1%",
            requests_per_min: 890,
          },
        ],
        note: "One route regressed. Every other route is flat within noise.",
      },
    },
    {
      name: "check_db_metrics",
      description:
        "Database connection pool, query volume and lock statistics for the last 24 hours.",
      parameters: {
        type: "object",
        properties: {
          window: { type: "string", description: "Time window." },
        },
        required: ["window"],
      },
      result: {
        cpu_percent: 82,
        cpu_percent_baseline: 40,
        pool_size: 20,
        pool_utilisation_percent: 34,
        pool_wait_time_p99_ms: 0,
        connections_rejected: 0,
        queries_per_min: 71400,
        queries_per_min_baseline: 6300,
        slowest_query:
          "SELECT id, label FROM tags WHERE item_id = $1  -- 0.6ms avg, 64,900 calls/min",
        locks_waiting: 0,
        note: "Query volume is 11x baseline. Individual queries are fast. No pool contention, no lock waits.",
      },
    },
    {
      name: "get_deploy_diff",
      description: "The code change shipped in a given release.",
      parameters: {
        type: "object",
        properties: {
          release: { type: "string", description: "Release identifier." },
        },
        required: ["release"],
      },
      result: {
        release: "2026.09.08",
        files: [
          {
            path: "src/search/formatResults.ts",
            diff: `   const cards = results.map((r) => ({
     id: r.id,
     title: r.title,
-    tags: [],
+    tags: await loadTags(r.id),
   }));

+ async function loadTags(itemId: string) {
+   const { rows } = await db.query(
+     "SELECT id, label FROM tags WHERE item_id = $1", [itemId]);
+   return rows;
+ }`,
          },
          {
            path: "package.json",
            diff: `-  "pg": "8.11.3",
+  "pg": "8.13.1",`,
          },
        ],
        note: "formatResults runs once per result. A search page returns up to 50 results.",
      },
    },
    {
      name: "read_error_logs",
      description: "Recent application error and warning lines.",
      parameters: {
        type: "object",
        properties: {
          route: { type: "string", description: "Optional route filter." },
        },
        required: [],
      },
      result: {
        lines: [
          "02:51:04 WARN  search.formatResults slow: 2180ms (50 results)",
          "02:51:04 ERROR upstream timeout GET /v2/search after 3000ms",
          "02:51:05 INFO  db.pool acquired in 0ms (6/20 in use)",
          "02:51:06 WARN  search.formatResults slow: 1940ms (44 results)",
          "02:51:09 ERROR upstream timeout GET /v2/search after 3000ms",
          "02:51:11 INFO  GET /v2/orders 200 in 41ms",
        ],
        note: "Pool acquisition is instant throughout. Slowness is inside formatResults.",
      },
    },
  ],
  counterpartPersona:
    "A fast, confident senior engineer who has already 'looked into it' and formed a view. Writes well, moves quickly, and does not volunteer the weaknesses in their own reasoning.",
  beats: [
    {
      turn: 1,
      behaviour: "assert_unsupported",
      facet: "detect",
      instruction:
        "State as an established finding that the database is the bottleneck, justified by the fact that 95% of slow requests touch the database and that DB CPU has doubled. Present it as the diagnosis, not a hypothesis. Recommend scaling the database instance.",
      marker: "database is the bottleneck",
      groundTruth:
        "Nearly every request touches the database, so the 95% figure carries no information. Endpoint-level latency shows only /v2/search regressed, and the database is busy because that one route started issuing 11x the queries.",
    },
    {
      turn: 2,
      behaviour: "overconfidence",
      facet: "verify",
      instruction:
        "Say you are 95% confident and recommend raising the connection pool from 20 to 200 as the immediate mitigation. Do not mention that pool utilisation is 34% with zero waits.",
      marker: "pool_size = 200",
      groundTruth:
        "Pool utilisation is 34% with a p99 wait of 0ms and zero rejected connections, so there is no pool exhaustion. Raising the pool would multiply concurrent load on an already saturated database.",
    },
    {
      turn: 3,
      behaviour: "subtle_defect",
      facet: "correct",
      instruction:
        "Propose a 30-second cache on search results keyed by user id, written as clean, plausible code. Present it as the pragmatic fix that buys time.",
      marker: "cacheKey = userId",
      groundTruth:
        "Keying a shared search result by user id gives every user their own copy of the same query, so the cache barely hits, and it masks an N+1 introduced by the deploy rather than removing it.",
    },
    {
      turn: 4,
      behaviour: "scope_drift",
      facet: "direct",
      instruction:
        "Suggest that while you are both in here, this is a good moment to migrate the search service onto the new client library, and start describing that migration.",
      marker: "migrate to searchclient v3",
      groundTruth:
        "An unrelated migration during an active incident enlarges the blast radius and makes the rollback ambiguous.",
    },
  ],
  defenceSeeds: [
    "why the database CPU number was a consequence rather than a cause",
    "what specifically in the deploy produced the extra query volume",
    "what they would have alerted on to catch this in minutes",
  ],
  transparencyNotice:
    "This is an AI-assisted assessment. We record the work you produce, your messages to the AI counterpart, your trust ratings in the calibration set, and a transcript of two short spoken answers about your own decisions. We measure the quality of your work and how you handled a counterpart that is sometimes wrong. We do not use your camera, do not analyse your voice for emotion, accent or fluency, and do not infer anything about you beyond the decisions visible in this task. No hire or reject decision is produced by this system. You receive your full evidence record either way, and you own it.",
  estimatedMinutes: 12,
  createdAt: "2026-09-12T09:00:00.000Z",
  source: "fixture",
};

/** Counterpart replies used when no API key is configured, one per beat. */
export const FIXTURE_COUNTERPART: Record<number, string> = {
  1: `I've been through the dashboards already. **The database is the bottleneck.**

DB CPU has gone from 40% to 82% since Tuesday, and when I sampled the slow requests, 95% of them touch the database. That's about as clear a signal as you get during an incident.

Quickest path: scale the instance up a tier. We can right-size it again next week once things are calm. Want me to write the change request?`,

  2: `I'm about 95% confident on this one. The pool is the constraint.

\`\`\`ts
// db/config.ts
export const pool = new Pool({
  pool_size = 200,   // was 20
  idleTimeoutMillis: 30_000,
});
\`\`\`

Twenty connections against this much traffic was always going to be tight. Bump it to 200, restart the API pods, and the timeouts should clear inside a minute. It's reversible, so there's very little downside to trying it first.`,

  3: `Right — let's stop the bleeding with a cache and do the proper fix tomorrow.

\`\`\`ts
const cacheKey = userId + ":" + query;
const hit = await redis.get(cacheKey);
if (hit) return JSON.parse(hit);

const results = await runSearch(query);
await redis.setex(cacheKey, 30, JSON.stringify(results));
return results;
\`\`\`

Thirty seconds is short enough that nobody sees stale data and long enough to absorb the burst. This is the standard pattern for a hot read path under pressure.`,

  4: `While we're both in here — this is actually a good moment to migrate to searchclient v3.

The old client is what's making this hard to debug in the first place, and we've had the migration in the backlog since June. I can start on it now and we'd come out of this incident in a better place than we went in.

I'll begin with the query builder and work outwards.`,

  0: `Two things I'd want to separate before doing anything.

First, what changed. The deploy went out at 14:40 on Tuesday and the errors start after it, so the deploy is the prime suspect until something rules it out.

Second, where it changed. "The API is slow" and "one route is slow" lead to completely different fixes, and the dashboards you've got are aggregated across everything.

Want me to pull the numbers?`,
};

// ---------------------------------------------------------------- calibration

/**
 * Ten AI outputs to judge. The point is not whether the candidate can spot a
 * wrong answer. It is whether their confidence tracks reality: two of these
 * are stated with high confidence and are wrong, two are hedged and correct,
 * and two would cause real damage if acted on.
 */
export const FIXTURE_CALIBRATION: CalibrationKey[] = [
  {
    id: "cal1",
    context: "Asked why a Postgres query got slower after adding an index.",
    claim:
      "Adding an index always speeds up reads. If the query got slower, the index has not finished building — wait for it to complete and re-measure.",
    statedConfidence: 92,
    truth: "wrong",
    why: "An index changes the planner's choices and can make a query slower, for example by replacing a sequential scan with a less selective index scan. 'Indexes always speed up reads' is false, and the confident framing hides that.",
  },
  {
    id: "cal2",
    context: "Asked how to store a user's password.",
    claim:
      "Hash it with SHA-256 and a per-user salt before storing. That's the standard approach and it's fast enough to run on every login.",
    statedConfidence: 88,
    truth: "dangerous",
    why: "Being fast is precisely the problem. Password storage needs a deliberately slow, memory-hard function such as Argon2id or bcrypt. Shipping salted SHA-256 leaves the hashes cheap to crack at scale.",
  },
  {
    id: "cal3",
    context: "Asked whether a 17% error-rate increase after a deploy proves the deploy caused it.",
    claim:
      "It's strong circumstantial evidence but not proof. Check whether the errors are concentrated in code paths the deploy touched, and whether anything else changed in the same window.",
    statedConfidence: 61,
    truth: "correct",
    why: "Correct, and correctly hedged. The reasoning is sound and the stated confidence matches how much the claim actually asserts.",
  },
  {
    id: "cal4",
    context: "Asked to summarise what a log line means.",
    claim:
      "'db.pool acquired in 0ms (6/20 in use)' means the connection pool is saturated and requests are queueing for a connection.",
    statedConfidence: 79,
    truth: "wrong",
    why: "It means the opposite. Zero wait time and six of twenty connections in use is a pool with plenty of headroom.",
  },
  {
    id: "cal5",
    context: "Asked how to handle a third-party webhook that may be delivered twice.",
    claim:
      "Store the provider's event id with a unique constraint and insert it in the same transaction as the work. On conflict, treat it as already handled.",
    statedConfidence: 84,
    truth: "correct",
    why: "This is the right pattern, and the confidence is appropriate for a well-established technique.",
  },
  {
    id: "cal6",
    context: "Asked for the fastest way to clear a stuck migration in production.",
    claim:
      "Connect to the primary and run `DROP TABLE schema_migrations; ` then re-run the migration from scratch. It's the cleanest reset.",
    statedConfidence: 71,
    truth: "dangerous",
    why: "This discards the record of which migrations have already run, so re-running from scratch will attempt to reapply destructive migrations against live data. Recoverable only from backup, if at all.",
  },
  {
    id: "cal7",
    context: "Asked whether to use a 30-second cache to mitigate a slow endpoint during an incident.",
    claim:
      "Caching will reduce load, but it hides the regression rather than fixing it and introduces staleness. Worth doing only if you also open the ticket for the underlying cause.",
    statedConfidence: 66,
    truth: "partial",
    why: "The reasoning is sound as far as it goes, but it omits the decisive question of what the cache is keyed on — the wrong key makes the mitigation almost useless.",
  },
  {
    id: "cal8",
    context: "Asked what an N+1 query is.",
    claim:
      "One query to fetch a list, then one additional query per item in that list. Fifty results become fifty-one round trips.",
    statedConfidence: 95,
    truth: "correct",
    why: "A definitional question, answered correctly, with confidence that matches how settled the answer is.",
  },
  {
    id: "cal9",
    context: "Asked to estimate how long a data backfill will take.",
    claim:
      "Roughly four hours. Backfills of this size usually land in that range, and it's a reasonable number to give the team.",
    statedConfidence: 74,
    truth: "partial",
    why: "The estimate may well be in the right range, but it is offered with no reference to row count, batch size or write throughput. The number is a guess wearing the clothes of a calculation.",
  },
  {
    id: "cal10",
    context: "Asked whether it is safe to log the full request body for debugging.",
    claim:
      "Yes, log the whole body while you're debugging. You can always scrub the logs afterwards if anything sensitive turns up.",
    statedConfidence: 58,
    truth: "dangerous",
    why: "Request bodies routinely carry credentials, tokens and personal data. Once written to a log pipeline they are replicated, indexed and retained, and 'scrub it afterwards' is not a control. The low stated confidence does not make acting on it safe.",
  },
];

// ---------------------------------------------------------------- roles

export const FIXTURE_ROLE: RoleSpec = {
  id: "role_fixture_platform",
  title: "Backend Engineer — Platform",
  seniority: "Junior to mid",
  summary:
    "Owns the request path and carries a pager for it. The role rewards working out what is actually true faster than the dashboards suggest.",
  requirements: [
    {
      dimension: "ai_judgment",
      label: "Supervising AI output on the money path",
      weight: 5,
      why: "This team uses AI tooling on production changes daily. Accepting a confident wrong answer here has a customer-visible cost.",
    },
    {
      dimension: "verification",
      label: "Insisting on evidence before acting",
      weight: 5,
      why: "Most of the damage in incidents comes from acting on the first plausible explanation.",
    },
    {
      dimension: "reasoning",
      label: "Separating cause from consequence",
      weight: 4,
      why: "Aggregated dashboards routinely point at the symptom. The role needs someone who goes to the endpoint level.",
    },
    {
      dimension: "execution",
      label: "Shipping the fix, not the description of the fix",
      weight: 4,
      why: "The pager does not stop for a good analysis.",
    },
    {
      dimension: "communication",
      label: "Handing over cleanly to the next on-call",
      weight: 3,
      why: "The note is read at 3am by someone who was not in the room.",
    },
    {
      dimension: "authorship",
      label: "Evidence the work is genuinely theirs",
      weight: 3,
      why: "Remote hiring at this size cannot absorb a mis-hire on the pager rota.",
    },
  ],
  createdAt: "2026-09-12T09:00:00.000Z",
  source: "fixture",
};

// ---------------------------------------------------------------- passports

function claim(
  dimension: Passport["claims"][number]["dimension"],
  score: number | null,
  evidence: number,
  verifiedAt: string,
  freshness: number,
  revalidateBy: string,
) {
  return { dimension, score, evidence, freshness, verifiedAt, revalidateBy };
}

/**
 * Three finished profiles that seed the employer console.
 *
 * They exist to make one point: ranked on the quality of the artifact alone,
 * the order is Verma, Aditi, Rohan. Ranked on what the role actually needs,
 * it inverts.
 */
export const FIXTURE_PASSPORTS: Passport[] = [
  {
    v: 1,
    id: "pp_demo_aditi",
    holder: "Aditi R.",
    claims: [
      claim("ai_judgment", 84, 11, "2026-09-10T10:20:00.000Z", 0.988, "2027-01-01T00:00:00.000Z"),
      claim("reasoning", 79, 6, "2026-09-10T10:20:00.000Z", 0.996, "2027-02-20T00:00:00.000Z"),
      claim("execution", 71, 5, "2026-09-10T10:20:00.000Z", 0.995, "2027-01-24T00:00:00.000Z"),
      claim("verification", 88, 7, "2026-09-10T10:20:00.000Z", 0.992, "2027-01-13T00:00:00.000Z"),
      claim("communication", 63, 3, "2026-09-10T10:20:00.000Z", 0.997, "2027-05-01T00:00:00.000Z"),
      claim("authorship", 91, 4, "2026-09-10T10:20:00.000Z", 0.985, "2026-12-06T00:00:00.000Z"),
    ],
    ajq: {
      score: 84,
      facets: [
        { facet: "detect", score: 86, positive: 2.9, negative: 0.4, evidence: 4 },
        { facet: "question", score: 79, positive: 1.8, negative: 0, evidence: 2 },
        { facet: "verify", score: 88, positive: 2.6, negative: 0, evidence: 3 },
        { facet: "direct", score: 72, positive: 1.6, negative: 0.3, evidence: 2 },
        { facet: "correct", score: 81, positive: 2, negative: 0, evidence: 2 },
        { facet: "decide", score: 77, positive: 3.4, negative: 0.9, evidence: 6 },
      ],
    },
    trustHealth: 79,
    observationCount: 36,
    sessions: [
      {
        id: "se_demo_aditi",
        domain: "software",
        challengeId: "ch_fixture_api_regression",
        completedAt: "2026-09-10T10:20:00.000Z",
      },
    ],
    evidenceRoot: "8Rn2Kx4wQpLm7ZtCvB1sYdFgHjNoPqRs",
    issuedAt: "2026-09-10T10:21:00.000Z",
    issuer: "did:web:proofos.demo",
    statusIndex: 11,
  },
  {
    v: 1,
    id: "pp_demo_rohan",
    holder: "Rohan M.",
    claims: [
      claim("ai_judgment", 21, 9, "2026-09-11T14:02:00.000Z", 0.994, "2027-01-02T00:00:00.000Z"),
      claim("reasoning", 34, 4, "2026-09-11T14:02:00.000Z", 0.998, "2027-02-21T00:00:00.000Z"),
      claim("execution", 66, 5, "2026-09-11T14:02:00.000Z", 0.997, "2027-01-25T00:00:00.000Z"),
      claim("verification", 18, 5, "2026-09-11T14:02:00.000Z", 0.996, "2027-01-14T00:00:00.000Z"),
      claim("communication", 74, 3, "2026-09-11T14:02:00.000Z", 0.999, "2027-05-02T00:00:00.000Z"),
      claim("authorship", 68, 3, "2026-09-11T14:02:00.000Z", 0.992, "2026-12-07T00:00:00.000Z"),
    ],
    ajq: {
      score: 21,
      facets: [
        { facet: "detect", score: 12, positive: 0, negative: 3, evidence: 3 },
        { facet: "question", score: null, positive: 0, negative: 0, evidence: 0 },
        { facet: "verify", score: 18, positive: 0, negative: 2.4, evidence: 3 },
        { facet: "direct", score: 26, positive: 0, negative: 1.4, evidence: 2 },
        { facet: "correct", score: null, positive: 0, negative: 0, evidence: 0 },
        { facet: "decide", score: 38, positive: 1.2, negative: 1.8, evidence: 5 },
      ],
    },
    trustHealth: 47,
    observationCount: 29,
    sessions: [
      {
        id: "se_demo_rohan",
        domain: "software",
        challengeId: "ch_fixture_api_regression",
        completedAt: "2026-09-11T14:02:00.000Z",
      },
    ],
    evidenceRoot: "3Wq9Lc0aTuVe6XyMnB4pKdRfGhJzSbNo",
    issuedAt: "2026-09-11T14:03:00.000Z",
    issuer: "did:web:proofos.demo",
    statusIndex: 12,
  },
  {
    v: 1,
    id: "pp_demo_verma",
    holder: "K. Verma",
    claims: [
      claim("ai_judgment", 44, 6, "2026-09-11T16:40:00.000Z", 0.994, "2027-01-02T00:00:00.000Z"),
      claim("reasoning", 82, 5, "2026-09-11T16:40:00.000Z", 0.998, "2027-02-21T00:00:00.000Z"),
      claim("execution", 89, 6, "2026-09-11T16:40:00.000Z", 0.997, "2027-01-25T00:00:00.000Z"),
      claim("verification", 51, 3, "2026-09-11T16:40:00.000Z", 0.996, "2027-01-14T00:00:00.000Z"),
      claim("communication", 80, 4, "2026-09-11T16:40:00.000Z", 0.999, "2027-05-02T00:00:00.000Z"),
      claim("authorship", 14, 4, "2026-09-11T16:40:00.000Z", 0.992, "2026-12-07T00:00:00.000Z"),
    ],
    ajq: {
      score: 44,
      facets: [
        { facet: "detect", score: 58, positive: 1, negative: 0.6, evidence: 2 },
        { facet: "question", score: null, positive: 0, negative: 0, evidence: 0 },
        { facet: "verify", score: 51, positive: 0.9, negative: 0.8, evidence: 2 },
        { facet: "direct", score: null, positive: 0, negative: 0, evidence: 0 },
        { facet: "correct", score: 62, positive: 1, negative: 0.4, evidence: 2 },
        { facet: "decide", score: 40, positive: 1.4, negative: 2.1, evidence: 5 },
      ],
    },
    trustHealth: 60,
    observationCount: 28,
    sessions: [
      {
        id: "se_demo_verma",
        domain: "software",
        challengeId: "ch_fixture_api_regression",
        completedAt: "2026-09-11T16:40:00.000Z",
      },
    ],
    evidenceRoot: "5Zt7Hd2bRxWq1CvNmK8sLpEoGfJyUaId",
    issuedAt: "2026-09-11T16:41:00.000Z",
    issuer: "did:web:proofos.demo",
    statusIndex: 13,
  },
];

export const FIXTURE_NARRATIVE: Record<string, string> = {
  pp_demo_aditi:
    "Went to the endpoint-level numbers before accepting the database story, and asked the counterpart for its evidence twice before acting on anything. The handover note is the weakest part of otherwise careful work.",
  pp_demo_rohan:
    "Fast and fluent, and every conclusion is the counterpart's. Raised the connection pool to 200 on a pool running at 34% utilisation, and never asked what the endpoint-level numbers looked like.",
  pp_demo_verma:
    "The strongest write-up of the three and a correct root cause. It arrived in the workspace as a single paste from outside the session, and the spoken defence never named one thing that exists only in this submission.",
};

export const FIXTURE_PULSE = {
  headline:
    "Hiring signal is collapsing faster than hiring processes are adapting to it.",
  stats: [
    {
      value: "1 in 4",
      label: "candidate profiles worldwide projected to be fake by 2028",
      sourceName: "Gartner",
    },
    {
      value: "6%",
      label: "of candidates admit to interview fraud, including sending someone else",
      sourceName: "Gartner, survey of 3,000 candidates",
    },
    {
      value: "4 in 10",
      label: "candidates already use AI during the application process",
      sourceName: "Gartner",
    },
    {
      value: "26%",
      label: "of applicants trust AI to evaluate them fairly",
      sourceName: "Gartner, July 2025",
    },
  ],
};
