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
 * @param {Array} members - Array of member objects for name resolution (optional)
 * @returns {Array} - Array of potential matching transactions with scores
 */
export const findFuzzyMatches = (bankStatement, transactions, members = []) => {
  if (!bankStatement || !transactions) return [];

  const expectedTransactionType = getTransactionType(bankStatement.amount);
  
  // Get search terms from both comment and description
  const searchTerms = [];
  if (bankStatement.comment?.trim()) {
    searchTerms.push(bankStatement.comment.trim());
  }
  if (bankStatement.description?.trim()) {
    searchTerms.push(bankStatement.description.trim());
  }

  const matches = transactions.filter(transaction => {
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

  // Calculate match scores using all search terms
  return matches.map(transaction => {
    const searchableTexts = getTransactionSearchableText(transaction, members);
    let bestScore = 0;
    let matchedField = '';

    // Check each search term against each searchable field
    for (const searchTerm of searchTerms) {
      for (const text of searchableTexts) {
        const score = fuzzyMatchScore(searchTerm, text);
        if (score > bestScore) {
          bestScore = score;
          matchedField = text;
        }
      }
    }

    return {
      ...transaction,
      matchScore: bestScore,
      matchedField: matchedField
    };
  })
  .filter(t => t.matchScore > 0) // Only include transactions with some match
  .sort((a, b) => {
    // Sort by match score (highest first), then by date proximity
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    // Secondary sort by date proximity
    const dateA = normalizeDate(a.date);
    const dateB = normalizeDate(b.date);
    const statementDate = normalizeDate(bankStatement.postingDate);
    if (dateA && dateB && statementDate) {
      const diffA = Math.abs(dateA.getTime() - statementDate.getTime());
      const diffB = Math.abs(dateB.getTime() - statementDate.getTime());
      return diffA - diffB;
    }
    return 0;
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
 * Extract searchable text from a transaction
 * @param {Object} transaction - Transaction object
 * @param {Array} members - Array of member objects
 * @returns {Array} - Array of searchable strings
 */
const getTransactionSearchableText = (transaction, members = []) => {
  const searchableTexts = [];

  // Add member name if available
  if (transaction.memberName) {
    searchableTexts.push(transaction.memberName);
  } else if (transaction.memberId && members && members.length > 0) {
    const member = members.find(m => m.id === transaction.memberId);
    if (member) {
      const fullName = `${member.firstName} ${member.lastName}`.trim();
      if (fullName) searchableTexts.push(fullName);
      if (member.firstName) searchableTexts.push(member.firstName);
      if (member.lastName) searchableTexts.push(member.lastName);
    }
  }

  // Add payee name for expenses
  if (transaction.payeeName) {
    searchableTexts.push(transaction.payeeName);
  }

  // Add category and subcategory
  if (transaction.category) {
    searchableTexts.push(transaction.category);
  }
  if (transaction.subCategory) {
    searchableTexts.push(transaction.subCategory);
  }

  // Add description
  if (transaction.description) {
    searchableTexts.push(transaction.description);
  }

  return searchableTexts.filter(text => text && text.trim().length > 0);
};

/**
 * Calculate fuzzy match score between two strings with enhanced word-by-word matching
 * @param {string} str1 - First string (bank statement comment)
 * @param {string} str2 - Second string (transaction field)
 * @returns {number} - Match score (0-100)
 */
const fuzzyMatchScore = (str1, str2) => {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) return 100;

  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 90;

  // Split into words and check for word matches
  const words1 = s1.split(/\s+/).filter(w => w.length > 0);
  const words2 = s2.split(/\s+/).filter(w => w.length > 0);

  let matchingWords = 0;
  let exactWordMatches = 0;
  let partialWordMatches = 0;

  // Check each word from comment against each word in transaction
  for (const word1 of words1) {
    let bestMatchForWord = 0;
    
    for (const word2 of words2) {
      // Skip very short words (less than 2 characters)
      if (word1.length < 2 && word2.length < 2) continue;

      // Exact word match (case-insensitive)
      if (word1 === word2) {
        bestMatchForWord = Math.max(bestMatchForWord, 3);
        exactWordMatches++;
      }
      // One word contains the other (for partial matches like "John" in "Johnson")
      else if (word1.length >= 3 && word2.length >= 3) {
        if (word1.includes(word2) || word2.includes(word1)) {
          bestMatchForWord = Math.max(bestMatchForWord, 2);
          partialWordMatches++;
        }
        // Check for substring match with at least 3 characters
        else if (word1.length >= 4 && word2.length >= 4) {
          // Find longest common substring
          const minLen = Math.min(word1.length, word2.length);
          for (let len = minLen; len >= 3; len--) {
            let found = false;
            for (let i = 0; i <= word1.length - len; i++) {
              const substr = word1.substring(i, i + len);
              if (word2.includes(substr)) {
                bestMatchForWord = Math.max(bestMatchForWord, 1);
                found = true;
                break;
              }
            }
            if (found) break;
          }
        }
      }
      // For 2-character words, require exact match
      else if (word1.length === 2 && word2.length === 2 && word1 === word2) {
        bestMatchForWord = Math.max(bestMatchForWord, 2);
      }
    }
    
    matchingWords += bestMatchForWord;
  }

  // Calculate score with weighted emphasis on matches
  const totalWords = Math.max(words1.length, words2.length);
  if (totalWords === 0) return 0;

  // Base score from matching words
  const baseScore = (matchingWords / (totalWords * 3)) * 100;

  // Bonus for having multiple exact word matches
  const exactMatchBonus = Math.min(exactWordMatches * 5, 20);

  // Final score
  const finalScore = Math.min(Math.round(baseScore + exactMatchBonus), 95);

  return finalScore;
};

/**
 * Find comment-based matches for a bank statement using fuzzy matching
 * @param {Object} bankStatement - Bank statement to match
 * @param {Array} transactions - All transactions (both income and expenses)
 * @param {Array} members - Array of member objects for name resolution
 * @param {number} minScore - Minimum match score (default: 60)
 * @returns {Array} - Array of potential matching transactions with scores
 */
export const findCommentBasedMatches = (bankStatement, transactions, members = [], minScore = 60) => {
  if (!bankStatement || !transactions || !bankStatement.comment) return [];

  const comment = bankStatement.comment.trim();
  if (!comment) return [];

  const expectedTransactionType = getTransactionType(bankStatement.amount);
  const matches = [];

  for (const transaction of transactions) {
    // Skip already reconciled transactions
    if (transaction.isReconciled) continue;

    // Must be correct transaction type
    if (transaction.transactionType !== expectedTransactionType) continue;

    // Must match account type
    if (transaction.accountType !== bankStatement.accountType) continue;

    // Get all searchable text from the transaction
    const searchableTexts = getTransactionSearchableText(transaction, members);

    // Calculate best match score
    let bestScore = 0;
    let matchedField = '';

    for (const text of searchableTexts) {
      const score = fuzzyMatchScore(comment, text);
      if (score > bestScore) {
        bestScore = score;
        matchedField = text;
      }
    }

    // If score meets threshold, add to matches
    if (bestScore >= minScore) {
      matches.push({
        ...transaction,
        matchScore: bestScore,
        matchedField: matchedField
      });
    }
  }

  // Sort by match score (highest first), then by date proximity
  return matches.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    // Secondary sort by date proximity
    const dateA = normalizeDate(a.date);
    const dateB = normalizeDate(b.date);
    const statementDate = normalizeDate(bankStatement.postingDate);
    if (dateA && dateB && statementDate) {
      const diffA = Math.abs(dateA.getTime() - statementDate.getTime());
      const diffB = Math.abs(dateB.getTime() - statementDate.getTime());
      return diffA - diffB;
    }
    return 0;
  });
};

/**
 * Find all matches (exact + fuzzy + amount-based + comment-based) for a bank statement
 * @param {Object} bankStatement - Bank statement to match
 * @param {Array} incomeTransactions - Income transactions
 * @param {Array} expenseTransactions - Expense transactions
 * @param {Array} members - Array of member objects (optional)
 * @returns {Object} - { exactMatches: [], fuzzyMatches: [], amountMatches: [], commentMatches: [] }
 */
export const findMatches = (bankStatement, incomeTransactions, expenseTransactions, members = []) => {
  // Combine all transactions with type indicator
  const allTransactions = [
    ...incomeTransactions.map(t => ({ ...t, transactionType: 'income' })),
    ...expenseTransactions.map(t => ({ ...t, transactionType: 'expenses' }))
  ];

  const exactMatches = findExactMatches(bankStatement, allTransactions);

  // Get fuzzy matches that are not already in exact matches
  const exactMatchIds = new Set(exactMatches.map(m => m.id));
  const fuzzyMatches = findFuzzyMatches(bankStatement, allTransactions, members)
    .filter(m => !exactMatchIds.has(m.id));

  // Get amount-based matches that are not already in exact or fuzzy matches
  const allMatchIds = new Set([...exactMatchIds, ...fuzzyMatches.map(m => m.id)]);
  const amountMatches = findAmountBasedMatches(bankStatement, allTransactions)
    .filter(m => !allMatchIds.has(m.id));

  // Get comment-based matches that are not already in other categories
  const existingMatchIds = new Set([...allMatchIds, ...amountMatches.map(m => m.id)]);
  const commentMatches = findCommentBasedMatches(bankStatement, allTransactions, members)
    .filter(m => !existingMatchIds.has(m.id));

  return {
    exactMatches,
    fuzzyMatches,
    amountMatches,
    commentMatches
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
  const excluded = bankStatements.filter(s => s.isExcluded).length;
  const unreconciled = total - reconciled - excluded;

  return {
    total,
    reconciled,
    unreconciled,
    excluded,
    percentReconciled: (total - excluded) > 0 ? Math.round((reconciled / (total - excluded)) * 100) : 0
  };
};
