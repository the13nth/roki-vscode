import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // You can find this in the Clerk Dashboard -> Webhooks -> choose the webhook
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.text()
  const body = JSON.parse(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type

  if (eventType === 'user.created') {
    console.log('User created:', evt.data.id)
    
    // Automatically add user to binghi_users organization
    try {
      await addUserToOrganization(evt.data.id)
      console.log(`✅ Successfully added user ${evt.data.id} to binghi_users organization`)
    } catch (error) {
      console.error(`❌ Failed to add user ${evt.data.id} to organization:`, error)
    }
  }

  if (eventType === 'user.deleted') {
    console.log('User deleted:', evt.data.id)
    // You can add user cleanup logic here
  }

  return NextResponse.json({ message: 'Webhook received' })
}

async function addUserToOrganization(userId: string) {
  const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY
  
  if (!CLERK_SECRET_KEY) {
    throw new Error('CLERK_SECRET_KEY environment variable is required')
  }

  // First, get the organization ID for binghi_users
  const orgResponse = await fetch('https://api.clerk.com/v1/organizations', {
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  if (!orgResponse.ok) {
    throw new Error(`Failed to fetch organizations: ${orgResponse.statusText}`)
  }

  const organizations = await orgResponse.json()
  const binghiUsersOrg = organizations.find((org: any) => 
    org.slug === 'binghi_users' || org.name === 'binghi_users'
  )

  if (!binghiUsersOrg) {
    throw new Error('binghi_users organization not found')
  }

  console.log(`🏢 Found binghi_users organization: ${binghiUsersOrg.id}`)

  // Add user to the organization
  const membershipResponse = await fetch(`https://api.clerk.com/v1/organizations/${binghiUsersOrg.id}/memberships`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      role: 'basic_member', // You can change this to 'admin' if needed
    }),
  })

  if (!membershipResponse.ok) {
    const errorText = await membershipResponse.text()
    throw new Error(`Failed to add user to organization: ${membershipResponse.statusText} - ${errorText}`)
  }

  const membership = await membershipResponse.json()
  console.log(`✅ User ${userId} added to organization with role: ${membership.role}`)
  
  return membership
}