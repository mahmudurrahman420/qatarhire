import { Bouncer } from '@adonisjs/bouncer'
import type User from '#models/user'

/** Only administrators may access the admin area. */
export const accessAdmin = Bouncer.ability((user: User) => user.isAdmin)
