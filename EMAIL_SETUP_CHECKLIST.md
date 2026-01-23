# Email Setup Checklist

Use this checklist to track your progress setting up email functionality.

## Prerequisites
- [ ] Firebase project created
- [ ] Firebase Blaze (pay-as-you-go) plan enabled
- [ ] Node.js installed (version 14 or higher)

## Choose Email Provider

Select one:
- [ ] **SendGrid** (Recommended for production - 100 emails/day free)
- [ ] **Mailgun** (Alternative - 5,000 emails/month free for 3 months)
- [ ] **Gmail SMTP** (Quick testing only - 500 emails/day)

---

## Setup Steps

### 1. Email Provider Account
- [ ] Created account with chosen provider
- [ ] Verified email address
- [ ] Generated API key (or app password for Gmail)
- [ ] Verified sender email/domain (SendGrid/Mailgun)

### 2. Firebase CLI Setup
```bash
npm install -g firebase-tools
```
- [ ] Installed Firebase CLI
- [ ] Logged in: `firebase login`
- [ ] Initialized functions: `firebase init functions`
  - [ ] Selected existing project
  - [ ] Chose JavaScript
  - [ ] Installed dependencies

### 3. Functions Configuration
- [ ] Installed email provider package in functions/
  - SendGrid: `npm install @sendgrid/mail`
  - Mailgun: `npm install mailgun.js form-data`
  - Gmail: `npm install nodemailer`

- [ ] Set Firebase config variables:
  ```bash
  # SendGrid
  firebase functions:config:set sendgrid.key="YOUR_KEY"
  firebase functions:config:set sendgrid.email="noreply@church.com"
  firebase functions:config:set sendgrid.name="St Pauls Marthoma Church"

  # OR Mailgun
  firebase functions:config:set mailgun.key="YOUR_KEY"
  firebase functions:config:set mailgun.domain="mg.church.com"

  # OR Gmail
  firebase functions:config:set gmail.email="your-email@gmail.com"
  firebase functions:config:set gmail.password="app-password"
  ```

### 4. Cloud Functions Code
- [ ] Copied function code from EMAIL_INTEGRATION_GUIDE.md
- [ ] Pasted into `functions/index.js`
- [ ] Reviewed code for any church-specific customizations
- [ ] Saved file

### 5. Deploy Functions
```bash
firebase deploy --only functions
```
- [ ] Deployed functions successfully
- [ ] No errors in deployment log
- [ ] Verified function appears in Firebase Console → Functions

### 6. Frontend Configuration
- [ ] Opened `src/services/emailService.js`
- [ ] Changed `TESTING_MODE` to `false` (line 30)
- [ ] Saved file

### 7. Testing

#### Test 1: Single Email
- [ ] Started dev server: `npm run dev`
- [ ] Navigated to Reports → Member Contribution Report
- [ ] Selected date range (optional)
- [ ] Selected a member with valid email
- [ ] Clicked "Download PDF" - PDF generated successfully
- [ ] Clicked "Send Email" - Success message appeared
- [ ] Checked member's email inbox - Email received
- [ ] Checked Email Logs - Entry shows "success"

#### Test 2: Email Logs
- [ ] Clicked "Show Email Logs"
- [ ] Previous test email appears in log
- [ ] Status shows "success"
- [ ] Date/time is correct

#### Test 3: Bulk Email (Optional - test with 2-3 members first!)
- [ ] Clicked "Show All Members"
- [ ] Verified list of members with contributions
- [ ] Clicked "Send to All Members"
- [ ] Confirmed dialog
- [ ] Waited for completion message
- [ ] Checked success/failure count
- [ ] Verified emails received
- [ ] Checked Email Logs for all entries

#### Test 4: Schedule Email
- [ ] Clicked "Schedule Email"
- [ ] Selected future date/time (5 minutes from now for testing)
- [ ] Clicked "Schedule"
- [ ] Verified scheduled email appears in "Scheduled Emails" table
- [ ] **Note:** Scheduled emails require cloud function cron job (see below)

### 8. Schedule Email Processing (Optional)
- [ ] Deployed schedule processor: already included in functions
- [ ] Verified cron job in Firebase Console → Functions
- [ ] Waited for scheduled time
- [ ] Checked that email was sent
- [ ] Verified status changed to "sent" in Scheduled Emails table

---

## Troubleshooting

### Function deployment fails
```bash
# Check Firebase project
firebase projects:list

# Check if using correct project
firebase use YOUR_PROJECT_ID

# Check Node.js version
node --version  # Should be 14 or higher

# Re-deploy
firebase deploy --only functions --debug
```

### "Requires Blaze plan"
- [ ] Go to Firebase Console → Project → Upgrade
- [ ] Select Blaze (pay-as-you-go) plan
- [ ] Add payment method
- [ ] Set spending limits if desired

### Email not sending
```bash
# Check function logs
firebase functions:log

# Check config
firebase functions:config:get

# Test function directly in Firebase Console
```

### Emails going to spam
- [ ] Configure SPF record for domain
- [ ] Configure DKIM in SendGrid/Mailgun
- [ ] Verify sender email in provider
- [ ] Test with different email providers
- [ ] Check email content for spam triggers

### Frontend errors
- [ ] Check browser console for errors
- [ ] Verify `TESTING_MODE = false` in emailService.js
- [ ] Clear browser cache and reload
- [ ] Check Firebase Functions are deployed
- [ ] Verify user is authenticated

---

## Production Checklist

Before going live:
- [ ] Tested with 10+ different email addresses
- [ ] Verified emails don't go to spam
- [ ] Set up email domain authentication (SPF/DKIM)
- [ ] Added church branding to email template
- [ ] Tested on mobile devices
- [ ] Set up email monitoring/alerts
- [ ] Documented process for church staff
- [ ] Created unsubscribe functionality (if sending marketing emails)
- [ ] Configured rate limiting (if needed)
- [ ] Set up Firebase budget alerts
- [ ] Backed up email logs regularly

---

## Maintenance

### Weekly
- [ ] Check Email Logs for failures
- [ ] Review spam complaints (in provider dashboard)
- [ ] Check Firebase billing

### Monthly
- [ ] Review email sending limits
- [ ] Check bounce rates in provider
- [ ] Archive old email logs (optional)
- [ ] Review scheduled emails

### As Needed
- [ ] Update email templates
- [ ] Add new email types
- [ ] Adjust sending limits
- [ ] Update provider API keys

---

## Support Resources

- **Firebase Functions Docs:** https://firebase.google.com/docs/functions
- **SendGrid Docs:** https://docs.sendgrid.com/
- **Mailgun Docs:** https://documentation.mailgun.com/
- **Nodemailer Docs:** https://nodemailer.com/

---

## Current Status

Feature Status:
✅ PDF Generation - Working
✅ Letter Format - Working
✅ Email Audit Trail - Working
✅ Schedule Email UI - Working
⏳ Email Sending - Needs cloud function setup
⏳ Schedule Processing - Needs cloud function setup

**Next Step:** Complete items in section 1-7 above to activate email sending.

---

## Quick Commands Reference

```bash
# Deploy functions
firebase deploy --only functions

# View logs
firebase functions:log

# View config
firebase functions:config:get

# Set config
firebase functions:config:set key="value"

# List deployed functions
firebase functions:list

# Delete a function
firebase functions:delete functionName

# Run locally (for testing)
cd functions
npm run serve
```

---

## Estimated Time

- **Quick Test (Gmail):** 15-30 minutes
- **Production Setup (SendGrid):** 45-60 minutes
- **Testing & Verification:** 30 minutes
- **Total:** 1.5 - 2 hours for full setup

Good luck with your setup! 🚀
