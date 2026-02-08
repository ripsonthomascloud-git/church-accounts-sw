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
const admin = require("firebase-admin");
const https = require("https");
const http = require("http");

// Initialize Firebase Admin
admin.initializeApp();

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
            <p>This is an automated email. You can reply to this email if any questions.</p>
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
      responseBody: error.response?.body,
      errorBody: error.body,
      fullError: JSON.stringify(error, null, 2),
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

/**
 * Cloud Function to download image from URL and upload to Firebase Storage
 * This bypasses CORS restrictions by downloading server-side
 *
 * @param {Object} data - The request data
 * @param {string} data.imageUrl - Image URL to download
 * @param {string} data.familyName - Family name for file naming
 *
 * @returns {Object} Result object with success status and storageUrl
 */
exports.uploadImageFromUrl = onCall(
  {
    cors: true,
  },
  async (request) => {
    const { imageUrl, familyName } = request.data;

    // Validate required parameters
    if (!imageUrl || !familyName) {
      logger.error("Missing required parameters", { imageUrl, familyName });
      throw new Error("imageUrl and familyName are required");
    }

    // Verify user is authenticated
    if (!request.auth) {
      throw new Error("Unauthorized - user must be authenticated");
    }

    logger.info("Starting image upload", { imageUrl, familyName });

    try {
      // Download image from URL
      logger.info("Attempting to download image", { imageUrl });
      const imageBuffer = await downloadImage(imageUrl);

      logger.info("Image downloaded successfully", {
        familyName,
        size: imageBuffer.length,
        type: typeof imageBuffer
      });

      // Create safe filename
      const safeFileName = familyName
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toLowerCase()
        .substring(0, 50);

      const timestamp = Date.now();
      const fileName = `parish-directory/${safeFileName}_${timestamp}.jpg`;

      // Upload to Firebase Storage
      // Try default bucket first, fall back to explicit name
      let bucket;
      let bucketName;

      try {
        bucket = admin.storage().bucket();
        bucketName = bucket.name;
        logger.info("Using default bucket", { bucketName });
      } catch (err) {
        logger.error("Failed to get default bucket, trying explicit name", { error: err.message });
        bucketName = 'accounting-software-6dc8c.appspot.com';
        bucket = admin.storage().bucket(bucketName);
        logger.info("Using explicit bucket", { bucketName });
      }

      const file = bucket.file(fileName);

      logger.info("Uploading to storage", { bucketName, fileName });

      await file.save(imageBuffer, {
        metadata: {
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=31536000',
        },
      });

      logger.info("File saved, making public");

      // Make file publicly readable
      await file.makePublic();

      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

      logger.info("Image uploaded successfully", {
        familyName,
        publicUrl
      });

      return {
        success: true,
        storageUrl: publicUrl,
        fileName: fileName
      };

    } catch (error) {
      logger.error("Error uploading image", {
        error: error.message,
        stack: error.stack,
        code: error.code,
        statusCode: error.statusCode,
        familyName,
        imageUrl,
        fullError: JSON.stringify(error, null, 2)
      });

      // Return more detailed error information
      throw new Error(`Failed to upload image: ${error.message} (${error.code || 'UNKNOWN'})`);
    }
  }
);

/**
 * Helper function to download image from URL
 * @param {string} url - Image URL
 * @returns {Promise<Buffer>} - Image buffer
 */
async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    // Add headers to mimic browser request (helps with Google Drive)
    const options = new URL(url);
    const requestOptions = {
      hostname: options.hostname,
      path: options.pathname + options.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    };

    logger.info("Downloading image with options", { url, hostname: options.hostname });

    protocol.get(requestOptions, (response) => {
      logger.info("Got response", { statusCode: response.statusCode, headers: response.headers });

      // Handle redirects (Google Drive often uses multiple redirects)
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303 || response.statusCode === 307 || response.statusCode === 308) {
        const redirectUrl = response.headers.location;
        logger.info("Following redirect", { redirectUrl });
        return downloadImage(redirectUrl)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: HTTP ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        logger.info("Download complete", { size: buffer.length });
        resolve(buffer);
      });
      response.on('error', (err) => {
        logger.error("Error during download", { error: err.message });
        reject(err);
      });
    }).on('error', (err) => {
      logger.error("Request error", { error: err.message });
      reject(err);
    });
  });
}
