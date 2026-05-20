import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from './src/lib/prisma'
import { isSubscriptionActive } from './src/lib/airline-billing'

const AUTH_EXEMPT_PATHS = ['/login', '/api', '/_next', '/favicon.ico', '/public']

function isAuthExempt(pathname: string) {
  return AUTH_EXEMPT_PATHS.some((prefix) => pathname.startsWith(prefix))
}

export async function middleware(request: NextRequest) {
  const { nextUrl, cookies } = request
  const pathname = nextUrl.pathname

  if (isAuthExempt(pathname)) return NextResponse.next()

  if (!pathname.startsWith('/airline')) return NextResponse.next()

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  const ownerEmail = token.email as string | undefined
  const userRole = token.role as string | undefined

  const activeAirlineId = cookies.get('activeAirlineId')?.value
  let airline
  if (userRole === 'ADMIN') {
    airline = activeAirlineId
      ? await prisma.airline.findUnique({ where: { id: activeAirlineId } })
      : await prisma.airline.findFirst()
  } else if (ownerEmail) {
    airline = activeAirlineId
      ? await prisma.airline.findFirst({ where: { id: activeAirlineId, ownerEmail } })
      : await prisma.airline.findFirst({ where: { ownerEmail } })
  }

  if (!airline) {
    const billingUrl = new URL('/airline/billing', request.url)
    return NextResponse.redirect(billingUrl)
  }
  if (!airline) {
    const billingUrl = new URL('/airline/billing', request.url)
    return NextResponse.redirect(billingUrl)
  }

  const subscription = await (prisma as any).airlineSubscription.findUnique({
    where: { airlineId: airline.id },
  })

  const isBillingPage = pathname === '/airline/billing' || pathname.startsWith('/airline/billing/')
  if (!isBillingPage && !isSubscriptionActive(subscription)) {
    const billingUrl = new URL('/airline/billing', request.url)
    return NextResponse.redirect(billingUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/airline/:path*'],
}
