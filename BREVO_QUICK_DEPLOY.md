# Brevo Integration - Quick Deploy Commands

This is a quick reference for deploying the Brevo email integration.

## 1. Get Your Brevo API Key

1. Go to https://www.brevo.com/ and sign up
2. Navigate to SMTP & API → API Keys
3. Generate a new API key
4. Verify your sender email under Senders & IP → Senders

---

## 2. Update .env File

Edit `.env` and replace these values:

```env
VITE_BREVO_API_KEY=xkeysib-YOUR_ACTUAL_API_KEY_HERE
VITE_SENDER_EMAIL=your-verified-email@yourdomain.com
VITE_SENDER_NAME=St. Paul's Mar Thoma Church
```

---

## 3. Run These Commands

The `.env` files have already been created with your credentials. Just run:

```bash
# Step 1: Install dependencies in functions folder
cd functions
npm install
cd ..

# Step 2: Login to Firebase (if not already logged in)
firebase login

# Step 3: Set production environment secrets
echo "xkeysib-<>" | firebase functions:secrets:set BREVO_API_KEY
echo "accounts@stpaulsmtcdallas.org" | firebase functions:secrets:set SENDER_EMAIL
echo "St. Paul's Marthoma Church" | firebase functions:secrets:set SENDER_NAME

# Step 4: Deploy the cloud function
firebase deploy --only functions

# Step 5: Start your app to test
npm run dev
```

**Note**: The environment variables are already configured in `functions/.env` for local testing.

---

## 4. Verify It Works

1. Open your app (usually at http://localhost:5173)
2. Go to **Reports** → **Member Contribution Report**
3. Select a member who has an email address
4. Click **"Send Email"** button
5. Check the member's inbox (and spam folder)
6. Verify the PDF attachment is included

---

## 5. Check Logs

If something goes wrong:

```bash
# View Firebase function logs
firebase functions:log

# View only sendContributionEmail logs
firebase functions:log --only sendContributionEmail

# View real-time logs
firebase functions:log --follow
```

---

## Common Issues

### Issue: "Email service not configured"
```bash
# Verify secrets are set (for production)
firebase functions:secrets:access BREVO_API_KEY

# If not set, set the secrets:
echo "YOUR_API_KEY" | firebase functions:secrets:set BREVO_API_KEY
echo "YOUR_EMAIL" | firebase functions:secrets:set SENDER_EMAIL
echo "Church Name" | firebase functions:secrets:set SENDER_NAME

# For local testing, check functions/.env file exists and has values

# Redeploy
firebase deploy --only functions
```

### Issue: "Cannot find module '@getbrevo/brevo'"
```bash
# Install dependencies
cd functions
npm install
cd ..

# Redeploy
firebase deploy --only functions
```

### Issue: Function not found
```bash
# Check if function is deployed
firebase functions:list

# If not listed, deploy again
firebase deploy --only functions
```

---

## Environment Variables Reference

### Brevo API Key Format
- Should start with `xkeysib-`
- Example: `xkeysib-abc123def456...`

### Sender Email
- Must be verified in Brevo dashboard
- Can be: Gmail, Outlook, custom domain

### Sender Name
- Displayed as the "From" name in email clients
- Example: `St. Paul's Marthoma Church`

---

## Testing Checklist

- [ ] API key obtained from Brevo
- [ ] Sender email verified in Brevo
- [ ] `.env` file updated with actual values
- [ ] Dependencies installed: `cd functions && npm install`
- [ ] Firebase config set: `firebase functions:config:set`
- [ ] Function deployed: `firebase deploy --only functions`
- [ ] Test email sent successfully
- [ ] PDF attachment received correctly
- [ ] Email logs showing in UI

---

## Files Changed Summary

✅ **Modified Files:**
- `.env` - Added Brevo credentials
- `.env.example` - Added Brevo placeholders
- `functions/package.json` - Added @getbrevo/brevo
- `functions/index.js` - Added sendContributionEmail function
- `functions/.gitignore` - Added .runtimeconfig.json
- `src/services/emailService.js` - Set TESTING_MODE = false

📄 **New Documentation:**
- `BREVO_INTEGRATION_SETUP.md` - Detailed setup guide
- `BREVO_QUICK_DEPLOY.md` - This quick reference

---

## Need Help?

1. Check `BREVO_INTEGRATION_SETUP.md` for detailed instructions
2. Review Firebase logs: `firebase functions:log`
3. Check Brevo dashboard for delivery status
4. Verify all config values are correct

---

**Ready to deploy? Start with Step 3 above! 🚀**
