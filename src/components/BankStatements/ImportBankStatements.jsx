import { useState } from 'react';
import Button from '../common/Button';
import { parseBankStatementCSV, readFileAsText } from '../../services/bankStatementService';
import { isValidCSVFile } from '../../utils/csvParser';

const ImportBankStatements = ({ onImport, onCancel }) => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState(null);
  const [accountType, setAccountType] = useState('Operating');

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];

    if (!selectedFile) {
      return;
    }

    if (!isValidCSVFile(selectedFile)) {
      setError('Please select a valid CSV file');
      setFile(null);
      setPreview([]);
      return;
    }

    setFile(selectedFile);
    setError(null);

    try {
      const csvText = await readFileAsText(selectedFile);
      const result = parseBankStatementCSV(csvText);

      if (!result.success) {
        setError(result.error);
        setPreview([]);
        return;
      }

      setPreview(result.data);
      setError(null);
    } catch (err) {
      setError(`Error reading file: ${err.message}`);
      setPreview([]);
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      setError('No data to import');
      return;
    }

    setImporting(true);
    try {
      await onImport(file, accountType);
      setFile(null);
      setPreview([]);
      setAccountType('Operating');
    } catch (err) {
      setError('Error importing bank statements: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date instanceof Date ? date.toLocaleDateString() : new Date(date).toLocaleDateString();
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-md">
        <h4 className="text-sm font-medium text-blue-800 mb-2">CSV Format Requirements:</h4>
        <p className="text-sm text-blue-700">
          Your CSV file must include these columns (in any order):
        </p>
        <ul className="list-disc list-inside text-sm text-blue-700 mt-1">
          <li>Details</li>
          <li>Posting Date</li>
          <li>Description</li>
          <li>Amount</li>
          <li>Type</li>
          <li>Balance (optional, defaults to 0 if blank)</li>
          <li>Check or Slip #</li>
        </ul>
        <p className="text-xs text-blue-600 mt-2">
          Note: All records from the CSV will be imported without duplicate checking.
        </p>
      </div>

      <div>
        <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 mb-2">
          Account Type
        </label>
        <select
          id="accountType"
          value={accountType}
          onChange={(e) => setAccountType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Operating">Operating</option>
          <option value="Building">Building</option>
        </select>
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

      {preview.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Preview ({preview.length} statements) - Account Type: {accountType}
          </h4>
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Posting Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check #</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.map((statement, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                      {formatDate(statement.postingDate)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate">
                      {statement.description}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        statement.type === 'Debit'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {statement.type}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-sm font-medium text-right ${
                      statement.amount < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatAmount(statement.amount)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 text-right">
                      {formatAmount(statement.balance)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {statement.checkOrSlipNumber || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex space-x-3 pt-4">
        <Button
          onClick={handleImport}
          disabled={preview.length === 0 || importing}
          variant="primary"
        >
          {importing ? 'Importing...' : `Import ${preview.length} Statements`}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
};

export default ImportBankStatements;
