import { useState, useMemo } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';

const DESCRIPTION_PRESETS = ["Cash", "Check", "Online"];

// Helper function to get current date in US Central timezone
const getCentralDate = () => {
  const now = new Date();
  // Convert to US Central timezone
  const centralDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  // Format as YYYY-MM-DD
  const year = centralDate.getFullYear();
  const month = String(centralDate.getMonth() + 1).padStart(2, '0');
  const day = String(centralDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const AddIncome = ({ onAdd, onCancel, categories, members }) => {
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    subCategory: '',
    description: '',
    date: getCentralDate(),
    memberId: '',
    memberName: '',
    accountType: 'Operating',
  });

  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [splitRows, setSplitRows] = useState([]);

  // Build/rebuild split rows when count or total amount changes
  const buildSplitRows = (n, totalAmount) => {
    const base = totalAmount ? parseFloat((parseFloat(totalAmount) / n).toFixed(2)) : '';
    return Array.from({ length: n }, (_, i) => ({
      category: '',
      subCategory: '',
      amount: base !== '' ? (i === n - 1
        ? parseFloat((parseFloat(totalAmount) - base * (n - 1)).toFixed(2))
        : base) : '',
    }));
  };

  const handleSplitToggle = (checked) => {
    setSplitEnabled(checked);
    if (checked) {
      setSplitRows(buildSplitRows(splitCount, formData.amount));
    }
  };

  const handleSplitCountChange = (val) => {
    const n = Math.max(2, parseInt(val) || 2);
    setSplitCount(n);
    setSplitRows(buildSplitRows(n, formData.amount));
  };

  const handleSplitRowChange = (index, field, value) => {
    setSplitRows(prev => prev.map((row, i) =>
      i === index
        ? { ...row, [field]: value, ...(field === 'category' ? { subCategory: '' } : {}) }
        : row
    ));
  };

  const getSubCatsForRow = (cat) => {
    if (!cat) return [];
    return categories
      .filter(c => c.category === cat)
      .map(c => ({ name: c.name, subCategory: c.subCategory }))
      .filter(c => c.subCategory)
      .sort((a, b) => a.subCategory.localeCompare(b.subCategory));
  };

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const handleDescriptionChange = (e) => {
    const value = e.target.value;

    setFormData((prev) => ({
      ...prev,
      description: value,
    }));

    if (value.length >= 2) {
      const matches = DESCRIPTION_PRESETS.filter((item) =>
        item.toLowerCase().startsWith(value.toLowerCase())
      );
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
      setHighlightedIndex(0); // reset highlighted
    } else {
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev + 1 < suggestions.length ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev - 1 >= 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      setFormData((prev) => ({
        ...prev,
        description: suggestions[highlightedIndex],
      }));
      setShowSuggestions(false);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (item) => {
    setFormData((prev) => ({
      ...prev,
      description: item,
    }));
    setShowSuggestions(false);
  };

  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  // Get unique categories
  const uniqueCategories = useMemo(() => {
    const catSet = new Set(categories.map(c => c.category).filter(Boolean));
    return Array.from(catSet).sort();
  }, [categories]);

  // Get subcategories for selected category
  const availableSubCategories = useMemo(() => {
    if (!formData.category) return [];
    return categories
      .filter(c => c.category === formData.category)
      .map(c => ({ name: c.name, subCategory: c.subCategory }))
      .filter(c => c.subCategory)
      .sort((a, b) => a.subCategory.localeCompare(b.subCategory));
  }, [categories, formData.category]);

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    if (!memberSearch) return members;
    const search = memberSearch.toLowerCase();
    return members.filter(m =>
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(search)
    );
  }, [members, memberSearch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'category') {
      setFormData(prev => ({ ...prev, category: value, subCategory: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleMemberSearchChange = (e) => {
    const value = e.target.value;
    setMemberSearch(value);
    setShowMemberDropdown(true);
    if (!value) {
      setFormData(prev => ({ ...prev, memberId: '', memberName: '' }));
    }
  };

  const handleMemberSelect = (member) => {
    const fullName = `${member.firstName} ${member.lastName}`;
    setMemberSearch(fullName);
    setFormData(prev => ({
      ...prev,
      memberId: member.id,
      memberName: fullName
    }));
    setShowMemberDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (splitEnabled && splitRows.length > 1) {
        const n = splitRows.length;
        const records = splitRows.map((row, i) => {
          const suffix = `${i + 1}/${n}`;
          const description = formData.description
            ? `${formData.description} (${suffix})`
            : suffix;
          return {
            ...formData,
            category: row.category,
            subCategory: row.subCategory,
            amount: String(row.amount),
            description,
          };
        });
        await onAdd(records);
      } else {
        await onAdd(formData);
      }
      setFormData({
        amount: '',
        category: '',
        subCategory: '',
        description: '',
        date: getCentralDate(),
        memberId: '',
        memberName: '',
        accountType: 'Operating',
      });
      setMemberSearch('');
      setSplitEnabled(false);
      setSplitCount(2);
      setSplitRows([]);
    } catch (error) {
      console.error('Error adding income:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4">
        <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 mb-1">
          Account Type<span className="text-red-500 ml-1">*</span>
        </label>
        <select
          id="accountType"
          name="accountType"
          value={formData.accountType}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="Operating">Operating</option>
          <option value="Building">Building</option>
        </select>
      </div>

      <div className="mb-4 relative">
        <label htmlFor="memberSearch" className="block text-sm font-medium text-gray-700 mb-1">
          Member Name<span className="text-red-500 ml-1">*</span>
        </label>
        <input
          id="memberSearch"
          type="text"
          value={memberSearch}
          onChange={handleMemberSearchChange}
          onFocus={() => setShowMemberDropdown(true)}
          onBlur={() => setTimeout(() => setShowMemberDropdown(false), 200)}
          placeholder="Type to search member..."
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {showMemberDropdown && filteredMembers.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
            {filteredMembers.map(member => (
              <div
                key={member.id}
                onClick={() => handleMemberSelect(member)}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
              >
                <div className="font-medium">{member.firstName} {member.lastName}</div>
                <div className="text-sm text-gray-500">{member.email}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="mb-4">
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category<span className="text-red-500 ml-1">*</span>
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${splitEnabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
            required={!splitEnabled}
            disabled={splitEnabled}
          >
            <option value="">Select category</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="subCategory" className="block text-sm font-medium text-gray-700 mb-1">
            Sub Category<span className="text-red-500 ml-1">*</span>
          </label>
          <select
            id="subCategory"
            name="subCategory"
            value={formData.subCategory}
            onChange={handleChange}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${(splitEnabled || !formData.category) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
            required={!splitEnabled}
            disabled={splitEnabled || !formData.category}
          >
            <option value="">Select sub category</option>
            {availableSubCategories.map(cat => (
              <option key={cat.name} value={cat.subCategory}>{cat.subCategory}</option>
            ))}
          </select>
        </div>
      </div>

      <Input
        label="Date"
        name="date"
        type="date"
        value={formData.date}
        onChange={handleChange}
        required
      />

      <div className="mb-4">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleDescriptionChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter description"
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {showSuggestions && (
        <ul className="absolute z-10 bg-white border border-gray-300 rounded-md mt-1 w-20 shadow max-h-40 overflow-auto">
          {suggestions.map((item, index) => (
            <li
              key={item}
              onClick={() => handleSuggestionClick(item)}
              className={`px-3 py-2 cursor-pointer ${
                index === highlightedIndex ? "bg-blue-100" : ""
              }`}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
      </div>

      <Input
        label="Amount"
        name="amount"
        type="number"
        step="0.01"
        min="0"
        value={formData.amount}
        onChange={handleChange}
        required={!splitEnabled}
        disabled={splitEnabled}
        placeholder={splitEnabled ? 'Set per-split amounts below' : 'Enter amount'}
      />

      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="splitToggle"
              checked={splitEnabled}
              onChange={(e) => handleSplitToggle(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="splitToggle" className="text-sm font-medium text-gray-700 cursor-pointer">
              Split into multiple transactions
            </label>
          </div>
          {splitEnabled && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Number of splits:</label>
              <input
                type="number"
                min="2"
                max="52"
                value={splitCount}
                onChange={(e) => handleSplitCountChange(e.target.value)}
                className="w-16 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center"
              />
            </div>
          )}
        </div>

        {splitEnabled && splitRows.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-gray-600 mb-1">Set category, subcategory and amount for each split:</p>
            <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-x-2 gap-y-1 items-center">
              <span className="text-xs font-semibold text-gray-500">#</span>
              <span className="text-xs font-semibold text-gray-500">Category *</span>
              <span className="text-xs font-semibold text-gray-500">Subcategory *</span>
              <span className="text-xs font-semibold text-gray-500">Amount *</span>
              {splitRows.map((row, i) => (
                <div key={i} className="contents">
                  <span className="text-xs text-gray-500 font-medium">{i + 1}/{splitRows.length}</span>
                  <select
                    value={row.category}
                    onChange={(e) => handleSplitRowChange(i, 'category', e.target.value)}
                    required
                    className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  >
                    <option value="">Select</option>
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select
                    value={row.subCategory}
                    onChange={(e) => handleSplitRowChange(i, 'subCategory', e.target.value)}
                    required
                    disabled={!row.category}
                    className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs disabled:bg-gray-100"
                  >
                    <option value="">Select</option>
                    {getSubCatsForRow(row.category).map(sc => (
                      <option key={sc.name} value={sc.subCategory}>{sc.subCategory}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={row.amount}
                    onChange={(e) => handleSplitRowChange(i, 'amount', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex space-x-3">
        <Button type="submit" variant="success">{splitEnabled && splitCount > 1 ? `Add ${splitCount} Transactions` : 'Add Income'}</Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  );
};

export default AddIncome;
