import { useState, useMemo, useRef, useEffect } from 'react';
import { useMembers } from '../../hooks/useMembers';
import { useTransactions } from '../../hooks/useTransactions';
import { useCategories } from '../../hooks/useCategories';
import Button from '../common/Button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { logEmailSent, sendContributionEmail, scheduleEmail, getScheduledEmails, getEmailLogs } from '../../services/emailService';

const MemberContributionReport = () => {
  const { members } = useMembers();
  const { transactions: incomeTransactions } = useTransactions('income');
  const { categories: incomeCategories } = useCategories('income');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showConsolidated, setShowConsolidated] = useState(false);
  const [emailLogs, setEmailLogs] = useState([]);
  const [scheduledEmails, setScheduledEmails] = useState([]);
  const [showEmailLogs, setShowEmailLogs] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);
  const [consolidatedFilter, setConsolidatedFilter] = useState('');
  const [memberDropdownFilter, setMemberDropdownFilter] = useState('');
  const letterRef = useRef(null);

  // Filter transactions to only include those in contribution reports
  const contributionTransactions = useMemo(() => {
    const contributionCategoryNames = new Set(
      incomeCategories
        .filter(cat => cat.includeInContributionReport)
        .map(cat => cat.name)
    );

    return incomeTransactions.filter(t => {
      // Normalize transaction date to YYYY-MM-DD format for comparison
      let transactionDate;
      if (t.date && t.date.seconds) {
        // Firestore Timestamp
        transactionDate = new Date(t.date.seconds * 1000).toISOString().split('T')[0];
      } else if (t.date) {
        // Regular date string or Date object
        transactionDate = new Date(t.date).toISOString().split('T')[0];
      } else {
        return false;
      }

      const dateMatch = (!dateFrom || transactionDate >= dateFrom) && (!dateTo || transactionDate <= dateTo);
      return dateMatch && (contributionCategoryNames.has(t.category) || contributionCategoryNames.has(t.subCategory));
    });
  }, [incomeTransactions, incomeCategories, dateFrom, dateTo]);

  // Load email logs and scheduled emails
  useEffect(() => {
    const loadEmailData = async () => {
      try {
        const [logs, scheduled] = await Promise.all([
          getEmailLogs(),
          getScheduledEmails()
        ]);
        setEmailLogs(logs);
        setScheduledEmails(scheduled);
      } catch (error) {
        console.error('Error loading email data:', error);
      }
    };
    loadEmailData();
  }, []);

  // Calculate contributions for a specific member
  const getMemberContributions = (memberId) => {
    const memberTransactions = contributionTransactions.filter(
      t => t.memberId === memberId
    );

    // Sort transactions by date descending
    const sortedTransactions = [...memberTransactions].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA;
    });

    const byCategory = {};
    let total = 0;

    memberTransactions.forEach(t => {
      const category = t.category || 'Uncategorized';
      if (!byCategory[category]) {
        byCategory[category] = { total: 0, transactions: [] };
      }
      byCategory[category].total += parseFloat(t.amount || 0);
      byCategory[category].transactions.push(t);
      total += parseFloat(t.amount || 0);
    });

    return {
      byCategory,
      total,
      transactionCount: memberTransactions.length,
      transactions: sortedTransactions
    };
  };

  // Get consolidated report for all members
  const consolidatedData = useMemo(() => {
    const data = [];
    members.forEach(member => {
      const { byCategory, total, transactionCount } = getMemberContributions(member.id);
      if (total > 0) {
        data.push({
          memberId: member.id,
          memberName: `${member.firstName} ${member.lastName}`,
          total,
          transactionCount,
          byCategory
        });
      }
    });
    return data.sort((a, b) => a.memberName.localeCompare(b.memberName));
  }, [members, contributionTransactions]);

  // Filter consolidated data based on search text
  const filteredConsolidatedData = useMemo(() => {
    if (!consolidatedFilter.trim()) return consolidatedData;
    const lowerFilter = consolidatedFilter.toLowerCase();
    return consolidatedData.filter(member =>
      member.memberName.toLowerCase().includes(lowerFilter)
    );
  }, [consolidatedData, consolidatedFilter]);

  // Filter members for dropdown based on search text
  const filteredMembers = useMemo(() => {
    if (!memberDropdownFilter.trim()) return members;
    const lowerFilter = memberDropdownFilter.toLowerCase();
    return members.filter(member => {
      const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
      return fullName.includes(lowerFilter);
    });
  }, [members, memberDropdownFilter]);

  const selectedMemberData = useMemo(() => {
    if (!selectedMemberId) return null;
    const member = members.find(m => m.id === selectedMemberId);
    if (!member) return null;
    return {
      member,
      ...getMemberContributions(selectedMemberId)
    };
  }, [selectedMemberId, members, contributionTransactions]);

  const grandTotal = useMemo(() => {
    return filteredConsolidatedData.reduce((sum, m) => sum + m.total, 0);
  }, [filteredConsolidatedData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString, options = {}) => {
    if (!dateString) return 'N/A';

    let date;
    // Handle Firestore Timestamp objects
    if (dateString.seconds) {
      date = new Date(dateString.seconds * 1000);
    } else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) return 'N/A';

    // If custom options provided, use them; otherwise use dd/mm/yyyy format
    if (Object.keys(options).length > 0) {
      return date.toLocaleDateString('en-GB', options);
    }

    // Default mm/dd/yyyy format
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleMemberClick = (memberId) => {
    setSelectedMemberId(memberId);
    setShowConsolidated(false);
  };

  const handleDownloadPDF = async (downloadLocally = true) => {
    if (!letterRef.current) return;

    try {
      const canvas = await html2canvas(letterRef.current, {
        scale: 1.5,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

      if (downloadLocally) {
        const member = members.find(m => m.id === selectedMemberId);
        const fileName = `Contribution_Report_${member?.firstName}_${member?.lastName}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
      }

      return pdf.output('blob');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    }
  };

  const handleSendEmail = async () => {
    if (!selectedMemberId) {
      alert('Please select a member first');
      return;
    }

    const member = members.find(m => m.id === selectedMemberId);
    if (!member?.email) {
      alert('Member does not have an email address');
      return;
    }

    setIsSendingEmail(true);
    setEmailStatus(null);

    try {
      const pdfBlob = await handleDownloadPDF(false);
      const reportPeriod = dateFrom && dateTo
        ? `${formatDate(dateFrom)} - ${formatDate(dateTo)}`
        : new Date().getFullYear().toString();

      await sendContributionEmail(
        member.email,
        pdfBlob,
        `${member.firstName} ${member.lastName}`,
        reportPeriod
      );

      await logEmailSent({
        memberId: member.id,
        memberName: `${member.firstName} ${member.lastName}`,
        email: member.email,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        status: 'success',
      });

      setEmailStatus({ type: 'success', message: 'Email sent successfully!' });

      // Reload email logs
      const logs = await getEmailLogs();
      setEmailLogs(logs);
    } catch (error) {
      console.error('Error sending email:', error);

      await logEmailSent({
        memberId: member.id,
        memberName: `${member.firstName} ${member.lastName}`,
        email: member.email,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        status: 'failed',
        error: error.message,
      });

      setEmailStatus({ type: 'error', message: `Failed to send email: ${error.message}` });
    } finally {
      setIsSendingEmail(false);
      setTimeout(() => setEmailStatus(null), 5000);
    }
  };

  const handleSendToAllMembers = async () => {
    const membersWithContributions = consolidatedData.filter(m => {
      const member = members.find(mem => mem.id === m.memberId);
      return member?.email;
    });

    if (membersWithContributions.length === 0) {
      alert('No members with contributions and valid email addresses found');
      return;
    }

    const confirmed = window.confirm(
      `Send contribution reports to ${membersWithContributions.length} members with email addresses?`
    );

    if (!confirmed) return;

    setIsSendingEmail(true);
    setEmailStatus({ type: 'info', message: 'Sending emails...' });

    let successCount = 0;
    let failCount = 0;

    for (const memberData of membersWithContributions) {
      const member = members.find(m => m.id === memberData.memberId);

      try {
        // Temporarily select member to generate their report
        setSelectedMemberId(member.id);
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for render

        const pdfBlob = await handleDownloadPDF(false);
        const reportPeriod = dateFrom && dateTo
          ? `${formatDate(dateFrom)} - ${formatDate(dateTo)}`
          : new Date().getFullYear().toString();

        await sendContributionEmail(
          member.email,
          pdfBlob,
          `${member.firstName} ${member.lastName}`,
          reportPeriod
        );

        await logEmailSent({
          memberId: member.id,
          memberName: `${member.firstName} ${member.lastName}`,
          email: member.email,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          status: 'success',
        });

        successCount++;
      } catch (error) {
        console.error(`Error sending email to ${member.email}:`, error);

        await logEmailSent({
          memberId: member.id,
          memberName: `${member.firstName} ${member.lastName}`,
          email: member.email,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          status: 'failed',
          error: error.message,
        });

        failCount++;
      }
    }

    setSelectedMemberId('');
    setShowConsolidated(true);
    setIsSendingEmail(false);
    setEmailStatus({
      type: successCount > 0 ? 'success' : 'error',
      message: `Sent ${successCount} emails successfully. ${failCount} failed.`
    });

    // Reload email logs
    const logs = await getEmailLogs();
    setEmailLogs(logs);

    setTimeout(() => setEmailStatus(null), 5000);
  };

  const handleScheduleEmail = async () => {
    if (!scheduleDate || !scheduleTime) {
      alert('Please select date and time');
      return;
    }

    const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`);

    if (scheduledFor < new Date()) {
      alert('Scheduled time must be in the future');
      return;
    }

    try {
      await scheduleEmail({
        memberIds: selectedMemberId ? [selectedMemberId] : consolidatedData.map(m => m.memberId),
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        scheduledFor: scheduledFor.toISOString(),
        reportType: 'contribution',
      });

      alert('Email scheduled successfully!');
      setShowScheduleModal(false);
      setScheduleDate('');
      setScheduleTime('');

      // Reload scheduled emails
      const scheduled = await getScheduledEmails();
      setScheduledEmails(scheduled);
    } catch (error) {
      console.error('Error scheduling email:', error);
      alert('Failed to schedule email');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Member Contribution Report</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Member
            </label>
            <input
              type="text"
              placeholder="Filter members..."
              value={memberDropdownFilter}
              onChange={(e) => setMemberDropdownFilter(e.target.value)}
              className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={selectedMemberId}
              onChange={(e) => {
                setSelectedMemberId(e.target.value);
                setShowConsolidated(false);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose member...</option>
              {filteredMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.firstName} {member.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2 flex-wrap">
            <Button
              onClick={() => {
                setShowConsolidated(true);
                setSelectedMemberId('');
              }}
              variant="primary"
            >
              Show All Members
            </Button>
            <Button onClick={handlePrint} variant="secondary">
              Print
            </Button>
            {selectedMemberId && (
              <>
                <Button onClick={handleDownloadPDF} variant="secondary">
                  Download PDF
                </Button>
                <div className="flex flex-col gap-1">
                  <Button
                    onClick={handleSendEmail}
                    variant="primary"
                    disabled={isSendingEmail}
                  >
                    {isSendingEmail ? 'Sending...' : 'Send Email'}
                  </Button>
                  {selectedMemberData?.member?.email && (
                    <span className="text-xs text-gray-600">
                      To: {selectedMemberData.member.email}
                    </span>
                  )}
                  {selectedMemberData?.member && !selectedMemberData.member.email && (
                    <span className="text-xs text-red-600">
                      No email address
                    </span>
                  )}
                </div>
              </>
            )}
            {showConsolidated && (
              <Button
                onClick={handleSendToAllMembers}
                variant="primary"
                disabled={isSendingEmail}
              >
                {isSendingEmail ? 'Sending...' : 'Send to All Members'}
              </Button>
            )}
            <Button
              onClick={() => setShowScheduleModal(true)}
              variant="secondary"
            >
              Schedule Email
            </Button>
            <Button
              onClick={() => setShowEmailLogs(!showEmailLogs)}
              variant="secondary"
            >
              {showEmailLogs ? 'Hide' : 'Show'} Email Logs
            </Button>
          </div>
        </div>
      </div>

      {selectedMemberData && !showConsolidated && (
        <div className="bg-white rounded-lg shadow-md">
          {emailStatus && (
            <div className={`p-4 mb-4 rounded ${
              emailStatus.type === 'success' ? 'bg-green-100 text-green-800' :
              emailStatus.type === 'error' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {emailStatus.message}
            </div>
          )}

          {/* Letter Format */}
          <div ref={letterRef} className="p-12 bg-white">
            {/* Logo and Header */}
            <div className="text-center mb-8">
              <img
                src="/logo.png"
                alt="Church Logo"
                className="w-24 h-24 mx-auto mb-4"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                St. Paul's Mar Thoma Church
              </h1>
              <div className="text-sm text-gray-600 mb-6">
                <p>Contributions as of  {formatDate(new Date(), {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
                {dateFrom && dateTo && (
                  <p className="mt-1">
                    Period: {formatDate(dateFrom)} - {formatDate(dateTo)}
                  </p>
                )}
              </div>
            </div>

            {/* Letter Body */}
            <div className="mb-8">
              <p className="text-lg mb-4">
                Dear {selectedMemberData.member.firstName} {selectedMemberData.member.lastName},
              </p>
              <p className="mb-6 text-gray-700">
                Thank you for your generous contributions to St. Paul's Marthoma Church.
                Your support helps us continue our mission and serve our community.
                Below is a detailed summary of your contributions{dateFrom && dateTo ? ' for the specified period' : ''}.
              </p>
            </div>

            {/* Individual Transactions Grid */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Contribution Details</h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Category</th>
                    <th className="text-left py-3 px-4 font-semibold">Sub Category</th>
                    <th className="text-left py-3 px-4 font-semibold">Description</th>
                    <th className="text-right py-3 px-4 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMemberData.transactions.map((transaction, index) => (
                    <tr key={transaction.id || index} className="border-b border-gray-200">
                      <td className="py-2 px-4">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="py-2 px-4">{transaction.category || 'Uncategorized'}</td>
                      <td className="py-2 px-4">{transaction.subCategory || '-'}</td>
                      <td className="py-2 px-4">{transaction.description || '-'}</td>
                      <td className="text-right py-2 px-4">{formatCurrency(transaction.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-400 bg-gray-50">
                    <td colSpan="4" className="py-3 px-4 font-bold text-lg">Grand Total</td>
                    <td className="text-right py-3 px-4 font-bold text-lg">
                      {formatCurrency(selectedMemberData.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Closing */}
            <div className="mt-8 text-gray-700">
              <p className="mb-2">With gratitude,</p>
              <p className="font-semibold">Trustees ,</p>
              <p className="font-semibold"> Sd/- </p>
              <p className="font-semibold"> Raju Chacko (Trustee Finance)</p>
              <p className="font-semibold">Ripson Thomas (Trustee Accounts)</p>
            </div>
          </div>
        </div>
      )}

      {showConsolidated && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Consolidated Member Contributions
          </h3>

          {dateFrom && dateTo && (
            <p className="text-sm text-gray-600 mb-4">
              Period: {formatDate(dateFrom)} - {formatDate(dateTo)}
            </p>
          )}

          <div className="mb-4">
            <input
              type="text"
              placeholder="Filter by member name..."
              value={consolidatedFilter}
              onChange={(e) => setConsolidatedFilter(e.target.value)}
              className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 px-4">Member Name</th>
                  <th className="text-right py-2 px-4">Transactions</th>
                  <th className="text-right py-2 px-4">Total Contributions</th>
                </tr>
              </thead>
              <tbody>
                {filteredConsolidatedData.map(member => (
                  <tr
                    key={member.memberId}
                    className="border-b border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => handleMemberClick(member.memberId)}
                    title="Click to view detailed report"
                  >
                    <td className="py-2 px-4">{member.memberName}</td>
                    <td className="text-right py-2 px-4">{member.transactionCount}</td>
                    <td className="text-right py-2 px-4">{formatCurrency(member.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-bold">
                  <td className="py-2 px-4">Grand Total</td>
                  <td className="text-right py-2 px-4">
                    {filteredConsolidatedData.reduce((sum, m) => sum + m.transactionCount, 0)}
                  </td>
                  <td className="text-right py-2 px-4">{formatCurrency(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {!selectedMemberData && !showConsolidated && (
        <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-500">
          Select a member or click "Show All Members" to view contribution report
        </div>
      )}

      {/* Email Logs */}
      {showEmailLogs && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Email Audit Trail</h3>
          {emailLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No emails sent yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="text-left py-2 px-4">Date/Time</th>
                    <th className="text-left py-2 px-4">Member</th>
                    <th className="text-left py-2 px-4">Email</th>
                    <th className="text-left py-2 px-4">Period</th>
                    <th className="text-left py-2 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {emailLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-200">
                      <td className="py-2 px-4">
                        {log.sentAt ? new Date(log.sentAt.seconds * 1000).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-2 px-4">{log.memberName}</td>
                      <td className="py-2 px-4">{log.email}</td>
                      <td className="py-2 px-4">
                        {log.dateFrom && log.dateTo
                          ? `${formatDate(log.dateFrom)} - ${formatDate(log.dateTo)}`
                          : 'All time'}
                      </td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-1 rounded text-sm ${
                          log.status === 'success'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                        {log.error && (
                          <span className="text-xs text-red-600 block mt-1">{log.error}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Scheduled Emails */}
      {scheduledEmails.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Scheduled Emails</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2 px-4">Scheduled For</th>
                  <th className="text-left py-2 px-4">Recipients</th>
                  <th className="text-left py-2 px-4">Period</th>
                  <th className="text-left py-2 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {scheduledEmails.map((schedule) => (
                  <tr key={schedule.id} className="border-b border-gray-200">
                    <td className="py-2 px-4">
                      {schedule.scheduledFor
                        ? new Date(schedule.scheduledFor.seconds * 1000).toLocaleString()
                        : 'N/A'}
                    </td>
                    <td className="py-2 px-4">
                      {schedule.memberIds?.length || 0} member(s)
                    </td>
                    <td className="py-2 px-4">
                      {schedule.dateFrom && schedule.dateTo
                        ? `${formatDate(schedule.dateFrom)} - ${formatDate(schedule.dateTo)}`
                        : 'All time'}
                    </td>
                    <td className="py-2 px-4">
                      <span className={`px-2 py-1 rounded text-sm ${
                        schedule.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : schedule.status === 'sent'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {schedule.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedule Email Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Schedule Email</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="text-sm text-gray-600">
                {selectedMemberId ? (
                  <p>Will send to selected member only</p>
                ) : (
                  <p>Will send to all members with contributions and valid email addresses</p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => {
                    setShowScheduleModal(false);
                    setScheduleDate('');
                    setScheduleTime('');
                  }}
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button onClick={handleScheduleEmail} variant="primary">
                  Schedule
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberContributionReport;
