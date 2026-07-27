import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): never {
  throw new Error('patladı');
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // React, yakalanan hatayı ayrıca konsola yazar; test çıktısını kirletmesin.
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe('yerel hata sınırı', () => {
  it('hata yoksa çocuğu olduğu gibi gösterir', () => {
    render(
      <ErrorBoundary>
        <p>sağlam içerik</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('sağlam içerik')).toBeInTheDocument();
  });

  it('hatayı yakalar ve yedek içeriği gösterir', () => {
    render(
      <ErrorBoundary fallback={<p>yedek</p>}>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText('yedek')).toBeInTheDocument();
  });

  it('yedek verilmezse hiçbir şey göstermez — kırık arayüz bırakmaz', () => {
    const { container } = render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('hatayı dışarı bildirir ve günlüğe yazar', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary label="Test" onError={onError}>
        <Boom />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(consoleError).toHaveBeenCalled();
  });

  it('sınırın dışındaki kardeşler etkilenmez', () => {
    render(
      <div>
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
        <p>komşu bileşen</p>
      </div>
    );
    expect(screen.getByText('komşu bileşen')).toBeInTheDocument();
  });
});
