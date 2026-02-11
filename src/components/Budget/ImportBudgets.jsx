import { useState } from 'react';
import Button from '../common/Button';

const ImportBudgets = ({ onImport, onCancel, categories, selectedYear }) => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState(null);
  const [missingCategories, setMissingCategories] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError(null);
      parseCSV(selectedFile);
    } else {
      setError('Please select a valid CSV file');
      setFile(null);
      setPreview([]);
    }
  };

  // Parse CSV line handling quoted fields
  const parseCSVLine = (line) => {
    const values = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Handle escaped quote ("")
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // End of field
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    // Add last field
    values.push(current.trim());
    return values;
  };

  const parseCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        setError('CSV file must contain a header row and at least one data row');
        return;
      }

      // Parse headers
      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
      const requiredFields = ['category', 'subcategory', 'budget'];

      const missingFields = requiredFields.filter(field => !headers.includes(field));
      if (missingFields.length > 0) {
        setError(`CSV is missing required columns: ${missingFields.join(', ')}`);
        return;
      }

      // Parse data rows
      const data = lines.slice(1).map(line => {
        const values = parseCSVLine(line);
        const budget = {};
        headers.forEach((header, index) => {
          if (header === 'category') {
            budget.category = values[index];
          } else if (header === 'subcategory') {
            budget.subCategory = values[index];
          } else if (header === 'budget') {
            // Remove any currency symbols, commas, and parse as float
            const cleanValue = values[index].replace(/[$,]/g, '').trim();
            budget.amount = parseFloat(cleanValue) || 0;
          }
        });
        return budget;
      });

      // Check for missing categories/subcategories
      const missing = [];
      data.forEach((item) => {
        const categoryExists = categories.some(
          cat => cat.category === item.category && cat.subCategory === item.subCategory
        );
        if (!categoryExists) {
          const exists = missing.some(
            m => m.category === item.category && m.subCategory === item.subCategory
          );
          if (!exists) {
            missing.push({
              category: item.category,
              subCategory: item.subCategory
            });
          }
        }
      });

      setPreview(data);
      setMissingCategories(missing);
      setError(null);

      if (missing.length > 0) {
        setShowConfirmation(true);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async (createMissing = false) => {
    if (preview.length === 0) {
      setError('No data to import');
      return;
    }

    setImporting(true);
    try {
      await onImport(preview, missingCategories, createMissing);
      setFile(null);
      setPreview([]);
      setMissingCategories([]);
      setShowConfirmation(false);
    } catch (err) {
      setError('Error importing budgets: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleProceedWithoutCreating = async () => {
    // Filter out budgets with missing categories
    const validBudgets = preview.filter(item => {
      return categories.some(
        cat => cat.category === item.category && cat.subCategory === item.subCategory
      );
    });

    if (validBudgets.length === 0) {
      setError('No valid budgets to import. All rows have missing categories.');
      setShowConfirmation(false);
      return;
    }

    setImporting(true);
    try {
      await onImport(validBudgets, [], false);
      setFile(null);
      setPreview([]);
      setMissingCategories([]);
      setShowConfirmation(false);
    } catch (err) {
      setError('Error importing budgets: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-md">
        <h4 className="text-sm font-medium text-blue-800 mb-2">CSV Format Requirements:</h4>
        <p className="text-sm text-blue-700">
          Your CSV file must include these columns (in any order):
        </p>
        <ul className="list-disc list-inside text-sm text-blue-700 mt-1">
          <li>Category</li>
          <li>SubCategory</li>
          <li>Budget</li>
        </ul>
        <p className="text-xs text-blue-600 mt-2">
          Example: Category,SubCategory,Budget
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Budgets will be imported for year: <span className="font-semibold">{selectedYear}</span>
        </p>
      </div>

      <div className="mb-4">
        <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700 mb-2">
          Select CSV File
        </label>
        <input
          id="csv-file"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {showConfirmation && missingCategories.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">
            Missing Categories/Subcategories Found
          </h4>
          <p className="text-sm text-yellow-700 mb-3">
            The following categories and subcategories do not exist:
          </p>
          <div className="max-h-32 overflow-y-auto bg-white rounded border border-yellow-200 p-2">
            <ul className="list-disc list-inside text-sm text-yellow-800">
              {missingCategories.map((item, index) => (
                <li key={index}>
                  {item.category} - {item.subCategory}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-yellow-700 mt-3">
            Would you like to create these categories and subcategories?
          </p>
          <div className="flex space-x-3 mt-3">
            <Button
              onClick={() => handleImport(true)}
              disabled={importing}
              variant="primary"
            >
              {importing ? 'Creating and Importing...' : 'Yes, Create and Import'}
            </Button>
            <Button
              onClick={handleProceedWithoutCreating}
              disabled={importing}
              variant="secondary"
            >
              No, Import Only Valid Entries
            </Button>
            <Button
              onClick={() => {
                setShowConfirmation(false);
                setPreview([]);
                setFile(null);
              }}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {preview.length > 0 && !showConfirmation && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Preview ({preview.length} budgets)
          </h4>
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">SubCategory</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Budget</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.slice(0, 10).map((budget, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 text-sm text-gray-900">{budget.category}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{budget.subCategory}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">${budget.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 10 && (
              <div className="bg-gray-50 px-3 py-2 text-sm text-gray-500 text-center">
                ... and {preview.length - 10} more budgets
              </div>
            )}
          </div>
        </div>
      )}

      {preview.length > 0 && !showConfirmation && missingCategories.length === 0 && (
        <div className="flex space-x-3 pt-4">
          <Button
            onClick={() => handleImport(false)}
            disabled={importing}
            variant="primary"
          >
            {importing ? 'Importing...' : `Import ${preview.length} Budgets`}
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ImportBudgets;
