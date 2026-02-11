import { useState, useMemo } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import { useOpeningBalance } from '../../hooks/useOpeningBalance';
import { useBudgets } from '../../hooks/useBudgets';
import Button from '../common/Button';

const ExpenseSummaryReport = ({ accountType = null }) => {
  const { transactions: expenseTransactions } = useTransactions('expenses');
  const { transactions: incomeTransactions } = useTransactions('income');
  const { getOpeningBalanceForYear } = useOpeningBalance();
  const { budgets } = useBudgets('expense');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Helper function to determine quarter from date
  const getQuarter = (dateValue) => {
    // Handle Firestore Timestamp or string date
    const date = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
    const month = date.getMonth() + 1; // 1-12
    if (month >= 1 && month <= 3) return 'qtr1';
    if (month >= 4 && month <= 6) return 'qtr2';
    if (month >= 7 && month <= 9) return 'qtr3';
    return 'qtr4';
  };

  // Filter and group expenses by category and subcategory with quarterly breakdown
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
          qtr1: 0,
          qtr2: 0,
          qtr3: 0,
          qtr4: 0,
          transactions: []
        };
      }

      const amount = parseFloat(transaction.amount || 0);
      const quarter = getQuarter(transaction.date);

      grouped[category].subCategories[subCategory].total += amount;
      grouped[category].subCategories[subCategory][quarter] += amount;
      grouped[category].subCategories[subCategory].transactions.push(transaction);
      grouped[category].total += amount;
      grandTotal += amount;
    });

    // Calculate total income for the same filters
    const filteredIncome = incomeTransactions.filter(t => {
      const dateMatch = (!dateFrom || t.date >= dateFrom) && (!dateTo || t.date <= dateTo);
      const accountTypeMatch = !accountType || t.accountType === accountType;
      return dateMatch && accountTypeMatch;
    });
    const totalIncome = filteredIncome.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    // Get the year from dateFrom, or use current year if not set
    const year = dateFrom ? new Date(dateFrom).getFullYear() : new Date().getFullYear();
    const openingBalance = getOpeningBalanceForYear(year, accountType);

    // Net Balance calculation matching Dashboard: Opening Balance + Total Income - Total Expense
    const netBalance = openingBalance + totalIncome - grandTotal;

    // Grand Total = Total Expense + Net Balance
    const finalGrandTotal = grandTotal + netBalance;

    return {
      grouped,
      grandTotal,
      totalIncome,
      openingBalance,
      netBalance,
      finalGrandTotal,
      transactionCount: filtered.length
    };
  }, [expenseTransactions, incomeTransactions, dateFrom, dateTo, accountType, getOpeningBalanceForYear]);

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

  const handleDownloadCSV = () => {
    const csvRows = [];

    // Header row
    csvRows.push([
      'Sl#',
      'Category',
      'SubCategory',
      'Budget 2026',
      'Actual Total',
      'Qtr1 (Jan-Mar)',
      'Qtr2 (Apr-Jun)',
      'Qtr3 (Jul-Sep)',
      'Qtr4 (Oct-Dec)'
    ].join(','));

    // Data rows
    let slNo = 1;
    Object.entries(groupedExpenses.grouped)
      .sort(([, a], [, b]) => b.total - a.total)
      .forEach(([category, categoryData]) => {
        Object.entries(categoryData.subCategories)
          .sort(([, a], [, b]) => b.total - a.total)
          .forEach(([subCategory, subData]) => {
            const budgetAmount = getBudgetAmount(category, subCategory);
            csvRows.push([
              slNo++,
              `"${category}"`,
              `"${subCategory}"`,
              budgetAmount !== null ? budgetAmount.toFixed(2) : '',
              subData.total.toFixed(2),
              subData.qtr1.toFixed(2),
              subData.qtr2.toFixed(2),
              subData.qtr3.toFixed(2),
              subData.qtr4.toFixed(2)
            ].join(','));
          });
      });

    // Summary rows
    csvRows.push('');
    csvRows.push([
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ].join(','));
    csvRows.push([
      '',
      '',
      '',
      'Total Expense',
      groupedExpenses.grandTotal.toFixed(2),
      '',
      '',
      '',
      ''
    ].join(','));
    csvRows.push([
      '',
      '',
      '',
      'Net Balance',
      groupedExpenses.netBalance.toFixed(2),
      '',
      '',
      '',
      '(Opening Balance + Total Income - Total Expense)'
    ].join(','));
    csvRows.push([
      '',
      '',
      '',
      'Grand Total',
      groupedExpenses.finalGrandTotal.toFixed(2),
      '',
      '',
      '',
      '(Total Expense + Net Balance)'
    ].join(','));

    // Create blob and download
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expense_summary_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Expense Summary Report{accountType ? ` - ${accountType} Account` : ''}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
          <div className="flex items-end">
            <Button onClick={handleDownloadCSV} variant="primary">
              Download CSV
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
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 py-3 px-4 text-left text-sm font-semibold text-gray-700">Sl#</th>
                  <th className="border border-gray-300 py-3 px-4 text-left text-sm font-semibold text-gray-700">Category</th>
                  <th className="border border-gray-300 py-3 px-4 text-left text-sm font-semibold text-gray-700">SubCategory</th>
                  <th className="border border-gray-300 py-3 px-4 text-right text-sm font-semibold text-gray-700">Budget 2026</th>
                  <th className="border border-gray-300 py-3 px-4 text-right text-sm font-semibold text-gray-700">Actual Total</th>
                  <th className="border border-gray-300 py-3 px-4 text-right text-sm font-semibold text-gray-700">Qtr1 (Jan-Mar)</th>
                  <th className="border border-gray-300 py-3 px-4 text-right text-sm font-semibold text-gray-700">Qtr2 (Apr-Jun)</th>
                  <th className="border border-gray-300 py-3 px-4 text-right text-sm font-semibold text-gray-700">Qtr3 (Jul-Sep)</th>
                  <th className="border border-gray-300 py-3 px-4 text-right text-sm font-semibold text-gray-700">Qtr4 (Oct-Dec)</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let slNo = 1;
                  return Object.entries(groupedExpenses.grouped)
                    .sort(([, a], [, b]) => b.total - a.total)
                    .map(([category, categoryData]) =>
                      Object.entries(categoryData.subCategories)
                        .sort(([, a], [, b]) => b.total - a.total)
                        .map(([subCategory, subData]) => {
                          const budgetAmount = getBudgetAmount(category, subCategory);
                          return (
                            <tr key={`${category}-${subCategory}`} className="hover:bg-gray-50">
                              <td className="border border-gray-300 py-2 px-4 text-center">{slNo++}</td>
                              <td className="border border-gray-300 py-2 px-4">{category}</td>
                              <td className="border border-gray-300 py-2 px-4">{subCategory}</td>
                              <td className="border border-gray-300 py-2 px-4 text-right">
                                {budgetAmount !== null ? formatCurrency(budgetAmount) : '—'}
                              </td>
                              <td className="border border-gray-300 py-2 px-4 text-right font-semibold">
                                {formatCurrency(subData.total)}
                              </td>
                              <td className="border border-gray-300 py-2 px-4 text-right">
                                {subData.qtr1 > 0 ? formatCurrency(subData.qtr1) : '—'}
                              </td>
                              <td className="border border-gray-300 py-2 px-4 text-right">
                                {subData.qtr2 > 0 ? formatCurrency(subData.qtr2) : '—'}
                              </td>
                              <td className="border border-gray-300 py-2 px-4 text-right">
                                {subData.qtr3 > 0 ? formatCurrency(subData.qtr3) : '—'}
                              </td>
                              <td className="border border-gray-300 py-2 px-4 text-right">
                                {subData.qtr4 > 0 ? formatCurrency(subData.qtr4) : '—'}
                              </td>
                            </tr>
                          );
                        })
                    );
                })()}
              </tbody>
              <tfoot>
                <tr className="bg-red-50 font-bold">
                  <td colSpan="4" className="border border-gray-300 py-3 px-4 text-right">Total Expense:</td>
                  <td className="border border-gray-300 py-3 px-4 text-right text-red-600">
                    {formatCurrency(groupedExpenses.grandTotal)}
                  </td>
                  <td colSpan="4" className="border border-gray-300 py-3 px-4"></td>
                </tr>
                <tr className="bg-green-50 font-bold">
                  <td colSpan="4" className="border border-gray-300 py-3 px-4 text-right">Net Balance:</td>
                  <td className={`border border-gray-300 py-3 px-4 text-right ${
                    groupedExpenses.netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(groupedExpenses.netBalance)}
                  </td>
                  <td colSpan="4" className="border border-gray-300 py-3 px-4 text-xs text-gray-500">
                    (Opening Balance + Total Income - Total Expense)
                  </td>
                </tr>
                <tr className="bg-blue-100 font-bold text-lg">
                  <td colSpan="4" className="border border-gray-300 py-3 px-4 text-right">Grand Total:</td>
                  <td className="border border-gray-300 py-3 px-4 text-right text-blue-700">
                    {formatCurrency(groupedExpenses.finalGrandTotal)}
                  </td>
                  <td colSpan="4" className="border border-gray-300 py-3 px-4 text-xs text-gray-500">
                    (Total Expense + Net Balance)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseSummaryReport;
