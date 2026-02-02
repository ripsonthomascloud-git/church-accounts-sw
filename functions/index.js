/**
 * Firebase Cloud Functions for Email Integration with Brevo API
 *
 * This file contains the cloud function to send contribution reports
 * via email using the Brevo (formerly Sendinblue) API.
 */

const {setGlobalOptions} = require("firebase-functions/v2");
const {onCall} = require("firebase-functions/v2/https");
const {defineString} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const brevo = require("@getbrevo/brevo");

// Define environment parameters (replaces deprecated functions.config())
const BREVO_API_KEY = defineString("BREVO_API_KEY");
const SENDER_EMAIL = defineString("SENDER_EMAIL");
const SENDER_NAME = defineString("SENDER_NAME");

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  region: "us-east4"
});

/**
 * Cloud Function to send contribution report emails via Brevo API
 *
 * @param {Object} data - The request data
 * @param {string} data.memberEmail - Recipient email address
 * @param {string} data.memberName - Recipient name
 * @param {string} data.pdfBase64 - Base64 encoded PDF attachment
 * @param {string} data.reportPeriod - Report period description
 *
 * @returns {Object} Result object with success status and messageId
 */
exports.sendContributionEmail = onCall(
  {
    cors: true, // Enable CORS for all origins
  },
  async (request) => {
  const { memberEmail, memberName, pdfBase64, reportPeriod } = request.data;

  // Validate required parameters
  if (!memberEmail || !memberName || !pdfBase64 || !reportPeriod) {
    logger.error("Missing required parameters", {
      memberEmail,
      memberName,
      reportPeriod,
      hasPdf: !!pdfBase64
    });
    throw new Error("Missing required parameters");
  }

  // Get Brevo API key and sender info from environment parameters
  const brevoApiKey = BREVO_API_KEY.value();
  const senderEmail = SENDER_EMAIL.value();
  const senderName = SENDER_NAME.value();

  if (!brevoApiKey) {
    logger.error("Brevo API key not configured");
    throw new Error("Email service not configured. Please set BREVO_API_KEY.");
  }

  try {
    // Initialize Brevo API client
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      brevoApiKey
    );

    // Prepare email content
    const sendSmtpEmail = new brevo.SendSmtpEmail();

    // Format current date for subject
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    sendSmtpEmail.subject = `Contribution Report - ${reportPeriod} - ${currentDate}`;

    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>St. Paul's Mar Thoma Church</h1>
          </div>
          <div class="content">
            <h2>Dear ${memberName},</h2>
            <p>Thank you for your generous contributions to St. Paul's Mar Thoma Church. Your support helps us continue our mission and serve our community.</p>
            <p>Please find your contribution report attached for the period: <strong>${reportPeriod}</strong></p>
            <p>If you have any questions or concerns about this report, please don't hesitate to contact us.</p>
            <br>
            <p>With gratitude,</p>
            <p><strong>Trustees</strong><br>
            Sd/-<br>
            Raju Chacko (Trustee Finance)<br>
            Ripson Thomas (Trustee Accounts)</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} St. Paul's Mar Thoma Church. All rights reserved.</p>
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </body>
      </html>
    `;

    // Set sender information
    sendSmtpEmail.sender = {
      name: senderName,
      email: senderEmail
    };

    // Set recipient information
    sendSmtpEmail.to = [{
      email: memberEmail,
      name: memberName
    }];

    // Attach PDF report
    sendSmtpEmail.attachment = [{
      content: pdfBase64,
      name: `Contribution_Report_${memberName.replace(/[^a-zA-Z0-9]/g, '_')}_${reportPeriod.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    }];

    // Add tags for tracking
    sendSmtpEmail.tags = ["contribution-report"];

    // Send email via Brevo API
    logger.info("Sending email via Brevo", {
      to: memberEmail,
      subject: sendSmtpEmail.subject
    });

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    logger.info("Email sent successfully", {
      messageId: result.messageId,
      to: memberEmail
    });

    return {
      success: true,
      messageId: result.messageId,
      message: "Email sent successfully"
    };

  } catch (error) {
    logger.error("Error sending email via Brevo", {
      error: error.message,
      statusCode: error.statusCode,
      response: error.response?.text,
      memberEmail
    });

    // Throw a user-friendly error
    throw new Error(
      error.response?.text ||
      error.message ||
      "Failed to send email. Please try again later."
    );
  }
  }
);
