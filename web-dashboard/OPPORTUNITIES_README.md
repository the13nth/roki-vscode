# Opportunities Feature

This feature allows users to browse startup opportunities and admins to manage them.

## Features

### For All Users
- Browse opportunities in card or table view
- Filter by type, sector, and female founders
- Search through opportunities
- View detailed information about each opportunity
- Direct links to apply for opportunities

### For Admins Only
- Add new opportunities through a comprehensive form
- Migrate existing JSON data to Supabase
- View migration status and data counts

## Database Schema

The opportunities are stored in Supabase with the following structure:

```sql
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Competition', 'Program', 'Accelerator', 'Incubator', 'Grant', 'Fellowship', 'Challenge')),
  close_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Closed', 'Coming Soon')),
  link TEXT,
  eligible_countries TEXT[] NOT NULL DEFAULT '{}',
  for_female_founders BOOLEAN NOT NULL DEFAULT false,
  sectors_of_interest TEXT[] NOT NULL DEFAULT '{}',
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

## Admin Access

Admin access is determined by membership in the `binghi_admins` organization in Clerk. Users with admin access can:

1. See the "Add Opportunity" button
2. Access the migration functionality
3. Add new opportunities through the form

## Migration

The system supports migrating from the existing JSON file format to Supabase:

1. Admins can check migration status via the API
2. If migration is needed, a "Migrate to Supabase" button appears
3. Migration transforms JSON format to Supabase schema
4. After migration, the system uses Supabase as the primary data source

## API Endpoints

- `GET /api/opportunities` - Get all opportunities (with Supabase/JSON fallback)
- `POST /api/opportunities` - Add new opportunity (admin only)
- `GET /api/opportunities/migrate` - Check migration status (admin only)
- `POST /api/opportunities/migrate` - Perform migration (admin only)

## Environment Variables

Required environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Setup Instructions

1. Set up Supabase project and get the required environment variables
2. Run the SQL schema in your Supabase database
3. Configure Clerk with the `binghi_admins` organization for admin access
4. Deploy the application
5. Use the migration feature to import existing JSON data (if any)

## Fallback Behavior

The system is designed with robust fallback behavior:

- If Supabase is unavailable, it falls back to reading from the JSON file
- If adding to Supabase fails, it falls back to updating the JSON file
- This ensures the system continues to work even if there are database issues