import { addDocument, getDocuments, functions } from './firebase';
import { httpsCallable } from 'firebase/functions';

// Log email sent to audit trail
export const logEmailSent = async (emailData) => {
  try {
    const log = await addDocument('emailLogs', {
      memberId: emailData.memberId,
      memberName: emailData.memberName,
      email: emailData.email,
      reportType: emailData.reportType || 'contribution',
      dateFrom: emailData.dateFrom,
      dateTo: emailData.dateTo,
      status: emailData.status, // 'success' or 'failed'
      error: emailData.error || null,
      sentAt: new Date(),
    });
    return log;
  } catch (error) {
    console.error('Error logging email:', error);
    throw error;
  }
};

// Get email logs for a member
export const getEmailLogs = async () => {
  try {
    const logs = await getDocuments('emailLogs', 'sentAt');
    return logs;
  } catch (error) {
    console.error('Error fetching email logs:', error);
    throw error;
  }
};

// Helper function to convert blob to base64
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Send email function via Brevo API (Firebase Cloud Function)
// IMPORTANT: Before this works in production, you must:
// 1. Install dependencies: cd functions && npm install
// 2. Set environment secrets in Firebase:
//    echo "YOUR_KEY" | firebase functions:secrets:set BREVO_API_KEY
//    echo "YOUR_EMAIL" | firebase functions:secrets:set SENDER_EMAIL
//    echo "Church Name" | firebase functions:secrets:set SENDER_NAME
// 3. Deploy the cloud function: firebase deploy --only functions
// 4. See BREVO_QUICK_DEPLOY.md for complete instructions

const TESTING_MODE = false; // Set to false for production with Brevo API

export const sendContributionEmail = async (memberEmail, pdfBlob, memberName, reportPeriod) => {
  if (TESTING_MODE) {
    // TESTING MODE: Simulates email sending
    return new Promise((resolve, reject) => {
      console.log('TEST MODE: Simulating email send to:', memberEmail);
      console.log('Member:', memberName);
      console.log('Period:', reportPeriod);
      console.log('PDF size:', pdfBlob?.size || 0, 'bytes');

      setTimeout(() => {
        // Simulate success (90% of the time)
        if (Math.random() > 0.1) {
          resolve({
            success: true,
            message: `TEST MODE: Email would be sent to ${memberEmail}`,
          });
        } else {
          reject(new Error('TEST MODE: Simulated email sending failure'));
        }
      }, 1000);
    });
  }

  // PRODUCTION MODE: Calls Firebase Cloud Function to send email
  try {
    const sendEmail = httpsCallable(functions, 'sendContributionEmail');

    // Convert PDF blob to base64
    const base64 = await blobToBase64(pdfBlob);

    const result = await sendEmail({
      memberEmail,
      memberName,
      pdfBase64: base64.split(',')[1], // Remove data:application/pdf;base64, prefix
      reportPeriod,
    });

    return result.data;
  } catch (error) {
    console.error('Error calling cloud function:', error);
    throw new Error(error.message || 'Failed to send email');
  }
};

// Schedule email sending
export const scheduleEmail = async (scheduleData) => {
  try {
    const scheduled = await addDocument('scheduledEmails', {
      ...scheduleData,
      status: 'pending', // 'pending', 'sent', 'failed'
      scheduledFor: new Date(scheduleData.scheduledFor),
    });
    return scheduled;
  } catch (error) {
    console.error('Error scheduling email:', error);
    throw error;
  }
};

// Get scheduled emails
export const getScheduledEmails = async () => {
  try {
    const scheduled = await getDocuments('scheduledEmails', 'scheduledFor');
    return scheduled;
  } catch (error) {
    console.error('Error fetching scheduled emails:', error);
    throw error;
  }
};
