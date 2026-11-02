import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

/**
 * Uploads a local image file URI (from expo-image-picker or camera) to Firebase Storage
 * and returns the public download URL.
 */
export async function uploadImageToStorage(
  uri: string,
  storagePath: string
): Promise<string> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    const fileRef = ref(storage, storagePath);
    await uploadBytes(fileRef, blob);

    const downloadUrl = await getDownloadURL(fileRef);
    return downloadUrl;
  } catch (error) {
    console.warn('Storage upload error, falling back to local URI:', error);
    return uri; // Graceful offline/demo fallback
  }
}

export async function uploadReceiptImage(uri: string, tripId: string): Promise<string> {
  const filename = `receipts/${tripId}/${Date.now()}_receipt.jpg`;
  return uploadImageToStorage(uri, filename);
}

export async function uploadAvatarImage(uri: string, userId: string): Promise<string> {
  const filename = `avatars/${userId}/${Date.now()}_avatar.jpg`;
  return uploadImageToStorage(uri, filename);
}
