import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';
function passwordValue(password) {
  if (
    typeof password !== 'string' ||
    password.length < 12 ||
    password.length > 200
  )
    throw new Error('Yedek parolası 12–200 karakter olmalı.');
  return password;
}
export function encryptBackup(data, password) {
  const content = Buffer.from(JSON.stringify(data));
  if (content.length > 40 * 1024 * 1024)
    throw new Error('Bu pilotta yedek içeriği en fazla 40 MB olabilir.');
  const salt = randomBytes(16),
    iv = randomBytes(12),
    key = scryptSync(passwordValue(password), salt, 32);
  const cipher = createCipheriv('aes-256-gcm', key, iv),
    encrypted = Buffer.concat([cipher.update(content), cipher.final()]);
  return Buffer.from(
    JSON.stringify({
      format: 'refika-encrypted',
      version: 1,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: encrypted.toString('base64'),
    }),
  );
}
export function decryptBackup(bytes, password) {
  passwordValue(password);
  try {
    const envelope = JSON.parse(bytes.toString('utf8'));
    if (
      envelope.format !== 'refika-encrypted' ||
      envelope.version !== 1 ||
      typeof envelope.data !== 'string' ||
      envelope.data.length > 60 * 1024 * 1024
    )
      throw new Error();
    const salt = Buffer.from(envelope.salt, 'base64'),
      iv = Buffer.from(envelope.iv, 'base64'),
      tag = Buffer.from(envelope.tag, 'base64');
    if (salt.length !== 16 || iv.length !== 12 || tag.length !== 16)
      throw new Error();
    const decipher = createDecipheriv(
      'aes-256-gcm',
      scryptSync(password, salt, 32),
      iv,
    );
    decipher.setAuthTag(tag);
    return JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(envelope.data, 'base64')),
        decipher.final(),
      ]).toString('utf8'),
    );
  } catch {
    throw new Error(
      'Yedek açılamadı. Parolayı ve dosyanın bütünlüğünü kontrol edin.',
    );
  }
}
