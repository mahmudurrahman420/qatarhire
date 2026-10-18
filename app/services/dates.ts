import { DateTime } from 'luxon'

export const QATAR_TZ = 'Asia/Qatar'

/** Today's date in Qatar as YYYY-MM-DD. Deadlines are inclusive of this day. */
export function qatarToday() {
  return DateTime.now().setZone(QATAR_TZ).toISODate()!
}
