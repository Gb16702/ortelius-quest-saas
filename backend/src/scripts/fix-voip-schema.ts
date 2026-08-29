/**
 * Idempotent schema sync for the voip_call table. Use when production is
 * crashing on the WebSocket error:
 *   "Failed query: select id, conversation_id, caller_id, callee_id, ..."
 * caused by missing columns the Drizzle schema expects.
 *
 * Reports BEFORE/AFTER columns and which statements actually changed
 * something — so you can see what the script did even when prod's already
 * in sync.
 *
 * Run with the target DB:
 *   DATABASE_URL=<url> bun run src/scripts/fix-voip-schema.ts
 */
import { Client } from 'pg'

async function listVoipCallColumns(client: Client): Promise<string[]> {
  const { rows } = await client.query<{ column_name: string }>(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'voip_call'
    ORDER BY column_name
  `)
  return rows.map((r) => r.column_name)
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')

  const client = new Client({ connectionString: url })
  await client.connect()

  const before = await listVoipCallColumns(client)
  console.log('Before — voip_call columns:', before.join(', ') || '(table not found)')

  const stmts: Array<{ sql: string; label: string }> = [
    {
      label: 'add callee_id',
      sql: `ALTER TABLE "voip_call" ADD COLUMN IF NOT EXISTS "callee_id" text`,
    },
    {
      label: 'add ended_by',
      sql: `ALTER TABLE "voip_call" ADD COLUMN IF NOT EXISTS "ended_by" text`,
    },
    {
      label: 'add recording_url',
      sql: `ALTER TABLE "voip_call" ADD COLUMN IF NOT EXISTS "recording_url" text`,
    },
    {
      label: 'add transcript_id',
      sql: `ALTER TABLE "voip_call" ADD COLUMN IF NOT EXISTS "transcript_id" uuid`,
    },
    {
      label: 'add fk callee_id → user',
      sql: `DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'voip_call_callee_id_user_id_fk'
              AND table_name = 'voip_call'
          ) THEN
            ALTER TABLE "voip_call"
              ADD CONSTRAINT "voip_call_callee_id_user_id_fk"
              FOREIGN KEY ("callee_id") REFERENCES "user"("id") ON DELETE SET NULL;
          END IF;
        END $$;`,
    },
    {
      label: 'add fk ended_by → user',
      sql: `DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'voip_call_ended_by_user_id_fk'
              AND table_name = 'voip_call'
          ) THEN
            ALTER TABLE "voip_call"
              ADD CONSTRAINT "voip_call_ended_by_user_id_fk"
              FOREIGN KEY ("ended_by") REFERENCES "user"("id") ON DELETE SET NULL;
          END IF;
        END $$;`,
    },
    {
      label: 'normalize legacy status values',
      sql: `UPDATE "voip_call" SET "status" = 'pending' WHERE "status" = 'initiated'`,
    },
    {
      label: 'set status default = pending',
      sql: `ALTER TABLE "voip_call" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    },
  ]

  console.log('\nApplying:')
  for (const s of stmts) {
    try {
      const res = await client.query(s.sql)
      const rowCount = (res as { rowCount?: number | null }).rowCount
      const verb = rowCount && rowCount > 0 ? `${rowCount} row(s) affected` : 'ok (no-op)'
      console.log(`  ✓ ${s.label.padEnd(35)} ${verb}`)
    } catch (err) {
      console.log(`  ✗ ${s.label.padEnd(35)} FAILED`)
      console.error(err)
      throw err
    }
  }

  const after = await listVoipCallColumns(client)
  const added = after.filter((c) => !before.includes(c))

  console.log('\nAfter — voip_call columns:', after.join(', '))
  if (added.length > 0) {
    console.log('Added columns:', added.join(', '))
  } else {
    console.log('No new columns — schema was already in sync.')
  }

  await client.end()
  process.exit(0)
}

main().catch((err) => {
  console.error('Schema fix failed:', err)
  process.exit(1)
})
