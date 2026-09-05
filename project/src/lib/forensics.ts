
export interface ForensicAnalysis {
  image_quality: number;
  compression_anomaly: boolean;
  pixel_inconsistency: boolean;
  copy_paste_anomaly: boolean;
  ela_result: Record<string, unknown> | null;
  tampering_probability: number;
  suspicious_regions: unknown[];
  cnn_authenticity_score: number;
  status: string;
  details: Record<string, unknown>;
}

export async function analyzeForensics(imageData: string): Promise<ForensicAnalysis> {
  const img = new Image();
  img.src = imageData;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const canvas = document.createElement('canvas');
  const maxDim = 512;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageDataObj.data;

  let totalBrightness = 0;
  let totalVariance = 0;
  let prevBrightness = 0;
  let edgeCount = 0;
  const brightnessValues: number[] = [];

  for (let i = 0; i < pixels.length; i += 4) {
    const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    totalBrightness += brightness;
    brightnessValues.push(brightness);
    if (i > 4) {
      totalVariance += Math.abs(brightness - prevBrightness);
      if (Math.abs(brightness - prevBrightness) > 30) edgeCount++;
    }
    prevBrightness = brightness;
  }

  const avgBrightness = totalBrightness / (pixels.length / 4);
  const avgVariance = totalVariance / (pixels.length / 4);

  const mean = brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length;
  const variance =
    brightnessValues.reduce((a, b) => a + (b - mean) ** 2, 0) / brightnessValues.length;
  const stdDev = Math.sqrt(variance);

  const image_quality = Math.min(100, Math.max(0, (stdDev / 60) * 100));

  const blockSimilarity = detectCopyPaste(pixels, canvas.width, canvas.height);
  const copy_paste_anomaly = blockSimilarity > 0.85;

  const compressionAnomalyScore = detectCompressionAnomaly(pixels, canvas.width, canvas.height);
  const compression_anomaly = compressionAnomalyScore > 0.7;

  // A real ID document typically has large plain/white background regions,
  // which naturally pull the *global* average pixel-to-pixel variance down
  // even though the document is completely genuine. Requiring BOTH signals
  // together (low variance AND low edge count) avoids flagging documents
  // that are simply plain-background-heavy but still contain normal amounts
  // of text/photo detail.
  const pixel_inconsistency = avgVariance < 5 && edgeCount < (pixels.length / 4) * 0.01;

  const elaCanvas = await performELA(ctx, canvas.width, canvas.height);
  const elaScore = elaCanvas.score;
  const elaResult = {
    method: 'Error Level Analysis (JPEG re-compression differential)',
    ela_score: elaScore,
    description:
      elaScore > 0.5
        ? 'Significant ELA anomalies detected — possible tampering'
        : 'ELA analysis shows no significant anomalies',
  };

  const tampering_probability = Math.min(
    100,
    (compressionAnomalyScore * 30 +
      (copy_paste_anomaly ? 30 : 0) +
      (pixel_inconsistency ? 20 : 0) +
      elaScore * 20),
  );

  const cnn_authenticity_score = Math.max(0, 100 - tampering_probability);

  const suspicious_regions = elaCanvas.regions;

  const anomalyFlagCount =
    (copy_paste_anomaly ? 1 : 0) + (pixel_inconsistency ? 1 : 0) + (compression_anomaly ? 1 : 0);
  // A single weak heuristic flag (e.g. one caused by messaging-app
  // recompression) is common even on genuine documents and shouldn't alone
  // trigger a manual review. Require at least two independent signals to
  // agree before flagging for review.
  const status =
    tampering_probability > 60 || anomalyFlagCount >= 3
      ? 'FLAGGED'
      : anomalyFlagCount >= 2
        ? 'REVIEW'
        : 'PASSED';

  return {
    image_quality: Math.round(image_quality * 100) / 100,
    compression_anomaly,
    pixel_inconsistency,
    copy_paste_anomaly,
    ela_result: elaResult,
    tampering_probability: Math.round(tampering_probability * 100) / 100,
    suspicious_regions,
    cnn_authenticity_score: Math.round(cnn_authenticity_score * 100) / 100,
    status,
    details: {
      avg_brightness: Math.round(avgBrightness),
      avg_variance: Math.round(avgVariance),
      edge_count: edgeCount,
      std_dev: Math.round(stdDev),
      block_similarity: Math.round(blockSimilarity * 100) / 100,
      compression_score: Math.round(compressionAnomalyScore * 100) / 100,
      analysis_method: 'Client-side pixel analysis + ELA (Error Level Analysis)',
      cnn_note: 'CNN forensic classifier not connected — pixel/ELA heuristics used',
    },
  };
}

function detectCopyPaste(pixels: Uint8ClampedArray, width: number, height: number): number {
  const blockSize = 16;
  interface Block { avg: number; variance: number }
  const blocks: Block[] = [];
  for (let y = 0; y < height - blockSize; y += blockSize) {
    for (let x = 0; x < width - blockSize; x += blockSize) {
      let sum = 0;
      const vals: number[] = [];
      for (let by = 0; by < blockSize; by++) {
        for (let bx = 0; bx < blockSize; bx++) {
          const idx = ((y + by) * width + (x + bx)) * 4;
          const v = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
          sum += v;
          vals.push(v);
        }
      }
      const avg = sum / vals.length;
      const variance = vals.reduce((a, b) => a + (b - avg) ** 2, 0) / vals.length;
      blocks.push({ avg, variance });
    }
  }

  const MIN_BLOCK_VARIANCE = 25;
  const texturedBlocks = blocks.filter((b) => b.variance > MIN_BLOCK_VARIANCE);
  if (texturedBlocks.length < 2) return 0;

  let strongMatchCount = 0;
  let maxSimilarity = 0;
  const SIMILARITY_THRESHOLD = 0.9;
  for (let i = 0; i < texturedBlocks.length; i++) {
    for (let j = i + 1; j < texturedBlocks.length; j++) {
      const diff = Math.abs(texturedBlocks[i].avg - texturedBlocks[j].avg);
      const similarity = 1 - diff / 255;
      if (similarity > maxSimilarity) maxSimilarity = similarity;
      if (similarity > SIMILARITY_THRESHOLD) strongMatchCount++;
    }
  }

  if (strongMatchCount < 3) return Math.min(maxSimilarity, 0.7);
  return maxSimilarity;
}

function detectCompressionAnomaly(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): number {
  let totalDiff = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const right = (y * width + (x + 1)) * 4;
      const down = ((y + 1) * width + x) * 4;
      const diffR = Math.abs(pixels[idx] - pixels[right]) + Math.abs(pixels[idx] - pixels[down]);
      totalDiff += diffR;
      count += 2;
    }
  }
  const avgDiff = totalDiff / count;
  return Math.min(1, avgDiff / 40);
}

async function performELA(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): Promise<{ score: number; regions: unknown[] }> {
  const originalData = ctx.getImageData(0, 0, width, height);

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sourceCtx = sourceCanvas.getContext('2d');
  if (!sourceCtx) return { score: 0, regions: [] };
  sourceCtx.putImageData(originalData, 0, 0);

  const recompressedDataUrl = sourceCanvas.toDataURL('image/jpeg', 0.75);
  const recompressedImg = new Image();
  await new Promise<void>((resolve, reject) => {
    recompressedImg.onload = () => resolve();
    recompressedImg.onerror = () => reject(new Error('ELA recompression failed'));
    recompressedImg.src = recompressedDataUrl;
  });

  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = width;
  diffCanvas.height = height;
  const diffCtx = diffCanvas.getContext('2d');
  if (!diffCtx) return { score: 0, regions: [] };
  diffCtx.drawImage(recompressedImg, 0, 0, width, height);
  const recompressedData = diffCtx.getImageData(0, 0, width, height).data;
  const original = originalData.data;

  const blockSize = 32;
  const blockDiffs: { x: number; y: number; diff: number }[] = [];
  let totalDiff = 0;

  for (let by = 0; by < height; by += blockSize) {
    for (let bx = 0; bx < width; bx += blockSize) {
      let blockTotal = 0;
      let blockCount = 0;
      for (let y = by; y < Math.min(by + blockSize, height); y++) {
        for (let x = bx; x < Math.min(bx + blockSize, width); x++) {
          const idx = (y * width + x) * 4;
          const d =
            Math.abs(original[idx] - recompressedData[idx]) +
            Math.abs(original[idx + 1] - recompressedData[idx + 1]) +
            Math.abs(original[idx + 2] - recompressedData[idx + 2]);
          blockTotal += d;
          blockCount++;
          totalDiff += d;
        }
      }
      const blockAvg = blockTotal / (blockCount || 1);
      blockDiffs.push({ x: bx, y: by, diff: blockAvg });
    }
  }

  const avgDiff = totalDiff / (width * height);
  const meanBlockDiff = blockDiffs.reduce((a, b) => a + b.diff, 0) / (blockDiffs.length || 1);
  const stdBlockDiff = Math.sqrt(
    blockDiffs.reduce((a, b) => a + (b.diff - meanBlockDiff) ** 2, 0) / (blockDiffs.length || 1),
  );

  const outlierThreshold = meanBlockDiff + stdBlockDiff * 2;
  const outlierBlocks = blockDiffs.filter((b) => b.diff > outlierThreshold && b.diff > 8);

  const score = Math.min(
    1,
    avgDiff / 20 + (outlierBlocks.length / Math.max(1, blockDiffs.length)) * 2,
  );

  return {
    score,
    regions: outlierBlocks.slice(0, 10).map((b) => ({
      region: `x:${b.x},y:${b.y}`,
      ela_difference: b.diff > outlierThreshold * 1.5 ? 'high' : 'moderate',
      note: 'Recompression error in this block is significantly higher than the document average',
    })),
  };
}
