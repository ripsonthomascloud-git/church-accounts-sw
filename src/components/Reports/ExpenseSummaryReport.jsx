import { useState, useMemo } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import { useBudgets } from '../../hooks/useBudgets';
import Button from '../common/Button';

const ExpenseSummaryReport = ({ accountType = null }) => {
  const { transactions: expenseTransactions } = useTransactions('expenses');
  const { budgets } = useBudgets('expense');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Filter and group expenses by category and subcategory
  const groupedExpenses = useMemo(() => {
    const filtered = expenseTransactions.filter(t => {
      const dateMatch = (!dateFrom || t.date >= dateFrom) && (!dateTo || t.date <= dateTo);
      const accountTypeMatch = !accountType || t.accountType === accountType;
      return dateMatch && accountTypeMatch;
    });

    const grouped = {};
    let grandTotal = 0;

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
      grandTotal += amount;
    });

    return { grouped, grandTotal, transactionCount: filtered.length };
  }, [expenseTransactions, dateFrom, dateTo]);

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
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Expense Summary Report{accountType ? ` - ${accountType} Account` : ''}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
          <p className="text-sm text-gray-600 mb-4">
            Showing expenses from {new Date(dateFrom).toLocaleDateString()} to {new Date(dateTo).toLocaleDateString()}
          </p>
        )}

        <div className="mb-4 bg-blue-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{groupedExpenses.transactionCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Grand Total</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(groupedExpenses.grandTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      {Object.keys(groupedExpenses.grouped).length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-500">
          No expense transactions found for the selected date range
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedExpenses.grouped)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([category, categoryData]) => (
              <div key={category} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4 border-b-2 border-gray-300 pb-2">
                  <h3 className="text-xl font-bold text-gray-900">{category}</h3>
                  <span className="text-lg font-semibold text-red-600">
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
                          <tr key={subCategory} className="border-b border-gray-100 hover:bg-gray-50">
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
                        {((categoryData.total / groupedExpenses.grandTotal) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}

          <div className="bg-gray-100 p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-900">Grand Total</h3>
              <span className="text-2xl font-bold text-red-600">
                {formatCurrency(groupedExpenses.grandTotal)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseSummaryReport;
