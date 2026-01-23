import { useState, useEffect } from 'react';
import { addDocument, getDocuments, updateDocument } from '../services/firebase';

export const useOpeningBalance = () => {
  const [openingBalances, setOpeningBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const collectionName = 'openingBalances';

  const fetchOpeningBalances = async () => {
    try {
      setLoading(true);
      const data = await getDocuments(collectionName, 'year');
      setOpeningBalances(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpeningBalances();
  }, []);

  const getOpeningBalanceForYear = (year, accountType = null) => {
    const balance = openingBalances.find(b => b.year === year && (accountType ? b.accountType === accountType : !b.accountType));
    return balance ? balance.amount : 0;
  };

  const setOpeningBalanceForYear = async (year, amount, accountType = null) => {
    try {
      const existingBalance = openingBalances.find(b => b.year === year && (accountType ? b.accountType === accountType : !b.accountType));

      if (existingBalance) {
        // Update existing balance
        await updateDocument(collectionName, existingBalance.id, {
          amount: parseFloat(amount),
          updatedAt: new Date(),
        });
        setOpeningBalances(openingBalances.map(b =>
          b.id === existingBalance.id
            ? { ...b, amount: parseFloat(amount), updatedAt: new Date() }
            : b
        ));
      } else {
        // Create new balance
        const newBalance = await addDocument(collectionName, {
          year: parseInt(year),
          amount: parseFloat(amount),
          accountType: accountType,
          updatedAt: new Date(),
        });
        setOpeningBalances([...openingBalances, newBalance]);
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    openingBalances,
    loading,
    error,
    getOpeningBalanceForYear,
    setOpeningBalanceForYear,
    refreshOpeningBalances: fetchOpeningBalances,
  };
};
