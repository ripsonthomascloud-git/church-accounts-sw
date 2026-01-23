import { useState, useEffect } from 'react';
import { addDocument, getDocuments, updateDocument, deleteDocument } from '../services/firebase';

export const useTransactions = (type = 'income') => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const collectionName = type === 'income' ? 'income' : 'expenses';

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await getDocuments(collectionName, 'date');
      setTransactions(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [type]);

  const addTransaction = async (transactionData) => {
    try {
      const newTransaction = await addDocument(collectionName, {
        ...transactionData,
        date: toLocalMidnight(transactionData.date),
        amount: parseFloat(transactionData.amount),
        // Initialize reconciliation fields
        reconciledBankStatementId: null,
        reconciledDate: null,
        isReconciled: false,
      });
      setTransactions([newTransaction, ...transactions]);
      return newTransaction;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  function toLocalMidnight(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);   // ✔ local midnight
}

  const updateTransaction = async (id, transactionData) => {
    try {
      const updatedData = {
        ...transactionData,
        amount: parseFloat(transactionData.amount),
         date: toLocalMidnight(transactionData.date),
      };
      await updateDocument(collectionName, id, updatedData);
      setTransactions(transactions.map(t => t.id === id ? { ...t, ...updatedData } : t));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteTransaction = async (id) => {
    try {
      await deleteDocument(collectionName, id);
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const getTotalAmount = () => {
    return transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  };

  const getUnreconciledTransactions = (accountType = null) => {
    let filtered = transactions.filter(t => !t.isReconciled);
    if (accountType) {
      filtered = filtered.filter(t => t.accountType === accountType);
    }
    return filtered;
  };

  return {
    transactions,
    loading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refreshTransactions: fetchTransactions,
    totalAmount: getTotalAmount(),
    getUnreconciledTransactions,
  };
};
