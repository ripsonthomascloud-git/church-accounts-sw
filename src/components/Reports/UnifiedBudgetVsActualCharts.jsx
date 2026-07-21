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

const UnifiedBudgetVsActualCharts = () => {
  const { transactions: incomeTransactions } = useTransactions('income');
  const { transactions: expenseTransactions } = useTransactions('expenses');
  const { budgets: incomeBudgets } = useBudgets('income');
  const { budgets: expenseBudgets } = useBudgets('expense');
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

  // Process data for charts
  const processChartData = (transactions, budgets, transactionType) => {
    const filtered = transactions.filter(t => {
      const dateMatch = (!dateFrom || t.date >= dateFrom) && (!dateTo || t.date <= dateTo);
      return dateMatch;
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
    console.log(`Budget data for ${transactionType}:`, budgets);
    console.log(`Current year: ${currentYear}`);
    console.log(`Number of budgets: ${budgets.length}`);
    
    budgets.forEach((budget, index) => {
      console.log(`Budget ${index}:`, budget);
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
    
    console.log(`Final budgets by subcategory for ${transactionType}:`, budgetsBySubCategory);

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
  };

  // Debug: Log budget data at component level
  console.log('Income budgets:', incomeBudgets);
  console.log('Expense budgets:', expenseBudgets);

  // Process data for Operating account types only
  const incomeOperatingData = useMemo(() => {
    const filtered = incomeTransactions.filter(t => !t.accountType || t.accountType === 'Operating');
    console.log('Processing income operating with budgets:', incomeBudgets);
    return processChartData(filtered, incomeBudgets, 'income');
  }, [incomeTransactions, incomeBudgets, dateFrom, dateTo]);

  const expenseOperatingData = useMemo(() => {
    const filtered = expenseTransactions.filter(t => !t.accountType || t.accountType === 'Operating');
    console.log('Processing expense operating with budgets:', expenseBudgets);
    return processChartData(filtered, expenseBudgets, 'expenses');
  }, [expenseTransactions, expenseBudgets, dateFrom, dateTo]);

  // Chart configuration
  const getChartOptions = (title, chartData) => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 14,
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
            
            // Get the original value from the dataset
            const originalValue = context.dataset.originalValues[context.dataIndex];
            
            const formattedValue = new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(originalValue);
            label += formattedValue;
            
            // Add indicator if value is capped
            if (originalValue > 10000) {
              label += ' (maxed at $10,000 scale)';
            }
            
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
          return context.dataset.data[context.dataIndex] > 0;
        },
        anchor: 'center',
        align: 'center',
        offset: 0,
        formatter: (value, context) => {
          // Try multiple ways to get the original value
          let originalValue;
          
          // Method 1: Try originalValues
          if (context.dataset.originalValues && context.dataset.originalValues[context.dataIndex]) {
            originalValue = context.dataset.originalValues[context.dataIndex];
          }
          // Method 2: Try meta property
          else if (context.dataset.meta && context.dataset.meta.originalValues && context.dataset.meta.originalValues[context.dataIndex]) {
            originalValue = context.dataset.meta.originalValues[context.dataIndex];
          }
          // Method 3: Try specific dataset properties
          else if (context.datasetIndex === 0 && context.dataset.originalBudgets && context.dataset.originalBudgets[context.dataIndex]) {
            originalValue = context.dataset.originalBudgets[context.dataIndex];
          }
          else if (context.datasetIndex === 1 && context.dataset.originalActuals && context.dataset.originalActuals[context.dataIndex]) {
            originalValue = context.dataset.originalActuals[context.dataIndex];
          }
          // Fallback to display value
          else {
            originalValue = value;
          }
          
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
          }).format(originalValue);
        },
        font: {
          weight: 'bold',
          size: 10
        },
        color: function(context) {
          // Check if this is an Actual dataset (red bars)
          if (context.datasetIndex === 1) {
            return '#1f2937'; // Dark gray color for red bars
          }
          return '#15803d'; // Dark green color for budget bars
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 10000,
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
          },
          maxTicksLimit: 8
        },
        title: {
          display: true,
          text: 'Amount ($)',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        grid: {
          display: true,
          drawBorder: false,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        afterBuildTicks: function(scale) {
          // Ensure we have ticks up to 10,000
          if (scale.ticks[scale.ticks.length - 1] < 10000) {
            scale.ticks.push(10000);
          }
          return scale;
        }
      },
      y: {
        ticks: {
          font: {
            size: 11
          },
          autoSkip: false,
          padding: 10
        },
        grid: {
          display: true,
          drawBorder: true,
          color: 'rgba(0, 0, 0, 0.2)',
          lineWidth: 1,
          borderDash: []
        },
        border: {
          display: true,
          color: 'rgba(0, 0, 0, 0.3)',
          width: 1
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
  });

  // Get alternating row colors with cell borders
  const getRowColors = (index) => {
    // Alternating dark and light theme
    if (index % 2 === 0) {
      // Dark theme rows
      return {
        background: 'rgba(34, 197, 94, 0.8)',     // Dark green
        border: 'rgba(34, 197, 94, 1)',
        actualBackground: 'rgba(255, 99, 132, 0.8)', // Dark red
        actualBorder: 'rgba(255, 99, 132, 1)'
      };
    } else {
      // Light theme rows
      return {
        background: 'rgba(34, 197, 94, 0.4)',     // Light green
        border: 'rgba(34, 197, 94, 0.8)',
        actualBackground: 'rgba(255, 99, 132, 0.4)', // Light red
        actualBorder: 'rgba(255, 99, 132, 0.8)'
      };
    }
  };

  // Get chart data for a specific dataset
  const getChartData = (chartData) => {
    // Calculate proportional representation for amounts > $10,000
    const cappedBudgets = chartData.budgets.map((budget, index) => {
      const actual = chartData.actuals[index];
      
      // If both amounts are <= $10,000, use actual values
      if (budget <= 10000 && actual <= 10000) {
        return budget;
      }
      
      // If budget > $10,000, calculate proportion
      if (budget > 10000) {
        const ratio = actual / budget;
        // Scale budget to $10,000 and actual proportionally
        return 10000;
      }
      
      // If budget <= $10,000 but actual > $10,000, cap actual proportionally
      return budget;
    });
    
    const cappedActuals = chartData.actuals.map((actual, index) => {
      const budget = chartData.budgets[index];
      
      // If both amounts are <= $10,000, use actual values
      if (budget <= 10000 && actual <= 10000) {
        return actual;
      }
      
      // If budget > $10,000, calculate proportion based on budget
      if (budget > 10000) {
        const ratio = actual / budget;
        // Scale actual proportionally to the $10,000 budget scale
        return Math.min(10000 * ratio, 10000);
      }
      
      // If budget <= $10,000 but actual > $10,000, cap at $10,000
      return Math.min(actual, 10000);
    });
    
    // Generate alternating row colors
    const budgetBackgroundColors = chartData.categories.map((_, index) => getRowColors(index).background);
    const budgetBorderColors = chartData.categories.map((_, index) => getRowColors(index).border);
    const actualBackgroundColors = chartData.categories.map((_, index) => getRowColors(index).actualBackground);
    const actualBorderColors = chartData.categories.map((_, index) => getRowColors(index).actualBorder);
    
    return {
      labels: chartData.categories,
      datasets: [
        {
          label: 'Budget',
          data: cappedBudgets,
          backgroundColor: budgetBackgroundColors,
          borderColor: budgetBorderColors,
          borderWidth: 2,
          barPercentage: 0.95,
          categoryPercentage: 0.9,
          // Store original values in multiple ways for compatibility
          originalBudgets: chartData.budgets,
          originalActuals: chartData.actuals,
          originalValues: chartData.budgets,
          // Also store as a string property for datalabels
          meta: {
            originalValues: chartData.budgets
          }
        },
        {
          label: 'Actual',
          data: cappedActuals,
          backgroundColor: actualBackgroundColors,
          borderColor: actualBorderColors,
          borderWidth: 2,
          barPercentage: 0.95,
          categoryPercentage: 0.9,
          // Store original values in multiple ways for compatibility
          originalBudgets: chartData.budgets,
          originalActuals: chartData.actuals,
          originalValues: chartData.actuals,
          // Also store as a string property for datalabels
          meta: {
            originalValues: chartData.actuals
          }
        },
      ],
    };
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getVarianceInfo = (chartData) => {
    const variance = chartData.totalBudget - chartData.totalActual;
    const variancePercentage = chartData.totalBudget > 0 
      ? ((variance / chartData.totalBudget) * 100).toFixed(1)
      : 0;
    return { variance, variancePercentage };
  };

  return (
    <div className="space-y-6">
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

      {/* Income Operating Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Income - Operating</h3>
          <div className="grid grid-cols-4 gap-4 mt-2">
            <div className="text-sm">
              <span className="text-gray-500">Budget:</span>
              <span className="ml-2 font-semibold text-blue-600">{formatAmount(incomeOperatingData.totalBudget)}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Actual:</span>
              <span className="ml-2 font-semibold text-green-600">{formatAmount(incomeOperatingData.totalActual)}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Variance:</span>
              <span className={`ml-2 font-semibold ${getVarianceInfo(incomeOperatingData).variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatAmount(getVarianceInfo(incomeOperatingData).variance)}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Variance %:</span>
              <span className={`ml-2 font-semibold ${getVarianceInfo(incomeOperatingData).variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {getVarianceInfo(incomeOperatingData).variancePercentage}%
              </span>
            </div>
          </div>
        </div>
        <div style={{ height: `${Math.max(400, incomeOperatingData.categories.length * 35)}px`, minHeight: '400px' }}>
          <Bar data={getChartData(incomeOperatingData)} options={getChartOptions('Income - Operating', incomeOperatingData)} />
        </div>
      </div>

      {/* Expense Operating Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Expense - Operating</h3>
          <div className="grid grid-cols-4 gap-4 mt-2">
            <div className="text-sm">
              <span className="text-gray-500">Budget:</span>
              <span className="ml-2 font-semibold text-blue-600">{formatAmount(expenseOperatingData.totalBudget)}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Actual:</span>
              <span className="ml-2 font-semibold text-green-600">{formatAmount(expenseOperatingData.totalActual)}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Variance:</span>
              <span className={`ml-2 font-semibold ${getVarianceInfo(expenseOperatingData).variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatAmount(getVarianceInfo(expenseOperatingData).variance)}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500">Variance %:</span>
              <span className={`ml-2 font-semibold ${getVarianceInfo(expenseOperatingData).variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {getVarianceInfo(expenseOperatingData).variancePercentage}%
              </span>
            </div>
          </div>
        </div>
        <div style={{ height: `${Math.max(400, expenseOperatingData.categories.length * 35)}px`, minHeight: '400px' }}>
          <Bar data={getChartData(expenseOperatingData)} options={getChartOptions('Expense - Operating', expenseOperatingData)} />
        </div>
      </div>
    </div>
  );
};

export default UnifiedBudgetVsActualCharts;
