import { useState, useEffect } from 'react';
import { addDocument, getDocuments, updateDocument, deleteDocument } from '../services/firebase';

export const useBudgets = (type = 'income') => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const collectionName = 'budgets';

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const data = await getDocuments(collectionName, 'year');
      // Filter by type
      const filteredData = data.filter(budget => budget.type === type);
      setBudgets(filteredData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [type]);

  const getBudgetForSubCategory = (year, category, subCategory) => {
    const budget = budgets.find(
      b => b.year === year &&
           b.category === category &&
           b.subCategory === subCategory &&
           b.type === type
    );
    return budget ? budget.amount : null;
  };

  const setBudgetForSubCategory = async (year, category, subCategory, amount) => {
    try {
      const existingBudget = budgets.find(
        b => b.year === year &&
             b.category === category &&
             b.subCategory === subCategory &&
             b.type === type
      );

      if (existingBudget) {
        // Update existing budget
        await updateDocument(collectionName, existingBudget.id, {
          amount: parseFloat(amount),
          updatedAt: new Date(),
        });
        setBudgets(budgets.map(b =>
          b.id === existingBudget.id
            ? { ...b, amount: parseFloat(amount), updatedAt: new Date() }
            : b
        ));
        return { ...existingBudget, amount: parseFloat(amount) };
      } else {
        // Create new budget
        const newBudget = await addDocument(collectionName, {
          year: parseInt(year),
          type: type,
          category: category,
          subCategory: subCategory,
          amount: parseFloat(amount),
          updatedAt: new Date(),
        });
        setBudgets([...budgets, newBudget]);
        return newBudget;
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteBudget = async (id) => {
    try {
      await deleteDocument(collectionName, id);
      setBudgets(budgets.filter(b => b.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const getBudgetsByYear = (year) => {
    return budgets.filter(b => b.year === year);
  };

  return {
    budgets,
    loading,
    error,
    getBudgetForSubCategory,
    setBudgetForSubCategory,
    deleteBudget,
    getBudgetsByYear,
    refreshBudgets: fetchBudgets,
  };
};
