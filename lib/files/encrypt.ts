// File encryption utilities
// In production, use Web Crypto API for client-side encryption

export async function encryptFile(file: File): Promise<Blob> {
  // Generate a random encryption key
  const key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt']
  );

  // Read file as ArrayBuffer
  const fileBuffer = await file.arrayBuffer();

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    fileBuffer
  );

  // Export key for storage (in production, this would be stored securely)
  const exportedKey = await crypto.subtle.exportKey('raw', key);

  // Combine IV + key + encrypted data
  // Format: [IV (12 bytes)][Key (32 bytes)][Encrypted data]
  const combined = new Uint8Array(12 + 32 + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(exportedKey), 12);
  combined.set(new Uint8Array(encrypted), 44);

  return new Blob([combined], { type: 'application/octet-stream' });
}

export async function decryptFile(encryptedBlob: Blob): Promise<Blob> {
  const buffer = await encryptedBlob.arrayBuffer();
  const array = new Uint8Array(buffer);

  // Extract components
  const iv = array.slice(0, 12);
  const keyData = array.slice(12, 44);
  const encrypted = array.slice(44);

  // Import key
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['decrypt']
  );

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encrypted
  );

  return new Blob([decrypted]);
}

