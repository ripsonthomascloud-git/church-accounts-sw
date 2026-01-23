import { useState } from 'react';
import { useMembers } from '../hooks/useMembers';
import AddMember from '../components/Members/AddMember';
import ImportMembers from '../components/Members/ImportMembers';
import MemberList from '../components/Members/MemberList';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';

const Members = () => {
  const { members, loading, addMember, updateMember, deleteMember } = useMembers();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const handleAddMember = async (memberData) => {
    await addMember(memberData);
    setShowAddModal(false);
  };

  const handleImportMembers = async (membersData) => {
    for (const member of membersData) {
      await addMember(member);
    }
    setShowImportModal(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Loading members...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Members</h1>
        <div className="flex space-x-3">
          <Button onClick={() => setShowImportModal(true)} variant="secondary">
            Import from CSV
          </Button>
          <Button onClick={() => setShowAddModal(true)}>Add New Member</Button>
        </div>
      </div>

      <MemberList
        members={members}
        onUpdate={updateMember}
        onDelete={deleteMember}
      />

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Member"
      >
        <AddMember
          onAdd={handleAddMember}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>

      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Import Members from CSV"
      >
        <ImportMembers
          onImport={handleImportMembers}
          onCancel={() => setShowImportModal(false)}
        />
      </Modal>
    </div>
  );
};

export default Members;
