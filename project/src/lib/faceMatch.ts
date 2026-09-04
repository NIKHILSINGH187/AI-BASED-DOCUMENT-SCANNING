
import { initFaceDetection, detectFacesInImage, detectLandmarksInImage } from './faceDetection';

export interface FaceMatchResult {
  status: 'MATCH' | 'NO_MATCH' | 'INCONCLUSIVE';
  similarity: number;
  referenceFaceImage: string | null;
  details: Record<string, unknown>;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

const LEFT_EYE_OUTER = 33;
const LEFT_EYE_INNER = 133;
const RIGHT_EYE_OUTER = 263;
const RIGHT_EYE_INNER = 362;
const NOSE_TIP = 1;
const MOUTH_LEFT = 61;
const MOUTH_RIGHT = 291;
const CHIN = 152;
const FOREHEAD = 10;

const SIGNATURE_POINTS = [
  LEFT_EYE_OUTER,
  LEFT_EYE_INNER,
  RIGHT_EYE_OUTER,
  RIGHT_EYE_INNER,
  NOSE_TIP,
  MOUTH_LEFT,
  MOUTH_RIGHT,
  CHIN,
  FOREHEAD,
];

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function computeSignature(landmarks: { x: number; y: number; z: number }[]): number[] {
  const leftEyeCenter = {
    x: (landmarks[LEFT_EYE_OUTER].x + landmarks[LEFT_EYE_INNER].x) / 2,
    y: (landmarks[LEFT_EYE_OUTER].y + landmarks[LEFT_EYE_INNER].y) / 2,
  };
  const rightEyeCenter = {
    x: (landmarks[RIGHT_EYE_OUTER].x + landmarks[RIGHT_EYE_INNER].x) / 2,
    y: (landmarks[RIGHT_EYE_OUTER].y + landmarks[RIGHT_EYE_INNER].y) / 2,
  };
  const interocular = dist(leftEyeCenter, rightEyeCenter) || 1;

  const sig: number[] = [];
  for (let i = 0; i < SIGNATURE_POINTS.length; i++) {
    for (let j = i + 1; j < SIGNATURE_POINTS.length; j++) {
      const p1 = landmarks[SIGNATURE_POINTS[i]];
      const p2 = landmarks[SIGNATURE_POINTS[j]];
      sig.push(dist(p1, p2) / interocular);
    }
  }
  return sig;
}

function similarityFromSignatures(sigA: number[], sigB: number[]): number {
  if (sigA.length !== sigB.length || sigA.length === 0) return 0;
  let sumSqDiff = 0;
  let sumSqA = 0;
  for (let i = 0; i < sigA.length; i++) {
    const diff = sigA[i] - sigB[i];
    sumSqDiff += diff * diff;
    sumSqA += sigA[i] * sigA[i];
  }
  const rmse = Math.sqrt(sumSqDiff / sigA.length);
  const scale = Math.sqrt(sumSqA / sigA.length) || 1;
  const normalizedError = rmse / scale;
  const similarity = Math.max(0, Math.min(100, (1 - normalizedError) * 100));
  return Math.round(similarity);
}

async function cropFace(
  image: HTMLImageElement,
  box: { x: number; y: number; width: number; height: number },
): Promise<string> {
  const padding = 0.6;
  const padX = box.width * padding;
  const padY = box.height * padding;
  const x = Math.max(0, box.x - padX);
  const y = Math.max(0, box.y - padY);
  const w = Math.min(image.naturalWidth - x, box.width + padX * 2);
  const h = Math.min(image.naturalHeight - y, box.height + padY * 2);

  const side = Math.max(w, h);
  const MIN_OUTPUT = 320;
  const outputSize = Math.max(side, MIN_OUTPUT);

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return image.src;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, outputSize, outputSize);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const scale = outputSize / side;
  const destW = w * scale;
  const destH = h * scale;
  const destX = (outputSize - destW) / 2;
  const destY = (outputSize - destH) / 2;

  ctx.drawImage(image, x, y, w, h, destX, destY, destW, destH);
  return canvas.toDataURL('image/jpeg', 0.9);
}

export async function compareFaces(
  documentImageDataUrl: string,
  liveImageDataUrl: string,
): Promise<FaceMatchResult> {
  try {
    await initFaceDetection();

    const [docImg, liveImg] = await Promise.all([
      loadImage(documentImageDataUrl),
      loadImage(liveImageDataUrl),
    ]);

    const t1 = performance.now() + 1;
    const docFaceDetection = detectFacesInImage(docImg, t1);

    if (docFaceDetection.count === 0 || !docFaceDetection.boundingBox) {
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

    const referenceFaceImage = await cropFace(docImg, docFaceDetection.boundingBox);
    const docCropImg = await loadImage(referenceFaceImage);

    const t2 = t1 + 1;
    let docLandmarks = detectLandmarksInImage(docCropImg, t2);
    const t2b = t2 + 1;
    if (!docLandmarks) docLandmarks = detectLandmarksInImage(docImg, t2b);

    const t3 = t2b + 1;
    const liveFaceDetection = detectFacesInImage(liveImg, t3);
    let liveLandmarkSource = liveImg;
    let t4 = t3 + 1;
    if (liveFaceDetection.count > 0 && liveFaceDetection.boundingBox) {
      const liveCrop = await cropFace(liveImg, liveFaceDetection.boundingBox);
      liveLandmarkSource = await loadImage(liveCrop);
    }
    let liveLandmarks = detectLandmarksInImage(liveLandmarkSource, t4);
    if (!liveLandmarks && liveLandmarkSource !== liveImg) {
      t4 += 1;
      liveLandmarks = detectLandmarksInImage(liveImg, t4);
    }

    if (!docLandmarks || !liveLandmarks) {
      const failedSide = !docLandmarks && !liveLandmarks
        ? 'both the document and live photos'
        : !docLandmarks
          ? 'the document photo'
          : 'the live photo';
      return {
        status: 'INCONCLUSIVE',
        similarity: 0,
        referenceFaceImage,
        details: {
          note: `Facial landmarks could not be extracted from ${failedSide}.`,
          document_face_detected: true,
          document_landmarks_detected: !!docLandmarks,
          live_landmarks_detected: !!liveLandmarks,
        },
      };
    }

    const docSig = computeSignature(docLandmarks.landmarks);
    const liveSig = computeSignature(liveLandmarks.landmarks);
    const similarity = similarityFromSignatures(docSig, liveSig);

    const status: FaceMatchResult['status'] =
      similarity >= 75 ? 'MATCH' : similarity <= 45 ? 'NO_MATCH' : 'INCONCLUSIVE';

    return {
      status,
      similarity,
      referenceFaceImage,
      details: {
        note: 'Geometric facial landmark comparison (client-side, MediaPipe Face Mesh). Not a deep-learning face embedding match — treat as a supporting signal, not a final legal determination.',
        method: 'landmark_geometry_signature',
        document_face_detected: true,
        document_landmarks_detected: true,
        live_landmarks_detected: true,
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
