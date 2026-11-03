import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isCloudinaryConfigured,
  getCloudinaryClient,
  createCloudinaryStorageAdapter,
} from '@/lib/media/cloudinary'
import { v2 as cloudinary } from 'cloudinary'

describe('Unit: Cloudinary Configuration and Storage Adapter', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('isCloudinaryConfigured', () => {
    it('returns false when credentials are completely missing', () => {
      delete process.env.CLOUDINARY_CLOUD_NAME
      delete process.env.CLOUDINARY_API_KEY
      delete process.env.CLOUDINARY_API_SECRET

      expect(isCloudinaryConfigured()).toBe(false)
    })

    it('returns false when credentials are placeholder strings', () => {
      process.env.CLOUDINARY_CLOUD_NAME = 'your_cloud_name_here'
      process.env.CLOUDINARY_API_KEY = 'your_api_key_here'
      process.env.CLOUDINARY_API_SECRET = 'your_api_secret_here'

      expect(isCloudinaryConfigured()).toBe(false)
    })

    it('returns false if any single credential is a placeholder or empty', () => {
      process.env.CLOUDINARY_CLOUD_NAME = 'real_cloud_name'
      process.env.CLOUDINARY_API_KEY = 'your_api_key_here'
      process.env.CLOUDINARY_API_SECRET = 'secret123'

      expect(isCloudinaryConfigured()).toBe(false)
    })

    it('returns true when all credentials contain non-placeholder values', () => {
      process.env.CLOUDINARY_CLOUD_NAME = 'ethiopia_journal'
      process.env.CLOUDINARY_API_KEY = '987654321012345'
      process.env.CLOUDINARY_API_SECRET = 'abc123xyzSecretKey'

      expect(isCloudinaryConfigured()).toBe(true)
    })
  })

  describe('getCloudinaryClient', () => {
    it('returns null when unconfigured or containing placeholders', () => {
      process.env.CLOUDINARY_CLOUD_NAME = 'your_cloud_name_here'
      process.env.CLOUDINARY_API_KEY = 'your_api_key_here'
      process.env.CLOUDINARY_API_SECRET = 'your_api_secret_here'

      expect(getCloudinaryClient()).toBeNull()
    })

    it('returns configured cloudinary instance when valid credentials exist', () => {
      process.env.CLOUDINARY_CLOUD_NAME = 'ethiopia_journal'
      process.env.CLOUDINARY_API_KEY = '987654321012345'
      process.env.CLOUDINARY_API_SECRET = 'abc123xyzSecretKey'

      const client = getCloudinaryClient()
      expect(client).not.toBeNull()
      expect(client?.config().cloud_name).toBe('ethiopia_journal')
    })
  })

  describe('createCloudinaryStorageAdapter', () => {
    it('initializes an adapter with name cloudinary and required handler methods', () => {
      const adapterFactory = createCloudinaryStorageAdapter({ folder: 'test-folder' })
      const adapter = adapterFactory({
        collection: { slug: 'media', fields: [] } as any,
      })

      expect(adapter.name).toBe('cloudinary')
      expect(typeof adapter.handleUpload).toBe('function')
      expect(typeof adapter.handleDelete).toBe('function')
      expect(typeof adapter.generateURL).toBe('function')
      expect(typeof adapter.staticHandler).toBe('function')
    })

    describe('generateURL', () => {
      it('returns direct cloudinaryUrl if present on document', () => {
        const adapterFactory = createCloudinaryStorageAdapter()
        const adapter = adapterFactory({
          collection: { slug: 'media', fields: [] } as any,
        })

        const url = adapter.generateURL!({
          collection: { slug: 'media', fields: [] } as any,
          filename: 'simien.jpg',
          data: {
            cloudinaryUrl: 'https://res.cloudinary.com/test-cloud/image/upload/v1/simien.jpg',
          },
        })

        expect(url).toBe('https://res.cloudinary.com/test-cloud/image/upload/v1/simien.jpg')
      })

      it('generates secure Cloudinary URL from publicId if cloudinaryUrl is missing', () => {
        process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud'
        process.env.CLOUDINARY_API_KEY = '123'
        process.env.CLOUDINARY_API_SECRET = '456'

        const adapterFactory = createCloudinaryStorageAdapter()
        const adapter = adapterFactory({
          collection: { slug: 'media', fields: [] } as any,
        })

        const url = adapter.generateURL!({
          collection: { slug: 'media', fields: [] } as any,
          filename: 'simien.jpg',
          data: {
            cloudinaryPublicId: 'ethiopia/simien_12345',
          },
        })

        expect(url).toContain('res.cloudinary.com/test_cloud')
        expect(url).toContain('ethiopia/simien_12345')
      })

      it('falls back to local media path if no Cloudinary data is present', () => {
        const adapterFactory = createCloudinaryStorageAdapter()
        const adapter = adapterFactory({
          collection: { slug: 'media', fields: [] } as any,
        })

        const url = adapter.generateURL!({
          collection: { slug: 'media', fields: [] } as any,
          filename: 'simien.jpg',
          data: {},
        })

        expect(url).toBe('/api/media/file/simien.jpg')
      })
    })

    describe('handleDelete', () => {
      it('calls cloudinary.uploader.destroy when cloudinaryPublicId is present', async () => {
        process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud'
        process.env.CLOUDINARY_API_KEY = '123'
        process.env.CLOUDINARY_API_SECRET = '456'

        const destroySpy = vi
          .spyOn(cloudinary.uploader, 'destroy')
          .mockResolvedValue({ result: 'ok' })

        const adapterFactory = createCloudinaryStorageAdapter()
        const adapter = adapterFactory({
          collection: { slug: 'media', fields: [] } as any,
        })

        await adapter.handleDelete({
          collection: { slug: 'media', fields: [] } as any,
          filename: 'lalibela.png',
          doc: {
            id: 'med-1',
            cloudinaryPublicId: 'ethiopia/lalibela_123',
          } as any,
          req: { payload: { logger: { error: vi.fn() } } } as any,
          storageFilePath: 'ethiopia/lalibela_123',
        })

        expect(destroySpy).toHaveBeenCalledWith('ethiopia/lalibela_123', {
          invalidate: true,
          resource_type: 'image',
        })
      })

      it('safely skips destroy if doc does not contain cloudinaryPublicId', async () => {
        process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud'
        process.env.CLOUDINARY_API_KEY = '123'
        process.env.CLOUDINARY_API_SECRET = '456'

        const destroySpy = vi.spyOn(cloudinary.uploader, 'destroy')

        const adapterFactory = createCloudinaryStorageAdapter()
        const adapter = adapterFactory({
          collection: { slug: 'media', fields: [] } as any,
        })

        await adapter.handleDelete({
          collection: { slug: 'media', fields: [] } as any,
          filename: 'local-only.png',
          doc: { id: 'med-2' } as any,
          req: { payload: { logger: { error: vi.fn() } } } as any,
          storageFilePath: 'local-only.png',
        })

        expect(destroySpy).not.toHaveBeenCalled()
      })
    })

    describe('handleUpload', () => {
      it('uploads file buffer to Cloudinary and returns metadata', async () => {
        process.env.CLOUDINARY_CLOUD_NAME = 'test_cloud'
        process.env.CLOUDINARY_API_KEY = '123'
        process.env.CLOUDINARY_API_SECRET = '456'

        vi.spyOn(cloudinary.uploader, 'upload_stream').mockImplementation(
          ((options: any, callback: any) => {
            const fakeStream: any = {
              end: (buf: Buffer) => {
                callback(null, {
                  public_id: 'ethiopia-travel-journal/bale_mountains_123',
                  secure_url:
                    'https://res.cloudinary.com/test_cloud/image/upload/v1/bale_mountains.jpg',
                  format: 'jpg',
                  bytes: buf.length,
                })
              },
            }
            return fakeStream
          }) as any,
        )

        const adapterFactory = createCloudinaryStorageAdapter({ folder: 'test-journal' })
        const adapter = adapterFactory({
          collection: { slug: 'media', fields: [] } as any,
        })

        const metadata = await adapter.handleUpload({
          clientUploadContext: null,
          collection: { slug: 'media', fields: [] } as any,
          data: {},
          file: {
            buffer: Buffer.from('test-image-data'),
            filename: 'bale-mountains.jpg',
            filesize: 15,
            mimeType: 'image/jpeg',
          },
          req: { payload: { logger: { warn: vi.fn() } } } as any,
          storageFilePath: 'bale-mountains.jpg',
        })

        expect(metadata).toEqual({
          cloudinaryPublicId: 'ethiopia-travel-journal/bale_mountains_123',
          cloudinaryUrl:
            'https://res.cloudinary.com/test_cloud/image/upload/v1/bale_mountains.jpg',
          url: 'https://res.cloudinary.com/test_cloud/image/upload/v1/bale_mountains.jpg',
        })
      })
    })

    describe('staticHandler', () => {
      it('returns 307 redirect when cloudinaryUrl is available', async () => {
        const adapterFactory = createCloudinaryStorageAdapter()
        const adapter = adapterFactory({
          collection: { slug: 'media', fields: [] } as any,
        })

        const response = await adapter.staticHandler(
          {} as any,
          {
            doc: {
              id: 'med-1',
              cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
            } as any,
            params: {
              collection: 'media',
              filename: 'image.jpg',
            },
          },
        )

        expect(response.status).toBe(307)
        expect(response.headers.get('location')).toBe(
          'https://res.cloudinary.com/test/image.jpg',
        )
      })
    })
  })
})
