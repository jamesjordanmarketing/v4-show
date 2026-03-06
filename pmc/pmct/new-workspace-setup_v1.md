# New Workspace Setup Guide

## Overview
Process for copying an existing VS Code workspace to a new folder and setting it up as a new project.

---

## 1. Copy Folder Structure

### 1.1 Copy the Project
```powershell
# Navigate to the parent directory
cd C:\Users\james\Master\BrightHub\brun

# Copy the entire folder to a new location with new name
Copy-Item -Path "v4-show/" -Destination "new-project-name" -Recurse
```

### 1.2 Open New Workspace
- Open the new folder in VS Code
- Update the `.code-workspace` file name to match the new project name

---

## 2. Update Path References

### 2.1 Search and Replace Full Paths
```powershell
# Use VS Code's Find in Files (Ctrl+Shift+F)
# Find: C:\Users\james\Master\BrightHub\brun\v4-show
# Replace with: C:\Users\james\Master\BrightHub\brun\new-project-name
```

### 2.2 Files to Check
- Documentation files in `docs/`
- Configuration files (`vercel.json`, `package.json`, etc.)
- Workspace file (`.code-workspace`)
- Any hardcoded paths in scripts
- README files

### 2.3 Update Project-Specific Names
- Search for old project name references
- Replace with new project name in:
  - `package.json` (name, description)
  - Documentation headers
  - README files

---

## 3. Initialize Git Repository

### 3.1 Remove Old Git History
```powershell
# Navigate to the new project folder
cd C:\Users\james\Master\BrightHub\brun\new-project-name

# Remove existing .git folder
Remove-Item -Path ".git" -Recurse -Force
```

### 3.2 Initialize New Git Repository
```powershell
# Initialize git
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: New workspace setup"
```

### 3.3 Create GitHub Repository
- Go to https://github.com/new
- Create new repository (do not initialize with README, .gitignore, or license)
- Copy the repository URL

### 3.4 Push to GitHub
```powershell
# Add remote origin (replace with your repo URL)
git remote add origin https://github.com/yourusername/new-project-name.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## 4. Instantiate Vercel Project

### 4.1 Prerequisites
- Vercel account with appropriate permissions
- GitHub repository created and pushed (from Step 3)
- Vercel CLI installed globally (`npm i -g vercel`)

### 4.2 Connect New Repo to Vercel
1. Go to https://vercel.com/new
2. Select "Import Git Repository"
3. Find and select your new GitHub repository
4. Configure project settings:
   - Project Name: `new-project-name`
   - Framework Preset: (auto-detected or select manually)
   - Root Directory: `.` (or specify if different)
5. **Skip environment variables for now** - click "Deploy"
6. Wait for initial deployment (will likely fail without env vars - that's expected)

### 4.3 Migrate Environment Variables from Old Project

#### Step 1: Link and pull env vars from OLD project
```powershell
# Navigate to your OLD project folder
cd C:\Users\james\Master\BrightHub\brun\v4-show

# Link to the OLD Vercel project (select existing project from list)
vercel link

# Pull all environment variables to .env.local
vercel env pull .env.local
```

#### Step 2: Copy .env.local to NEW project
```powershell
# Copy the file to your new project
Copy-Item -Path ".env.local" -Destination "C:\Users\james\Master\BrightHub\brun\v4-show\.env.local"
```

#### Step 3: Link NEW project to Vercel
```powershell
# Navigate to your NEW project folder
cd C:\Users\james\Master\BrightHub\brun\new-project-name

# Link to the new Vercel project
vercel link
```

#### Step 4: Push env vars to NEW project
```powershell
# Add each environment variable (repeat for each var)
# Option A: Add one by one from .env.local
vercel env add VARIABLE_NAME

# Option B: Use the Vercel dashboard
# Go to: Project Settings > Environment Variables > Import .env file
```

#### Step 5: Trigger Redeploy
```powershell
vercel --prod
```

---

## Notes
- Always verify path replacements before committing
- Check environment variables and secrets
- Update any CI/CD configurations
- Review and update dependencies if needed
