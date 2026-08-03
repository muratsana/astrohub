/*
 * `public.consume_rate_limit` SECURITY INVOKER çalıştığı için çağıran
 * service_role, app şemasındaki gerçek gövdeyi çözebilmelidir. Execute
 * yetkisi tek başına yetmez; PostgreSQL şema USAGE kapısını da kontrol eder.
 */
grant usage on schema app to service_role;
