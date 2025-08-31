'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  FolderOpen, 
  User, 
  Shield, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  Menu,
  X,
  LogIn,
  UserPlus,
  BookOpen,
  FileText,
  Briefcase
} from 'lucide-react';
import { GlobalApiSettings } from './GlobalApiSettings';
import { SignedIn, SignedOut, UserButton, SignInButton, SignUpButton, useUser, useOrganization } from '@clerk/nextjs';

interface UnifiedNavigationProps {
  variant?: 'homepage' | 'global' | 'project';
  projectId?: string;
  projectName?: string;
  onRefresh?: () => void;
  projectNavigation?: React.ReactNode;
}

export function UnifiedNavigation({ 
  variant = 'global', 
  projectId,
  projectName,
  onRefresh,
  projectNavigation
}: UnifiedNavigationProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const { organization } = useOrganization();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Check if user is admin
  const isAdmin = organization?.slug === 'binghi_admins' || 
                 organization?.name === 'binghi_admins' ||
                 (user?.organizationMemberships?.some((membership: any) => 
                   membership.organization?.slug === 'binghi_admins' || 
                   membership.organization?.name === 'binghi_admins'
                 ));

  // Don't show navigation on homepage when variant is global
  if (variant === 'global' && pathname === '/') {
    return null;
  }

  const getNavigationStyle = () => {
    switch (variant) {
      case 'homepage':
        return {
          header: "border-b bg-white/60 relative z-10",
          logo: "bg-black p-2 border-2 border-gray-800",
          logoText: "font-semibold text-lg text-black",
          container: "container mx-auto px-4 py-4"
        };
      case 'project':
        return {
          header: "bg-card/90 border-b flex-shrink-0",
          logo: "bg-gray-900 p-2 rounded-lg",
          logoText: "font-semibold text-lg text-gray-900",
          container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        };
      default: // global
        return {
          header: "border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60",
          logo: "bg-gray-900 p-2 rounded-lg",
          logoText: "font-semibold text-lg text-gray-900",
          container: "container mx-auto px-4 py-3"
        };
    }
  };

  const styles = getNavigationStyle();

  const renderLogo = () => (
    <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
      <div className={styles.logo}>
        <Brain className="h-5 w-5 text-white" />
      </div>
      <span className={styles.logoText}>
      ROKI Project Manager
      </span>
    </Link>
  );

  const renderProjectBreadcrumb = () => {
    if (variant !== 'project' || !projectId) return null;
    
    return (
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
        <div className="flex items-center space-x-2">
          <Link
            href="/projects"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Projects
          </Link>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate max-w-xs">
            {projectName || (projectId ? projectId.substring(0, 4) : '')}
          </span>
        </div>
      </div>
    );
  };

  const renderMainNavigation = () => {
    const baseNavItems = [
      { href: "/", label: "Home", icon: null as any },
      { href: "/projects", label: "Projects", icon: FolderOpen },
      { href: "/blog", label: "Blog", icon: BookOpen },
      { href: "/jobs", label: "Jobs", icon: Briefcase },
    ];

    const authenticatedNavItems = [
      { href: "/applications", label: "Applications", icon: FileText },
      { href: "/profile", label: "Profile", icon: User },
    ];

    if (isAdmin) {
      authenticatedNavItems.push({ href: "/admin", label: "Admin", icon: Shield });
    }

    // Homepage specific navigation
    if (variant === 'homepage') {
      return (
        <>
          <nav className="hidden md:flex items-center space-x-6">
            {baseNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="flex items-center text-gray-600 hover:text-gray-900">
                  {Icon && <Icon className="mr-1 h-4 w-4" />}
                  {item.label}
                </Link>
              );
            })}
            <Link href="#features" className="text-gray-600 hover:text-gray-900">
              Features
            </Link>
            <Link href="#pricing" className="text-gray-600 hover:text-gray-900">
              Pricing
            </Link>
            <SignedIn>
              {authenticatedNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="flex items-center text-gray-600 hover:text-gray-900">
                    <Icon className="mr-1 h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </SignedIn>
          </nav>
          
          {/* Mobile menu button for homepage */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </>
      );
    }

    // Global and project navigation
    return (
      <>
        <nav className="hidden md:flex items-center space-x-4">
                      {baseNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Button variant="ghost" size="sm" className="flex items-center">
                    {Icon && <Icon className="mr-2 h-4 w-4" />}
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          
          <SignedIn>
            {authenticatedNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Button variant="ghost" size="sm" className="flex items-center">
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            <GlobalApiSettings />
          </SignedIn>
        </nav>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </>
    );
  };

  const renderProjectActions = () => {
    if (variant !== 'project') return null;
    
    return (
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  const renderMobileMenu = () => {
    if (!isMobileMenuOpen) return null;

    return (
      <div className="md:hidden border-t bg-background/95 backdrop-blur max-h-[calc(100vh-4rem)] overflow-y-auto">
        <div className="px-4 py-3 space-y-2">
          {variant === 'homepage' ? (
            <>
              <Link 
                href="/" 
                className="block py-2 text-gray-600 hover:text-gray-900"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                href="/projects" 
                className="block py-2 text-gray-600 hover:text-gray-900"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Projects
              </Link>
              <Link 
                href="/blog" 
                className="block py-2 text-gray-600 hover:text-gray-900"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Blog
              </Link>
              <Link 
                href="/jobs" 
                className="block py-2 text-gray-600 hover:text-gray-900"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Jobs
              </Link>
              <SignedIn>
                <Link 
                  href="/applications" 
                  className="block py-2 text-gray-600 hover:text-gray-900"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Applications
                </Link>
                <Link 
                  href="/profile" 
                  className="block py-2 text-gray-600 hover:text-gray-900"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Profile
                </Link>
              </SignedIn>
              <Link 
                href="#features" 
                className="block py-2 text-gray-600 hover:text-gray-900"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link 
                href="#pricing" 
                className="block py-2 text-gray-600 hover:text-gray-900"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Pricing
              </Link>
            </>
          ) : (
            <>
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  Home
                </Button>
              </Link>
              
              <Link href="/projects" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Projects
                </Button>
              </Link>
              
              <Link href="/blog" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Blog
                </Button>
              </Link>
              
              <Link href="/jobs" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Briefcase className="mr-2 h-4 w-4" />
                  Jobs
                </Button>
              </Link>
              
              <SignedIn>
                <Link href="/applications" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    Applications
                  </Button>
                </Link>
                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Button>
                </Link>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <Shield className="mr-2 h-4 w-4" />
                      Admin
                    </Button>
                  </Link>
                )}
                
                {/* Project Navigation for mobile */}
                {variant === 'project' && projectNavigation && (
                  <div className="border-t pt-3 mt-3">
                    <div className="text-sm font-medium text-muted-foreground mb-2 px-2">
                      Project Navigation
                    </div>
                    <div onClick={() => setIsMobileMenuOpen(false)}>
                      {projectNavigation}
                    </div>
                  </div>
                )}
              </SignedIn>
            </>
          )}
        </div>
      </div>
    );
  };

  const heightClass = variant === 'project' ? 'h-16' : 'h-auto';

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={`flex items-center justify-between ${heightClass}`}>
          {/* Left side - Logo or Project Breadcrumb */}
          <div className="flex items-center">
            {variant === 'project' ? renderProjectBreadcrumb() : renderLogo()}
          </div>
          
          {/* Right side - Navigation and User Controls */}
          <div className="flex items-center space-x-4">
            {renderMainNavigation()}
            {renderProjectActions()}
            
            {/* User controls */}
            <div className="flex items-center space-x-2">
              <SignedOut>
                {variant === 'homepage' ? (
                  <>
                    <SignInButton>
                      <Button variant="outline" size="sm" className="border-2 border-gray-800 text-black hover:bg-gray-100 text-xs md:text-sm">
                        <LogIn className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                        <span className="hidden sm:inline">Sign In</span>
                        <span className="sm:hidden">In</span>
                      </Button>
                    </SignInButton>
                    <SignUpButton>
                      <Button size="sm" className="bg-black hover:bg-gray-800 text-white border-2 border-gray-800 text-xs md:text-sm">
                        <UserPlus className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                        <span className="hidden sm:inline">Sign Up</span>
                        <span className="sm:hidden">Up</span>
                      </Button>
                    </SignUpButton>
                  </>
                ) : (
                  <SignInButton>
                    <Button variant="outline" size="sm" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Sign In</span>
                      <span className="sm:hidden">Sign In</span>
                    </Button>
                  </SignInButton>
                )}
              </SignedOut>
              
              <SignedIn>
                {variant === 'homepage' ? (
                  <Link href="/projects">
                    <Button size="sm" className="bg-black hover:bg-gray-800 text-white border-2 border-gray-800">
                      <FolderOpen className="mr-2 h-4 w-4" />
                      My Projects
                    </Button>
                  </Link>
                ) : (
                  <div className="flex items-center space-x-2">
                    {isAdmin && (
                      <Badge variant="secondary" className="hidden sm:flex items-center gap-1 bg-gray-100 text-gray-800 border-gray-200">
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
                )}
              </SignedIn>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {renderMobileMenu()}
    </header>
  );
}
