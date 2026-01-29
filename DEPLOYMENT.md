# Learn with AI - Deployment Guide

## 🚀 Production Deployment

This guide covers deploying Learn with AI to production environments.

---

## 📋 Pre-Deployment Checklist

- [ ] All files are in place
- [ ] Dependencies installed
- [ ] API key configured
- [ ] Environment variables set
- [ ] Tests pass locally
- [ ] Code reviewed
- [ ] Database configured (optional)
- [ ] Monitoring setup
- [ ] Backup strategy ready

---

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy files
COPY requirments.txt .
COPY app.py .
COPY tones.py .
COPY vectordatabase.py .
COPY config.py .
COPY template/ template/
COPY static/ static/

# Install Python dependencies
RUN pip install --no-cache-dir -r requirments.txt

# Create upload directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Set environment
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Run
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "--timeout", "120", "app:app"]
```

### Build and Run

```bash
# Build image
docker build -t learn-with-ai:latest .

# Run container
docker run -d \
  -p 5000:5000 \
  -e GEMINI_API_KEY=your_key_here \
  -e SECRET_KEY=your_secret_key \
  -v uploads:/app/uploads \
  --name learn-ai \
  learn-with-ai:latest

# View logs
docker logs -f learn-ai
```

---

## 🏭 Gunicorn + Nginx Setup

### 1. Install Production Server

```bash
pip install gunicorn
```

### 2. Create systemd Service

Create `/etc/systemd/system/learn-ai.service`:

```ini
[Unit]
Description=Learn with AI Flask Application
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/learn-ai
ExecStart=/var/www/learn-ai/venv/bin/gunicorn \
    -w 4 \
    -b 127.0.0.1:8000 \
    --timeout 120 \
    --access-logfile /var/log/learn-ai/access.log \
    --error-logfile /var/log/learn-ai/error.log \
    app:app

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 3. Nginx Configuration

Create `/etc/nginx/sites-available/learn-ai`:

```nginx
server {
    listen 80;
    server_name your_domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your_domain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/your_domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your_domain.com/privkey.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Proxy settings
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Upload directory
    location /uploads {
        alias /var/www/learn-ai/uploads;
        expires 7d;
    }
}
```

### 4. Enable and Start Services

```bash
# Create log directory
sudo mkdir -p /var/log/learn-ai
sudo chown www-data:www-data /var/log/learn-ai

# Enable nginx site
sudo ln -s /etc/nginx/sites-available/learn-ai /etc/nginx/sites-enabled/

# Test nginx config
sudo nginx -t

# Start services
sudo systemctl daemon-reload
sudo systemctl enable learn-ai
sudo systemctl start learn-ai
sudo systemctl restart nginx

# Check status
sudo systemctl status learn-ai
```

---

## 🔧 Environment Configuration

### Production .env

```env
# API Configuration
GEMINI_API_KEY=your_production_api_key
SECRET_KEY=your_secret_key_min_32_chars

# Flask Settings
FLASK_ENV=production
DEBUG=False

# Server Settings
HOST=0.0.0.0
PORT=5000

# Database (if using)
DATABASE_URL=postgresql://user:pass@localhost/learn-ai

# Logging
LOG_LEVEL=INFO
LOG_FILE=/var/log/learn-ai/app.log
```

---

## 📊 Scaling Considerations

### Horizontal Scaling

```bash
# Multiple Gunicorn workers
gunicorn -w 8 -b 0.0.0.0:5000 app:app

# Load balancing with HAProxy
# Configuration in /etc/haproxy/haproxy.cfg
```

### Database Persistence

Add to `app.py` for production:

```python
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
db = SQLAlchemy(app)
migrate = Migrate(app, db)
```

### Caching

```python
from flask_caching import Cache

cache = Cache(app, config={'CACHE_TYPE': 'simple'})

@app.route('/api/documents/list')
@cache.cached(timeout=300)
def list_documents():
    # ... implementation
```

---

## 🔐 Security Hardening

### 1. Update Dependencies

```bash
pip install --upgrade pip setuptools wheel
pip check  # Check for vulnerabilities
```

### 2. Configure CORS (if needed)

```python
from flask_cors import CORS

CORS(app, resources={
    r"/api/*": {
        "origins": ["https://your-domain.com"],
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type"]
    }
})
```

### 3. Rate Limiting

```python
from flask_limiter import Limiter

limiter = Limiter(app, key_func=lambda: request.remote_addr)

@app.route('/api/chat/ask', methods=['POST'])
@limiter.limit("30 per minute")
def ask_question():
    # ... implementation
```

### 4. HTTPS/SSL

```bash
# Get free SSL with Let's Encrypt
sudo certbot certonly --nginx -d your_domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

---

## 📈 Monitoring & Logging

### Application Logging

```python
import logging
from logging.handlers import RotatingFileHandler

if not app.debug:
    if not os.path.exists('logs'):
        os.mkdir('logs')
    file_handler = RotatingFileHandler('logs/learn-ai.log', 
                                       maxBytes=10240000, 
                                       backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
```

### Health Check Endpoint

```python
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    })
```

### Monitoring Tools

- **Prometheus**: Metrics collection
- **Grafana**: Visualization
- **ELK Stack**: Logging
- **Sentry**: Error tracking
- **New Relic**: APM

---

## 🚀 AWS Deployment

### Using Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init -p python-3.11 learn-with-ai

# Create environment
eb create learn-ai-prod

# Deploy
git push && eb deploy

# Monitor
eb status
eb logs
```

### Using EC2

```bash
# Launch instance (Ubuntu 22.04)
# Install dependencies
sudo apt update
sudo apt install python3-pip python3-venv nginx

# Setup application
git clone your-repo
cd learn-ai
python3 -m venv venv
source venv/bin/activate
pip install -r requirments.txt

# Configure and deploy
# ... follow Gunicorn + Nginx setup above
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy Learn with AI

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.11
      
      - name: Install dependencies
        run: |
          pip install -r requirments.txt
      
      - name: Run tests
        run: |
          pytest tests/
      
      - name: Deploy to server
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: |
          # Deployment commands
```

---

## 🧪 Testing Before Deployment

```bash
# Install test dependencies
pip install pytest pytest-flask

# Run tests
pytest

# Check code quality
pip install flake8
flake8 app.py tones.py

# Security check
pip install bandit
bandit -r app.py
```

---

## 📝 Deployment Checklist

### Pre-Deployment
- [ ] Code tested locally
- [ ] All dependencies listed
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Backups scheduled
- [ ] Monitoring configured
- [ ] SSL certificates obtained
- [ ] Team notified

### Deployment
- [ ] Build Docker image
- [ ] Push to registry
- [ ] Update configuration
- [ ] Run migrations
- [ ] Deploy to production
- [ ] Verify application
- [ ] Check monitoring
- [ ] Run smoke tests

### Post-Deployment
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify SSL certificates
- [ ] Test all endpoints
- [ ] Confirm backups working
- [ ] Update documentation
- [ ] Notify stakeholders

---

## 🆘 Troubleshooting

### High Memory Usage
```bash
# Check processes
top
ps aux | grep gunicorn

# Adjust worker count
gunicorn -w 2 app:app  # Reduce workers
```

### Slow Responses
```bash
# Check system resources
free -h
df -h

# Check logs
tail -f /var/log/learn-ai/error.log
```

### Connection Issues
```bash
# Check if port is open
sudo netstat -tlnp | grep 5000

# Firewall configuration
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## 📞 Support & Maintenance

### Regular Maintenance
- Update dependencies monthly
- Check security patches
- Review logs weekly
- Monitor performance metrics
- Backup data regularly

### Incident Response
1. Check application logs
2. Review system metrics
3. Check for recent changes
4. Implement fix
5. Deploy hotfix
6. Monitor recovery
7. Post-mortem analysis

---

## 📚 Additional Resources

- [Flask Deployment](https://flask.palletsprojects.com/deployment/)
- [Gunicorn Documentation](https://gunicorn.org/)
- [Nginx Best Practices](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

**Ready for Production! 🚀**
