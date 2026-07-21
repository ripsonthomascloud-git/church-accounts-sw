import { useState, useMemo } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import { useBudgets } from '../../hooks/useBudgets';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  ChartDataLabels
);

const BudgetVsActualChart = ({ accountType = null, transactionType = 'income' }) => {
  const { transactions } = useTransactions(transactionType);
  const { budgets } = useBudgets(transactionType);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [chartType, setChartType] = useState('bar'); // 'bar' or 'line'

  // Helper function to determine quarter from date
  const getQuarter = (dateValue) => {
    const date = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
    const month = date.getMonth() + 1; // 1-12
    if (month >= 1 && month <= 3) return 'Q1';
    if (month >= 4 && month <= 6) return 'Q2';
    if (month >= 7 && month <= 9) return 'Q3';
    return 'Q4';
  };

  // Helper function to determine month from date
  const getMonth = (dateValue) => {
    const date = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Process data for charts
  const chartData = useMemo(() => {
    const filtered = transactions.filter(t => {
      const dateMatch = (!dateFrom || t.date >= dateFrom) && (!dateTo || t.date <= dateTo);
      const accountTypeMatch = !accountType || t.accountType === accountType;
      return dateMatch && accountTypeMatch;
    });

    // Group by category and subcategory for actuals
    const actualsBySubCategory = {};
    filtered.forEach(transaction => {
      const category = transaction.category || 'Uncategorized';
      const subCategory = transaction.subCategory || 'General';
      const key = `${category} - ${subCategory}`;
      
      if (!actualsBySubCategory[key]) {
        actualsBySubCategory[key] = {
          category,
          subCategory,
          amount: 0
        };
      }
      actualsBySubCategory[key].amount += transaction.amount || 0;
    });

    // Get budget data by subcategory
    const budgetsBySubCategory = {};
    const currentYear = dateFrom ? new Date(dateFrom).getFullYear() : new Date().getFullYear();
    
    // Debug: Log budget data to see structure
    console.log('Budget data for', transactionType, ':', budgets);
    console.log('Current year:', currentYear);
    
    budgets.forEach(budget => {
      console.log('Processing budget:', budget);
      // Filter by year
      if (budget.year === currentYear) {
        const category = budget.category || 'Uncategorized';
        const subCategory = budget.subCategory || 'General';
        const key = `${category} - ${subCategory}`;
        
        console.log(`Adding budget for ${key}: ${budget.amount}`);
        
        if (!budgetsBySubCategory[key]) {
          budgetsBySubCategory[key] = {
            category,
            subCategory,
            amount: 0
          };
        }
        budgetsBySubCategory[key].amount += budget.amount || 0;
      } else {
        console.log(`Skipping budget for year ${budget.year}, current year is ${currentYear}`);
      }
    });
    
    console.log('Final budgets by subcategory:', budgetsBySubCategory);

    // Get all unique subcategories
    const allSubCategories = Array.from(new Set([
      ...Object.keys(actualsBySubCategory),
      ...Object.keys(budgetsBySubCategory)
    ])).sort();

    // Prepare data for quarterly trend analysis
    const quarterlyData = {};
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    
    quarters.forEach(quarter => {
      quarterlyData[quarter] = { actual: 0, budget: 0 };
    });

    filtered.forEach(transaction => {
      const quarter = getQuarter(transaction.date);
      if (quarterlyData[quarter]) {
        quarterlyData[quarter].actual += transaction.amount || 0;
      }
    });

    // Calculate quarterly budgets (assuming budgets are annual, divide by 4)
    Object.values(budgetsBySubCategory).forEach(budgetItem => {
      quarters.forEach(quarter => {
        quarterlyData[quarter].budget += budgetItem.amount / 4;
      });
    });

    return {
      categories: allSubCategories,
      actuals: allSubCategories.map(key => actualsBySubCategory[key]?.amount || 0),
      budgets: allSubCategories.map(key => budgetsBySubCategory[key]?.amount || 0),
      quarterlyData,
      totalActual: Object.values(actualsBySubCategory).reduce((sum, item) => sum + item.amount, 0),
      totalBudget: Object.values(budgetsBySubCategory).reduce((sum, item) => sum + item.amount, 0),
    };
  }, [transactions, budgets, accountType, dateFrom, dateTo]);

  // Chart configuration
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y', // This makes the bars horizontal
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Budget vs Actual - ${transactionType === 'income' ? 'Income' : 'Expense'}${accountType ? ` (${accountType})` : ''}`,
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        },
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            const value = context.parsed.y;
            const formattedValue = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(value);
            label += formattedValue;
            
            // Add percentage for actual vs budget comparison
            if (context.datasetIndex === 1 && context.dataIndex < chartData.budgets.length) {
              const budget = chartData.budgets[context.dataIndex];
              const actual = chartData.actuals[context.dataIndex];
              if (budget > 0) {
                const percentage = ((actual / budget) * 100).toFixed(1);
                label += ` (${percentage}% of budget)`;
              }
            }
            
            return label;
          },
          afterLabel: function(context) {
            if (context.datasetIndex === 1 && context.dataIndex < chartData.budgets.length) {
              const budget = chartData.budgets[context.dataIndex];
              const actual = chartData.actuals[context.dataIndex];
              const variance = budget - actual;
              const varianceText = variance >= 0 ? 'Under Budget' : 'Over Budget';
              const varianceAmount = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(Math.abs(variance));
              return `Variance: ${varianceText} by ${varianceAmount}`;
            }
            return '';
          }
        }
      },
      datalabels: {
        display: function(context) {
          // Only show labels for values greater than 0 to avoid clutter
          return context.dataset.data[context.dataIndex] > 0;
        },
        anchor: 'end',
        align: 'end',
        offset: 4,
        formatter: (value, context) => {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(value);
        },
        font: {
          weight: 'bold',
          size: 9
        },
        color: function(context) {
          // Use dataset colors for consistency
          return context.dataset.backgroundColor === 'rgba(54, 162, 235, 0.6)' ? '#2563eb' : '#dc2626';
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
            }).format(value);
          },
          font: {
            size: 11
          }
        },
        title: {
          display: true,
          text: 'Amount ($)',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      y: {
        ticks: {
          font: {
            size: 11
          },
          autoSkip: false
        }
      }
    },
    layout: {
      padding: {
        top: 20,
        right: 20,
        bottom: 10,
        left: 10
      }
    }
  };

  // Quarterly trend chart options
  const trendChartOptions = {
    ...chartOptions,
    indexAxis: chartType === 'bar' ? 'y' : 'x', // Horizontal for bar, vertical for line
    plugins: {
      ...chartOptions.plugins,
      title: {
        display: true,
        text: `Quarterly Trends - ${transactionType === 'income' ? 'Income' : 'Expense'}${accountType ? ` (${accountType})` : ''}`,
      },
      datalabels: chartType === 'bar' ? chartOptions.plugins.datalabels : { display: false } // Only show labels for bar charts
    },
    scales: chartType === 'bar' ? {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        autoSkip: false,
        ticks: {
          font: {
            size: 11
          }
        }
      },
      x: {
        ...chartOptions.scales.x,
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
            }).format(value);
          },
          font: {
            size: 11
          }
        },
        title: {
          display: true,
          text: 'Amount ($)',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      }
    } : chartOptions.scales
  };

  // Data for category comparison chart
  const categoryChartData = {
    labels: chartData.categories,
    datasets: [
      {
        label: 'Budget',
        data: chartData.budgets,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
      {
        label: 'Actual',
        data: chartData.actuals,
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Data for quarterly trend chart
  const trendChartData = {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      {
        label: 'Budget',
        data: ['Q1', 'Q2', 'Q3', 'Q4'].map(q => chartData.quarterlyData[q].budget),
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        tension: 0.1,
        type: 'line',
      },
      {
        label: 'Actual',
        data: ['Q1', 'Q2', 'Q3', 'Q4'].map(q => chartData.quarterlyData[q].actual),
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        type: chartType === 'line' ? 'line' : 'bar',
        tension: 0.1,
      },
    ],
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const variance = chartData.totalBudget - chartData.totalActual;
  const variancePercentage = chartData.totalBudget > 0 
    ? ((variance / chartData.totalBudget) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Budget</h3>
          <p className="text-2xl font-bold text-blue-600">{formatAmount(chartData.totalBudget)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Actual</h3>
          <p className="text-2xl font-bold text-green-600">{formatAmount(chartData.totalActual)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Variance</h3>
          <p className={`text-2xl font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatAmount(variance)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Variance %</h3>
          <p className={`text-2xl font-bold ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {variancePercentage}%
          </p>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Chart Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Chart Type</label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
            </select>
          </div>
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => {
              setDateFrom('');
              setDateTo('');
            }}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear Dates
          </button>
        )}
      </div>

      {/* Category Comparison Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget vs Actual by Category</h3>
        <div style={{ height: `${Math.max(400, chartData.categories.length * 35)}px`, minHeight: '400px' }}>
          <Bar data={categoryChartData} options={chartOptions} />
        </div>
      </div>

      {/* Quarterly Trend Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quarterly Trends</h3>
        <div style={{ height: '400px' }}>
          {chartType === 'bar' ? (
            <Bar data={trendChartData} options={trendChartOptions} />
          ) : (
            <Line data={trendChartData} options={trendChartOptions} />
          )}
        </div>
      </div>

      {/* Category Details Table */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Details</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variance
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % of Budget
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {chartData.categories.map((category, index) => {
                const budget = chartData.budgets[index];
                const actual = chartData.actuals[index];
                const variance = budget - actual;
                const percentage = budget > 0 ? (actual / budget * 100).toFixed(1) : '0.0';
                
                return (
                  <tr key={category}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatAmount(budget)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {formatAmount(actual)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      variance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatAmount(variance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {percentage}%
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  Total
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {formatAmount(chartData.totalBudget)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {formatAmount(chartData.totalActual)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${
                  variance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatAmount(variance)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {variancePercentage}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BudgetVsActualChart;
