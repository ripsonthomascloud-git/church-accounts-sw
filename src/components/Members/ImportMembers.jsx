import { useState } from 'react';
import Button from '../common/Button';

const ImportMembers = ({ onImport, onCancel }) => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState(null);

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

  const parseCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        setError('CSV file must contain a header row and at least one data row');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const requiredFields = ['memberid', 'firstname', 'lastname', 'address', 'phone', 'email'];

      const missingFields = requiredFields.filter(field => !headers.includes(field));
      if (missingFields.length > 0) {
        setError(`CSV is missing required columns: ${missingFields.join(', ')}`);
        return;
      }

      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const member = {};
        headers.forEach((header, index) => {
          if (header === 'memberid') member.memberId = values[index];
          else if (header === 'firstname') member.firstName = values[index];
          else if (header === 'lastname') member.lastName = values[index];
          else if (header === 'address') member.address = values[index];
          else if (header === 'phone') member.phone = values[index];
          else if (header === 'email') member.email = values[index];
          else if (header === 'prayergroup') member.prayerGroup = values[index];
          else if (header === 'status') member.status = values[index] || 'active';
        });
        member.status = member.status || 'active';
        return member;
      });

      setPreview(data);
      setError(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      setError('No data to import');
      return;
    }

    setImporting(true);
    try {
      await onImport(preview);
      setFile(null);
      setPreview([]);
    } catch (err) {
      setError('Error importing members: ' + err.message);
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
          <li>memberid</li>
          <li>firstname</li>
          <li>lastname</li>
          <li>address</li>
          <li>phone</li>
          <li>email</li>
          <li>prayergroup (optional)</li>
          <li>status (optional: active or inactive, defaults to active)</li>
        </ul>
        <p className="text-xs text-blue-600 mt-2">
          Example: memberid,firstname,lastname,address,phone,email,prayergroup,status
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

      {preview.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Preview ({preview.length} members)
          </h4>
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Member ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">First Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prayer Group</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.slice(0, 5).map((member, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 text-sm text-gray-900">{member.memberId}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{member.firstName}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{member.lastName}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{member.address}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{member.email}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{member.phone}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{member.prayerGroup || '-'}</td>
                    <td className="px-3 py-2 text-sm text-gray-900">{member.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 5 && (
              <div className="bg-gray-50 px-3 py-2 text-sm text-gray-500 text-center">
                ... and {preview.length - 5} more members
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex space-x-3 pt-4">
        <Button
          onClick={handleImport}
          disabled={preview.length === 0 || importing}
          variant="primary"
        >
          {importing ? 'Importing...' : `Import ${preview.length} Members`}
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

export default ImportMembers;
