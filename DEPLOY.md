# Deployment Instructions

## Resume Scoring - Deployment Guide

This document covers all methods for deploying the Resume Scoring application, including local development, local multi-instance, remote server, and cloud VM deployment.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Local Deployment (Different Port)](#3-local-deployment-different-port)
4. [External Server Deployment (SSH)](#4-external-server-deployment-ssh)
5. [Cloud VM Deployment](#5-cloud-vm-deployment)
6. [Using the Built-in Deploy UI](#6-using-the-built-in-deploy-ui)
7. [Environment Configuration](#7-environment-configuration)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

### All Deployments
- Node.js v18+ and npm v9+
- An Anthropic API key from [console.anthropic.com](https://console.anthropic.com)

### Remote/Cloud Deployments
- SSH access to the target server
- Password or SSH private key for authentication
- Node.js v18+ installed on the remote server
- npm available in the remote server's PATH

---

## 2. Local Development Setup

```bash
# Clone the repository
git clone https://github.com/taj3rconnect/CC-ResumeScoring.git
cd CC-ResumeScoring

# Install dependencies
npm install

# Create .env file
echo "ANTHROPIC_API_KEY=your-api-key-here" > .env
echo "PORT=3000" >> .env

# Start the server
npm start
```

The application will be available at `http://localhost:3000`.

For development with auto-restart on file changes:

```bash
npm run dev
```

---

## 3. Local Deployment (Different Port)

Run a second instance of the application on a different port on the same machine.

### Method A: Using the Built-in Deploy Button

1. Open the running application at `http://localhost:3000`
2. Click the **Deploy** button (top-right header)
3. Select **Local** tab
4. Enter a port number (1024-65535) that is not in use
5. Click **Deploy**
6. The progress log will show each step; on success, click the link to open

### Method B: Manual Command Line

```bash
# Copy the project to a new directory
mkdir /tmp/resume-scoring-4000
cp -r . /tmp/resume-scoring-4000/
cd /tmp/resume-scoring-4000

# Update the port in .env
sed -i 's/PORT=.*/PORT=4000/' .env

# Install dependencies and start
npm install --production
PORT=4000 node server.js
```

### Method C: Using the API Directly

```bash
curl -X POST http://localhost:3000/api/deploy \
  -H "Content-Type: application/json" \
  -d '{"target": "local", "port": 4000}'
```

**What happens during local deployment:**
1. A temporary directory is created at `{OS_TEMP}/resume-scoring-deploy-{port}`
2. All project files are copied (excluding `node_modules`, `.git`, `.env`, `uploads`, `.claude`)
3. The `.env` file is copied with the PORT value overridden
4. `npm install --production` runs in the new directory
5. A detached Node.js child process starts the server
6. The child process survives parent server restarts
7. Child processes are cleaned up when the parent server exits (SIGINT handler)

---

## 4. External Server Deployment (SSH)

Deploy to any Linux server with SSH access.

### Prerequisites on Remote Server

```bash
# Ensure Node.js and npm are installed
node --version   # Should be v18+
npm --version    # Should be v9+
```

### Method A: Using the Deploy UI

1. Click **Deploy** in the app header
2. Select **External** tab
3. Fill in the fields:
   - **Host / IP**: Server hostname or IP address (e.g., `192.168.1.100`)
   - **SSH Port**: Default `22`
   - **Username**: SSH user (e.g., `deploy`, `ubuntu`)
   - **Password or SSH Key**: Enter password or paste the full SSH private key
   - **Remote Path**: Target directory (e.g., `/home/deploy/resume-scoring`)
   - **App Port**: Port for the app on the remote server (e.g., `3000`)
4. Click **Deploy**

### Method B: Using the API

```bash
# With password authentication
curl -X POST http://localhost:3000/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "target": "external",
    "host": "192.168.1.100",
    "sshPort": 22,
    "username": "deploy",
    "password": "your-password",
    "remotePath": "/home/deploy/resume-scoring",
    "appPort": 3000
  }'

# With SSH key authentication
curl -X POST http://localhost:3000/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "target": "external",
    "host": "192.168.1.100",
    "sshPort": 22,
    "username": "deploy",
    "privateKey": "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----",
    "remotePath": "/home/deploy/resume-scoring",
    "appPort": 3000
  }'
```

### Method C: Manual Deployment

```bash
# From your local machine
scp -r . user@server:/home/user/resume-scoring/
ssh user@server

# On the remote server
cd /home/user/resume-scoring
npm install --production
nohup node server.js > /dev/null 2>&1 &
```

**What happens during SSH deployment:**
1. SSH connection is established using password or private key
2. Remote directory is created via `mkdir -p`
3. All project files are uploaded via SFTP
4. `.env` is uploaded with the PORT value overridden to the specified app port
5. `npm install --production` runs on the remote server
6. Any existing process on the target port is killed
7. Server starts via `nohup` (survives SSH disconnect)

---

## 5. Cloud VM Deployment

Deploy to cloud provider VMs (AWS EC2, DigitalOcean Droplet, GCP Compute Engine, Azure VM).

### VM Setup (One-Time)

#### AWS EC2
```bash
# Connect to your EC2 instance
ssh -i your-key.pem ec2-user@ec2-xx-xx-xx-xx.compute.amazonaws.com

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Open the app port in the security group
# AWS Console > EC2 > Security Groups > Inbound Rules > Add: Custom TCP, Port 3000, 0.0.0.0/0
```

#### DigitalOcean Droplet
```bash
ssh root@your-droplet-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```

#### GCP Compute Engine
```bash
gcloud compute ssh your-vm-name

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Open firewall
gcloud compute firewall-rules create allow-resume-scoring --allow tcp:3000
```

### Deploy Using the UI

1. Click **Deploy** in the app header
2. Select **Cloud** tab
3. Fill in:
   - **Cloud Host / IP**: Your VM's public hostname or IP
   - **SSH Port**: Default `22`
   - **Username**: `ubuntu` (AWS), `root` (DigitalOcean), or your VM user
   - **SSH Private Key**: Paste the full contents of your `.pem` or SSH private key
   - **Remote Path**: e.g., `/home/ubuntu/resume-scoring`
   - **App Port**: e.g., `3000`
4. Click **Deploy**

### Deploy Using the API

```bash
curl -X POST http://localhost:3000/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "target": "cloud",
    "host": "ec2-xx-xx-xx-xx.compute.amazonaws.com",
    "sshPort": 22,
    "username": "ubuntu",
    "privateKey": "'"$(cat ~/.ssh/your-key.pem)"'",
    "remotePath": "/home/ubuntu/resume-scoring",
    "appPort": 3000
  }'
```

---

## 6. Using the Built-in Deploy UI

The application includes a Deploy button in the top-right corner of the header bar.

### Opening the Modal
- Click the **Deploy** button (rocket icon)
- The modal opens with a smooth animation

### Selecting a Target
- Use the segmented button bar to switch between **Local**, **External**, and **Cloud**
- Each tab shows relevant form fields

### Deployment Progress
- After clicking Deploy, a log area appears showing real-time progress
- Each step shows an icon: info (blue), success (green), or error (red)
- On success, a clickable link opens the deployed instance

### Closing the Modal
- Click **Cancel** or the **X** button
- Click the overlay background
- Press the **Escape** key

---

## 7. Environment Configuration

### Required Environment Variables

Create a `.env` file in the project root:

```env
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxx
PORT=3000
```

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `PORT` | No | Server port (defaults to 3000) |

### Important Notes

- The `.env` file is **automatically transferred** during deployment with the PORT overridden
- The API key from your local `.env` will be used on the deployed instance
- The `.env` file is excluded from git (listed in `.gitignore`)
- SSH credentials entered in the Deploy modal are **never stored** - they are used only for the deployment request

---

## 8. Troubleshooting

### Port Already in Use
```
Error: listen EADDRINUSE :::3000
```
Another process is using the port. Either stop it or use a different port:
```bash
# Find the process
lsof -ti:3000    # Linux/Mac
netstat -ano | findstr :3000    # Windows

# Kill it
kill -9 <PID>    # Linux/Mac
taskkill /F /PID <PID>    # Windows
```

### Node/npm Not Found During Deployment
If using NVM (Node Version Manager), `node` and `npm` may not be in the system PATH. The application handles this by prepending the Node.js executable's directory to the PATH for spawned processes. If issues persist:
```bash
# Find your node path
which node    # or: where node (Windows)

# Add to system PATH permanently
export PATH="/path/to/node/bin:$PATH"    # Add to ~/.bashrc or ~/.zshrc
```

### SSH Connection Refused
- Verify the server is reachable: `ping <host>`
- Verify SSH port is open: `telnet <host> 22`
- Verify credentials are correct
- For cloud VMs, ensure the security group/firewall allows SSH (port 22)

### Permission Denied on Remote Deploy
- Ensure the SSH user has write access to the remote path
- For cloud VMs, use the correct default user (`ubuntu`, `ec2-user`, `root`)
- Ensure the SSH key has correct permissions: `chmod 600 your-key.pem`

### Deployment Directory Locked (Windows)
If a local deployment fails with `EPERM` or permission errors:
```bash
# The previous deployment process may still be running
tasklist | findstr node
taskkill /F /PID <PID>

# Then retry the deployment on a different port
```

### Scanned PDF Extraction Fails
Image-based PDFs require OCR which is not supported. Convert the PDF to a text-based format before uploading, or use a tool like Adobe Acrobat to export as text.
