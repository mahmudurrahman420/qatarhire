/*
| All timestamps are stored and compared in UTC. Displayed in Gulf time on the client.
*/
import { Settings } from 'luxon'

Settings.defaultZone = 'utc'
