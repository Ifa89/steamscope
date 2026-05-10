# SteamScope

A self-hosted Steam stats dashboard built on Azure — no third-party services, no subscriptions. Fork it, deploy it to your own Azure account, and get a personal live view of your Steam library, playtime, and recently played games.

**Live demo:** https://purple-ocean-0704ec10f.7.azurestaticapps.net

---

## What it does

- Fetches your Steam profile, owned games, and recently played games every **6 hours** via the Steam Web API
- Saves a snapshot to **Azure Cosmos DB** (free tier — costs nothing for personal use)
- Serves the latest stats as JSON through an **Azure Functions** HTTP endpoint
- Displays everything in a clean dark dashboard hosted on **Azure Static Web Apps** (also free)

## Architecture

```
Steam Web API
     │
     ▼  every 6 h
Azure Functions (Node.js 22)
  ├── steamSync  ──► Cosmos DB  (snapshot store)
  └── getStats   ──► HTTP GET /api/stats
                          │
                          ▼
               Static Web App (this repo)
```

---

## Prerequisites

- [Azure account](https://azure.microsoft.com/free/) (free tier is enough)
- [GitHub account](https://github.com)
- [Steam Web API key](https://steamcommunity.com/dev/apikey) — free, instant
- Your **Steam64 ID** — find it at [steamid.io](https://steamid.io) or in your profile URL (`/profiles/76561198XXXXXXXXX`)
- Windows, macOS, or Linux with PowerShell or Bash

---

## Setup

### 1 — Install tools

```powershell
# Windows (winget)
winget install Microsoft.AzureCLI
winget install GitHub.cli
winget install OpenJS.NodeJS.LTS
winget install Microsoft.Azure.FunctionsCoreTools

# macOS (brew)
brew install azure-cli gh node azure-functions-core-tools@4
```

### 2 — Fork & clone this repo

```bash
gh repo fork Ifa89/steamscope --clone
cd steamscope
```

### 3 — Provision Azure resources

Log in first:
```bash
az login
gh auth login
```

Then run the provisioning script (takes ~5 min, mostly waiting for Cosmos DB):
```powershell
.\steamscope-provision.ps1
```

> **Note:** Edit the variables at the top of `steamscope-provision.ps1` to use your own resource names and preferred Azure region before running.

The script creates:

| Resource | Purpose | Cost |
|---|---|---|
| Resource Group | Container for all resources | Free |
| Storage Account | Azure Functions backing store | ~$0/mo |
| Azure Functions App | API + timer sync (Node.js 22, consumption) | Free tier |
| Cosmos DB Account + Database | Snapshot storage | Free tier |
| Blob Storage Account | Available for your own use | ~$0/mo |
| Static Web App | Hosts the dashboard | Free tier |
| GitHub Repo | Source for Static Web App CI/CD | Free |

### 4 — Configure the backend

Copy the example settings file:
```bash
cp steamscope-functions/local.settings.example.json steamscope-functions/local.settings.json
```

Fill in `local.settings.json`:

```json
{
  "Values": {
    "AzureWebJobsStorage": "<connection string from step 3 output>",
    "STEAM_API_KEY":       "<your Steam Web API key>",
    "STEAM_ID":            "<your Steam64 ID>",
    "COSMOS_ENDPOINT":     "<your Cosmos DB endpoint>",
    "COSMOS_KEY":          "<your Cosmos DB primary key>",
    "COSMOS_DB_NAME":      "steamscope-db",
    "COSMOS_CONTAINER_NAME": "snapshots"
  }
}
```

Get Cosmos DB values:
```bash
az cosmosdb show --name <your-cosmos-account> --resource-group <your-rg> --query documentEndpoint -o tsv
az cosmosdb keys list --name <your-cosmos-account> --resource-group <your-rg> --query primaryMasterKey -o tsv
```

### 5 — Test locally

```bash
cd steamscope-functions
npm install
func start
```

Trigger a manual sync:
```bash
curl -X POST http://localhost:7071/admin/functions/steamSync \
  -H "Content-Type: application/json" -d "{}"
```

Check the output:
```bash
curl http://localhost:7071/api/stats
```

### 6 — Configure the frontend

```bash
cp config.example.js config.js
```

Edit `config.js` — set `apiUrl` to your Functions app URL:
```js
window.STEAMSCOPE_CONFIG = {
  apiUrl: 'https://YOUR-FUNC-APP.azurewebsites.net/api/stats',
};
```

> `config.js` is gitignored — it will never be committed.

### 7 — Deploy

**Functions backend:**
```bash
cd steamscope-functions

# Push secrets to Azure
az functionapp config appsettings set \
  --name <your-func-app> --resource-group <your-rg> \
  --settings \
    STEAM_API_KEY="..." \
    STEAM_ID="..." \
    COSMOS_ENDPOINT="..." \
    COSMOS_KEY="..." \
    COSMOS_DB_NAME="steamscope-db" \
    COSMOS_CONTAINER_NAME="snapshots"

# Deploy code
func azure functionapp publish <your-func-app> --node
```

**Frontend:**
```bash
git add index.html style.css app.js config.js staticwebapp.config.json
git commit -m "My SteamScope deployment"
git push
```

GitHub Actions will automatically deploy to your Static Web App. Check progress under the **Actions** tab of your repo.

---

## Configuration reference

| Setting | Where | Description |
|---|---|---|
| `STEAM_API_KEY` | `local.settings.json` / Azure app settings | From [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey) |
| `STEAM_ID` | `local.settings.json` / Azure app settings | Your Steam64 ID (17-digit number) |
| `STEAM_VANITY_URL` | `local.settings.json` / Azure app settings | Optional — only used if `STEAM_ID` is blank |
| `COSMOS_ENDPOINT` | `local.settings.json` / Azure app settings | Cosmos DB document endpoint URL |
| `COSMOS_KEY` | `local.settings.json` / Azure app settings | Cosmos DB primary master key |
| `apiUrl` | `config.js` | Full URL of your `/api/stats` Functions endpoint |

---

## Customising

- **Sync frequency:** edit the `schedule` cron in [`steamscope-functions/src/functions/steamSync.js`](steamscope-functions/src/functions/steamSync.js) — default is every 6 hours (`0 0 */6 * * *`)
- **Number of top games shown:** change `.slice(0, 20)` in [`src/functions/getStats.js`](steamscope-functions/src/functions/getStats.js)
- **Styling:** edit [`style.css`](style.css) — the design uses CSS custom properties at the top for easy theming

---

## License

[MIT](LICENSE) — fork it, modify it, make it yours.
