import { useState, useEffect } from 'react';
import { addDocument, getDocuments, updateDocument, deleteDocument } from '../services/firebase';

export const useMembers = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const data = await getDocuments('members', 'createdAt');
      setMembers(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const addMember = async (memberData) => {
    try {
      const newMember = await addDocument('members', {
        ...memberData,
        status: memberData.status || 'active',
      });
      setMembers([newMember, ...members]);
      return newMember;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateMember = async (id, memberData) => {
    try {
      await updateDocument('members', id, memberData);
      setMembers(members.map(m => m.id === id ? { ...m, ...memberData } : m));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteMember = async (id) => {
    try {
      await deleteDocument('members', id);
      setMembers(members.filter(m => m.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    members,
    loading,
    error,
    addMember,
    updateMember,
    deleteMember,
    refreshMembers: fetchMembers,
  };
};
