# Product Requirements Document (PRD)

## Resume Scoring - AI-Powered Candidate Evaluation Platform

---

### 1. Product Overview

Resume Scoring is a web-based application that enables recruiters and hiring managers to evaluate candidate resumes against specific job descriptions using artificial intelligence. The system provides objective, consistent scoring on a 0-100 scale, extracts candidate names automatically, and offers AI-powered resume cleaning to fix typos, grammar, and punctuation issues.

### 2. Problem Statement

Manual resume screening is time-consuming, inconsistent, and prone to human bias. Recruiters often spend 6-7 seconds per resume in an initial scan, leading to qualified candidates being overlooked. Resume Scoring automates the initial evaluation process to provide data-driven, consistent assessments across all candidates.

### 3. Target Users

| User Type | Description |
|-----------|-------------|
| **Recruiters** | Review high volumes of resumes daily and need to quickly identify top candidates |
| **Hiring Managers** | Evaluate resumes against specific technical and role requirements |
| **HR Teams** | Standardize the initial screening process across departments |
| **Small Businesses** | Organizations without dedicated recruiting staff who need efficient hiring tools |

### 4. Core Features

#### 4.1 Job Description Input
- **Job Title Field** - Free-text input for the position title
- **Job Description Field** - Large text area for the full job description including responsibilities, requirements, and qualifications
- Helper text guides users to include all key requirements for better scoring accuracy

#### 4.2 Resume Upload
- **Multi-file upload** supporting up to 10 resumes per batch
- **Drag-and-drop** area with click-to-browse fallback
- **Supported formats**: PDF, DOC, DOCX, TXT, HTML, RTF
- **File size limit**: 10MB per file
- Individual file removal before upload
- Visual file list showing name, size, and remove button
- Real-time upload status feedback

#### 4.3 AI-Powered Scoring
- Each resume is scored 0-100 against the provided job description
- **Scoring criteria**:
  - 90-100: Excellent match, meets nearly all requirements
  - 70-89: Strong match, meets most key requirements
  - 50-69: Moderate match, meets some requirements
  - 30-49: Weak match, meets few requirements
  - 0-29: Poor match, does not align with the role
- Automatic candidate name extraction from resume text
- 2-4 sentence scoring rationale explaining the assessment
- Results sorted by score (highest first)

#### 4.4 Results Dashboard
- Color-coded score badges (green >= 70, orange >= 50, red < 50)
- Candidate name and source filename displayed
- Scoring rationale visible on each card
- Click-to-open individual resume detail in new tab

#### 4.5 Resume Detail View
- Full original resume text displayed in scrollable panel
- Scoring rationale shown in action bar
- Score displayed in header

#### 4.6 AI Resume Cleaning
- One-click AI cleaning that fixes:
  - Spelling errors and typos
  - Grammar and punctuation issues
  - Sentence structure improvements
- Original content, meaning, and structure preserved
- Side-by-side comparison (original left, cleaned right)
- Word-level diff highlighting:
  - Green background = added/changed text
  - Red strikethrough = removed text
- Cached results (cleaning only runs once per resume)

#### 4.7 Resume Download
- Download cleaned resume as PDF
- PDF includes:
  - Candidate name as header
  - Section header detection (all-caps lines styled differently)
  - Clean typography with proper font sizing and spacing

#### 4.8 Application Deployment
- Built-in Deploy button in the app header
- Modal popup with three deployment targets:
  - **Local** - Deploy to another port on the same machine
  - **External** - Deploy to any remote server via SSH/SFTP
  - **Cloud** - Deploy to cloud VMs (AWS EC2, DigitalOcean, GCP, Azure)
- Real-time deployment progress log
- Clickable link to deployed instance on success

### 5. Non-Functional Requirements

| Requirement | Specification |
|-------------|--------------|
| **Performance** | Sequential resume processing to respect API rate limits |
| **Resume text limit** | 50,000 characters per resume for scoring API calls |
| **File size limit** | 10MB per uploaded file |
| **Batch limit** | Maximum 10 resumes per upload batch |
| **Responsiveness** | Fully responsive UI down to mobile breakpoint (900px) |
| **Browser support** | Modern browsers (Chrome, Firefox, Safari, Edge) |
| **Accessibility** | Material Design 3 component patterns with proper labels |

### 6. Technical Constraints

- **In-memory storage only** - All data is lost when the server restarts. No database persistence.
- **Scanned PDFs** - Image-based/scanned PDFs will fail text extraction (OCR not supported)
- **Format fidelity** - Original PDF/DOCX formatting is lost during text extraction; downloads are regenerated as PDF
- **API dependency** - Requires active Anthropic API key with sufficient credits
- **Sequential processing** - Resumes are processed one at a time to avoid Claude API rate limits

### 7. Security Considerations

- SSH credentials for deployment are transient (used for the request only, never stored)
- `.env` file containing API keys is excluded from git and deployment file copies
- Uploaded resume files are deleted from disk immediately after text extraction
- No user authentication system (designed for internal/trusted network use)

### 8. Future Considerations

- Database persistence (PostgreSQL/MongoDB) for resume history
- User authentication and role-based access
- Batch processing with parallel API calls
- OCR support for scanned PDFs
- Resume template generation
- Email notifications for completed batch processing
- Export results to CSV/Excel
- Multiple job description comparison per candidate
