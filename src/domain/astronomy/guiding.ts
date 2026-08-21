import { effectiveFocalLength, pixelScale } from './optics';

export type GuidingVerdictTone = 'ok' | 'warning' | 'error';

export interface GuidingInput {
  mainFocalLength: number;
  mainPixelSize: number;
  guideFocalLength: number;
  guidePixelSize: number;
  seeingArcsec: number;
  reducerFactor?: number;
}

export interface GuidingResult {
  effectiveMainFocalLength: number;
  mainPixelScale: number;
  guidePixelScale: number;
  scaleRatio: number;
  guideStarFwhmPx: number;
  verdict: {
    tone: GuidingVerdictTone;
    label: string;
    summary: string;
  };
}

export function computeGuiding(input: GuidingInput): GuidingResult {
  const effectiveMain = effectiveFocalLength(
    input.mainFocalLength,
    input.reducerFactor ?? 1
  );
  const mainScale = pixelScale(effectiveMain, input.mainPixelSize);
  const guideScale = pixelScale(input.guideFocalLength, input.guidePixelSize);
  const ratio = guideScale / mainScale;
  const starPx = input.seeingArcsec / guideScale;

  return {
    effectiveMainFocalLength: effectiveMain,
    mainPixelScale: mainScale,
    guidePixelScale: guideScale,
    scaleRatio: ratio,
    guideStarFwhmPx: starPx,
    verdict: guidingVerdict(ratio, guideScale, starPx),
  };
}

function guidingVerdict(
  scaleRatio: number,
  guideScale: number,
  guideStarFwhmPx: number
): GuidingResult['verdict'] {
  if (guideScale > 8 || guideStarFwhmPx < 1.2) {
    return {
      tone: 'error',
      label: 'Riskli',
      summary:
        'Rehber görüntü çok kaba örnekleniyor. Daha uzun odaklı rehber teleskop, daha küçük pikselli kamera ya da OAG düşünülmeli.',
    };
  }

  if (scaleRatio > 5 || guideScale > 5) {
    return {
      tone: 'warning',
      label: 'Sınırda',
      summary:
        'Rehber ölçeği ana kameradan belirgin biçimde kaba. Çalışabilir, fakat ince düzeltmeler ana görüntüde sınırlı karşılık bulabilir.',
    };
  }

  if (guideStarFwhmPx < 1.5) {
    return {
      tone: 'warning',
      label: 'Az örneklenmiş',
      summary:
        'Rehber yıldız yaklaşık 1,5 pikselin altında kalıyor. Merkez bulma kararlı olmayabilir; daha küçük rehber ölçeği tercih edilir.',
    };
  }

  if (guideStarFwhmPx > 6) {
    return {
      tone: 'warning',
      label: 'Aşırı örneklenmiş',
      summary:
        'Rehber yıldız çok fazla piksele yayılıyor. Bu genelde çalışır, ama SNR ve poz süresi tarafında verim kaybı yaratabilir.',
    };
  }

  return {
    tone: 'ok',
    label: 'Dengeli',
    summary:
      'Rehber ölçeği ana kamera ile uyumlu. Merkez bulma için yıldız boyutu da pratik aralıkta kalıyor.',
  };
}
