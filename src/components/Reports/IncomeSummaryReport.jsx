import { useState, useMemo } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import { useOpeningBalance } from '../../hooks/useOpeningBalance';
import { useBudgets } from '../../hooks/useBudgets';
import Button from '../common/Button';

const IncomeSummaryReport = ({ accountType = null }) => {
  const { transactions: incomeTransactions } = useTransactions('income');
  const { getOpeningBalanceForYear } = useOpeningBalance();
  const { budgets } = useBudgets('income');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Filter and group income by category and subcategory
  const groupedIncome = useMemo(() => {
    const filtered = incomeTransactions.filter(t => {
      const dateMatch = (!dateFrom || t.date >= dateFrom) && (!dateTo || t.date <= dateTo);
      const accountTypeMatch = !accountType || t.accountType === accountType;
      return dateMatch && accountTypeMatch;
    });

    const grouped = {};
    let totalIncome = 0;

    filtered.forEach(transaction => {
      const category = transaction.category || 'Uncategorized';
      const subCategory = transaction.subCategory || 'General';

      if (!grouped[category]) {
        grouped[category] = {
          total: 0,
          subCategories: {}
        };
      }

      if (!grouped[category].subCategories[subCategory]) {
        grouped[category].subCategories[subCategory] = {
          total: 0,
          transactions: []
        };
      }

      const amount = parseFloat(transaction.amount || 0);
      grouped[category].subCategories[subCategory].total += amount;
      grouped[category].subCategories[subCategory].transactions.push(transaction);
      grouped[category].total += amount;
      totalIncome += amount;
    });

    // Get the year from dateFrom, or use current year if not set
    const year = dateFrom ? new Date(dateFrom).getFullYear() : new Date().getFullYear();
    const openingBalance = getOpeningBalanceForYear(year, accountType);
    const grandTotal = openingBalance + totalIncome;

    return {
      grouped,
      totalIncome,
      openingBalance,
      grandTotal,
      transactionCount: filtered.length
    };
  }, [incomeTransactions, dateFrom, dateTo, getOpeningBalanceForYear]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getBudgetAmount = (category, subCategory) => {
    const year = dateFrom ? new Date(dateFrom).getFullYear() : new Date().getFullYear();
    const budget = budgets.find(
      b => b.year === year &&
           b.category === category &&
           b.subCategory === subCategory
    );
    return budget ? budget.amount : null;
  };

  const calculateVariance = (budgetAmount, actualAmount) => {
    if (budgetAmount === null) return null;
    return budgetAmount - actualAmount;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print-only header */}
      <div className="hidden print:block text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Income Summary Report{accountType ? ` - ${accountType} Account` : ''}
        </h1>
        <p className="text-lg text-gray-600">
          As of {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
        {dateFrom && dateTo && (
          <p className="text-md text-gray-600 mt-2">
            Period: {new Date(dateFrom).toLocaleDateString()} to {new Date(dateTo).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 print:hidden">
          Income Summary Report{accountType ? ` - ${accountType} Account` : ''}
        </h2>

        {/* Hide filter controls when printing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:hidden">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handlePrint} variant="secondary">
              Print Report
            </Button>
          </div>
        </div>

        {dateFrom && dateTo && (
          <p className="text-sm text-gray-600 mb-4 print:hidden">
            Showing income from {new Date(dateFrom).toLocaleDateString()} to {new Date(dateTo).toLocaleDateString()}
          </p>
        )}

        <div className="mb-4 bg-green-50 p-4 rounded-lg print:bg-white print:border print:border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{groupedIncome.transactionCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(groupedIncome.totalIncome)}</p>
            </div>
          </div>
        </div>
      </div>

      {Object.keys(groupedIncome.grouped).length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-500 print:shadow-none">
          No income transactions found for the selected date range
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedIncome.grouped)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([category, categoryData]) => (
              <div key={category} className="bg-white p-6 rounded-lg shadow-md print:shadow-none print:border print:border-gray-300 print:mb-6">
                <div className="flex justify-between items-center mb-4 border-b-2 border-gray-300 pb-2">
                  <h3 className="text-xl font-bold text-gray-900">{category}</h3>
                  <span className="text-lg font-semibold text-green-600">
                    {formatCurrency(categoryData.total)}
                  </span>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-4 text-sm font-medium text-gray-600">Sub Category</th>
                      <th className="text-right py-2 px-4 text-sm font-medium text-gray-600">Transactions</th>
                      <th className="text-right py-2 px-4 text-sm font-medium text-gray-600">Amount</th>
                      <th className="text-right py-2 px-4 text-sm font-medium text-gray-600">Budget</th>
                      <th className="text-right py-2 px-4 text-sm font-medium text-gray-600">Variance</th>
                      <th className="text-right py-2 px-4 text-sm font-medium text-gray-600">% of Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(categoryData.subCategories)
                      .sort(([, a], [, b]) => b.total - a.total)
                      .map(([subCategory, subData]) => {
                        const budgetAmount = getBudgetAmount(category, subCategory);
                        const variance = calculateVariance(budgetAmount, subData.total);

                        return (
                          <tr key={subCategory} className="border-b border-gray-100 hover:bg-gray-50 print:hover:bg-white">
                            <td className="py-2 px-4">{subCategory}</td>
                            <td className="text-right py-2 px-4">{subData.transactions.length}</td>
                            <td className="text-right py-2 px-4">{formatCurrency(subData.total)}</td>
                            <td className="text-right py-2 px-4">
                              {budgetAmount !== null ? formatCurrency(budgetAmount) : <span className="text-gray-400">—</span>}
                            </td>
                            <td className={`text-right py-2 px-4 ${
                              variance === null ? 'text-gray-400' :
                              variance >= 0 ? 'text-green-600 font-semibold' :
                              'text-red-600 font-semibold'
                            }`}>
                              {variance !== null ? formatCurrency(variance) : '—'}
                            </td>
                            <td className="text-right py-2 px-4">
                              {((subData.total / categoryData.total) * 100).toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 font-bold">
                      <td className="py-2 px-4">Category Total</td>
                      <td className="text-right py-2 px-4">
                        {Object.values(categoryData.subCategories).reduce(
                          (sum, sub) => sum + sub.transactions.length,
                          0
                        )}
                      </td>
                      <td className="text-right py-2 px-4">{formatCurrency(categoryData.total)}</td>
                      <td className="text-right py-2 px-4"></td>
                      <td className="text-right py-2 px-4"></td>
                      <td className="text-right py-2 px-4">
                        {((categoryData.total / groupedIncome.totalIncome) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}

          <div className="bg-gray-100 p-6 rounded-lg shadow-md space-y-4 print:shadow-none print:border print:border-gray-300 print:bg-white print:mt-6">
            <div className="flex justify-between items-center border-b border-gray-300 pb-3">
              <h3 className="text-lg font-semibold text-gray-700">Opening Balance</h3>
              <span className="text-lg font-semibold text-purple-600">
                {formatCurrency(groupedIncome.openingBalance)}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-300 pb-3">
              <h3 className="text-lg font-semibold text-gray-700">Total Income</h3>
              <span className="text-lg font-semibold text-green-600">
                {formatCurrency(groupedIncome.totalIncome)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <h3 className="text-2xl font-bold text-gray-900">Grand Total</h3>
              <span className="text-2xl font-bold text-blue-600">
                {formatCurrency(groupedIncome.grandTotal)}
              </span>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              Grand Total = Opening Balance + Total Income
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomeSummaryReport;
