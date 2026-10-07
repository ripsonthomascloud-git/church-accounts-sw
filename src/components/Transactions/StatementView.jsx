import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const StatementView = ({ incomeTransactions = [], expenseTransactions = [], openingBalances = [], bankStatements = [] }) => {
  const [filterAccountType, setFilterAccountType] = useState('Operating');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterBankMatch, setFilterBankMatch] = useState(''); // '' | 'matched' | 'unmatched'
  const [filterBankOnly, setFilterBankOnly] = useState('include'); // 'include' | 'hide' | 'only'
  const [filterDescription, setFilterDescription] = useState('');
  const [filterType, setFilterType] = useState(''); // '' | 'income' | 'expense'
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubCategory, setFilterSubCategory] = useState('');
  // 'running' = date-by-date ledger, 'monthly' = monthly summary
  const [viewMode, setViewMode] = useState('running');
  // Checkbox selection: Set of row keys ("txType-id")
  const [selectedKeys, setSelectedKeys] = useState(null); // null = all selected

  const formatAmount = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  // Always extract date components in LOCAL time to avoid UTC-midnight timezone shift
  // (e.g. "2026-01-15" parsed as UTC becomes Dec 31 2025 in US timezones)
  const getDateObj = (date) => {
    if (!date) return null;
    if (date?.toDate) return date.toDate(); // Firestore Timestamp — already local
    if (date instanceof Date) return date;
    // ISO string — parse components to avoid timezone shift
    const str = String(date);
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return new Date(
        parseInt(isoMatch[1]),
        parseInt(isoMatch[2]) - 1,
        parseInt(isoMatch[3])
      );
    }
    return new Date(date);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = getDateObj(date);
    if (!d) return 'N/A';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${month}/${day}/${year}`;
  };

  const getDateStr = (date) => {
    const d = getDateObj(date);
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getMonthStr = (date) => {
    const d = getDateObj(date);
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // Look up the configured opening balance for a given year + accountType from the stored balances
  const getConfiguredOpeningBalance = useCallback((year, accountType) => {
    const match = openingBalances.find(
      b => b.year === year && (accountType ? b.accountType === accountType : !b.accountType)
    );
    return match ? (match.amount || 0) : 0;
  }, [openingBalances]);

  // Helper: build match key from date + amount + accountType
  // Normalizes accountType: null/undefined/'' all map to 'Operating' (the default account)
  const normalizeAccountType = (accountType) => accountType || 'Operating';

  const makeLookupKey = (date, amount, accountType) => {
    const dateStr = getDateStr(date);
    const absAmt = Math.abs(amount || 0).toFixed(2);
    const acct = normalizeAccountType(accountType);
    return `${dateStr}_${absAmt}_${acct}`;
  };

  // Combine income and expense into unified ledger rows, sorted oldest→newest by date then createdAt
  // (balance computation needs ascending; display reverses to newest-first)
  const allRows = useMemo(() => {
    const income = incomeTransactions.map(t => ({
      ...t,
      txType: 'income',
      signedAmount: Math.abs(t.amount || 0),
    }));
    const expense = expenseTransactions.map(t => ({
      ...t,
      txType: 'expense',
      signedAmount: -Math.abs(t.amount || 0),
    }));
    return [...income, ...expense].sort((a, b) => {
      const da = getDateObj(a.date)?.getTime() || 0;
      const db = getDateObj(b.date)?.getTime() || 0;
      if (da !== db) return da - db;
      // Same date: sort by createdAt ascending (oldest inserted first)
      const ca = getDateObj(a.createdAt)?.getTime() || 0;
      const cb = getDateObj(b.createdAt)?.getTime() || 0;
      return ca - cb;
    });
  }, [incomeTransactions, expenseTransactions]);

  // Derive unique sorted category/subcategory options from allRows (respects account + type filter)
  const categoryOptions = useMemo(() => {
    const seen = new Set();
    allRows.forEach(r => {
      if (filterAccountType && normalizeAccountType(r.accountType) !== filterAccountType) return;
      if (filterType && r.txType !== filterType) return;
      if (r.category) seen.add(r.category);
    });
    return [...seen].sort();
  }, [allRows, filterAccountType, filterType]);

  const subCategoryOptions = useMemo(() => {
    const seen = new Set();
    allRows.forEach(r => {
      if (filterAccountType && normalizeAccountType(r.accountType) !== filterAccountType) return;
      if (filterType && r.txType !== filterType) return;
      if (filterCategory && r.category !== filterCategory) return;
      if (r.subCategory) seen.add(r.subCategory);
    });
    return [...seen].sort();
  }, [allRows, filterAccountType, filterType, filterCategory]);

  // Count how many bank statement entries exist per key (date_absAmt_acct)
  const bankStatementLookup = useMemo(() => {
    const map = new Map();
    bankStatements.forEach(stmt => {
      const d = getDateObj(stmt.postingDate);
      if (!d) return;
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const absAmt = Math.abs(stmt.amount || 0).toFixed(2);
      const acct = normalizeAccountType(stmt.accountType);
      const key = `${dateStr}_${absAmt}_${acct}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [bankStatements]);

  // Build the set of transaction IDs that have a bank match, consuming counts so
  // only as many transactions match as there are bank statement entries (no over-matching).
  const matchedTxIds = useMemo(() => {
    const counts = new Map(bankStatementLookup);
    const matched = new Set();
    // Transactions with "/" in description are split/transfer entries — exclude from bank matching
    allRows.forEach(row => {
      if ((row.description || '').includes('/')) return;
      const key = makeLookupKey(row.date, row.amount, row.accountType);
      const available = counts.get(key) || 0;
      if (available > 0) {
        matched.add(row.id);
        counts.set(key, available - 1);
      }
    });
    return matched;
  }, [allRows, bankStatementLookup]);

  const hasBankMatch = (row) => matchedTxIds.has(row.id);

  // Bank-only rows: bank statements with no matching transaction (count-aware).
  // If 4 transactions share key X but only 3 bank entries exist, 1 bank entry is unmatched.
  const bankOnlyRows = useMemo(() => {
    // Count transactions per key — exclude split/transfer entries (description contains "/")
    const txCounts = new Map();
    allRows.forEach(r => {
      if (!filterAccountType || r.accountType === filterAccountType) {
        if ((r.description || '').includes('/')) return; // skip split entries
        const key = makeLookupKey(r.date, r.amount, r.accountType);
        txCounts.set(key, (txCounts.get(key) || 0) + 1);
      }
    });

    // Walk bank statements in display order (importTimestamp desc, importOrder asc).
    // For each key, the first txCount[key] entries are "matched"; the rest are bank-only.
    const sortedStmts = [...bankStatements]
      .filter(stmt => !filterAccountType || stmt.accountType === filterAccountType)
      .sort((a, b) => {
        const tsCompare = (b.importTimestamp || 0) - (a.importTimestamp || 0);
        if (tsCompare !== 0) return tsCompare;
        return (a.importOrder || 0) - (b.importOrder || 0);
      });

    const consumed = new Map(); // key → count of bank entries already claimed by transactions
    const result = [];

    sortedStmts.forEach(stmt => {
      const key = makeLookupKey(stmt.postingDate, stmt.amount, stmt.accountType);
      const txQuota = txCounts.get(key) || 0;
      const usedSoFar = consumed.get(key) || 0;
      consumed.set(key, usedSoFar + 1);

      // If we've already consumed all transaction slots for this key, this stmt is bank-only
      if (usedSoFar >= txQuota) {
        const absAmt = Math.abs(stmt.amount || 0);
        const isCredit = (stmt.amount || 0) >= 0;
        result.push({
          id: stmt.id,
          txType: 'bank-only',
          isBankOnly: true,
          date: stmt.postingDate,
          amount: absAmt,
          signedAmount: isCredit ? absAmt : -absAmt,
          accountType: normalizeAccountType(stmt.accountType),
          description: stmt.description || '',
          details: stmt.details || '',
          category: '',
          subCategory: '',
          memberName: '',
          payeeName: '',
          isCredit,
          bankStatementId: stmt.id,
          importTimestamp: stmt.importTimestamp || 0,
          importOrder: stmt.importOrder || 0,
        });
      }
    });

    // Sort by postingDate asc for correct insertion into the ledger display
    result.sort((a, b) => {
      const da = getDateObj(a.date)?.getTime() || 0;
      const db = getDateObj(b.date)?.getTime() || 0;
      if (da !== db) return da - db;
      const tsCompare = (b.importTimestamp || 0) - (a.importTimestamp || 0);
      if (tsCompare !== 0) return tsCompare;
      return (a.importOrder || 0) - (b.importOrder || 0);
    });
    return result;
  }, [bankStatements, allRows, filterAccountType, bankStatementLookup]);

  // Apply filters
  const filteredRows = useMemo(() => {
    return allRows.filter(row => {
      if (filterAccountType && normalizeAccountType(row.accountType) !== filterAccountType) return false;
      const dateStr = getDateStr(row.date);
      const monthStr = getMonthStr(row.date);
      if (filterMonth && monthStr !== filterMonth) return false;
      if (filterStartDate && dateStr < filterStartDate) return false;
      if (filterEndDate && dateStr > filterEndDate) return false;
      if (filterType && row.txType !== filterType) return false;
      if (filterCategory && row.category !== filterCategory) return false;
      if (filterSubCategory && row.subCategory !== filterSubCategory) return false;
      return true;
    });
  }, [allRows, filterAccountType, filterMonth, filterStartDate, filterEndDate, filterType, filterCategory, filterSubCategory]);

  // Running balance rows
  // Opening balance = configured opening balance for the earliest year in data
  // + sum of all transactions (matching account filter) that come BEFORE the visible range
  const runningRows = useMemo(() => {
    // Determine the account-filtered full set
    const accountFiltered = allRows.filter(r =>
      !filterAccountType || r.accountType === filterAccountType
    );

    // Earliest year across all account-filtered rows — this is the year whose opening balance applies
    const earliestYear = accountFiltered.length > 0
      ? Math.min(...accountFiltered.map(r => getDateObj(r.date)?.getFullYear() || 9999))
      : new Date().getFullYear();

    const configuredOpening = getConfiguredOpeningBalance(earliestYear, filterAccountType || null);

    // Sum of transactions strictly before the visible filtered set (by date)
    const earliestVisibleDateStr = filteredRows.length > 0 ? getDateStr(filteredRows[0].date) : null;

    const priorSum = earliestVisibleDateStr
      ? accountFiltered
          .filter(r => getDateStr(r.date) < earliestVisibleDateStr)
          .reduce((sum, r) => sum + r.signedAmount, 0)
      : 0;

    let balance = configuredOpening + priorSum;

    // Compute balances oldest→newest so each row's running balance is correct
    const txRows = filteredRows.map(row => {
      balance += row.signedAmount;
      return { ...row, runningBalance: balance };
    });

    // Filter bank-only rows to match date/month filters (they don't affect running balance)
    const visibleBankOnly = filterBankOnly !== 'hide'
      ? bankOnlyRows.filter(r => {
          const dateStr = getDateStr(r.date);
          const monthStr = getMonthStr(r.date);
          if (filterMonth && monthStr !== filterMonth) return false;
          if (filterStartDate && dateStr < filterStartDate) return false;
          if (filterEndDate && dateStr > filterEndDate) return false;
          return true;
        })
      : [];

    // Helper: apply description filter to any row array
    const applyDescFilter = (rows) => {
      if (!filterDescription.trim()) return rows;
      const descNorm = filterDescription.trim().toLowerCase().replace(/\s+/g, ' ');
      return rows.filter(row => {
        const desc = (row.description || '').toLowerCase().replace(/\s+/g, ' ');
        const det = (row.details || '').toLowerCase().replace(/\s+/g, ' ');
        return desc.includes(descNorm) || det.includes(descNorm);
      });
    };

    // If showing only bank-only rows, apply description filter then return
    if (filterBankOnly === 'only') {
      const sorted = [...visibleBankOnly].sort((a, b) => {
        const da = getDateObj(a.date)?.getTime() || 0;
        const db = getDateObj(b.date)?.getTime() || 0;
        return db - da; // newest first
      });
      return applyDescFilter(sorted);
    }

    // Merge txRows (with balances) + bank-only rows, sort newest→oldest for display
    const merged = [...txRows, ...visibleBankOnly].sort((a, b) => {
      const da = getDateObj(a.date)?.getTime() || 0;
      const db = getDateObj(b.date)?.getTime() || 0;
      if (da !== db) return db - da; // newest date first

      // Same date: transaction rows sort by createdAt descending (newest inserted first)
      // Bank-only rows sort by importTimestamp desc, importOrder asc (mirrors bank statement view)
      if (!a.isBankOnly && !b.isBankOnly) {
        // Both transactions: newest createdAt first
        const ca = getDateObj(a.createdAt)?.getTime() || 0;
        const cb = getDateObj(b.createdAt)?.getTime() || 0;
        return cb - ca;
      }
      if (a.isBankOnly && b.isBankOnly) {
        // Both bank-only: importTimestamp desc, importOrder asc
        const tsCompare = (b.importTimestamp || 0) - (a.importTimestamp || 0);
        if (tsCompare !== 0) return tsCompare;
        return (a.importOrder || 0) - (b.importOrder || 0);
      }
      // Mixed: transaction rows before bank-only rows on same date
      return a.isBankOnly ? 1 : -1;
    });

    // Apply bank match filter (only applies to transaction rows, not bank-only rows)
    const afterMatchFilter = filterBankMatch
      ? merged.filter(row => {
          if (row.isBankOnly) return true; // always show bank-only rows regardless of match filter
          return filterBankMatch === 'matched' ? hasBankMatch(row) : !hasBankMatch(row);
        })
      : merged;

    // Apply description filter to merged result (covers both transaction + bank-only rows)
    return applyDescFilter(afterMatchFilter);
  }, [filteredRows, allRows, filterAccountType, getConfiguredOpeningBalance, filterBankMatch, filterBankOnly, bankOnlyRows, bankStatementLookup, filterMonth, filterStartDate, filterEndDate, filterDescription]);

  // Monthly summary — only months that have actual transactions
  const monthlySummary = useMemo(() => {
    // Respect account filter but not date filter (we need ALL months for correct running balance)
    const accountFiltered = allRows.filter(r =>
      !filterAccountType || r.accountType === filterAccountType
    );

    if (accountFiltered.length === 0) return [];

    // Build month map from actual transaction months only
    const monthMap = {};
    accountFiltered.forEach(row => {
      const m = getMonthStr(row.date);
      if (!m) return;
      if (!monthMap[m]) monthMap[m] = { month: m, income: 0, expense: 0 };
      if (row.txType === 'income') monthMap[m].income += Math.abs(row.signedAmount);
      else monthMap[m].expense += Math.abs(row.signedAmount);
    });

    const months = Object.keys(monthMap).sort();
    if (months.length === 0) return [];

    // Opening balance = configured value for the earliest year in the data
    const earliestYear = parseInt(months[0].split('-')[0], 10);
    const configuredOpening = getConfiguredOpeningBalance(earliestYear, filterAccountType || null);

    let runningBalance = configuredOpening;
    return months.map(m => {
      const beginning = runningBalance;
      runningBalance += monthMap[m].income - monthMap[m].expense;
      return {
        month: m,
        beginning,
        deposits: monthMap[m].income,
        expenses: monthMap[m].expense,
        ending: runningBalance,
      };
    });
  }, [allRows, filterAccountType, getConfiguredOpeningBalance]);

  // Filter monthly summary by selected month or date range for display only
  const filteredMonthlySummary = useMemo(() => {
    return monthlySummary.filter(row => {
      if (filterMonth && row.month !== filterMonth) return false;
      if (filterStartDate && `${row.month}-28` < filterStartDate) return false;
      if (filterEndDate && `${row.month}-01` > filterEndDate) return false;
      return true;
    });
  }, [monthlySummary, filterMonth, filterStartDate, filterEndDate]);

  const hasFilters = (filterAccountType && filterAccountType !== 'Operating') || filterMonth || filterStartDate || filterEndDate || filterBankMatch || filterBankOnly !== 'include' || filterDescription.trim() || filterType || filterCategory || filterSubCategory;

  const clearFilters = () => {
    setFilterAccountType('Operating');
    setFilterMonth('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterBankMatch('');
    setFilterBankOnly('include');
    setFilterDescription('');
    setFilterType('');
    setFilterCategory('');
    setFilterSubCategory('');
  };

  // Row key used for checkbox identity
  const rowKey = (row) => `${row.txType}-${row.id}`;

  // Derived: which rows are actually selected
  const allKeys = useMemo(() => new Set(runningRows.map(rowKey)), [runningRows]);
  const isAllSelected = selectedKeys === null; // null means "all"
  const effectiveSelected = isAllSelected ? allKeys : selectedKeys;

  // When runningRows changes (filter change), reset selection to all
  // We track this via a simple effect-free approach: if selectedKeys has keys not in allKeys, prune them
  const visibleSelectedKeys = useMemo(() => {
    if (isAllSelected) return allKeys;
    return new Set([...selectedKeys].filter(k => allKeys.has(k)));
  }, [selectedKeys, allKeys, isAllSelected]);

  const isSomeSelected = !isAllSelected && visibleSelectedKeys.size > 0;
  const isNoneSelected = !isAllSelected && visibleSelectedKeys.size === 0;

  const selectAllCheckboxRef = useRef(null);
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  const toggleSelectAll = () => {
    // All selected → uncheck all; some/none selected → check all
    setSelectedKeys(isAllSelected || isSomeSelected ? new Set() : null);
  };

  const toggleRow = (key) => {
    if (isAllSelected) {
      // Switch from "all selected" to "all except this one"
      const next = new Set(allKeys);
      next.delete(key);
      setSelectedKeys(next);
    } else {
      const next = new Set(selectedKeys);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        // If all are now selected, go back to null (all)
        if (next.size === allKeys.size) {
          setSelectedKeys(null);
          return;
        }
      }
      setSelectedKeys(next);
    }
  };

  // Sum for footer: if all selected → sum all runningRows; else → sum visibleSelectedKeys only
  // Includes bank-only rows (credit = income side, debit = expense side)
  const sumRows = isAllSelected
    ? runningRows
    : runningRows.filter(r => visibleSelectedKeys.has(rowKey(r)));

  const sumIncome = sumRows.reduce((s, r) => {
    const isInc = r.isBankOnly ? r.isCredit : r.txType === 'income';
    return isInc ? s + Math.abs(r.signedAmount) : s;
  }, 0);
  const sumExpense = sumRows.reduce((s, r) => {
    const isExp = r.isBankOnly ? !r.isCredit : r.txType === 'expense';
    return isExp ? s + Math.abs(r.signedAmount) : s;
  }, 0);
  const selectionLabel = isAllSelected
    ? `${runningRows.filter(r => !r.isBankOnly).length} transaction${runningRows.filter(r => !r.isBankOnly).length !== 1 ? 's' : ''}${runningRows.filter(r => r.isBankOnly).length > 0 ? ` + ${runningRows.filter(r => r.isBankOnly).length} bank-only` : ''}`
    : `${visibleSelectedKeys.size} selected`;

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Account Statement', 14, 15);
    doc.setFontSize(9);
    const filterParts = [];
    if (filterAccountType) filterParts.push(`Account: ${filterAccountType}`);
    if (filterMonth) filterParts.push(`Month: ${filterMonth}`);
    if (filterStartDate) filterParts.push(`From: ${filterStartDate}`);
    if (filterEndDate) filterParts.push(`To: ${filterEndDate}`);
    doc.text(`Filters: ${filterParts.length ? filterParts.join('  |  ') : 'None'}`, 14, 23);

    if (viewMode === 'running') {
      doc.text(`Rows: ${runningRows.length}`, 14, 29);
      autoTable(doc, {
        head: [['Date', 'Type', 'Category', 'Subcategory', 'Description', 'Member/Payee', 'Account', 'Income', 'Expense', 'Balance']],
        body: runningRows.map(r => [
          formatDate(r.date),
          r.txType === 'income' ? 'Income' : 'Expense',
          r.category || '-',
          r.subCategory || '-',
          r.description || '-',
          r.txType === 'income' ? (r.memberName || '-') : (r.payeeName || '-'),
          r.accountType || 'Operating',
          r.txType === 'income' ? formatAmount(Math.abs(r.signedAmount)) : '',
          r.txType === 'expense' ? formatAmount(Math.abs(r.signedAmount)) : '',
          formatAmount(r.runningBalance),
        ]),
        startY: 34,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    } else {
      autoTable(doc, {
        head: [['Month', 'Beginning Balance', 'Deposits & Additions', 'Expenses', 'Ending Balance']],
        body: filteredMonthlySummary.map(r => [
          r.month,
          formatAmount(r.beginning),
          formatAmount(r.deposits),
          formatAmount(r.expenses),
          formatAmount(r.ending),
        ]),
        startY: 34,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    }

    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`statement_${dateStr}.pdf`);
  };

  const handleExportCSV = () => {
    let csv = '';
    if (viewMode === 'running') {
      const headers = ['Date', 'Type', 'Category', 'Subcategory', 'Description', 'Member/Payee', 'Account', 'Income', 'Expense', 'Balance'];
      const rows = runningRows.map(r => [
        formatDate(r.date),
        r.txType === 'income' ? 'Income' : 'Expense',
        r.category || '',
        r.subCategory || '',
        (r.description || '').replace(/"/g, '""'),
        r.txType === 'income' ? (r.memberName || '') : (r.payeeName || ''),
        r.accountType || 'Operating',
        r.txType === 'income' ? Math.abs(r.signedAmount).toFixed(2) : '',
        r.txType === 'expense' ? Math.abs(r.signedAmount).toFixed(2) : '',
        r.runningBalance.toFixed(2),
      ]);
      csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    } else {
      const headers = ['Month', 'Beginning Balance', 'Deposits & Additions', 'Expenses', 'Ending Balance'];
      const rows = filteredMonthlySummary.map(r => [
        r.month,
        r.beginning.toFixed(2),
        r.deposits.toFixed(2),
        r.expenses.toFixed(2),
        r.ending.toFixed(2),
      ]);
      csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `statement_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-md transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export PDF
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Account Type</label>
            <select
              value={filterAccountType}
              onChange={(e) => setFilterAccountType(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="Operating">Operating</option>
              <option value="Building">Building</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => { setFilterMonth(e.target.value); setFilterStartDate(''); setFilterEndDate(''); }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => { setFilterStartDate(e.target.value); setFilterMonth(''); }}
              max={filterEndDate || undefined}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => { setFilterEndDate(e.target.value); setFilterMonth(''); }}
              min={filterStartDate || undefined}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bank Match</label>
            <select
              value={filterBankMatch}
              onChange={(e) => setFilterBankMatch(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All</option>
              <option value="matched">Matched ✓</option>
              <option value="unmatched">Unmatched</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bank-Only Rows</label>
            <select
              value={filterBankOnly}
              onChange={(e) => setFilterBankOnly(e.target.value)}
              className="w-full px-2 py-1.5 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            >
              <option value="include">Include</option>
              <option value="hide">Hide</option>
              <option value="only">Only Bank-Only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input
              type="text"
              value={filterDescription}
              onChange={(e) => setFilterDescription(e.target.value)}
              placeholder="Search description..."
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
        {/* Second filter row: Type, Category, SubCategory */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setFilterCategory(''); setFilterSubCategory(''); }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setFilterSubCategory(''); }}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Categories</option>
              {categoryOptions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subcategory</label>
            <select
              value={filterSubCategory}
              onChange={(e) => setFilterSubCategory(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={!filterCategory}
            >
              <option value="">All Subcategories</option>
              {subCategoryOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
            Clear All Filters
          </button>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('running')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'running'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Running Statement
        </button>
        <button
          onClick={() => setViewMode('monthly')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'monthly'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Monthly Summary
        </button>
      </div>

      {/* Running Statement View */}
      {viewMode === 'running' && (
        <>
          {runningRows.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No transactions found</p>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-center w-8">
                      <input
                        ref={selectAllCheckboxRef}
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
                        title={isAllSelected ? 'Deselect all' : isSomeSelected ? 'Deselect all' : 'Select all'}
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subcategory</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member / Payee</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Expense</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" title="Matched in Bank Statements">Bank</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-amber-600 uppercase tracking-wider">Source</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {runningRows.map((row, idx) => {
                    const isBankOnly = row.isBankOnly === true;
                    const isIncome = isBankOnly ? row.isCredit : row.txType === 'income';
                    // Show month separator when month changes
                    const prevMonth = idx > 0 ? getMonthStr(runningRows[idx - 1].date) : null;
                    const currMonth = getMonthStr(row.date);
                    const showSeparator = prevMonth && prevMonth !== currMonth;

                    // Row background: amber for bank-only, red tint for expense, white for income
                    const rowBg = isBankOnly
                      ? 'bg-amber-50 hover:bg-amber-100'
                      : isIncome ? 'hover:bg-gray-50' : 'bg-red-50/30 hover:bg-red-50/50';

                    return (
                      <React.Fragment key={`${row.txType}-${row.id}`}>
                        {showSeparator && (
                          <tr className="bg-blue-50">
                            <td colSpan={13} className="px-3 py-1 text-xs font-semibold text-blue-700 uppercase tracking-wider">
                              {(() => {
                                const [y, m] = currMonth.split('-');
                                return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                              })()}
                            </td>
                          </tr>
                        )}
                        <tr className={rowBg}>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={isAllSelected || visibleSelectedKeys.has(rowKey(row))}
                              onChange={() => toggleRow(rowKey(row))}
                              className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">{formatDate(row.date)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {isBankOnly ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                {isIncome ? 'Deposit' : 'Withdrawal'}
                              </span>
                            ) : (
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                isIncome ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {isIncome ? 'Income' : 'Expense'}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-400 italic">{isBankOnly ? '—' : (row.category || '-')}</td>
                          <td className="px-3 py-2 text-gray-400 italic">{isBankOnly ? '—' : (row.subCategory || '-')}</td>
                          <td className="px-3 py-2 text-gray-500 max-w-[180px] truncate">{row.description || row.details || '-'}</td>
                          <td className="px-3 py-2 text-gray-400 italic">
                            {isBankOnly ? '—' : (isIncome ? (row.memberName || '-') : (row.payeeName || '-'))}
                          </td>
                          <td className="px-3 py-2 text-gray-500">{row.accountType || 'Operating'}</td>
                          <td className="px-3 py-2 text-right font-medium text-green-700">
                            {isIncome ? formatAmount(Math.abs(row.signedAmount)) : ''}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-red-700">
                            {!isIncome ? formatAmount(Math.abs(row.signedAmount)) : ''}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-gray-400">
                            {isBankOnly ? (
                              <span className="text-xs text-amber-500 font-normal italic">n/a</span>
                            ) : (
                              <span className={row.runningBalance >= 0 ? 'text-gray-900' : 'text-red-600'}>
                                {formatAmount(row.runningBalance)}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {isBankOnly ? (
                              <span className="text-gray-300 text-xs">—</span>
                            ) : hasBankMatch(row) ? (
                              <span title="Matched in Bank Statements" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {isBankOnly ? (
                              <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-200 text-amber-800 whitespace-nowrap">
                                Bank Only
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td className="px-2 py-2" />
                    <td colSpan={7} className="px-3 py-2 text-sm font-semibold text-gray-700">
                      {selectionLabel}
                      {!isAllSelected && (
                        <button
                          onClick={() => setSelectedKeys(null)}
                          className="ml-2 text-xs text-blue-600 hover:text-blue-800 font-normal underline"
                        >
                          Select all ({allKeys.size})
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-bold text-green-700">
                      {formatAmount(sumIncome)}
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-bold text-red-700">
                      {formatAmount(sumExpense)}
                    </td>
                    <td className={`px-3 py-2 text-right text-sm font-bold ${(() => { const last = runningRows.find(r => !r.isBankOnly); return last && last.runningBalance >= 0 ? 'text-gray-900' : 'text-red-600'; })()}`}>
                      {(() => { const last = runningRows.find(r => !r.isBankOnly); return last ? formatAmount(last.runningBalance) : formatAmount(0); })()}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-gray-500">
                      {(() => {
                        const txRows = runningRows.filter(r => !r.isBankOnly);
                        return `${txRows.filter(r => hasBankMatch(r)).length}/${txRows.length}`;
                      })()}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-amber-600">
                      {runningRows.filter(r => r.isBankOnly).length > 0
                        ? `${runningRows.filter(r => r.isBankOnly).length} bank-only`
                        : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}

      {/* Monthly Summary View */}
      {viewMode === 'monthly' && (
        <>
          {filteredMonthlySummary.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No data found</p>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Beginning Balance</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-green-700 uppercase tracking-wider">Deposits & Additions</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-red-700 uppercase tracking-wider">Expenses</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ending Balance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredMonthlySummary.map((row) => (
                    <tr key={row.month} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {(() => {
                          const [y, m] = row.month.split('-');
                          return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatAmount(row.beginning)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-green-700">
                        {formatAmount(row.deposits)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-red-700">
                        {formatAmount(row.expenses)}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${row.ending >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        {formatAmount(row.ending)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                      {filteredMonthlySummary.length} Month{filteredMonthlySummary.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                      {filteredMonthlySummary.length > 0 ? formatAmount(filteredMonthlySummary[0].beginning) : '—'}
                      <span className="text-xs font-normal text-gray-400 ml-1">(opening)</span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-green-700">
                      {formatAmount(filteredMonthlySummary.reduce((s, r) => s + r.deposits, 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-red-700">
                      {formatAmount(filteredMonthlySummary.reduce((s, r) => s + r.expenses, 0))}
                    </td>
                    <td className={`px-4 py-3 text-right text-sm font-bold ${
                      filteredMonthlySummary.length > 0 && filteredMonthlySummary[filteredMonthlySummary.length - 1].ending >= 0
                        ? 'text-gray-900' : 'text-red-600'
                    }`}>
                      {filteredMonthlySummary.length > 0
                        ? formatAmount(filteredMonthlySummary[filteredMonthlySummary.length - 1].ending)
                        : formatAmount(0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StatementView;
