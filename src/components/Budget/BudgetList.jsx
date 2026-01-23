import { useMemo } from 'react';

const BudgetList = ({ budgets, categories, selectedYear, type, onEdit, onDelete }) => {
  // Filter budgets by selected year
  const yearBudgets = budgets.filter(b => b.year === selectedYear);

  // Group budgets by category
  const groupedBudgets = useMemo(() => {
    const grouped = {};
    yearBudgets.forEach(budget => {
      if (!grouped[budget.category]) {
        grouped[budget.category] = [];
      }
      grouped[budget.category].push(budget);
    });

    // Sort subcategories within each category by name
    Object.keys(grouped).forEach(cat => {
      grouped[cat].sort((a, b) =>
        (a.subCategory || '').localeCompare(b.subCategory || '')
      );
    });

    return grouped;
  }, [budgets, selectedYear]);

  const sortedCategories = Object.keys(groupedBudgets).sort();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {Object.keys(groupedBudgets).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No budgets found for {selectedYear}</p>
          <p className="text-gray-400 text-sm mt-2">Click "Add Budget" to create a budget for this year.</p>
        </div>
      ) : (
        <>
          {sortedCategories.map(category => {
            const categoryBudgets = groupedBudgets[category].sort((a, b) =>
              a.subCategory.localeCompare(b.subCategory)
            );
            const categoryTotal = groupedBudgets[category].reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);

            return (
              <div key={category} className="mb-6 bg-white rounded-lg shadow">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-t-lg">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">{category}</h3>
                    <span className="text-lg font-bold">
                      {formatCurrency(categoryTotal)}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sub Category
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Budget Amount
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {groupedBudgets[category].map((budget) => (
                        <tr key={budget.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {budget.subCategory}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                            ${parseFloat(budget.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => onEdit(budget)}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this budget?')) {
                                  onDelete(budget.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          </>
        )}

      </div>
    );
  };

  export default BudgetList;
