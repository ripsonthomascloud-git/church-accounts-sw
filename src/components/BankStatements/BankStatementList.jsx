import { useState, useEffect, useRef } from 'react';
import { updateDocument, getDocument } from '../../services/firebase';

const BankStatementList = ({ statements, onSelectStatement, selectedStatementId, onDelete, onUpdate, onUnreconcile }) => {
  const [filterAccountType, setFilterAccountType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [commentValue, setCommentValue] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [selectedStatements, setSelectedStatements] = useState([]);
  const [deleteAllConfirmation, setDeleteAllConfirmation] = useState(false);
  const [editingStatementId, setEditingStatementId] = useState(null);
  const [editingValues, setEditingValues] = useState({});
  const [viewReconciledModal, setViewReconciledModal] = useState(null);
  const [reconciledTransactionDetails, setReconciledTransactionDetails] = useState([]);
  const [lastEditedId, setLastEditedId] = useState(null);
  const editedRowRefs = useRef({});

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

  // Scroll to the last edited row after data refresh
  useEffect(() => {
    if (lastEditedId) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        const rowElement = editedRowRefs.current[lastEditedId];
        if (rowElement) {
          rowElement.scrollIntoView({
            behavior: 'auto',
            block: 'nearest',
            inline: 'nearest'
          });
        }
      });

      // Clear the highlight after a delay
      const clearHighlightId = setTimeout(() => {
        setLastEditedId(null);
      }, 2500);

      return () => {
        clearTimeout(clearHighlightId);
      };
    }
  }, [lastEditedId, statements]);

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

      // Update local state without triggering full refresh
      // This prevents the scroll jump
      const updatedStatements = statements.map(s =>
        s.id === statement.id ? { ...s, comment: commentValue } : s
      );

      setEditingCommentId(null);

      // Only call onUpdate if it's meant to update parent state
      // But we handle it locally to avoid scroll jump
      if (onUpdate) {
        // Use a flag or just skip refresh for comment-only updates
        // We'll call it but the parent will handle the state update
        onUpdate();
      }

      // Highlight the row briefly
      setLastEditedId(statement.id);

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

  const handleEditClick = (statement, e) => {
    e.stopPropagation();

    // Warn user if the statement is reconciled
    if (statement.isReconciled) {
      const confirmed = window.confirm(
        'This statement is currently reconciled. Editing and saving will unreconcile it. Do you want to proceed?'
      );
      if (!confirmed) {
        return;
      }
    }

    setEditingStatementId(statement.id);
    setEditingValues({
      description: statement.description,
      amount: statement.amount,
      type: statement.type,
      postingDate: statement.postingDate?.toDate ? statement.postingDate.toDate().toISOString().split('T')[0] : new Date(statement.postingDate).toISOString().split('T')[0],
      checkOrSlipNumber: statement.checkOrSlipNumber || '',
      balance: statement.balance,
      accountType: statement.accountType
    });
  };

  const handleEditChange = (field, value) => {
    setEditingValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEdit = async (statement, e) => {
    e.stopPropagation();

    try {
      // If the statement was reconciled, we need to unreconcile the linked transactions
      // We already warned the user when they clicked Edit, so no need for another confirmation
      if (statement.isReconciled) {
        // Unreconcile linked transactions
        if (statement.reconciledTransactions && Array.isArray(statement.reconciledTransactions)) {
          for (const transaction of statement.reconciledTransactions) {
            await updateDocument(transaction.collection, transaction.id, {
              reconciledBankStatementId: null,
              reconciledDate: null,
              isReconciled: false,
            });
          }
        }
        // Handle legacy single transaction format
        else if (statement.reconciledTransactionType && statement.reconciledTransactionId) {
          await updateDocument(
            statement.reconciledTransactionType,
            statement.reconciledTransactionId,
            {
              reconciledBankStatementId: null,
              reconciledDate: null,
              isReconciled: false,
            }
          );
        }
      }

      // Update bank statement with new values and clear reconciliation data
      await updateDocument('bankStatements', statement.id, {
        description: editingValues.description,
        amount: parseFloat(editingValues.amount),
        type: editingValues.type,
        postingDate: new Date(editingValues.postingDate),
        checkOrSlipNumber: editingValues.checkOrSlipNumber,
        balance: parseFloat(editingValues.balance),
        accountType: editingValues.accountType,
        isReconciled: false,
        reconciledTransactionId: null,
        reconciledTransactionType: null,
        reconciledTransactionIds: null,
        reconciledTransactions: null,
        reconciledDate: null,
      });

      // Clear editing state first
      setEditingStatementId(null);
      setEditingValues({});

      // Store the edited ID before refresh
      setLastEditedId(statement.id);

      if (onUpdate) {
        await onUpdate();
      }

    } catch (error) {
      console.error('Error updating bank statement:', error);
      alert('Failed to update bank statement');
    }
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingStatementId(null);
    setEditingValues({});
  };

  const handleViewReconciled = async (statement, e) => {
    e.stopPropagation();
    setViewReconciledModal(statement);
    setReconciledTransactionDetails([]);

    // Fetch full transaction details
    if (statement.reconciledTransactions && Array.isArray(statement.reconciledTransactions)) {
      try {
        const detailsPromises = statement.reconciledTransactions.map(async (transaction) => {
          const fullTransaction = await getDocument(transaction.collection, transaction.id);
          return fullTransaction;
        });
        const details = await Promise.all(detailsPromises);
        setReconciledTransactionDetails(details.filter(d => d !== null));
      } catch (error) {
        console.error('Error fetching transaction details:', error);
      }
    }
    // Handle legacy single transaction format
    else if (statement.reconciledTransactionId && statement.reconciledTransactionType) {
      try {
        const fullTransaction = await getDocument(
          statement.reconciledTransactionType,
          statement.reconciledTransactionId
        );
        if (fullTransaction) {
          setReconciledTransactionDetails([fullTransaction]);
        }
      } catch (error) {
        console.error('Error fetching transaction details:', error);
      }
    }
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

    // Get statement date
    const statementDate = statement.postingDate?.toDate ?
      statement.postingDate.toDate() :
      statement.postingDate ? new Date(statement.postingDate) : null;

    // If any date filter is active and statement has no date, exclude it
    if ((filterMonth || filterDateFrom || filterDateTo) && !statementDate) {
      return false;
    }

    if (statementDate) {
      // Get statement date components (avoid timezone issues)
      const stmtYear = statementDate.getFullYear();
      const stmtMonth = statementDate.getMonth();
      const stmtDay = statementDate.getDate();

      // Create a date string for comparison (YYYY-MM-DD format)
      const statementDateStr = `${stmtYear}-${String(stmtMonth + 1).padStart(2, '0')}-${String(stmtDay).padStart(2, '0')}`;

      // Filter by date range (takes precedence over month filter if both are set)
      if (filterDateFrom || filterDateTo) {
        if (filterDateFrom) {
          if (statementDateStr < filterDateFrom) {
            return false;
          }
        }

        if (filterDateTo) {
          if (statementDateStr > filterDateTo) {
            return false;
          }
        }
      }
      // Filter by month only if date range is not set
      else if (filterMonth) {
        const statementMonth = `${stmtYear}-${String(stmtMonth + 1).padStart(2, '0')}`;
        if (statementMonth !== filterMonth) {
          return false;
        }
      }
    }

    return true;
  });

  const totalAmount = filteredStatements.reduce((sum, s) => sum + (s.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {(filterAccountType || filterStatus || filterMonth || filterDateFrom || filterDateTo) && (
          <button
            onClick={() => {
              setFilterAccountType('');
              setFilterStatus('');
              setFilterMonth('');
              setFilterDateFrom('');
              setFilterDateTo('');
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
                    ref={(el) => editedRowRefs.current[statement.id] = el}
                    onClick={() => onSelectStatement && onSelectStatement(statement)}
                    className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                      selectedStatementId === statement.id ? 'bg-blue-100' : ''
                    } ${lastEditedId === statement.id ? 'bg-green-100' : ''}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedStatements.includes(statement.id)}
                        onChange={() => handleCheckboxChange(statement.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {statement.isReconciled ? (
                        <span
                          onClick={(e) => handleViewReconciled(statement, e)}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 cursor-pointer hover:bg-green-200 transition-colors"
                        >
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
                      {editingStatementId === statement.id ? (
                        <input
                          type="date"
                          value={editingValues.postingDate}
                          onChange={(e) => handleEditChange('postingDate', e.target.value)}
                          className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        formatDate(statement.postingDate)
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                      {editingStatementId === statement.id ? (
                        <input
                          type="text"
                          value={editingValues.description}
                          onChange={(e) => handleEditChange('description', e.target.value)}
                          className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        statement.description
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {editingStatementId === statement.id ? (
                        <select
                          value={editingValues.type}
                          onChange={(e) => handleEditChange('type', e.target.value)}
                          className="px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="Debit">Debit</option>
                          <option value="Credit">Credit</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          statement.type === 'Debit'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {statement.type}
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-bold text-right ${
                      statement.amount < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {editingStatementId === statement.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editingValues.amount}
                          onChange={(e) => handleEditChange('amount', e.target.value)}
                          className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        formatAmount(statement.amount)
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {editingStatementId === statement.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editingValues.balance}
                          onChange={(e) => handleEditChange('balance', e.target.value)}
                          className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        formatAmount(statement.balance)
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {editingStatementId === statement.id ? (
                        <input
                          type="text"
                          value={editingValues.checkOrSlipNumber}
                          onChange={(e) => handleEditChange('checkOrSlipNumber', e.target.value)}
                          className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        statement.checkOrSlipNumber || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {editingStatementId === statement.id ? (
                        <select
                          value={editingValues.accountType}
                          onChange={(e) => handleEditChange('accountType', e.target.value)}
                          className="px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="Operating">Operating</option>
                          <option value="Building">Building</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          statement.accountType === 'Building'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {statement.accountType}
                        </span>
                      )}
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
                      {editingStatementId === statement.id ? (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={(e) => handleSaveEdit(statement, e)}
                            className="text-green-600 hover:text-green-800 font-medium hover:bg-green-50 px-3 py-1 rounded transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-gray-600 hover:text-gray-800 font-medium hover:bg-gray-100 px-3 py-1 rounded transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={(e) => handleEditClick(statement, e)}
                            className="text-blue-600 hover:text-blue-800 font-medium hover:bg-blue-50 px-3 py-1 rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(statement, e)}
                            className="text-red-600 hover:text-red-800 font-medium hover:bg-red-50 px-3 py-1 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
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

      {/* View Reconciled Transactions Modal */}
      {viewReconciledModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reconciled Transactions
            </h3>
            <div className="bg-blue-50 p-4 rounded-md mb-4">
              <div className="font-medium text-gray-900">
                {viewReconciledModal.description}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Date: {formatDate(viewReconciledModal.postingDate)} | Amount: {formatAmount(viewReconciledModal.amount)}
              </div>
              {viewReconciledModal.reconciledDate && (
                <div className="text-xs text-gray-500 mt-1">
                  Reconciled on: {formatDate(viewReconciledModal.reconciledDate)}
                </div>
              )}
            </div>

            {reconciledTransactionDetails.length > 0 ? (
              <div className="space-y-3 mb-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">
                  Linked Transactions ({reconciledTransactionDetails.length}):
                </div>
                {reconciledTransactionDetails.map((transaction, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Left Column */}
                      <div className="space-y-2">
                        <div>
                          <div className="text-xs text-gray-500">Date</div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatDate(transaction.date)}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500">Category</div>
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.category || '-'}
                            {transaction.subCategory && (
                              <span className="text-gray-600 ml-1">/ {transaction.subCategory}</span>
                            )}
                          </div>
                        </div>

                        {transaction.payeeName && (
                          <div>
                            <div className="text-xs text-gray-500">Payee</div>
                            <div className="text-sm font-medium text-purple-700">
                              {transaction.payeeName}
                            </div>
                          </div>
                        )}

                        {transaction.memberName && (
                          <div>
                            <div className="text-xs text-gray-500">Member</div>
                            <div className="text-sm font-medium text-blue-700">
                              {transaction.memberName}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Column */}
                      <div className="space-y-2">
                        <div>
                          <div className="text-xs text-gray-500">Amount</div>
                          <div className="text-lg font-bold text-gray-900">
                            {formatAmount(transaction.amount)}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-500">Type</div>
                          <div>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              viewReconciledModal.reconciledTransactions?.find(t => t.id === transaction.id)?.type === 'income'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {viewReconciledModal.reconciledTransactions?.find(t => t.id === transaction.id)?.type ||
                               viewReconciledModal.reconciledTransactionType || 'N/A'}
                            </span>
                          </div>
                        </div>

                        {transaction.description && (
                          <div>
                            <div className="text-xs text-gray-500">Description</div>
                            <div className="text-sm text-gray-700">
                              {transaction.description}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="text-xs text-gray-500">Transaction ID</div>
                          <div className="text-xs text-gray-600 font-mono">
                            {transaction.id}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : viewReconciledModal.reconciledTransactions && viewReconciledModal.reconciledTransactions.length > 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-4">
                <p className="text-sm text-yellow-800">
                  Loading transaction details...
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-4">
                <p className="text-sm text-yellow-800">
                  No transaction details available
                </p>
                {viewReconciledModal.reconciledTransactionId && (
                  <p className="text-xs text-yellow-700 mt-1">
                    Transaction ID: {viewReconciledModal.reconciledTransactionId} ({viewReconciledModal.reconciledTransactionType})
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setViewReconciledModal(null);
                  setReconciledTransactionDetails([]);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankStatementList;
