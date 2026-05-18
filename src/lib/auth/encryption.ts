import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Encrypts a plain-text string using AES-256-GCM.
 * Output format is `iv:ciphertext:tag`.
 */
export function encrypt(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  
  try {
    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_SECRET must be set in production');
    }
    const key = crypto
      .createHash('sha256')
      .update(secret || 'dev-default')
      .digest();
      
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${encrypted}:${tag}`;
  } catch (err) {
    console.error('Encryption failed:', err);
    return text;
  }
}

/**
 * Decrypts a ciphertext in the format `iv:ciphertext:tag` back to plain-text.
 * Automatically falls back to returning the text as-is if it's not encrypted (e.g. legacy plain text).
 */
export function decrypt(cipherText: string): string {
  if (!cipherText || typeof cipherText !== 'string') return cipherText || '';
  
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    // Legacy plain-text or already decrypted
    return cipherText;
  }
  
  try {
    const [ivHex, encryptedHex, tagHex] = parts;
    const secret = process.env.ENCRYPTION_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_SECRET must be set in production');
    }
    const key = crypto
      .createHash('sha256')
      .update(secret || 'dev-default')
      .digest();
      
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // Fallback: If decryption fails (e.g. different key or not encrypted), return original string
    console.warn('Decryption failed, falling back to original value.');
    return cipherText;
  }
}

const SENSITIVE_FIELDS = [
  'geminiApiKey',
  'githubToken',
  'spotifyClientId',
  'spotifyClientSecret',
  'spotifyAccessToken',
  'spotifyRefreshToken',
];

/**
 * Transparently encrypts all sensitive credential fields in userSettings.
 */
export function encryptSettings(settings: any): any {
  if (!settings) return settings;
  const result = { ...settings };
  for (const field of SENSITIVE_FIELDS) {
    if (result[field]) {
      result[field] = encrypt(result[field]);
    }
  }
  return result;
}

/**
 * Transparently decrypts all sensitive credential fields in userSettings.
 */
export function decryptSettings(settings: any): any {
  if (!settings) return settings;
  const result = { ...settings };
  for (const field of SENSITIVE_FIELDS) {
    if (result[field]) {
      result[field] = decrypt(result[field]);
    }
  }
  return result;
}
