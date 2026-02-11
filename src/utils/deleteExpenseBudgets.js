import { queryDocumentsByField, batchWrite } from '../services/firebase';

/**
 * Deletes all expense budgets from the budgets collection
 */
export const deleteAllExpenseBudgets = async () => {
  try {
    console.log('Fetching all expense budgets...');

    // Get all budgets with type 'expense'
    const expenseBudgets = await queryDocumentsByField('budgets', 'type', 'expense');

    console.log(`Found ${expenseBudgets.length} expense budgets to delete`);

    if (expenseBudgets.length === 0) {
      console.log('No expense budgets to delete');
      return { success: true, deletedCount: 0 };
    }

    // Prepare batch delete operations
    const deleteOperations = expenseBudgets.map(budget => ({
      type: 'delete',
      collectionName: 'budgets',
      id: budget.id,
    }));

    // Execute batch delete in chunks of 500 (Firestore limit)
    const chunkSize = 500;
    for (let i = 0; i < deleteOperations.length; i += chunkSize) {
      const chunk = deleteOperations.slice(i, i + chunkSize);
      await batchWrite(chunk);
      console.log(`Deleted ${Math.min(i + chunkSize, deleteOperations.length)} of ${deleteOperations.length} budgets`);
    }

    console.log(`Successfully deleted ${expenseBudgets.length} expense budgets`);
    return { success: true, deletedCount: expenseBudgets.length };
  } catch (error) {
    console.error('Error deleting expense budgets:', error);
    throw error;
  }
};
