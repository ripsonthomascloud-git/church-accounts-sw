import { useState } from 'react';
import { useCategories } from '../hooks/useCategories';
import AddCategory from '../components/Categories/AddCategory';
import CategoryList from '../components/Categories/CategoryList';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { seedAllCategories } from '../utils/seedCategories';

const Categories = () => {
  const [activeTab, setActiveTab] = useState('income');
  const [showAddModal, setShowAddModal] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');

  const {
    categories: incomeCategories,
    loading: incomeLoading,
    addCategory: addIncomeCategory,
    updateCategory: updateIncomeCategory,
    deleteCategory: deleteIncomeCategory,
  } = useCategories('income');

  const {
    categories: expenseCategories,
    loading: expenseLoading,
    addCategory: addExpenseCategory,
    updateCategory: updateExpenseCategory,
    deleteCategory: deleteExpenseCategory,
  } = useCategories('expense');

  const handleAddCategory = async (categoryData) => {
    if (activeTab === 'income') {
      await addIncomeCategory(categoryData);
    } else {
      await addExpenseCategory(categoryData);
    }
    setShowAddModal(false);
  };

  const handleSeedCategories = async () => {
    setSeeding(true);
    setSeedMessage('');
    try {
      const results = await seedAllCategories();
      const { totalAdded, totalSkipped, totalErrors } = results.summary;

      let message = `Successfully initialized categories!\n`;
      message += `Added: ${totalAdded} categories\n`;
      if (totalSkipped > 0) {
        message += `Skipped: ${totalSkipped} (already exist)\n`;
      }
      if (totalErrors > 0) {
        message += `Errors: ${totalErrors}`;
      }

      setSeedMessage(message);

      // Refresh categories
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setSeedMessage(`Error initializing categories: ${error.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const loading = activeTab === 'income' ? incomeLoading : expenseLoading;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
        <div className="flex space-x-3">
          {/* <Button
            onClick={handleSeedCategories}
            disabled={seeding}
            variant="success"
          >
            {seeding ? 'Initializing...' : 'Initialize Default Categories'}
          </Button> */}
          <Button onClick={() => setShowAddModal(true)}>Add New Category</Button>
        </div>
      </div>

      {seedMessage && (
        <div className={`p-4 rounded-md ${
          seedMessage.includes('Error') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          <pre className="whitespace-pre-wrap text-sm">{seedMessage}</pre>
        </div>
      )}

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
            Income Categories
          </button>
          <button
            onClick={() => setActiveTab('expense')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'expense'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Expense Categories
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-xl text-gray-600">Loading categories...</div>
        </div>
      ) : (
        <div>
          {activeTab === 'income' ? (
            <CategoryList
              categories={incomeCategories}
              onUpdate={updateIncomeCategory}
              onDelete={deleteIncomeCategory}
              type="income"
            />
          ) : (
            <CategoryList
              categories={expenseCategories}
              onUpdate={updateExpenseCategory}
              onDelete={deleteExpenseCategory}
              type="expense"
            />
          )}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={`Add ${activeTab === 'income' ? 'Income' : 'Expense'} Category`}
      >
        <AddCategory
          onAdd={handleAddCategory}
          onCancel={() => setShowAddModal(false)}
          type={activeTab}
        />
      </Modal>
    </div>
  );
};

export default Categories;
