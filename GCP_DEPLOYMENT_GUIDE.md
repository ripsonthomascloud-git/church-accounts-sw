# GCP Cloud Run Deployment Guide

This guide will help you deploy the Church Accounts Software to Google Cloud Platform using Cloud Build and Cloud Run in the us-east4 region.

## Prerequisites

1. Google Cloud Platform account
2. gcloud CLI installed on your machine
3. A GCP project created

## Initial Setup

### 1. Install and Configure gcloud CLI

If you haven't already, install the gcloud CLI:
```bash
# Follow instructions at: https://cloud.google.com/sdk/docs/install
```

Login and set your project:
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 2. Enable Required APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### 3. Create Artifact Registry Repository

Create a Docker repository in us-east4:
```bash
gcloud artifacts repositories create church-accounts \
  --repository-format=docker \
  --location=us-east4 \
  --description="Docker repository for Church Accounts Software"
```

### 4. Configure Environment Variables

Before deploying, you need to set up your Firebase configuration. The application expects these environment variables to be available at build time.

Create a `.env.production` file (if needed) or ensure your Firebase config is properly set in your code.

## Deployment

### Option 1: Deploy Using Cloud Build (Recommended)

This method uses the `cloudbuild.yaml` file to build and deploy automatically:

```bash
# Submit build to Cloud Build
gcloud builds submit --config=cloudbuild.yaml --region=us-east4
```

### Option 2: Manual Docker Build and Deploy

If you prefer to build and deploy manually:

```bash
# 1. Build the Docker image
docker build -t us-east4-docker.pkg.dev/YOUR_PROJECT_ID/church-accounts/accounts-software:latest .

# 2. Configure Docker to authenticate with Artifact Registry
gcloud auth configure-docker us-east4-docker.pkg.dev

# 3. Push the image
docker push us-east4-docker.pkg.dev/YOUR_PROJECT_ID/church-accounts/accounts-software:latest

# 4. Deploy to Cloud Run
gcloud run deploy accounts-software \
  --image us-east4-docker.pkg.dev/YOUR_PROJECT_ID/church-accounts/accounts-software:latest \
  --region us-east4 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --min-instances 0
```

## Set Up Continuous Deployment (Optional)

To automatically deploy when you push to your Git repository:

### 1. Connect Cloud Build to Your Repository

```bash
# Connect your GitHub/GitLab/Bitbucket repository
gcloud alpha builds triggers create github \
  --name="deploy-accounts-software" \
  --repo-name=YOUR_REPO_NAME \
  --repo-owner=YOUR_GITHUB_USERNAME \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml \
  --region=us-east4
```

### 2. Grant Cloud Build Permissions

```bash
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')

# Grant Cloud Run Admin role to Cloud Build
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"

# Grant Service Account User role
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

## Environment Variables for Cloud Run

If you need to set environment variables in Cloud Run (e.g., for Firebase config):

```bash
gcloud run services update accounts-software \
  --region us-east4 \
  --update-env-vars VITE_FIREBASE_API_KEY=your_api_key,VITE_FIREBASE_PROJECT_ID=your_project_id
```

Or use a secrets manager:

```bash
# Create a secret
echo -n "your-api-key" | gcloud secrets create firebase-api-key --data-file=-

# Grant Cloud Run access to the secret
gcloud secrets add-iam-policy-binding firebase-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Update Cloud Run to use the secret
gcloud run services update accounts-software \
  --region us-east4 \
  --update-secrets VITE_FIREBASE_API_KEY=firebase-api-key:latest
```

## Custom Domain (Optional)

To use a custom domain:

```bash
# Map your domain
gcloud run domain-mappings create \
  --service accounts-software \
  --domain your-domain.com \
  --region us-east4
```

Follow the instructions to add the DNS records to your domain registrar.

## Monitoring and Logs

View logs:
```bash
gcloud run services logs read accounts-software --region us-east4
```

View service details:
```bash
gcloud run services describe accounts-software --region us-east4
```

## Cost Optimization

The configuration in `cloudbuild.yaml` includes:
- **Min instances**: 0 (scales to zero when not in use)
- **Max instances**: 10
- **Memory**: 512Mi
- **CPU**: 1

Adjust these values based on your needs to optimize costs.

## Troubleshooting

### Build Fails
- Check Cloud Build logs: `gcloud builds log --region=us-east4`
- Ensure all APIs are enabled
- Verify Artifact Registry repository exists

### Deployment Fails
- Check Cloud Run logs: `gcloud run services logs read accounts-software --region us-east4`
- Verify the image exists in Artifact Registry
- Check IAM permissions

### Application Errors
- Ensure Firebase configuration is correct
- Check that all environment variables are set
- Verify nginx configuration in `nginx.conf`

## Cleanup

To delete all resources:

```bash
# Delete Cloud Run service
gcloud run services delete accounts-software --region us-east4

# Delete Artifact Registry repository
gcloud artifacts repositories delete church-accounts --location us-east4

# Delete build triggers (if created)
gcloud builds triggers delete deploy-accounts-software --region us-east4
```

## Security Notes

1. **Authentication**: The current setup allows unauthenticated access. For production, consider:
   - Adding Firebase Authentication checks
   - Using Cloud Run authentication
   - Setting up Cloud Armor for DDoS protection

2. **Secrets**: Never commit `.env` files with sensitive data. Use Google Secret Manager for production secrets.

3. **HTTPS**: Cloud Run automatically provides HTTPS. Ensure your application only uses secure connections.

## Support

For issues specific to:
- **Cloud Build**: https://cloud.google.com/build/docs
- **Cloud Run**: https://cloud.google.com/run/docs
- **Artifact Registry**: https://cloud.google.com/artifact-registry/docs
