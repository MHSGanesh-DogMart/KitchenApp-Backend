// firebase-admin v12 modular API
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

let app: App | null = null;

// ── Initialise Firebase Admin once ────────────────────────────────────────────
export function initFirebase(): void {
  if (getApps().length > 0) {
    app = getApps()[0];
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serviceAccount = require(path.join(
    process.cwd(),
    'padosi-2dd11-firebase-adminsdk-fbsvc-6888859dab.json'
  ));

  app = initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'padosi-2dd11.firebasestorage.app',
  });

  console.log('[Firebase] Admin SDK initialised ✅  bucket:', process.env.FIREBASE_STORAGE_BUCKET || 'padosi-2dd11.firebasestorage.app');
}

// ── Upload a buffer to Firebase Storage ───────────────────────────────────────
export async function uploadToFirebase(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder: string = 'uploads'
): Promise<string> {
  if (!app || getApps().length === 0) initFirebase();

  const storage = getStorage(app!);
  const bucket = storage.bucket();

  const ext = path.extname(originalName) || '.jpg';
  const fileName = `${folder}/img_${Date.now()}_${uuidv4().slice(0, 8)}${ext}`;

  const file = bucket.file(fileName);
  const downloadToken = uuidv4();

  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
  });

  // Build permanent public download URL
  const encodedName = encodeURIComponent(fileName);
  const bucketName = bucket.name;
  const downloadUrl =
    `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedName}?alt=media&token=${downloadToken}`;

  console.log(`[Firebase Storage] ✅ Uploaded → ${downloadUrl}`);
  return downloadUrl;
}
