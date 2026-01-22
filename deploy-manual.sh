#!/bin/bash
# Manual deployment script for GitHub Pages

set -e

echo "Building the app..."
npm run build

echo "Creating gh-pages branch..."
git checkout --orphan gh-pages
git rm -rf --cached .

echo "Adding build files..."
cp -r build/* .
git add .

echo "Committing..."
git commit -m "Deploy to GitHub Pages"

echo "Pushing to GitHub..."
git push origin gh-pages --force

echo "Switching back to main..."
git checkout main

echo "Deployment complete! Your site will be available at:"
echo "https://conscius-inc.github.io/animation-test"
echo ""
echo "Note: It may take a few minutes for GitHub Pages to update."

