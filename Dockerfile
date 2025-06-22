# Use Python 3.11 with Ubuntu base for better Chrome support
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99

# Install system dependencies for Chrome, Python packages, and Node.js
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    curl \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js for frontend build
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Add Google Chrome repository and install Chrome
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Install ChromeDriver using Chrome for Testing API
RUN CHROME_VERSION=$(google-chrome --version | awk '{print $3}') \
    && echo "Chrome version: $CHROME_VERSION" \
    && wget -O /tmp/chromedriver-linux64.zip "https://storage.googleapis.com/chrome-for-testing-public/${CHROME_VERSION}/linux64/chromedriver-linux64.zip" \
    && unzip /tmp/chromedriver-linux64.zip -d /tmp/ \
    && mv /tmp/chromedriver-linux64/chromedriver /usr/local/bin/ \
    && chmod +x /usr/local/bin/chromedriver \
    && rm -rf /tmp/chromedriver-linux64.zip /tmp/chromedriver-linux64

# Create app directory
WORKDIR /app

# Copy requirements first for better caching
COPY ["RF4 Records/backend/requirements.txt", "."]

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ["RF4 Records/backend/", "./backend/"]
COPY ["RF4 Records/frontend/", "./frontend/"]

# Build frontend
WORKDIR /app/frontend
RUN npm install && npm run build

# Create logs directory
RUN mkdir -p /app/logs

# Set working directory to backend
WORKDIR /app/backend

# Create a startup script
RUN echo '#!/bin/bash\n\
# Start Xvfb for headless display\n\
Xvfb :99 -screen 0 1280x720x24 &\n\
\n\
# Wait a moment for Xvfb to start\n\
sleep 2\n\
\n\
# Start the Python application\n\
exec python "$@"' > /app/start.sh \
    && chmod +x /app/start.sh

# Expose port for the web interface
EXPOSE 8000

# Set Chrome-specific environment variables
ENV CHROME_BIN=/usr/bin/google-chrome
ENV CHROMEDRIVER_PATH=/usr/local/bin/chromedriver

# Use the startup script
ENTRYPOINT ["/app/start.sh"]
CMD ["main.py"] 