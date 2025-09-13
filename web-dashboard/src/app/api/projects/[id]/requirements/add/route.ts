import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAIConfig, validateSecureConfig } from '@/lib/secureConfig';
import { ProjectService } from '@/lib/projectService';
import { promises as fs } from 'fs';
import path from 'path';
import { auth } from '@clerk/nextjs/server';

// Helper functions from documents API
async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function directoryExists(dirPath: string): Promise<boolean> {
    try {
        const stats = await fs.stat(dirPath);
        return stats.isDirectory();
    } catch {
        return false;
    }
}

async function findProjectById(projectId: string): Promise<string | null> {
    const internalProjectsPath = path.join(process.cwd(), '.ai-project', 'projects', projectId);

    if (await directoryExists(internalProjectsPath)) {
        return internalProjectsPath;
    }

    return null;
}

async function resolveProjectBaseDir(id: string, projectPath: string): Promise<string | null> {
    const internalProjectPath = path.join(process.cwd(), '.ai-project', 'projects', id);
    const internalConfigPath = path.join(internalProjectPath, 'config.json');

    let baseDir: string | null = null;

    if (await fileExists(internalConfigPath)) {
        baseDir = internalProjectPath;
        try {
            const internalConfig = JSON.parse(await fs.readFile(internalConfigPath, 'utf-8')) as any;
            const originalPath: string | undefined = internalConfig.originalPath;
            if (originalPath) {
                const kiroDir = path.join(originalPath, '.kiro', 'specs', 'ai-project-manager');
                const aiProjectDir = path.join(originalPath, '.ai-project');
                if (await directoryExists(kiroDir)) baseDir = kiroDir;
                else if (await directoryExists(aiProjectDir)) baseDir = aiProjectDir;
            }
        } catch { }
    }

    if (!baseDir) {
        const kiroDir = path.join(projectPath, '.kiro', 'specs', 'ai-project-manager');
        const directConfigPath = path.join(projectPath, 'config.json');
        const aiProjectDir = path.join(projectPath, '.ai-project');
        if (await directoryExists(kiroDir)) baseDir = kiroDir;
        else if (await fileExists(directConfigPath)) baseDir = projectPath;
        else if (await directoryExists(aiProjectDir)) baseDir = aiProjectDir;
    }

    if (!baseDir && await fileExists(internalConfigPath)) {
        baseDir = internalProjectPath;
    }

    return baseDir;
}

interface AddRequirementRequest {
    description: string;
}

interface GeneratedRequirement {
    title: string;
    userStory: string;
    acceptanceCriteria: string[];
}

async function generateRequirementWithAI(description: string, existingRequirements: string, projectContext: string): Promise<GeneratedRequirement> {
    const configValidation = validateSecureConfig();
    if (!configValidation.isValid) {
        throw new Error(`Configuration error: ${configValidation.errors.join(', ')}`);
    }

    const config = getGoogleAIConfig();

    const prompt = `You are an expert business analyst and product manager. Based on the user's requirement description and the existing project context, generate a detailed, well-structured requirement following the established format.

PROJECT CONTEXT:
${projectContext}

EXISTING REQUIREMENTS:
${existingRequirements}

USER'S REQUIREMENT DESCRIPTION:
"${description}"

Please analyze the description and generate a comprehensive requirement with the following structure:

1. **Requirement Title**: A clear, concise title that describes the functionality
2. **User Story**: Following the format "As a [role], I want to [action], so that [benefit]"
3. **Acceptance Criteria**: 5-7 specific, testable criteria using WHEN/THEN/IF statements

Guidelines:
- Make the title specific and focused on user value
- User story should identify the user role, desired action, and business benefit
- Acceptance criteria should be testable, specific, and cover main scenarios
- Use technical language appropriate for developers
- Consider edge cases and error scenarios
- Follow the exact format of existing requirements
- Ensure the requirement fits logically with existing requirements

Respond in JSON format:
{
  "title": "Clear requirement title describing the functionality",
  "userStory": "As a [role], I want to [action], so that [benefit]",
  "acceptanceCriteria": [
    "WHEN [condition] THEN the system SHALL [expected behavior]",
    "WHEN [condition] THEN the system SHALL [expected behavior]",
    "IF [condition] THEN the system SHALL [expected behavior]",
    "WHEN [condition] THEN the system SHALL [expected behavior]",
    "WHEN [condition] THEN the system SHALL [expected behavior]"
  ]
}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    maxOutputTokens: 1200,
                    temperature: 0.3,
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        const content = result.candidates[0].content.parts[0].text;

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to parse AI response');
        }

        const generatedRequirement: GeneratedRequirement = JSON.parse(jsonMatch[0]);

        if (!generatedRequirement.title || !generatedRequirement.userStory || !generatedRequirement.acceptanceCriteria || !Array.isArray(generatedRequirement.acceptanceCriteria)) {
            throw new Error('Invalid requirement structure generated by AI');
        }

        return generatedRequirement;
    } catch (error) {
        console.error('AI requirement generation failed:', error);
        throw new Error('Failed to generate requirement with AI');
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;
        
        // Check project ownership before allowing requirement addition
        const projectService = ProjectService.getInstance();
        const project = await projectService.getProject(userId, id);
        
        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }
        
        // Only project owners can add requirements
        if (project.userId !== userId) {
            return NextResponse.json(
                { error: 'Only project owners can add requirements' },
                { status: 403 }
            );
        }
        
        const { description }: AddRequirementRequest = await request.json();

        if (!description || !description.trim()) {
            return NextResponse.json(
                { error: 'Requirement description is required' },
                { status: 400 }
            );
        }

        // Get requirements content from project data
        let requirementsContent = project.requirements || '# Requirements Document\n\n## Introduction\n\nThis document outlines the requirements for the project.\n\n## Requirements\n\n';

        // Get project context (design and tasks)
        let projectContext = '';
        if (project.design) {
            projectContext += `DESIGN:\n${project.design}\n\n`;
        }
        if (project.tasks) {
            projectContext += `TASKS:\n${project.tasks}\n\n`;
        }

        // Generate requirement with AI
        const generatedRequirement = await generateRequirementWithAI(description.trim(), requirementsContent, projectContext);

        // Parse the content to find the next requirement number
        const nextRequirementNumber = getNextRequirementNumber(requirementsContent);

        // Format the new requirement
        const newRequirement = formatNewRequirement(
            nextRequirementNumber,
            generatedRequirement.title,
            generatedRequirement.userStory,
            generatedRequirement.acceptanceCriteria
        );

        // Find the insertion point (at the end of the requirements section)
        const lines = requirementsContent.split('\n');
        const insertionIndex = findInsertionPoint(lines);

        // Insert the new requirement
        lines.splice(insertionIndex, 0, ...newRequirement.split('\n'));

        // Update project requirements in Supabase
        const updatedContent = lines.join('\n');
        const updatedProject = await projectService.updateProject(userId, id, {
            requirements: updatedContent
        });

        if (!updatedProject) {
            return NextResponse.json(
                { error: 'Failed to update project requirements' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            requirementNumber: nextRequirementNumber,
            title: generatedRequirement.title,
            message: 'Requirement generated and added successfully'
        });

    } catch (error) {
        console.error('Error adding requirement:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to add requirement' },
            { status: 500 }
        );
    }
}

function getNextRequirementNumber(content: string): number {
    const requirementRegex = /### Requirement (\d+)/g;
    const existingNumbers: number[] = [];
    let match;

    while ((match = requirementRegex.exec(content)) !== null) {
        existingNumbers.push(parseInt(match[1], 10));
    }

    return existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
}

function formatNewRequirement(
    requirementNumber: number,
    title: string,
    userStory: string,
    acceptanceCriteria: string[]
): string {
    let requirement = `### Requirement ${requirementNumber}\n\n`;
    requirement += `**User Story:** ${userStory}\n\n`;
    requirement += `#### Acceptance Criteria\n\n`;

    acceptanceCriteria.forEach((criteria, index) => {
        requirement += `${index + 1}. ${criteria}\n`;
    });

    return requirement;
}

function findInsertionPoint(lines: string[]): number {
    // Find the last requirement section and insert after it

    for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].match(/^### Requirement \d+/) || lines[i].match(/^\d+\. /)) {
            // Found the end of the last requirement, insert after any trailing content
            let insertIndex = i + 1;

            // Skip any content that belongs to this requirement (acceptance criteria, etc.)
            while (insertIndex < lines.length &&
                (lines[insertIndex].match(/^\d+\./) ||
                    lines[insertIndex].match(/^####/) ||
                    lines[insertIndex].trim() === '' ||
                    lines[insertIndex].match(/^\*\*.*\*\*/))) {
                insertIndex++;
            }

            return insertIndex;
        }
    }

    // If no requirements found, look for "## Requirements" section
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^## Requirements/)) {
            // Insert after the requirements header, skipping any empty lines
            let insertIndex = i + 1;
            while (insertIndex < lines.length && lines[insertIndex].trim() === '') {
                insertIndex++;
            }
            return insertIndex;
        }
    }

    // Fallback: add at the end
    return lines.length;
}