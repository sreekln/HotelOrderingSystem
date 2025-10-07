@@ .. @@
 
 ## 🚀 Deployment Options
 
### Option 1: GitHub Actions (Recommended)

**Best for**: Automated CI/CD with version control integration

#### Prerequisites:
- GitHub repository
- Azure subscription
- Azure CLI installed

#### Quick Setup:
```bash
# 1. Create Azure resources
az group create --name hotel-ordering-rg --location "East US"
az appservice plan create --name hotel-ordering-plan --resource-group hotel-ordering-rg --sku B1 --is-linux
az webapp create --resource-group hotel-ordering-rg --plan hotel-ordering-plan --name hotel-ordering-system --runtime "NODE|18-lts"

# 2. Get publish profile
az webapp deployment list-publishing-profiles --name hotel-ordering-system --resource-group hotel-ordering-rg --xml

# 3. Add GitHub Secrets:
# - AZURE_WEBAPP_PUBLISH_PROFILE (from step 2)
# - VITE_API_URL
# - VITE_STRIPE_PUBLISHABLE_KEY

# 4. Push to main branch - automatic deployment!
```

📖 **Detailed Guide**: See `GITHUB-ACTIONS-SETUP.md`

---

### Option 2: Azure CLI (Quick Setup)

**Best for**: Quick deployment and testing

### Environment Variables:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hotel_ordering_system
DB_USER=postgres
DB_PASSWORD=your_password
VITE_API_URL=http://localhost:3001/api
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```