# Azure Deployment Helper Script (Docker Hub Version)
# This script uses Docker Hub instead of Azure Container Registry
# ACR is blocked on Azure for Students subscriptions

# Prerequisites:
# 1. Install Azure CLI: https://aka.ms/installazurecliwindows
# 2. Create Docker Hub account: https://hub.docker.com/signup
# 3. Install Docker Desktop: https://www.docker.com/products/docker-desktop

# ==============================================================================
# PHASE 1: LOGIN AND SETUP
# ==============================================================================

# Login to Azure
az login

# Set subscription (Azure for Students)
az account set --subscription "Azure for Students"

# Create Resource Group
az group create --name sentrifit-rg --location eastus

# Login to Docker Hub (replace YOUR_DOCKERHUB_USERNAME with your actual username)
# You'll be prompted for your Docker Hub password
docker login

# ==============================================================================
# PHASE 2: CREATE AZURE RESOURCES (NO ACR!)
# ==============================================================================

# Create Azure Storage Account (optional - for video storage)
az storage account create `
  --name sentrifitstorage `
  --resource-group sentrifit-rg `
  --location eastus `
  --sku Standard_LRS

# Create containers for videos and models
az storage container create --name videos --account-name sentrifitstorage --public-access blob
az storage container create --name models --account-name sentrifitstorage --public-access off

# Create Azure Key Vault (optional - for secrets)
az keyvault create `
  --name sentrifit-kv `
  --resource-group sentrifit-rg `
  --location eastus

# Store HuggingFace API key in Key Vault
az keyvault secret set --vault-name sentrifit-kv --name HF-API-KEY --value "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"

# Create App Service Plan (Linux)
az appservice plan create `
  --name sentrifit-plan `
  --resource-group sentrifit-rg `
  --is-linux `
  --sku B1

# ==============================================================================
# PHASE 3: BUILD AND PUSH TO DOCKER HUB
# ==============================================================================

# IMPORTANT: Replace YOUR_DOCKERHUB_USERNAME with your actual Docker Hub username
$DOCKERHUB_USERNAME = "YOUR_DOCKERHUB_USERNAME"

# Build Docker image
Set-Location c:\Users\ITEMS\Desktop\can-eye\Gym-Buddy\
docker build -t ${DOCKERHUB_USERNAME}/sentrifit-server:v1 .

# Push to Docker Hub (public or private repo)
docker push ${DOCKERHUB_USERNAME}/sentrifit-server:v1

# ==============================================================================
# PHASE 4: CREATE WEB APP FROM DOCKER HUB IMAGE
# ==============================================================================

# Create Web App using Docker Hub image
az webapp create `
  --resource-group sentrifit-rg `
  --plan sentrifit-plan `
  --name sentrifit-api `
  --deployment-container-image-name ${DOCKERHUB_USERNAME}/sentrifit-server:v1

# If your Docker Hub repo is private, configure credentials:
# az webapp config container set `
#   --name sentrifit-api `
#   --resource-group sentrifit-rg `
#   --docker-custom-image-name ${DOCKERHUB_USERNAME}/sentrifit-server:v1 `
#   --docker-registry-server-url https://index.docker.io `
#   --docker-registry-server-user YOUR_DOCKERHUB_USERNAME `
#   --docker-registry-server-password YOUR_DOCKERHUB_PASSWORD

# ==============================================================================
# PHASE 5: CONFIGURE ENVIRONMENT VARIABLES
# ==============================================================================

# Get storage connection string
$STORAGE_CONN = az storage account show-connection-string `
  --name sentrifitstorage `
  --resource-group sentrifit-rg `
  --query connectionString -o tsv

# Set app settings
az webapp config appsettings set `
  --resource-group sentrifit-rg `
  --name sentrifit-api `
  --settings `
  AZURE_STORAGE_CONNECTION_STRING="$STORAGE_CONN" `
  KEY_VAULT_NAME="sentrifit-kv" `
  WEBSITES_PORT=8000 `
  HF_API_KEY="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" `
  FLASK_ENV=production `
  ALLOWED_ORIGINS="*"

# ==============================================================================
# PHASE 6: ENABLE MANAGED IDENTITY (Optional - for Key Vault)
# ==============================================================================

# Enable system-assigned identity
az webapp identity assign `
  --resource-group sentrifit-rg `
  --name sentrifit-api

# Get principal ID
$PRINCIPAL_ID = az webapp identity show `
  --resource-group sentrifit-rg `
  --name sentrifit-api `
  --query principalId -o tsv

# Grant Key Vault access
az keyvault set-policy `
  --name sentrifit-kv `
  --object-id $PRINCIPAL_ID `
  --secret-permissions get list

# ==============================================================================
# PHASE 7: VERIFICATION
# ==============================================================================

# Test health endpoint
Invoke-WebRequest https://sentrifit-api.azurewebsites.net/api/health

# Expected response:
# {"status":"ok","message":"SentriFit Exercise Analysis Server","environment":"azure","storage":"local"}

# View logs (optional)
az webapp log tail --name sentrifit-api --resource-group sentrifit-rg

# ==============================================================================
# OPTIONAL: UPDATE DEPLOYMENT (After making changes)
# ==============================================================================

# Rebuild and push new version
docker build -t ${DOCKERHUB_USERNAME}/sentrifit-server:v2 .
docker push ${DOCKERHUB_USERNAME}/sentrifit-server:v2

# Update web app to use new version
az webapp config container set `
  --name sentrifit-api `
  --resource-group sentrifit-rg `
  --docker-custom-image-name ${DOCKERHUB_USERNAME}/sentrifit-server:v2

# Restart web app
az webapp restart --name sentrifit-api --resource-group sentrifit-rg

# ==============================================================================
# CLEANUP (if needed)
# ==============================================================================

# Delete all resources
# az group delete --name sentrifit-rg --yes
