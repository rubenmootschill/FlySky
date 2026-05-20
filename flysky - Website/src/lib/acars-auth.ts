import { timingSafeEqual } from 'crypto'
import { getToken } from 'next-auth/jwt'
import { verifyFlymeAuth, getFlymeAuthCookieName } from '@/lib/flyme-auth'

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

export async function isAcarsAuthorized(request: Request): Promise<boolean> {
  const configuredKey = process.env.ACARS_API_KEY
  if (!configuredKey) return false

  const rawAuth = request.headers.get('authorization')
  const headerKey = request.headers.get('x-acars-key')
  const bearerKey = rawAuth?.toLowerCase().startsWith('bearer ')
    ? rawAuth.slice(7).trim()
    : null

  const provided = headerKey?.trim() || bearerKey || ''
  if (provided && safeEqual(provided, configuredKey)) return true

  const cookieHeader = request.headers.get('cookie') || ''
  const desktopCookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${getFlymeAuthCookieName()}=`))
    ?.split('=')
    .slice(1)
    .join('=')

  if (verifyFlymeAuth(desktopCookie)) return true

  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET })
  return Boolean(token?.pilotId || token?.callsign)
}
