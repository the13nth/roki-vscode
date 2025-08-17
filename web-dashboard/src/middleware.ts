import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/projects(.*)',
  '/api/projects(.*)',
])

const isPublicApiRoute = createRouteMatcher([
  '/api/file-watcher(.*)',
  '/api/auth/verify-token',
  '/api/vscode(.*)',
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
  
  // TEMPORARILY DISABLE AUTHENTICATION FOR TESTING
  // TODO: Re-enable after updating Clerk keys
  if (isProtectedRoute(req)) {
    try {
      const { userId } = await auth()
      if (!userId) {
        // Only redirect to sign-in if user is not authenticated
        const signInUrl = new URL('/sign-in', req.url)
        signInUrl.searchParams.set('redirect_url', req.nextUrl.pathname)
        return NextResponse.redirect(signInUrl)
      }
    } catch (error) {
      console.error('Auth error:', error)
      // TEMPORARILY SKIP AUTHENTICATION ERRORS
      console.log('Skipping authentication error for testing:', error)
      return NextResponse.next()
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