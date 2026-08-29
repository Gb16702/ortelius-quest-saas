import "dotenv/config";
import { ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";

const AVATAR_BUCKET = process.env.AVATAR_BUCKET;
const AWS_REGION =
  process.env.AWS_REGION || process.env.COGNITO_REGION || "eu-west-3";
const ACCESS_KEY_ID = process.env.AWS_S3_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_S3_SECRET_ACCESS_KEY;
const SIZE_PX = 512;
const QUALITY = 85;

if (!AVATAR_BUCKET) throw new Error("AVATAR_BUCKET env var is required");
if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY)
  throw new Error("AWS credentials env vars are required");

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
});

async function listAvatarKeys(): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: AVATAR_BUCKET,
        Prefix: "avatars/",
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key && obj.Key.endsWith("/avatar")) keys.push(obj.Key);
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

async function reprocessKey(key: string): Promise<{ before: string; after: string }> {
  const url = `https://${AVATAR_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${key}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  const meta = await sharp(buffer).metadata();
  const before = `${meta.width}x${meta.height}`;

  const processed = await sharp(buffer)
    .rotate()
    .resize(SIZE_PX, SIZE_PX, { fit: "cover", position: "attention" })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toBuffer();

  await s3.send(
    new PutObjectCommand({
      Bucket: AVATAR_BUCKET,
      Key: key,
      Body: processed,
      ContentType: "image/jpeg",
      CacheControl: "no-cache",
    })
  );

  return { before, after: `${SIZE_PX}x${SIZE_PX}` };
}

async function run() {
  const keys = await listAvatarKeys();
  console.log(`Found ${keys.length} avatar(s) to reprocess`);
  let ok = 0;
  let failed = 0;
  for (const key of keys) {
    try {
      const { before, after } = await reprocessKey(key);
      console.log(`✓ ${key}  ${before} → ${after}`);
      ok++;
    } catch (err) {
      console.error(`✗ ${key}`, err);
      failed++;
    }
  }
  console.log(`\nDone. ok=${ok} failed=${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
