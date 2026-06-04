/**
 * White-label brand configuration.
 *
 * Each "brand" is one deployment of Neuro for a specific client. The default
 * is NeuroGrid Labs itself. Falconhouse, BIC, Edolutions, etc. would each get
 * their own slug here.
 *
 * URL routing: a `?brand=slug` query param selects the brand. Missing/unknown
 * slug → default. Later phases will move this to a path-based router
 * (`/brand/[slug]`) and a database lookup.
 */

export type BrandConfig = {
  slug: string;
  displayName: string;
  /** First line spoken by Neuro on Mic activation */
  greeting: string;
  /** Optional appendix to the system prompt for this brand */
  systemPromptAddon?: string;
  /** Hex color overrides for future face customization */
  colors?: {
    primary?: string;
    accent?: string;
  };
};

const NEUROGRID: BrandConfig = {
  slug: "neurogrid",
  displayName: "NeuroGrid Labs",
  greeting:
    "Hi, I'm Neuro from NeuroGrid Labs. How may I help you? Would you like me to connect with you, or just chat?",
  colors: { primary: "#3ad5ff", accent: "#d4af37" },
};

export const BRANDS: Record<string, BrandConfig> = {
  neurogrid: NEUROGRID,
  // Add future client deployments here. Example:
  // "falconhouse-maymar": {
  //   slug: "falconhouse-maymar",
  //   displayName: "Falconhouse Maymar",
  //   greeting: "Welcome to Falconhouse Maymar. How may I help you today?",
  //   systemPromptAddon: "You represent Falconhouse Grammar School (Maymar campus)...",
  //   colors: { primary: "#10b981", accent: "#d4af37" },
  // },
};

export const DEFAULT_BRAND = NEUROGRID;

export function getBrand(slug?: string | null): BrandConfig {
  if (!slug) return DEFAULT_BRAND;
  return BRANDS[slug] ?? DEFAULT_BRAND;
}
