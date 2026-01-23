/**
 * Reconciliation Matcher Utility
 * Provides algorithms for matching bank statements with transactions
 */

/**
 * Convert Firestore timestamp or Date to local midnight
 * @param {*} date - Date object or Firestore timestamp
 * @returns {Date} - Date at local midnight
 */
const normalizeDate = (date) => {
  if (!date) return null;

  let jsDate;
  if (date.toDate) {
    // Firestore timestamp
    jsDate = date.toDate();
  } else if (date instanceof Date) {
    jsDate = date;
  } else {
    jsDate = new Date(date);
  }

  // Return date at local midnight
  return new Date(jsDate.getFullYear(), jsDate.getMonth(), jsDate.getDate());
};

/**
 * Check if two dates are the same day
 * @param {*} date1 - First date
 * @param {*} date2 - Second date
 * @returns {boolean} - True if same day
 */
const isSameDay = (date1, date2) => {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);

  if (!d1 || !d2) return false;

  return d1.getTime() === d2.getTime();
};

/**
 * Check if date1 is within +/- days of date2
 * @param {*} date1 - First date
 * @param {*} date2 - Second date
 * @param {number} days - Number of days tolerance
 * @returns {boolean} - True if within range
 */
const isWithinDays = (date1, date2, days) => {
  const d1 = normalizeDate(date1);
  const d2 = normalizeDate(date2);

  if (!d1 || !d2) return false;

  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays <= days;
};

/**
 * Check if two amounts match (within tolerance)
 * @param {number} amount1 - First amount
 * @param {number} amount2 - Second amount
 * @param {number} tolerance - Tolerance (default: 0.01)
 * @returns {boolean} - True if amounts match
 */
const amountsMatch = (amount1, amount2, tolerance = 0.01) => {
  const diff = Math.abs(Math.abs(amount1) - Math.abs(amount2));
  return diff <= tolerance;
};

/**
 * Get transaction type based on bank statement amount
 * @param {number} bankStatementAmount - Amount from bank statement
 * @returns {string} - "expenses" or "income"
 */
const getTransactionType = (bankStatementAmount) => {
  // Negative amount = money out = expense
  // Positive amount = money in = income
  return bankStatementAmount < 0 ? 'expenses' : 'income';
};

/**
 * Find exact matches for a bank statement
 * @param {Object} bankStatement - Bank statement to match
 * @param {Array} transactions - All transactions (both income and expenses)
 * @returns {Array} - Array of matching transactions
 */
export const findExactMatches = (bankStatement, transactions) => {
  if (!bankStatement || !transactions) return [];

  const expectedTransactionType = getTransactionType(bankStatement.amount);

  return transactions.filter(transaction => {
    // Skip already reconciled transactions
    if (transaction.isReconciled) return false;

    // Must be correct transaction type
    if (transaction.transactionType !== expectedTransactionType) return false;

    // Must match account type
    if (transaction.accountType !== bankStatement.accountType) return false;

    // Must be same day
    if (!isSameDay(transaction.date, bankStatement.postingDate)) return false;

    // Must match amount (within tolerance)
    if (!amountsMatch(Math.abs(bankStatement.amount), transaction.amount)) return false;

    return true;
  });
};

/**
 * Find fuzzy matches for a bank statement
 * @param {Object} bankStatement - Bank statement to match
 * @param {Array} transactions - All transactions (both income and expenses)
 * @returns {Array} - Array of potential matching transactions
 */
export const findFuzzyMatches = (bankStatement, transactions) => {
  if (!bankStatement || !transactions) return [];

  const expectedTransactionType = getTransactionType(bankStatement.amount);

  return transactions.filter(transaction => {
    // Skip already reconciled transactions
    if (transaction.isReconciled) return false;

    // Must be correct transaction type
    if (transaction.transactionType !== expectedTransactionType) return false;

    // Must match account type
    if (transaction.accountType !== bankStatement.accountType) return false;

    // Must be within 3 days
    if (!isWithinDays(transaction.date, bankStatement.postingDate, 3)) return false;

    // Must match amount (within tolerance)
    if (!amountsMatch(Math.abs(bankStatement.amount), transaction.amount)) return false;

    return true;
  });
};

/**
 * Find amount-based matches for a bank statement (no date restrictions)
 * @param {Object} bankStatement - Bank statement to match
 * @param {Array} transactions - All transactions (both income and expenses)
 * @returns {Array} - Array of potential matching transactions
 */
export const findAmountBasedMatches = (bankStatement, transactions) => {
  if (!bankStatement || !transactions) return [];

  const expectedTransactionType = getTransactionType(bankStatement.amount);

  return transactions.filter(transaction => {
    // Skip already reconciled transactions
    if (transaction.isReconciled) return false;

    // Must be correct transaction type
    if (transaction.transactionType !== expectedTransactionType) return false;

    // Must match account type
    if (transaction.accountType !== bankStatement.accountType) return false;

    // Must match amount (within tolerance)
    if (!amountsMatch(Math.abs(bankStatement.amount), transaction.amount)) return false;

    return true;
  });
};

/**
 * Find all matches (exact + fuzzy + amount-based) for a bank statement
 * @param {Object} bankStatement - Bank statement to match
 * @param {Array} incomeTransactions - Income transactions
 * @param {Array} expenseTransactions - Expense transactions
 * @returns {Object} - { exactMatches: [], fuzzyMatches: [], amountMatches: [] }
 */
export const findMatches = (bankStatement, incomeTransactions, expenseTransactions) => {
  // Combine all transactions with type indicator
  const allTransactions = [
    ...incomeTransactions.map(t => ({ ...t, transactionType: 'income' })),
    ...expenseTransactions.map(t => ({ ...t, transactionType: 'expenses' }))
  ];

  const exactMatches = findExactMatches(bankStatement, allTransactions);

  // Get fuzzy matches that are not already in exact matches
  const exactMatchIds = new Set(exactMatches.map(m => m.id));
  const fuzzyMatches = findFuzzyMatches(bankStatement, allTransactions)
    .filter(m => !exactMatchIds.has(m.id));

  // Get amount-based matches that are not already in exact or fuzzy matches
  const allMatchIds = new Set([...exactMatchIds, ...fuzzyMatches.map(m => m.id)]);
  const amountMatches = findAmountBasedMatches(bankStatement, allTransactions)
    .filter(m => !allMatchIds.has(m.id));

  return {
    exactMatches,
    fuzzyMatches,
    amountMatches
  };
};

/**
 * Get reconciliation statistics
 * @param {Array} bankStatements - All bank statements
 * @returns {Object} - Statistics object
 */
export const getReconciliationStats = (bankStatements) => {
  const total = bankStatements.length;
  const reconciled = bankStatements.filter(s => s.isReconciled).length;
  const unreconciled = total - reconciled;

  return {
    total,
    reconciled,
    unreconciled,
    percentReconciled: total > 0 ? Math.round((reconciled / total) * 100) : 0
  };
};
