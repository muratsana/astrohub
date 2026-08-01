-- ══════════════════════════════════════════════════════════════════════════
-- RLS BAŞLANGIÇ PLANI — auth.uid() SATIR BAŞINA DEĞİL, SORGU BAŞINA
-- ══════════════════════════════════════════════════════════════════════════
--
-- SORUN
--
-- `using (auth.uid() = user_id)` yazan bir politikada planlayıcı
-- `auth.uid()`i satır başına yeniden çağırıyor. Fonksiyon `stable` ama
-- argümanı olmadığı için planlayıcı onu satır bağımlı bir ifade gibi ele
-- alıyor ve InitPlan'e çıkaramıyor.
--
-- Sonuç: 10 000 satırlık bir taramada 10 000 kez JWT çözümleniyor. Tablo
-- büyüdükçe maliyet doğrusal artıyor ve bu, sorgunun kendisinden pahalı
-- hale gelebiliyor. Supabase denetçisi bunu `auth_rls_initplan` olarak
-- işaretliyor — projede 52 politikada.
--
-- ÇÖZÜM
--
-- Çağrıyı skaler alt sorguya sarmak: `(select auth.uid())`. Planlayıcı
-- artık onu InitPlan olarak bir kez değerlendirip sonucu sabit gibi
-- kullanıyor. Anlam AYNI — `auth.uid()` zaten sorgu boyunca değişmiyor;
-- değişen tek şey kaç kez sorulduğu.
--
-- ══════════════════════════════════════════════════════════════════════════
-- NEDEN 52 POLİTİKA ELLE YAZILMADI
--
-- Politikaların doğruluğu bu projenin en kritik yüzeyi (RLS matrisi bunu
-- ölçüyor). Elli iki politikayı elle yeniden yazmak, her birinde rolü,
-- komutu, permissive/restrictive ayrımını ve `with check` ifadesini
-- yeniden yazmak demekti — ve tek bir kopyala-yapıştır hatası sessiz bir
-- güvenlik açığı bırakırdı.
--
-- Bunun yerine politikalar KENDİ TANIMLARINDAN yeniden üretiliyor:
-- `pg_get_expr` ile okunan ifade, yalnızca `auth.*` çağrıları sarmalanmış
-- haliyle geri yazılıyor. Rol, komut ve kip olduğu gibi taşınıyor çünkü
-- hiçbiri elle yazılmıyor.
--
-- İFADEYE BAŞKA HİÇBİR ŞEY YAPILMIYOR. Değişiklik yalnızca metinsel bir
-- sarmalama; `app.is_admin()` gibi yardımcılar dokunulmadan kalıyor.
-- Onları da sarmak cazipti ama bu betiğin işi değil: her biri ayrı ayrı
-- düşünülmesi gereken kararlar ve tek bir migration'da toplu yapılan
-- "iyileştirme", denetlenemeyen bir değişiklik yığını olurdu.
--
-- ══════════════════════════════════════════════════════════════════════════
-- YENİDEN ÇALIŞTIRILABİLİR
--
-- Sarmalanmış bir ifade ikinci kez sarmalanmıyor (`(?<!select )` geri
-- bakışı bunu engelliyor) ve değişmeyen politikaya hiç dokunulmuyor.
-- Sıfırdan kurulan bir veritabanında da doğru sonucu veriyor: bu dosya
-- bütün politika tanımlarından SONRA çalışıyor.
-- ══════════════════════════════════════════════════════════════════════════

do $$
declare
  p           record;
  yeni_qual   text;
  yeni_check  text;
  komut       text;
  yazilan     integer := 0;
begin
  for p in
    select pol.polname,
           pol.polrelid::regclass::text                       as tablo,
           pol.polcmd,
           pol.polpermissive,
           pg_get_expr(pol.polqual, pol.polrelid)             as qual,
           pg_get_expr(pol.polwithcheck, pol.polrelid)        as wc,
           coalesce(
             (select string_agg(quote_ident(rolname), ', ')
                from pg_roles where oid = any(pol.polroles)),
             'public')                                        as roller
      from pg_policy pol
      join pg_class     c on c.oid = pol.polrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
  loop
    /* Geri bakış, zaten sarmalanmış çağrıyı ikinci kez sarmalamıyor —
       migration'ın yeniden çalıştırılabilir olmasını bu sağlıyor. */
    yeni_qual  := regexp_replace(
                    p.qual, '(?<!select )(auth\.(uid|role|jwt)\(\))',
                    '(select \1)', 'gi');
    yeni_check := regexp_replace(
                    p.wc,   '(?<!select )(auth\.(uid|role|jwt)\(\))',
                    '(select \1)', 'gi');

    /* Değişen bir şey yoksa politikaya dokunma: gereksiz bir
       drop/create, kısa da olsa politikanın olmadığı bir an yaratır. */
    if yeni_qual is not distinct from p.qual
       and yeni_check is not distinct from p.wc then
      continue;
    end if;

    komut := case p.polcmd
               when 'r' then 'select'
               when 'a' then 'insert'
               when 'w' then 'update'
               when 'd' then 'delete'
               else          'all'
             end;

    execute format('drop policy %I on %s', p.polname, p.tablo);

    execute format(
      'create policy %I on %s as %s for %s to %s %s %s',
      p.polname,
      p.tablo,
      case when p.polpermissive then 'permissive' else 'restrictive' end,
      komut,
      p.roller,
      case when yeni_qual  is null then '' else 'using ('      || yeni_qual  || ')' end,
      case when yeni_check is null then '' else 'with check (' || yeni_check || ')' end
    );

    yazilan := yazilan + 1;
  end loop;

  raise notice 'RLS initplan: % politika yeniden yazıldı', yazilan;
end $$;

-- ══════════════════════════════════════════════════════════════════════════
-- DENETİM — sarmalanmamış çağrı kalmadığını migration'ın KENDİSİ ölçüyor
--
-- Yukarıdaki döngü sessizce hiçbir şey yapmasaydı (regex tutmazsa, şema
-- adı değişirse) migration yine "başarılı" biterdi ve kimse fark etmezdi.
-- Bu blok o sessiz başarısızlığı hataya çeviriyor.
-- ══════════════════════════════════════════════════════════════════════════
do $$
declare kalan integer;
begin
  select count(*) into kalan
    from (select pg_get_expr(polqual, polrelid)      as q,
                 pg_get_expr(polwithcheck, polrelid) as w
            from pg_policy pol
            join pg_class     c on c.oid = pol.polrelid
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public') s
   where (q ~* 'auth\.(uid|role|jwt)\(\)' and q !~* '\(\s*select\s+auth\.')
      or (w ~* 'auth\.(uid|role|jwt)\(\)' and w !~* '\(\s*select\s+auth\.');

  if kalan > 0 then
    raise exception 'RLS initplan: % politikada sarmalanmamış auth çağrısı kaldı', kalan;
  end if;
end $$;
