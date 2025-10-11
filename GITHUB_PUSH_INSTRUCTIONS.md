# How to Push This Project to GitHub

Follow these steps to upload your project to GitHub so your friend can collaborate.

## Option 1: Using GitHub Website (Easiest)

### 1. Create a New Repository on GitHub

1. Go to [github.com](https://github.com) and log in
2. Click the **+** icon in the top right
3. Select **"New repository"**
4. Fill in the details:
   - **Repository name**: `CollectEVM` (or whatever you prefer)
   - **Description**: "Wassieverse NFT Wallet Linker - Link Solana and EVM wallets"
   - **Visibility**: Choose **Private** (recommended) or **Public**
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **"Create repository"**

### 2. Push Your Code

GitHub will show you commands. Use these in your terminal:

```bash
# Add GitHub as remote (replace YOUR-USERNAME and YOUR-REPO with your actual values)
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git

# Push your code
git push -u origin master
```

**Example:**
```bash
git remote add origin https://github.com/johndoe/CollectEVM.git
git push -u origin master
```

### 3. Share with Your Friend

Send your friend the repository URL:
- For **public repos**: `https://github.com/YOUR-USERNAME/CollectEVM`
- For **private repos**: Add them as a collaborator first:
  1. Go to your repository on GitHub
  2. Click **Settings** > **Collaborators**
  3. Click **"Add people"**
  4. Enter their GitHub username or email
  5. They'll receive an invitation to join

## Option 2: Using GitHub Desktop (GUI)

### 1. Download GitHub Desktop
- Download from [desktop.github.com](https://desktop.github.com)
- Install and sign in with your GitHub account

### 2. Publish Repository
1. Open GitHub Desktop
2. Click **File** > **Add Local Repository**
3. Select your `CollectEVM` folder
4. Click **Publish repository**
5. Choose name, description, and privacy settings
6. Click **Publish Repository**

### 3. Share with collaborators
- Same as Option 1, Step 3 above

## For Your Friend to Clone

Once you've pushed the code, your friend can get it by:

```bash
# Clone the repository (replace with your actual URL)
git clone https://github.com/YOUR-USERNAME/CollectEVM.git

# Navigate into it
cd CollectEVM

# Follow the SETUP_CHECKLIST.md
```

## Important: Protecting Sensitive Information

Before pushing, double-check that:

- ✅ `.env` is in `.gitignore` (it is!)
- ✅ No API keys are committed
- ✅ No database credentials are in the code
- ✅ `ngrok.exe` is ignored (it is!)

Your `.env` file is **NOT** pushed to GitHub. Your friend needs to create their own `.env` file using the `env.example` template.

## Working Together - Basic Git Workflow

Once your repository is on GitHub:

### For You (Repository Owner):
```bash
# Make changes to code
git add .
git commit -m "Description of changes"
git push
```

### For Your Friend:
```bash
# Get the latest code before starting work
git pull

# Make changes
git add .
git commit -m "Description of changes"
git push
```

### If You Both Work at the Same Time:
```bash
# Always pull before pushing
git pull

# If there are conflicts, Git will tell you
# Edit the conflicted files to resolve
git add .
git commit -m "Resolved conflicts"
git push
```

## Recommended: Branch Protection

For better collaboration, consider using branches:

```bash
# Create a new branch for your feature
git checkout -b feature/my-new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push the branch
git push -u origin feature/my-new-feature

# On GitHub, create a Pull Request to merge into master
```

This way, you can review each other's code before merging!

## Quick Reference

```bash
# Check status
git status

# See what changed
git diff

# View commit history
git log --oneline

# Get latest changes
git pull

# Push your changes
git push

# Create new branch
git checkout -b branch-name

# Switch branches
git checkout branch-name

# See all branches
git branch -a
```

## Need Help?

- [GitHub's Git Handbook](https://guides.github.com/introduction/git-handbook/)
- [GitHub Desktop Documentation](https://docs.github.com/en/desktop)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)

## 🎉 That's It!

Once pushed, you and your friend can collaborate on the project together. Remember to:
- Pull before starting work
- Commit often with clear messages
- Push regularly to share your changes
- Communicate about what you're working on

Happy collaborating! 🚀

