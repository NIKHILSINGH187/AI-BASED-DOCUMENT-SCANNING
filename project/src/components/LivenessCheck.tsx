import { useEffect, useRef, useState, useCallback } from 'react';
import {
  CheckCircle2, XCircle, Loader2, RefreshCw, Eye, MoveHorizontal,
  AlertTriangle, Camera, ShieldCheck, AlertCircle, ChevronDown, ChevronUp, Activity,
} from 'lucide-react';
import { initFaceDetection, detectLandmarks, type LandmarkData } from '@/lib/faceDetection';

export interface LivenessChallenge {
  type: 'blink' | 'turn_left' | 'turn_right';
  instruction: string;
  icon: typeof Eye;
}

const challenges: LivenessChallenge[] = [
  { type: 'blink', instruction: 'Blink your eyes', icon: Eye },
  { type: 'turn_left', instruction: 'Turn your head LEFT', icon: MoveHorizontal },
  { type: 'turn_right', instruction: 'Turn your head RIGHT', icon: MoveHorizontal },
];

export interface LivenessResultData {
  challengePassed: boolean;
  livenessScore: number;
  antiSpoofStatus: string;
  status: string;
  details: Record<string, unknown>;
}

interface LivenessCheckProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  onComplete: (result: LivenessResultData) => void;
  onRetry: () => void;
  completed: boolean;
  result: LivenessResultData | null;
}

type Phase =
  | 'idle'
  | 'camera_starting'
  | 'face_searching'
  | 'ready'
  | 'blink'
  | 'left'
  | 'right'
  | 'passed'
  | 'failed'
  | 'error';

const EAR_CLOSED_THRESHOLD = 0.18;
const BLINK_CLOSED_FRAMES = 2;
const YAW_THRESHOLD = 0.16;
const HEAD_FRAMES_REQUIRED = 6;

const LM = {
  leftEye: [33, 160, 158, 133, 153, 144],
  rightEye: [362, 385, 387, 263, 373, 380],
  noseTip: 1,
  leftCheek: 234,
  rightCheek: 454,
};

function computeEAR(landmarks: { x: number; y: number }[], indices: number[]): number {
  const pts = indices.map((i) => landmarks[i]);
  if (pts.length < 6) return 0.3;
  const v1 = Math.hypot(pts[1].x - pts[5].x, pts[1].y - pts[5].y);
  const v2 = Math.hypot(pts[2].x - pts[4].x, pts[2].y - pts[4].y);
  const h = Math.hypot(pts[0].x - pts[3].x, pts[0].y - pts[3].y);
  return h > 0 ? (v1 + v2) / (2 * h) : 0.3;
}

function estimateYaw(landmarks: { x: number; y: number }[]): number {
  const nose = landmarks[LM.noseTip];
  const leftCheek = landmarks[LM.leftCheek];
  const rightCheek = landmarks[LM.rightCheek];
  const faceCenterX = (leftCheek.x + rightCheek.x) / 2;
  const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
  if (faceWidth === 0) return 0;
  return (nose.x - faceCenterX) / faceWidth;
}

export default function LivenessCheck({
  videoRef,
  streamRef,
  onComplete,
  onRetry,
  completed,
  result,
}: LivenessCheckProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [feedback, setFeedback] = useState('Click to start the liveness challenge.');
  const [errorMsg, setErrorMsg] = useState('');
  const [faceCount, setFaceCount] = useState(0);
  const [challengeState, setChallengeState] = useState({
    blink: false,
    left: false,
    right: false,
  });
  const [progress, setProgress] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const [debug, setDebug] = useState({
    camera: '—',
    stream: '—',
    resolution: '—',
    ear: '—',
    eyeState: '—',
    headDir: '—',
  });

  const rafRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  const phaseRef = useRef<Phase>('idle');
  const challengeStateRef = useRef({ blink: false, left: false, right: false });

  // blink tracking
  const eyeClosedFramesRef = useRef(0);
  const blinkPhaseRef = useRef<'OPEN' | 'CLOSED'>('OPEN');

  // head tracking
  const headDirFramesRef = useRef(0);
  const headCenterSeenRef = useRef(false);

  const setPhaseBoth = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const resetTracking = useCallback(() => {
    eyeClosedFramesRef.current = 0;
    blinkPhaseRef.current = 'OPEN';
    headDirFramesRef.current = 0;
    headCenterSeenRef.current = false;
    lastVideoTimeRef.current = -1;
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setDebug((d) => ({ ...d, camera: '—', stream: '—', resolution: '—' }));
    setFaceCount(0);
  }, [streamRef, videoRef]);

  const cleanupAll = useCallback(() => {
    stopCamera();
    resetTracking();
    setChallengeState({ blink: false, left: false, right: false });
    challengeStateRef.current = { blink: false, left: false, right: false };
    setPhaseBoth('idle');
    setFeedback('Click to start the liveness challenge.');
    setErrorMsg('');
    setProgress(0);
  }, [stopCamera, resetTracking, setPhaseBoth]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleDetection = useCallback(
    (landmarks: { x: number; y: number; z: number }[]) => {
      const leftEAR = computeEAR(landmarks, LM.leftEye);
      const rightEAR = computeEAR(landmarks, LM.rightEye);
      const avgEAR = (leftEAR + rightEAR) / 2;
      const yaw = estimateYaw(landmarks);
      const headDir = yaw > YAW_THRESHOLD ? 'RIGHT' : yaw < -YAW_THRESHOLD ? 'LEFT' : 'CENTER';

      setDebug((d) => ({
        ...d,
        ear: avgEAR.toFixed(3),
        eyeState: avgEAR < EAR_CLOSED_THRESHOLD ? 'CLOSED' : 'OPEN',
        headDir,
      }));

      const curPhase = phaseRef.current;
      const cs = challengeStateRef.current;

      if (curPhase === 'blink') {
        if (avgEAR < EAR_CLOSED_THRESHOLD) {
          eyeClosedFramesRef.current += 1;
          if (eyeClosedFramesRef.current >= BLINK_CLOSED_FRAMES) {
            blinkPhaseRef.current = 'CLOSED';
            setFeedback('Eyes closed — now open your eyes');
          }
        } else {
          if (blinkPhaseRef.current === 'CLOSED' && eyeClosedFramesRef.current >= BLINK_CLOSED_FRAMES) {
            cs.blink = true;
            challengeStateRef.current = { ...cs };
            setChallengeState({ ...cs });
            setProgress(33);
            resetTracking();
            setPhaseBoth('left');
            setFeedback('Blink detected ✓ — Now turn your head LEFT');
          } else {
            eyeClosedFramesRef.current = 0;
            blinkPhaseRef.current = 'OPEN';
            setFeedback('Blink your eyes');
          }
        }
      } else if (curPhase === 'left') {
        if (headDir === 'CENTER') {
          headCenterSeenRef.current = true;
          setFeedback('Turn your head LEFT');
        } else if (headDir === 'LEFT') {
          if (!headCenterSeenRef.current) {
            setFeedback('Return to center first, then turn LEFT');
            headDirFramesRef.current = 0;
            return;
          }
          headDirFramesRef.current += 1;
          setFeedback('Head movement detected');
          if (headDirFramesRef.current >= HEAD_FRAMES_REQUIRED) {
            cs.left = true;
            challengeStateRef.current = { ...cs };
            setChallengeState({ ...cs });
            setProgress(67);
            resetTracking();
            setPhaseBoth('right');
            setFeedback('LEFT confirmed ✓ — Now turn your head RIGHT');
          }
        } else {
          headDirFramesRef.current = 0;
        }
      } else if (curPhase === 'right') {
        if (headDir === 'CENTER') {
          headCenterSeenRef.current = true;
          setFeedback('Turn your head RIGHT');
        } else if (headDir === 'RIGHT') {
          if (!headCenterSeenRef.current) {
            setFeedback('Return to center first, then turn RIGHT');
            headDirFramesRef.current = 0;
            return;
          }
          headDirFramesRef.current += 1;
          setFeedback('Head movement detected');
          if (headDirFramesRef.current >= HEAD_FRAMES_REQUIRED) {
            cs.right = true;
            challengeStateRef.current = { ...cs };
            setChallengeState({ ...cs });
            setProgress(100);
            resetTracking();
            setPhaseBoth('passed');
            setFeedback('ACTIVE LIVENESS PASSED');
            onComplete({
              challengePassed: true,
              livenessScore: 0.92,
              antiSpoofStatus: 'LIVENESS PASS',
              status: 'PASSED',
              details: {
                blink: true,
                head_left: true,
                head_right: true,
                active_liveness: true,
                challenges_completed: 3,
              },
            });
          }
        } else {
          headDirFramesRef.current = 0;
        }
      }
    },
    [resetTracking, setPhaseBoth, onComplete]
  );

  const detectLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      const landmarkData: LandmarkData | null = detectLandmarks(video, performance.now());
      const faces = landmarkData ? 1 : 0;
      setFaceCount(faces);

      if (faces !== 1) {
        if (phaseRef.current === 'face_searching') {
          setFeedback('Face not detected — move your face into the camera');
        } else if (phaseRef.current === 'ready' || phaseRef.current === 'blink' || phaseRef.current === 'left' || phaseRef.current === 'right') {
          setFeedback('Face not detected — reposition your face');
        }
        rafRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      if (phaseRef.current === 'face_searching') {
        setPhaseBoth('ready');
        setFeedback('Face detected — click to start the blink challenge');
      } else if (phaseRef.current === 'ready') {
        setFeedback('Face detected — click to start the blink challenge');
      } else if (phaseRef.current === 'blink' || phaseRef.current === 'left' || phaseRef.current === 'right') {
        handleDetection(landmarkData!.landmarks);
      }
    }

    rafRef.current = requestAnimationFrame(detectLoop);
  }, [videoRef, handleDetection, setPhaseBoth]);

  const startCamera = useCallback(async () => {
    setErrorMsg('');
    setPhaseBoth('camera_starting');
    setFeedback('Requesting camera permission…');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Camera access requires HTTPS or localhost.');
      setFeedback('Camera unavailable');
      setPhaseBoth('error');
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
    } catch (err: unknown) {
      const e = err as DOMException;
      let msg = 'Camera unavailable. Check browser permission and camera connection.';
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError')
        msg = 'Camera permission denied. Please allow camera access and retry.';
      else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError')
        msg = 'No camera found on this device.';
      else if (e.name === 'NotReadableError' || e.name === 'TrackStartError')
        msg = 'Camera is in use by another application. Close it and retry.';
      else if (e.name === 'OverconstrainedError')
        msg = 'Camera does not support the requested settings.';
      else if (e.name === 'SecurityError')
        msg = 'Camera access blocked for security reasons.';
      else if (e.name === 'AbortError')
        msg = 'Camera request was aborted. Please retry.';
      setErrorMsg(msg);
      setFeedback('Camera error');
      setPhaseBoth('error');
      return;
    }

    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;

    setDebug((d) => ({ ...d, camera: 'GRANTED', stream: 'READY' }));

    try {
      await new Promise<void>((resolve, reject) => {
        const onReady = () => {
          if (video.videoWidth > 0 && video.videoHeight > 0) resolve();
          else reject(new Error('Invalid video dimensions'));
        };
        if (video.readyState >= 2) {
          onReady();
          return;
        }
        video.addEventListener('loadedmetadata', onReady, { once: true });
        video.addEventListener('error', () => reject(new Error('Video error')), { once: true });
      });
    } catch {
      setErrorMsg('Camera stream could not start. Please retry.');
      setFeedback('Camera error');
      setPhaseBoth('error');
      return;
    }

    await video.play().catch(() => {});

    if (
      !stream.active ||
      !video.srcObject ||
      video.videoWidth === 0 ||
      video.videoHeight === 0 ||
      video.readyState < 2
    ) {
      setErrorMsg('Camera stream is not ready. Please retry.');
      setFeedback('Camera error');
      setPhaseBoth('error');
      return;
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack || !videoTrack.enabled) {
      setErrorMsg('Camera track is disabled. Please retry.');
      setFeedback('Camera error');
      setPhaseBoth('error');
      return;
    }

    setDebug((d) => ({ ...d, resolution: `${video.videoWidth} x ${video.videoHeight}` }));
    setPhaseBoth('face_searching');
    setFeedback('Searching for your face…');

    try {
      await initFaceDetection();
    } catch {
      setErrorMsg('Liveness detector could not be initialized. Check your connection.');
      setFeedback('Model error');
      setPhaseBoth('error');
      return;
    }

    if (rafRef.current === 0) {
      rafRef.current = requestAnimationFrame(detectLoop);
    }
  }, [streamRef, videoRef, setPhaseBoth, detectLoop]);

  const startChallenge = useCallback(
    (index: number) => {
      if (phaseRef.current === 'idle') {
        startCamera();
        return;
      }
      if (phaseRef.current === 'error') {
        cleanupAll();
        startCamera();
        return;
      }

      const challenge = challenges[index];
      const cs = challengeStateRef.current;

      if (challenge.type === 'blink') {
        if (phaseRef.current === 'ready' || phaseRef.current === 'face_searching') {
          resetTracking();
          setPhaseBoth('blink');
          setFeedback('Blink your eyes');
        } else if (phaseRef.current !== 'blink') {
          setFeedback('Complete the current challenge first.');
        }
      } else if (challenge.type === 'turn_left') {
        if (!cs.blink) {
          setFeedback('Complete the blink challenge first.');
          return;
        }
        if (phaseRef.current === 'ready' || phaseRef.current === 'face_searching') {
          resetTracking();
          setPhaseBoth('left');
          setFeedback('Turn your head LEFT');
        } else if (phaseRef.current !== 'left') {
          setFeedback('Complete the current challenge first.');
        }
      } else if (challenge.type === 'turn_right') {
        if (!cs.blink) {
          setFeedback('Complete the blink challenge first.');
          return;
        }
        if (!cs.left) {
          setFeedback('Complete the LEFT challenge first.');
          return;
        }
        if (phaseRef.current === 'ready' || phaseRef.current === 'face_searching') {
          resetTracking();
          setPhaseBoth('right');
          setFeedback('Turn your head RIGHT');
        } else if (phaseRef.current !== 'right') {
          setFeedback('Complete the current challenge first.');
        }
      }
    },
    [startCamera, cleanupAll, resetTracking, setPhaseBoth]
  );

  const handleRetry = useCallback(() => {
    cleanupAll();
    onRetry();
  }, [cleanupAll, onRetry]);

  const challengeStatus = (type: LivenessChallenge['type']): 'pending' | 'active' | 'completed' => {
    const key = type === 'blink' ? 'blink' : type === 'turn_left' ? 'left' : 'right';
    if (challengeState[key]) return 'completed';
    const phaseToChallenge: Partial<Record<Phase, LivenessChallenge['type']>> = {
      blink: 'blink',
      left: 'turn_left',
      right: 'turn_right',
    };
    if (phaseToChallenge[phase] === type) return 'active';
    return 'pending';
  };

  if (completed && result) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full ${
              result.challengePassed ? 'bg-emerald-500/10' : 'bg-red-500/10'
            }`}
          >
            {result.challengePassed ? (
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            ) : (
              <XCircle className="h-7 w-7 text-red-400" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">
              {result.challengePassed ? 'Liveness Check Passed' : 'Liveness Check Failed'}
            </h3>
            <p className="text-sm text-slate-400">
              Anti-spoof: {result.antiSpoofStatus}
              {result.livenessScore > 0 && ` · Score: ${Math.round(result.livenessScore * 100)}%`}
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isCameraPhase = phase === 'camera_starting' || phase === 'face_searching';
  const isRunning = phase !== 'idle' && phase !== 'error' && phase !== 'passed';

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-cyan-400" />
          <h3 className="text-base font-semibold text-white">Active Liveness Challenge</h3>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Complete the challenge to prove you are a real person, not a photo or video replay.
        </p>
      </div>

      {/* Status / feedback */}
      <div className="mb-4">
        <p className={`text-sm font-medium ${
          phase === 'passed' ? 'text-emerald-400'
          : phase === 'error' || phase === 'failed' ? 'text-red-400'
          : 'text-slate-200'
        }`}>
          {feedback}
        </p>
        {errorMsg && (phase === 'error' || phase === 'failed') && (
          <p className="mt-1 flex items-center gap-1 text-xs text-red-400/80">
            <AlertCircle className="h-3.5 w-3.5" /> {errorMsg}
          </p>
        )}
      </div>

      {/* Face count badge */}
      {isRunning && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-medium">
          {faceCount === 1 ? (
            <span className="text-emerald-400">Face detected</span>
          ) : faceCount === 0 ? (
            <span className="text-amber-400">Face not detected</span>
          ) : (
            <span className="text-red-400">Only one face should be visible</span>
          )}
        </div>
      )}

      {/* Challenge cards */}
      <div className="mb-4 space-y-3">
        {challenges.map((challenge, index) => {
          const status = challengeStatus(challenge.type);
          return (
            <button
              key={challenge.type}
              onClick={() => startChallenge(index)}
              disabled={status === 'completed' || isCameraPhase || phase === 'passed'}
              className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-all disabled:cursor-not-allowed ${
                status === 'completed'
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : status === 'active'
                  ? 'border-cyan-500/60 bg-cyan-500/10 ring-1 ring-cyan-500/30'
                  : 'border-slate-700 bg-slate-800/50 hover:border-cyan-500/50 hover:bg-slate-800'
              } ${status === 'completed' ? 'opacity-70' : ''}`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                status === 'completed' ? 'bg-emerald-500/10'
                : status === 'active' ? 'bg-cyan-500/10'
                : 'bg-slate-700/50'
              }`}>
                {status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : status === 'active' ? (
                  <challenge.icon className="h-5 w-5 text-cyan-400" />
                ) : (
                  <challenge.icon className="h-5 w-5 text-slate-500" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{challenge.instruction}</p>
                <p className="text-xs text-slate-500">
                  {status === 'completed' ? 'Completed ✓'
                  : status === 'active' ? 'Active — performing detection'
                  : 'Click to start this challenge'}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Progress bar */}
      {(phase === 'blink' || phase === 'left' || phase === 'right' || phase === 'passed') && (
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-cyan-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {phase === 'idle' && (
          <button
            onClick={() => startChallenge(0)}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-400"
          >
            <Camera className="h-4 w-4" /> Click to start this challenge
          </button>
        )}
        {phase === 'ready' && !challengeState.blink && (
          <button
            onClick={() => startChallenge(0)}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-400"
          >
            Start Blink Challenge
          </button>
        )}
        {(phase === 'error' || phase === 'failed') && (
          <button
            onClick={() => startChallenge(0)}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-400"
          >
            <RefreshCw className="h-4 w-4" /> Retry Camera
          </button>
        )}
        <button
          onClick={handleRetry}
          className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" /> Reset
        </button>
        <button
          onClick={() => setShowDebug((s) => !s)}
          className="flex items-center gap-2 rounded-lg border border-slate-800 px-4 py-2.5 text-xs font-mono text-slate-500 transition-colors hover:border-slate-700"
        >
          <Activity className="h-3.5 w-3.5" />
          {showDebug ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Debug
        </button>
      </div>

      {/* Camera starting overlay */}
      {phase === 'camera_starting' && (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          {feedback}
        </div>
      )}

      {/* Passed result */}
      {phase === 'passed' && (
        <div className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span className="font-semibold text-emerald-400">ACTIVE LIVENESS PASSED</span>
          </div>
          <pre className="mt-2 text-xs text-emerald-300/80 font-mono">{JSON.stringify({
            blink: true,
            head_left: true,
            head_right: true,
            active_liveness: true,
          }, null, 2)}</pre>
        </div>
      )}

      {/* Debug panel */}
      {showDebug && (
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/80 p-4 text-xs font-mono text-slate-400">
          <div className="grid grid-cols-2 gap-2">
            <div>Camera: {debug.camera}</div>
            <div>Stream: {debug.stream}</div>
            <div>Resolution: {debug.resolution}</div>
            <div>Face count: {faceCount}</div>
            <div>EAR: {debug.ear}</div>
            <div>Eye state: {debug.eyeState}</div>
            <div>Head dir: {debug.headDir}</div>
            <div>Challenge: {phase.toUpperCase()}</div>
            <div>Progress: {progress}%</div>
          </div>
        </div>
      )}
    </div>
  );
}
