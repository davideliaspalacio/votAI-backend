// Dominios de email desechable más comunes.
// Se mantiene corto a propósito; ampliarlo según necesidad.
export const DISPOSABLE_DOMAINS = new Set<string>([
  '10minutemail.com',
  '10minutemail.net',
  '20minutemail.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'sharklasers.com',
  'grr.la',
  'mailinator.com',
  'mailinator.net',
  'mailnesia.com',
  'temp-mail.org',
  'tempmail.com',
  'tempmail.net',
  'tempmailo.com',
  'dispostable.com',
  'fakeinbox.com',
  'trashmail.com',
  'trashmail.net',
  'getnada.com',
  'maildrop.cc',
  'yopmail.com',
  'yopmail.net',
  'mintemail.com',
  'mt2015.com',
  'mytrashmail.com',
  'throwawaymail.com',
  'trbvm.com',
  'spam4.me',
  'mohmal.com',
  'emailondeck.com',
  'getairmail.com',
  'tempr.email',
  'discard.email',
  'mailcatch.com',
  'fakemail.net',
]);

export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf('@');
  if (at === -1) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return DISPOSABLE_DOMAINS.has(domain);
}
