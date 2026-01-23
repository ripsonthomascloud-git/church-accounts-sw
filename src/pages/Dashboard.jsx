import { useState, useMemo } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { useOpeningBalance } from '../hooks/useOpeningBalance';

const Dashboard = () => {
  const { transactions: incomeTransactions, loading: incomeLoading } = useTransactions('income');
  const { transactions: expenseTransactions, loading: expenseLoading } = useTransactions('expenses');
  const { getOpeningBalanceForYear, setOpeningBalanceForYear, loading: balanceLoading } = useOpeningBalance();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [editBalanceAmount, setEditBalanceAmount] = useState('');
  const [editBalanceAccountType, setEditBalanceAccountType] = useState(null);

  // Get all available years from transactions
  const availableYears = useMemo(() => {
    const allTransactions = [...incomeTransactions, ...expenseTransactions];
    const years = new Set();

    allTransactions.forEach(transaction => {
      const date = transaction.date?.toDate ? transaction.date.toDate() : new Date(transaction.date);
      if (date && !isNaN(date)) {
        years.add(date.getFullYear());
      }
    });

    const yearsArray = Array.from(years).sort((a, b) => b - a);
    return yearsArray.length > 0 ? yearsArray : [currentYear];
  }, [incomeTransactions, expenseTransactions, currentYear]);

  // Filter transactions by selected year
  const filterByYear = (transactions, year) => {
    return transactions.filter(transaction => {
      const date = transaction.date?.toDate ? transaction.date.toDate() : new Date(transaction.date);
      return date && date.getFullYear() === year;
    });
  };

  const filteredIncomeTransactions = useMemo(
    () => filterByYear(incomeTransactions, selectedYear),
    [incomeTransactions, selectedYear]
  );

  const filteredExpenseTransactions = useMemo(
    () => filterByYear(expenseTransactions, selectedYear),
    [expenseTransactions, selectedYear]
  );

  // Filter transactions by account type
  const operatingIncomeTransactions = filteredIncomeTransactions.filter(t => t.accountType === 'Operating');
  const buildingIncomeTransactions = filteredIncomeTransactions.filter(t => t.accountType === 'Building');
  const operatingExpenseTransactions = filteredExpenseTransactions.filter(t => t.accountType === 'Operating');
  const buildingExpenseTransactions = filteredExpenseTransactions.filter(t => t.accountType === 'Building');

  // Calculate totals for Operating account
  const openingBalanceOperating = getOpeningBalanceForYear(selectedYear, 'Operating');
  const totalIncomeOperating = operatingIncomeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpensesOperating = operatingExpenseTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const netBalanceOperating = openingBalanceOperating + totalIncomeOperating - totalExpensesOperating;

  // Calculate totals for Building account
  const openingBalanceBuilding = getOpeningBalanceForYear(selectedYear, 'Building');
  const totalIncomeBuilding = buildingIncomeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpensesBuilding = buildingExpenseTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const netBalanceBuilding = openingBalanceBuilding + totalIncomeBuilding - totalExpensesBuilding;

  // Legacy calculations (for backward compatibility with existing data without accountType)
  const legacyIncomeTransactions = filteredIncomeTransactions.filter(t => !t.accountType);
  const legacyExpenseTransactions = filteredExpenseTransactions.filter(t => !t.accountType);
  const openingBalance = getOpeningBalanceForYear(selectedYear);
  const totalIncome = filteredIncomeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpenses = filteredExpenseTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const netBalance = openingBalance + totalIncome - totalExpenses;

  const recentTransactions = [...filteredIncomeTransactions, ...filteredExpenseTransactions]
    .sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      return dateB - dateA;
    })
    .slice(0, 5);

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    if (date.toDate) {
      return date.toDate().toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };

  const handleEditBalance = (accountType = null) => {
    const balance = accountType === 'Operating' ? openingBalanceOperating :
                    accountType === 'Building' ? openingBalanceBuilding :
                    openingBalance;
    setEditBalanceAmount(balance.toString());
    setEditBalanceAccountType(accountType);
    setIsEditingBalance(true);
  };

  const handleSaveBalance = async () => {
    try {
      await setOpeningBalanceForYear(selectedYear, editBalanceAmount, editBalanceAccountType);
      setIsEditingBalance(false);
      setEditBalanceAmount('');
      setEditBalanceAccountType(null);
    } catch (error) {
      alert('Error saving opening balance: ' + error.message);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingBalance(false);
    setEditBalanceAmount('');
    setEditBalanceAccountType(null);
  };

  if (incomeLoading || expenseLoading || balanceLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-3">
          <label htmlFor="year-select" className="text-sm font-medium text-gray-700">
            Select Year:
          </label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-8">
        {/* Operating Account Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Operating Account</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-gray-600 text-sm font-medium">Opening Balance ({selectedYear})</h3>
                <button
                  onClick={() => handleEditBalance('Operating')}
                  className="text-purple-600 hover:text-purple-800 text-xs font-medium"
                >
                  Edit
                </button>
              </div>
              {isEditingBalance && editBalanceAccountType === 'Operating' ? (
                <div className="space-y-2">
                  <input
                    type="number"
                    value={editBalanceAmount}
                    onChange={(e) => setEditBalanceAmount(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter amount"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveBalance}
                      className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-purple-600">{formatAmount(openingBalanceOperating)}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Starting balance
                  </p>
                </>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
              <h3 className="text-gray-600 text-sm font-medium mb-2">Total Income ({selectedYear})</h3>
              <p className="text-3xl font-bold text-green-600">{formatAmount(totalIncomeOperating)}</p>
              <p className="text-xs text-gray-500 mt-2">
                {operatingIncomeTransactions.length} transaction{operatingIncomeTransactions.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
              <h3 className="text-gray-600 text-sm font-medium mb-2">Total Expenses ({selectedYear})</h3>
              <p className="text-3xl font-bold text-red-600">{formatAmount(totalExpensesOperating)}</p>
              <p className="text-xs text-gray-500 mt-2">
                {operatingExpenseTransactions.length} transaction{operatingExpenseTransactions.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${
              netBalanceOperating >= 0 ? 'border-blue-500' : 'border-orange-500'
            }`}>
              <h3 className="text-gray-600 text-sm font-medium mb-2">Net Balance ({selectedYear})</h3>
              <p className={`text-3xl font-bold ${
                netBalanceOperating >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`}>
                {formatAmount(netBalanceOperating)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Opening + Income - Expenses
              </p>
            </div>
          </div>
        </div>

        {/* Building Account Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Building Account</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-gray-600 text-sm font-medium">Opening Balance ({selectedYear})</h3>
                <button
                  onClick={() => handleEditBalance('Building')}
                  className="text-purple-600 hover:text-purple-800 text-xs font-medium"
                >
                  Edit
                </button>
              </div>
              {isEditingBalance && editBalanceAccountType === 'Building' ? (
                <div className="space-y-2">
                  <input
                    type="number"
                    value={editBalanceAmount}
                    onChange={(e) => setEditBalanceAmount(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter amount"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveBalance}
                      className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-purple-600">{formatAmount(openingBalanceBuilding)}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Starting balance
                  </p>
                </>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
              <h3 className="text-gray-600 text-sm font-medium mb-2">Total Income ({selectedYear})</h3>
              <p className="text-3xl font-bold text-green-600">{formatAmount(totalIncomeBuilding)}</p>
              <p className="text-xs text-gray-500 mt-2">
                {buildingIncomeTransactions.length} transaction{buildingIncomeTransactions.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
              <h3 className="text-gray-600 text-sm font-medium mb-2">Total Expenses ({selectedYear})</h3>
              <p className="text-3xl font-bold text-red-600">{formatAmount(totalExpensesBuilding)}</p>
              <p className="text-xs text-gray-500 mt-2">
                {buildingExpenseTransactions.length} transaction{buildingExpenseTransactions.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${
              netBalanceBuilding >= 0 ? 'border-blue-500' : 'border-orange-500'
            }`}>
              <h3 className="text-gray-600 text-sm font-medium mb-2">Net Balance ({selectedYear})</h3>
              <p className={`text-3xl font-bold ${
                netBalanceBuilding >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`}>
                {formatAmount(netBalanceBuilding)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Opening + Income - Expenses
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Transactions ({selectedYear})</h2>
        {recentTransactions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No transactions for {selectedYear}</p>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((transaction) => {
              const isIncome = filteredIncomeTransactions.some(t => t.id === transaction.id);
              const personName = isIncome ? transaction.memberName : transaction.payeeName;
              return (
                <div
                  key={transaction.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    isIncome ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">
                          {transaction.category}
                          {transaction.subCategory && (
                            <span className="text-gray-600"> / {transaction.subCategory}</span>
                          )}
                        </p>
                      </div>
                      {personName && (
                        <p className="text-sm font-medium text-gray-700">
                          {isIncome ? 'Member' : 'Payee'}: {personName}
                        </p>
                      )}
                      {transaction.description && (
                        <p className="text-sm text-gray-600">{transaction.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">{formatDate(transaction.date)}</p>
                    </div>
                    <span className={`text-lg font-bold ml-4 ${
                      isIncome ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isIncome ? '+' : '-'}{formatAmount(transaction.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
