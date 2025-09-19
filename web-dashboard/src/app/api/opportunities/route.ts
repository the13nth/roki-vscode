import { NextRequest, NextResponse } from 'next/server';
import { SupabaseService } from '@/lib/supabase';
import { checkAdminAccess } from '@/lib/adminCheck';
import fs from 'fs/promises';
import path from 'path';

// GET /api/opportunities - Get all opportunities
export async function GET() {
  try {
    const supabaseService = SupabaseService.getInstance();
    
    // Try to get opportunities from Supabase first
    try {
      const opportunities = await supabaseService.getOpportunities();
      
      // Transform Supabase format to match frontend expectations
      const transformedOpportunities = opportunities.map(opp => ({
        Opportunity: opp.opportunity_name,
        Description: opp.description,
        Type: opp.type,
        'Close Date': opp.close_date,
        Status: opp.status,
        Link: opp.link || '',
        'Eligible Countries': opp.eligible_countries.join(', '),
        'For Female Founders': opp.for_female_founders,
        'Sectors of Interest': opp.sectors_of_interest.join(', ')
      }));
      
      return NextResponse.json({
        success: true,
        opportunities: transformedOpportunities
      });
    } catch (supabaseError) {
      console.log('Supabase failed, falling back to JSON file:', supabaseError);
      
      // Fallback to JSON file
      const filePath = path.join(process.cwd(), 'public', 'final_opportunities.json');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const opportunities = JSON.parse(fileContent);
      
      return NextResponse.json({
        success: true,
        opportunities
      });
    }
  } catch (error) {
    console.error('Error loading opportunities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load opportunities' },
      { status: 500 }
    );
  }
}

// POST /api/opportunities - Add new opportunity (admin only)
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

    const userId = adminCheck.userId;

    const body = await request.json();
    const {
      Opportunity,
      Description,
      Type,
      'Close Date': closeDate,
      Status,
      Link,
      'Eligible Countries': eligibleCountries,
      'For Female Founders': forFemaleFounders,
      'Sectors of Interest': sectorsOfInterest
    } = body;

    // Validate required fields
    if (!Opportunity || !Description || !closeDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: Opportunity, Description, and Close Date are required' },
        { status: 400 }
      );
    }

    const supabaseService = SupabaseService.getInstance();

    // Create new opportunity object for Supabase
    const opportunityData = {
      opportunity_name: Opportunity,
      description: Description,
      type: Type || 'Program' as any,
      close_date: closeDate,
      status: Status || 'Open' as any,
      link: Link || null,
      eligible_countries: eligibleCountries ? eligibleCountries.split(',').map((c: string) => c.trim()) : ['Any'],
      for_female_founders: Boolean(forFemaleFounders),
      sectors_of_interest: sectorsOfInterest ? sectorsOfInterest.split(',').map((s: string) => s.trim()) : ['Agnostic'],
      created_by: userId
    };

    try {
      // Save to Supabase
      const savedOpportunity = await supabaseService.createOpportunity(opportunityData);
      
      // Transform back to frontend format
      const responseOpportunity = {
        Opportunity: savedOpportunity.opportunity_name,
        Description: savedOpportunity.description,
        Type: savedOpportunity.type,
        'Close Date': savedOpportunity.close_date,
        Status: savedOpportunity.status,
        Link: savedOpportunity.link || '',
        'Eligible Countries': savedOpportunity.eligible_countries.join(', '),
        'For Female Founders': savedOpportunity.for_female_founders,
        'Sectors of Interest': savedOpportunity.sectors_of_interest.join(', ')
      };

      return NextResponse.json({
        success: true,
        opportunity: responseOpportunity,
        message: 'Opportunity added successfully'
      });
    } catch (supabaseError) {
      console.error('Supabase failed, falling back to JSON file:', supabaseError);
      
      // Fallback to JSON file approach
      const newOpportunity = {
        Opportunity,
        Description,
        Type: Type || 'Program',
        'Close Date': closeDate,
        Status: Status || 'Open',
        Link: Link || '',
        'Eligible Countries': eligibleCountries || 'Any',
        'For Female Founders': Boolean(forFemaleFounders),
        'Sectors of Interest': sectorsOfInterest || 'Agnostic'
      };

      const filePath = path.join(process.cwd(), 'public', 'final_opportunities.json');
      let opportunities = [];
      
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        opportunities = JSON.parse(fileContent);
      } catch (error) {
        console.log('Creating new opportunities file');
        opportunities = [];
      }

      opportunities.unshift(newOpportunity);
      await fs.writeFile(filePath, JSON.stringify(opportunities, null, 2));

      return NextResponse.json({
        success: true,
        opportunity: newOpportunity,
        message: 'Opportunity added successfully (fallback to JSON)'
      });
    }

  } catch (error) {
    console.error('Error adding opportunity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add opportunity' },
      { status: 500 }
    );
  }
}

// PUT /api/opportunities - Update existing opportunity (admin only)
export async function PUT(request: NextRequest) {
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

    const userId = adminCheck.userId;
    const body = await request.json();
    const {
      Opportunity,
      Description,
      Type,
      'Close Date': closeDate,
      Status,
      Link,
      'Eligible Countries': eligibleCountries,
      'For Female Founders': forFemaleFounders,
      'Sectors of Interest': sectorsOfInterest,
      originalOpportunity // We'll use this to identify which opportunity to update
    } = body;

    // Validate required fields
    if (!Opportunity || !Description || !closeDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: Opportunity, Description, and Close Date are required' },
        { status: 400 }
      );
    }

    const supabaseService = SupabaseService.getInstance();

    // Create updated opportunity object for Supabase
    const opportunityData = {
      opportunity_name: Opportunity,
      description: Description,
      type: Type || 'Program' as any,
      close_date: closeDate,
      status: Status || 'Open' as any,
      link: Link || null,
      eligible_countries: eligibleCountries ? eligibleCountries.split(',').map((c: string) => c.trim()) : ['Any'],
      for_female_founders: Boolean(forFemaleFounders),
      sectors_of_interest: sectorsOfInterest ? sectorsOfInterest.split(',').map((s: string) => s.trim()) : ['Agnostic'],
      created_by: userId
    };

    try {
      // For now, we'll update by finding the opportunity with the same name
      // In a real implementation, you'd use an ID
      const opportunities = await supabaseService.getOpportunities();
      const targetOpportunity = opportunities.find(opp => 
        opp.opportunity_name === (originalOpportunity || Opportunity)
      );

      if (!targetOpportunity) {
        // Fallback to JSON file update
        throw new Error('Opportunity not found in Supabase, trying JSON fallback');
      }

      const updatedOpportunity = await supabaseService.updateOpportunity(targetOpportunity.id, opportunityData);
      
      // Transform back to frontend format
      const responseOpportunity = {
        Opportunity: updatedOpportunity.opportunity_name,
        Description: updatedOpportunity.description,
        Type: updatedOpportunity.type,
        'Close Date': updatedOpportunity.close_date,
        Status: updatedOpportunity.status,
        Link: updatedOpportunity.link || '',
        'Eligible Countries': updatedOpportunity.eligible_countries.join(', '),
        'For Female Founders': updatedOpportunity.for_female_founders,
        'Sectors of Interest': updatedOpportunity.sectors_of_interest.join(', ')
      };

      return NextResponse.json({
        success: true,
        opportunity: responseOpportunity,
        message: 'Opportunity updated successfully'
      });
    } catch (supabaseError) {
      console.error('Supabase failed, falling back to JSON file:', supabaseError);
      
      // Fallback to JSON file approach
      const updatedOpportunity = {
        Opportunity,
        Description,
        Type: Type || 'Program',
        'Close Date': closeDate,
        Status: Status || 'Open',
        Link: Link || '',
        'Eligible Countries': eligibleCountries || 'Any',
        'For Female Founders': Boolean(forFemaleFounders),
        'Sectors of Interest': sectorsOfInterest || 'Agnostic'
      };

      const filePath = path.join(process.cwd(), 'public', 'final_opportunities.json');
      
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        let opportunities = JSON.parse(fileContent);
        
        // Find and update the opportunity
        const index = opportunities.findIndex((opp: any) => 
          opp.Opportunity === (originalOpportunity || Opportunity)
        );
        
        if (index !== -1) {
          opportunities[index] = updatedOpportunity;
          await fs.writeFile(filePath, JSON.stringify(opportunities, null, 2));
        } else {
          return NextResponse.json(
            { success: false, error: 'Opportunity not found' },
            { status: 404 }
          );
        }
      } catch (error) {
        console.error('Error updating JSON file:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to update opportunity' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        opportunity: updatedOpportunity,
        message: 'Opportunity updated successfully (fallback to JSON)'
      });
    }

  } catch (error) {
    console.error('Error updating opportunity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update opportunity' },
      { status: 500 }
    );
  }
}