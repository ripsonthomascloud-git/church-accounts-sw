import { useState, useEffect } from 'react';
import { getDocuments, updateDocument, deleteDocument } from '../services/firebase';

export const useBankStatements = () => {
  const [bankStatements, setBankStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBankStatements = async () => {
    try {
      setLoading(true);
      const data = await getDocuments('bankStatements', 'postingDate');

      // Sort by posting date (desc), then by importTimestamp (desc), then by importOrder (asc) to maintain CSV order
      const sortedData = data.sort((a, b) => {
        // First sort by posting date (descending)
        const dateA = a.postingDate instanceof Date ? a.postingDate : new Date(a.postingDate);
        const dateB = b.postingDate instanceof Date ? b.postingDate : new Date(b.postingDate);
        const dateCompare = dateB - dateA;

        if (dateCompare !== 0) return dateCompare;

        // If same date, sort by import timestamp (descending - newer imports first)
        const timestampCompare = (b.importTimestamp || 0) - (a.importTimestamp || 0);

        if (timestampCompare !== 0) return timestampCompare;

        // If same date and timestamp, sort by import order (ascending - maintain CSV order)
        return (a.importOrder || 0) - (b.importOrder || 0);
      });

      setBankStatements(sortedData);
      setError(null);
      return sortedData; // Return the fresh data
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankStatements();
  }, []);

  const updateBankStatement = async (id, data) => {
    try {
      await updateDocument('bankStatements', id, data);
      setBankStatements(bankStatements.map(s => s.id === id ? { ...s, ...data } : s));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteBankStatement = async (id) => {
    try {
      await deleteDocument('bankStatements', id);
      setBankStatements(bankStatements.filter(s => s.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const getUnreconciledStatements = (accountType = null) => {
    let filtered = bankStatements.filter(s => !s.isReconciled);
    if (accountType) {
      filtered = filtered.filter(s => s.accountType === accountType);
    }
    return filtered;
  };

  const getReconciledStatements = (accountType = null) => {
    let filtered = bankStatements.filter(s => s.isReconciled);
    if (accountType) {
      filtered = filtered.filter(s => s.accountType === accountType);
    }
    return filtered;
  };

  const getStatementsByAccountType = (accountType) => {
    return bankStatements.filter(s => s.accountType === accountType);
  };

  return {
    bankStatements,
    loading,
    error,
    updateBankStatement,
    deleteBankStatement,
    refreshBankStatements: fetchBankStatements,
    getUnreconciledStatements,
    getReconciledStatements,
    getStatementsByAccountType,
  };
};
