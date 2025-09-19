'use client';

import { useUser, useOrganization } from '@clerk/nextjs';

export function useAdminCheck() {
  const { user, isLoaded: userLoaded } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  
  // Check if user is admin - same logic as used in navigation
  const isAdmin = organization?.slug === 'binghi_admins' || 
                 organization?.name === 'binghi_admins' ||
                 (user?.organizationMemberships?.some((membership: any) => 
                   membership.organization?.slug === 'binghi_admins' || 
                   membership.organization?.name === 'binghi_admins'
                 ));

  return {
    isAdmin,
    userLoaded,
    orgLoaded,
    user,
    organization
  };
}