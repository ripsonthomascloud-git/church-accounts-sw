import { useState, useMemo } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';

const AddExpense = ({ onAdd, onCancel, categories, payees, expenseTransactions = [], lastDate }) => {
  const getDefaultDate = () => {
    if (lastDate) return lastDate;
    const now = new Date();
    const centralDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    const year = centralDate.getFullYear();
    const month = String(centralDate.getMonth() + 1).padStart(2, '0');
    const day = String(centralDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    subCategory: '',
    description: '',
    date: getDefaultDate(),
    payeeId: '',
    payeeName: '',
    accountType: 'Operating',
  });
  const [payeeSearch, setPayeeSearch] = useState('');
  const [showPayeeDropdown, setShowPayeeDropdown] = useState(false);
  const [autoFilledCategory, setAutoFilledCategory] = useState(false);

  // Get unique categories
  const uniqueCategories = useMemo(() => {
    const catSet = new Set(categories.map(c => c.category).filter(Boolean));
    return Array.from(catSet).sort();
  }, [categories]);

  // Get subcategories for selected category
  const availableSubCategories = useMemo(() => {
    if (!formData.category) return [];
    return categories
      .filter(c => c.category === formData.category)
      .map(c => ({ name: c.name, subCategory: c.subCategory }))
      .filter(c => c.subCategory)
      .sort((a, b) => a.subCategory.localeCompare(b.subCategory));
  }, [categories, formData.category]);

  // Filter payees based on search
  const filteredPayees = useMemo(() => {
    if (!payeeSearch) return payees;
    const search = payeeSearch.toLowerCase();
    return payees.filter(p =>
      p.name.toLowerCase().includes(search)
    );
  }, [payees, payeeSearch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'category') {
      setAutoFilledCategory(false);
      setFormData(prev => ({ ...prev, category: value, subCategory: '' }));
    } else {
      if (name === 'subCategory') setAutoFilledCategory(false);
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePayeeSearchChange = (e) => {
    const value = e.target.value;
    setPayeeSearch(value);
    setShowPayeeDropdown(true);
    if (!value) {
      setAutoFilledCategory(false);
      setFormData(prev => ({ ...prev, payeeId: '', payeeName: '' }));
    }
  };

  const handlePayeeSelect = (payee) => {
    setPayeeSearch(payee.name);

    // Find the most recent expense for this payee to auto-populate category/subCategory
    const payeeExpenses = expenseTransactions
      .filter(t => t.payeeId === payee.id && t.category)
      .sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return dateB - dateA;
      });

    const lastExpense = payeeExpenses[0];

    setFormData(prev => ({
      ...prev,
      payeeId: payee.id,
      payeeName: payee.name,
      ...(lastExpense && {
        category: lastExpense.category || prev.category,
        subCategory: lastExpense.subCategory || prev.subCategory,
      }),
    }));
    setAutoFilledCategory(!!lastExpense);
    setShowPayeeDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onAdd(formData);
      setFormData({
        amount: '',
        category: '',
        subCategory: '',
        description: '',
        date: getDefaultDate(),
        payeeId: '',
        payeeName: '',
        accountType: 'Operating',
      });
      setPayeeSearch('');
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4">
        <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 mb-1">
          Account Type<span className="text-red-500 ml-1">*</span>
        </label>
        <select
          id="accountType"
          name="accountType"
          value={formData.accountType}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="Operating">Operating</option>
          <option value="Building">Building</option>
        </select>
      </div>

      <div className="mb-4 relative">
        <label htmlFor="payeeSearch" className="block text-sm font-medium text-gray-700 mb-1">
          Payee<span className="text-red-500 ml-1">*</span>
        </label>
        <input
          id="payeeSearch"
          type="text"
          value={payeeSearch}
          onChange={handlePayeeSearchChange}
          onFocus={() => setShowPayeeDropdown(true)}
          onBlur={() => setTimeout(() => setShowPayeeDropdown(false), 200)}
          placeholder="Type to search payee..."
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {showPayeeDropdown && filteredPayees.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
            {filteredPayees.map(payee => (
              <div
                key={payee.id}
                onClick={() => handlePayeeSelect(payee)}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
              >
                <div className="font-medium">{payee.name}</div>
                <div className="text-sm text-gray-500">{payee.phone}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {autoFilledCategory && (
        <div className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1">
          Category auto-filled from last expense with this payee
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="mb-4">
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category<span className="text-red-500 ml-1">*</span>
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select category</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="subCategory" className="block text-sm font-medium text-gray-700 mb-1">
            Sub Category<span className="text-red-500 ml-1">*</span>
          </label>
          <select
            id="subCategory"
            name="subCategory"
            value={formData.subCategory}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={!formData.category}
          >
            <option value="">Select sub category</option>
            {availableSubCategories.map(cat => (
              <option key={cat.name} value={cat.subCategory}>{cat.subCategory}</option>
            ))}
          </select>
        </div>
      </div>

      <Input
        label="Date"
        name="date"
        type="date"
        value={formData.date}
        onChange={handleChange}
        required
      />

      <div className="mb-4">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Enter description"
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <Input
        label="Amount"
        name="amount"
        type="number"
        step="0.01"
        min="0"
        value={formData.amount}
        onChange={handleChange}
        required
        placeholder="Enter amount"
      />

      <div className="flex space-x-3">
        <Button type="submit" variant="danger">Add Expense</Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  );
};

export default AddExpense;
