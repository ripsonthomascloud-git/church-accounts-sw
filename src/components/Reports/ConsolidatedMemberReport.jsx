import { useState, useEffect, useRef } from 'react';
import { useMembers } from '../../hooks/useMembers';
import { useTransactions } from '../../hooks/useTransactions';
import Button from '../common/Button';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const ConsolidatedMemberReport = () => {
  const { members } = useMembers();
  const { transactions: income } = useTransactions('income');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [asOfDate, setAsOfDate] = useState('');
  const [reportData, setReportData] = useState([]);
  const [contributionTypes, setContributionTypes] = useState([]);
  const reportRef = useRef(null);

  useEffect(() => {
    generateReport();
  }, [members, income, dateFrom, dateTo]);

  const generateReport = () => {
    // Check if income data is available
    if (!income || !Array.isArray(income)) {
      setReportData([]);
      setContributionTypes([]);
      return;
    }

    // Filter income by date range if specified
    let filteredIncome = income;
    if (dateFrom || dateTo) {
      filteredIncome = income.filter(transaction => {
        const transactionDate = transaction.date?.toDate ? transaction.date.toDate() : new Date(transaction.date);
        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(dateTo) : null;

        if (fromDate && transactionDate < fromDate) return false;
        if (toDate && transactionDate > toDate) return false;
        return true;
      });
    }

    // Get all unique contribution types (subcategories)
    const types = new Set();
    filteredIncome.forEach(transaction => {
      if (transaction.subCategory) {
        types.add(transaction.subCategory);
      }
    });
    const sortedTypes = Array.from(types).sort();
    setContributionTypes(sortedTypes);

    // Build report data for each member
    const data = members.map(member => {
      const memberContributions = filteredIncome.filter(
        transaction => transaction.memberId === member.id
      );

      const contributionsByType = {};
      let total = 0;

      sortedTypes.forEach(type => {
        const typeTotal = memberContributions
          .filter(t => t.subCategory === type)
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        contributionsByType[type] = typeTotal;
        total += typeTotal;
      });

      return {
        memberId: member.id,
        memberName: `${member.firstName} ${member.lastName}`,
        contributions: contributionsByType,
        total: total
      };
    })
    .filter(m => m.total > 0) // Only include members with contributions
    .sort((a, b) => a.memberName.localeCompare(b.memberName)); // Sort alphabetically by name

    setReportData(data);
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    // Parse as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString();
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 1.5,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.7);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const imgWidth = 297; // A4 landscape width in mm
      const pageHeight = 210; // A4 landscape height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if content is longer than one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Consolidated_Member_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getTotalByType = (type) => {
    return reportData.reduce((sum, member) => sum + (member.contributions[type] || 0), 0);
  };

  const getGrandTotal = () => {
    return reportData.reduce((sum, member) => sum + member.total, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Consolidated Member Contribution Report</h1>
        <div className="flex space-x-3">
          <Button onClick={handlePrint} variant="secondary">Print</Button>
          <Button onClick={handleDownloadPDF}>Download PDF</Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Report Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Report As Of Date</label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {(dateFrom || dateTo || asOfDate) && (
          <button
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setAsOfDate('');
            }}
            className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear All Dates
          </button>
        )}
      </div>

      {/* Report Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-blue-700">Total Members</div>
            <div className="text-2xl font-bold text-blue-900">{reportData.length}</div>
          </div>
          <div>
            <div className="text-sm text-blue-700">Contribution Types</div>
            <div className="text-2xl font-bold text-blue-900">{contributionTypes.length}</div>
          </div>
          <div>
            <div className="text-sm text-blue-700">Grand Total</div>
            <div className="text-2xl font-bold text-blue-900">{formatAmount(getGrandTotal())}</div>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div ref={reportRef} className="bg-white p-4 rounded-lg shadow print:shadow-none print:p-2">
        <div className="text-center mb-3">
          <h2 className="text-lg font-bold text-gray-900">St. Paul's Mar Thoma Church</h2>
          <h3 className="text-sm font-semibold text-gray-700 mt-1">
            Member Report as of {asOfDate ? formatDate(asOfDate) : new Date().toLocaleDateString()}
          </h3>
          {(dateFrom || dateTo) && (
            <p className="text-xs text-gray-600 mt-1">
              Period: {dateFrom ? formatDate(dateFrom) : 'Beginning'} - {dateTo ? formatDate(dateTo) : 'Present'}
            </p>
          )}
        </div>

        {reportData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No contribution data found for the selected period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1 text-left text-xs font-semibold text-gray-700">
                    Member
                  </th>
                  {contributionTypes.map(type => (
                    <th key={type} className="border border-gray-300 px-2 py-1 text-right text-xs font-semibold text-gray-700">
                      {type}
                    </th>
                  ))}
                  <th className="border border-gray-300 px-2 py-1 text-right text-xs font-semibold text-gray-900 bg-gray-200">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((member, index) => (
                  <tr key={member.memberId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-2 py-1 text-xs text-gray-900">
                      {member.memberName}
                    </td>
                    {contributionTypes.map(type => (
                      <td key={type} className="border border-gray-300 px-2 py-1 text-xs text-right text-gray-700">
                        {member.contributions[type] > 0 ? formatAmount(member.contributions[type]) : '-'}
                      </td>
                    ))}
                    <td className="border border-gray-300 px-2 py-1 text-xs text-right font-semibold text-gray-900 bg-gray-100">
                      {formatAmount(member.total)}
                    </td>
                  </tr>
                ))}
                {/* Totals Row */}
                <tr className="bg-blue-100 font-bold">
                  <td className="border border-gray-300 px-2 py-1 text-xs text-gray-900">
                    TOTAL
                  </td>
                  {contributionTypes.map(type => (
                    <td key={type} className="border border-gray-300 px-2 py-1 text-xs text-right text-gray-900">
                      {formatAmount(getTotalByType(type))}
                    </td>
                  ))}
                  <td className="border border-gray-300 px-2 py-1 text-xs text-right text-gray-900 bg-blue-200">
                    {formatAmount(getGrandTotal())}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-2 text-xs text-gray-500 text-center">
          <p>Generated from church accounting system. For discrepancies, contact church office.</p>
        </div>
      </div>
    </div>
  );
};

export default ConsolidatedMemberReport;
