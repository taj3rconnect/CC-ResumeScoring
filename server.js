require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk').default;
const PDFDocument = require('pdfkit');

// Document parsers
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const WordExtractor = require('word-extractor');
const cheerio = require('cheerio');
const rtfToHTML = require('@iarna/rtf-to-html');
const { NodeSSH } = require('node-ssh');
const { exec, spawn } = require('child_process');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// In-memory store for processed resumes
const resumeStore = {};

// Track locally deployed instances: { port: childProcess }
const localDeployments = {};

// --- Multer configuration ---

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.html', '.htm', '.rtf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${ext}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// --- Text extraction ---

async function extractText(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  switch (ext) {
    case '.pdf': {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text;
    }
    case '.docx': {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }
    case '.doc': {
      const extractor = new WordExtractor();
      const doc = await extractor.extract(filePath);
      return doc.getBody();
    }
    case '.txt': {
      return fs.readFileSync(filePath, 'utf-8');
    }
    case '.html':
    case '.htm': {
      const html = fs.readFileSync(filePath, 'utf-8');
      const $ = cheerio.load(html);
      $('script, style').remove();
      return $('body').text().replace(/\s+/g, ' ').trim();
    }
    case '.rtf': {
      return new Promise((resolve, reject) => {
        const rtfContent = fs.readFileSync(filePath, 'utf-8');
        rtfToHTML.fromString(rtfContent, (err, html) => {
          if (err) return reject(err);
          const $ = cheerio.load(html);
          resolve($('body').text().replace(/\s+/g, ' ').trim());
        });
      });
    }
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

// --- Claude API functions ---

async function extractCandidateName(resumeText) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: `Extract the candidate's full name from this resume. Return ONLY the name, nothing else. If you cannot determine the name, return "Unknown Candidate".\n\nResume text:\n${resumeText.substring(0, 2000)}`,
      },
    ],
  });
  return message.content[0].text.trim();
}

async function scoreResume(resumeText, jobTitle, jobDescription) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are an expert recruiter and resume evaluator. Score the following resume against the provided job description.

Job Title: ${jobTitle}

Job Description:
${jobDescription}

Resume:
${resumeText.substring(0, 50000)}

Respond in EXACTLY this JSON format (no markdown, no code blocks):
{
  "score": <number 0-100>,
  "reasoning": "<2-4 sentences explaining the score>"
}

Score criteria:
- 90-100: Excellent match, meets nearly all requirements
- 70-89: Strong match, meets most key requirements
- 50-69: Moderate match, meets some requirements
- 30-49: Weak match, meets few requirements
- 0-29: Poor match, does not align with the role`,
      },
    ],
  });

  const responseText = message.content[0].text.trim();
  try {
    return JSON.parse(responseText);
  } catch {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return { score: 0, reasoning: 'Failed to parse AI response.' };
  }
}

async function cleanResumeText(resumeText) {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `You are a professional resume editor. Clean the following resume text by:
1. Fixing all spelling errors and typos
2. Correcting grammar and punctuation
3. Improving sentence structure where needed
4. Maintaining the original content, meaning, and formatting structure
5. Do NOT add new information or remove existing content
6. Keep section headers, dates, and factual details exactly as they are

Return ONLY the cleaned resume text, nothing else (no preamble, no explanation).

Resume text:
${resumeText}`,
      },
    ],
  });
  return message.content[0].text.trim();
}

// --- API Endpoints ---

// Upload resumes
app.post('/api/upload', upload.array('resumes', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];
    for (const file of req.files) {
      const id =
        Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      try {
        const rawText = await extractText(file.path, file.originalname);

        if (!rawText || rawText.trim().length < 50) {
          results.push({
            id,
            originalName: file.originalname,
            success: false,
            error: 'Could not extract sufficient text from file (possibly scanned/image-based)',
          });
          continue;
        }

        resumeStore[id] = {
          id,
          originalName: file.originalname,
          fileType: path.extname(file.originalname).toLowerCase(),
          rawText,
          candidateName: null,
          score: null,
          reasoning: null,
          cleanedText: null,
        };
        results.push({ id, originalName: file.originalname, success: true });
      } catch (err) {
        results.push({
          id,
          originalName: file.originalname,
          success: false,
          error: err.message,
        });
      } finally {
        fs.unlink(file.path, () => {});
      }
    }

    res.json({ uploaded: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Process resumes (score against job description)
app.post('/api/process', express.json(), async (req, res) => {
  try {
    const { resumeIds, jobTitle, jobDescription } = req.body;

    if (!resumeIds || !jobTitle || !jobDescription) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const results = [];

    for (const id of resumeIds) {
      const resume = resumeStore[id];
      if (!resume) {
        results.push({ id, error: 'Resume not found' });
        continue;
      }

      try {
        const [candidateName, scoreResult] = await Promise.all([
          extractCandidateName(resume.rawText),
          scoreResume(resume.rawText, jobTitle, jobDescription),
        ]);

        resume.candidateName = candidateName;
        resume.score = scoreResult.score;
        resume.reasoning = scoreResult.reasoning;

        results.push({
          id: resume.id,
          candidateName: resume.candidateName,
          score: resume.score,
          reasoning: resume.reasoning,
          originalName: resume.originalName,
        });
      } catch (err) {
        results.push({ id, originalName: resume.originalName, error: err.message });
      }
    }

    results.sort((a, b) => (b.score || 0) - (a.score || 0));
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get resume details
app.get('/api/resume/:id', (req, res) => {
  const resume = resumeStore[req.params.id];
  if (!resume) {
    return res.status(404).json({ error: 'Resume not found' });
  }
  res.json({
    id: resume.id,
    candidateName: resume.candidateName,
    originalName: resume.originalName,
    rawText: resume.rawText,
    score: resume.score,
    reasoning: resume.reasoning,
    cleanedText: resume.cleanedText,
  });
});

// Clean resume
app.post('/api/resume/:id/clean', async (req, res) => {
  try {
    const resume = resumeStore[req.params.id];
    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    if (resume.cleanedText) {
      return res.json({ cleanedText: resume.cleanedText });
    }

    const cleanedText = await cleanResumeText(resume.rawText);
    resume.cleanedText = cleanedText;
    res.json({ cleanedText });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download cleaned resume as PDF
app.get('/api/resume/:id/download', (req, res) => {
  const resume = resumeStore[req.params.id];
  if (!resume) {
    return res.status(404).json({ error: 'Resume not found' });
  }

  const textToDownload = resume.cleanedText || resume.rawText;
  const filename = `cleaned-${resume.originalName.replace(/\.[^/.]+$/, '')}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);

  // Header: candidate name
  if (resume.candidateName) {
    doc.fontSize(20).font('Helvetica-Bold').text(resume.candidateName, { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(0.5);
  }

  // Resume body
  const lines = textToDownload.split('\n');
  doc.fontSize(11).font('Helvetica').fillColor('#1e293b');

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect section headers (all caps lines or lines ending with colon)
    const isHeader = (trimmed.length > 0 && trimmed.length < 60 &&
      (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) ||
      /^[A-Z][A-Za-z\s&\/]+:$/.test(trimmed));

    if (isHeader) {
      doc.moveDown(0.3);
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#2563eb').text(trimmed);
      doc.moveDown(0.2);
      doc.fontSize(11).font('Helvetica').fillColor('#1e293b');
    } else if (trimmed === '') {
      doc.moveDown(0.4);
    } else {
      doc.text(line);
    }
  }

  doc.end();
});

// --- Deploy helpers ---

function getProjectFiles(baseDir) {
  const entries = [];
  const ignored = ['node_modules', 'uploads', '.git', '.env', '.claude'];

  function walk(dir, relative) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (ignored.includes(item.name)) continue;
      const fullPath = path.join(dir, item.name);
      const relPath = path.join(relative, item.name);
      if (item.isDirectory()) {
        walk(fullPath, relPath);
      } else {
        entries.push({ fullPath, relPath });
      }
    }
  }

  walk(baseDir, '');
  return entries;
}

// Get the directory containing the current node executable so npm is also found
const nodeDir = path.dirname(process.execPath);
const deployEnvPath = nodeDir + (process.platform === 'win32' ? ';' : ':') + (process.env.PATH || '');

function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd, timeout: 120000, env: { ...process.env, PATH: deployEnvPath } }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr || error.message));
      else resolve(stdout);
    });
  });
}

// Deploy endpoint
app.post('/api/deploy', express.json(), async (req, res) => {
  const { target } = req.body;
  const steps = [];

  try {
    if (target === 'local') {
      // --- LOCAL DEPLOYMENT ---
      const { port } = req.body;
      if (!port || port < 1024 || port > 65535) {
        return res.status(400).json({ error: 'Invalid port (1024-65535)' });
      }

      // Kill previous deployment on this port if any
      if (localDeployments[port]) {
        try { localDeployments[port].kill(); } catch (e) { /* ignore */ }
        delete localDeployments[port];
      }

      steps.push({ message: 'Creating deployment directory...', status: 'info' });

      const tmpDir = path.join(os.tmpdir(), `resume-scoring-deploy-${port}`);
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tmpDir, { recursive: true });

      // Copy project files
      steps.push({ message: 'Copying project files...', status: 'info' });
      const files = getProjectFiles(__dirname);
      for (const file of files) {
        const destPath = path.join(tmpDir, file.relPath);
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(file.fullPath, destPath);
      }

      // Copy .env with overridden PORT
      const envPath = path.join(__dirname, '.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf-8');
        envContent = envContent.replace(/^PORT=.*/m, `PORT=${port}`);
        if (!/^PORT=/m.test(envContent)) {
          envContent += `\nPORT=${port}`;
        }
        fs.writeFileSync(path.join(tmpDir, '.env'), envContent);
      }

      // Install dependencies
      steps.push({ message: 'Installing dependencies (npm install)...', status: 'info' });
      await runCommand('npm install --production', tmpDir);
      steps.push({ message: 'Dependencies installed.', status: 'success' });

      // Start server process
      steps.push({ message: `Starting server on port ${port}...`, status: 'info' });

      // Find node executable path
      const nodePath = process.execPath;
      const child = spawn(nodePath, ['server.js'], {
        cwd: tmpDir,
        detached: true,
        stdio: 'ignore',
        env: { ...process.env, PORT: String(port) },
      });
      child.unref();
      localDeployments[port] = child;

      // Wait for server to start
      await new Promise((resolve) => setTimeout(resolve, 2500));

      steps.push({ message: `Server started on port ${port}.`, status: 'success' });

      const url = `http://localhost:${port}`;
      res.json({ success: true, url, steps });

    } else if (target === 'external' || target === 'cloud') {
      // --- REMOTE DEPLOYMENT (SSH) ---
      const { host, sshPort, username, password, privateKey, remotePath, appPort } = req.body;

      if (!host || !username || !remotePath) {
        return res.status(400).json({ error: 'Missing required fields: host, username, remotePath' });
      }
      if (!password && !privateKey) {
        return res.status(400).json({ error: 'Password or SSH private key is required' });
      }

      const ssh = new NodeSSH();

      steps.push({ message: `Connecting to ${host}:${sshPort || 22}...`, status: 'info' });

      const connectConfig = {
        host,
        port: sshPort || 22,
        username,
        tryKeyboard: true,
      };
      if (privateKey) {
        connectConfig.privateKey = privateKey;
      } else {
        connectConfig.password = password;
      }

      await ssh.connect(connectConfig);
      steps.push({ message: 'SSH connection established.', status: 'success' });

      // Create remote directory
      steps.push({ message: `Creating remote directory: ${remotePath}...`, status: 'info' });
      await ssh.execCommand(`mkdir -p ${remotePath}`);

      // Upload project files
      steps.push({ message: 'Uploading project files via SFTP...', status: 'info' });
      const files = getProjectFiles(__dirname);

      // Create remote subdirectories
      const remoteDirs = new Set();
      for (const file of files) {
        const remoteDir = path.posix.join(remotePath, path.dirname(file.relPath).replace(/\\/g, '/'));
        if (remoteDir !== remotePath) remoteDirs.add(remoteDir);
      }
      for (const dir of remoteDirs) {
        await ssh.execCommand(`mkdir -p ${dir}`);
      }

      // Upload files
      for (const file of files) {
        const remoteFilePath = path.posix.join(remotePath, file.relPath.replace(/\\/g, '/'));
        await ssh.putFile(file.fullPath, remoteFilePath);
      }
      steps.push({ message: `${files.length} files uploaded.`, status: 'success' });

      // Upload .env with target port
      const envPath = path.join(__dirname, '.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf-8');
        envContent = envContent.replace(/^PORT=.*/m, `PORT=${appPort || 3000}`);
        if (!/^PORT=/m.test(envContent)) {
          envContent += `\nPORT=${appPort || 3000}`;
        }
        const tmpEnv = path.join(os.tmpdir(), `.env-deploy-${Date.now()}`);
        fs.writeFileSync(tmpEnv, envContent);
        await ssh.putFile(tmpEnv, path.posix.join(remotePath, '.env'));
        fs.unlinkSync(tmpEnv);
      }

      // Install dependencies on remote
      steps.push({ message: 'Running npm install on remote server...', status: 'info' });
      const installResult = await ssh.execCommand('npm install --production', { cwd: remotePath });
      if (installResult.code !== 0 && installResult.stderr) {
        steps.push({ message: `npm install warning: ${installResult.stderr.substring(0, 200)}`, status: 'info' });
      }
      steps.push({ message: 'Dependencies installed on remote.', status: 'success' });

      // Stop any existing process on the target port
      steps.push({ message: 'Stopping any existing process on target port...', status: 'info' });
      await ssh.execCommand(`lsof -ti:${appPort || 3000} | xargs kill -9 2>/dev/null || true`);

      // Start server on remote
      steps.push({ message: `Starting server on remote port ${appPort || 3000}...`, status: 'info' });
      await ssh.execCommand(
        `cd ${remotePath} && nohup node server.js > /dev/null 2>&1 &`,
        { cwd: remotePath }
      );

      steps.push({ message: 'Remote server started.', status: 'success' });

      ssh.dispose();

      const url = `http://${host}:${appPort || 3000}`;
      res.json({ success: true, url, steps });

    } else {
      return res.status(400).json({ error: 'Invalid deployment target. Use: local, external, or cloud.' });
    }
  } catch (err) {
    steps.push({ message: `Error: ${err.message}`, status: 'error' });
    res.status(500).json({ error: err.message, steps });
  }
});

// Clean up local deployments on exit
process.on('exit', () => {
  Object.values(localDeployments).forEach((child) => {
    try { child.kill(); } catch (e) { /* ignore */ }
  });
});

process.on('SIGINT', () => {
  Object.values(localDeployments).forEach((child) => {
    try { child.kill(); } catch (e) { /* ignore */ }
  });
  process.exit();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Error handling for multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Maximum 10 files allowed' });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 10MB)' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Resume Scoring app running at http://localhost:${PORT}`);
});
