import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RefreshCw, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { initFaceDetection, detectFaces, type DetectedFace } from '@/lib/faceDetection';

export interface FaceDetectionState {
  faceDetected: boolean;
  faceCount: number;
  faceAligned: boolean;
  faceSize: 'too_small' | 'good' | 'too_large' | 'unknown';
  faceWidth: number;
  faceHeight: number;
  lighting: 'poor' | 'good' | 'too_bright' | 'unknown';
  blur: 'blurry' | 'clear' | 'unknown';
  ready: boolean;
}

export interface CameraDiagnostics {
  permission: 'unknown' | 'granted' | 'denied';
  streamActive: boolean;
  videoReadyState: number;
  videoWidth: number;
  videoHeight: number;
  activeTracks: number;
  detectedFaces: number;
  detectionStatus: string;
}

interface CameraCaptureProps {
  onCapture: (imageData: string, faceState: FaceDetectionState) => void;
  capturedImage: string | null;
  onRetake: () => void;
}

const defaultFaceState: FaceDetectionState = {
  faceDetected: false,
  faceCount: 0,
  faceAligned: false,
  faceSize: 'unknown',
  faceWidth: 0,
  faceHeight: 0,
  lighting: 'unknown',
  blur: 'unknown',
  ready: false,
};

const defaultDiagnostics: CameraDiagnostics = {
  permission: 'unknown',
  streamActive: false,
  videoReadyState: 0,
  videoWidth: 0,
  videoHeight: 0,
  activeTracks: 0,
  detectedFaces: 0,
  detectionStatus: 'Idle',
};

export default function CameraCapture({ onCapture, capturedImage, onRetake }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const modelReadyRef = useRef<boolean>(false);

  const [cameraStatus, setCameraStatus] = useState<'idle' | 'requesting' | 'live' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [faceState, setFaceState] = useState<FaceDetectionState>(defaultFaceState);
  const [diagnostics, setDiagnostics] = useState<CameraDiagnostics>(defaultDiagnostics);
  const [showDiag, setShowDiag] = useState(false);
  const [detectedBox, setDetectedBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [modelLoading, setModelLoading] = useState(false);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStatus('idle');
    setFaceState(defaultFaceState);
    setDetectedBox(null);
    setDiagnostics((d) => ({ ...d, streamActive: false, activeTracks: 0, detectionStatus: 'Stopped' }));
  }, []);

  const analyzeFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw === 0 || vh === 0) {
      rafRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    if (!modelReadyRef.current) {
      rafRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }

    const now = performance.now();
    const detection = detectFaces(video, now);
    const faceCount = detection.count;

    let box: { x: number; y: number; w: number; h: number } | null = null;
    if (detection.boundingBox) {
      const scaleX = video.clientWidth / vw;
      const scaleY = video.clientHeight / vh;
      box = {
        x: detection.boundingBox.x * scaleX,
        y: detection.boundingBox.y * scaleY,
        w: detection.boundingBox.width * scaleX,
        h: detection.boundingBox.height * scaleY,
      };
    }
    setDetectedBox(box);

    const faceDetected = faceCount === 1;
    const sizeRatio = detection.sizeRatio;
    const faceSize: FaceDetectionState['faceSize'] = !faceDetected
      ? 'unknown'
      : sizeRatio < 0.08
        ? 'too_small'
        : sizeRatio > 0.45
          ? 'too_large'
          : 'good';

    const centerX = detection.centerX;
    const centerY = detection.centerY;
    const faceAligned = faceDetected &&
      centerX > vw * 0.3 && centerX < vw * 0.7 &&
      centerY > vh * 0.25 && centerY < vh * 0.75 &&
      faceSize === 'good';

    const canvas = canvasRef.current;
    let lighting: FaceDetectionState['lighting'] = 'unknown';
    let blur: FaceDetectionState['blur'] = 'unknown';
    if (canvas) {
      canvas.width = 80;
      canvas.height = 60;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, 80, 60);
        const imgData = ctx.getImageData(0, 0, 80, 60);
        const pixels = imgData.data;
        let totalBright = 0;
        let totalVar = 0;
        let prev = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          const b = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
          totalBright += b;
          if (i > 0) totalVar += Math.abs(b - prev);
          prev = b;
        }
        const avgBright = totalBright / (pixels.length / 4);
        const avgVar = totalVar / (pixels.length / 4);
        lighting = avgBright < 50 ? 'poor' : avgBright > 230 ? 'too_bright' : 'good';
        blur = avgVar < 8 ? 'blurry' : 'clear';
      }
    }

    const ready = faceAligned && lighting === 'good' && blur === 'clear';

    setFaceState({
      faceDetected,
      faceCount,
      faceAligned,
      faceSize,
      faceWidth: detection.faceWidth,
      faceHeight: detection.faceHeight,
      lighting,
      blur,
      ready,
    });

    setDiagnostics({
      permission: 'granted',
      streamActive: true,
      videoReadyState: video.readyState,
      videoWidth: vw,
      videoHeight: vh,
      activeTracks: streamRef.current?.getTracks().length || 0,
      detectedFaces: faceCount,
      detectionStatus: faceCount === 0 ? 'No Face' : faceCount === 1 ? 'Face Detected' : 'Multiple Faces',
    });

    rafRef.current = requestAnimationFrame(analyzeFrame);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraStatus('requesting');
    setError(null);
    setModelLoading(true);

    try {
      await initFaceDetection();
      modelReadyRef.current = true;
      setModelLoading(false);
    } catch {
      setModelLoading(false);
      setError('Failed to load face detection model. Check your internet connection and try again.');
      setCameraStatus('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.autoplay = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play();
        await new Promise<void>((resolve) => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            resolve();
          } else if (videoRef.current) {
            videoRef.current.addEventListener('loadeddata', () => resolve(), { once: true });
          } else {
            resolve();
          }
        });
      }
      setCameraStatus('live');
      setDiagnostics((d) => ({
        ...d,
        permission: 'granted',
        streamActive: true,
        activeTracks: stream.getTracks().length,
        detectionStatus: 'Detecting...',
      }));
      rafRef.current = requestAnimationFrame(analyzeFrame);
    } catch (err) {
      const e = err as DOMException;
      let msg = '';
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please allow camera access in your browser settings and try again.';
        setDiagnostics((d) => ({ ...d, permission: 'denied' }));
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        msg = 'No camera found. Please connect a camera and try again.';
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        msg = 'Camera is in use by another application. Please close it and try again.';
      } else if (e.name === 'OverconstrainedError') {
        msg = 'Camera does not support the requested resolution. Try a different camera.';
      } else {
        msg = `Camera error: ${e.message || 'Unable to access camera.'}`;
      }
      setError(msg);
      setCameraStatus('error');
    }
  }, [analyzeFrame]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;
    if (!faceState.ready) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.85);
    onCapture(imageData, faceState);
    stopCamera();
  };

  if (capturedImage) {
    return (
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
          <img src={capturedImage} alt="Captured face" className="w-full" />
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-medium text-white">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Capture Successful
          </div>
          <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs text-slate-300 backdrop-blur-sm">
            {faceState.faceWidth} × {faceState.faceHeight}px · {new Date().toLocaleTimeString('en-IN')}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onRetake}
            className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            RETAKE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-black aspect-[16/10]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`h-full w-full object-cover -scale-x-100 ${cameraStatus === 'live' ? 'opacity-100' : 'opacity-0'}`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {cameraStatus === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Camera className="h-12 w-12 text-slate-600" />
            <p className="text-sm text-slate-400">Camera not started</p>
            <button
              onClick={startCamera}
              className="rounded-lg bg-cyan-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-400"
            >
              Start Camera
            </button>
          </div>
        )}

        {cameraStatus === 'requesting' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-500" />
              <p className="text-sm text-slate-400">
                {modelLoading ? 'Loading face detection model...' : 'Requesting camera permission...'}
              </p>
            </div>
          </div>
        )}

        {cameraStatus === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-center text-sm text-red-400">{error}</p>
            <button
              onClick={startCamera}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
            >
              Try Again
            </button>
          </div>
        )}

        {cameraStatus === 'live' && (
          <>
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="text-white">LIVE</span>
            </div>

            <div className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs text-slate-300 backdrop-blur-sm">
              {diagnostics.videoWidth} × {diagnostics.videoHeight}
            </div>

            {detectedBox && (
              <div
                className={`absolute border-2 rounded-lg transition-all duration-100 ${
                  faceState.ready ? 'border-emerald-500' : 'border-amber-500'
                }`}
                style={{
                  left: `${detectedBox.x}px`,
                  top: `${detectedBox.y}px`,
                  width: `${detectedBox.w}px`,
                  height: `${detectedBox.h}px`,
                }}
              >
                <span className="absolute -top-6 left-0 whitespace-nowrap text-xs font-medium text-amber-400">
                  {faceState.faceWidth} × {faceState.faceHeight}px
                </span>
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className="flex flex-wrap gap-2">
                <Chip label="Camera" value="LIVE" color="emerald" />
                <Chip
                  label="Face"
                  value={
                    faceState.faceCount === 0
                      ? 'Searching...'
                      : faceState.faceCount === 1
                        ? faceState.faceAligned
                          ? 'Face Aligned'
                          : 'Face Detected'
                        : 'Multiple Faces'
                  }
                  color={
                    faceState.faceCount === 0
                      ? 'slate'
                      : faceState.faceCount === 1
                        ? faceState.ready
                          ? 'emerald'
                          : 'amber'
                        : 'red'
                  }
                />
                <Chip
                  label="Size"
                  value={
                    faceState.faceSize === 'good'
                      ? 'Good'
                      : faceState.faceSize === 'too_small'
                        ? 'Too Small'
                        : faceState.faceSize === 'too_large'
                          ? 'Too Large'
                          : '--'
                  }
                  color={faceState.faceSize === 'good' ? 'emerald' : faceState.faceSize === 'unknown' ? 'slate' : 'amber'}
                />
                <Chip
                  label="Lighting"
                  value={
                    faceState.lighting === 'good'
                      ? 'Good'
                      : faceState.lighting === 'poor'
                        ? 'Poor'
                        : faceState.lighting === 'too_bright'
                          ? 'Too Bright'
                          : '--'
                  }
                  color={faceState.lighting === 'good' ? 'emerald' : faceState.lighting === 'unknown' ? 'slate' : 'amber'}
                />
                <Chip
                  label="Blur"
                  value={faceState.blur === 'clear' ? 'Clear' : faceState.blur === 'blurry' ? 'Blurry' : '--'}
                  color={faceState.blur === 'clear' ? 'emerald' : faceState.blur === 'unknown' ? 'slate' : 'amber'}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {cameraStatus === 'live' && (
        <>
          {faceState.faceCount === 0 && (
            <p className="text-center text-sm text-amber-400">
              No face detected — position your face inside the frame.
            </p>
          )}
          {faceState.faceCount > 1 && (
            <p className="text-center text-sm text-red-400">
              Multiple faces detected — only one person is allowed.
            </p>
          )}
          {faceState.faceCount === 1 && !faceState.ready && (
            <p className="text-center text-sm text-slate-400">
              {faceState.faceSize === 'too_small'
                ? 'Face too far — move closer to the camera.'
                : faceState.faceSize === 'too_large'
                  ? 'Face too close — move back from the camera.'
                  : !faceState.faceAligned
                    ? 'Move your face to the center of the frame.'
                    : 'Adjust your position for better alignment.'}
            </p>
          )}
          {faceState.ready && (
            <p className="text-center text-sm text-emerald-400">Ready for capture</p>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowDiag((s) => !s)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300"
            >
              <Activity className="h-3.5 w-3.5" />
              Diagnostics
              {showDiag ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={handleCapture}
              disabled={!faceState.ready}
              className="flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Camera className="h-4 w-4" />
              Capture
            </button>
          </div>

          {showDiag && (
            <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4 text-xs">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <DiagRow label="Permission" value={diagnostics.permission} />
                <DiagRow label="Stream" value={diagnostics.streamActive ? 'ACTIVE' : 'INACTIVE'} />
                <DiagRow label="Video Ready State" value={diagnostics.videoReadyState} />
                <DiagRow label="Video Width" value={diagnostics.videoWidth} />
                <DiagRow label="Video Height" value={diagnostics.videoHeight} />
                <DiagRow label="Active Tracks" value={diagnostics.activeTracks} />
                <DiagRow label="Detected Faces" value={diagnostics.detectedFaces} />
                <DiagRow label="Detection" value={diagnostics.detectionStatus} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Chip({ label, value, color }: { label: string; value: string; color: 'emerald' | 'amber' | 'slate' | 'red' }) {
  const colorMap = {
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    slate: 'text-slate-400',
    red: 'text-red-400',
  };
  return (
    <div className="flex items-center gap-1 rounded-md bg-black/40 px-2 py-1 backdrop-blur-sm">
      <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}:</span>
      <span className={`text-[11px] font-medium ${colorMap[color]}`}>{value}</span>
    </div>
  );
}

function DiagRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between border-b border-slate-800/50 py-1">
      <span className="text-slate-500">{label}:</span>
      <span className="font-medium text-slate-300">{value}</span>
    </div>
  );
}
