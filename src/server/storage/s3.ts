import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { StorageAdapter, StorageProviderName, StorageUploadOptions } from './types'

export interface S3AdapterConfig {
  name: Extract<StorageProviderName, 'r2' | 's3'>
  bucket: string
  publicUrl: string
  region: string
  endpoint?: string
  accessKeyId: string
  secretAccessKey: string
  /** A separate, non-public bucket for original uploads. Optional. */
  privateBucket?: string
}

/** Cloudflare R2 speaks the S3 API, so R2 and S3 share this adapter. */
export function createS3Adapter(config: S3AdapterConfig): StorageAdapter {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  })
  const base = config.publicUrl.replace(/\/+$/, '')

  const put = async (bucket: string, key: string, body: Buffer, options: StorageUploadOptions) => {
    await client.send(new PutObjectCommand({
      Bucket: bucket, Key: key, Body: body,
      ContentType: options.contentType, CacheControl: options.cacheControl,
    }))
  }
  const remove = async (bucket: string, key: string) => {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
  }

  return {
    name: config.name,
    upload: (key, body, options) => put(config.bucket, key, body, options),
    delete: (key) => remove(config.bucket, key),
    getPublicUrl: (key) => `${base}/${key.split('/').map(encodeURIComponent).join('/')}`,
    ...(config.privateBucket ? {
      uploadPrivate: (key: string, body: Buffer, options: StorageUploadOptions) => put(config.privateBucket!, key, body, options),
      deletePrivate: (key: string) => remove(config.privateBucket!, key),
    } : {}),
  }
}
