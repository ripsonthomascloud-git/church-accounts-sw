/**
 * Utility script to update member last names
 * Replaces periods (.) with spaces in lastName field
 */

import { getDocuments, updateDocument } from '../services/firebase';

export const updateMemberLastNames = async () => {
  try {
    console.log('Fetching all members...');
    const members = await getDocuments('members');
    
    console.log(`Found ${members.length} members`);
    
    // Filter members whose lastName contains a period
    const membersToUpdate = members.filter(member => 
      member.lastName && member.lastName.includes('.')
    );
    
    console.log(`Found ${membersToUpdate.length} members with periods in lastName`);
    
    if (membersToUpdate.length === 0) {
      console.log('No members need updating');
      return {
        success: true,
        updated: 0,
        message: 'No members with periods in lastName found'
      };
    }
    
    // Show what will be updated
    console.log('\nMembers to update:');
    membersToUpdate.forEach(member => {
      const newLastName = member.lastName.replace(/\./g, ' ');
      console.log(`  ${member.firstName} ${member.lastName} -> ${member.firstName} ${newLastName}`);
    });
    
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    
    // Update each member
    for (const member of membersToUpdate) {
      try {
        const newLastName = member.lastName.replace(/\./g, ' ');
        await updateDocument('members', member.id, {
          lastName: newLastName
        });
        console.log(`✓ Updated: ${member.firstName} ${member.lastName} -> ${newLastName}`);
        successCount++;
      } catch (error) {
        console.error(`✗ Failed to update ${member.firstName} ${member.lastName}:`, error.message);
        failCount++;
        errors.push({
          member: `${member.firstName} ${member.lastName}`,
          error: error.message
        });
      }
    }
    
    console.log('\n=== Update Complete ===');
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    
    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(err => {
        console.log(`  ${err.member}: ${err.error}`);
      });
    }
    
    return {
      success: failCount === 0,
      updated: successCount,
      failed: failCount,
      errors: errors,
      message: `Updated ${successCount} members. ${failCount} failed.`
    };
    
  } catch (error) {
    console.error('Error updating member last names:', error);
    throw error;
  }
};

// For direct execution in browser console
if (typeof window !== 'undefined') {
  window.updateMemberLastNames = updateMemberLastNames;
}
