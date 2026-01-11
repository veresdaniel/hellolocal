/**
 * Cloudinary upload service implementation
 * Free tier: 25GB storage + 25GB bandwidth/month
 * 
 * Setup:
 * 1. Sign up at https://cloudinary.com
 * 2. Get your Cloud Name, API Key, and API Secret from dashboard
 * 3. Add to .env:
 *    VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *    VITE_CLOUDINARY_API_KEY=your_api_key
 *    VITE_CLOUDINARY_API_SECRET=your_api_secret (only needed for server-side)
 * 
 * Note: For security, uploads should go through your backend API
 * This is a client-side implementation for demo purposes
 */
import { IUploadService, UploadOptions } from "./IUploadService";

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
}

export class CloudinaryUploadService implements IUploadService {
  private cloudName: string;
  private uploadPreset?: string;
  private apiKey?: string;

  constructor() {
    this.cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
    this.uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    this.apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;

    if (!this.cloudName) {
      console.warn(
        "Cloudinary cloud name not configured. Set VITE_CLOUDINARY_CLOUD_NAME in .env"
      );
    }
  }

  async uploadImage(
    file: File,
    options?: UploadOptions
  ): Promise<string> {
    if (!this.cloudName) {
      throw new Error("Cloudinary not configured");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", this.uploadPreset || "unsigned");
    
    if (options?.folder) {
      formData.append("folder", options.folder);
    }
    
    if (options?.publicId) {
      formData.append("public_id", options.publicId);
    }

    // Add image transformations
    if (options?.transformations) {
      Object.entries(options.transformations).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Upload failed");
      }

      const data: CloudinaryUploadResponse = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw error;
    }
  }

  async uploadVideo(
    file: File,
    options?: UploadOptions
  ): Promise<string> {
    if (!this.cloudName) {
      throw new Error("Cloudinary not configured");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", this.uploadPreset || "unsigned");
    formData.append("resource_type", "video");
    
    if (options?.folder) {
      formData.append("folder", options.folder);
    }
    
    if (options?.publicId) {
      formData.append("public_id", options.publicId);
    }

    // Add video transformations
    if (options?.transformations) {
      Object.entries(options.transformations).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/video/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Upload failed");
      }

      const data: CloudinaryUploadResponse = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("Cloudinary video upload error:", error);
      throw error;
    }
  }

  async deleteFile(url: string): Promise<void> {
    // Extract public_id from URL
    // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}.{format}
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    if (!match) {
      throw new Error("Invalid Cloudinary URL");
    }

    const publicId = match[1];
    const resourceType = url.includes("/video/") ? "video" : "image";

    // Note: Deletion requires API secret, so this should be done server-side
    // For now, we'll just log a warning
    console.warn(
      "File deletion should be handled server-side for security. Public ID:",
      publicId
    );
  }
}
