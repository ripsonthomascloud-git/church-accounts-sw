import { useState, useEffect, useRef } from 'react';
import { useMembers } from '../../hooks/useMembers';
import { useTransactions } from '../../hooks/useTransactions';
import Button from '../common/Button';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

    // Define aggregation groups
    const aggregationGroups = {
      'Building Fund': {
        categories: ['BUILDING ACCOUNT', 'Building Fund'],
        subCategories: ['BUILDING ACCOUNT', 'Building Fund', 'Building Maintenance', 'Building Repair']
      },
      'Community Outreach': {
        categories: ['COMMUNITY OUTREACH', 'Community Outreach'],
        subCategories: ['COMMUNITY OUTREACH', 'Community Outreach', 'Charity', 'Mission', 'Outreach Programs']
      },
      'Other Income': {
        categories: ['OTHER INCOME', 'Other Income', 'DONATIONS'],
        subCategories: ['OTHER INCOME', 'Other Income', 'Miscellaneous', 'Donations', 'Gifts', 'Donations-Other', 'DONATIONS - Other']
      }
    };

    // Get all unique contribution types with aggregation
    const typesMap = new Map();
    const aggregatedTypes = [];

    // First, add aggregated categories
    Object.entries(aggregationGroups).forEach(([groupName, groupConfig]) => {
      aggregatedTypes.push({
        key: groupName,
        label: groupName,
        isAggregated: true,
        categories: groupConfig.categories,
        subCategories: groupConfig.subCategories
      });
    });

    // Then, add remaining individual categories that don't belong to aggregation groups
    filteredIncome.forEach(transaction => {
      if (transaction.category && transaction.subCategory) {
        // Check if this transaction belongs to any aggregation group
        const isInAggregatedGroup = Object.values(aggregationGroups).some(group => 
          group.categories.includes(transaction.category) || 
          group.subCategories.includes(transaction.subCategory)
        );

        if (!isInAggregatedGroup) {
          const key = transaction.subCategory;
          const label = `${transaction.category} - ${transaction.subCategory}`;
          if (!typesMap.has(key)) {
            typesMap.set(key, label);
          }
        }
      }
    });

    // Combine aggregated types with individual types
    const individualTypes = Array.from(typesMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([key, label]) => ({ key, label, isAggregated: false }));

    const sortedTypes = [...aggregatedTypes, ...individualTypes];
    setContributionTypes(sortedTypes);

    // Build report data for each member
    const data = members.map(member => {
      const memberContributions = filteredIncome.filter(
        transaction => transaction.memberId === member.id
      );

      const contributionsByType = {};
      let total = 0;

      // Track all processed transactions to avoid double counting across all aggregated groups
    const globallyProcessedTransactions = new Set();
    
    sortedTypes.forEach(type => {
        let typeTotal = 0;
        
        if (type.isAggregated) {
          // For aggregated types, sum all transactions that match the group criteria
          // Only count transactions that haven't been processed by previous groups
          typeTotal = memberContributions
            .filter(t => {
              // Skip if already processed by another aggregated group
              if (globallyProcessedTransactions.has(t.id)) return false;
              
              // Check if transaction matches this group
              const matchesGroup = type.categories.includes(t.category) || 
                                  type.subCategories.includes(t.subCategory);
              
              if (matchesGroup) {
                globallyProcessedTransactions.add(t.id);
              }
              
              return matchesGroup;
            })
            .reduce((sum, t) => sum + (t.amount || 0), 0);
        } else {
          // For individual types, use the original logic
          // Only include transactions not processed by aggregated groups
          typeTotal = memberContributions
            .filter(t => t.subCategory === type.key && !globallyProcessedTransactions.has(t.id))
            .reduce((sum, t) => sum + (t.amount || 0), 0);
        }
        
        contributionsByType[type.key] = typeTotal;
        total += typeTotal;
      });

      return {
        memberId: member.id,
        memberName: `${member.firstName} ${member.lastName}`,
        contributions: contributionsByType,
        total: total
      };
    })
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
    try {
      console.log('Starting PDF generation...');
      console.log('Report data:', reportData.length, 'members');
      console.log('Contribution types:', contributionTypes.length);
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });
      
      console.log('PDF instance created');

      // Add title
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('St. Paul\'s Mar Thoma Church', pdf.internal.pageSize.getWidth() / 2, 10, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      const reportTitle = `Member Report as of ${asOfDate ? formatDate(asOfDate) : new Date().toLocaleDateString()}`;
      pdf.text(reportTitle, pdf.internal.pageSize.getWidth() / 2, 16, { align: 'center' });
      
      if (dateFrom || dateTo) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const period = `Period: ${dateFrom ? formatDate(dateFrom) : 'Beginning'} - ${dateTo ? formatDate(dateTo) : 'Present'}`;
        pdf.text(period, pdf.internal.pageSize.getWidth() / 2, 21, { align: 'center' });
      }

      // Prepare table headers
      const headers = [
        'Member',
        ...contributionTypes.map(type => type.label),
        'Total'
      ];

      // Prepare table body
      const body = reportData.map(member => [
        member.memberName,
        ...contributionTypes.map(type => 
          formatAmount(member.contributions[type.key] || 0)
        ),
        formatAmount(member.total)
      ]);

      // Add totals row
      body.push([
        'TOTAL',
        ...contributionTypes.map(type => formatAmount(getTotalByType(type.key))),
        formatAmount(getGrandTotal())
      ]);

      // Generate table with autoTable
      console.log('Calling autoTable...');
      autoTable(pdf, {
        head: [headers],
        body: body,
        startY: dateFrom || dateTo ? 24 : 19,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 1.5,
          lineColor: [0, 0, 0],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [30, 30, 30],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 8,
          cellPadding: 1.5,
        },
        columnStyles: {
          0: { cellWidth: 32, halign: 'left', fontStyle: 'bold' }, // Member name column - slightly narrower
          ...Object.fromEntries(
            contributionTypes.map((_, index) => [
              index + 1,
              { cellWidth: 'auto', halign: 'right', minCellWidth: 14, fontStyle: 'bold' }
            ])
          ),
          [contributionTypes.length + 1]: { 
            cellWidth: 18, 
            halign: 'right',
            fillColor: [245, 245, 245],
            fontStyle: 'bold'
          }
        },
        didParseCell: function(data) {
          // Style the totals row
          if (data.row.index === body.length - 1) {
            data.cell.styles.fillColor = [220, 240, 255];
            data.cell.styles.fontStyle = 'bold';
          }
        },
        rowPageBreak: 'avoid', // Prevent rows from breaking across pages
        margin: { top: 10, right: 3, bottom: 15, left: 3 },
        tableWidth: 'auto',
        showHead: 'everyPage', // This repeats headers on every page
      });
      
      console.log('AutoTable completed');

      // Add footer
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(80, 80, 80);
        pdf.text(
          'For any discrepancies or clarification please contact Raju Chacko (Trustee) 214-597-6568 / Ripson Thomas (Accountant) 202-909-6238',
          pdf.internal.pageSize.getWidth() / 2,
          pdf.internal.pageSize.getHeight() - 4,
          { align: 'center' }
        );
        pdf.setFont('helvetica', 'normal');
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pdf.internal.pageSize.getWidth() - 8,
          pdf.internal.pageSize.getHeight() - 4,
          { align: 'right' }
        );
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

  const getTotalByType = (typeKey) => {
    return reportData.reduce((sum, member) => sum + (member.contributions[typeKey] || 0), 0);
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
      <div ref={reportRef} className="bg-white p-3 rounded-lg shadow print:shadow-none print:p-1">
        <div className="text-center mb-2">
          <h2 className="text-base font-bold text-gray-900">St. Paul's Mar Thoma Church</h2>
          <h3 className="text-xs font-semibold text-gray-700 mt-1">
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
            <table className="min-w-full border-collapse border border-black" style={{ fontSize: '10px', borderColor: 'black' }}>
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black px-2 py-1 text-left font-bold text-gray-800" style={{ minWidth: '120px', width: '120px', borderColor: 'black' }}>
                    Member
                  </th>
                  {contributionTypes.map(type => (
                    <th key={type.key} className="border border-black px-2 py-1 text-right font-bold text-gray-800" style={{ minWidth: '60px', maxWidth: '80px', whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.2', borderColor: 'black' }}>
                      {type.label}
                    </th>
                  ))}
                  <th className="border border-black px-2 py-1 text-right font-bold text-gray-900 bg-gray-200" style={{ minWidth: '60px', borderColor: 'black' }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((member, index) => (
                  <tr key={member.memberId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-black px-2 py-1 font-semibold text-gray-900" style={{ minWidth: '120px', width: '120px', borderColor: 'black' }}>
                      {member.memberName}
                    </td>
                    {contributionTypes.map(type => (
                      <td key={type.key} className="border border-black px-2 py-1 text-right font-medium text-gray-800" style={{ minWidth: '60px', maxWidth: '80px', borderColor: 'black' }}>
                        {formatAmount(member.contributions[type.key] || 0)}
                      </td>
                    ))}
                    <td className="border border-black px-2 py-1 text-right font-bold text-gray-900 bg-gray-100" style={{ minWidth: '60px', borderColor: 'black' }}>
                      {formatAmount(member.total)}
                    </td>
                  </tr>
                ))}
                {/* Totals Row */}
                <tr className="bg-blue-100 font-bold">
                  <td className="border border-black px-2 py-1 font-bold text-gray-900" style={{ minWidth: '120px', width: '120px', borderColor: 'black' }}>
                    TOTAL
                  </td>
                  {contributionTypes.map(type => (
                    <td key={type.key} className="border border-black px-2 py-1 text-right font-bold text-gray-900" style={{ minWidth: '60px', maxWidth: '80px', borderColor: 'black' }}>
                      {formatAmount(getTotalByType(type.key))}
                    </td>
                  ))}
                  <td className="border border-black px-2 py-1 text-right font-bold text-gray-900 bg-blue-200" style={{ minWidth: '60px', borderColor: 'black' }}>
                    {formatAmount(getGrandTotal())}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-2 text-gray-600 text-center" style={{ fontSize: '10px' }}>
          <p>For any discrepancies or clarification please contact Raju Chacko (Trustee) 214-597-6568 / Ripson Thomas (Accountant) 202-909-6238</p>
        </div>
      </div>
    </div>
  );
};

export default ConsolidatedMemberReport;
