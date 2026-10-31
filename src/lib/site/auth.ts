import { getPayload } from 'payload'
import config from '@/payload.config'
import { headers as getHeaders } from 'next/headers'

/**
 * Checks if the current visitor is an authenticated staff member
 * authorized to preview unpublished draft articles.
 */
export async function canUserPreview(): Promise<boolean> {
  try {
    const payload = await getPayload({ config: await config })
    const incomingHeaders = await getHeaders()
    const { user } = await payload.auth({ headers: incomingHeaders })

    if (!user) return false

    // Staff roles with draft preview authorization
    const role = (user as any).role
    return role === 'admin' || role === 'editor' || role === 'author' || !role
  } catch {
    return false
  }
}
