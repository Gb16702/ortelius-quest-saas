import { z } from 'zod'

const envSchema = z
  .object({
    // Node Environment
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

    // Server Configuration
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    HOST: z.string().default('localhost'),

    // Database Configuration
    DATABASE_URL: z.url({ message: 'Invalid database URL' }),
    DB_HOST: z.string().default('localhost'),
    DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
    DB_NAME: z.string().min(1, 'Database name is required'),
    DB_USER: z.string().min(1, 'Database user is required'),
    DB_PASSWORD: z.string().min(1, 'Database password is required'),
    DB_MAX_CONNECTIONS: z.coerce.number().int().min(1).default(10),
    DB_TIMEOUT: z.coerce.number().int().min(1000).default(30000),

    // Authentication
    COGNITO_USERPOOL_ID: z.string().min(1, 'Cognito user pool ID is required'),
    COGNITO_CLIENT_ID: z.string().min(1, 'Cognito client ID is required'),
    COGNITO_REGION: z.string().default('eu-west-3'),
    FRONTEND_URL: z.url({ message: 'Invalid frontend URL' }),
    AUTH_PORTAL_URL: z.url({ message: 'Invalid auth portal URL' }).default('https://ortelius.app'),

    // Stripe Configuration
    STRIPE_SECRET_KEY: z.string().min(1, 'Stripe secret key is required'),
    STRIPE_PUBLISHABLE_KEY: z.string().min(1, 'Stripe publishable key is required'),
    STRIPE_WEBHOOK_SECRET: z.string().min(1, 'Stripe webhook secret is required'),

    STRIPE_PRICE_STARTER_MONTHLY: z.string().min(1, 'Stripe starter monthly price ID is required'),
    STRIPE_PRICE_STARTER_ANNUAL: z.string().min(1, 'Stripe starter annual price ID is required'),
    STRIPE_PRICE_PROFESSIONAL_MONTHLY: z
      .string()
      .min(1, 'Stripe professional monthly price ID is required'),
    STRIPE_PRICE_PROFESSIONAL_ANNUAL: z
      .string()
      .min(1, 'Stripe professional annual price ID is required'),
    STRIPE_PRICE_ENTERPRISE_MONTHLY: z
      .string()
      .min(1, 'Stripe enterprise monthly price ID is required'),
    STRIPE_PRICE_ENTERPRISE_ANNUAL: z
      .string()
      .min(1, 'Stripe enterprise annual price ID is required'),

    // Email Configuration
    POSTMARK_API_KEY: z.string().min(1, 'Postmark API key is required'),

    // AWS Configuration
    AWS_REGION: z.string().min(1, 'AWS region is required'),
    AWS_S3_ACCESS_KEY_ID: z.string().min(1, 'AWS access key is required'),
    AWS_S3_SECRET_ACCESS_KEY: z.string().min(1, 'AWS secret key is required'),
    AWS_S3_BUCKET_NAME: z.string().min(1, 'S3 bucket name is required'),

    // OpenAI Configuration
    OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required for transcription'),
    QUEST_ASSISTANT_ENABLED: z.coerce.boolean().default(true),
    QUEST_ASSISTANT_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(256).max(8000).default(2000),
    QUEST_ASSISTANT_MAX_ITERATIONS: z.coerce.number().int().min(1).max(20).default(6),
    QUEST_ASSISTANT_MAX_TOOL_CALLS: z.coerce.number().int().min(1).max(40).default(10),
    QUEST_ASSISTANT_MAX_RUN_TOTAL_TOKENS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(400000)
      .default(120000),
    QUEST_ASSISTANT_CONTEXT_COMPACTION_THRESHOLD_TOKENS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(250000)
      .default(60000),
    QUEST_ASSISTANT_CONTEXT_HARD_LIMIT_TOKENS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(400000)
      .default(100000),
    QUEST_ASSISTANT_MAX_RUN_DURATION_MS: z.coerce
      .number()
      .int()
      .min(1000)
      .max(120000)
      .default(60000),
    QUEST_ASSISTANT_ENABLE_TOOL_CACHE: z.coerce.boolean().default(true),
    QUEST_ASSISTANT_ENABLE_CONTENT_GUARD: z.coerce.boolean().default(true),

    // Security
    ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 characters'),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173')
      .transform((val) => val.split(',')),

    // TURN (coturn) for WebRTC ICE
    TURN_SERVER_URL: z.string().optional(),
    TURN_SECRET: z.string().optional(),
    TURN_CREDENTIAL_TTL: z.coerce.number().int().min(60).default(86400),

    // Features
    ENABLE_SWAGGER: z.coerce.boolean().default(true),
    ENABLE_METRICS: z.coerce.boolean().default(false),
    ENABLE_RATE_LIMIT: z.coerce.boolean().default(false),
    ENABLE_TEST_AUTH_BYPASS: z.coerce.boolean().default(false),

    // Logging
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

    // Admin proxy bearer token (set on the auth gateway's platforms row)
    ADMIN_SERVICE_TOKEN: z.string().optional(),
  })
  .refine(
    (env) =>
      env.QUEST_ASSISTANT_CONTEXT_HARD_LIMIT_TOKENS >
      env.QUEST_ASSISTANT_CONTEXT_COMPACTION_THRESHOLD_TOKENS,
    {
      path: ['QUEST_ASSISTANT_CONTEXT_HARD_LIMIT_TOKENS'],
      message: 'Quest assistant context hard limit must be greater than compaction threshold',
    }
  )

export type Environment = z.infer<typeof envSchema>

function validateEnvironment(): Environment {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    const errors = result.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`)
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`)
  }

  return result.data
}

export const env = validateEnvironment()
