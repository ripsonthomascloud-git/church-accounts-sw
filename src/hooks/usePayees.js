import { useState, useEffect } from 'react';
import { addDocument, getDocuments, updateDocument, deleteDocument } from '../services/firebase';

export const usePayees = () => {
  const [payees, setPayees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPayees = async () => {
    try {
      setLoading(true);
      const data = await getDocuments('payees', 'name');
      setPayees(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayees();
  }, []);

  const addPayee = async (payeeData) => {
    try {
      const newPayee = await addDocument('payees', {
        ...payeeData,
        status: payeeData.status || 'active',
      });
      setPayees([newPayee, ...payees]);
      return newPayee;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updatePayee = async (id, payeeData) => {
    try {
      await updateDocument('payees', id, payeeData);
      setPayees(payees.map(p => p.id === id ? { ...p, ...payeeData } : p));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deletePayee = async (id) => {
    try {
      await deleteDocument('payees', id);
      setPayees(payees.filter(p => p.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    payees,
    loading,
    error,
    addPayee,
    updatePayee,
    deletePayee,
    refreshPayees: fetchPayees,
  };
};
