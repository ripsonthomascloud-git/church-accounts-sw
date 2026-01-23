import { useState } from 'react';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Input from '../common/Input';

const MemberList = ({ members, onUpdate, onDelete }) => {
  const [editingMember, setEditingMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMembers = members.filter(member =>
    member.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (member) => {
    setEditingMember({ ...member });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await onUpdate(editingMember.id, editingMember);
      setEditingMember(null);
    } catch (error) {
      console.error('Error updating member:', error);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <Input
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredMembers.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No members found</p>
      ) : (
        <div className="grid gap-4">
          {filteredMembers.map((member) => (
            <div key={member.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      ID: {member.memberId || 'N/A'}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {member.firstName} {member.lastName}
                  </h3>
                  <p className="text-gray-600">{member.email}</p>
                  <p className="text-gray-600">{member.phone}</p>
                  <p className="text-sm text-gray-500 mt-1">{member.address}</p>
                  {member.prayerGroup && (
                    <p className="text-sm text-blue-600 mt-1">
                      <span className="font-medium">Prayer Group:</span> {member.prayerGroup}
                    </p>
                  )}
                  <span className={`inline-block mt-2 px-3 py-1 text-sm rounded-full ${
                    member.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {member.status}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <Button variant="secondary" onClick={() => handleEdit(member)}>Edit</Button>
                  <Button variant="danger" onClick={() => onDelete(member.id)}>Delete</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        title="Edit Member"
      >
        {editingMember && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <Input
              label="Member ID"
              name="memberId"
              value={editingMember.memberId || ''}
              onChange={(e) => setEditingMember({ ...editingMember, memberId: e.target.value })}
              required
            />
            <Input
              label="First Name"
              name="firstName"
              value={editingMember.firstName}
              onChange={(e) => setEditingMember({ ...editingMember, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              name="lastName"
              value={editingMember.lastName}
              onChange={(e) => setEditingMember({ ...editingMember, lastName: e.target.value })}
              required
            />
            <div className="mb-4">
              <label htmlFor="edit-address" className="block text-sm font-medium text-gray-700 mb-1">
                Address<span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                id="edit-address"
                value={editingMember.address}
                onChange={(e) => setEditingMember({ ...editingMember, address: e.target.value })}
                rows="3"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              value={editingMember.phone}
              onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
              required
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={editingMember.email}
              onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
              required
            />
            <Input
              label="Prayer Group"
              name="prayerGroup"
              value={editingMember.prayerGroup || ''}
              onChange={(e) => setEditingMember({ ...editingMember, prayerGroup: e.target.value })}
            />
            <div className="mb-4">
              <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700 mb-1">
                Status<span className="text-red-500 ml-1">*</span>
              </label>
              <select
                id="edit-status"
                value={editingMember.status}
                onChange={(e) => setEditingMember({ ...editingMember, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex space-x-3">
              <Button type="submit" variant="primary">Update Member</Button>
              <Button type="button" variant="secondary" onClick={() => setEditingMember(null)}>Cancel</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default MemberList;
