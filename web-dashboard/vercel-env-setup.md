# Vercel Environment Variables Setup

To fix the personal API configuration saving issue on your Vercel deployment, you need to set up the following environment variables:

## Required Environment Variables

### 1. Encryption Configuration
These are required for secure storage of API keys:

```
ENCRYPTION_KEY=T85sqJr4ewAFFuNK/mwWJQhAQHqNT3s2
ENCRYPTION_SALT=1m2UFEokKBPgNn6V
```

**How to generate these:**
- Use a secure random generator
- ENCRYPTION_KEY must be at least 32 characters
- ENCRYPTION_SALT must be at least 16 characters

Example:
```
ENCRYPTION_KEY=my-super-secure-32-char-encryption-key!!
ENCRYPTION_SALT=my-secure-salt-16
```

### 2. Clerk Authentication (if not already set)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_SECRET_KEY=your-clerk-secret-key
```

## How to Set Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to "Settings" tab
4. Click on "Environment Variables"
5. Add each variable with the appropriate values
6. Make sure to set them for "Production" environment
7. Redeploy your application

## Alternative: Use Vercel CLI

You can also set environment variables using the Vercel CLI:

```bash
# Install Vercel CLI if you haven't already
npm i -g vercel

# Set environment variables
vercel env add ENCRYPTION_KEY
vercel env add ENCRYPTION_SALT

# Redeploy
vercel --prod
```

## Testing the Fix

After setting the environment variables and redeploying:

1. Go to your profile page
2. Try to save a personal API configuration
3. Check the browser's developer console for any errors
4. The configuration should now save successfully

## Troubleshooting

If you still see issues:

1. Check the Vercel function logs in your dashboard
2. Look for any encryption-related errors
3. Verify that the environment variables are properly set
4. Make sure the values meet the minimum length requirements

## Security Notes

- Keep your encryption key and salt secure
- Never commit these values to your repository
- Use different values for development and production
- Consider rotating these values periodically
