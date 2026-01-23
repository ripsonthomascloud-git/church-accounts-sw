import { useState, useMemo } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';

const AddBudget = ({ onAdd, onCancel, type = 'income', categories, selectedYear }) => {
  const [formData, setFormData] = useState({
    year: selectedYear,
    category: '',
    subCategory: '',
    amount: '',
  });

  // Extract unique categories
  const uniqueCategories = useMemo(() => {
    const cats = [...new Set(categories.map(cat => cat.category))];
    return cats.sort();
  }, [categories]);

  // Get subcategories for selected category
  const availableSubCategories = useMemo(() => {
    if (!formData.category) return [];
    return categories
      .filter(cat => cat.category === formData.category)
      .map(cat => cat.subCategory)
      .sort();
  }, [formData.category, categories]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Reset subcategory when category changes
    if (name === 'category') {
      setFormData(prev => ({
        ...prev,
        category: value,
        subCategory: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onAdd(formData);
      setFormData({
        year: selectedYear,
        category: '',
        subCategory: '',
        amount: '',
      });
    } catch (error) {
      console.error('Error adding budget:', error);
      alert('Error adding budget. Please check if a budget already exists for this category/subcategory combination.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Year"
        name="year"
        type="number"
        value={formData.year}
        onChange={handleChange}
        required
        min="2000"
        max="2100"
        placeholder="Budget year"
      />

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select a category</option>
          {uniqueCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="subCategory" className="block text-sm font-medium text-gray-700 mb-1">
          Sub Category
        </label>
        <select
          id="subCategory"
          name="subCategory"
          value={formData.subCategory}
          onChange={handleChange}
          required
          disabled={!formData.category}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Select a subcategory</option>
          {availableSubCategories.map(subCat => (
            <option key={subCat} value={subCat}>{subCat}</option>
          ))}
        </select>
      </div>

      <Input
        label="Budget Amount"
        name="amount"
        type="number"
        step="0.01"
        min="0"
        value={formData.amount}
        onChange={handleChange}
        required
        placeholder="Enter budget amount"
      />

      <div className="flex space-x-3">
        <Button type="submit" variant="primary">Add Budget</Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  );
};

export default AddBudget;
