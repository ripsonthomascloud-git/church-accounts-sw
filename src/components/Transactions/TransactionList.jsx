import { useState } from 'react';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { updateDocument, getDocument } from '../../services/firebase';

const TransactionList = ({ transactions, onDelete, onEdit, type = 'income', members = [], categories = [] }) => {
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMember, setFilterMember] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterReconciled, setFilterReconciled] = useState('');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const formatDate = (date) => {
    if (!date) return 'N/A';
    if (date.toDate) {
      return date.toDate().toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getMemberName = (transaction) => {
    if (transaction.memberName) {
      return transaction.memberName;
    }
    if (transaction.memberId) {
      const member = members.find(m => m.id === transaction.memberId);
      if (member) {
        return `${member.firstName} ${member.lastName}`;
      }
    }
    return null;
  };

  const transactionCategories = [...new Set(transactions.map(t => t.category))];

  const filteredTransactions = transactions.filter(transaction => {
    // Filter by category
    if (filterCategory && transaction.category !== filterCategory) {
      return false;
    }

    // Filter by member
    if (filterMember) {
      const memberName = getMemberName(transaction);
      if (!memberName || !memberName.toLowerCase().includes(filterMember.toLowerCase())) {
        return false;
      }
    }

    // Filter by date
    if (filterDate) {
      const transactionDate = transaction.date?.toDate ?
        transaction.date.toDate().toISOString().split('T')[0] :
        transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : '';
      if (transactionDate !== filterDate) {
        return false;
      }
    }

    // Filter by month (format: YYYY-MM)
    if (filterMonth) {
      const transactionDate = transaction.date?.toDate ?
        transaction.date.toDate() :
        transaction.date ? new Date(transaction.date) : null;
      if (transactionDate) {
        const transactionMonth = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
        if (transactionMonth !== filterMonth) {
          return false;
        }
      } else {
        return false;
      }
    }

    // Filter by reconciliation status
    if (filterReconciled === 'reconciled' && !transaction.isReconciled) {
      return false;
    }
    if (filterReconciled === 'unreconciled' && transaction.isReconciled) {
      return false;
    }

    return true;
  });

  const handleEditClick = (transaction) => {
    setEditingTransaction(transaction);
    setEditFormData({
      amount: transaction.amount,
      category: transaction.category,
      description: transaction.description || '',
      date: transaction.date?.toDate ? transaction.date.toDate().toISOString().split('T')[0] :
            transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : '',
      payeeName: transaction.payeeName || '',
      memberId: transaction.memberId || '',
      memberName: transaction.memberName || '',
      accountType: transaction.accountType || 'Operating',
      isReconciled: transaction.isReconciled || false,
      reconciledBankStatementId: transaction.reconciledBankStatementId || null,
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      // Check if we're unreconciling the transaction
      const wasReconciled = editingTransaction.isReconciled;
      const isNowReconciled = editFormData.isReconciled;

      if (wasReconciled && !isNowReconciled && editFormData.reconciledBankStatementId) {
        // Unreconcile: Remove references from bank statement
        const bankStatementId = editFormData.reconciledBankStatementId;

        // Fetch the bank statement to update it
        const bankStatement = await getDocument('bankStatements', bankStatementId);

        if (bankStatement) {

          // Remove this transaction from the bank statement's reconciliation data
          let updatedReconciledTransactions = [];
          if (bankStatement.reconciledTransactions && Array.isArray(bankStatement.reconciledTransactions)) {
            updatedReconciledTransactions = bankStatement.reconciledTransactions.filter(
              t => t.id !== editingTransaction.id
            );
          }

          // Update bank statement
          const bankStatementUpdate = {
            reconciledTransactions: updatedReconciledTransactions.length > 0 ? updatedReconciledTransactions : null,
            reconciledTransactionIds: updatedReconciledTransactions.length > 0
              ? updatedReconciledTransactions.map(t => t.id)
              : null,
          };

          // If no more transactions reconciled, mark as unreconciled
          if (updatedReconciledTransactions.length === 0) {
            bankStatementUpdate.isReconciled = false;
            bankStatementUpdate.reconciledDate = null;
            bankStatementUpdate.reconciledTransactionId = null;
            bankStatementUpdate.reconciledTransactionType = null;
          } else {
            // Update legacy fields for backward compatibility
            bankStatementUpdate.reconciledTransactionId = updatedReconciledTransactions[0].id;
            bankStatementUpdate.reconciledTransactionType = updatedReconciledTransactions[0].collection;
          }

          await updateDocument('bankStatements', bankStatement.id, bankStatementUpdate);
        }

        // Update transaction to remove reconciliation
        editFormData.isReconciled = false;
        editFormData.reconciledBankStatementId = null;
        editFormData.reconciledDate = null;
      }

      await onEdit(editingTransaction.id, editFormData);
      setEditingTransaction(null);
      setEditFormData({});
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Failed to update transaction: ' + error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setEditFormData({});
  };

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div>
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Categories</option>
              {transactionCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Member Name</label>
            <input
              type="text"
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
              placeholder="Search by member..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reconciled</label>
            <select
              value={filterReconciled}
              onChange={(e) => setFilterReconciled(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All</option>
              <option value="reconciled">Reconciled</option>
              <option value="unreconciled">Unreconciled</option>
            </select>
          </div>
        </div>

        {(filterCategory || filterMember || filterMonth || filterDate || filterReconciled) && (
          <button
            onClick={() => {
              setFilterCategory('');
              setFilterMember('');
              setFilterMonth('');
              setFilterDate('');
              setFilterReconciled('');
            }}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {filteredTransactions.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No {type} transactions found</p>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {type === 'income' ? 'Member' : 'Payee'}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reconciled
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.category}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {transaction.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {type === 'income' ? (getMemberName(transaction) || '-') : (transaction.payeeName || '-')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.accountType === 'Building'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {transaction.accountType || 'Operating'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {transaction.isReconciled ? (
                        <span className="inline-flex items-center text-green-600" title="Reconciled with bank statement">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </span>
                      ) : (
                        <span className="text-gray-400" title="Not reconciled">-</span>
                      )}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${
                      type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatAmount(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(transaction)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this transaction?")) {
                              onDelete(transaction.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={`mt-6 p-4 rounded-lg ${
            type === 'income' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          } border-2`}>
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">Total:</span>
              <span className={`text-2xl font-bold ${
                type === 'income' ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatAmount(totalAmount)}
              </span>
            </div>
          </div>
        </>
      )}

      <Modal
        isOpen={editingTransaction !== null}
        onClose={handleCancelEdit}
        title="Edit Transaction"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              step="0.01"
              required
              value={editFormData.amount || ''}
              onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 mb-1">
              Account Type
            </label>
            <select
              id="accountType"
              name="accountType"
              required
              value={editFormData.accountType || 'Operating'}
              onChange={(e) => setEditFormData({ ...editFormData, accountType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Operating">Operating</option>
              <option value="Building">Building</option>
            </select>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            {categories.length > 0 ? (
              <select
                id="category"
                name="category"
                required
                value={editFormData.category || ''}
                onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                id="category"
                name="category"
                required
                value={editFormData.category || ''}
                onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={editFormData.description || ''}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              id="date"
              name="date"
              required
              value={editFormData.date || ''}
              onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {editingTransaction?.isReconciled && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="isReconciled"
                  name="isReconciled"
                  checked={editFormData.isReconciled || false}
                  onChange={(e) => setEditFormData({ ...editFormData, isReconciled: e.target.checked })}
                  className="mt-1 mr-3 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <label htmlFor="isReconciled" className="block text-sm font-medium text-gray-700 cursor-pointer">
                    Reconciled
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    This transaction is reconciled with a bank statement. Uncheck to unreconcile and remove references.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="secondary" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TransactionList;
