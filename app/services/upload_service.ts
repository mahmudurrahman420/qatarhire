import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import drive from '@adonisjs/drive/services/main'
import type { MultipartFile } from '@adonisjs/core/bodyparser'
import env from '#start/env'
import MalwareScanner, { type ScanResult } from '#services/malware_scanner'
import { detectCvType, detectImageType, CV_MIME } from '#services/file_validation'

export class UploadRejected extends Error {}

const IMAGE_MAX_BYTES = 2 * 1024 * 1024

export default class UploadService {
  static get cvMaxBytes() {
    return env.get('CV_MAX_SIZE_MB', 5) * 1024 * 1024
  }

  /**
   * Validates and stores a CV on the private disk.
   * Returns metadata to persist on CandidateCv; the storage key is random.
   */
  static async storeCv(file: MultipartFile): Promise<{ storageKey: string; mimeType: string; sizeBytes: number; originalName: string; scanStatus: ScanResult }> {
    if (!file.tmpPath) throw new UploadRejected('Upload failed. Please try again.')
    if (file.size > this.cvMaxBytes) throw new UploadRejected(`CV must be smaller than ${env.get('CV_MAX_SIZE_MB', 5)} MB.`)
    const buffer = await readFile(file.tmpPath)
    const type = detectCvType(buffer)
    if (!type) throw new UploadRejected('CV must be a PDF or Word (.docx) document.')

    const scanStatus = await MalwareScanner.scan(buffer)
    if (scanStatus === 'infected') throw new UploadRejected('This file was flagged by our malware scanner and was not uploaded.')
    if (scanStatus === 'error') throw new UploadRejected('We could not scan this file right now. Please try again shortly.')

    const now = new Date()
    const storageKey = `cvs/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${type}`
    await drive.use('private').put(storageKey, buffer, { contentType: CV_MIME[type] })

    const originalName = (file.clientName || `cv.${type}`).replace(/[^\w.\- ()]+/g, '_').slice(0, 200)
    return { storageKey, mimeType: CV_MIME[type], sizeBytes: buffer.length, originalName, scanStatus }
  }

  /** Validates and stores a public image (logo / profile photo). Returns the key. */
  static async storeImage(file: MultipartFile, folder: 'logos' | 'photos') {
    if (!file.tmpPath) throw new UploadRejected('Upload failed. Please try again.')
    if (file.size > IMAGE_MAX_BYTES) throw new UploadRejected('Image must be smaller than 2 MB.')
    const buffer = await readFile(file.tmpPath)
    const type = detectImageType(buffer)
    if (!type) throw new UploadRejected('Image must be a JPG, PNG or WebP file.')
    const key = `${folder}/${randomUUID()}.${type}`
    await drive.use('public').put(key, buffer)
    return key
  }

  static async deletePrivate(key: string | null) {
    if (key) await drive.use('private').delete(key).catch(() => {})
  }

  static async deletePublic(key: string | null) {
    if (key) await drive.use('public').delete(key).catch(() => {})
  }
}
