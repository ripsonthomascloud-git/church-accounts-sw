import { useState } from 'react';
import MemberContributionReport from '../components/Reports/MemberContributionReport';
import ExpenseSummaryReport from '../components/Reports/ExpenseSummaryReport';
import IncomeSummaryReport from '../components/Reports/IncomeSummaryReport';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('contributions');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Reports</h1>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('contributions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'contributions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Member Contributions
          </button>
          <button
            onClick={() => setActiveTab('income-operating')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'income-operating'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Income Summary - Operating
          </button>
          <button
            onClick={() => setActiveTab('income-building')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'income-building'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Income Summary - Building
          </button>
          <button
            onClick={() => setActiveTab('expenses-operating')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'expenses-operating'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Expense Summary - Operating
          </button>
          <button
            onClick={() => setActiveTab('expenses-building')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'expenses-building'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Expense Summary - Building
          </button>
        </nav>
      </div>

      <div>
        {activeTab === 'contributions' ? (
          <MemberContributionReport />
        ) : activeTab === 'income-operating' ? (
          <IncomeSummaryReport accountType="Operating" />
        ) : activeTab === 'income-building' ? (
          <IncomeSummaryReport accountType="Building" />
        ) : activeTab === 'expenses-operating' ? (
          <ExpenseSummaryReport accountType="Operating" />
        ) : (
          <ExpenseSummaryReport accountType="Building" />
        )}
      </div>
    </div>
  );
};

export default Reports;
