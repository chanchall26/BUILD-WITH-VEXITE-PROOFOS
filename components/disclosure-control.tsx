"use client";

import { useState } from "react";
import { DIMENSION_LABEL, type Dimension, type Passport } from "@/lib/domain";

/**
 * Selective disclosure, as a control the holder actually operates.
 *
 * Applying for a role that cares about AI judgment should not require handing
 * over a communication score. Untick a capability and its disclosure is simply
 * not sent; the signature is untouched and the verifier still validates, seeing
 * only that something was withheld.
 */
export function DisclosureControl({
  passport,
  onPresent,
}: {
  passport: Passport;
  onPresent: (presentation: string, disclosed: Dimension[]) => void;
}) {
  const all = passport.claims.map((c) => c.dimension);
  const [chosen, setChosen] = useState<Dimension[]>(all);
  const [busy, setBusy] = useState(false);
  const [audience, setAudience] = useState("");

  async function build() {
    if (chosen.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch("/api/present", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passport,
          disclose: chosen,
          audience: audience.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.presentation) onPresent(data.presentation, chosen);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-[13px] leading-relaxed text-muted">
        Choose what this employer sees. Everything you leave out stays hidden behind a
        salted digest they cannot open, and the signature still verifies.
      </p>

      <ul className="mt-4 space-y-2">
        {passport.claims.map((c) => {
          const on = chosen.includes(c.dimension);
          return (
            <li key={c.dimension}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-edge-soft bg-void px-3 py-2.5 transition-colors hover:border-edge">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) =>
                    setChosen((prev) =>
                      e.target.checked
                        ? [...prev, c.dimension]
                        : prev.filter((d) => d !== c.dimension),
                    )
                  }
                  className="h-4 w-4 accent-[#7189ff]"
                />
                <span className="text-[13.5px]">{DIMENSION_LABEL[c.dimension]}</span>
                <span className="numeral ml-auto text-[13px] text-signal">
                  {c.score ?? "—"}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-[12.5px] text-muted">
          Who is this for, optional
        </span>
        <input
          className="field"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          placeholder="Acme Payments, backend role"
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button
          className="btn btn-primary"
          disabled={busy || chosen.length === 0}
          onClick={() => void build()}
        >
          {busy ? "Building…" : "Build presentation"}
        </button>
        <button className="btn btn-quiet" onClick={() => setChosen(all)}>
          Select all
        </button>
        <button className="btn btn-quiet" onClick={() => setChosen([])}>
          Clear
        </button>
      </div>

      <p className="mt-2.5 text-[11.5px] text-dim">
        {all.length - chosen.length === 0
          ? "Nothing withheld — the employer sees the whole record."
          : `${all.length - chosen.length} of ${all.length} capabilities withheld. They will see that something was held back, not what.`}
      </p>
    </div>
  );
}
