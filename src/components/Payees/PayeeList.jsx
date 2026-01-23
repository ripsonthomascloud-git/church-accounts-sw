import { useState } from 'react';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Input from '../common/Input';

const PayeeList = ({ payees, onUpdate, onDelete }) => {
  const [editingPayee, setEditingPayee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPayees = payees.filter(payee =>
    payee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payee.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <div className="grid gap-4">
          {filteredPayees.map((payee) => (
            <div key={payee.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      ID: {payee.payeeId || 'N/A'}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {payee.name}
                  </h3>
                  <p className="text-gray-600">{payee.phone}</p>
                  <p className="text-sm text-gray-500 mt-1">{payee.address}</p>
                  {payee.notes && (
                    <p className="text-sm text-gray-600 mt-2 italic">{payee.notes}</p>
                  )}
                  <span className={`inline-block mt-2 px-3 py-1 text-sm rounded-full ${
                    payee.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {payee.status}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <Button variant="secondary" onClick={() => handleEdit(payee)}>Edit</Button>
                  <Button variant="danger" onClick={() => onDelete(payee.id)}>Delete</Button>
                </div>
              </div>
            </div>
          ))}
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
