# 🔧 Repository Setup Guide

This guide helps you set up automated releases for Taskito using GitHub Actions.

## 📋 Prerequisites

- [x] GitHub repository created
- [x] npm account created at [npmjs.com](https://npmjs.com)
- [x] Code pushed to GitHub

## 🔑 Step 1: Create NPM Access Token

1. **Login to npm:**
   ```bash
   npm login
   ```

2. **Verify organization access:**
   ```bash
   npm org ls particular-labs
   # Should show you as a member with publish permissions
   ```

3. **Create access token:**
   - Go to [npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens)
   - Click "Generate New Token" 
   - Choose "Automation" (for CI/CD)
   - **Important**: Make sure it has permissions to publish to `particular-labs` organization
   - Copy the token (starts with `npm_...`)

## 🔐 Step 2: Add GitHub Secrets

1. **Go to your GitHub repository**
2. **Navigate to:** Settings → Secrets and variables → Actions
3. **Click "New repository secret"**
4. **Add these secrets:**

   | Name | Value | Description |
   |------|-------|-------------|
   | `NPM_TOKEN` | `npm_xxxxxxxxxxxx` | Your npm access token |

## ⚙️ Step 3: Enable GitHub Actions

1. **Go to:** Settings → Actions → General
2. **Set permissions:**
   - ✅ Allow all actions and reusable workflows
   - ✅ Read and write permissions
   - ✅ Allow GitHub Actions to create and approve pull requests

## 🧪 Step 4: Test the Setup

### Test 1: Version Bump Release
```bash
# Clone your repo locally
git clone https://github.com/particular-labs/taskito.git
cd taskito

# Bump version
npm run version:patch

# Commit and push
git add package.json
git commit -m "Bump version to $(npm pkg get version | tr -d '\"')"
git push

# Check GitHub Actions tab - should trigger automatic release!
```

### Test 2: Manual Tag Release  
```bash
# Create and push tag
git tag v1.0.1
git push origin v1.0.1

# Check GitHub Actions - should publish to npm automatically
```

## 📊 Verify Release

After pushing:

1. **Check GitHub Actions:**
   - Go to "Actions" tab in your repo
   - Verify the workflow runs successfully ✅

2. **Check npm publication:**
   - Visit: https://www.npmjs.com/package/@particular-labs/taskito
   - Verify new version appears

3. **Check GitHub Releases:**
   - Go to "Releases" tab in your repo  
   - Verify release was created with changelog

4. **Test installation:**
   ```bash
   npm install -g @particular-labs/taskito@latest
   taskito --version
   ```

## 🔄 Daily Workflow

Once set up, your release workflow is:

```bash
# 1. Develop features normally
git add . && git commit -m "Add cool new feature"
git push  # Just code, no release

# 2. When ready to release
npm run version:minor  # Update version locally
git add package.json
git commit -m "Release v1.1.0"
git push  # Triggers automatic release! 🚀

# 3. Done! ✨
# - GitHub builds and tests
# - Publishes to npm automatically  
# - Creates git tags and GitHub release
# - Users can: npm install -g @particular-labs/taskito@1.1.0
```

## 🚨 Troubleshooting

### "NPM_TOKEN" not found
- Double-check the secret name is exactly `NPM_TOKEN`
- Verify the token starts with `npm_`
- Regenerate token if needed

### Actions permission denied
- Settings → Actions → General → Read and write permissions ✅

### Version already exists on npm
- Bump version in package.json first: `npm run version:patch`
- Or use a different version number

### Build fails
- Check the Actions logs for detailed error messages
- Ensure all dependencies are in package.json
- Verify TypeScript compiles locally: `npm run build`

## 📞 Support

If you encounter issues:
1. Check [GitHub Actions documentation](https://docs.github.com/en/actions)
2. Check [npm token documentation](https://docs.npmjs.com/about-access-tokens)
3. Open an issue in this repository

---

**Once set up, you'll never need to manually publish to npm again! 🎉**