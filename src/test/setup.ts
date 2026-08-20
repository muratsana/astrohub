import '@testing-library/jest-dom/vitest';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
}

const storage = globalThis.localStorage;
if (
  !storage ||
  typeof storage.clear !== 'function' ||
  typeof storage.getItem !== 'function' ||
  typeof storage.setItem !== 'function' ||
  typeof storage.removeItem !== 'function'
) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  });
}

if (typeof HTMLCanvasElement !== 'undefined') {
  const context2d = {
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'low',
    beginPath() {},
    clearRect() {},
    closePath() {},
    createLinearGradient() {
      return { addColorStop() {} };
    },
    drawImage() {},
    fill() {},
    fillRect() {},
    fillText() {},
    getImageData() {
      return { data: new Uint8ClampedArray(), height: 0, width: 0 };
    },
    lineTo() {},
    measureText(text: string) {
      return { width: text.length * 8 };
    },
    moveTo() {},
    putImageData() {},
    restore() {},
    rotate() {},
    save() {},
    scale() {},
    setLineDash() {},
    stroke() {},
    strokeText() {},
    translate() {},
  } as unknown as CanvasRenderingContext2D;

  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value(contextId: string) {
      return contextId === '2d' ? context2d : null;
    },
    configurable: true,
  });
}
