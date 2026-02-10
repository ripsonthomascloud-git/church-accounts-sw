import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../common/Button';

const ReconciliationView = ({
  bankStatements,
  selectedStatement,
  onSelectStatement,
  matches,
  onReconcile,
  onUnreconcile,
  reconciling,
  members = [],
  allIncomeTransactions = [],
  allExpenseTransactions = []
}) => {
  const [filterAccountType, setFilterAccountType] = useState(() => {
    return localStorage.getItem('reconciliationView_filterAccountType') || '';
  });
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const navigate = useNavigate();
  const selectedStatementRef = useRef(null);

  // Transaction filters
  const [filterMember, setFilterMember] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAmount, setFilterAmount] = useState('');
  const [showAllUnreconciled, setShowAllUnreconciled] = useState(false);

  // Persist account type filter to localStorage
  useEffect(() => {
    localStorage.setItem('reconciliationView_filterAccountType', filterAccountType);
  }, [filterAccountType]);

  // Auto-scroll to selected statement
  useEffect(() => {
    if (selectedStatement && selectedStatementRef.current) {
      selectedStatementRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedStatement]);

  const formatDate = (date) => {
    if (!date) return 'N/A';

    let jsDate;
    if (date.toDate) {
      // Firestore timestamp
      jsDate = date.toDate();
    } else if (date instanceof Date) {
      jsDate = date;
    } else {
      jsDate = new Date(date);
    }

    // Extract date components to avoid timezone issues
    const year = jsDate.getFullYear();
    const month = jsDate.getMonth();
    const day = jsDate.getDate();

    // Create a new date at local midnight
    const localDate = new Date(year, month, day);

    return localDate.toLocaleDateString();
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

  const renderTransactionDetails = (transaction) => {
    const memberName = getMemberName(transaction);
    const isExpense = transaction.transactionType === 'expenses';

    return (
      <div className="flex-1">
        <div className="font-medium text-gray-900">
          {transaction.category}
          {transaction.subCategory && (
            <span className="text-gray-600 text-sm ml-1">
              / {transaction.subCategory}
            </span>
          )}
        </div>
        {isExpense && transaction.payeeName && (
          <div className="text-sm text-purple-600 mt-1">
            Payee: {transaction.payeeName}
          </div>
        )}
        {memberName && (
          <div className="text-sm text-blue-600 mt-1">
            Member: {memberName}
          </div>
        )}
        <div className="text-sm text-gray-600 mt-1">
          {transaction.description || '-'}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {formatDate(transaction.date)}
        </div>
      </div>
    );
  };

  const handleTransactionToggle = (transaction) => {
    setSelectedTransactions(prev => {
      const isSelected = prev.some(t => t.id === transaction.id);
      if (isSelected) {
        return prev.filter(t => t.id !== transaction.id);
      } else {
        return [...prev, transaction];
      }
    });
  };

  const getSelectedTotal = () => {
    return selectedTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  };

  const handleMultiReconcile = async () => {
    if (selectedTransactions.length === 0) return;

    // Get the current index to select next statement after reconciliation
    const currentIndex = unreconciledStatements.findIndex(s => s.id === selectedStatement.id);

    await onReconcile(selectedStatement, selectedTransactions);

    // After successful reconciliation, select the next unreconciled statement
    // The unreconciledStatements will be refreshed by parent, so we select by index
    setTimeout(() => {
      const nextStatements = bankStatements.filter(s => !s.isReconciled && !s.isExcluded);
      if (nextStatements.length > 0) {
        // Try to select the statement at the same index, or the last one if we were at the end
        const nextIndex = Math.min(currentIndex, nextStatements.length - 1);
        handleStatementSelectWithReset(nextStatements[nextIndex]);
      }
    }, 100);
  };

  const handleCreateNewTransaction = () => {
    // Navigate to transactions page
    navigate('/transactions');
  };

  const handleSingleReconcile = async (statement, transactions) => {
    // Get the current index to select next statement after reconciliation
    const currentIndex = unreconciledStatements.findIndex(s => s.id === statement.id);

    await onReconcile(statement, transactions);

    // After successful reconciliation, select the next unreconciled statement
    setTimeout(() => {
      const nextStatements = bankStatements.filter(s => !s.isReconciled && !s.isExcluded);
      if (nextStatements.length > 0) {
        // Try to select the statement at the same index, or the last one if we were at the end
        const nextIndex = Math.min(currentIndex, nextStatements.length - 1);
        handleStatementSelectWithReset(nextStatements[nextIndex]);
      }
    }, 100);
  };


  const filteredStatements = bankStatements.filter(statement => {
    if (filterAccountType && statement.accountType !== filterAccountType) {
      return false;
    }
    return true;
  });

  const unreconciledStatements = filteredStatements.filter(s => !s.isReconciled && !s.isExcluded);

  // Get all available transactions for manual selection
  const getAllAvailableTransactions = () => {
    if (!selectedStatement) return [];

    // Determine expected transaction type based on bank statement amount
    // Negative amount = money out = expenses, Positive amount = money in = income
    const expectedType = selectedStatement.amount < 0 ? 'expenses' : 'income';
    const sourceTransactions = expectedType === 'income' ? allIncomeTransactions : allExpenseTransactions;

    // Filter unreconciled transactions matching account type
    return sourceTransactions
      .filter(t => !t.isReconciled && t.accountType === selectedStatement.accountType)
      .map(t => ({ ...t, transactionType: expectedType }));
  };

  const availableTransactions = getAllAvailableTransactions();

  // Filter transactions based on search criteria
  const filterTransactions = (transactions) => {
    return transactions.filter(transaction => {
      // Filter by member
      if (filterMember) {
        const memberName = getMemberName(transaction);
        if (!memberName || !memberName.toLowerCase().includes(filterMember.toLowerCase())) {
          return false;
        }
      }

      // Filter by category
      if (filterCategory) {
        if (!transaction.category || !transaction.category.toLowerCase().includes(filterCategory.toLowerCase())) {
          return false;
        }
      }

      // Filter by amount
      if (filterAmount) {
        const searchAmount = parseFloat(filterAmount);
        if (!isNaN(searchAmount)) {
          // Allow some tolerance for amount matching
          if (Math.abs(transaction.amount - searchAmount) > 0.01) {
            return false;
          }
        }
      }

      return true;
    });
  };

  // Reset transaction filters when statement changes
  const handleStatementSelectWithReset = (statement) => {
    setSelectedTransactions([]);
    setFilterMember('');
    setFilterCategory('');
    setFilterAmount('');
    setShowAllUnreconciled(false);
    onSelectStatement(statement);
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left Panel - Bank Statements */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Bank Statements ({unreconciledStatements.length} unreconciled)
          </h3>
          <select
            value={filterAccountType}
            onChange={(e) => setFilterAccountType(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Accounts</option>
            <option value="Operating">Operating</option>
            <option value="Building">Building</option>
          </select>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            {unreconciledStatements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg mb-2">All statements reconciled!</p>
                <p className="text-sm">Great job keeping your records in sync.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {unreconciledStatements.map((statement) => (
                  <div
                    key={statement.id}
                    ref={selectedStatement?.id === statement.id ? selectedStatementRef : null}
                    onClick={() => handleStatementSelectWithReset(statement)}
                    className={`p-4 cursor-pointer hover:bg-blue-50 transition-colors ${
                      selectedStatement?.id === statement.id ? 'bg-blue-100 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 truncate">
                          {statement.description}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {formatDate(statement.postingDate)}
                        </div>
                        {statement.comment && (
                          <div className="text-xs text-blue-600 mt-1 italic truncate">
                            💬 {statement.comment}
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className={`font-bold ${
                          statement.amount < 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatAmount(statement.amount)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {statement.accountType}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className={`px-2 py-1 rounded-full font-medium ${
                        statement.type === 'Debit'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {statement.type}
                      </span>
                      {statement.checkOrSlipNumber && (
                        <span>Check #{statement.checkOrSlipNumber}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Matching Transactions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Matching Transactions</h3>

        {!selectedStatement ? (
          <div className="border border-gray-200 rounded-lg p-8 text-center text-gray-500">
            <p className="text-lg mb-2">Select a bank statement</p>
            <p className="text-sm">Click on a statement from the left to find matching transactions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Transaction Filters */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-semibold text-gray-700">Filter Transactions</h4>
                <button
                  onClick={() => setShowAllUnreconciled(!showAllUnreconciled)}
                  className={`px-3 py-1 text-xs font-medium rounded ${
                    showAllUnreconciled
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-purple-600 border border-purple-600'
                  } hover:opacity-80 transition-opacity`}
                >
                  {showAllUnreconciled ? '✓ Showing All' : 'Show All Unreconciled'}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <input
                    type="text"
                    placeholder="Search member..."
                    value={filterMember}
                    onChange={(e) => setFilterMember(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Search category..."
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Amount..."
                    value={filterAmount}
                    onChange={(e) => setFilterAmount(e.target.value)}
                    step="0.01"
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              {(filterMember || filterCategory || filterAmount) && (
                <button
                  onClick={() => {
                    setFilterMember('');
                    setFilterCategory('');
                    setFilterAmount('');
                  }}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear Filters
                </button>
              )}
            </div>
            {/* Selected Statement Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-700 mb-1">Selected Statement</div>
              <div className="font-medium text-blue-900">{selectedStatement.description}</div>
              <div className="flex justify-between items-center mt-2 text-sm text-blue-700">
                <span>{formatDate(selectedStatement.postingDate)}</span>
                <span className="font-bold">{formatAmount(Math.abs(selectedStatement.amount))}</span>
              </div>
            </div>

            {/* Multi-Transaction Selection Summary */}
            {selectedTransactions.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <div className="text-sm font-semibold text-purple-900">
                      {selectedTransactions.length} Transaction{selectedTransactions.length > 1 ? 's' : ''} Selected
                    </div>
                    <div className="text-xs text-purple-700 mt-1">
                      Total: {formatAmount(getSelectedTotal())}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-purple-700">Bank Statement</div>
                    <div className="font-bold text-purple-900">
                      {formatAmount(Math.abs(selectedStatement.amount))}
                    </div>
                  </div>
                </div>

                {/* Selected Transactions List */}
                <div className="mb-3 space-y-2 max-h-64 overflow-y-auto">
                  {selectedTransactions.map((transaction) => {
                    const memberName = getMemberName(transaction);
                    const isExpense = transaction.transactionType === 'expenses';

                    return (
                      <div key={transaction.id} className="bg-white border border-purple-200 rounded p-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.category}
                              {transaction.subCategory && (
                                <span className="text-gray-600 text-xs ml-1">
                                  / {transaction.subCategory}
                                </span>
                              )}
                            </div>
                            {isExpense && transaction.payeeName && (
                              <div className="text-xs text-purple-600 mt-0.5">
                                Payee: {transaction.payeeName}
                              </div>
                            )}
                            {memberName && (
                              <div className="text-xs text-blue-600 mt-0.5">
                                Member: {memberName}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-0.5">
                              {formatDate(transaction.date)}
                            </div>
                          </div>
                          <div className="text-right ml-3">
                            <div className="text-sm font-bold text-gray-900">
                              {formatAmount(transaction.amount)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {Math.abs(getSelectedTotal() - Math.abs(selectedStatement.amount)) < 0.01 ? (
                  <div className="bg-green-100 border border-green-300 rounded p-2 mb-3">
                    <p className="text-xs text-green-800 font-medium">
                      ✓ Amounts match! Ready to reconcile.
                    </p>
                  </div>
                ) : (
                  <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mb-3">
                    <p className="text-xs text-yellow-800 font-medium">
                      Difference: {formatAmount(Math.abs(getSelectedTotal() - Math.abs(selectedStatement.amount)))}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleMultiReconcile}
                    disabled={reconciling}
                    variant="primary"
                    className="flex-1"
                  >
                    {reconciling ? 'Reconciling...' : 'Reconcile Selected'}
                  </Button>
                  <Button
                    onClick={() => setSelectedTransactions([])}
                    variant="secondary"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}

            {/* Show All Unreconciled Transactions */}
            {showAllUnreconciled && (() => {
              const filteredAllTransactions = filterTransactions(availableTransactions);
              return (
                <div className="border border-purple-200 rounded-lg overflow-hidden">
                  <div className="bg-purple-50 px-4 py-2 border-b border-purple-200">
                    <h4 className="text-sm font-semibold text-purple-900">
                      All Unreconciled Transactions ({filteredAllTransactions.length}{availableTransactions.length !== filteredAllTransactions.length ? ` of ${availableTransactions.length}` : ''})
                    </h4>
                    <p className="text-xs text-purple-700 mt-1">
                      Showing all unreconciled transactions for manual selection
                    </p>
                  </div>

                  {filteredAllTransactions.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-gray-700 mb-4">
                        {availableTransactions.length === 0 ? 'No available transactions found' : 'No transactions match your filters'}
                      </p>
                      <p className="text-sm text-gray-600 mb-4">
                        {availableTransactions.length === 0
                          ? 'All transactions for this account type have been reconciled'
                          : 'Try adjusting your filters or clear them to see all available transactions'}
                      </p>
                      <Button variant="primary" onClick={handleCreateNewTransaction}>
                        Go to Transactions Page
                      </Button>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto divide-y divide-gray-200">
                      {filteredAllTransactions.map((transaction) => {
                        const isSelected = selectedTransactions.some(t => t.id === transaction.id);

                        return (
                          <div key={transaction.id} className="p-4 bg-white hover:bg-purple-50">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleTransactionToggle(transaction)}
                                className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                              />
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  {renderTransactionDetails(transaction)}
                                  <div className="text-right ml-4">
                                    <div className="font-bold text-gray-900">
                                      {formatAmount(transaction.amount)}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {transaction.transactionType}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Exact Matches */}
            {!showAllUnreconciled && matches?.exactMatches && matches.exactMatches.length > 0 && (() => {
              const filteredExactMatches = filterTransactions(matches.exactMatches);
              return filteredExactMatches.length > 0 ? (
                <div className="border border-green-200 rounded-lg overflow-hidden">
                  <div className="bg-green-50 px-4 py-2 border-b border-green-200">
                    <h4 className="text-sm font-semibold text-green-900">
                      Exact Matches ({filteredExactMatches.length}{matches.exactMatches.length !== filteredExactMatches.length ? ` of ${matches.exactMatches.length}` : ''})
                    </h4>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {filteredExactMatches.map((transaction) => {
                    const isSelected = selectedTransactions.some(t => t.id === transaction.id);

                    return (
                      <div key={transaction.id} className="p-4 bg-white hover:bg-green-50">
                        <div className="flex items-start gap-3 mb-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleTransactionToggle(transaction)}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              {renderTransactionDetails(transaction)}
                              <div className="text-right ml-4">
                                <div className="font-bold text-gray-900">
                                  {formatAmount(transaction.amount)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {transaction.transactionType}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleSingleReconcile(selectedStatement, [transaction])}
                          disabled={reconciling}
                          variant="primary"
                          className="w-full"
                        >
                          {reconciling ? 'Reconciling...' : 'Reconcile'}
                        </Button>
                      </div>
                    );
                  })}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Fuzzy Matches */}
            {!showAllUnreconciled && matches?.fuzzyMatches && matches.fuzzyMatches.length > 0 && (() => {
              const filteredFuzzyMatches = filterTransactions(matches.fuzzyMatches);
              return filteredFuzzyMatches.length > 0 ? (
                <div className="border border-yellow-200 rounded-lg overflow-hidden">
                  <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-200">
                    <h4 className="text-sm font-semibold text-yellow-900">
                      Potential Matches ({filteredFuzzyMatches.length}{matches.fuzzyMatches.length !== filteredFuzzyMatches.length ? ` of ${matches.fuzzyMatches.length}` : ''})
                  </h4>
                    <p className="text-xs text-yellow-700 mt-1">
                      Same account and amount, any date
                    </p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {filteredFuzzyMatches.map((transaction) => {
                    const isSelected = selectedTransactions.some(t => t.id === transaction.id);

                    return (
                      <div key={transaction.id} className="p-4 bg-white hover:bg-yellow-50">
                        <div className="flex items-start gap-3 mb-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleTransactionToggle(transaction)}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              {renderTransactionDetails(transaction)}
                              <div className="text-right ml-4">
                                <div className="font-bold text-gray-900">
                                  {formatAmount(transaction.amount)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {transaction.transactionType}
                                </div>
                                {transaction.matchScore && transaction.matchScore > 0 && (
                                  <div className="text-xs text-yellow-600 mt-1 font-medium">
                                    {transaction.matchScore}% match
                                  </div>
                                )}
                                {transaction.matchedField && (
                                  <div className="text-xs text-yellow-500 mt-0.5 italic">
                                    "{transaction.matchedField}"
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleSingleReconcile(selectedStatement, [transaction])}
                          disabled={reconciling}
                          variant="secondary"
                          className="w-full"
                        >
                          {reconciling ? 'Reconciling...' : 'Review & Reconcile'}
                        </Button>
                      </div>
                    );
                  })}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Amount-Based Matches */}
            {!showAllUnreconciled && matches?.amountMatches && matches.amountMatches.length > 0 && (() => {
              const filteredAmountMatches = filterTransactions(matches.amountMatches);
              return filteredAmountMatches.length > 0 ? (
                <div className="border border-blue-200 rounded-lg overflow-hidden">
                  <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-900">
                      Amount-Based Matches ({filteredAmountMatches.length}{matches.amountMatches.length !== filteredAmountMatches.length ? ` of ${matches.amountMatches.length}` : ''})
                    </h4>
                    <p className="text-xs text-blue-700 mt-1">
                      Same account and amount, any date
                    </p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {filteredAmountMatches.map((transaction) => {
                      const isSelected = selectedTransactions.some(t => t.id === transaction.id);

                      return (
                        <div key={transaction.id} className="p-4 bg-white hover:bg-blue-50">
                          <div className="flex items-start gap-3 mb-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleTransactionToggle(transaction)}
                              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                {renderTransactionDetails(transaction)}
                                <div className="text-right ml-4">
                                  <div className="font-bold text-gray-900">
                                    {formatAmount(transaction.amount)}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {transaction.transactionType}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => onReconcile(selectedStatement, [transaction])}
                            disabled={reconciling}
                            variant="secondary"
                            className="w-full"
                          >
                            {reconciling ? 'Reconciling...' : 'Review & Reconcile'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Comment-Based Matches */}
            {!showAllUnreconciled && matches?.commentMatches && matches.commentMatches.length > 0 && selectedStatement?.comment && (() => {
              const filteredCommentMatches = filterTransactions(matches.commentMatches);
              return filteredCommentMatches.length > 0 ? (
                <div className="border border-indigo-200 rounded-lg overflow-hidden">
                  <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-200">
                    <h4 className="text-sm font-semibold text-indigo-900">
                      Comment-Based Matches ({filteredCommentMatches.length}{matches.commentMatches.length !== filteredCommentMatches.length ? ` of ${matches.commentMatches.length}` : ''})
                    </h4>
                    <p className="text-xs text-indigo-700 mt-1">
                      Matched by comment: "{selectedStatement.comment}"
                    </p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {filteredCommentMatches.map((transaction) => {
                      const isSelected = selectedTransactions.some(t => t.id === transaction.id);

                      return (
                        <div key={transaction.id} className="p-4 bg-white hover:bg-indigo-50">
                          <div className="flex items-start gap-3 mb-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleTransactionToggle(transaction)}
                              className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                {renderTransactionDetails(transaction)}
                                <div className="text-right ml-4">
                                  <div className="font-bold text-gray-900">
                                    {formatAmount(transaction.amount)}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {transaction.transactionType}
                                  </div>
                                  {transaction.matchScore && (
                                    <div className="text-xs text-indigo-600 mt-1 font-medium">
                                      {transaction.matchScore}% match
                                    </div>
                                  )}
                                  {transaction.matchedField && (
                                    <div className="text-xs text-indigo-500 mt-0.5 italic">
                                      "{transaction.matchedField}"
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleSingleReconcile(selectedStatement, [transaction])}
                            disabled={reconciling}
                            variant="secondary"
                            className="w-full"
                          >
                            {reconciling ? 'Reconciling...' : 'Review & Reconcile'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null;
            })()}

            {/* No Matches - Show All Available Transactions for Manual Selection */}
            {!showAllUnreconciled && matches && matches.exactMatches.length === 0 && matches.fuzzyMatches.length === 0 && (!matches.amountMatches || matches.amountMatches.length === 0) && (!matches.commentMatches || matches.commentMatches.length === 0) && (() => {
              const filteredAvailableTransactions = filterTransactions(availableTransactions);
              return (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900">
                      No Automatic Matches Found
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Select transactions manually to reconcile {availableTransactions.length !== filteredAvailableTransactions.length && `(${filteredAvailableTransactions.length} of ${availableTransactions.length} shown)`}
                    </p>
                  </div>

                  {filteredAvailableTransactions.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-gray-700 mb-4">
                        {availableTransactions.length === 0 ? 'No available transactions found' : 'No transactions match your filters'}
                      </p>
                      <p className="text-sm text-gray-600 mb-4">
                        {availableTransactions.length === 0
                          ? 'All transactions for this account type have been reconciled'
                          : 'Try adjusting your filters or clear them to see all available transactions'}
                      </p>
                      <Button variant="primary" onClick={handleCreateNewTransaction}>
                        Go to Transactions Page
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="max-h-96 overflow-y-auto divide-y divide-gray-200">
                        {filteredAvailableTransactions.map((transaction) => {
                        const isSelected = selectedTransactions.some(t => t.id === transaction.id);

                        return (
                          <div key={transaction.id} className="p-4 bg-white hover:bg-gray-50">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleTransactionToggle(transaction)}
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  {renderTransactionDetails(transaction)}
                                  <div className="text-right ml-4">
                                    <div className="font-bold text-gray-900">
                                      {formatAmount(transaction.amount)}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      {transaction.transactionType}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {selectedTransactions.length === 0 && (
                      <div className="bg-blue-50 p-4 border-t border-blue-200">
                        <p className="text-sm text-blue-800 text-center">
                          ℹ️ Select one or more transactions above to reconcile, or create a new transaction
                        </p>
                        <div className="mt-3 text-center">
                          <Button variant="secondary" onClick={handleCreateNewTransaction}>
                            Go to Transactions Page
                          </Button>
                        </div>
                      </div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReconciliationView;
