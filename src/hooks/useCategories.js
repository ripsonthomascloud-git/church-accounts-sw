import { useState, useEffect } from 'react';
import { addDocument, getDocuments, updateDocument, deleteDocument } from '../services/firebase';

export const useCategories = (type = 'income') => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const collectionName = type === 'income' ? 'incomeCategories' : 'expenseCategories';

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await getDocuments(collectionName);
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [type]);

  const addCategory = async (categoryData) => {
    try {
      const newCategory = await addDocument(collectionName, categoryData);
      setCategories([newCategory, ...categories]);
      return newCategory;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateCategory = async (id, categoryData) => {
    try {
      await updateDocument(collectionName, id, categoryData);
      setCategories(categories.map(c => c.id === id ? { ...c, ...categoryData } : c));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteCategory = async (id) => {
    try {
      await deleteDocument(collectionName, id);
      setCategories(categories.filter(c => c.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    refreshCategories: fetchCategories,
  };
};
