# Feature Enhancements

## High Priority (Core Product Gaps)

### Feature: Job Description Templates/Library
**Why:** Recruiters evaluate the same role repeatedly. Let them save and reuse JDs instead of pasting every time.

---

### Feature: Batch History & Dashboard
**Why:** Show past scoring sessions with date, role, and candidate count. Currently everything vanishes on page refresh.

---

### Feature: Export Results
**Why:** No way to share results. Add CSV/Excel/PDF export of the scored candidate list with scores and reasoning.

---

### Feature: Weighted Scoring Criteria
**Why:** The prompt uses a single generic rubric. Let users define must-have vs nice-to-have skills so scoring reflects their actual priorities.

---

### Feature: Candidate Comparison View
**Why:** Side-by-side comparison of 2-3 candidates against the same JD, highlighting where each excels or falls short.

## Medium Priority (UX & Workflow)

### Feature: Drag-and-drop reorder/removal after upload
**Why:** Currently files can only be removed before upload. After upload, there's no way to exclude a bad parse.

---

### Feature: Progress indicator per resume
**Why:** The UI just shows "Processing..." with no indication of which resume is being scored. A per-resume progress bar would reduce perceived wait time.

---

### Feature: Score breakdown sub-categories
**Why:** Instead of one 0-100 number, show sub-scores: Skills Match, Experience Level, Education, Culture Fit. The AI can return this with a prompt change.

---

### Feature: Dark mode
**Why:** The CSS already uses design tokens (--md-*), making theme switching straightforward.

---

### Feature: Keyboard shortcuts
**Why:** No keyboard navigation. Tab-through and Enter-to-submit would help power users.

## Lower Priority (Growth & Scale)

### Feature: Multi-user with roles
**Why:** Admin (manages JDs), Recruiter (uploads/scores), Hiring Manager (read-only view). Currently single-user only.

---

### Feature: ATS integration
**Why:** Webhook/API to pull candidates from Greenhouse, Lever, Workday instead of manual file uploads.

---

### Feature: Bulk re-score
**Why:** When a JD changes, re-score all previously uploaded candidates against the new version.

---

### Feature: Audit trail
**Why:** Log who scored what, when, and with which JD version. Important for compliance (EEOC, GDPR).

---

### Feature: Candidate de-duplication
**Why:** Detect when the same person's resume is uploaded twice (by name or content hash).

---

## Quick Wins (Low Effort, High Impact)

1. **API key validation on startup** — server.js silently starts with no key; add a check at boot that fails fast with a clear error message
2. **Helmet.js** — one npm install to add security headers (XSS, clickjacking, MIME sniffing protection)
3. **CORS configuration** — currently wide open via express.static
4. **Request size limits** — express.json() has no body size limit on /api/process and /api/deploy
5. **Structured logging** — console.log is the only logging; add winston or pino for structured logs with levels

---

## Summary Prioritization

| Priority   | Action                                                                           |
|------------|----------------------------------------------------------------------------------|
| P0 - Now   | Add auth gate, API key validation on startup, rate limiting, request size limits |
| P1 - Next  | Add database (SQLite), batch history, CSV export, per-resume progress            |
| P2 - Soon  | Weighted scoring criteria, score sub-categories, candidate comparison            |
| P3 - Later | Multi-user roles, ATS integrations, audit trail, dark mode                       |
