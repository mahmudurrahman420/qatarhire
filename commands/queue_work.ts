import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Processes queued background jobs (emails, alerts).
 *   node ace queue:work            # long-running worker (run under systemd/pm2)
 *   node ace queue:work --once     # process due jobs once and exit (cron friendly)
 */
export default class QueueWork extends BaseCommand {
  static commandName = 'queue:work'
  static description = 'Process queued background jobs'
  static options: CommandOptions = { startApp: true, staysAlive: true }

  @flags.boolean({ description: 'Process due jobs once and exit' })
  declare once: boolean

  @flags.number({ description: 'Seconds to sleep when the queue is empty', default: 3 })
  declare sleep: number

  #running = true

  async run() {
    await import('#start/queue')
    const { default: Queue } = await import('#services/queue')
    if (this.once) {
      const n = await Queue.work(100)
      this.logger.info(`processed ${n} job(s)`)
      await this.terminate()
      return
    }
    const stop = () => (this.#running = false)
    process.on('SIGTERM', stop)
    process.on('SIGINT', stop)
    this.logger.info('queue worker started')
    while (this.#running) {
      const n = await Queue.work(20)
      if (n === 0) await new Promise((r) => setTimeout(r, (this.sleep || 3) * 1000))
    }
    this.logger.info('queue worker stopped')
    await this.terminate()
  }
}
