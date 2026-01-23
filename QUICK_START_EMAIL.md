# Quick Start: Email Integration

## Choose Your Path

### Path A: Quick Testing (5 minutes)
Use Gmail SMTP for immediate testing. Limited to 500 emails/day.

### Path B: Production Ready (30 minutes)
Use SendGrid for professional email delivery. Free tier: 100 emails/day forever.

---

## Path A: Gmail SMTP (Quick Test)

### 1. Enable App Password
```
1. Go to https://myaccount.google.com/security
2. Enable "2-Step Verification"
3. Click "App passwords"
4. Select "Mail" and "Other (Custom name)"
5. Copy the 16-character password
```

### 2. Install Firebase Tools
```bash
npm install -g firebase-tools
firebase login
firebase init functions
```

Select:
- Use existing project
- JavaScript
- Install dependencies: Yes

### 3. Install Nodemailer
```bash
cd functions
npm install nodemailer
```

### 4. Set Configuration
```bash
firebase functions:config:set gmail.email="your-email@gmail.com"
firebase functions:config:set gmail.password="your-16-char-app-password"
```

### 5. Copy Gmail Function Code
Open `functions/index.js` and replace with the Gmail code from EMAIL_INTEGRATION_GUIDE.md (Option 3)

### 6. Deploy
```bash
firebase deploy --only functions
```

### 7. Update Frontend
In `src/services/emailService.js`:
- Uncomment the production code (lines after "PRODUCTION MODE")
- Comment out the testing mode code
- Add the import at the top of the file:
```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';
```

### 8. Test
Select a member and click "Send Email"

---

## Path B: SendGrid (Production)

### 1. Create SendGrid Account
```
1. Sign up at https://sendgrid.com/
2. Complete email verification
3. Go to Settings → API Keys → Create API Key
4. Give it a name: "Church Accounts"
5. Select "Full Access"
6. Copy the API key (starts with SG.)
```

### 2. Verify Sender Email
```
1. Go to Settings → Sender Authentication
2. Click "Verify a Single Sender"
3. Fill in your church email and details
4. Check email and click verification link
```

### 3. Install Firebase Tools
```bash
npm install -g firebase-tools
firebase login
firebase init functions
```

Select:
- Use existing project
- JavaScript
- Install dependencies: Yes

### 4. Install SendGrid
```bash
cd functions
npm install @sendgrid/mail
```

### 5. Set Configuration
```bash
firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY"
firebase functions:config:set sendgrid.email="noreply@yourchurch.com"
firebase functions:config:set sendgrid.name="St Pauls Marthoma Church"
```

### 6. Copy SendGrid Function Code
Open `functions/index.js` and replace with the SendGrid code from EMAIL_INTEGRATION_GUIDE.md (Option 1)

### 7. Deploy
```bash
firebase deploy --only functions
```

### 8. Update Frontend
In `src/services/emailService.js`:
- Uncomment the production code
- Comment out the testing mode code
- Add the import at the top:
```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';
```

### 9. Test
Select a member and click "Send Email"

---

## Troubleshooting

### "Firebase requires Blaze plan for functions"
**Solution:** Upgrade to Blaze plan at https://console.firebase.google.com
- Click "Upgrade" in your project
- Blaze plan is pay-as-you-go but includes generous free tier
- Most churches won't exceed free limits

### "Failed to send email"
**Check:**
1. Cloud function deployed: `firebase functions:list`
2. Config set correctly: `firebase functions:config:get`
3. Check logs: `firebase functions:log`
4. Member has valid email address
5. SendGrid sender email is verified

### "Functions not found"
**Solution:**
1. Make sure you're in the right Firebase project: `firebase projects:list`
2. Re-deploy: `firebase deploy --only functions`
3. Check Firebase console → Functions tab

### Emails going to spam
**Solutions:**
- Use SendGrid sender authentication
- Add SPF/DKIM records to your domain
- Avoid spam trigger words in subject
- Include unsubscribe link

---

## Cost Estimates

### SendGrid (Recommended)
- Free: 100 emails/day forever
- Essentials: $19.95/month for 50,000 emails
- Pro: $89.95/month for 100,000 emails

### Firebase Functions
- Free tier: 2M invocations/month
- After free tier: $0.40 per million invocations
- Most churches stay within free tier

### Mailgun (Alternative)
- Free: 5,000 emails/month for 3 months
- Foundation: $35/month for 50,000 emails
- Growth: $80/month for 100,000 emails

### Gmail SMTP
- Free: 500 emails/day
- Not recommended for production
- Risk of account suspension

---

## Security Best Practices

1. **Never commit API keys** to git
2. **Use Firebase config** for secrets
3. **Verify authentication** in cloud functions
4. **Validate email addresses** before sending
5. **Rate limit** email sending
6. **Log all email attempts** (already implemented)
7. **Handle bounces** and unsubscribes

---

## Next Features to Add

1. **Email templates** with rich HTML
2. **Bulk email batching** (send in batches of 10)
3. **Bounce handling** (mark invalid emails)
4. **Unsubscribe functionality**
5. **Email preferences** per member
6. **PDF optimization** (reduce file size)
7. **Progress bar** for bulk sends

---

## Support

If you encounter issues:

1. Check Firebase Console → Functions → Logs
2. Check browser console for errors
3. Verify all configuration values
4. Test with a single email first
5. Review EMAIL_INTEGRATION_GUIDE.md for detailed code

---

## Current Status

✅ PDF generation working
✅ Letter format implemented
✅ Email audit trail ready
✅ Scheduling infrastructure ready
⏳ Email sending (needs cloud function setup)
⏳ Scheduled email processing (needs cloud function setup)

**To activate email sending:** Follow Path A or Path B above
