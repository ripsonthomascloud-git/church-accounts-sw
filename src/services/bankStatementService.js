import { setDocument } from './firebase';
import { parseCSV, readFileAsText as readFile } from '../utils/csvParser';

// Re-export for convenience
export { readFile as readFileAsText };

/**
 * Generate unique key for bank statement (accountType_date_amount)
 * @param {Object} statement - Bank statement object
 * @returns {string} - Unique key
 */
export const generateUniqueKey = (statement) => {
  const dateStr = statement.postingDate instanceof Date
    ? statement.postingDate.toISOString().split('T')[0]
    : new Date(statement.postingDate).toISOString().split('T')[0];

  const amountStr = parseFloat(statement.amount).toFixed(2);
  return `${statement.accountType}_${dateStr}_${amountStr}`;
};

/**
 * Parse bank statement CSV data
 * @param {string} csvText - CSV content
 * @returns {Object} - { success, data, error }
 */
export const parseBankStatementCSV = (csvText) => {
  const fieldMapping = {
    'details': 'details',
    'posting date': 'postingDate',
    'description': 'description',
    'amount': 'amount',
    'type': 'type',
    'balance': 'balance',
    'check or slip #': 'checkOrSlipNumber'
  };

  const requiredFields = [
    'details',
    'posting date',
    'description',
    'amount',
    'type',
    'check or slip #'
  ];

  const result = parseCSV(csvText, { requiredFields, fieldMapping });

  if (!result.success) {
    return result;
  }

  // Transform data
  const transformedData = result.data.map((row, index) => {
    try {
      // Parse posting date
      let postingDate;
      if (row.postingDate) {
        postingDate = new Date(row.postingDate);
        if (isNaN(postingDate.getTime())) {
          throw new Error(`Invalid date format in row ${index + 2}`);
        }
      } else {
        throw new Error(`Missing posting date in row ${index + 2}`);
      }

      // Parse amount
      const amount = parseFloat(row.amount);
      if (isNaN(amount)) {
        throw new Error(`Invalid amount in row ${index + 2}: ${row.amount}`);
      }

      // Parse balance (allow blank values, default to 0)
      let balance = 0;
      if (row.balance && row.balance.trim() !== '') {
        balance = parseFloat(row.balance);
        if (isNaN(balance)) {
          throw new Error(`Invalid balance in row ${index + 2}: ${row.balance}`);
        }
      }

      return {
        details: row.details || '',
        postingDate,
        description: row.description || '',
        amount,
        type: row.type || '',
        balance,
        checkOrSlipNumber: row.checkOrSlipNumber || '',
      };
    } catch (error) {
      throw new Error(`Row ${index + 2}: ${error.message}`);
    }
  });

  return {
    success: true,
    data: transformedData,
    error: null
  };
};

/**
 * Process CSV import with duplicate detection
 * @param {Array} statements - Parsed bank statements
 * @param {string} accountType - "Operating" or "Building"
 * @returns {Promise<Object>} - Import results
 */
export const processCsvImport = async (statements, accountType) => {
  try {
    const results = {
      total: statements.length,
      created: 0,
      errors: []
    };

    // Generate a unique import batch ID to maintain order
    const importTimestamp = Date.now();

    // Process each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        const statement = {
          ...stmt,
          accountType,
          isReconciled: false,
          reconciledTransactionId: null,
          reconciledTransactionType: null,
          reconciledDate: null,
          importOrder: i, // Store the original order from CSV
          importTimestamp, // Store when this batch was imported
        };

        // Generate unique key for reference
        statement.uniqueKey = generateUniqueKey(statement);

        // Create new document with timestamp-based unique ID to avoid any conflicts
        const uniqueId = `${statement.uniqueKey}_${importTimestamp}_${i}`;
        await setDocument('bankStatements', uniqueId, statement);
        results.created++;
      } catch (error) {
        results.errors.push({
          rowNumber: i + 2, // +2 for header row and 0-index
          postingDate: stmt.postingDate,
          description: stmt.description,
          amount: stmt.amount,
          type: stmt.type,
          error: error.message
        });
      }
    }

    return {
      success: true,
      results
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Import bank statements from CSV file
 * @param {File} file - CSV file
 * @param {string} accountType - "Operating" or "Building"
 * @returns {Promise<Object>} - Import results
 */
export const importBankStatementsFromFile = async (file, accountType) => {
  try {
    // Read file
    const csvText = await readFile(file);

    // Parse CSV
    const parseResult = parseBankStatementCSV(csvText);

    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error
      };
    }

    // Process import
    const importResult = await processCsvImport(parseResult.data, accountType);

    return importResult;

  } catch (error) {
    return {
      success: false,
      error: `Import failed: ${error.message}`
    };
  }
};
