# Azure Deployment README (Docker Hub Version)

This directory contains all the files needed to deploy the SentriFit server to Azure using **Docker Hub** as the container registry.

> **Note**: Azure Container Registry (ACR) is blocked on Azure for Students subscriptions. We use Docker Hub instead, which works perfectly with Azure App Service.

## Files Created for Deployment

- `Dockerfile` - Container configuration for the Flask application
- `.dockerignore` - Files to exclude from Docker build
- `azure-requirements.txt` - Python dependencies for Azure deployment
- `.env.example` - Example environment variable configuration
- `deploy-azure.ps1` - PowerShell script with all deployment commands (Docker Hub version)

## Quick Start

### Prerequisites

1. **Azure Student Subscription** - You have this ✓
2. **Docker Hub Account** - Create free account at https://hub.docker.com/signup
3. **Azure CLI** - Download from: https://aka.ms/installazurecliwindows
4. **Docker Desktop** - Download from: https://www.docker.com/products/docker-desktop

### Step 1: Create Docker Hub Account

1. Go to https://hub.docker.com/signup
2. Create a free account (note your username)
3. Verify your email

### Step 2: Local Testing (Optional but Recommended)

Before deploying to Azure, test the Docker container locally:

```powershell
# Build the Docker image
Set-Location c:\Users\ITEMS\Desktop\can-eye\Gym-Buddy\
docker build -t sentrifit-local .

# Run locally
docker run -p 8000:8000 -e HF_API_KEY=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 sentrifit-local

# Test in browser or PowerShell
Invoke-WebRequest http://localhost:8000/api/health
```

### Step 3: Deploy to Azure

1. **Open PowerShell as Administrator**

2. **Edit the deployment script**:
   ```powershell
   notepad c:\Users\ITEMS\Desktop\can-eye\Gym-Buddy\deploy-azure.ps1
   ```
   
   Find this line and replace with your Docker Hub username:
   ```powershell
   $DOCKERHUB_USERNAME = "YOUR_DOCKERHUB_USERNAME"
   ```

3. **Run deployment commands step by step**:
   - Phase 1: Login to Azure and Docker Hub
   - Phase 2: Create Azure resources (Storage, Key Vault, App Service Plan)
   - Phase 3: Build and push image to Docker Hub
   - Phase 4: Create Web App from Docker Hub image
   - Phase 5: Configure environment variables
   - Phase 6: Enable managed identity (optional)
   - Phase 7: Verify deployment

### After Deployment

1. **Mobile App Config**:
   - Already updated in: `c:\Users\ITEMS\Desktop\kalori-computing\apps\mobile\src\config.ts`
   - Production URL: `https://sentrifit-api.azurewebsites.net`
   - Auto-switches between dev (local) and production (Azure)

2. **Test Deployment**:
   ```powershell
   # Test health endpoint
   Invoke-WebRequest https://sentrifit-api.azurewebsites.net/api/health
   ```

3. **Monitor Costs**:
   - Azure Portal > Cost Management
   - Budget alert recommended at $80-90

## Why Docker Hub Instead of ACR?

**Problem**: Azure for Students subscriptions have policy restrictions that block Azure Container Registry creation.

**Solution**: Use Docker Hub (free public registry) instead:
- ✅ Free for public repositories
- ✅ Works perfectly with Azure App Service
- ✅ No subscription restrictions
- ✅ Easy to use and widely supported

## Estimated Costs

**Without ACR** (cheaper!):
- App Service (B1): ~$13/month
- Storage Account: ~$2-5/month (optional)
- Key Vault: ~$0-1/month (optional)

**Total: ~$15-19/month** (5+ months on $100 student credit)

**Savings**: ~$5/month by not using ACR!

## Troubleshooting

### Docker Build Fails
- Ensure Docker Desktop is running
- Check disk space for large image layers

### Docker Push Fails
- Verify you're logged in: `docker login`
- Check Docker Hub username is correct
- Ensure repository name matches: `username/sentrifit-server`

### Azure Web App Can't Pull Image
- **Public repo**: No authentication needed (recommended)
- **Private repo**: Configure Docker Hub credentials in Web App settings

### 500 Errors After Deployment
- Check logs: `az webapp log tail --name sentrifit-api --resource-group sentrifit-rg`
- Verify environment variables are set
- Ensure `WEBSITES_PORT=8000` is configured

## Docker Hub Repository Options

### Public Repository (Recommended)
- Free
- No authentication needed for Azure to pull
- Anyone can see your code (if they find the image)

### Private Repository
- Free (1 private repo on free tier)
- Requires Docker Hub credentials in Azure
- More secure but needs extra configuration

## Next Steps

1. ✅ Create Docker Hub account
2. ✅ Update `deploy-azure.ps1` with your Docker Hub username
3. ✅ Run deployment phases 1-7
4. ✅ Test endpoints
5. ✅ Test from mobile app

## Rolling Back

If you need to rollback or delete everything:

```powershell
# Delete entire resource group (removes everything except Docker Hub image)
az group delete --name sentrifit-rg --yes
```

## Updating After Deployment

To deploy code changes:

```powershell
# Replace with your Docker Hub username
$DOCKERHUB_USERNAME = "yourusername"

# 1. Rebuild Docker image with new version
docker build -t ${DOCKERHUB_USERNAME}/sentrifit-server:v2 .
docker push ${DOCKERHUB_USERNAME}/sentrifit-server:v2

# 2. Update web app
az webapp config container set `
  --name sentrifit-api `
  --resource-group sentrifit-rg `
  --docker-custom-image-name ${DOCKERHUB_USERNAME}/sentrifit-server:v2

# 3. Restart
az webapp restart --name sentrifit-api --resource-group sentrifit-rg
```

## Comparison: ACR vs Docker Hub

| Feature | ACR (Blocked) | Docker Hub (Working) |
|---------|---------------|---------------------|
| Cost | $5/month | Free (public) |
| Azure Integration | Native | Supported |
| Private Images | Yes | Yes (1 free) |
| Speed | Fast (same region) | Fast enough |
| Student Subscription | ❌ Blocked | ✅ Works |

**Verdict**: Docker Hub is perfect for this use case!
