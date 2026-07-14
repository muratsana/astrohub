import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import { BookIcon } from '@/components/ui/icons';
import { popularArticles } from '../data';

/** Popüler eğitim içerikleri / makaleler (§7.1) */
export function PopularArticles() {
  return (
    <section className="pt-16 sm:pt-20">
      <Container>
        <SectionHeader
          title="Popüler Makaleler"
          description="Astronomi ve astrofotoğrafçılık hakkında en güncel içerikler"
          icon={<BookIcon className="h-5 w-5" />}
          linkTo="/egitim"
          linkLabel="Tüm Makaleler"
        />
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {popularArticles.map((article) => (
            <li key={article.id}>
              <Link to={`/egitim/${article.id}`} className="group block">
                <div className="relative aspect-[16/10] overflow-hidden rounded-card">
                  <PhotoPlaceholder
                    gradient={article.gradient}
                    alt={article.title}
                    className="h-full w-full border border-border transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-foreground backdrop-blur-sm">
                    {article.level}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {article.category}
                </p>
                <h3 className="mt-0.5 text-sm font-medium leading-snug text-foreground group-hover:text-primary">
                  {article.title}
                </h3>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
