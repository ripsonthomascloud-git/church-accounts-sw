import { useState } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useMembers } from '../hooks/useMembers';
import { usePayees } from '../hooks/usePayees';
import { useOpeningBalance } from '../hooks/useOpeningBalance';
import { useBankStatements } from '../hooks/useBankStatements';
import AddIncome from '../components/Transactions/AddIncome';
import AddExpense from '../components/Transactions/AddExpense';
import TransactionList from '../components/Transactions/TransactionList';
import StatementView from '../components/Transactions/StatementView';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';

const Transactions = () => {
  const [activeTab, setActiveTab] = useState('income');
  const [showAddModal, setShowAddModal] = useState(false);

  const { members } = useMembers();
  const { payees } = usePayees();
  const { openingBalances } = useOpeningBalance();
  const { bankStatements } = useBankStatements();
  const { categories: incomeCategories } = useCategories('income');
  const { categories: expenseCategories } = useCategories('expense');

  const {
    transactions: incomeTransactions,
    loading: incomeLoading,
    addTransaction: addIncome,
    updateTransaction: updateIncome,
    deleteTransaction: deleteIncome,
    refreshTransactions: refreshIncome,
  } = useTransactions('income');

  const {
    transactions: expenseTransactions,
    loading: expenseLoading,
    addTransaction: addExpense,
    updateTransaction: updateExpense,
    deleteTransaction: deleteExpense,
    refreshTransactions: refreshExpenses,
  } = useTransactions('expenses');

  // Get the date of the most recent saved transaction as YYYY-MM-DD, falling back to today
  const getLastDate = (transactions) => {
    if (!transactions || transactions.length === 0) return null;
    const sorted = [...transactions].sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateB - dateA;
    });
    const d = sorted[0].date?.toDate ? sorted[0].date.toDate() : new Date(sorted[0].date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleAddTransaction = async (transactionData) => {
    const items = Array.isArray(transactionData) ? transactionData : [transactionData];
    if (activeTab === 'income') {
      for (const item of items) await addIncome(item);
      await refreshIncome();
    } else {
      for (const item of items) await addExpense(item);
      await refreshExpenses();
    }
    setShowAddModal(false);
  };

  const loading = activeTab === 'income' ? incomeLoading : expenseLoading;
  const isStatementTab = activeTab === 'statement';

  return (
    <div className="space-y-4 max-w-[1400px]">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
        {!isStatementTab && (
          <Button onClick={() => setShowAddModal(true)}>
            Add {activeTab === 'income' ? 'Income' : 'Expense'}
          </Button>
        )}
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('income')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'income'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Income
          </button>
          <button
            onClick={() => setActiveTab('expense')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'expense'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveTab('statement')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'statement'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Statement
          </button>
        </nav>
      </div>

      {/* Income tab — always mounted to preserve TransactionList filter state */}
      <div className={activeTab === 'income' ? '' : 'hidden'}>
        {incomeLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-xl text-gray-600">Loading transactions...</div>
          </div>
        ) : (
          <TransactionList
            transactions={incomeTransactions}
            onDelete={deleteIncome}
            onEdit={updateIncome}
            type="income"
            members={members}
            categories={incomeCategories}
          />
        )}
      </div>

      {/* Expense tab — always mounted to preserve TransactionList filter state */}
      <div className={activeTab === 'expense' ? '' : 'hidden'}>
        {expenseLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-xl text-gray-600">Loading transactions...</div>
          </div>
        ) : (
          <TransactionList
            transactions={expenseTransactions}
            onDelete={deleteExpense}
            onEdit={updateExpense}
            type="expense"
            members={members}
            categories={expenseCategories}
          />
        )}
      </div>

      {/* Statement tab — always mounted so filters survive tab switches and refresh.
          StatementView stays mounted even while data is refreshing so filter state is never lost. */}
      <div className={activeTab === 'statement' ? '' : 'hidden'}>
        <StatementView
          incomeTransactions={incomeTransactions}
          expenseTransactions={expenseTransactions}
          openingBalances={openingBalances}
          bankStatements={bankStatements}
          onRefresh={async () => { await Promise.all([refreshIncome(), refreshExpenses()]); }}
          isLoading={incomeLoading || expenseLoading}
          onUpdateTransaction={async (row, data) => {
            if (row.txType === 'income') await updateIncome(row.id, { ...row, date: row.date?.toDate ? row.date.toDate().toISOString().split('T')[0] : row.date, ...data });
            else await updateExpense(row.id, { ...row, date: row.date?.toDate ? row.date.toDate().toISOString().split('T')[0] : row.date, ...data });
          }}
        />
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={`Add ${activeTab === 'income' ? 'Income' : 'Expense'}`}
      >
        {activeTab === 'income' ? (
          <AddIncome
            onAdd={handleAddTransaction}
            onCancel={() => setShowAddModal(false)}
            categories={incomeCategories}
            members={members}
            lastDate={getLastDate(incomeTransactions)}
          />
        ) : (
          <AddExpense
            onAdd={handleAddTransaction}
            onCancel={() => setShowAddModal(false)}
            categories={expenseCategories}
            payees={payees}
            expenseTransactions={expenseTransactions}
            lastDate={getLastDate(expenseTransactions)}
          />
        )}
      </Modal>
    </div>
  );
};

export default Transactions;
