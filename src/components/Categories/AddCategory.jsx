import { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';

const AddCategory = ({ onAdd, onCancel, type = 'income' }) => {
  const [formData, setFormData] = useState({
    order: '',
    category: '',
    name: '',
    subCategory: '',
    description: '',
    includeInContributionReport: type === 'income',
  });

  const handleChange = (e) => {
    const { name, value, type: inputType, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: inputType === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onAdd(formData);
      setFormData({
        order: '',
        category: '',
        name: '',
        subCategory: '',
        description: '',
        includeInContributionReport: type === 'income'
      });
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Order"
          name="order"
          type="number"
          value={formData.order}
          onChange={handleChange}
          required
          placeholder="Display order"
        />
        <Input
          label="Category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
          placeholder="Main category"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder={`Enter ${type} name`}
        />
        <Input
          label="Sub Category"
          name="subCategory"
          value={formData.subCategory}
          onChange={handleChange}
          required
          placeholder="Sub category"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Enter category description"
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="flex items-center mb-4">
        <input
          type="checkbox"
          id="includeInContributionReport"
          name="includeInContributionReport"
          checked={formData.includeInContributionReport}
          onChange={handleChange}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="includeInContributionReport" className="ml-2 block text-sm text-gray-700">
          Include in Contribution Report
        </label>
      </div>

      <div className="flex space-x-3">
        <Button type="submit" variant="primary">Add Category</Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  );
};

export default AddCategory;
