# Brevo Integration - Updated for Firebase Functions v2

## Important Update

The code has been updated to use **Firebase Functions v2 environment parameters** instead of the deprecated `functions.config()` API, which will be shut down in March 2026.

---

## What Changed

### 1. **Functions Code Updated** (`functions/index.js`)
- ✅ Now uses `defineString()` from `firebase-functions/params`
- ✅ Replaced deprecated `functions.config()` with modern environment parameters
- ✅ Compatible with Firebase Functions v2

### 2. **Environment Variables**
- ✅ Created `functions/.env` with your Brevo credentials (for local testing)
- ✅ Created `functions/.env.example` as template
- ✅ Added `.env` to `functions/.gitignore` for security

### 3. **Your Credentials** (Already Configured)
```
BREVO_API_KEY: xkeysib-<>
SENDER_EMAIL: accounts@stpaulsmtcdallas.org
SENDER_NAME: St. Paul's Mar Thoma Church
```

---

## Quick Deploy (Updated Commands)

### For Local Testing:
```bash
# 1. Install dependencies
cd functions
npm install
cd ..

# 2. Test locally (uses functions/.env automatically)
firebase emulators:start
```

### For Production Deployment:
```bash
# 1. Install dependencies (if not done)
cd functions && npm install && cd ..

# 2. Set production secrets (one-time setup)
echo "xkeysib-<>" | firebase functions:secrets:set BREVO_API_KEY
echo "accounts@stpaulsmtcdallas.org" | firebase functions:secrets:set SENDER_EMAIL
echo "St. Paul's Marthoma Church" | firebase functions:secrets:set SENDER_NAME

# 3. Deploy
firebase deploy --only functions
```

---

## How Environment Variables Work Now

### Local Development (Emulators)
- Reads from `functions/.env` automatically
- No additional configuration needed
- Already set up with your credentials

### Production (Deployed Functions)
- Uses Firebase Secrets Manager
- Set once with `firebase functions:secrets:set`
- More secure than old `functions.config()`
- Encrypted at rest

---

## Migration from Old Method

### ❌ Old Way (Deprecated - Don't Use)
```bash
firebase functions:config:set brevo.apikey="..."
firebase functions:config:set brevo.senderemail="..."
```

### ✅ New Way (Current - Use This)
```bash
echo "..." | firebase functions:secrets:set BREVO_API_KEY
echo "..." | firebase functions:secrets:set SENDER_EMAIL
```

---

## Verify Setup

### Check Local Environment:
```bash
cat functions/.env
```
Should show:
```
BREVO_API_KEY=xkeysib-6ed687...
SENDER_EMAIL=accounts@stpaulsmtcdallas.org
SENDER_NAME=St. Paul's Marthoma Church
```

### Check Production Secrets:
```bash
firebase functions:secrets:access BREVO_API_KEY
```

---

## Testing Steps

1. **Test Locally First** (Recommended):
   ```bash
   # Terminal 1: Start emulators
   firebase emulators:start

   # Terminal 2: Start your app
   npm run dev
   ```
   - Go to http://localhost:5173
   - Navigate to Member Contribution Report
   - Send a test email
   - Check recipient inbox

2. **Deploy to Production**:
   ```bash
   # Set secrets (one time)
   echo "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" | firebase functions:secrets:set BREVO_API_KEY
   echo "accounts@stpaulsmtcdallas.org" | firebase functions:secrets:set SENDER_EMAIL
   echo "St. Paul's Marthoma Church" | firebase functions:secrets:set SENDER_NAME

   # Deploy
   firebase deploy --only functions
   ```

3. **Test Production**:
   - Build and deploy your app: `npm run build`
   - Test email sending in production
   - Check Firebase Functions logs: `firebase functions:log`

---

## Benefits of New Approach

✅ **Future-proof**: Won't break in March 2026
✅ **More secure**: Uses Secret Manager with encryption
✅ **Better local dev**: `.env` file is simpler than `.runtimeconfig.json`
✅ **Standard practice**: Follows modern Firebase best practices
✅ **IAM integration**: Better access control and auditing

---

## Troubleshooting

### Error: "Cannot find module '@getbrevo/brevo'"
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### Error: "Email service not configured"
**For local testing:**
```bash
# Check .env exists and has values
cat functions/.env
```

**For production:**
```bash
# Verify secrets are set
firebase functions:secrets:access BREVO_API_KEY

# If not set, set them:
echo "YOUR_KEY" | firebase functions:secrets:set BREVO_API_KEY
```

### Secret not accessible during deployment
```bash
# Make sure you're logged in
firebase login

# Make sure you're using the correct project
firebase use accounting-software-6dc8c

# Try setting the secret again
echo "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" | firebase functions:secrets:set BREVO_API_KEY
```

---

## Files Modified

### Updated Files:
- ✅ `functions/index.js` - Uses `defineString()` instead of `functions.config()`
- ✅ `functions/.gitignore` - Added `.env`
- ✅ `BREVO_INTEGRATION_SETUP.md` - Updated commands
- ✅ `BREVO_QUICK_DEPLOY.md` - Updated commands
- ✅ `src/services/emailService.js` - Updated comments

### New Files:
- ✅ `functions/.env` - Your credentials (for local testing)
- ✅ `functions/.env.example` - Template for others
- ✅ `BREVO_DEPLOYMENT_UPDATED.md` - This file

---

## Summary

Your Brevo integration is now updated to use the modern Firebase Functions v2 approach with environment parameters. This ensures:

1. ✅ No deprecation warnings
2. ✅ Won't break in March 2026
3. ✅ Better security with Secret Manager
4. ✅ Easier local development with `.env`

**Ready to deploy!** Just run the production deployment commands above.

---

## Next Steps

1. **Test locally**: `firebase emulators:start` → Test emails
2. **Set secrets**: Run the `echo ... | firebase functions:secrets:set` commands
3. **Deploy**: `firebase deploy --only functions`
4. **Test production**: Send a real email from your deployed app
5. **Monitor**: `firebase functions:log --follow`

See `BREVO_QUICK_DEPLOY.md` for the quick reference commands!
