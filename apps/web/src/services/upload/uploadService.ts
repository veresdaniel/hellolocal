/**
 * Upload service factory
 * Switch between different CDN providers by changing the import here
 */
import { IUploadService } from "./IUploadService";
import { CloudinaryUploadService } from "./CloudinaryUploadService";

// To switch to a different provider, create a new implementation
// and change the import here:
// import { UploadcareUploadService } from "./UploadcareUploadService";
// export const uploadService: IUploadService = new UploadcareUploadService();

export const uploadService: IUploadService = new CloudinaryUploadService();
