/**
 * ONAY METİNLERİNİN SÜRÜMÜ.
 *
 * Kullanıcının neyi onayladığı, onayladığı ANIN metniyle belirli.
 * Metin değiştiğinde bu sabit de artırılmalı: eski sürümü onaylamış
 * kullanıcılar `profiles.consent_version` üzerinden ayırt edilebilir
 * ve gerekirse yeniden onay istenebilir.
 *
 * Tarih biçimi bilinçli — sıralanabilir ve hangi metne karşılık
 * geldiği bakışta anlaşılıyor.
 */
export const CONSENT_VERSION = '2026-07-31';
