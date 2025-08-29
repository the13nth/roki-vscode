import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import pptxgen from 'pptxgenjs';

interface Slide {
  title: string;
  type: 'title' | 'problem' | 'solution' | 'market' | 'business' | 'team' | 'financial' | 'ask' | 'overview' | 'features' | 'progress' | 'roadmap';
  content: {
    bulletPoints: string[];
    speakerNotes: string;
  };
  layout: 'title' | 'content' | 'split';
  order: number;
}

async function generatePowerPointPresentation(
  slides: Slide[], 
  projectName: string, 
  audience: string,
  projectData?: any
): Promise<{ buffer: Buffer; fileName: string }> {
  // Create a new presentation
  const pres = new pptxgen();
  
  // Set presentation properties
  pres.author = 'Roki AI Project Manager';
  pres.company = 'Roki';
  pres.title = `${projectName} - Pitch Deck`;
  pres.subject = `Pitch deck for ${audience} audience`;
  
  // Color scheme
  const colors = {
    primary: '2E86AB',
    secondary: 'A23B72',
    accent: 'F18F01',
    dark: 'C73E1D',
    light: 'F8F9FA',
    text: '212529',
    success: '28A745',
    warning: 'FFC107',
    info: '17A2B8'
  };

  // Free stock image URLs for different slide types
  const stockImages = {
    title: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
    problem: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop',
    solution: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
    market: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
    business: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=600&fit=crop',
    team: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop',
    financial: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop',
    ask: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
    overview: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
    features: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop',
    progress: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
    roadmap: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=600&fit=crop'
  };

  // Generate sample chart data based on slide type
  const generateChartData = (slideType: string) => {
    switch (slideType) {
      case 'market':
        return [
          {
            name: 'Market Size',
            labels: ['2023', '2024', '2025', '2026', '2027'],
            values: [1000000, 1200000, 1500000, 1800000, 2200000]
          },
          {
            name: 'Our Target',
            labels: ['2023', '2024', '2025', '2026', '2027'],
            values: [50000, 120000, 300000, 600000, 1000000]
          }
        ];
      case 'financial':
        return [
          {
            name: 'Revenue',
            labels: ['Q1', 'Q2', 'Q3', 'Q4'],
            values: [50000, 75000, 120000, 180000]
          },
          {
            name: 'Expenses',
            labels: ['Q1', 'Q2', 'Q3', 'Q4'],
            values: [40000, 60000, 90000, 120000]
          },
          {
            name: 'Profit',
            labels: ['Q1', 'Q2', 'Q3', 'Q4'],
            values: [10000, 15000, 30000, 60000]
          }
        ];
      case 'progress':
        return [
          {
            name: 'Completed Tasks',
            labels: ['Planning', 'Development', 'Testing', 'Launch'],
            values: [100, 75, 50, 25]
          }
        ];
      default:
        return [
          {
            name: 'Growth',
            labels: ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'],
            values: [100, 150, 225, 338, 507, 760]
          }
        ];
    }
  };

  // Add slides
  slides.forEach((slide, index) => {
    const pptxSlide = pres.addSlide();
    
    // Set slide background
    pptxSlide.background = { 
      color: colors.light
    };
    
    // Add decorative header shape
    pptxSlide.addShape(pres.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.33,
      h: 0.8,
      fill: { color: colors.primary },
      line: { color: colors.primary, width: 0 }
    });
    
    // Add slide title with enhanced styling
    pptxSlide.addText(slide.title, {
      x: 0.5,
      y: 0.3,
      w: 12.33,
      h: 1.2,
      fontSize: 28,
      fontFace: 'Arial',
      bold: true,
      color: 'FFFFFF',
      align: 'left',
      valign: 'top',
      shadow: { type: 'outer', blur: 3, offset: 2, angle: 45, color: '000000', opacity: 0.3 }
    });
    
    // Add slide type badge with enhanced styling
    pptxSlide.addText(slide.type.toUpperCase(), {
      x: 11.5,
      y: 0.3,
      w: 1.5,
      h: 0.4,
      fontSize: 10,
      fontFace: 'Arial',
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle',
      fill: { color: colors.secondary },
      shadow: { type: 'outer', blur: 2, offset: 1, angle: 45, color: '000000', opacity: 0.2 }
    });
    
    // Add content based on slide type
    if (slide.type === 'title') {
      // Title slide with large image
      try {
        pptxSlide.addImage({
          path: stockImages.title,
          x: 2,
          y: 2,
          w: 9.33,
          h: 4.5,
          sizing: { type: 'contain', w: '100%', h: '100%' }
        });
      } catch (error) {
        console.warn('Failed to load title image:', error);
      }
      
      // Add decorative shapes
      pptxSlide.addShape(pres.ShapeType.ellipse, {
        x: 1,
        y: 3,
        w: 1,
        h: 1,
        fill: { color: colors.accent, transparency: 50 },
        line: { color: colors.accent, width: 2 }
      });
      
      pptxSlide.addShape(pres.ShapeType.rect, {
        x: 11,
        y: 4,
        w: 1.5,
        h: 0.5,
        fill: { color: colors.success, transparency: 30 },
        line: { color: colors.success, width: 1 }
      });
      
    } else if (slide.type === 'market' || slide.type === 'financial' || slide.type === 'progress') {
      // Slides with charts
      const chartData = generateChartData(slide.type);
      
      try {
        // Add chart
        pptxSlide.addChart(pres.ChartType.line, chartData, {
          x: 7,
          y: 1.8,
          w: 6,
          h: 4.5,
          chartColors: [colors.primary, colors.secondary, colors.accent],
          showLegend: true,
          showTitle: true,
          title: `${slide.type.charAt(0).toUpperCase() + slide.type.slice(1)} Analysis`
        });
        
        // Add bullet points on the left
        if (slide.content.bulletPoints && slide.content.bulletPoints.length > 0) {
          const bulletPoints = slide.content.bulletPoints.map(point => ({
            text: point,
            options: { breakLine: true }
          }));
          
          pptxSlide.addText(bulletPoints, {
            x: 0.5,
            y: 1.8,
            w: 6,
            h: 4.5,
            fontSize: 14,
            fontFace: 'Arial',
            color: colors.text,
            align: 'left',
            valign: 'top',
            bullet: { type: 'bullet' }
          });
        }
        
        // Add decorative chart elements
        pptxSlide.addShape(pres.ShapeType.line, {
          x: 7,
          y: 1.8,
          w: 6,
          h: 0,
          line: { color: colors.primary, width: 2 }
        });
        
      } catch (error) {
        console.warn('Failed to add chart:', error);
        // Fallback to bullet points only
        if (slide.content.bulletPoints && slide.content.bulletPoints.length > 0) {
          const bulletPoints = slide.content.bulletPoints.map(point => ({
            text: point,
            options: { breakLine: true }
          }));
          
          pptxSlide.addText(bulletPoints, {
            x: 0.5,
            y: 1.8,
            w: 12,
            h: 4.5,
            fontSize: 16,
            fontFace: 'Arial',
            color: colors.text,
            align: 'left',
            valign: 'top',
            bullet: { type: 'bullet' }
          });
        }
      }
      
    } else {
      // Regular content slides with image and bullet points
      try {
        // Add relevant stock image
        const imageUrl = stockImages[slide.type as keyof typeof stockImages] || stockImages.overview;
        pptxSlide.addImage({
          path: imageUrl,
          x: 7,
          y: 1.8,
          w: 6,
          h: 4.5,
          sizing: { type: 'contain', w: '100%', h: '100%' }
        });
      } catch (error) {
        console.warn('Failed to load slide image:', error);
      }
      
      // Add bullet points
      if (slide.content.bulletPoints && slide.content.bulletPoints.length > 0) {
        const bulletPoints = slide.content.bulletPoints.map(point => ({
          text: point,
          options: { breakLine: true }
        }));
        
        pptxSlide.addText(bulletPoints, {
          x: 0.5,
          y: 1.8,
          w: 6,
          h: 4.5,
          fontSize: 16,
          fontFace: 'Arial',
          color: colors.text,
          align: 'left',
          valign: 'top',
          bullet: { type: 'bullet' }
        });
      }
      
      // Add decorative shapes
      pptxSlide.addShape(pres.ShapeType.ellipse, {
        x: 6.5,
        y: 1.5,
        w: 0.3,
        h: 0.3,
        fill: { color: colors.accent, transparency: 70 },
        line: { color: colors.accent, width: 1 }
      });
      
      pptxSlide.addShape(pres.ShapeType.rect, {
        x: 12.5,
        y: 5.5,
        w: 0.5,
        h: 0.5,
        fill: { color: colors.success, transparency: 50 },
        line: { color: colors.success, width: 1 }
      });
    }
    
    // Add speaker notes
    if (slide.content.speakerNotes) {
      pptxSlide.addNotes(slide.content.speakerNotes);
    }
    
    // Add slide number with enhanced styling
    pptxSlide.addText(`${index + 1}`, {
      x: 12.5,
      y: 6.8,
      w: 0.5,
      h: 0.3,
      fontSize: 12,
      fontFace: 'Arial',
      bold: true,
      color: colors.primary,
      align: 'center',
      valign: 'middle',
      fill: { color: colors.light },
      line: { color: colors.primary, width: 1 }
    });
    
    // Add layout indicator with enhanced styling
    const layoutIcon = slide.layout === 'title' ? '🎯' : slide.layout === 'content' ? '📝' : '📊';
    pptxSlide.addText(layoutIcon, {
      x: 0.2,
      y: 6.8,
      w: 0.5,
      h: 0.3,
      fontSize: 16,
      align: 'center',
      valign: 'middle',
      fill: { color: colors.light },
      line: { color: colors.primary, width: 1 }
    });
    
    // Add footer line
    pptxSlide.addShape(pres.ShapeType.line, {
      x: 0.5,
      y: 6.5,
      w: 12.33,
      h: 0,
      line: { color: colors.primary, width: 1, dashType: 'lgDash' }
    });
  });
  
  // Generate the presentation
  const buffer = await pres.write({ outputType: 'nodebuffer' }) as Buffer;
  const fileName = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_PitchDeck_${audience}_${new Date().toISOString().split('T')[0]}.pptx`;
  
  return { buffer, fileName };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    const body = await request.json();
    const { slides, projectName, audience } = body;

    if (!slides || !Array.isArray(slides)) {
      return NextResponse.json(
        { error: 'Slides data is required' },
        { status: 400 }
      );
    }

    console.log(`📊 Generating PowerPoint for project ${projectId}`);

    try {
      // Generate PowerPoint presentation
      const pptxResult = await generatePowerPointPresentation(
        slides,
        projectName || 'Project',
        audience || 'investor'
      );

      // Return the file as a download
      return new NextResponse(new Uint8Array(pptxResult.buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'Content-Disposition': `attachment; filename="${pptxResult.fileName}"`,
          'Content-Length': pptxResult.buffer.length.toString()
        }
      });

    } catch (error) {
      console.error('❌ Failed to generate PowerPoint:', error);
      return NextResponse.json(
        { error: 'Failed to generate PowerPoint presentation' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ PowerPoint generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate PowerPoint presentation' },
      { status: 500 }
    );
  }
}
