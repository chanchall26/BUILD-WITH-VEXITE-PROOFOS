# Architecture

## The one idea

**Evidence is stored. Scores are derived.**

An `Observation` is the atomic unit: one thing a person did, with their own words quoted as proof, hashed, timestamped, and labelled with which half of the pipeline found it. Every number anywhere in PROOFOS is a pure function over observations, computed at read time.

Nothing else in the system makes sense without that. It is why a disputed score has an answer, why `db/schema.sql` has no score column, and why a capability nobody demonstrated reads as *unproven* rather than as 50.

```ts
interface Observation {
  kind: ObservationKind;      // detected_error, propagated_defect, over_trusted, …
  dimension: Dimension;       // which capability it counts towards
  facet?: AjqFacet;           // detect | question | verify | direct | correct | decide
  polarity: 1 | -1;
  weight: number;             // 0..1
  detail: string;             // one sentence, what they did
  quote: string;              // verbatim. No quote, no observation.
  detector: "deterministic" | "model";
  hash: string;               // sha256 over the evidence
}
```

## The evaluation pipeline

Order matters, and it is the argument.

```
1. deterministic detectors        lib/detect.ts       no model involved
        │                         string comparison, phrase families, telemetry ratios
        ▼
2. Gemini observer                lib/observer.ts     constrained, quote-checked
        │                         may only emit kinds that genuinely need judgment;
        │                         any quote absent from the session is discarded
        ▼
3. calibration grading            lib/evidence.ts     arithmetic against the sealed key
        │
        ▼
4. derive the profile             lib/evidence.ts     pure function over the pooled set
        │
        ▼
5. a model writes prose           lib/evaluate.ts     from numbers it did not produce
```

Step 2 can never overrule step 1. Where both see the same moment, the deterministic observation wins the deduplication, and model-detected evidence carries 85% of the weight of something settled by string comparison — because a string comparison cannot be talked into seeing things.

### Deriving a score

```
mass       = Σ positive weights + Σ negative weights
ratio      = (Σ positive − Σ negative) / mass          -1 .. 1
confidence = 1 − e^(−mass / 2.2)                        0 .. 1
score      = 50 + ratio × confidence × 50
```

Below two observations there is no score at all. Above it, thin evidence is pulled towards the midpoint and only accumulated evidence earns an extreme. The same observations in any order derive the same profile, which is asserted by a test.

## The counterpart

Two Gemini calls per reply, deliberately.

```
candidate message
      │
      ▼
consult turn ── function calling ──▶ server resolves each call against the
      │                              challenge's fixture world (deterministic)
      │
      ├── the tools it chose are returned in X-Proofos-Tools
      ▼
reply turn ──── streaming ─────────▶ written from what it actually looked at
```

Splitting them costs a call and buys the thing the whole product turns on: the interface can show the candidate that the counterpart read the database metrics and never opened the endpoint latency. The gap between what it consulted and what it needed is visible in the transcript while the session is happening.

Beats are scripted moves — one per reply, ascending, each played once. A beat the counterpart never played is excluded from scoring entirely.

### Marker attribution

Each beat carries a short literal. If it survives into the finished work, the candidate absorbed it. This is checked by normalised string comparison, never by a model.

Generated challenges are repaired before they run ([`lib/challenge.ts`](../lib/challenge.ts)): a marker that already appears in the brief could never be attributed, so that beat is dropped rather than mis-scoring someone. The same rule applies to requirement signals.

## Sealed state

The calibration answer key has to travel with the browser and must not be readable there. It is encrypted with AES-256-GCM under a key derived from `PROOFOS_SECRET` — domain-separated from the signing key, so a signature oracle cannot bear on encryption — handed over as an opaque blob, and unsealed on the way back. Stateless, and the answers cannot be read out of a network response.

## The credential

A W3C Verifiable Credential 2.0, secured as a JWT under vc-jose-cose, issued in SD-JWT form.

Three decisions that are easy to get subtly wrong:

1. **No `vc` claim wrapper.** Under vc-jose-cose the credential's properties *are* the JWT payload. The nested `vc` object is a VC 1.1 convention.
2. **`_sd` inside `credentialSubject`.** The digest array belongs in the object whose members it hides, not at the payload root. Media type `application/vc+sd-jwt`.
3. **Verification enforces disclosure arity and duplicate digests.** RFC 9901 §7.1 makes both MUST-level. Skipping the arity check lets a two-element array-element disclosure be read as `[name, value] = [value, undefined]`, injecting a claim nobody signed. Skipping the duplicate check lets one digest satisfy two `_sd` slots. Both are tested.

Fresh salts on every issue, so two disclosures of the same claim to different employers cannot be correlated.

## Statelessness

The deployed demo persists nothing:

| What | Where it lives |
|---|---|
| The challenge | The client's session, and inside the evaluate request |
| The calibration key | Sealed, in the client's hands, unreadable |
| The result | A signed credential the candidate holds |
| The employer pool | The browser's own local storage, plus seeded fixtures |
| Revocation | Server memory, and it resets — stated as a limitation |

That is a deployment choice, not an absence of design. [`db/schema.sql`](../db/schema.sql) is what a persistent deployment stores: nine tables, evidence-first, no score column anywhere, no field for a hire decision, and no biometric or demographic column to leak.

## Where the numbers come from

| Number | Produced by |
|---|---|
| Capability score | `deriveProfile` over observations |
| AJQ facet score | `scoreFacet` over observations tagged with that facet |
| Trust health | Freshness-weighted mean of proven capabilities |
| Calibration score | Label accuracy and trust error against the sealed key |
| Freshness | `2^(−age / half-life)`, per capability |
| Role coverage | Requirement weight × score × freshness, summed |

None of them is produced by a model. That is the point.
