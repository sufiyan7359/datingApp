import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import type { Request } from 'express';

export const PHOTOS_ROOT = join(process.cwd(), 'uploads', 'photos');
export const COVERS_ROOT = join(process.cwd(), 'uploads', 'covers');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, accept: boolean) => void,
) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    callback(
      new BadRequestException('Only JPEG, PNG, or WebP images are allowed'),
      false,
    );
    return;
  }
  callback(null, true);
};

export const photoMulterOptions = {
  storage: diskStorage({
    destination: (req: Request, _file, callback) => {
      const userId = (req.user as { userId: string }).userId;
      const dir = join(PHOTOS_ROOT, userId);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      callback(null, dir);
    },
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: MAX_PHOTO_SIZE_BYTES },
  fileFilter: imageFileFilter,
};

export const coverPhotoMulterOptions = {
  storage: diskStorage({
    destination: (req: Request, _file, callback) => {
      const userId = (req.user as { userId: string }).userId;
      const dir = join(COVERS_ROOT, userId);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      callback(null, dir);
    },
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: MAX_PHOTO_SIZE_BYTES },
  fileFilter: imageFileFilter,
};
