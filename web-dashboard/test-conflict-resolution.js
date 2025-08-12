#!/usr/bin/env node

// Simple test script to verify conflict resolution functionality
const { ConflictResolutionService } = require('./src/lib/conflictResolution.ts');
const fs = require('fs').promises;
const path = require('path');

async function testConflictResolution() {
  console.log('🧪 Testing Conflict Resolution System...\n');

  // Create a test project directory
  const testProjectPath = path.join(__dirname, 'test-conflict-project');
  const aiProjectPath = path.join(testProjectPath, '.ai-project');
  const testFilePath = path.join(aiProjectPath, 'requirements.md');

  try {
    // Clean up any existing test project
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, that's okay
    }

    // Create test project structure
    console.log('📁 Creating test project structure...');
    await fs.mkdir(aiProjectPath, { recursive: true });

    // Create initial test file
    const initialContent = `# Test Requirements

## Introduction

This is a test requirements document for conflict resolution testing.

## Requirements

### Requirement 1

**User Story:** As a user, I want to test conflicts, so that I can verify the system works.

#### Acceptance Criteria

1. WHEN a conflict occurs THEN the system SHALL detect it
2. WHEN conflicts are resolved THEN the system SHALL merge correctly
`;

    await fs.writeFile(testFilePath, initialContent);
    console.log('✅ Test file created\n');

    // Initialize conflict resolver
    console.log('🔧 Initializing conflict resolver...');
    const resolver = new ConflictResolutionService(path.join(testProjectPath, '.backups'));

    // Set up event listeners
    const events = [];
    
    resolver.on('conflictDetected', (conflict) => {
      events.push({ type: 'conflictDetected', ...conflict });
      console.log(`⚠️  Conflict detected: ${conflict.id}`);
      console.log(`   Type: ${conflict.conflictType}`);
      console.log(`   Description: ${conflict.description}`);
    });

    resolver.on('conflictResolved', (resolution) => {
      events.push({ type: 'conflictResolved', ...resolution });
      console.log(`✅ Conflict resolved: ${resolution.conflictId}`);
      console.log(`   Resolution: ${resolution.resolution}`);
      console.log(`   Resolved by: ${resolution.resolvedBy}`);
    });

    resolver.on('backupCreated', (backup) => {
      events.push({ type: 'backupCreated', ...backup });
      console.log(`💾 Backup created: ${path.basename(backup.backupPath)}`);
    });

    resolver.on('fileRestored', (restore) => {
      events.push({ type: 'fileRestored', ...restore });
      console.log(`🔄 File restored from: ${path.basename(restore.backupPath)}`);
    });

    // Test 1: Create a backup
    console.log('\n1️⃣ Testing backup creation...');
    const backup = await resolver.createBackup(testFilePath);
    console.log(`Backup created: ${backup.checksum.substring(0, 8)}...`);

    // Test 2: Simulate external file modification
    console.log('\n2️⃣ Simulating external file modification...');
    const externalContent = `# Test Requirements (Modified Externally)

## Introduction

This is a test requirements document that was modified externally.

## Requirements

### Requirement 1

**User Story:** As a user, I want to test conflicts, so that I can verify the system works.

#### Acceptance Criteria

1. WHEN a conflict occurs THEN the system SHALL detect it
2. WHEN conflicts are resolved THEN the system SHALL merge correctly
3. WHEN external changes happen THEN the system SHALL handle them

### Requirement 2 (Added Externally)

**User Story:** As an external user, I want to add requirements, so that I can test conflicts.

#### Acceptance Criteria

1. WHEN external changes are made THEN conflicts SHALL be detected
`;

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 100));
    await fs.writeFile(testFilePath, externalContent);

    // Test 3: Detect conflict with local changes
    console.log('\n3️⃣ Testing conflict detection...');
    const localContent = `# Test Requirements (Modified Locally)

## Introduction

This is a test requirements document that was modified locally.

## Requirements

### Requirement 1

**User Story:** As a user, I want to test conflicts, so that I can verify the system works.

#### Acceptance Criteria

1. WHEN a conflict occurs THEN the system SHALL detect it
2. WHEN conflicts are resolved THEN the system SHALL merge correctly
3. WHEN local changes happen THEN the system SHALL track them

### Requirement 2 (Added Locally)

**User Story:** As a local user, I want to add requirements, so that I can test conflicts.

#### Acceptance Criteria

1. WHEN local changes are made THEN they SHALL be preserved
`;

    const lastKnownTimestamp = new Date(Date.now() - 5000); // 5 seconds ago
    const conflict = await resolver.detectConflict(testFilePath, localContent, lastKnownTimestamp);

    if (conflict) {
      console.log(`✅ Conflict detected successfully!`);
      
      // Test 4: Perform three-way merge
      console.log('\n4️⃣ Testing three-way merge...');
      const mergeResult = await resolver.performThreeWayMerge(conflict);
      
      console.log(`Merge success: ${mergeResult.success}`);
      console.log(`Conflicts found: ${mergeResult.conflicts.length}`);
      console.log(`Warnings: ${mergeResult.warnings.length}`);
      
      if (mergeResult.warnings.length > 0) {
        console.log('Warnings:');
        mergeResult.warnings.forEach(warning => console.log(`  - ${warning}`));
      }

      // Test 5: Resolve conflict with local content
      console.log('\n5️⃣ Testing conflict resolution (local)...');
      await resolver.resolveConflict(conflict.id, 'local', undefined, 'test-user');
      
      // Verify file content
      const resolvedContent = await fs.readFile(testFilePath, 'utf-8');
      const isLocalContent = resolvedContent === localContent;
      console.log(`Local resolution successful: ${isLocalContent ? '✅' : '❌'}`);

      // Test 6: Test backup and restore
      console.log('\n6️⃣ Testing backup and restore...');
      const backups = await resolver.getBackupsForFile(testFilePath);
      console.log(`Found ${backups.length} backup(s)`);
      
      if (backups.length > 0) {
        const latestBackup = backups[0];
        console.log(`Latest backup: ${latestBackup.timestamp.toISOString()}`);
        
        // Restore from backup
        await resolver.restoreFromBackup(latestBackup.backupPath, testFilePath);
        console.log('✅ File restored from backup');
      }

    } else {
      console.log('❌ No conflict detected (this might be unexpected)');
    }

    // Test 7: Test manual merge
    console.log('\n7️⃣ Testing manual merge...');
    const manualMergeContent = `# Test Requirements (Manually Merged)

## Introduction

This is a test requirements document that combines both local and external changes.

## Requirements

### Requirement 1

**User Story:** As a user, I want to test conflicts, so that I can verify the system works.

#### Acceptance Criteria

1. WHEN a conflict occurs THEN the system SHALL detect it
2. WHEN conflicts are resolved THEN the system SHALL merge correctly
3. WHEN local changes happen THEN the system SHALL track them
4. WHEN external changes happen THEN the system SHALL handle them

### Requirement 2 (Manually Merged)

**User Story:** As a user, I want to merge requirements manually, so that I can resolve complex conflicts.

#### Acceptance Criteria

1. WHEN manual merges are performed THEN all changes SHALL be preserved
2. WHEN conflicts are complex THEN manual resolution SHALL be available
`;

    // Create another conflict for manual resolution
    await fs.writeFile(testFilePath, externalContent);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const manualConflict = await resolver.detectConflict(testFilePath, localContent, new Date(Date.now() - 5000));
    
    if (manualConflict) {
      await resolver.resolveConflict(manualConflict.id, 'manual', manualMergeContent, 'test-user');
      console.log('✅ Manual conflict resolution successful');
    }

    // Summary
    console.log('\n📋 Test Summary:');
    console.log(`Total events captured: ${events.length}`);
    
    const eventCounts = events.reduce((counts, event) => {
      counts[event.type] = (counts[event.type] || 0) + 1;
      return counts;
    }, {});
    
    console.log('Event breakdown:');
    Object.entries(eventCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

    // Verify expected functionality
    const hasConflictDetection = events.some(e => e.type === 'conflictDetected');
    const hasConflictResolution = events.some(e => e.type === 'conflictResolved');
    const hasBackupCreation = events.some(e => e.type === 'backupCreated');

    console.log('\n✅ Feature verification:');
    console.log(`  Conflict detection: ${hasConflictDetection ? '✅' : '❌'}`);
    console.log(`  Conflict resolution: ${hasConflictResolution ? '✅' : '❌'}`);
    console.log(`  Backup creation: ${hasBackupCreation ? '✅' : '❌'}`);

    if (hasConflictDetection && hasConflictResolution && hasBackupCreation) {
      console.log('\n🎉 Conflict resolution system test completed successfully!');
    } else {
      console.log('\n⚠️  Some features may not be working correctly');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Clean up test project
    try {
      await fs.rm(testProjectPath, { recursive: true, force: true });
      console.log('\n🧹 Test project cleaned up');
    } catch (error) {
      console.warn('Failed to clean up test project:', error);
    }
  }
}

// Run the test
if (require.main === module) {
  testConflictResolution().catch(console.error);
}

module.exports = { testConflictResolution };