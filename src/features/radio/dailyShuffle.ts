/** Aynı gün ve aynı liste için bütün dinleyicilerde aynı sırayı üretir. */
export function dailyShuffle<T extends { id: string }>(
  items: T[],
  day: string
): T[] {
  let seed = 2166136261;
  for (const char of `${day}:${items.map((item) => item.id).join(',')}`) {
    seed ^= char.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  }

  const result = [...items];
  const random = () => {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}
