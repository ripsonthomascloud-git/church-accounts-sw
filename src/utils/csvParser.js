/**
 * CSV Parser Utility
 * Reusable utility for parsing CSV files
 */

/**
 * Parse CSV text and convert to array of objects
 * @param {string} csvText - Raw CSV text content
 * @param {Object} options - Parser options
 * @param {Array<string>} options.requiredFields - Required field names (lowercase)
 * @param {Object} options.fieldMapping - Map CSV headers to object keys
 * @returns {Object} - { success, data, error }
 */
export const parseCSV = (csvText, options = {}) => {
  const { requiredFields = [], fieldMapping = {} } = options;

  try {
    const lines = csvText.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return {
        success: false,
        error: 'CSV file must contain a header row and at least one data row',
        data: []
      };
    }

    // Parse headers
    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());

    // Check for required fields
    if (requiredFields.length > 0) {
      const missingFields = requiredFields.filter(field =>
        !headers.includes(field.toLowerCase())
      );

      if (missingFields.length > 0) {
        return {
          success: false,
          error: `CSV is missing required columns: ${missingFields.join(', ')}`,
          data: []
        };
      }
    }

    // Parse data rows
    const data = lines.slice(1).map((line, lineIndex) => {
      const values = parseCSVLine(line);
      const row = {};

      headers.forEach((header, index) => {
        const value = values[index] ? values[index].trim() : '';
        const mappedKey = fieldMapping[header] || header;
        row[mappedKey] = value;
      });

      return row;
    });

    return {
      success: true,
      data,
      error: null
    };

  } catch (error) {
    return {
      success: false,
      error: `Error parsing CSV: ${error.message}`,
      data: []
    };
  }
};

/**
 * Parse a single CSV line, handling quoted fields properly
 * @param {string} line - Single CSV line
 * @returns {Array<string>} - Array of field values
 */
const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Push last field
  result.push(current);

  return result;
};

/**
 * Read file as text
 * @param {File} file - File object from input
 * @returns {Promise<string>} - File contents as text
 */
export const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

/**
 * Validate file type
 * @param {File} file - File object
 * @returns {boolean} - True if valid CSV file
 */
export const isValidCSVFile = (file) => {
  if (!file) return false;
  return file.type === 'text/csv' || file.name.endsWith('.csv');
};
