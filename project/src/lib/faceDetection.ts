import { FaceDetector, FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let faceDetector: FaceDetector | null = null;
let faceLandmarker: FaceLandmarker | null = null;
let initPromise: Promise<void> | null = null;

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';

export async function initFaceDetection(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);

    faceDetector = await FaceDetector.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
    });

    faceLandmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  })();
  return initPromise;
}

export interface DetectedFace {
  count: number;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  faceWidth: number;
  faceHeight: number;
  centerX: number;
  centerY: number;
  sizeRatio: number;
}

export function detectFaces(video: HTMLVideoElement, timestampMs: number): DetectedFace {
  if (!faceDetector) {
    return { count: 0, boundingBox: null, faceWidth: 0, faceHeight: 0, centerX: 0, centerY: 0, sizeRatio: 0 };
  }
  const result = faceDetector.detectForVideo(video, timestampMs);
  const detections = result.detections || [];
  if (detections.length === 0) {
    return { count: 0, boundingBox: null, faceWidth: 0, faceHeight: 0, centerX: 0, centerY: 0, sizeRatio: 0 };
  }
  const d = detections[0];
  const bb = d.boundingBox;
  if (!bb) {
    return { count: detections.length, boundingBox: null, faceWidth: 0, faceHeight: 0, centerX: 0, centerY: 0, sizeRatio: 0 };
  }
  const box = {
    x: bb.originX,
    y: bb.originY,
    width: bb.width,
    height: bb.height,
  };
  return {
    count: detections.length,
    boundingBox: box,
    faceWidth: bb.width,
    faceHeight: bb.height,
    centerX: bb.originX + bb.width / 2,
    centerY: bb.originY + bb.height / 2,
    sizeRatio: (bb.width * bb.height) / (video.videoWidth * video.videoHeight),
  };
}

export interface LandmarkData {
  landmarks: { x: number; y: number; z: number }[];
  blendshapes: { categoryName: string; score: number }[];
  transformationMatrices: unknown[];
}

export function detectLandmarks(video: HTMLVideoElement, timestampMs: number): LandmarkData | null {
  if (!faceLandmarker) return null;
  const result = faceLandmarker.detectForVideo(video, timestampMs);
  if (!result.faceLandmarks || result.faceLandmarks.length === 0) return null;
  return {
    landmarks: result.faceLandmarks[0],
    blendshapes: result.faceBlendshapes?.[0]?.categories || [],
    transformationMatrices: result.facialTransformationMatrixes || [],
  };
}

export function isFaceDetectionReady(): boolean {
  return faceDetector !== null && faceLandmarker !== null;
}
