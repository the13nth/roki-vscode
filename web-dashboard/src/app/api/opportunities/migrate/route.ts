import { NextRequest, NextResponse } from 'next/server';
import { SupabaseService } from '@/lib/supabase';
import { checkAdminAccess } from '@/lib/adminCheck';
import fs from 'fs/promises';
import path from 'path';

// POST /api/opportunities/migrate - Migrate JSON data to Supabase (admin only)
export async function POST(request: NextRequest) {
  try {
    const adminCheck = await checkAdminAccess();
    
    if (!adminCheck.userId) {
      return NextResponse.json(
        { success: false, error: adminCheck.error || 'Authentication required' },
        { status: 401 }
      );
    }

    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: adminCheck.error || 'Admin access required' },
        { status: 403 }
      );
    }

    const supabaseService = SupabaseService.getInstance();

    // Check if opportunities already exist in Supabase
    const existingOpportunities = await supabaseService.getOpportunities();
    
    if (existingOpportunities.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Migration skipped: ${existingOpportunities.length} opportunities already exist in Supabase`
      }, { status: 400 });
    }

    // Read JSON file
    const filePath = path.join(process.cwd(), 'public', 'final_opportunities.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const jsonOpportunities = JSON.parse(fileContent);

    if (!Array.isArray(jsonOpportunities) || jsonOpportunities.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No opportunities found in JSON file'
      }, { status: 400 });
    }

    // Migrate to Supabase
    await supabaseService.migrateOpportunitiesFromJson(jsonOpportunities);

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${jsonOpportunities.length} opportunities to Supabase`,
      migrated_count: jsonOpportunities.length
    });

  } catch (error) {
    console.error('Error migrating opportunities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to migrate opportunities' },
      { status: 500 }
    );
  }
}

// GET /api/opportunities/migrate - Check migration status
export async function GET() {
  try {
    const adminCheck = await checkAdminAccess();
    
    if (!adminCheck.userId) {
      return NextResponse.json(
        { success: false, error: adminCheck.error || 'Authentication required' },
        { status: 401 }
      );
    }

    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: adminCheck.error || 'Admin access required' },
        { status: 403 }
      );
    }

    const supabaseService = SupabaseService.getInstance();
    
    // Count opportunities in Supabase
    const supabaseOpportunities = await supabaseService.getOpportunities();
    
    // Count opportunities in JSON file
    let jsonCount = 0;
    try {
      const filePath = path.join(process.cwd(), 'public', 'final_opportunities.json');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const jsonOpportunities = JSON.parse(fileContent);
      jsonCount = Array.isArray(jsonOpportunities) ? jsonOpportunities.length : 0;
    } catch (error) {
      console.log('No JSON file found or error reading it');
    }

    return NextResponse.json({
      success: true,
      supabase_count: supabaseOpportunities.length,
      json_count: jsonCount,
      migration_needed: supabaseOpportunities.length === 0 && jsonCount > 0,
      migration_status: supabaseOpportunities.length > 0 ? 'completed' : 'pending'
    });

  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check migration status' },
      { status: 500 }
    );
  }
}