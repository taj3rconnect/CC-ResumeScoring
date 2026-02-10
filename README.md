# Resume Scoring

AI-powered web application that helps recruiters and hiring managers evaluate candidate resumes against specific job descriptions. Built with Node.js, Express, and the Anthropic Claude API.

## Features

- **AI Resume Scoring** - Score resumes 0-100 against any job description with detailed rationale
- **Multi-format Support** - Upload PDF, DOC, DOCX, TXT, HTML, and RTF files
- **Batch Processing** - Evaluate up to 10 resumes simultaneously
- **Candidate Name Extraction** - Automatically identifies candidate names from resume text
- **AI Resume Cleaning** - Fix typos, grammar, and punctuation with one click
- **Side-by-Side Diff** - Word-level comparison of original vs. cleaned resume
- **PDF Download** - Export cleaned resumes as formatted PDF files
- **Built-in Deployment** - Deploy to local ports, remote servers, or cloud VMs directly from the UI

## Screenshots

The application features a Material Design 3 interface with:
- Two-column layout for job details and resume upload
- Color-coded score badges (green/orange/red)
- Detail page with original and cleaned resume side-by-side
- Deploy modal with Local/External/Cloud tabs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Frontend | Vanilla HTML, CSS, JavaScript |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) |
| Design | Material Design 3 (Material You) |
| Storage | In-memory (no database) |

## Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- **Anthropic API Key** from [console.anthropic.com](https://console.anthropic.com)

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/taj3rconnect/CC-ResumeScoring.git
   cd CC-ResumeScoring
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create environment file**

   Create a `.env` file in the project root:

   ```env
   ANTHROPIC_API_KEY=your-api-key-here
   PORT=3000
   ```

4. **Start the server**

   ```bash
   npm start
   ```

   Or with auto-restart on file changes:

   ```bash
   npm run dev
   ```

5. **Open the application**

   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Scoring Resumes

1. Enter the **Job Title** and full **Job Description** in the left panel
2. Click **Browse Files** or drag and drop up to 10 resume files
3. Click **Upload** to parse the files
4. Click **Process with AI** to score all resumes against the job description
5. Results appear sorted by score (highest first) with color-coded badges
6. Click any result card to open the detailed resume view in a new tab

### Cleaning a Resume

1. From the results, click a candidate card to open the detail page
2. Click the **Clean** button in the action bar
3. The AI will fix typos, grammar, and punctuation
4. A side-by-side view shows the original (left) and cleaned (right) versions
5. Word-level differences are highlighted in green (added) and red (removed)
6. Click **Download PDF** to export the cleaned resume

### Deploying the Application

1. Click the **Deploy** button in the top-right header
2. Select a deployment target: **Local**, **External**, or **Cloud**
3. Fill in the required fields (port for local, SSH credentials for remote)
4. Click **Deploy** and monitor the real-time progress log
5. On success, click the link to open the deployed instance

## Project Structure

```
resume-scoring/
├── server.js              # Express server, API endpoints, Claude integration
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (not committed)
├── .gitignore             # Git ignore rules
├── CLAUDE.md              # Project context for AI assistants
├── PRD.md                 # Product Requirements Document
├── README.md              # This file
├── DEPLOY.md              # Deployment instructions
├── REQUIREMENTS.md        # API and database requirements
└── public/
    ├── index.html         # Landing page (job input + upload + results)
    ├── resume.html        # Resume detail page (original vs cleaned)
    ├── css/
    │   └── styles.css     # Shared Material Design 3 styles
    └── js/
        ├── app.js         # Landing page logic (upload, process, deploy)
        └── resume.js      # Detail page logic (clean, diff, download)
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | - | API key from Anthropic Console |
| `PORT` | No | 3000 | Server port number |

## Limitations

- **No persistence** - Data is stored in memory and lost on server restart
- **Max 10 resumes** per batch upload
- **Max 10MB** per file
- **Scanned PDFs** - Image-based PDFs cannot be parsed (no OCR)
- **Resume text** truncated to 50,000 characters for scoring
- **Sequential processing** - Resumes scored one at a time to avoid rate limits
- **Format loss** - Original PDF/DOCX formatting is not preserved during extraction

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the production server |
| `npm run dev` | Start with file watching (auto-restart) |

## License

This project is proprietary software. All rights reserved.

## Repository

[https://github.com/taj3rconnect/CC-ResumeScoring](https://github.com/taj3rconnect/CC-ResumeScoring)
