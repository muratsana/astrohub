import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

/**
 * YEREL HATA SINIRI.
 *
 * Router'ın `errorElement`'i bir rota içindeki hatayı yakalar ama **tüm
 * sayfayı** hata ekranıyla değiştirir. Kabuk seviyesindeki parçalar için
 * bu fazla ağır bir cezadır: radyo rıhtımında bir hata çıktı diye içeriği
 * okunamaz hâle getirmek, hatayı kullanıcıya iki kat pahalıya ödetir.
 * Üstelik radyo rıhtımı router'ın dışında yaşıyor — oradaki bir hatayı
 * `errorElement` zaten yakalayamaz, hata köke kadar çıkar ve uygulama
 * tamamen beyaz ekrana düşer.
 *
 * Bu sınır, sardığı parçayı izole eder: hata olursa yalnızca o parça
 * kaybolur (ya da verilen yedek gösterilir), gerisi çalışmaya devam eder.
 *
 * React'te hata sınırı **yalnızca sınıf bileşeniyle** kurulabilir;
 * `componentDidCatch`in kanca karşılığı yoktur. Bu yüzden kod tabanındaki
 * tek sınıf bileşeni budur.
 */

interface Props {
  children: ReactNode;
  /**
   * Hata durumunda gösterilecek içerik. Verilmezse hiçbir şey gösterilmez —
   * ikincil bir bileşen (rıhtım, panel) için doğru davranış budur:
   * kullanıcıya çalışmayan bir parça yerine hiçbir şey göstermek, kırık bir
   * arayüz göstermekten iyidir.
   */
  fallback?: ReactNode;
  /** Hata kaydını dışarı bildirmek için (izleme servisi bağlandığında). */
  onError?: (error: Error, info: ErrorInfo) => void;
  /** Günlükte parçayı ayırt etmek için ad. */
  label?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    /*
     * Konsola yazmak geçici bir çözüm değil, bilinçli: izleme servisi
     * bağlanana kadar hatanın hiç kaydedilmemesi, sessizce yutulan bir
     * hata sınıfı yaratırdı. Servis geldiğinde `onError` ile yönlendirilir.
     */
    console.error(
      `[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ''}]`,
      error,
      info.componentStack
    );
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
