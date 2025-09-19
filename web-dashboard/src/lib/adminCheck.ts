import { auth } from '@clerk/nextjs/server';

interface ClerkOrganization {
  id: string;
  name: string;
  slug: string;
}

interface ClerkMembership {
  organization: ClerkOrganization;
  role: string;
}

interface ClerkMembershipsResponse {
  data: ClerkMembership[];
}

export async function checkAdminAccess(): Promise<{ isAdmin: boolean; userId: string | null; error?: string }> {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return { isAdmin: false, userId: null, error: 'Authentication required' };
    }

    console.log('🔐 Admin check - User ID:', userId);
    console.log('🔐 Session claims:', JSON.stringify(sessionClaims, null, 2));
    
    // Check session claims for admin organization
    const sessionClaimsStr = JSON.stringify(sessionClaims);
    const hasAdminInClaims = sessionClaimsStr.includes('binghi_admins');
    
    console.log('🔐 Has binghi_admins in session claims:', hasAdminInClaims);
    
    if (hasAdminInClaims) {
      console.log('✅ Admin access granted via session claims');
      return { isAdmin: true, userId };
    }

    // Try direct API check
    console.log('🔐 Trying direct Clerk API check...');
    
    if (!process.env.CLERK_SECRET_KEY) {
      console.log('❌ No CLERK_SECRET_KEY found');
      return { isAdmin: false, userId, error: 'Admin verification not configured' };
    }

    try {
      const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${userId}/organization_memberships`, {
        headers: {
          'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔐 Clerk API response status:', clerkResponse.status);

      if (clerkResponse.ok) {
        const memberships: ClerkMembershipsResponse = await clerkResponse.json();
        console.log('🔐 Direct API memberships:', JSON.stringify(memberships, null, 2));
        
        // Check if memberships is an array or has a data property
        const membershipArray = Array.isArray(memberships) ? memberships : memberships.data || [];
        
        const isAdminMember = membershipArray.some((membership: ClerkMembership) => {
          const orgSlug = membership.organization?.slug;
          const orgName = membership.organization?.name;
          const orgId = membership.organization?.id;
          
          console.log('🔐 Checking membership:', { orgSlug, orgName, orgId });
          
          return orgSlug === 'binghi_admins' || 
                 orgName === 'binghi_admins' ||
                 orgId === 'binghi_admins';
        });

        if (isAdminMember) {
          console.log('✅ Admin access granted via direct API check');
          return { isAdmin: true, userId };
        } else {
          console.log('❌ Admin access denied - user not in binghi_admins organization');
          console.log('Available organizations:', membershipArray.map((m: ClerkMembership) => ({
            slug: m.organization?.slug,
            name: m.organization?.name,
            id: m.organization?.id
          })));
          return { isAdmin: false, userId, error: 'Admin access required - not in binghi_admins organization' };
        }
      } else {
        const errorText = await clerkResponse.text();
        console.log('❌ Clerk API error:', errorText);
        return { isAdmin: false, userId, error: `Admin verification failed: ${clerkResponse.status}` };
      }
    } catch (error) {
      console.error('❌ Error checking admin status:', error);
      return { isAdmin: false, userId, error: 'Admin access required - error verifying admin status' };
    }
  } catch (error) {
    console.error('❌ Error in admin check:', error);
    return { isAdmin: false, userId: null, error: 'Authentication error' };
  }
}