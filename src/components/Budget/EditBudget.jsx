import { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';

const EditBudget = ({ budget, onEdit, onCancel, type = 'income' }) => {
  const [amount, setAmount] = useState(budget.amount || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onEdit({
        year: budget.year,
        category: budget.category,
        subCategory: budget.subCategory,
        amount: amount,
      });
    } catch (error) {
      console.error('Error editing budget:', error);
      alert('Error editing budget. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-md space-y-2">
        <div className="flex justify-between">
          <span className="text-sm font-medium text-gray-700">Year:</span>
          <span className="text-sm text-gray-900">{budget.year}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm font-medium text-gray-700">Category:</span>
          <span className="text-sm text-gray-900">{budget.category}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm font-medium text-gray-700">Sub Category:</span>
          <span className="text-sm text-gray-900">{budget.subCategory}</span>
        </div>
      </div>

      <Input
        label="Budget Amount"
        name="amount"
        type="number"
        step="0.01"
        min="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        placeholder="Enter budget amount"
      />

      <div className="flex space-x-3">
        <Button type="submit" variant="primary">Update Budget</Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  );
};

export default EditBudget;
