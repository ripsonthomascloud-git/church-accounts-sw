import { useState } from 'react';
import { updateDocument } from '../services/firebase';
import { findMatches } from '../utils/reconciliationMatcher';

export const useReconciliation = (bankStatements, incomeTransactions, expenseTransactions, members = []) => {
  const [reconciling, setReconciling] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Reconcile a bank statement with one or more transactions
   * @param {Object} bankStatement - Bank statement to reconcile
   * @param {Array|Object} transactions - Transaction(s) to reconcile with
   * @returns {Promise<boolean>} - Success status
   */
  const reconcile = async (bankStatement, transactions) => {
    try {
      setReconciling(true);
      setError(null);

      // Convert to array if single transaction
      const transactionArray = Array.isArray(transactions) ? transactions : [transactions];

      // Prepare reconciliation data
      const reconciledTransactions = transactionArray.map(t => ({
        id: t.id,
        type: t.transactionType,
        collection: t.transactionType === 'income' ? 'income' : 'expenses',
        amount: t.amount
      }));

      // Update bank statement with multiple transaction references
      await updateDocument('bankStatements', bankStatement.id, {
        isReconciled: true,
        reconciledTransactionIds: reconciledTransactions.map(t => t.id),
        reconciledTransactions: reconciledTransactions,
        reconciledDate: new Date(),
        // Keep legacy fields for backward compatibility (single transaction)
        reconciledTransactionId: reconciledTransactions[0].id,
        reconciledTransactionType: reconciledTransactions[0].collection,
      });

      // Update each transaction
      for (const transaction of transactionArray) {
        const transactionCollection = transaction.transactionType === 'income' ? 'income' : 'expenses';
        await updateDocument(transactionCollection, transaction.id, {
          reconciledBankStatementId: bankStatement.id,
          reconciledDate: new Date(),
          isReconciled: true,
        });
      }

      return true;
    } catch (err) {
      setError(`Failed to reconcile: ${err.message}`);
      throw err;
    } finally {
      setReconciling(false);
    }
  };

  /**
   * Unreconcile a bank statement (handles both single and multiple transactions)
   * @param {Object} bankStatement - Bank statement to unreconcile
   * @returns {Promise<boolean>} - Success status
   */
  const unreconcile = async (bankStatement) => {
    try {
      setReconciling(true);
      setError(null);

      if (!bankStatement.isReconciled) {
        throw new Error('Bank statement is not reconciled');
      }

      // Handle multiple transactions (new format)
      if (bankStatement.reconciledTransactions && Array.isArray(bankStatement.reconciledTransactions)) {
        for (const transaction of bankStatement.reconciledTransactions) {
          await updateDocument(transaction.collection, transaction.id, {
            reconciledBankStatementId: null,
            reconciledDate: null,
            isReconciled: false,
          });
        }
      }
      // Handle single transaction (legacy format)
      else if (bankStatement.reconciledTransactionType && bankStatement.reconciledTransactionId) {
        await updateDocument(
          bankStatement.reconciledTransactionType,
          bankStatement.reconciledTransactionId,
          {
            reconciledBankStatementId: null,
            reconciledDate: null,
            isReconciled: false,
          }
        );
      }

      // Update bank statement
      await updateDocument('bankStatements', bankStatement.id, {
        isReconciled: false,
        reconciledTransactionId: null,
        reconciledTransactionType: null,
        reconciledTransactionIds: null,
        reconciledTransactions: null,
        reconciledDate: null,
      });

      return true;
    } catch (err) {
      setError(`Failed to unreconcile: ${err.message}`);
      throw err;
    } finally {
      setReconciling(false);
    }
  };

  /**
   * Get matches for a bank statement
   * @param {Object} bankStatement - Bank statement to find matches for
   * @param {Array} currentMembers - Current members array (optional, uses hook members if not provided)
   * @returns {Object} - { exactMatches: [], fuzzyMatches: [], amountMatches: [], commentMatches: [] }
   */
  const getMatches = (bankStatement, currentMembers = null) => {
    if (!bankStatement) {
      return { exactMatches: [], fuzzyMatches: [], amountMatches: [], commentMatches: [] };
    }

    // Use provided members or fall back to hook members
    const membersToUse = currentMembers !== null ? currentMembers : members;

    return findMatches(bankStatement, incomeTransactions, expenseTransactions, membersToUse);
  };

  /**
   * Get unreconciled bank statements
   * @param {string} accountType - Optional account type filter
   * @returns {Array} - Unreconciled statements
   */
  const getUnreconciledStatements = (accountType = null) => {
    let filtered = bankStatements.filter(s => !s.isReconciled);
    if (accountType) {
      filtered = filtered.filter(s => s.accountType === accountType);
    }
    return filtered;
  };

  /**
   * Get reconciled bank statements
   * @param {string} accountType - Optional account type filter
   * @returns {Array} - Reconciled statements
   */
  const getReconciledStatements = (accountType = null) => {
    let filtered = bankStatements.filter(s => s.isReconciled);
    if (accountType) {
      filtered = filtered.filter(s => s.accountType === accountType);
    }
    return filtered;
  };

  return {
    reconcile,
    unreconcile,
    getMatches,
    getUnreconciledStatements,
    getReconciledStatements,
    reconciling,
    error,
  };
};
