# Risk Route Vision - Startup Scripts

## Start Backend (Port 8080)

### PowerShell
```powershell
cd back-end
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

### Command Prompt
```cmd
cd back-end
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

## Start Frontend (Port 5173)

### Using Bun (recommended)
```powershell
cd front-end
bun run dev
```

### Using NPM
```powershell
cd front-end
npm run dev
```

## Start Both (Two Terminals)

### Terminal 1 - Backend
```powershell
cd back-end
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

### Terminal 2 - Frontend
```powershell
cd front-end
bun run dev
```

## Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080/api/v1
- **Backend Health**: http://localhost:8080/health
- **API Docs**: http://localhost:8080/docs

## First Time Setup

### Backend
```powershell
cd back-end
pip install -r requirements.txt
```

### Frontend
```powershell
cd front-end
bun install
# or
npm install
```
