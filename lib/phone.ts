export function normalizePhone(input: string) {
  const digits = (input || '').replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}
