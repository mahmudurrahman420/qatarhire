import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, services } from '@adonisjs/drive'

/**
 * Two disks:
 * - public:  company logos and profile photos, served at /uploads
 * - private: CVs. Never served directly; only through the authorised
 *            download controller (app/controllers/files/cv_downloads_controller.ts)
 */
const driveConfig = defineConfig({
  default: env.get('DRIVE_DISK'),
  services: {
    public: services.fs({
      location: app.makePath('storage/public'),
      serveFiles: true,
      routeBasePath: '/uploads',
      visibility: 'public',
    }),
    private: services.fs({
      location: app.makePath('storage/private'),
      serveFiles: false,
      visibility: 'private',
    }),
  },
})

export default driveConfig

declare module '@adonisjs/drive/types' {
  export interface DriveDisks extends InferDriveDisks<typeof driveConfig> {}
}
