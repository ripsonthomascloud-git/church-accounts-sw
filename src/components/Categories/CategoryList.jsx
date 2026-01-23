import { useState } from 'react';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Input from '../common/Input';

const CategoryList = ({ categories, onUpdate, onDelete, type = 'income' }) => {
  const [editingCategory, setEditingCategory] = useState(null);

  const handleEdit = (category) => {
    setEditingCategory({ ...category });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await onUpdate(editingCategory.id, {
        order: editingCategory.order,
        category: editingCategory.category,
        name: editingCategory.name,
        subCategory: editingCategory.subCategory,
        description: editingCategory.description,
        includeInContributionReport: editingCategory.includeInContributionReport,
      });
      setEditingCategory(null);
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleCheckboxChange = (e) => {
    setEditingCategory({
      ...editingCategory,
      includeInContributionReport: e.target.checked
    });
  };

  // Sort categories by order
  const sortedCategories = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div>
      {sortedCategories.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No {type} categories found</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedCategories.map((category) => (
            <div key={category.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-500">#{category.order || 'N/A'}</span>
                    <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p><span className="font-medium">Category:</span> {category.category || 'N/A'}</p>
                    <p><span className="font-medium">Sub:</span> {category.subCategory || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this category?")) {
                            onDelete(category.id);
                          }
                        }}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {category.description && (
                <p className="text-gray-600 text-sm mb-2">{category.description}</p>
              )}
              {category.includeInContributionReport && (
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  In Contribution Report
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        title="Edit Category"
      >
        {editingCategory && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Order"
                name="order"
                type="number"
                value={editingCategory.order || ''}
                onChange={(e) => setEditingCategory({ ...editingCategory, order: e.target.value })}
                required
              />
              <Input
                label="Category"
                name="category"
                value={editingCategory.category || ''}
                onChange={(e) => setEditingCategory({ ...editingCategory, category: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Name"
                name="name"
                value={editingCategory.name || ''}
                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                required
              />
              <Input
                label="Sub Category"
                name="subCategory"
                value={editingCategory.subCategory || ''}
                onChange={(e) => setEditingCategory({ ...editingCategory, subCategory: e.target.value })}
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="edit-description"
                value={editingCategory.description || ''}
                onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="edit-includeInContributionReport"
                checked={editingCategory.includeInContributionReport || false}
                onChange={handleCheckboxChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="edit-includeInContributionReport" className="ml-2 block text-sm text-gray-700">
                Include in Contribution Report
              </label>
            </div>

            <div className="flex space-x-3">
              <Button type="submit" variant="primary">Update Category</Button>
              <Button type="button" variant="secondary" onClick={() => setEditingCategory(null)}>Cancel</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default CategoryList;
