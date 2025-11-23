// Re-export decrypt function for convenience
export { decryptFile } from './encrypt';

// Generate time-limited download URL
export async function generateTimeLimitedDownloadUrl(
  encryptedBlob: Blob,
  expirationMinutes: number = 5
): Promise<{ url: string; expiresAt: number }> {
  // Decrypt the file
  const { decryptFile } = await import('./encrypt');
  const decryptedBlob = await decryptFile(encryptedBlob);

  // Create blob URL
  const url = URL.createObjectURL(decryptedBlob);

  // Set expiration
  const expiresAt = Date.now() + expirationMinutes * 60 * 1000;

  // Schedule cleanup
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, expirationMinutes * 60 * 1000);

  return { url, expiresAt };
}

