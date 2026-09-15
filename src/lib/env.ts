import { z } from "zod";

const schema = z
  .object({
    DATABASE_URL: z.string().min(1),
    AUTH_SECRET: z.string().min(1),
    AUTH_GOOGLE_ID: z.string().min(1),
    AUTH_GOOGLE_SECRET: z.string().min(1),
    ALLOWED_EMAIL: z.string().email(),
    AI_ENABLED: z.enum(["true", "false"]).default("false"),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default("gemini-2.5-flash-lite"),
  })
  .refine((v) => v.AI_ENABLED === "false" || !!v.GEMINI_API_KEY, {
    message: "GEMINI_API_KEY is required when AI_ENABLED=true",
    path: ["GEMINI_API_KEY"],
  });

export type Env = z.infer<typeof schema> & { aiEnabled: boolean };

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment: ${issues}`);
  }
  cached = { ...parsed.data, aiEnabled: parsed.data.AI_ENABLED === "true" };
  return cached;
}
