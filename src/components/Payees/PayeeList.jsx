import { useState } from 'react';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Input from '../common/Input';

const PayeeList = ({ payees, onUpdate, onDelete }) => {
  const [editingPayee, setEditingPayee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPayees = payees
    .filter(payee =>
      payee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payee.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by payeeId in descending order
      const idA = parseInt(a.payeeId) || 0;
      const idB = parseInt(b.payeeId) || 0;
      return idB - idA;
    });

  const handleEdit = (payee) => {
    setEditingPayee({ ...payee });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await onUpdate(editingPayee.id, editingPayee);
      setEditingPayee(null);
    } catch (error) {
      console.error('Error updating payee:', error);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <Input
          placeholder="Search by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredPayees.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No payees found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-lg shadow-md">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Phone</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Address</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Notes</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayees.map((payee) => (
                <tr key={payee.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="text-sm font-medium text-gray-900">
                      {payee.payeeId || 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-gray-900">{payee.name}</span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{payee.phone}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{payee.address}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 italic">{payee.notes || '-'}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-3 py-1 text-xs rounded-full ${
                      payee.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {payee.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end space-x-2">
                      <Button variant="secondary" onClick={() => handleEdit(payee)}>Edit</Button>
                      <Button variant="danger" onClick={() => onDelete(payee.id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={!!editingPayee}
        onClose={() => setEditingPayee(null)}
        title="Edit Payee"
      >
        {editingPayee && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <Input
              label="Payee ID"
              name="payeeId"
              value={editingPayee.payeeId || ''}
              onChange={(e) => setEditingPayee({ ...editingPayee, payeeId: e.target.value })}
              required
            />
            <Input
              label="Payee Name"
              name="name"
              value={editingPayee.name}
              onChange={(e) => setEditingPayee({ ...editingPayee, name: e.target.value })}
              required
            />
            <div className="mb-4">
              <label htmlFor="edit-address" className="block text-sm font-medium text-gray-700 mb-1">
                Address<span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                id="edit-address"
                value={editingPayee.address}
                onChange={(e) => setEditingPayee({ ...editingPayee, address: e.target.value })}
                rows="3"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              value={editingPayee.phone}
              onChange={(e) => setEditingPayee({ ...editingPayee, phone: e.target.value })}
              required
            />
            <div className="mb-4">
              <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="edit-notes"
                value={editingPayee.notes || ''}
                onChange={(e) => setEditingPayee({ ...editingPayee, notes: e.target.value })}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700 mb-1">
                Status<span className="text-red-500 ml-1">*</span>
              </label>
              <select
                id="edit-status"
                value={editingPayee.status}
                onChange={(e) => setEditingPayee({ ...editingPayee, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex space-x-3">
              <Button type="submit" variant="primary">Update Payee</Button>
              <Button type="button" variant="secondary" onClick={() => setEditingPayee(null)}>Cancel</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default PayeeList;
