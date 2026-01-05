# Avocado Chemical & MRL Search — Static Prototype

What this is
- A static website that lets growers search chemicals, view targets and registration holder, and download the full list as CSV or PDF.
- Site reads the CSV placed at `data/Avocado registred Chemicals.csv` by default.
- Client-side Excel upload is supported (for local testing only).

Quick start (local)
1. Put these files in a folder:
   - index.html
   - styles.css
   - app.js
   - data/Avocado registred Chemicals.csv
2. Serve locally so that fetch() can load CSV:
   - Python 3: `python -m http.server 8000`
   - Open `http://localhost:8000` in the browser.

How to keep yourself as the only person who can change the master dataset
- Preferred (most secure & simple): DO NOT include the master Excel in the repository. Keep the Excel on your machine. When you want to update the website:
  1. Save the Excel as CSV (or run `convert_excel.py` below) and replace `data/Avocado registred Chemicals.csv`.
  2. Commit & push the change from your machine only. If your GitHub repo is private and only your account can push, you remain the only editor.
- GitHub recommendations:
  - Make the repo private.
  - Only add collaborators you trust.
  - Use branch protection rules & required PR review for extra safety.

Optional: Convert Excel -> CSV script
- `convert_excel.py` (requires pandas and openpyxl). Example usage:
  - `pip install pandas openpyxl`
  - `python convert_excel.py "YourExcelFile.xlsx"`

Publishing to GitHub (recommended)
Option A — using GitHub CLI (fast)
1. Install Git + GitHub CLI (`gh`) and authenticate: `gh auth login`
2. From the project folder:
   - `git init`
   - `git add .`
   - `git commit -m "Initial commit: Avocado Chemical static site"`
   - `gh repo create <owner>/<repo> --private --source=. --remote=origin --push`
   - After the repo exists, enable Pages in the repo settings: choose branch `main` (or `master`) and folder `/ (root)`. GitHub will provide the site URL.

Option B — manual (GitHub web UI)
1. Create a new repository on GitHub (set to private if you prefer).
2. Follow the "push an existing repository from the command line" instructions GitHub shows after repo creation:
   - `git init`
   - `git add .`
   - `git commit -m "Initial commit: Avocado Chemical static site"`
   - `git remote add origin https://github.com/<owner>/<repo>.git`
   - `git branch -M main`
   - `git push -u origin main`
3. Enable GitHub Pages in repo Settings → Pages: select branch `main` and folder `/ (root)`.

Notes
- If you want me to push these files for you, tell me the repository name and whether it's under your account or an organization (I will need the repo path). If you prefer to keep the repo private and be the only editor, create the private repo in your account and then push the files using the steps above.
- Sorting and extra filters can be added later; the code has clear locations where sorting can be implemented client-side.
