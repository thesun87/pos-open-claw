import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { PROBLEM_TYPES } from '../../common/errors/problem-types';

export type ProductImageUploadResult = {
  imageUrl: string;
  publicId: string;
};

type UploadedFile = {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
  size: number;
};

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const MAX_BYTES = 5 * 1024 * 1024;

@Injectable()
export class ProductImagesService {
  async upload(
    file: UploadedFile | undefined,
  ): Promise<ProductImageUploadResult> {
    if (!file) {
      throw new BadRequestException({
        type: PROBLEM_TYPES.validation,
        title: 'Thiếu hình ảnh',
        detail: 'Vui lòng chọn file hình ảnh để upload.',
      });
    }
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      throw new BadRequestException({
        type: PROBLEM_TYPES.validation,
        title: 'Định dạng hình ảnh không hợp lệ',
        detail: 'Chỉ hỗ trợ JPEG, PNG, WebP hoặc GIF.',
      });
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException({
        type: PROBLEM_TYPES.validation,
        title: 'Hình ảnh quá lớn',
        detail: 'Kích thước hình ảnh tối đa là 5MB.',
      });
    }

    this.configureCloudinary();
    const folder =
      process.env.CLOUDINARY_PRODUCT_IMAGE_FOLDER ?? 'pos/products';

    try {
      const result = await new Promise<{
        secure_url: string;
        public_id: string;
      }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
            use_filename: true,
            unique_filename: true,
          },
          (error, uploadResult) => {
            if (error || !uploadResult?.secure_url || !uploadResult.public_id) {
              reject(
                error instanceof Error
                  ? error
                  : new Error('Invalid Cloudinary upload response'),
              );
              return;
            }
            resolve({
              secure_url: uploadResult.secure_url,
              public_id: uploadResult.public_id,
            });
          },
        );
        stream.end(file.buffer);
      });

      return { imageUrl: result.secure_url, publicId: result.public_id };
    } catch {
      throw new ServiceUnavailableException({
        type: PROBLEM_TYPES.cloudinaryUploadFailed,
        title: 'Upload hình ảnh thất bại',
        detail: 'Không thể upload hình ảnh lên Cloudinary.',
      });
    }
  }

  private configureCloudinary() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException({
        type: PROBLEM_TYPES.cloudinaryNotConfigured,
        title: 'Chưa cấu hình upload hình ảnh',
        detail: 'Cloudinary chưa được cấu hình trên pos-api.',
      });
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
  }
}
