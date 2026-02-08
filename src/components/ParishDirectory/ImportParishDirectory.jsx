import { useState } from 'react';
import Button from '../common/Button';
import { importParishDirectoryFromFile } from '../../services/parishDirectoryService';
import { isValidCSVFile } from '../../utils/csvParser';
import { uploadImageFromUrl } from '../../services/imageUploadService';

const ImportParishDirectory = ({ onImport, onCancel }) => {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadLogs, setUploadLogs] = useState([]);

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
    setWarnings(null);

    try {
      const result = await importParishDirectoryFromFile(selectedFile);

      if (!result.success) {
        setError(result.error);
        setPreview([]);
        if (result.errors) {
          setWarnings(result.errors);
        }
        return;
      }

      setPreview(result.data);
      setError(null);

      // Show warnings if some rows had errors
      if (result.errors && result.errors.length > 0) {
        setWarnings(result.errors);
      }
    } catch (err) {
      setError(`Error reading file: ${err.message}`);
      setPreview([]);
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      setError('No valid families to import');
      return;
    }

    setImporting(true);
    setUploadProgress({ current: 0, total: preview.length, step: 'Starting import...' });
    setUploadLogs([]);
    setError(null);

    try {
      // Upload images to Firebase Storage
      const familiesWithStorageUrls = [];
      const uploadResults = {
        successful: 0,
        failed: 0,
        skipped: 0,
        failedFamilies: []
      };

      for (let i = 0; i < preview.length; i++) {
        const family = preview[i];

        setUploadProgress({
          current: i + 1,
          total: preview.length,
          step: `Processing ${family.familyName} (${i + 1}/${preview.length})...`
        });

        // If family has a photo URL, upload it to Firebase Storage
        let storageUrl = null;
        let uploadSuccess = false;

        if (family.photoUrl) {
          try {
            const logEntry = `[${i + 1}/${preview.length}] Uploading ${family.familyName}...`;
            setUploadLogs(prev => [...prev, logEntry]);
            console.log(logEntry);

            storageUrl = await uploadImageFromUrl(family.photoUrl, family.familyName);

            console.log(`Received URL for ${family.familyName}:`, storageUrl);

            // Check if it's a Firebase Storage URL (successful upload)
            if (storageUrl && (storageUrl.includes('storage.googleapis.com') || storageUrl.includes('firebasestorage.app'))) {
              uploadSuccess = true;
              uploadResults.successful++;
              const successLog = `✓ ${family.familyName} - Upload successful`;
              setUploadLogs(prev => [...prev, successLog]);
              console.log(successLog);
            } else {
              // Fallback URL returned (upload failed)
              uploadResults.failed++;
              uploadResults.failedFamilies.push(family.familyName);
              const failLog = `✗ ${family.familyName} - Upload failed (received: ${storageUrl ? storageUrl.substring(0, 50) + '...' : 'null'})`;
              setUploadLogs(prev => [...prev, failLog]);
              console.warn(failLog);
              storageUrl = null; // Don't save the Google Drive URL (won't work due to CORS)
            }
          } catch (uploadError) {
            const errorLog = `✗ ${family.familyName} - Error: ${uploadError.message}`;
            setUploadLogs(prev => [...prev, errorLog]);
            console.error(errorLog, uploadError);
            uploadResults.failed++;
            uploadResults.failedFamilies.push(family.familyName);
            storageUrl = null; // Don't save failed URLs
          }
        } else {
          uploadResults.skipped++;
          const skipLog = `- ${family.familyName} - No photo URL`;
          setUploadLogs(prev => [...prev, skipLog]);
        }

        familiesWithStorageUrls.push({
          ...family,
          photoUrl: storageUrl
        });

        // Add delay between uploads to avoid rate limiting
        if (i < preview.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Increased to 2 seconds
        }
      }

      setUploadProgress({ current: preview.length, total: preview.length, step: 'Saving to database...' });

      // Import families with Storage URLs
      await onImport(familiesWithStorageUrls);

      // Show summary
      if (uploadResults.failed > 0) {
        setWarnings([{
          row: 0,
          familyName: 'Import Summary',
          errors: [
            `✓ ${uploadResults.successful} images uploaded successfully`,
            `✗ ${uploadResults.failed} images failed: ${uploadResults.failedFamilies.join(', ')}`,
            'Failed images will show placeholder. You can edit and add images manually.'
          ]
        }]);
      }

      setFile(null);
      setPreview([]);
      setUploadProgress(null);
    } catch (err) {
      setError('Error importing families: ' + err.message);
      setUploadProgress(null);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-md">
        <h4 className="text-sm font-medium text-blue-800 mb-2">CSV Format Requirements:</h4>
        <p className="text-sm text-blue-700">
          Your CSV file must include these columns:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
          <div>
            <p className="text-xs font-semibold text-blue-800 mt-2">Family Information:</p>
            <ul className="list-disc list-inside text-xs text-blue-700">
              <li>Name (required)</li>
              <li>Prayer Group</li>
              <li>Address</li>
              <li>City/State/ZIP</li>
              <li>Home Ph</li>
              <li>Mobile Ph</li>
              <li>Email</li>
              <li>Home Parish</li>
              <li>@image (Google Drive link)</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-800 mt-2">Member Information (1-12):</p>
            <ul className="list-disc list-inside text-xs text-blue-700">
              <li>Member N (name)</li>
              <li>MN DOB (mm-dd)</li>
              <li>MN DOM (mm-dd-yyyy)</li>
              <li>MN Ph. No</li>
              <li>MN email</li>
            </ul>
            <p className="text-xs text-blue-600 mt-1">
              N ranges from 1 to 12 for each family member
            </p>
          </div>
        </div>
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

      {warnings && warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded max-h-48 overflow-y-auto">
          <h4 className="font-semibold mb-2">Warnings ({warnings.length} rows with issues):</h4>
          <ul className="list-disc list-inside text-sm space-y-1">
            {warnings.slice(0, 10).map((warning, idx) => (
              <li key={idx}>
                Row {warning.row} ({warning.familyName}): {warning.errors.join(', ')}
              </li>
            ))}
            {warnings.length > 10 && (
              <li className="text-xs italic">... and {warnings.length - 10} more warnings</li>
            )}
          </ul>
        </div>
      )}

      {preview.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Preview ({preview.length} families ready to import)
          </h4>
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Family Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prayer Group</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Members</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Photo</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.slice(0, 10).map((family, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900">
                      {family.familyName}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {family.prayerGroup || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-center text-gray-900">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        {family.members.length}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {family.photoUrl ? (
                        <div className="flex items-center justify-center" title={family.photoUrl}>
                          <img
                            src={family.photoUrl}
                            alt={family.familyName}
                            className="w-10 h-10 object-cover rounded border border-gray-300"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'inline';
                            }}
                          />
                          <span className="text-green-600 font-bold" style={{ display: 'none' }}>✓</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 max-w-xs truncate">
                      {family.email || family.homePhone || '—'}
                    </td>
                  </tr>
                ))}
                {preview.length > 10 && (
                  <tr>
                    <td colSpan="5" className="px-3 py-2 text-center text-sm text-gray-500 italic">
                      ... and {preview.length - 10} more families
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {uploadProgress && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-md space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">{uploadProgress.step}</span>
            <span className="text-sm text-blue-700">
              {uploadProgress.current} / {uploadProgress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
            />
          </div>
          {uploadLogs.length > 0 && (
            <div className="mt-3 max-h-60 overflow-y-auto bg-gray-900 text-gray-100 p-3 rounded text-xs font-mono">
              {uploadLogs.map((log, idx) => (
                <div key={idx} className={log.includes('✓') ? 'text-green-400' : log.includes('✗') ? 'text-red-400' : 'text-gray-400'}>
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex space-x-3 pt-4">
        <Button
          onClick={handleImport}
          disabled={preview.length === 0 || importing}
          variant="primary"
        >
          {importing ? 'Importing...' : `Import ${preview.length} Families`}
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

export default ImportParishDirectory;
