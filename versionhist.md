# Version History

## Resume Scoring - Changelog

All notable changes to this project are documented in this file.

---

### v1.2.0 - 2026-02-09

**UI Alignment Fix**

- Aligned top app bar content (logo, title, Deploy button) with the centered main content area
- Added `.app-bar-inner` wrapper constrained to `max-width: 1280px` matching the `.container` width
- Applied the same alignment fix to the resume detail page header
- App bar background still spans full viewport width while inner content aligns with the main layout

**Files Changed:**
- `public/index.html` - Wrapped header elements in `.app-bar-inner` div
- `public/resume.html` - Wrapped header elements in `.app-bar-inner` div
- `public/css/styles.css` - Moved flex layout from `.top-app-bar` to new `.app-bar-inner` class

**Commit:** `e069d6b` - Align app bar content with centered main content area

---

### v1.1.0 - 2026-02-08

**Deploy Feature**

Added a full deployment system accessible from the application UI, allowing users to deploy the app to local ports, remote servers, or cloud VMs.

**New Features:**
- Deploy button in top-right app header
- Modal popup with three deployment tabs:
  - **Local** - Deploy to another port on the same machine (spawns detached Node.js process)
  - **External** - Deploy to any remote server via SSH/SFTP with password or key authentication
  - **Cloud** - Deploy to cloud VMs (AWS EC2, DigitalOcean, GCP, Azure) via SSH/SFTP
- Real-time deployment progress log with status icons (info/success/error)
- Clickable link to deployed instance on successful deployment
- Modal controls: close via Cancel, X button, overlay click, or Escape key
- Material Design 3 segmented button selector for deployment target
- SSH key auto-detection (checks for `-----BEGIN` prefix)
- Process cleanup on parent server exit (SIGINT handler)
- PATH resolution fix for NVM/nvm-windows environments

**New Dependencies:**
- `node-ssh` v13.2.1 - SSH/SFTP client for remote deployments

**Files Changed:**
- `server.js` - Added `/api/deploy` endpoint, deployment helpers, process cleanup handlers
- `public/index.html` - Added Deploy button and full deploy modal HTML
- `public/js/app.js` - Added modal logic, tab switching, form validation, deploy handler
- `public/css/styles.css` - Added modal, segmented button, deploy form, and deploy log styles
- `package.json` - Added `node-ssh` dependency

**Commit:** `968842c` - Add Deploy button with modal for local, external, and cloud deployment

---

### v1.0.0 - 2026-02-08

**Initial Release**

Complete AI-powered resume scoring application with all core features.

**Features:**
- Job description input (title + description fields)
- Multi-file resume upload (up to 10 files, max 10MB each)
- Supported formats: PDF, DOC, DOCX, TXT, HTML, RTF
- AI-powered resume scoring (0-100) against job descriptions using Claude API
- Automatic candidate name extraction from resume text
- Results dashboard with color-coded score badges (green/orange/red)
- Results sorted by score (highest first)
- Individual resume detail page (opens in new tab)
- AI resume cleaning (fixes typos, grammar, punctuation)
- Side-by-side original vs. cleaned comparison with word-level diff highlighting
- PDF download of cleaned resumes with formatted layout
- Material Design 3 (Material You) responsive interface
- In-memory data storage

**Tech Stack:**
- Node.js + Express backend
- Vanilla HTML/CSS/JavaScript frontend
- Anthropic Claude API (`claude-sonnet-4-20250514`)
- Material Design 3 design system

**Dependencies:**
- `express` v4.21.0 - HTTP server
- `multer` v1.4.5 - File upload handling
- `dotenv` v16.4.5 - Environment variables
- `@anthropic-ai/sdk` v0.39.0 - Claude API client
- `pdf-parse` v1.1.1 - PDF parsing
- `mammoth` v1.8.0 - DOCX parsing
- `word-extractor` v1.0.4 - DOC parsing
- `cheerio` v1.0.0 - HTML/RTF parsing
- `@iarna/rtf-to-html` v1.1.0 - RTF conversion
- `pdfkit` v0.17.2 - PDF generation

**Files:**
- `server.js` - Express server with all API endpoints and Claude integration
- `public/index.html` - Landing page (job input + upload + results)
- `public/resume.html` - Resume detail page (original vs cleaned)
- `public/js/app.js` - Landing page JavaScript logic
- `public/js/resume.js` - Detail page JavaScript logic (clean, diff, download)
- `public/css/styles.css` - Shared Material Design 3 stylesheet
- `package.json` - Project metadata and dependencies
- `.gitignore` - Git ignore rules
- `CLAUDE.md` - Project context documentation

**Commit:** `f8f28aa` - Initial commit: AI-powered resume scoring application

---

### Version Numbering

This project uses semantic versioning (SemVer):
- **MAJOR** (x.0.0) - Breaking changes or major architecture updates
- **MINOR** (0.x.0) - New features and functionality
- **PATCH** (0.0.x) - Bug fixes, UI tweaks, and minor improvements
