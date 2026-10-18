import { usePage } from '@inertiajs/react'
import type { SharedProps } from '~/lib/types'

export function useShared() {
  return usePage<SharedProps & Record<string, unknown>>().props
}
