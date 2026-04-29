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

    // Get all unique contribution types (category - subcategory)
    const typesMap = new Map();
    filteredIncome.forEach(transaction => {
      if (transaction.category && transaction.subCategory) {
        const key = transaction.subCategory;
        const label = `${transaction.category} - ${transaction.subCategory}`;
        typesMap.set(key, label);
      }
    });
    const sortedTypes = Array.from(typesMap.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([key, label]) => ({ key, label }));
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
          .filter(t => t.subCategory === type.key)
          .reduce((sum, t) => sum + (t.amount || 0), 0);
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
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('St. Paul\'s Mar Thoma Church', pdf.internal.pageSize.getWidth() / 2, 10, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const reportTitle = `Member Report as of ${asOfDate ? formatDate(asOfDate) : new Date().toLocaleDateString()}`;
      pdf.text(reportTitle, pdf.internal.pageSize.getWidth() / 2, 16, { align: 'center' });
      
      if (dateFrom || dateTo) {
        pdf.setFontSize(8);
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
          member.contributions[type.key] > 0 ? formatAmount(member.contributions[type.key]) : '-'
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
          fontSize: 7,
          cellPadding: 1,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [50, 50, 50],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 7,
          cellPadding: 1.5,
        },
        columnStyles: {
          0: { cellWidth: 35, halign: 'left' }, // Member name column - wider
          ...Object.fromEntries(
            contributionTypes.map((_, index) => [
              index + 1,
              { cellWidth: 'auto', halign: 'right', minCellWidth: 15 }
            ])
          ),
          [contributionTypes.length + 1]: { 
            cellWidth: 20, 
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
        margin: { top: 10, right: 5, bottom: 10, left: 5 },
        tableWidth: 'auto',
        showHead: 'everyPage', // This repeats headers on every page
      });
      
      console.log('AutoTable completed');

      // Add footer
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(
          'For any discrepancies or clarification please contact Raju Chacko (Trustee) 214-597-6568 / Ripson Thomas (Accountant) 202-909-6238',
          pdf.internal.pageSize.getWidth() / 2,
          pdf.internal.pageSize.getHeight() - 5,
          { align: 'center' }
        );
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pdf.internal.pageSize.getWidth() - 10,
          pdf.internal.pageSize.getHeight() - 5,
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
            <table className="min-w-full border-collapse border border-gray-300" style={{ fontSize: '8px' }}>
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-1 py-0.5 text-left font-semibold text-gray-700" style={{ minWidth: '120px', width: '120px' }}>
                    Member
                  </th>
                  {contributionTypes.map(type => (
                    <th key={type.key} className="border border-gray-300 px-1 py-0.5 text-right font-semibold text-gray-700" style={{ minWidth: '60px', maxWidth: '80px', whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.1' }}>
                      {type.label}
                    </th>
                  ))}
                  <th className="border border-gray-300 px-1 py-0.5 text-right font-semibold text-gray-900 bg-gray-200" style={{ minWidth: '60px' }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((member, index) => (
                  <tr key={member.memberId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-1 py-0.5 text-gray-900" style={{ minWidth: '120px', width: '120px' }}>
                      {member.memberName}
                    </td>
                    {contributionTypes.map(type => (
                      <td key={type.key} className="border border-gray-300 px-1 py-0.5 text-right text-gray-700" style={{ minWidth: '60px', maxWidth: '80px' }}>
                        {member.contributions[type.key] > 0 ? formatAmount(member.contributions[type.key]) : '-'}
                      </td>
                    ))}
                    <td className="border border-gray-300 px-1 py-0.5 text-right font-semibold text-gray-900 bg-gray-100" style={{ minWidth: '60px' }}>
                      {formatAmount(member.total)}
                    </td>
                  </tr>
                ))}
                {/* Totals Row */}
                <tr className="bg-blue-100 font-bold">
                  <td className="border border-gray-300 px-1 py-0.5 text-gray-900" style={{ minWidth: '120px', width: '120px' }}>
                    TOTAL
                  </td>
                  {contributionTypes.map(type => (
                    <td key={type.key} className="border border-gray-300 px-1 py-0.5 text-right text-gray-900" style={{ minWidth: '60px', maxWidth: '80px' }}>
                      {formatAmount(getTotalByType(type.key))}
                    </td>
                  ))}
                  <td className="border border-gray-300 px-1 py-0.5 text-right text-gray-900 bg-blue-200" style={{ minWidth: '60px' }}>
                    {formatAmount(getGrandTotal())}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-1 text-gray-500 text-center" style={{ fontSize: '9px' }}>
          <p>For any discrepancies or clarification please contact Raju Chacko (Trustee) 214-597-6568 / Ripson Thomas (Accountant) 202-909-6238</p>
        </div>
      </div>
    </div>
  );
};

export default ConsolidatedMemberReport;
