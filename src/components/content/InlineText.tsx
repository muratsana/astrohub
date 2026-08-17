import { Fragment } from 'react';
import { Link } from 'react-router';
import { parseInline } from '@/domain/content/inline';
import { EXTERNAL_LINK_REL } from '@/lib/url';

/**
 * SATIR İÇİ BİÇİMLENDİRİLMİŞ METİN.
 *
 * `parseInline` metni parçalara ayırıyor, burası onları React düğümüne
 * çeviriyor. `dangerouslySetInnerHTML` YOK ve gerekmiyor: parçalar
 * dizeden ibaret, etiketleri biz seçiyoruz. Ayrıştırıcı bozuk bir şey
 * üretse bile en kötü ihtimalle yanlış YERDE kalın yazı çıkar; sayfaya
 * betik giremez.
 *
 * İÇ VE DIŞ BAĞLANTI AYRI ÇİZİLİYOR. İç bağlantı `<Link>`: tam sayfa
 * yenilemesi olmadan geziniyor ve uygulama durumu korunuyor. Dış
 * bağlantı `<a target="_blank">` ve `EXTERNAL_LINK_REL` taşıyor —
 * `noopener` olmadan açılan sekme `window.opener` üzerinden bizim
 * sayfamızı başka adrese yönlendirebilir. Ayrımı ayrıştırıcı yapıyor;
 * burada yeniden karar verilseydi iki yerde iki farklı kural olurdu.
 */
export function InlineText({ text }: { text: string }) {
  const spans = parseInline(text);

  return (
    <>
      {spans.map((span, index) => {
        const key = `${span.kind}-${index}`;

        if (span.kind === 'strong') {
          return (
            <strong key={key} className="font-semibold text-foreground">
              {span.text}
            </strong>
          );
        }

        if (span.kind === 'em') {
          return (
            <em key={key} className="italic">
              {span.text}
            </em>
          );
        }

        if (span.kind === 'underline') {
          /* `underline` sınıfı bağlantıyla karışmasın diye ton farklı:
             bağlantı `text-primary`, burası gövde rengini koruyor. */
          return (
            <u key={key} className="underline underline-offset-2">
              {span.text}
            </u>
          );
        }

        if (span.kind === 'link') {
          const className =
            'text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary';
          return span.external ? (
            <a
              key={key}
              href={span.href}
              target="_blank"
              rel={EXTERNAL_LINK_REL}
              className={className}
            >
              {span.text}
            </a>
          ) : (
            <Link key={key} to={span.href} className={className}>
              {span.text}
            </Link>
          );
        }

        return <Fragment key={key}>{span.text}</Fragment>;
      })}
    </>
  );
}
