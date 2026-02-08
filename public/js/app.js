// --- State ---
let selectedFiles = [];
let uploadedResumeIds = [];

// --- DOM references ---
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const fileListEl = document.getElementById('fileList');
const uploadBtn = document.getElementById('uploadBtn');
const uploadStatus = document.getElementById('uploadStatus');
const processBtn = document.getElementById('processBtn');
const processStatus = document.getElementById('processStatus');
const resultsSection = document.getElementById('resultsSection');
const resultsContainer = document.getElementById('resultsContainer');

// --- Utility ---
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function setStatus(el, message, type) {
  el.textContent = message;
  el.className = 'status-message' + (type ? ' ' + type : '');
}

// --- Browse ---
browseBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  if (files.length > 10) {
    alert('Maximum 10 files allowed. Please select fewer files.');
    fileInput.value = '';
    return;
  }
  selectedFiles = files;
  renderFileList();
  uploadBtn.disabled = false;
  setStatus(uploadStatus, '');
});

function renderFileList() {
  if (selectedFiles.length === 0) {
    fileListEl.innerHTML = '';
    return;
  }

  fileListEl.innerHTML = selectedFiles
    .map(
      (file, i) => `
    <div class="file-item">
      <span class="material-symbols-rounded file-icon">description</span>
      <span class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
      <span class="file-size">${formatFileSize(file.size)}</span>
      <button class="remove-btn" onclick="removeFile(${i})" title="Remove">
        <span class="material-symbols-rounded" style="font-size:18px;">close</span>
      </button>
    </div>
  `
    )
    .join('');
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderFileList();
  if (selectedFiles.length === 0) {
    uploadBtn.disabled = true;
    fileInput.value = '';
  }
}

// --- Upload ---
uploadBtn.addEventListener('click', async () => {
  if (selectedFiles.length === 0) return;

  uploadBtn.disabled = true;
  uploadBtn.innerHTML = '<span class="spinner"></span> Uploading...';
  setStatus(uploadStatus, 'Uploading and parsing files...');

  const formData = new FormData();
  selectedFiles.forEach((file) => formData.append('resumes', file));

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error);

    uploadedResumeIds = data.uploaded.filter((r) => r.success).map((r) => r.id);

    const failures = data.uploaded.filter((r) => !r.success);
    let statusMsg = `${uploadedResumeIds.length} file(s) uploaded successfully.`;
    if (failures.length > 0) {
      statusMsg += ` ${failures.length} failed: ${failures.map((f) => f.originalName).join(', ')}`;
    }

    setStatus(uploadStatus, statusMsg, 'success');
    processBtn.disabled = uploadedResumeIds.length === 0;
  } catch (err) {
    setStatus(uploadStatus, `Upload failed: ${err.message}`, 'error');
  } finally {
    uploadBtn.innerHTML = '<span class="material-symbols-rounded">cloud_upload</span> Upload';
    uploadBtn.disabled = false;
  }
});

// --- Process ---
processBtn.addEventListener('click', async () => {
  const jobTitle = document.getElementById('jobTitle').value.trim();
  const jobDescription = document.getElementById('jobDescription').value.trim();

  if (!jobTitle) {
    alert('Please enter a job title.');
    return;
  }
  if (!jobDescription) {
    alert('Please enter a job description.');
    return;
  }
  if (uploadedResumeIds.length === 0) {
    alert('Please upload resumes first.');
    return;
  }

  processBtn.disabled = true;
  processBtn.innerHTML = '<span class="spinner"></span> Processing...';
  setStatus(
    processStatus,
    `Analyzing ${uploadedResumeIds.length} resume(s) with AI... This may take a moment.`
  );
  resultsSection.style.display = 'none';

  try {
    const response = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resumeIds: uploadedResumeIds,
        jobTitle,
        jobDescription,
      }),
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error);

    renderResults(data.results);
    setStatus(processStatus, 'Processing complete!', 'success');
  } catch (err) {
    setStatus(processStatus, `Processing failed: ${err.message}`, 'error');
  } finally {
    processBtn.innerHTML = '<span class="material-symbols-rounded">auto_awesome</span> Process with AI';
    processBtn.disabled = false;
  }
});

// --- Results ---
function renderResults(results) {
  resultsSection.style.display = 'block';

  resultsContainer.innerHTML = results
    .map((r) => {
      if (r.error) {
        return `<div class="result-card result-error">
        <div class="score-badge score-low">
          <span class="material-symbols-rounded" style="font-size:24px;">error</span>
        </div>
        <div class="candidate-info">
          <span class="candidate-name">${escapeHtml(r.originalName || 'Unknown')}</span>
          <p class="reasoning" style="color:var(--md-error)">${escapeHtml(r.error)}</p>
        </div>
      </div>`;
      }

      const scoreClass =
        r.score >= 70 ? 'score-high' : r.score >= 50 ? 'score-mid' : 'score-low';

      return `<div class="result-card" onclick="openResume('${r.id}')">
      <div class="score-badge ${scoreClass}">${r.score}</div>
      <div class="candidate-info">
        <span class="candidate-name">${escapeHtml(r.candidateName)}</span>
        <span class="file-name">${escapeHtml(r.originalName)}</span>
        <p class="reasoning">${escapeHtml(r.reasoning)}</p>
      </div>
    </div>`;
    })
    .join('');

  resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function openResume(id) {
  window.open(`/resume.html?id=${id}`, '_blank');
}

// --- Deploy Modal ---
const deployBtn = document.getElementById('deployBtn');
const deployModal = document.getElementById('deployModal');
const deployModalClose = document.getElementById('deployModalClose');
const deployCancelBtn = document.getElementById('deployCancelBtn');
const deploySubmitBtn = document.getElementById('deploySubmitBtn');
const deployTargetSelector = document.getElementById('deployTargetSelector');
const deployLog = document.getElementById('deployLog');

const deployForms = {
  local: document.getElementById('deployFormLocal'),
  external: document.getElementById('deployFormExternal'),
  cloud: document.getElementById('deployFormCloud'),
};

let currentDeployTarget = 'local';

function openDeployModal() {
  deployModal.classList.add('open');
  document.body.style.overflow = 'hidden';
  resetDeployModal();
}

function closeDeployModal() {
  deployModal.classList.remove('open');
  document.body.style.overflow = '';
}

function resetDeployModal() {
  switchDeployTarget('local');
  document.getElementById('deployLocalPort').value = '3001';
  document.getElementById('deployExtHost').value = '';
  document.getElementById('deployExtPort').value = '22';
  document.getElementById('deployExtUsername').value = '';
  document.getElementById('deployExtPassword').value = '';
  document.getElementById('deployExtPath').value = '';
  document.getElementById('deployExtAppPort').value = '3000';
  document.getElementById('deployCloudHost').value = '';
  document.getElementById('deployCloudSSHPort').value = '22';
  document.getElementById('deployCloudUsername').value = '';
  document.getElementById('deployCloudKey').value = '';
  document.getElementById('deployCloudPath').value = '';
  document.getElementById('deployCloudAppPort').value = '3000';
  deployLog.innerHTML = '';
  deployLog.classList.remove('visible');
  deploySubmitBtn.disabled = false;
  deploySubmitBtn.innerHTML = '<span class="material-symbols-rounded">rocket_launch</span> Deploy';
}

deployBtn.addEventListener('click', openDeployModal);
deployModalClose.addEventListener('click', closeDeployModal);
deployCancelBtn.addEventListener('click', closeDeployModal);

deployModal.addEventListener('click', (e) => {
  if (e.target === deployModal) closeDeployModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && deployModal.classList.contains('open')) {
    closeDeployModal();
  }
});

function switchDeployTarget(target) {
  currentDeployTarget = target;
  const buttons = deployTargetSelector.querySelectorAll('button');
  buttons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.target === target);
  });
  Object.keys(deployForms).forEach((key) => {
    deployForms[key].classList.toggle('visible', key === target);
  });
}

deployTargetSelector.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-target]');
  if (btn) switchDeployTarget(btn.dataset.target);
});

function addDeployLog(message, type = 'info') {
  deployLog.classList.add('visible');
  const iconMap = { info: 'info', success: 'check_circle', error: 'error' };
  const entry = document.createElement('div');
  entry.className = `deploy-log-entry log-${type}`;
  entry.innerHTML = `<span class="material-symbols-rounded">${iconMap[type] || 'info'}</span> ${escapeHtml(message)}`;
  deployLog.appendChild(entry);
  deployLog.scrollTop = deployLog.scrollHeight;
}

function validateDeployForm() {
  if (currentDeployTarget === 'local') {
    const port = parseInt(document.getElementById('deployLocalPort').value, 10);
    if (!port || port < 1024 || port > 65535) {
      addDeployLog('Invalid port. Must be between 1024 and 65535.', 'error');
      return null;
    }
    return { target: 'local', port };
  }

  if (currentDeployTarget === 'external') {
    const host = document.getElementById('deployExtHost').value.trim();
    const sshPort = parseInt(document.getElementById('deployExtPort').value, 10) || 22;
    const username = document.getElementById('deployExtUsername').value.trim();
    const credential = document.getElementById('deployExtPassword').value.trim();
    const remotePath = document.getElementById('deployExtPath').value.trim();
    const appPort = parseInt(document.getElementById('deployExtAppPort').value, 10) || 3000;

    if (!host) { addDeployLog('Host is required.', 'error'); return null; }
    if (!username) { addDeployLog('Username is required.', 'error'); return null; }
    if (!credential) { addDeployLog('Password or SSH key is required.', 'error'); return null; }
    if (!remotePath) { addDeployLog('Remote path is required.', 'error'); return null; }

    const isKey = credential.includes('-----BEGIN');
    return {
      target: 'external',
      host,
      sshPort,
      username,
      password: isKey ? undefined : credential,
      privateKey: isKey ? credential : undefined,
      remotePath,
      appPort,
    };
  }

  if (currentDeployTarget === 'cloud') {
    const host = document.getElementById('deployCloudHost').value.trim();
    const sshPort = parseInt(document.getElementById('deployCloudSSHPort').value, 10) || 22;
    const username = document.getElementById('deployCloudUsername').value.trim();
    const privateKey = document.getElementById('deployCloudKey').value.trim();
    const remotePath = document.getElementById('deployCloudPath').value.trim();
    const appPort = parseInt(document.getElementById('deployCloudAppPort').value, 10) || 3000;

    if (!host) { addDeployLog('Cloud host is required.', 'error'); return null; }
    if (!username) { addDeployLog('Username is required.', 'error'); return null; }
    if (!privateKey) { addDeployLog('SSH private key is required.', 'error'); return null; }
    if (!remotePath) { addDeployLog('Remote path is required.', 'error'); return null; }

    return {
      target: 'cloud',
      host,
      sshPort,
      username,
      privateKey,
      remotePath,
      appPort,
    };
  }

  return null;
}

deploySubmitBtn.addEventListener('click', async () => {
  deployLog.innerHTML = '';
  deployLog.classList.remove('visible');

  const config = validateDeployForm();
  if (!config) return;

  deploySubmitBtn.disabled = true;
  deploySubmitBtn.innerHTML = '<span class="spinner"></span> Deploying...';
  deployCancelBtn.disabled = true;

  addDeployLog(`Starting ${config.target} deployment...`, 'info');

  try {
    const response = await fetch('/api/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await response.json();

    if (data.steps) {
      data.steps.forEach((step) => addDeployLog(step.message, step.status));
    }

    if (!response.ok) throw new Error(data.error || 'Deployment failed');

    if (data.url) {
      addDeployLog('Deployment successful!', 'success');
      const linkEl = document.createElement('a');
      linkEl.className = 'deploy-result-link';
      linkEl.href = data.url;
      linkEl.target = '_blank';
      linkEl.innerHTML = `<span class="material-symbols-rounded">open_in_new</span> Open ${escapeHtml(data.url)}`;
      deployLog.appendChild(linkEl);
    } else {
      addDeployLog('Deployment completed.', 'success');
    }
  } catch (err) {
    addDeployLog(`Deployment failed: ${err.message}`, 'error');
  } finally {
    deploySubmitBtn.disabled = false;
    deploySubmitBtn.innerHTML = '<span class="material-symbols-rounded">rocket_launch</span> Deploy';
    deployCancelBtn.disabled = false;
  }
});
