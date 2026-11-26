import { z } from 'zod';

/**
 * Verejné premenné (prefix NEXT_PUBLIC_ – dostanú sa do prehliadača).
 * Tajomstvá sem NIKDY nepatria – čítajú sa iba v moduloch s `import 'server-only'`.
 */
const PublicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

// Next.js inlinuje iba priame prístupy `process.env.NEXT_PUBLIC_*`.
export const publicEnv = PublicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
