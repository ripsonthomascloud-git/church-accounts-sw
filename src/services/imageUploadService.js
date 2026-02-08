import { functions } from './firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * Call Cloud Function to upload image from URL to Firebase Storage
 * This bypasses CORS restrictions by downloading server-side
 * @param {string} imageUrl - Image URL
 * @param {string} familyName - Family name for file path
 * @returns {Promise<string|null>} - Firebase Storage download URL or null if failed
 */
export const uploadImageFromUrl = async (imageUrl, familyName, retryCount = 0) => {
  if (!imageUrl) return null;

  const MAX_RETRIES = 2;

  try {
    console.log(`[${familyName}] Starting upload (attempt ${retryCount + 1}/${MAX_RETRIES + 1}) from:`, imageUrl);

    // Call the Cloud Function with timeout
    const uploadFunction = httpsCallable(functions, 'uploadImageFromUrl', {
      timeout: 90000 // 90 second timeout
    });

    const result = await uploadFunction({
      imageUrl: imageUrl,
      familyName: familyName
    });

    if (result.data && result.data.success && result.data.storageUrl) {
      console.log(`[${familyName}] ✓ Upload successful:`, result.data.storageUrl);
      return result.data.storageUrl;
    } else {
      console.error(`[${familyName}] ✗ Upload failed: Invalid response`, result.data);
      throw new Error('Invalid response from upload function');
    }
  } catch (error) {
    console.error(`[${familyName}] ✗ Upload error (attempt ${retryCount + 1}):`, {
      message: error.message,
      code: error.code,
      details: error.details
    });

    // Retry on timeout or network errors
    if (retryCount < MAX_RETRIES && (error.code === 'deadline-exceeded' || error.code === 'unavailable')) {
      console.log(`[${familyName}] Retrying after 3 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return uploadImageFromUrl(imageUrl, familyName, retryCount + 1);
    }

    // Return original URL as fallback (will be detected and filtered out)
    return imageUrl;
  }
};

/**
 * Upload multiple images in parallel with rate limiting
 * @param {Array<{url: string, familyName: string}>} images - Array of image configs
 * @param {Function} onProgress - Progress callback (current, total)
 * @returns {Promise<Array<string|null>>} - Array of Firebase Storage URLs
 */
export const uploadImagesInBatch = async (images, onProgress) => {
  const results = [];
  const BATCH_SIZE = 3; // Process 3 images at a time to avoid rate limits

  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(({ url, familyName }) => uploadImageFromUrl(url, familyName))
    );

    results.push(...batchResults);

    if (onProgress) {
      onProgress(results.length, images.length);
    }
  }

  return results;
};
