## Push a new repository

### Step-by-Step Instructions: Local Repository → New GitHub Repository
https://github.com/jamesjordanmarketing/br-kombai-7.git


#### Step 1: Prepare Your Local Repository
```bash
# Navigate to your project folder in VS Code terminal
cd your-project-folder

# Initialize git if not already done
git init

# Check status of files
git status
```

#### Step 2: Check and Switch Default Branch to Main (Recommended)
```bash
# Check current branch name (must commit something first)
git branch

# If you're on 'master', rename it to 'main' (GitHub's current standard)
git branch -m master main

# If you're already on 'main' or another branch, you can skip this step
# Verify the branch change
git branch
```

#### Step 3: Stage and Commit Your Files
```bash
# Add all files to staging
git add .

# Or add specific files
git add filename.txt

# Commit your changes
git commit -m "Initial commit"
```

#### Step 4: Create New Repository on GitHub
1. Go to [GitHub.com](https://github.com)
2. Click the "+" icon in top right corner
3. Select "New repository"
4. Enter repository name (should match your local folder name)
5. Choose public or private
6. **DO NOT** initialize with README, .gitignore, or license (since you already have local files)
7. Click "Create repository"
8. **Important**: GitHub now defaults to 'main' branch, which matches our local setup

#### Step 5: Connect Local Repository to GitHub
```bash
# Add the remote origin (replace with your actual GitHub URL)
git remote add origin https://github.com/jamesjordanmarketing/v4-show.git

# Verify the remote was added
git remote -v
```

#### Step 6: Push to GitHub
```bash
# Push your code to GitHub (first time) - using 'main' branch
git push -u origin main

# This sets 'main' as the default upstream branch for future pushes
```

#### Step 7: Set Main as Default Branch (If Needed)
If you accidentally pushed to 'master' first or need to change the default:
```bash
# If you have both master and main branches, delete master after confirming main is correct
git push origin --delete master

# Or if you need to switch from master to main on GitHub:
# 1. Go to your repository on GitHub
# 2. Click Settings tab
# 3. Click Branches in left sidebar
# 4. Change default branch from master to main
# 5. Delete the master branch if no longer needed
```

#### Step 6: Verify Upload
1. Refresh your GitHub repository page
2. You should see all your files uploaded
3. Your local VS Code is now connected to GitHub

#### Future Pushes (After Initial Setup)
```bash
git add .
git commit -m "Your commit message"
git push
```

#### Troubleshooting:
- **Authentication Error**: You may need to use a Personal Access Token instead of password
- **Branch Name Issues**: 
  - Check your current branch: `git branch`
  - If on 'master' and want to switch to 'main': `git branch -m master main`
  - If you already pushed to 'master' and want to switch to 'main':
    ```bash
    git branch -m master main
    git push -u origin main
    git push origin --delete master
    ```
- **Remote Already Exists**: Use `git remote set-url origin https://github.com/yourusername/your-repo-name.git`
- **Default Branch Mismatch**: 
  - GitHub creates 'main' by default, but older Git installations may create 'master'
  - Always rename to 'main' before first push for consistency
  - Use `git config --global init.defaultBranch main` to set 'main' as default for future repositories
- **Push Rejected**: If you get "failed to push some refs", try:
  ```bash
  git pull origin main --rebase
  git push origin main
  ```


## Push to existing repository
git status

git add -A
git commit -m "Added About page and updated index"
git push

git add -A
git commit -m "Last night checkin-wireframes 1. done"
git push --force

## Pulling Changes from GitHub Repository

**Basic pull (most common):**
```bash
git pull
```

**Pull from specific remote and branch:**
```bash
git pull origin main
```
(Replace `main` with your branch name if different, could be `master`)

**Pull with rebase (cleaner history):**
```bash
git pull --rebase
```

**Force pull (overwrites local changes - use with caution):**
```bash
git fetch origin
git reset --hard origin/main
```

## Complete Workflow:
1. Check current status: `git status`
2. Commit any local changes first: `git add . && git commit -m "Save local changes"`
3. Pull latest changes: `git pull`
4. Resolve any merge conflicts if they occur

## Troubleshooting:
- If you have uncommitted changes, git will ask you to commit or stash them first
- Use `git stash` to temporarily save changes, then `git stash pop` after pulling
- Check your remote with: `git remote -v`

## Clone a Repository from GitHub to a New PC

### Step-by-Step Instructions: GitHub Repository → New Local Machine

#### Step 1: Get the Repository URL
1. Go to your repository on [GitHub.com](https://github.com)
2. Click the green "Code" button
3. Copy the HTTPS URL (e.g., `https://github.com/username/repository-name.git`)

#### Step 2: Navigate to Desired Parent Directory
```bash
# Open terminal in VS Code or Command Prompt
# Navigate to where you want the repository folder created
# The repository folder will be created automatically inside this location

cd C:\Users\james\Master\BrightHub\brun

# Or any other location where you want the project folder to appear
```

#### Step 3: Clone the Repository
```bash
# Clone the repository (this creates the folder automatically)
git clone https://github.com/username/repository-name.git

# Example:
git clone https://github.com/jamesjordanmarketing/v4-show.git

# This will create a new folder named 'lora-pipeline' in your current directory
```

#### Step 4: Navigate into the New Folder
```bash
# Move into the newly cloned repository
cd repository-name

# Example:
cd lora-pipeline

# Verify the connection
git remote -v
```

#### Step 5: Verify the Clone
```bash
# Check the current branch
git branch

# Check the status
git status

# You should see: "On branch main" and "nothing to commit, working tree clean"
```

#### Step 6: Open in VS Code (Optional)
```bash
# Open the folder in VS Code from terminal
code .

# Or manually: File → Open Folder → Select the cloned folder
```

#### Complete Example Workflow:
```bash
# 1. Navigate to parent directory
cd C:\Users\james\Master\BrightHub\brun

# 2. Clone the repository
git clone https://github.com/jamesjordanmarketing/my-project.git

# 3. Enter the new folder
cd my-project

# 4. Open in VS Code
code .

# 5. Start working!
```

#### What Gets Downloaded:
- All files and folders from the repository
- Complete git history and commits
- All branches (though you'll be on the default branch)
- Remote connection automatically configured
- Ready to push/pull immediately

#### Troubleshooting:
- **Authentication Required**: You may need to authenticate with GitHub
  - Use a Personal Access Token instead of password
  - Or set up SSH keys for easier access
- **Folder Already Exists**: If the folder name already exists, git will give an error
  - Choose a different location or rename/delete the existing folder
  - Or clone with a different name: `git clone <url> custom-folder-name`
- **Slow Download**: Large repositories take time, be patient
- **Permission Denied**: Make sure you have access to the repository (private repos require permissions)

#### After Cloning - Regular Workflow:
```bash
# Get latest changes from GitHub
git pull

# Make your changes to files
# ...

# Stage and commit
git add .
git commit -m "Your changes"

# Push to GitHub
git push
```