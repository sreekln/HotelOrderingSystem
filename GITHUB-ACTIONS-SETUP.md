# GitHub Actions Deployment Setup

This guide will help you set up automated deployment to Azure App Service using GitHub Actions.

## 🚀 Prerequisites

1. **Azure Account** with an active subscription
2. **GitHub Repository** with your code
3. **Azure CLI** installed locally (for initial setup)

## 📋 Step-by-Step Setup

### Step 1: Create Azure Resources

```bash
# Login to Azure
az login

# Create resource group
az group create --name hotel-ordering-rg --location "East US"

# Create App Service plan
az appservice plan create \
  --name hotel-ordering-plan \
  --resource-group hotel-ordering-rg \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group hotel-ordering-rg \
  --plan hotel-ordering-plan \
  --name hotel-ordering-system \
  --runtime "NODE|18-lts"
```

### Step 2: Get Publish Profile

```bash
# Download publish profile
az webapp deployment list-publishing-profiles \
  --name hotel-ordering-system \
  --resource-group hotel-ordering-rg \
  --xml
```

### Step 3: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these **Repository Secrets**:

#### Required Secrets:
```
AZURE_WEBAPP_PUBLISH_PROFILE
```
Paste the entire XML content from Step 2

#### Environment Variables:
```
VITE_API_URL=http://localhost:3001/api
```

### Step 4: Update Workflow Configuration

Edit `.github/workflows/azure-deploy.yml`:

```yaml
env:
  AZURE_WEBAPP_NAME: hotel-ordering-system  # Change to your app name
```

### Step 5: Configure Azure App Settings

```bash
# Set Node.js version
az webapp config appsettings set \
  --resource-group hotel-ordering-rg \
  --name hotel-ordering-system \
  --settings WEBSITE_NODE_DEFAULT_VERSION="18.x"

# Set startup command
az webapp config set \
  --resource-group hotel-ordering-rg \
  --name hotel-ordering-system \
  --startup-file "startup.cmd"
```

## 🔄 Deployment Process

### Automatic Deployment
- **Push to `main`**: Triggers build and deploy
- **Pull Requests**: Runs build validation only
- **Manual**: Use "Run workflow" button in Actions tab

### Workflow Steps:
1. **Checkout Code**: Downloads repository
2. **Setup Node.js**: Installs Node.js 18.x
3. **Install Dependencies**: Runs `npm ci`
4. **Lint Code**: Runs ESLint checks
5. **Build Application**: Creates production build
6. **Deploy to Azure**: Uploads to App Service
7. **Health Check**: Verifies deployment

## 🛠️ Troubleshooting

### Common Issues:

#### 1. Build Failures
```bash
# Check logs in GitHub Actions tab
# Common fixes:
- Verify all secrets are set correctly
- Check for TypeScript/ESLint errors
- Ensure all dependencies are in package.json
```

#### 2. Deployment Failures
```bash
# Check Azure App Service logs
az webapp log tail --name hotel-ordering-system --resource-group hotel-ordering-rg

# Common fixes:
- Verify publish profile is correct
- Check Azure App Service configuration
- Ensure startup.cmd is executable
```

#### 3. Runtime Errors
```bash
# Check application logs
az webapp log download --name hotel-ordering-system --resource-group hotel-ordering-rg

# Common fixes:
- Verify environment variables in Azure
- Check web.config for SPA routing
- Ensure all build files are deployed
```

## 📊 Monitoring

### Application Insights Setup:
```bash
# Create Application Insights
az monitor app-insights component create \
  --app hotel-ordering-insights \
  --location "East US" \
  --resource-group hotel-ordering-rg

# Link to Web App
az webapp config appsettings set \
  --resource-group hotel-ordering-rg \
  --name hotel-ordering-system \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY="your-instrumentation-key"
```

### Health Monitoring:
- **GitHub Actions**: Build and deployment status
- **Azure Portal**: Application metrics and logs
- **Application Insights**: Performance and error tracking

## 🔐 Security Best Practices

### Secrets Management:
- ✅ Use GitHub Secrets for sensitive data
- ✅ Rotate publish profiles regularly
- ✅ Use environment-specific configurations
- ✅ Enable Azure AD authentication if needed

### Access Control:
- ✅ Limit repository access
- ✅ Use branch protection rules
- ✅ Require PR reviews for main branch
- ✅ Enable deployment environments

## 🚀 Advanced Configuration

### Custom Domain:
```bash
# Add custom domain
az webapp config hostname add \
  --webapp-name hotel-ordering-system \
  --resource-group hotel-ordering-rg \
  --hostname yourdomain.com
```

### SSL Certificate:
```bash
# Enable HTTPS redirect
az webapp update \
  --name hotel-ordering-system \
  --resource-group hotel-ordering-rg \
  --https-only true
```

### Scaling:
```bash
# Scale up App Service plan
az appservice plan update \
  --name hotel-ordering-plan \
  --resource-group hotel-ordering-rg \
  --sku P1V2
```

## 📞 Support

### Useful Commands:
```bash
# View deployment logs
az webapp log tail --name hotel-ordering-system --resource-group hotel-ordering-rg

# Restart application
az webapp restart --name hotel-ordering-system --resource-group hotel-ordering-rg

# View application settings
az webapp config appsettings list --name hotel-ordering-system --resource-group hotel-ordering-rg
```

### Resources:
- [Azure App Service Documentation](https://docs.microsoft.com/en-us/azure/app-service/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Node.js on Azure](https://docs.microsoft.com/en-us/azure/app-service/quickstart-nodejs)

---

🎉 **Your Hotel Ordering System is now ready for automated deployment with GitHub Actions!**