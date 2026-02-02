# Brevo Email Integration Setup Guide

This guide will help you set up email functionality using the Brevo API (formerly Sendinblue) with Firebase Cloud Functions.

## Prerequisites

- Firebase project already set up (✓ You have this)
- Firebase CLI installed
- Node.js installed
- Brevo account

---

## Step 1: Get Brevo API Key

1. **Sign up for Brevo**:
   - Go to [https://www.brevo.com/](https://www.brevo.com/)
   - Create a free account (up to 300 emails/day free)

2. **Get your API Key**:
   - Log into your Brevo dashboard
   - Navigate to **SMTP & API** → **API Keys**
   - Click **Generate a new API key**
   - Give it a name like "Church Accounts Software"
   - Copy the API key (you won't see it again!)

3. **Verify your sender email**:
   - Go to **Senders & IP** → **Senders**
   - Add your sender email address
   - Verify it by clicking the link sent to that email
   - This is the email that will appear in the "From" field

---

## Step 2: Update Environment Variables

1. **Update your `.env` file** (already done):
   ```env
   VITE_BREVO_API_KEY=your_actual_brevo_api_key
   VITE_SENDER_EMAIL=verified-email@yourdomain.com
   VITE_SENDER_NAME=St. Paul's Marthoma Church
   ```

   Replace:
   - `your_actual_brevo_api_key` with the API key from Step 1
   - `verified-email@yourdomain.com` with the verified sender email

---

## Step 3: Install Dependencies

Open your terminal in the project root directory and run:

```bash
# Install dependencies in the functions folder
cd functions
npm install

# Go back to project root
cd ..
```

This will install the Brevo SDK (`@getbrevo/brevo`) in your functions directory.

---

## Step 4: Configure Firebase Functions Environment Variables

The modern way to set environment variables (replaces deprecated `functions.config()`):

### Option A: Using .env file (for local development)

The `.env` file has already been created in the `functions/` directory with your credentials. This will be used for local testing.

### Option B: Set for production deployment

When deploying, you'll set these as secrets:

```bash
# Set environment variables for production
firebase functions:secrets:set BREVO_API_KEY
# When prompted, paste: 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

firebase functions:secrets:set SENDER_EMAIL
# When prompted, enter: accounts@stpaulsmtcdallas.org

firebase functions:secrets:set SENDER_NAME
# When prompted, enter: St. Paul's Marthoma Church
```

**Alternatively**, you can set them in one command each:
```bash
echo "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" | firebase functions:secrets:set BREVO_API_KEY
echo "accounts@stpaulsmtcdallas.org" | firebase functions:secrets:set SENDER_EMAIL
echo "St. Paul's Marthoma Church" | firebase functions:secrets:set SENDER_NAME
```

To verify secrets are set:
```bash
firebase functions:secrets:access BREVO_API_KEY
```

---

## Step 5: Test Locally (Optional but Recommended)

Before deploying, you can test the function locally:

```bash
# Start Firebase emulators
firebase emulators:start
```

This will start the Firebase emulator suite and automatically load the environment variables from `functions/.env`. You can test the function locally before deploying to production.

The `.env` file in `functions/` directory has already been created with your credentials (already in `.gitignore` to keep secrets safe).

---

## Step 6: Deploy to Firebase

Deploy your cloud function to Firebase:

```bash
# Deploy only the functions
firebase deploy --only functions
```

This will:
- Upload your cloud function code
- Deploy the `sendContributionEmail` function
- Make it available at your Firebase project URL

The deployment will take a few minutes. You'll see output like:
```
✔  functions: Finished running deploy script.
✔  functions[sendContributionEmail]: Successful create operation.
Function URL: https://us-central1-your-project.cloudfunctions.net/sendContributionEmail
```

---

## Step 7: Verify Deployment

1. **Check Firebase Console**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Navigate to **Functions** in the left sidebar
   - You should see `sendContributionEmail` listed

2. **Check the logs**:
   ```bash
   firebase functions:log
   ```

---

## Step 8: Test Email Sending

1. **Update TESTING_MODE** (already done):
   - The file `src/services/emailService.js` line 52 is now set to `false`

2. **Test in the application**:
   - Run your application: `npm run dev`
   - Go to the Member Contribution Report page
   - Select a member with a valid email address
   - Generate a report
   - Click **"Send Email"** button
   - Check the email logs in the UI

3. **Verify email received**:
   - Check the recipient's inbox
   - Check spam/junk folder if not found
   - Verify the PDF attachment is included

---

## Troubleshooting

### Error: "Email service not configured"
- **Solution**: Make sure you've set the environment variables (Step 4)
- For local testing: Check `functions/.env` file exists and has the correct values
- For production: Verify secrets are set with `firebase functions:secrets:access BREVO_API_KEY`

### Error: "Invalid API key"
- **Solution**: Double-check your Brevo API key
- Make sure you copied it correctly from Brevo dashboard
- Try generating a new API key

### Error: "Sender email not verified"
- **Solution**: Verify your sender email in Brevo dashboard
- Go to **Senders & IP** → **Senders** and complete verification

### Emails going to spam
- **Solution**: Set up SPF, DKIM, and DMARC records for your domain
- In Brevo, go to **Senders & IP** → **Domains**
- Follow the DNS configuration instructions

### Function deployment fails
- **Solution**: Check your Node.js version matches `package.json` (Node 24)
- Make sure you're logged into Firebase: `firebase login`
- Check Firebase project: `firebase use --add`

### Email not sending (no error shown)
- **Solution**: Check Firebase function logs:
  ```bash
  firebase functions:log --only sendContributionEmail
  ```
- Look for error messages and stack traces

### Rate limit exceeded
- **Solution**: Free Brevo accounts have a limit of 300 emails/day
- Upgrade to a paid plan for higher limits
- Check your Brevo dashboard for usage statistics

---

## Testing Checklist

Before going live, test these scenarios:

- [ ] Send email to a single member
- [ ] Send emails to all members (test with 2-3 members first)
- [ ] Verify PDF attachment is correct and readable
- [ ] Check email formatting in different email clients
- [ ] Verify sender name and email appear correctly
- [ ] Test with date range filters
- [ ] Check email logs are being recorded
- [ ] Verify error handling (try invalid email address)

---

## Cost Information

### Brevo Pricing (as of 2024)
- **Free Plan**: 300 emails/day
- **Starter**: Starting at $25/month for 20,000 emails/month
- **Business**: Custom pricing for higher volumes

### Firebase Pricing
- **Cloud Functions**:
  - 2 million invocations/month free
  - $0.40 per million invocations after that
  - Minimal cost for typical church usage

**Estimated monthly cost**: $0 (if staying within free tiers)

---

## Next Steps

Once email integration is working:

1. **Set up scheduled emails** (if needed):
   - The UI already has a "Schedule Email" button
   - You'll need to create a Cloud Scheduler job or use Firestore triggers

2. **Add email templates**:
   - Customize the email HTML in `functions/index.js` lines 83-108
   - Add church logo to the email

3. **Monitor email delivery**:
   - Check Brevo dashboard for delivery statistics
   - Set up email notifications for bounces and complaints

4. **Backup plan**:
   - Keep the TESTING_MODE option available
   - Document the rollback procedure

---

## Support

- **Brevo Documentation**: [https://developers.brevo.com/](https://developers.brevo.com/)
- **Firebase Functions**: [https://firebase.google.com/docs/functions](https://firebase.google.com/docs/functions)
- **Project Issues**: Check `EMAIL_INTEGRATION_GUIDE.md` and other docs in this repo

---

## Summary of Changes Made

### Files Modified:
1. ✅ `.env` - Added Brevo configuration
2. ✅ `.env.example` - Added Brevo placeholders
3. ✅ `functions/package.json` - Added `@getbrevo/brevo` dependency
4. ✅ `functions/index.js` - Implemented `sendContributionEmail` function
5. ✅ `src/services/emailService.js` - Set `TESTING_MODE = false`

### Files to Update (by you):
1. `.env` - Add your actual Brevo API key and sender email
2. `.gitignore` - Add `.runtimeconfig.json` (if testing locally)

### Commands to Run:
```bash
# 1. Install dependencies
cd functions && npm install && cd ..

# 2. Set Firebase config
firebase functions:config:set brevo.apikey="YOUR_KEY"
firebase functions:config:set brevo.senderemail="YOUR_EMAIL"
firebase functions:config:set brevo.sendername="Church Name"

# 3. Deploy
firebase deploy --only functions

# 4. Test
npm run dev
```

---

**You're all set!** Follow the steps above to complete the Brevo email integration.
