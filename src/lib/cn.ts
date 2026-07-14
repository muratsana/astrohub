/**
 * Basit className birleştirici. Falsy değerleri eler.
 * (Harici bağımlılık olmadan clsx benzeri temel davranış.)
 */
export type ClassValue = string | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
