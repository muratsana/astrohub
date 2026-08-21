import { describe, expect, it } from 'vitest';
import { normalizeJuryCandidateSearch } from './photoWeekAdmin';

describe('jüri kullanıcı araması', () => {
  it('profil aramasında @ ve PostgREST or ayırıcılarını temizler', () => {
    expect(normalizeJuryCandidateSearch('  @@murat,sana(test)  ')).toBe(
      'murat sana test'
    );
  });
});
