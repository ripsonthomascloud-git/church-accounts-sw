import { useState, useEffect } from 'react';
import { useBankStatements } from '../hooks/useBankStatements';
import { useTransactions } from '../hooks/useTransactions';
import { useReconciliation } from '../hooks/useReconciliation';
import { getDocuments, deleteDocument } from '../services/firebase';
import { importBankStatementsFromFile } from '../services/bankStatementService';
import { getReconciliationStats } from '../utils/reconciliationMatcher';
import ImportBankStatements from '../components/BankStatements/ImportBankStatements';
import BankStatementList from '../components/BankStatements/BankStatementList';
import ReconciliationView from '../components/BankStatements/ReconciliationView';

const BankStatements = () => {
  const [activeTab, setActiveTab] = useState('statements');
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [importSuccess, setImportSuccess] = useState(null);
  const [importError, setImportError] = useState(null);
  const [reconcileSuccess, setReconcileSuccess] = useState(null);
  const [members, setMembers] = useState([]);
  const [errorRecords, setErrorRecords] = useState([]);

  // Format date without timezone issues
  const formatDate = (date) => {
    if (!date) return 'N/A';

    let jsDate;
    if (date.toDate) {
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

  const { bankStatements, loading, error, refreshBankStatements } = useBankStatements();
  const {
    transactions: incomeTransactions,
    loading: loadingIncome,
    refreshTransactions: refreshIncomeTransactions
  } = useTransactions('income');
  const {
    transactions: expenseTransactions,
    loading: loadingExpenses,
    refreshTransactions: refreshExpenseTransactions
  } = useTransactions('expenses');

  // Fetch members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const membersData = await getDocuments('members');
        setMembers(membersData);
      } catch (err) {
        console.error('Error fetching members:', err);
      }
    };
    fetchMembers();
  }, []);

  const {
    reconcile,
    unreconcile,
    getMatches,
    reconciling,
    error: reconcileError
  } = useReconciliation(bankStatements, incomeTransactions, expenseTransactions, members);

  const matches = selectedStatement ? getMatches(selectedStatement, members) : null;

  const handleImport = async (file, accountType) => {
    try {
      setImportError(null);
      setImportSuccess(null);
      setErrorRecords([]);

      const result = await importBankStatementsFromFile(file, accountType);

      if (result.success) {
        await refreshBankStatements();
        const messages = [];
        if (result.results.created > 0) {
          messages.push(`${result.results.created} statement${result.results.created > 1 ? 's' : ''} imported`);
        }
        if (result.results.errors && result.results.errors.length > 0) {
          messages.push(`${result.results.errors.length} failed`);
          setErrorRecords(result.results.errors);
        }

        const message = messages.length > 0
          ? `${messages.join(', ')}.`
          : 'No statements to import.';

        setImportSuccess(message);
        setActiveTab('statements');

        // Clear success message after 5 seconds
        setTimeout(() => setImportSuccess(null), 5000);
      } else {
        setImportError(result.error);
      }
    } catch (err) {
      setImportError(`Import failed: ${err.message}`);
    }
  };

  const handleSelectStatement = (statement) => {
    setSelectedStatement(statement);
  };

  const handleReconcile = async (bankStatement, transactions) => {
    try {
      setReconcileSuccess(null);
      setImportError(null);

      // Support both single transaction and array of transactions
      const transactionArray = Array.isArray(transactions) ? transactions : [transactions];

      // Find the next unreconciled statement ID before reconciling
      const unreconciledStatements = bankStatements.filter(s => !s.isReconciled && !s.isExcluded);
      const currentIndex = unreconciledStatements.findIndex(s => s.id === bankStatement.id);
      const nextStatementId = currentIndex >= 0 && currentIndex < unreconciledStatements.length - 1
        ? unreconciledStatements[currentIndex + 1].id
        : null;

      await reconcile(bankStatement, transactionArray);

      // Refresh data to get updated statements and transactions
      const updatedStatements = await refreshBankStatements();
      await refreshIncomeTransactions();
      await refreshExpenseTransactions();

      const count = transactionArray.length;
      setReconcileSuccess(
        `Successfully reconciled bank statement with ${count} transaction${count > 1 ? 's' : ''}.`
      );

      // Auto-select the next unreconciled statement using the fresh data
      if (nextStatementId && updatedStatements) {
        const nextStatement = updatedStatements.find(s => s.id === nextStatementId);
        if (nextStatement) {
          setSelectedStatement(nextStatement);
        } else {
          setSelectedStatement(null);
        }
      } else {
        setSelectedStatement(null);
      }

      // Clear success message after 5 seconds
      setTimeout(() => setReconcileSuccess(null), 5000);
    } catch (err) {
      setImportError(`Reconciliation failed: ${err.message}`);
    }
  };

  const handleUnreconcile = async (bankStatement) => {
    if (!window.confirm('Are you sure you want to unreconcile this statement?')) {
      return;
    }

    try {
      setReconcileSuccess(null);
      setImportError(null);

      await unreconcile(bankStatement);

      // Refresh data to get updated statements and transactions
      await refreshBankStatements();
      await refreshIncomeTransactions();
      await refreshExpenseTransactions();

      setReconcileSuccess('Successfully unreconciled bank statement.');

      // Clear success message after 5 seconds
      setTimeout(() => setReconcileSuccess(null), 5000);
    } catch (err) {
      setImportError(`Unreconcile failed: ${err.message}`);
    }
  };

  const handleDelete = async (bankStatement) => {
    try {
      setReconcileSuccess(null);
      setImportError(null);

      await deleteDocument('bankStatements', bankStatement.id);

      // Refresh data
      await refreshBankStatements();

      // Clear selected statement if it was deleted
      if (selectedStatement?.id === bankStatement.id) {
        setSelectedStatement(null);
      }

      setReconcileSuccess('Successfully deleted bank statement.');

      // Clear success message after 5 seconds
      setTimeout(() => setReconcileSuccess(null), 5000);
    } catch (err) {
      setImportError(`Delete failed: ${err.message}`);
    }
  };

  const stats = getReconciliationStats(bankStatements);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Bank Statements</h1>
      </div>

      {/* Statistics Cards */}
      {!loading && bankStatements.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 mb-1">Total Statements</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
            <div className="text-sm text-green-700 mb-1">Reconciled</div>
            <div className="text-2xl font-bold text-green-600">{stats.reconciled}</div>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
            <div className="text-sm text-red-700 mb-1">Unreconciled</div>
            <div className="text-2xl font-bold text-red-600">{stats.unreconciled}</div>
          </div>
          <div className="bg-gray-50 rounded-lg shadow p-4 border border-gray-200">
            <div className="text-sm text-gray-700 mb-1">Excluded</div>
            <div className="text-2xl font-bold text-gray-600">{stats.excluded || 0}</div>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4 border border-blue-200">
            <div className="text-sm text-blue-700 mb-1">Progress</div>
            <div className="text-2xl font-bold text-blue-600">{stats.percentReconciled}%</div>
          </div>
        </div>
      )}

      {importSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {importSuccess}
        </div>
      )}

      {errorRecords.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800 mb-2">
                Failed Records ({errorRecords.length})
              </h3>
              <p className="text-xs text-red-700 mb-3">
                The following records failed to import:
              </p>
              <div className="max-h-64 overflow-y-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-red-100 sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left text-red-800 font-medium">Row</th>
                      <th className="px-2 py-1 text-left text-red-800 font-medium">Date</th>
                      <th className="px-2 py-1 text-left text-red-800 font-medium">Description</th>
                      <th className="px-2 py-1 text-left text-red-800 font-medium">Type</th>
                      <th className="px-2 py-1 text-right text-red-800 font-medium">Amount</th>
                      <th className="px-2 py-1 text-left text-red-800 font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-200">
                    {errorRecords.map((record, index) => (
                      <tr key={index} className="hover:bg-red-100">
                        <td className="px-2 py-1 text-red-900 whitespace-nowrap">
                          {record.rowNumber}
                        </td>
                        <td className="px-2 py-1 text-red-900 whitespace-nowrap">
                          {formatDate(record.postingDate)}
                        </td>
                        <td className="px-2 py-1 text-red-900 max-w-xs truncate">
                          {record.description || 'N/A'}
                        </td>
                        <td className="px-2 py-1 text-red-900">
                          {record.type ? (
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              record.type === 'Debit' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {record.type}
                            </span>
                          ) : 'N/A'}
                        </td>
                        <td className="px-2 py-1 text-red-900 text-right font-medium">
                          {record.amount != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(record.amount) : 'N/A'}
                        </td>
                        <td className="px-2 py-1 text-red-900">{record.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <button
              onClick={() => setErrorRecords([])}
              className="ml-4 text-red-600 hover:text-red-800"
              title="Dismiss"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {reconcileSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {reconcileSuccess}
        </div>
      )}

      {(importError || reconcileError) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {importError || reconcileError}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading bank statements: {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('statements')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'statements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bank Statements
              {bankStatements.length > 0 && (
                <span className="ml-2 bg-gray-200 text-gray-700 py-0.5 px-2 rounded-full text-xs">
                  {bankStatements.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'import'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Import CSV
            </button>
            <button
              onClick={() => setActiveTab('reconcile')}
              className={`px-6 py-3 border-b-2 font-medium text-sm ${
                activeTab === 'reconcile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Reconcile
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'statements' && (
            <>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading bank statements...</div>
              ) : (
                <BankStatementList
                  statements={bankStatements}
                  onSelectStatement={handleSelectStatement}
                  selectedStatementId={selectedStatement?.id}
                  onDelete={handleDelete}
                  onUpdate={refreshBankStatements}
                  onUnreconcile={handleUnreconcile}
                />
              )}
            </>
          )}

          {activeTab === 'import' && (
            <ImportBankStatements
              onImport={handleImport}
              onCancel={() => setActiveTab('statements')}
            />
          )}

          {activeTab === 'reconcile' && (
            <>
              {loading || loadingIncome || loadingExpenses ? (
                <div className="text-center py-8 text-gray-500">Loading data...</div>
              ) : (
                <ReconciliationView
                  bankStatements={bankStatements}
                  selectedStatement={selectedStatement}
                  onSelectStatement={handleSelectStatement}
                  matches={matches}
                  onReconcile={handleReconcile}
                  onUnreconcile={handleUnreconcile}
                  reconciling={reconciling}
                  members={members}
                  allIncomeTransactions={incomeTransactions}
                  allExpenseTransactions={expenseTransactions}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BankStatements;
