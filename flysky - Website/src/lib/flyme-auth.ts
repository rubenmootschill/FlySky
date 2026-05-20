import { createHmac, timingSafeEqual } from 'crypto'

type FlymeAuthPayload = {
  userId: string
  email: string
  callsign: string
}

const COOKIE_NAME = 'flyme_auth'

function getSecret() {
  return process.env.FLYME_DESKTOP_AUTH_SECRET || process.env.NEXTAUTH_SECRET || ''
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

export function signFlymeAuth(payload: FlymeAuthPayload) {
  const secret = getSecret()
  if (!secret) {
    throw new Error('Missing desktop auth secret')
  }

  const data = base64UrlEncode(JSON.stringify(payload))
  const signature = createHmac('sha256', secret).update(data).digest('base64url')
  return `${data}.${signature}`
}

export function verifyFlymeAuth(token: string | null | undefined) {
  const secret = getSecret()
  if (!secret || !token) return null

  const [data, signature] = token.split('.')
  if (!data || !signature) return null

  const expectedSignature = createHmac('sha256', secret).update(data).digest('base64url')
  if (!safeEqual(signature, expectedSignature)) return null

  try {
    const payload = JSON.parse(base64UrlDecode(data)) as FlymeAuthPayload
    if (!payload.userId || !payload.email || !payload.callsign) return null
    return payload
  } catch {
    return null
  }
}

export function getFlymeAuthCookieName() {
  return COOKIE_NAME
}