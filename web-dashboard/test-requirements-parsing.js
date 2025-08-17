// Test script to verify requirements parsing
const fs = require('fs').promises;

function parseRequirements(content) {
  const requirements = [];
  
  // Split content into sections by requirement headers
  const sections = content.split(/### Requirement (\d+)/);
  
  console.log(`Found ${Math.floor((sections.length - 1) / 2)} requirement sections`);
  
  // Skip the first section (before any requirements)
  for (let i = 1; i < sections.length; i += 2) {
    const number = parseInt(sections[i], 10);
    const sectionContent = sections[i + 1];
    
    console.log(`\nProcessing Requirement ${number}:`);
    console.log(`Section content preview: ${sectionContent?.substring(0, 100)}...`);
    
    if (!sectionContent) continue;
    
    // Look for user story in this section - more flexible regex
    const userStoryMatch = sectionContent.match(/\*\*User Story:\*\*\s*(.+?)(?:\n\n|#### |$)/s);
    
    if (userStoryMatch) {
      const userStory = userStoryMatch[1].trim();
      console.log(`Found user story: ${userStory}`);
      
      // Extract a title from the user story (the action part)
      let title = userStory;
      
      // Extract the "I want to..." part
      const wantMatch = userStory.match(/I want to (.+?)(?:,| so that)/);
      if (wantMatch) {
        title = wantMatch[1].trim();
      } else {
        // Fallback: use the part before "so that" or comma
        if (userStory.includes(' so that ')) {
          title = userStory.split(' so that ')[0];
        } else if (userStory.includes(',')) {
          title = userStory.split(',')[0];
        }
        title = title.replace(/^As a .+?, I want to /, '').trim();
      }
      
      // Clean up title
      if (title.length > 60) {
        title = title.substring(0, 57) + '...';
      }
      
      requirements.push({
        number,
        title,
        userStory
      });
      
      console.log(`Added requirement: ${number} - ${title}`);
    } else {
      console.log(`No user story found for requirement ${number}`);
      // If no user story found, try to extract title from the section
      const lines = sectionContent.split('\n').filter(line => line.trim());
      const firstLine = lines[0]?.trim() || `Requirement ${number}`;
      
      requirements.push({
        number,
        title: firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine,
        userStory: firstLine
      });
      
      console.log(`Added fallback requirement: ${number} - ${firstLine}`);
    }
  }
  
  return requirements.sort((a, b) => a.number - b.number);
}

async function testParsing() {
  try {
    // Test with the sample requirements file
    const testProjectPath = 'web-dashboard/.ai-project/projects/17142f0e-06ab-4019-9ac9-df0009a1e331/requirements.md';
    const content = await fs.readFile(testProjectPath, 'utf-8');
    
    console.log('Testing requirements parsing...');
    console.log('Content length:', content.length);
    console.log('Content preview:', content.substring(0, 200));
    
    const requirements = parseRequirements(content);
    
    console.log('\n=== PARSING RESULTS ===');
    console.log(`Found ${requirements.length} requirements:`);
    
    requirements.forEach(req => {
      console.log(`\n${req.number}. ${req.title}`);
      console.log(`   User Story: ${req.userStory}`);
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testParsing();