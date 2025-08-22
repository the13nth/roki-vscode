'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Brain, FolderOpen, User, Shield } from 'lucide-react';
import { GlobalApiSettings } from './GlobalApiSettings';
import { SignedIn, SignedOut, UserButton, SignInButton, useUser, useOrganization } from '@clerk/nextjs';
import { Badge } from '@/components/ui/badge';

export function NavigationHeader() {
  const pathname = usePathname();
  const { user } = useUser();
  const { organization } = useOrganization();
  
  // Check if user is part of binghi_admins organization
  const isAdmin = organization?.slug === 'binghi_admins' || 
                 organization?.name === 'binghi_admins' ||
                 (user?.organizationMemberships?.some((membership: any) => 
                   membership.organization?.slug === 'binghi_admins' || 
                   membership.organization?.name === 'binghi_admins'
                 ));
  
  // Don't show navigation on the homepage
  if (pathname === '/') {
    return null;
  }

  return (
    <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI Project Manager
            </span>
          </Link>
          
          <nav className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                Home
              </Button>
            </Link>
            <SignedIn>
              <Link href="/projects">
                <Button variant="ghost" size="sm" className="flex items-center">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Projects
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Button>
              </Link>
              {isAdmin && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="flex items-center">
                    <Shield className="mr-2 h-4 w-4" />
                    Admin
                  </Button>
                </Link>
              )}
              <GlobalApiSettings />
            </SignedIn>
            
            <div className="flex items-center space-x-2">
              <SignedOut>
                <SignInButton>
                  <Button variant="outline" size="sm" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Sign In
                  </Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <div className="flex items-center space-x-2">
                  {isAdmin && (
                    <Badge variant="secondary" className="flex items-center gap-1 bg-purple-100 text-purple-800 border-purple-200">
                      <Shield className="h-3 w-3" />
                      Admin
                    </Badge>
                  )}
                  <UserButton 
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8"
                      }
                    }}
                  />
                </div>
              </SignedIn>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
