/**
 * Node's ESM loader wants file extensions; the app's imports are written the
 * way a bundler expects them. This hook bridges the two so the test runner can
 * import the real source with no build step and no test framework.
 */

import { existsSync } from "node:fs";

const CANDIDATES = [".ts", ".tsx", ".mjs", ".js", "/index.ts", "/index.tsx"];

export async function resolve(specifier, context, nextResolve) {
  const relative = specifier.startsWith("./") || specifier.startsWith("../");
  const hasExtension = /\.[cm]?[jt]sx?$/i.test(specifier);

  if (relative && !hasExtension && context.parentURL) {
    const base = new URL(specifier, context.parentURL);
    for (const ext of CANDIDATES) {
      if (existsSync(new URL(base.href + ext))) return nextResolve(specifier + ext, context);
    }
  }
  return nextResolve(specifier, context);
}
