# Requirements Specification

## Resume Scoring - API & Database Requirements

---

## Table of Contents

1. [API Requirements](#1-api-requirements)
2. [External API Dependencies](#2-external-api-dependencies)
3. [Database Requirements](#3-database-requirements)
4. [System Dependencies](#4-system-dependencies)
5. [NPM Package Dependencies](#5-npm-package-dependencies)

---

## 1. API Requirements

### Internal REST API Endpoints

The application exposes the following REST API endpoints from `server.js`:

---

#### POST `/api/upload`

Upload and parse resume files.

| Property | Detail |
|----------|--------|
| Content-Type | `multipart/form-data` |
| Field Name | `resumes` |
| Max Files | 10 |
| Max File Size | 10 MB per file |
| Accepted Formats | `.pdf`, `.doc`, `.docx`, `.txt`, `.html`, `.htm`, `.rtf` |

**Request:**
```
POST /api/upload
Content-Type: multipart/form-data

resumes: [file1.pdf, file2.docx, ...]
```

**Response (200):**
```json
{
  "uploaded": [
    {
      "id": "m1abc123def",
      "originalName": "john_doe_resume.pdf",
      "success": true
    },
    {
      "id": "m1xyz789ghi",
      "originalName": "scanned_resume.pdf",
      "success": false,
      "error": "Could not extract sufficient text from file (possibly scanned/image-based)"
    }
  ]
}
```

**Error Responses:**
| Code | Condition |
|------|-----------|
| 400 | No files uploaded |
| 400 | Unsupported file type |
| 400 | File too large (>10MB) |
| 400 | Too many files (>10) |
| 500 | Server error during parsing |

**Behavior:**
- Files are saved to disk temporarily during parsing
- Text is extracted using format-specific parsers
- Files are deleted from disk immediately after extraction
- Resumes with less than 50 characters of extracted text are marked as failed
- Each resume is assigned a unique ID and stored in memory

---

#### POST `/api/process`

Score uploaded resumes against a job description using AI.

| Property | Detail |
|----------|--------|
| Content-Type | `application/json` |
| Processing | Sequential (one resume at a time) |

**Request:**
```json
{
  "resumeIds": ["m1abc123def", "m1xyz789ghi"],
  "jobTitle": "Senior Software Engineer",
  "jobDescription": "We are looking for a senior engineer with 5+ years..."
}
```

**Response (200):**
```json
{
  "results": [
    {
      "id": "m1abc123def",
      "candidateName": "John Doe",
      "score": 85,
      "reasoning": "Strong match with 7 years of relevant experience...",
      "originalName": "john_doe_resume.pdf"
    }
  ]
}
```

**Error Responses:**
| Code | Condition |
|------|-----------|
| 400 | Missing resumeIds, jobTitle, or jobDescription |
| 500 | Claude API error |

**Behavior:**
- Resumes are processed sequentially to avoid API rate limits
- For each resume, two Claude API calls run in parallel: name extraction + scoring
- Resume text is truncated to 50,000 characters for the scoring call
- Results are sorted by score (highest first)

---

#### GET `/api/resume/:id`

Retrieve individual resume data.

**Response (200):**
```json
{
  "id": "m1abc123def",
  "candidateName": "John Doe",
  "originalName": "john_doe_resume.pdf",
  "rawText": "Full resume text...",
  "score": 85,
  "reasoning": "Strong match with relevant experience...",
  "cleanedText": null
}
```

**Error Responses:**
| Code | Condition |
|------|-----------|
| 404 | Resume ID not found |

---

#### POST `/api/resume/:id/clean`

AI-clean a resume (fix typos, grammar, punctuation).

**Response (200):**
```json
{
  "cleanedText": "Cleaned and corrected resume text..."
}
```

**Error Responses:**
| Code | Condition |
|------|-----------|
| 404 | Resume ID not found |
| 500 | Claude API error |

**Behavior:**
- First call triggers AI cleaning and caches the result
- Subsequent calls return the cached result immediately (no additional API call)

---

#### GET `/api/resume/:id/download`

Download the cleaned (or original) resume as a PDF file.

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="cleaned-{name}.pdf"`
- PDF includes candidate name header, section detection, and formatted body text

**Error Responses:**
| Code | Condition |
|------|-----------|
| 404 | Resume ID not found |

---

#### POST `/api/deploy`

Deploy the application to a target environment.

| Property | Detail |
|----------|--------|
| Content-Type | `application/json` |
| Targets | `local`, `external`, `cloud` |

**Request - Local:**
```json
{
  "target": "local",
  "port": 4000
}
```

**Request - External/Cloud:**
```json
{
  "target": "external",
  "host": "192.168.1.100",
  "sshPort": 22,
  "username": "deploy",
  "password": "secret",
  "remotePath": "/home/deploy/app",
  "appPort": 3000
}
```

Or with SSH key:
```json
{
  "target": "cloud",
  "host": "ec2-xx.compute.amazonaws.com",
  "sshPort": 22,
  "username": "ubuntu",
  "privateKey": "-----BEGIN OPENSSH PRIVATE KEY-----\n...",
  "remotePath": "/home/ubuntu/app",
  "appPort": 3000
}
```

**Response (200):**
```json
{
  "success": true,
  "url": "http://localhost:4000",
  "steps": [
    { "message": "Creating deployment directory...", "status": "info" },
    { "message": "Copying project files...", "status": "info" },
    { "message": "Installing dependencies (npm install)...", "status": "info" },
    { "message": "Dependencies installed.", "status": "success" },
    { "message": "Starting server on port 4000...", "status": "info" },
    { "message": "Server started on port 4000.", "status": "success" }
  ]
}
```

**Error Responses:**
| Code | Condition |
|------|-----------|
| 400 | Invalid port (must be 1024-65535) |
| 400 | Missing required fields (host, username, remotePath) |
| 400 | Missing password or SSH key |
| 400 | Invalid target type |
| 500 | Deployment failure (SSH, file copy, npm install, etc.) |

---

## 2. External API Dependencies

### Anthropic Claude API

The application requires the Anthropic Claude API for all AI features.

| Property | Detail |
|----------|--------|
| Provider | [Anthropic](https://www.anthropic.com) |
| Model | `claude-sonnet-4-20250514` |
| SDK | `@anthropic-ai/sdk` (Node.js) |
| Auth | API key via `ANTHROPIC_API_KEY` environment variable |
| Console | [console.anthropic.com](https://console.anthropic.com) |

### API Calls Per Resume

| Operation | API Call | Max Tokens | Input Limit |
|-----------|----------|------------|-------------|
| Name Extraction | `messages.create` | 100 | First 2,000 chars of resume |
| Resume Scoring | `messages.create` | 1,024 | First 50,000 chars of resume + job description |
| Resume Cleaning | `messages.create` | 4,096 | Full resume text |

### Rate Limiting

- Resumes are processed **sequentially** to avoid hitting Anthropic rate limits
- Name extraction and scoring for a single resume run in **parallel** (`Promise.all`)
- Cleaning runs as a separate on-demand call (not batched)

### Estimated API Usage Per Resume

| Operation | Estimated Input Tokens | Estimated Output Tokens |
|-----------|----------------------|------------------------|
| Name Extraction | ~500-600 | ~5-20 |
| Scoring | ~1,000-15,000 | ~100-200 |
| Cleaning | ~500-12,000 | ~500-12,000 |

### Cost Considerations

- Scoring a batch of 10 resumes makes 20 API calls (10 name + 10 score)
- Cleaning is optional and on-demand (1 API call per resume)
- Typical batch of 10 resumes: ~22 API calls total (if all are cleaned)
- Refer to [Anthropic pricing](https://www.anthropic.com/pricing) for current per-token costs

---

## 3. Database Requirements

### Current Implementation: In-Memory Storage

The application currently uses **in-memory storage** with no database. All data is stored in a JavaScript object (`resumeStore`) on the server.

```javascript
const resumeStore = {};
// Structure per resume:
// resumeStore[id] = {
//   id: string,
//   originalName: string,
//   fileType: string,
//   rawText: string,
//   candidateName: string | null,
//   score: number | null,
//   reasoning: string | null,
//   cleanedText: string | null
// }
```

### Data Model

#### Resume Object

| Field | Type | Description | Nullable |
|-------|------|-------------|----------|
| `id` | string | Unique identifier (base36 timestamp + random) | No |
| `originalName` | string | Original uploaded filename | No |
| `fileType` | string | File extension (e.g., `.pdf`, `.docx`) | No |
| `rawText` | string | Extracted plain text from the resume | No |
| `candidateName` | string | AI-extracted candidate name | Yes (until processed) |
| `score` | number | AI-generated score 0-100 | Yes (until processed) |
| `reasoning` | string | AI-generated scoring rationale | Yes (until processed) |
| `cleanedText` | string | AI-cleaned resume text | Yes (until cleaned) |

#### Local Deployments Tracker

```javascript
const localDeployments = {};
// Structure: { [port]: ChildProcess }
```

### Limitations of In-Memory Storage

| Limitation | Impact |
|------------|--------|
| No persistence | All data lost on server restart |
| No scalability | Cannot run multiple server instances (no shared state) |
| Memory bound | Large batches consume server RAM |
| No history | Previous scoring sessions cannot be retrieved |
| No concurrent access | Single-server architecture only |

### Future Database Requirements (If Persistence Is Added)

If the application is upgraded to use a database, the following schema would be needed:

#### Recommended: PostgreSQL

```sql
CREATE TABLE resumes (
    id VARCHAR(20) PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(10) NOT NULL,
    raw_text TEXT NOT NULL,
    candidate_name VARCHAR(255),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    reasoning TEXT,
    cleaned_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scoring_sessions (
    id SERIAL PRIMARY KEY,
    job_title VARCHAR(255) NOT NULL,
    job_description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE session_resumes (
    session_id INTEGER REFERENCES scoring_sessions(id),
    resume_id VARCHAR(20) REFERENCES resumes(id),
    PRIMARY KEY (session_id, resume_id)
);

CREATE INDEX idx_resumes_score ON resumes(score DESC);
CREATE INDEX idx_resumes_created ON resumes(created_at DESC);
```

#### Alternative: MongoDB

```javascript
// resumes collection
{
  _id: String,           // Custom ID
  originalName: String,
  fileType: String,
  rawText: String,
  candidateName: String,
  score: Number,
  reasoning: String,
  cleanedText: String,
  sessionId: ObjectId,
  createdAt: Date,
  updatedAt: Date
}

// sessions collection
{
  _id: ObjectId,
  jobTitle: String,
  jobDescription: String,
  resumeIds: [String],
  createdAt: Date
}
```

---

## 4. System Dependencies

### Runtime Requirements

| Dependency | Minimum Version | Purpose |
|------------|----------------|---------|
| Node.js | v18.0.0 | JavaScript runtime |
| npm | v9.0.0 | Package manager |

### Operating System Support

| OS | Status | Notes |
|----|--------|-------|
| Windows 10/11 | Supported | NVM-windows compatible; PATH resolution handled |
| macOS | Supported | Native Node.js or NVM |
| Linux (Ubuntu/Debian) | Supported | Primary deployment target for remote/cloud |
| Linux (RHEL/CentOS) | Supported | Use `ec2-user` for AWS deployments |

### Network Requirements

| Service | Port | Protocol | Direction |
|---------|------|----------|-----------|
| Application | Configurable (default 3000) | HTTP | Inbound |
| Anthropic API | 443 | HTTPS | Outbound |
| SSH (deployment) | Configurable (default 22) | TCP | Outbound |

---

## 5. NPM Package Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.21.0 | HTTP server framework |
| `multer` | ^1.4.5-lts.1 | Multipart file upload handling |
| `dotenv` | ^16.4.5 | Environment variable loading from `.env` |
| `@anthropic-ai/sdk` | ^0.39.0 | Anthropic Claude API client |
| `pdf-parse` | ^1.1.1 | PDF text extraction |
| `mammoth` | ^1.8.0 | DOCX text extraction |
| `word-extractor` | ^1.0.4 | Legacy .doc file text extraction |
| `cheerio` | ^1.0.0 | HTML parsing and text extraction |
| `@iarna/rtf-to-html` | ^1.1.0 | RTF to HTML conversion |
| `pdfkit` | ^0.17.2 | PDF generation for resume download |
| `node-ssh` | ^13.2.1 | SSH/SFTP client for remote deployment |

### Built-in Node.js Modules Used

| Module | Purpose |
|--------|---------|
| `fs` | File system operations (read, write, copy, delete) |
| `path` | File path manipulation |
| `os` | OS temp directory, platform detection |
| `child_process` | `exec` and `spawn` for local deployment |

### No Dev Dependencies

The project currently has no development-only dependencies. The `npm run dev` script uses Node.js built-in `--watch` flag (available in Node.js v18.11+).

---

## API Authentication Summary

| API | Auth Method | Where Configured |
|-----|------------|-----------------|
| Anthropic Claude | API Key (Bearer) | `ANTHROPIC_API_KEY` in `.env` |
| Internal REST API | None (open) | No auth required |
| SSH Deployment | Password or SSH Key | Entered per-request in Deploy modal |

> **Note:** The internal API has no authentication. It is designed for use on a trusted local network or behind a reverse proxy with authentication. For production deployment with public access, add authentication middleware (e.g., JWT, session-based, or API key auth).
