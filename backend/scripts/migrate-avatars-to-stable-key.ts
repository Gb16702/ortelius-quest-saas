import "dotenv/config";
import {
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { eq, isNotNull } from "drizzle-orm";
import { db } from "../src/infrastructure/database";
import { user } from "../src/infrastructure/database/db/schemas/auth-schema";

const DRY_RUN = process.argv.includes("--dry-run");

const AVATAR_BUCKET = process.env.AVATAR_BUCKET;
const AVATAR_PUBLIC_URL_BASE = process.env.AVATAR_PUBLIC_URL_BASE;
const AWS_REGION =
  process.env.AWS_REGION || process.env.COGNITO_REGION || "eu-west-3";
const COGNITO_REGION = process.env.COGNITO_REGION || AWS_REGION;
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const ACCESS_KEY_ID = process.env.AWS_S3_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_S3_SECRET_ACCESS_KEY;

if (!AVATAR_BUCKET) throw new Error("AVATAR_BUCKET env var is required");
if (!COGNITO_USER_POOL_ID)
  throw new Error("COGNITO_USER_POOL_ID env var is required");
if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY)
  throw new Error("AWS credentials env vars are required");

const credentials = {
  accessKeyId: ACCESS_KEY_ID,
  secretAccessKey: SECRET_ACCESS_KEY,
};

const s3 = new S3Client({ region: AWS_REGION, credentials });
const cognito = new CognitoIdentityProviderClient({
  region: COGNITO_REGION,
  credentials,
});

function stableKey(sub: string): string {
  return `avatars/${sub}/avatar`;
}

function stableUrl(sub: string): string {
  const base = AVATAR_PUBLIC_URL_BASE?.replace(/\/$/, "");
  if (base) return `${base}/${stableKey(sub)}`;
  return `https://${AVATAR_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${stableKey(sub)}`;
}

async function downloadImage(
  url: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  ↳ download ${url} returned ${res.status}`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return { buffer, contentType };
  } catch (err) {
    console.warn(`  ↳ download failed: ${url}`, err);
    return null;
  }
}

async function uploadStable(
  sub: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: AVATAR_BUCKET,
      Key: stableKey(sub),
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=60, must-revalidate",
    })
  );
}

async function getCognitoPicture(sub: string): Promise<string | null> {
  try {
    const res = await cognito.send(
      new AdminGetUserCommand({
        UserPoolId: COGNITO_USER_POOL_ID,
        Username: sub,
      })
    );
    return (
      res.UserAttributes?.find((a) => a.Name === "picture")?.Value || null
    );
  } catch (err) {
    console.warn(`  ↳ cognito lookup failed for ${sub}`, err);
    return null;
  }
}

async function setCognitoPicture(sub: string, url: string): Promise<void> {
  await cognito.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: sub,
      UserAttributes: [{ Name: "picture", Value: url }],
    })
  );
}

async function run() {
  const rows = await db
    .select({
      id: user.id,
      email: user.email,
      image: user.image,
      cognitoSub: user.cognitoSub,
    })
    .from(user)
    .where(isNotNull(user.cognitoSub));

  console.log(
    `Found ${rows.length} users with cognitoSub${DRY_RUN ? " (DRY RUN)" : ""}`
  );

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.cognitoSub) continue;

    const targetUrl = stableUrl(row.cognitoSub);

    if (row.image === targetUrl) {
      skipped++;
      continue;
    }

    let sourceUrl: string | null = row.image;
    if (!sourceUrl) {
      sourceUrl = await getCognitoPicture(row.cognitoSub);
    }

    if (!sourceUrl) {
      skipped++;
      continue;
    }

    console.log(
      `→ ${row.email} (${row.cognitoSub})\n  from: ${sourceUrl}\n  to:   ${targetUrl}`
    );

    if (DRY_RUN) {
      migrated++;
      continue;
    }

    const downloaded = await downloadImage(sourceUrl);
    if (!downloaded) {
      failed++;
      continue;
    }

    try {
      await uploadStable(
        row.cognitoSub,
        downloaded.buffer,
        downloaded.contentType
      );
      await setCognitoPicture(row.cognitoSub, targetUrl);
      await db
        .update(user)
        .set({ image: targetUrl, updatedAt: new Date() })
        .where(eq(user.id, row.id));
      migrated++;
    } catch (err) {
      console.error(`  ↳ migration failed for ${row.email}`, err);
      failed++;
    }
  }

  console.log("\n=== Done ===");
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
