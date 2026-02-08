import { useState, useEffect } from 'react';
import { addDocument, getDocuments, updateDocument, deleteDocument } from '../services/firebase';

export const useParishDirectory = () => {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFamilies = async () => {
    try {
      setLoading(true);
      const data = await getDocuments('parishDirectory', 'familyName');
      // Sort alphabetically in ascending order (case-insensitive)
      const sortedData = data.sort((a, b) => {
        const nameA = (a.familyName || '').toLowerCase();
        const nameB = (b.familyName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setFamilies(sortedData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilies();
  }, []);

  const addFamily = async (familyData) => {
    try {
      const newFamily = await addDocument('parishDirectory', {
        ...familyData,
        isActive: familyData.isActive !== undefined ? familyData.isActive : true,
      });
      setFamilies([newFamily, ...families]);
      return newFamily;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateFamily = async (id, familyData) => {
    try {
      await updateDocument('parishDirectory', id, familyData);
      setFamilies(families.map(f => f.id === id ? { ...f, ...familyData } : f));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteFamily = async (id) => {
    try {
      await deleteDocument('parishDirectory', id);
      setFamilies(families.filter(f => f.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    families,
    loading,
    error,
    addFamily,
    updateFamily,
    deleteFamily,
    refreshFamilies: fetchFamilies,
  };
};
