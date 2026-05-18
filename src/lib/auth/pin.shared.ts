export const PIN_REGEX = /^\d{4}$/;

export function isValidPin(pin: string): boolean {
  return PIN_REGEX.test(pin);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain || !local) return email;
  return `${local.slice(0, 1)}***@${domain}`;
}
