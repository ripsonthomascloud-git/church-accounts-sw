import { parseCSV, readFileAsText } from '../utils/csvParser';

/**
 * Convert Google Drive sharing URL to direct image URL
 * @param {string} url - Google Drive sharing URL
 * @returns {string|null} - Direct image URL or null if invalid
 */
export const convertGoogleDriveUrl = (url) => {
  if (!url || typeof url !== 'string' || url.trim() === '') return null;

  const trimmedUrl = url.trim();

  // Pattern 1: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const pattern1 = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match1 = trimmedUrl.match(pattern1);
  if (match1) {
    return `https://drive.google.com/uc?export=view&id=${match1[1]}`;
  }

  // Pattern 2: https://drive.google.com/open?id=FILE_ID
  const pattern2 = /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/;
  const match2 = trimmedUrl.match(pattern2);
  if (match2) {
    return `https://drive.google.com/uc?export=view&id=${match2[1]}`;
  }

  // Pattern 3: Already a direct URL
  if (trimmedUrl.includes('drive.google.com/uc?')) {
    return trimmedUrl;
  }

  // Pattern 4: Direct image URL (non-Google Drive)
  if (trimmedUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return trimmedUrl;
  }

  // Pattern 5: Any http/https URL (return as-is, let browser handle it)
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }

  // Invalid or unsupported format
  return null;
};

/**
 * Parse City/State/ZIP string into separate components
 * @param {string} text - Combined address string (e.g., "Springfield, IL 62701")
 * @returns {object} - { city, state, zipCode }
 */
export const parseCityStateZip = (text) => {
  if (!text || typeof text !== 'string') {
    return { city: '', state: '', zipCode: '' };
  }

  const trimmed = text.trim();

  // Pattern: "City, State ZIP" or "City, ST ZIP"
  const pattern1 = /^(.+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/;
  const match1 = trimmed.match(pattern1);
  if (match1) {
    return {
      city: match1[1].trim(),
      state: match1[2].trim(),
      zipCode: match1[3].trim()
    };
  }

  // Pattern: "City State ZIP" (no comma)
  const pattern2 = /^(.+)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/;
  const match2 = trimmed.match(pattern2);
  if (match2) {
    return {
      city: match2[1].trim(),
      state: match2[2].trim(),
      zipCode: match2[3].trim()
    };
  }

  // Pattern: "City, State" (no ZIP)
  const pattern3 = /^(.+),\s*([A-Z]{2})$/;
  const match3 = trimmed.match(pattern3);
  if (match3) {
    return {
      city: match3[1].trim(),
      state: match3[2].trim(),
      zipCode: ''
    };
  }

  // Fallback: just city
  return {
    city: trimmed,
    state: '',
    zipCode: ''
  };
};

/**
 * Parse and normalize date of birth (mm-dd format)
 * @param {string} dobString - Date of birth string
 * @returns {string|null} - Normalized "MM-DD" or null if invalid
 */
export const parseDateOfBirth = (dobString) => {
  if (!dobString || typeof dobString !== 'string') return null;

  const trimmed = dobString.trim();
  if (trimmed === '') return null;

  // Pattern: mm-dd or m-d
  const pattern = /^(\d{1,2})-(\d{1,2})$/;
  const match = trimmed.match(pattern);

  if (match) {
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');

    // Basic validation
    const monthNum = parseInt(month, 10);
    const dayNum = parseInt(day, 10);

    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      return `${month}-${day}`;
    }
  }

  return null;
};

/**
 * Parse date of marriage (mm-dd-yyyy format) to Date object
 * @param {string} domString - Date of marriage string
 * @returns {Date|null} - Date object or null if invalid
 */
export const parseDateOfMarriage = (domString) => {
  if (!domString || typeof domString !== 'string') return null;

  const trimmed = domString.trim();
  if (trimmed === '') return null;

  // Pattern: mm-dd-yyyy or m-d-yyyy
  const pattern = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;
  const match = trimmed.match(pattern);

  if (match) {
    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    // Create Date object (month is 0-indexed in JavaScript)
    const date = new Date(year, month - 1, day);

    // Validate the date is valid
    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  return null;
};

/**
 * Helper function to find value in CSV row with multiple possible key formats
 * @param {object} csvRow - Parsed CSV row object
 * @param {Array<string>} possibleKeys - Array of possible key variations
 * @returns {string} - Found value or empty string
 */
const findValueByKeys = (csvRow, possibleKeys) => {
  for (const key of possibleKeys) {
    if (csvRow[key] !== undefined && csvRow[key] !== null) {
      return csvRow[key];
    }
  }
  return '';
};

/**
 * Extract members from CSV row (Member 1-12)
 * @param {object} csvRow - Parsed CSV row object
 * @param {object} headerMap - Map of lowercase headers to their original case
 * @returns {Array} - Array of member objects
 */
export const extractMembers = (csvRow, headerMap) => {
  const members = [];

  for (let i = 1; i <= 12; i++) {
    // Build multiple possible keys for each member field to handle header variations
    const memberKeys = [`member ${i}`, `member${i}`, `m${i}`];

    // DOB: try different formats (with/without spaces, with/without parentheses, etc.)
    const dobKeys = [
      `m${i} dob (mm-dd)`,
      `m${i} dob`,
      `m${i}dob`,
      `m${i} dob (mm-dd-yyyy)`,
      `m${i} date of birth`,
      `member ${i} dob`,
      `member${i} dob`
    ];

    // DOM: try different formats
    const domKeys = [
      `m${i} dom (mm-dd-yyyy)`,
      `m${i} dom`,
      `m${i}dom`,
      `m${i} date of marriage`,
      `member ${i} dom`,
      `member${i} dom`
    ];

    // Phone: try different formats
    const phoneKeys = [
      `m${i} ph. no`,
      `m${i} ph`,
      `m${i} phone`,
      `m${i}ph`,
      `m${i} ph no`,
      `m${i} ph.no`,
      `member ${i} phone`,
      `member${i} phone`
    ];

    // Email: try different formats
    const emailKeys = [
      `m${i} email`,
      `m${i}email`,
      `member ${i} email`,
      `member${i} email`
    ];

    // Get values from CSV row using flexible matching
    const name = findValueByKeys(csvRow, memberKeys);
    const dob = findValueByKeys(csvRow, dobKeys);
    const dom = findValueByKeys(csvRow, domKeys);
    const phone = findValueByKeys(csvRow, phoneKeys);
    const email = findValueByKeys(csvRow, emailKeys);

    // Debug logging for DOB parsing
    if (name.trim() !== '' && dob) {
      const parsedDob = parseDateOfBirth(dob);
      console.log(`Member ${i}: ${name.trim()} - DOB raw: "${dob}" -> parsed: "${parsedDob}"`);
    }

    // Only add member if name is present
    if (name.trim() !== '') {
      members.push({
        name: name.trim(),
        dateOfBirth: parseDateOfBirth(dob),
        dateOfMarriage: parseDateOfMarriage(dom),
        phone: phone.trim(),
        email: email.trim(),
        isPrimary: i === 1 // First member is primary
      });
    }
  }

  return members;
};

/**
 * Validate family data
 * @param {object} family - Family object
 * @returns {object} - { valid, errors }
 */
export const validateFamilyData = (family) => {
  const errors = [];

  // Required: family name
  if (!family.familyName || family.familyName.trim() === '') {
    errors.push('Family name is required');
  }

  // Required: at least one member
  if (!family.members || family.members.length === 0) {
    errors.push('At least one family member is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Parse Parish Directory CSV
 * @param {string} csvText - Raw CSV text
 * @returns {object} - { success, data, error, errors }
 */
export const parseParishDirectoryCSV = (csvText) => {
  // Define field mapping for CSV headers (case-insensitive)
  const fieldMapping = {
    'name': 'familyName',
    'prayer group': 'prayerGroup',
    'address': 'address',
    'city/state/zip': 'cityStateZip',
    'home ph': 'homePhone',
    'mobile ph': 'mobilePhone',
    'email': 'email',
    'home parish': 'homeParish',
    '@image': 'photoUrl',
    '@image (paste image links from the drive into below cells)': 'photoUrl'
  };

  // Required fields for CSV
  const requiredFields = ['name'];

  // Parse CSV using utility
  const parseResult = parseCSV(csvText, { requiredFields, fieldMapping });

  if (!parseResult.success) {
    return parseResult;
  }

  // Transform data
  const transformedData = [];
  const rowErrors = [];

  // Debug: Log the headers found in the CSV (only once)
  if (parseResult.data.length > 0) {
    const sampleHeaders = Object.keys(parseResult.data[0]);
    const dobHeaders = sampleHeaders.filter(h => h.includes('dob'));
    console.log('DOB-related headers found in CSV:', dobHeaders);
  }

  parseResult.data.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because index is 0-based and we skip header

    try {
      // Parse city/state/zip
      const { city, state, zipCode } = parseCityStateZip(row.cityStateZip || '');

      // Extract members (1-12)
      const members = extractMembers(row, {});

      // Build family object
      const family = {
        familyName: (row.familyName || '').trim(),
        prayerGroup: (row.prayerGroup || '').trim(),
        address: (row.address || '').trim(),
        city: city,
        state: state,
        zipCode: zipCode,
        homePhone: (row.homePhone || '').trim(),
        mobilePhone: (row.mobilePhone || '').trim(),
        email: (row.email || '').trim(),
        homeParish: (row.homeParish || '').trim(),
        photoUrl: convertGoogleDriveUrl(row.photoUrl || ''),
        members: members,
        isActive: true
      };

      // Validate family data
      const validation = validateFamilyData(family);

      if (validation.valid) {
        transformedData.push(family);
      } else {
        rowErrors.push({
          row: rowNumber,
          familyName: family.familyName || 'Unknown',
          errors: validation.errors
        });
      }
    } catch (error) {
      rowErrors.push({
        row: rowNumber,
        familyName: row.familyName || 'Unknown',
        errors: [`Error processing row: ${error.message}`]
      });
    }
  });

  // Return results
  if (transformedData.length === 0 && rowErrors.length > 0) {
    return {
      success: false,
      data: [],
      error: 'No valid families found in CSV',
      errors: rowErrors
    };
  }

  return {
    success: true,
    data: transformedData,
    error: null,
    errors: rowErrors.length > 0 ? rowErrors : null
  };
};

/**
 * Import parish directory from CSV file
 * @param {File} file - CSV file object
 * @returns {Promise<object>} - { success, data, error, errors }
 */
export const importParishDirectoryFromFile = async (file) => {
  try {
    const csvText = await readFileAsText(file);
    return parseParishDirectoryCSV(csvText);
  } catch (error) {
    return {
      success: false,
      data: [],
      error: `Error reading file: ${error.message}`,
      errors: null
    };
  }
};
