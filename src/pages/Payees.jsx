import { useState } from 'react';
import { usePayees } from '../hooks/usePayees';
import AddPayee from '../components/Payees/AddPayee';
import PayeeList from '../components/Payees/PayeeList';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';

const Payees = () => {
  const { payees, loading, addPayee, updatePayee, deletePayee } = usePayees();
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddPayee = async (payeeData) => {
    await addPayee(payeeData);
    setShowAddModal(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Loading payees...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Payee Information</h1>
        <Button onClick={() => setShowAddModal(true)}>Add New Payee</Button>
      </div>

      <PayeeList
        payees={payees}
        onUpdate={updatePayee}
        onDelete={deletePayee}
      />

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Payee"
      >
        <AddPayee
          onAdd={handleAddPayee}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>
    </div>
  );
};

export default Payees;
