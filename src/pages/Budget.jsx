import { useState } from 'react';
import { useBudgets } from '../hooks/useBudgets';
import { useCategories } from '../hooks/useCategories';
import AddBudget from '../components/Budget/AddBudget';
import BudgetList from '../components/Budget/BudgetList';
import EditBudget from '../components/Budget/EditBudget';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';

const Budget = () => {
  const currentYear = new Date().getFullYear();
  const [activeTab, setActiveTab] = useState('income');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  const {
    budgets: incomeBudgets,
    loading: incomeLoading,
    setBudgetForSubCategory: setIncomeBudget,
    deleteBudget: deleteIncomeBudget,
  } = useBudgets('income');

  const {
    budgets: expenseBudgets,
    loading: expenseLoading,
    setBudgetForSubCategory: setExpenseBudget,
    deleteBudget: deleteExpenseBudget,
  } = useBudgets('expense');

  const { categories: incomeCategories } = useCategories('income');
  const { categories: expenseCategories } = useCategories('expense');

  const handleAddBudget = async (budgetData) => {
    if (activeTab === 'income') {
      await setIncomeBudget(
        budgetData.year,
        budgetData.category,
        budgetData.subCategory,
        budgetData.amount
      );
    } else {
      await setExpenseBudget(
        budgetData.year,
        budgetData.category,
        budgetData.subCategory,
        budgetData.amount
      );
    }
    setShowAddModal(false);
  };

  const handleEditBudget = async (budgetData) => {
    if (activeTab === 'income') {
      await setIncomeBudget(
        budgetData.year,
        budgetData.category,
        budgetData.subCategory,
        budgetData.amount
      );
    } else {
      await setExpenseBudget(
        budgetData.year,
        budgetData.category,
        budgetData.subCategory,
        budgetData.amount
      );
    }
    setEditingBudget(null);
  };

  const handleDeleteBudget = async (id) => {
    if (activeTab === 'income') {
      await deleteIncomeBudget(id);
    } else {
      await deleteExpenseBudget(id);
    }
  };

  const loading = activeTab === 'income' ? incomeLoading : expenseLoading;
  const budgets = activeTab === 'income' ? incomeBudgets : expenseBudgets;
  const categories = activeTab === 'income' ? incomeCategories : expenseCategories;

  // Generate year options (current year ± 5 years)
  const yearOptions = [];
  for (let i = currentYear - 5; i <= currentYear + 5; i++) {
    yearOptions.push(i);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Budget</h1>
        <div className="flex space-x-3 items-center">
          <div className="flex items-center space-x-2">
            <label htmlFor="year-select" className="text-sm font-medium text-gray-700">
              Year:
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              {yearOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <Button onClick={() => setShowAddModal(true)}>Add Budget</Button>
        </div>
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
            Income Budgets
          </button>
          <button
            onClick={() => setActiveTab('expense')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'expense'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Expense Budgets
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-xl text-gray-600">Loading budgets...</div>
        </div>
      ) : (
        <BudgetList
          budgets={budgets}
          categories={categories}
          selectedYear={selectedYear}
          type={activeTab}
          onEdit={setEditingBudget}
          onDelete={handleDeleteBudget}
        />
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={`Add ${activeTab === 'income' ? 'Income' : 'Expense'} Budget`}
      >
        <AddBudget
          onAdd={handleAddBudget}
          onCancel={() => setShowAddModal(false)}
          type={activeTab}
          categories={categories}
          selectedYear={selectedYear}
        />
      </Modal>

      <Modal
        isOpen={editingBudget !== null}
        onClose={() => setEditingBudget(null)}
        title={`Edit ${activeTab === 'income' ? 'Income' : 'Expense'} Budget`}
      >
        {editingBudget && (
          <EditBudget
            budget={editingBudget}
            onEdit={handleEditBudget}
            onCancel={() => setEditingBudget(null)}
            type={activeTab}
          />
        )}
      </Modal>
    </div>
  );
};

export default Budget;
