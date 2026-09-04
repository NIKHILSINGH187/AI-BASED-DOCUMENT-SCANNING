
import * as faceapi from 'face-api.js';

export interface FaceMatchResult {
  status: 'MATCH' | 'NO_MATCH' | 'INCONCLUSIVE';
  similarity: number;
  referenceFaceImage: string | null;
  details: Record<string, unknown>;
}

// Models are loaded on demand from a public CDN mirror of the face-api.js
// weights, so no large model files need to live in this repo.
const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

let modelsLoaded = false;
let loadPromise: Promise<void> | null = null;

async function initFaceMatchModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  })();
  return loadPromise;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

async function cropFace(
  image: HTMLImageElement,
  box: { x: number; y: number; width: number; height: number },
): Promise<string> {
  const padding = 0.4;
  const padX = box.width * padding;
  const padY = box.height * padding;
  const x = Math.max(0, box.x - padX);
  const y = Math.max(0, box.y - padY);
  const w = Math.min(image.naturalWidth - x, box.width + padX * 2);
  const h = Math.min(image.naturalHeight - y, box.height + padY * 2);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return image.src;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, x, y, w, h, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.9);
}

// face-api.js's faceRecognitionNet produces a 128-dimensional descriptor per
// face. The Euclidean distance between two descriptors is the model's
// actual, calibrated similarity measure — these threshold values (0.5 / 0.6)
// are the commonly used defaults for this model: distances below ~0.5 are a
// confident same-person match, distances above ~0.6 are confidently
// different people, and anything in between is genuinely ambiguous.
const MATCH_DISTANCE = 0.5;
const NO_MATCH_DISTANCE = 0.6;

function distanceToSimilarity(distance: number): number {
  const similarity = Math.max(0, Math.min(100, (1 - distance) * 100));
  return Math.round(similarity);
}

export async function compareFaces(
  documentImageDataUrl: string,
  liveImageDataUrl: string,
): Promise<FaceMatchResult> {
  try {
    await initFaceMatchModels();

    const [docImg, liveImg] = await Promise.all([
      loadImage(documentImageDataUrl),
      loadImage(liveImageDataUrl),
    ]);

    const docDetection = await faceapi
      .detectSingleFace(docImg)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!docDetection) {
      return {
        status: 'INCONCLUSIVE',
        similarity: 0,
        referenceFaceImage: null,
        details: {
          note: 'No face detected in the uploaded document. Biometric comparison could not be performed.',
          document_face_detected: false,
        },
      };
    }

    const referenceFaceImage = await cropFace(docImg, docDetection.detection.box);

    const liveDetection = await faceapi
      .detectSingleFace(liveImg)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!liveDetection) {
      return {
        status: 'INCONCLUSIVE',
        similarity: 0,
        referenceFaceImage,
        details: {
          note: 'No face detected in the live capture. Biometric comparison could not be performed.',
          document_face_detected: true,
          live_face_detected: false,
        },
      };
    }

    const distance = faceapi.euclideanDistance(
      docDetection.descriptor,
      liveDetection.descriptor,
    );
    const similarity = distanceToSimilarity(distance);

    const status: FaceMatchResult['status'] =
      distance <= MATCH_DISTANCE ? 'MATCH' : distance >= NO_MATCH_DISTANCE ? 'NO_MATCH' : 'INCONCLUSIVE';

    return {
      status,
      similarity,
      referenceFaceImage,
      details: {
        note: 'Deep-learning face recognition (face-api.js FaceRecognitionNet, 128-d descriptor). Euclidean distance between descriptors is the primary signal, not raw geometry.',
        method: 'face_recognition_net_descriptor',
        euclidean_distance: Math.round(distance * 1000) / 1000,
        document_face_detected: true,
        live_face_detected: true,
      },
    };
  } catch (err) {
    return {
      status: 'INCONCLUSIVE',
      similarity: 0,
      referenceFaceImage: null,
      details: {
        note: 'Biometric comparison failed due to an internal error.',
        error: err instanceof Error ? err.message : 'unknown',
      },
    };
  }
}
