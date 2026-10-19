import { DateTime } from 'luxon'
import { PLATFORM_TZ } from '#shared/gulf'

/** Today's date (YYYY-MM-DD) in the Gulf's westernmost time zone. Deadlines are inclusive of this day. */
export function gulfToday() {
  return DateTime.now().setZone(PLATFORM_TZ).toISODate()!
}
