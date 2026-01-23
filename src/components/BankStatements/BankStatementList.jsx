import { useState } from 'react';
import { updateDocument } from '../../services/firebase';

const BankStatementList = ({ statements, onSelectStatement, selectedStatementId, onDelete, onUpdate }) => {
  const [filterAccountType, setFilterAccountType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [commentValue, setCommentValue] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [selectedStatements, setSelectedStatements] = useState([]);
  const [deleteAllConfirmation, setDeleteAllConfirmation] = useState(false);

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

  const handleCommentClick = (statement, e) => {
    e.stopPropagation();
    setEditingCommentId(statement.id);
    setCommentValue(statement.comment || '');
  };

  const handleCommentChange = (e) => {
    setCommentValue(e.target.value);
  };

  const handleCommentSave = async (statement, e) => {
    e.stopPropagation();
    try {
      await updateDocument('bankStatements', statement.id, { comment: commentValue });
      if (onUpdate) {
        onUpdate();
      }
      setEditingCommentId(null);
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('Failed to update comment');
    }
  };

  const handleCommentBlur = async (statement) => {
    await handleCommentSave(statement, { stopPropagation: () => {} });
  };

  const handleCommentKeyPress = async (statement, e) => {
    if (e.key === 'Enter') {
      await handleCommentSave(statement, e);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setEditingCommentId(null);
    }
  };

  const handleDeleteClick = (statement, e) => {
    e.stopPropagation();
    setDeleteConfirmation(statement);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmation && onDelete) {
      onDelete(deleteConfirmation);
    }
    setDeleteConfirmation(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmation(null);
  };

  const handleCheckboxChange = (statementId) => {
    setSelectedStatements(prev => {
      if (prev.includes(statementId)) {
        return prev.filter(id => id !== statementId);
      } else {
        return [...prev, statementId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedStatements.length === filteredStatements.length) {
      setSelectedStatements([]);
    } else {
      setSelectedStatements(filteredStatements.map(s => s.id));
    }
  };

  const handleDeleteAllClick = () => {
    if (selectedStatements.length === 0) return;
    setDeleteAllConfirmation(true);
  };

  const handleConfirmDeleteAll = async () => {
    if (selectedStatements.length === 0) return;

    try {
      // Delete all selected statements one by one
      for (const statementId of selectedStatements) {
        const statement = statements.find(s => s.id === statementId);
        if (statement && onDelete) {
          await onDelete(statement);
        }
      }
      setSelectedStatements([]);
      setDeleteAllConfirmation(false);
    } catch (error) {
      console.error('Error deleting statements:', error);
      alert('Failed to delete some statements');
    }
  };

  const handleCancelDeleteAll = () => {
    setDeleteAllConfirmation(false);
  };

  const filteredStatements = statements.filter(statement => {
    // Filter by account type
    if (filterAccountType && statement.accountType !== filterAccountType) {
      return false;
    }

    // Filter by reconciliation status
    if (filterStatus === 'reconciled' && !statement.isReconciled) {
      return false;
    }
    if (filterStatus === 'unreconciled' && statement.isReconciled) {
      return false;
    }

    // Filter by month
    if (filterMonth) {
      const statementDate = statement.postingDate?.toDate ?
        statement.postingDate.toDate() :
        statement.postingDate ? new Date(statement.postingDate) : null;

      if (statementDate) {
        const statementMonth = `${statementDate.getFullYear()}-${String(statementDate.getMonth() + 1).padStart(2, '0')}`;
        if (statementMonth !== filterMonth) {
          return false;
        }
      } else {
        return false;
      }
    }

    return true;
  });

  const totalAmount = filteredStatements.reduce((sum, s) => sum + (s.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Account Type</label>
            <select
              value={filterAccountType}
              onChange={(e) => setFilterAccountType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Accounts</option>
              <option value="Operating">Operating</option>
              <option value="Building">Building</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="reconciled">Reconciled</option>
              <option value="unreconciled">Unreconciled</option>
            </select>
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
        </div>

        {(filterAccountType || filterStatus || filterMonth) && (
          <button
            onClick={() => {
              setFilterAccountType('');
              setFilterStatus('');
              setFilterMonth('');
            }}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {filteredStatements.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No bank statements found</p>
      ) : (
        <>
          {selectedStatements.length > 0 && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex justify-between items-center">
              <span className="text-sm text-blue-700 font-medium">
                {selectedStatements.length} statement{selectedStatements.length > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={handleDeleteAllClick}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
              >
                Delete Selected
              </button>
            </div>
          )}
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedStatements.length === filteredStatements.length && filteredStatements.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Posting Date
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check #
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comment
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStatements.map((statement) => (
                  <tr
                    key={statement.id}
                    onClick={() => onSelectStatement && onSelectStatement(statement)}
                    className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                      selectedStatementId === statement.id ? 'bg-blue-100' : ''
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedStatements.includes(statement.id)}
                        onChange={() => handleCheckboxChange(statement.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {statement.isReconciled ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Reconciled
                          {statement.reconciledTransactions && statement.reconciledTransactions.length > 1 && (
                            <span className="ml-1 text-xs">({statement.reconciledTransactions.length})</span>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          ! Unreconciled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(statement.postingDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {statement.description}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        statement.type === 'Debit'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {statement.type}
                      </span>
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-bold text-right ${
                      statement.amount < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatAmount(statement.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatAmount(statement.balance)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {statement.checkOrSlipNumber || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        statement.accountType === 'Building'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {statement.accountType}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-gray-600"
                      onClick={(e) => handleCommentClick(statement, e)}
                    >
                      {editingCommentId === statement.id ? (
                        <input
                          type="text"
                          value={commentValue}
                          onChange={handleCommentChange}
                          onBlur={() => handleCommentBlur(statement)}
                          onKeyDown={(e) => handleCommentKeyPress(statement, e)}
                          className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded block">
                          {statement.comment || 'Click to add comment...'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <button
                        onClick={(e) => handleDeleteClick(statement, e)}
                        className="text-red-600 hover:text-red-800 font-medium hover:bg-red-50 px-3 py-1 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">
                Showing {filteredStatements.length} of {statements.length} statements
              </span>
              <div className="text-right">
                <div className="text-xs text-gray-500">Total Amount</div>
                <div className={`text-lg font-bold ${
                  totalAmount < 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatAmount(totalAmount)}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Delete
            </h3>
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete this bank statement?
            </p>
            <div className="bg-gray-50 p-3 rounded-md mb-4 text-sm">
              <div className="font-medium text-gray-700">
                {deleteConfirmation.description}
              </div>
              <div className="text-gray-500 mt-1">
                Amount: {formatAmount(deleteConfirmation.amount)} | Date: {formatDate(deleteConfirmation.postingDate)}
              </div>
            </div>
            <p className="text-red-600 text-sm mb-4">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {deleteAllConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Delete Selected Statements
            </h3>
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete {selectedStatements.length} selected bank statement{selectedStatements.length > 1 ? 's' : ''}?
            </p>
            <div className="bg-gray-50 p-3 rounded-md mb-4 text-sm">
              <div className="font-medium text-gray-700 mb-2">
                Selected statements:
              </div>
              <ul className="list-disc list-inside text-gray-600 space-y-1 max-h-40 overflow-y-auto">
                {selectedStatements.map(id => {
                  const statement = statements.find(s => s.id === id);
                  return statement ? (
                    <li key={id}>
                      {statement.description} - {formatAmount(statement.amount)}
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
            <p className="text-red-600 text-sm mb-4">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelDeleteAll}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteAll}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md font-medium transition-colors"
              >
                Delete {selectedStatements.length} Statement{selectedStatements.length > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankStatementList;
