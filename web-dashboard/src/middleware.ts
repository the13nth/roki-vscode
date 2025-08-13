import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/projects(.*)',
  '/api/projects(.*)',
])

const isPublicApiRoute = createRouteMatcher([
  '/api/file-watcher(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Skip authentication for public API routes (file watcher)
  if (isPublicApiRoute(req)) {
    return NextResponse.next()
  }
  
  // Skip authentication for VSCode API endpoints
  if (req.nextUrl.pathname.includes('/vscode')) {
    return NextResponse.next()
  }
  
  if (isProtectedRoute(req)) {
    try {
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.redirect(new URL('/sign-in', req.url))
      }
    } catch (error) {
      console.error('Auth error:', error)
      return NextResponse.redirect(new URL('/sign-in', req.url))
    }
  }
  
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}