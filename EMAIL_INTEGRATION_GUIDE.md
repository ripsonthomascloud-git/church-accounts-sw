# Email Integration Guide

## Option 1: Firebase Cloud Functions + SendGrid (Recommended)

### Prerequisites
- Firebase project with Blaze (pay-as-you-go) plan
- SendGrid account (free tier available)

### Step 1: Initialize Firebase Functions

```bash
# Install Firebase CLI globally (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase Functions in your project
firebase init functions

# Select:
# - Use existing project (select your project)
# - JavaScript or TypeScript (JavaScript is simpler)
# - Install dependencies: Yes
```

### Step 2: Install SendGrid in Functions

```bash
cd functions
npm install @sendgrid/mail
```

### Step 3: Set SendGrid API Key

```bash
# Set environment variable
firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"

# Set sender email (must be verified in SendGrid)
firebase functions:config:set sendgrid.email="noreply@yourchurch.com"
firebase functions:config:set sendgrid.name="St Pauls Marthoma Church"
```

### Step 4: Create Cloud Function (functions/index.js)

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

admin.initializeApp();

// Initialize SendGrid
sgMail.setApiKey(functions.config().sendgrid.key);

// Send Contribution Report Email
exports.sendContributionEmail = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated to send emails'
    );
  }

  const { memberEmail, memberName, pdfBase64, reportPeriod } = data;

  // Validate input
  if (!memberEmail || !memberName || !pdfBase64) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required fields'
    );
  }

  const msg = {
    to: memberEmail,
    from: {
      email: functions.config().sendgrid.email,
      name: functions.config().sendgrid.name,
    },
    subject: `Contribution Report - ${reportPeriod || 'All Time'}`,
    text: `Dear ${memberName},\n\nPlease find attached your contribution report for St Pauls Marthoma Church.\n\nThank you for your generous support.\n\nBlessings,\nSt Pauls Marthoma Church`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>St Pauls Marthoma Church</h2>
        <p>Dear ${memberName},</p>
        <p>Thank you for your generous contributions to St Pauls Marthoma Church. Your support helps us continue our mission and serve our community.</p>
        <p>Please find attached your contribution report${reportPeriod ? ` for ${reportPeriod}` : ''}.</p>
        <p style="margin-top: 30px;">With gratitude,<br><strong>St Pauls Marthoma Church</strong></p>
      </div>
    `,
    attachments: [
      {
        content: pdfBase64,
        filename: `Contribution_Report_${memberName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
        type: 'application/pdf',
        disposition: 'attachment',
      },
    ],
  };

  try {
    await sgMail.send(msg);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('SendGrid Error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send email',
      error.message
    );
  }
});

// Process Scheduled Emails (runs every hour)
exports.processScheduledEmails = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    // Get pending scheduled emails that are due
    const snapshot = await db
      .collection('scheduledEmails')
      .where('status', '==', 'pending')
      .where('scheduledFor', '<=', now)
      .get();

    if (snapshot.empty) {
      console.log('No scheduled emails to process');
      return null;
    }

    const promises = [];

    snapshot.forEach((doc) => {
      const schedule = doc.data();

      // For each member in the schedule
      schedule.memberIds.forEach((memberId) => {
        const promise = processScheduledEmail(doc.id, memberId, schedule);
        promises.push(promise);
      });
    });

    await Promise.all(promises);
    console.log(`Processed ${promises.length} scheduled emails`);
    return null;
  });

async function processScheduledEmail(scheduleId, memberId, schedule) {
  const db = admin.firestore();

  try {
    // Get member details
    const memberDoc = await db.collection('members').doc(memberId).get();
    if (!memberDoc.exists) {
      throw new Error('Member not found');
    }

    const member = memberDoc.data();

    // Get member transactions
    let query = db.collection('income').where('memberId', '==', memberId);

    if (schedule.dateFrom) {
      query = query.where('date', '>=', new Date(schedule.dateFrom));
    }
    if (schedule.dateTo) {
      query = query.where('date', '<=', new Date(schedule.dateTo));
    }

    const transactionsSnapshot = await query.get();
    // Generate PDF and send email (you'll need to implement PDF generation here)

    // Log the email
    await db.collection('emailLogs').add({
      memberId: memberId,
      memberName: `${member.firstName} ${member.lastName}`,
      email: member.email,
      reportType: 'contribution',
      dateFrom: schedule.dateFrom,
      dateTo: schedule.dateTo,
      status: 'success',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      scheduledEmailId: scheduleId,
    });

    // Update schedule status
    await db.collection('scheduledEmails').doc(scheduleId).update({
      status: 'sent',
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  } catch (error) {
    console.error('Error processing scheduled email:', error);

    // Log failure
    await db.collection('emailLogs').add({
      memberId: memberId,
      email: 'unknown',
      status: 'failed',
      error: error.message,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      scheduledEmailId: scheduleId,
    });
  }
}
```

### Step 5: Deploy Functions

```bash
# From your project root
firebase deploy --only functions
```

### Step 6: Update Frontend emailService.js

Replace the `sendContributionEmail` function:

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

export const sendContributionEmail = async (memberEmail, pdfBlob, memberName, reportPeriod) => {
  const functions = getFunctions();
  const sendEmail = httpsCallable(functions, 'sendContributionEmail');

  try {
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

// Helper function to convert blob to base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

---

## Option 2: Mailgun (Alternative)

### Step 1: Set up Mailgun
1. Sign up at https://www.mailgun.com/ (free tier: 5,000 emails/month for 3 months)
2. Add and verify your domain
3. Get API Key from Settings → API Keys

### Step 2: Install Mailgun in Functions

```bash
cd functions
npm install mailgun.js form-data
```

### Step 3: Set Mailgun Config

```bash
firebase functions:config:set mailgun.key="YOUR_MAILGUN_API_KEY"
firebase functions:config:set mailgun.domain="mg.yourchurch.com"
```

### Step 4: Update Cloud Function

```javascript
const formData = require('form-data');
const Mailgun = require('mailgun.js');

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: functions.config().mailgun.key,
});

exports.sendContributionEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { memberEmail, memberName, pdfBase64, reportPeriod } = data;

  try {
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    const messageData = {
      from: 'St Pauls Marthoma Church <noreply@mg.yourchurch.com>',
      to: memberEmail,
      subject: `Contribution Report - ${reportPeriod || 'All Time'}`,
      text: `Dear ${memberName},\n\nPlease find attached your contribution report.`,
      html: `<p>Dear ${memberName},</p><p>Please find attached your contribution report.</p>`,
      attachment: {
        data: pdfBuffer,
        filename: `Contribution_Report_${memberName.replace(/\s+/g, '_')}.pdf`,
      },
    };

    await mg.messages.create(functions.config().mailgun.domain, messageData);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Mailgun Error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send email');
  }
});
```

---

## Option 3: Gmail SMTP (Quick Test - Not for Production)

### For Testing Only (Limited to 500 emails/day)

### Step 1: Enable Gmail App Password
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Generate App Password (select "Mail" and "Other")

### Step 2: Install Nodemailer

```bash
cd functions
npm install nodemailer
```

### Step 3: Set Config

```bash
firebase functions:config:set gmail.email="your-gmail@gmail.com"
firebase functions:config:set gmail.password="your-app-password"
```

### Step 4: Update Cloud Function

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().gmail.email,
    pass: functions.config().gmail.password,
  },
});

exports.sendContributionEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { memberEmail, memberName, pdfBase64, reportPeriod } = data;

  const mailOptions = {
    from: 'St Pauls Marthoma Church <your-gmail@gmail.com>',
    to: memberEmail,
    subject: `Contribution Report - ${reportPeriod || 'All Time'}`,
    text: `Dear ${memberName},\n\nPlease find attached your contribution report.`,
    attachments: [
      {
        filename: `Contribution_Report_${memberName.replace(/\s+/g, '_')}.pdf`,
        content: Buffer.from(pdfBase64, 'base64'),
        contentType: 'application/pdf',
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Gmail Error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send email');
  }
});
```

---

## Quick Start Recommendation

**For immediate testing:** Use Gmail SMTP (Option 3)
**For production:** Use SendGrid (Option 1) or Mailgun (Option 2)

### Estimated Costs
- **SendGrid Free:** 100 emails/day forever
- **Mailgun Free:** 5,000 emails/month for 3 months, then pay-as-you-go
- **Firebase Functions:** Free tier includes 2M invocations/month
- **Gmail:** Free but limited to 500/day and not reliable for production

### Next Steps
1. Choose your email provider
2. Follow the steps above for your chosen provider
3. Test with a single email first
4. Deploy to production

Would you like me to help you implement one of these options?
