import { DateTime } from 'luxon'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import QueuedJob from '#models/queued_job'

type Handler = (payload: any) => Promise<void>
const handlers = new Map<string, Handler>()

const MAX_ATTEMPTS = 5

/**
 * Minimal durable job queue backed by the `queued_jobs` table.
 * - QUEUE_DRIVER=database: jobs are stored and processed by `node ace queue:work`
 * - QUEUE_DRIVER=sync: jobs run immediately in the request (development/tests)
 */
export default class Queue {
  static register(name: string, handler: Handler) {
    handlers.set(name, handler)
  }

  static async dispatch(name: string, payload: unknown, opts: { delaySeconds?: number } = {}) {
    if (env.get('QUEUE_DRIVER', 'sync') === 'sync') {
      await this.runHandler(name, payload)
      return
    }
    await QueuedJob.create({
      queue: 'default',
      name,
      payload: JSON.stringify(payload),
      attempts: 0,
      availableAt: DateTime.now().plus({ seconds: opts.delaySeconds ?? 0 }),
    })
  }

  static async runHandler(name: string, payload: unknown) {
    const handler = handlers.get(name)
    if (!handler) throw new Error(`No queue handler registered for "${name}"`)
    await handler(payload)
  }

  /** Reserves and processes up to `limit` due jobs. Returns number processed. */
  static async work(limit = 20) {
    let processed = 0
    for (let i = 0; i < limit; i++) {
      const job = await this.reserveNext()
      if (!job) break
      processed++
      try {
        await this.runHandler(job.name, JSON.parse(job.payload))
        await job.delete()
      } catch (error) {
        job.attempts += 1
        job.lastError = String((error as Error)?.stack ?? error).slice(0, 4000)
        job.reservedAt = null
        if (job.attempts >= MAX_ATTEMPTS) {
          job.failedAt = DateTime.now()
          logger.error({ jobId: job.id, name: job.name }, 'queued job failed permanently')
        } else {
          // exponential backoff: 30s, 2m, 8m, 32m
          job.availableAt = DateTime.now().plus({ seconds: 30 * 4 ** (job.attempts - 1) })
          logger.warn({ jobId: job.id, name: job.name, attempts: job.attempts }, 'queued job failed, will retry')
        }
        await job.save()
      }
    }
    return processed
  }

  private static async reserveNext() {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      const staleBefore = now.minus({ minutes: 10 }).toSQL({ includeOffset: false })!
      const row = await QueuedJob.query({ client: trx })
        .whereNull('failed_at')
        .where('available_at', '<=', now.toSQL({ includeOffset: false })!)
        .where((q) => q.whereNull('reserved_at').orWhere('reserved_at', '<', staleBefore))
        .orderBy('id', 'asc')
        .forUpdate()
        .first()
      if (!row) return null
      row.reservedAt = now
      await row.save()
      return row
    })
  }
}
