/**
 * Interface for upload services
 * This allows easy swapping between different CDN providers
 */
export interface IUploadService {
  /**
   * Upload an image file
   * @param file - The image file to upload
   * @param options - Optional upload options (folder, transformations, etc.)
   * @returns Promise resolving to the uploaded image URL
   */
  uploadImage(
    file: File,
    options?: UploadOptions
  ): Promise<string>;

  /**
   * Upload a video file
   * @param file - The video file to upload
   * @param options - Optional upload options (folder, transformations, etc.)
   * @returns Promise resolving to the uploaded video URL
   */
  uploadVideo(
    file: File,
    options?: UploadOptions
  ): Promise<string>;

  /**
   * Delete an uploaded file by URL
   * @param url - The URL of the file to delete
   * @returns Promise resolving when deletion is complete
   */
  deleteFile(url: string): Promise<void>;
}

export interface UploadOptions {
  /**
   * Folder/path where the file should be stored
   */
  folder?: string;
  
  /**
   * Public ID (filename) for the uploaded file
   * If not provided, a unique ID will be generated
   */
  publicId?: string;
  
  /**
   * Additional transformation parameters (provider-specific)
   */
  transformations?: Record<string, any>;
  
  /**
   * Callback for upload progress (0-100)
   */
  onProgress?: (progress: number) => void;
}
