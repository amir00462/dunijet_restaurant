# Dunijet Restaurant

A modern web application for Dunijet Pizza Restaurant featuring a glass-morphism design and intelligent voice assistant.

## ✨ Features

- 🎨 Modern glass-morphism design with advanced effects
- 🎤 Intelligent voice assistant powered by N8n
- 📱 Responsive design for mobile and desktop
- 🚀 High performance with advanced optimizations
- 🔒 Advanced security with Helmet and Rate Limiting
- 🐳 Docker-ready deployment

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (optional)
- N8n account (for voice assistant)

## Installation and Setup

### Using NPM

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd dunijet_restaurant
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.template .env
   ```
   Edit `.env` and set your `N8N_WEBHOOK_URL`:
   ```
   N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id
   PORT=3000
   NODE_ENV=development
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   The website will be available at `http://localhost:3000`

5. **Run production:**
   ```bash
   npm start
   ```

### Using Docker

#### Docker Compose (Recommended)

```bash
docker-compose up -d
```

#### Direct Docker

```bash
docker build -t dunijet-pizza .

docker run -d \
  --name dunijet-pizza-site \
  -p 3000:3000 \
  --env-file .env \
  dunijet-pizza
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Execution environment | `development` |
| `N8N_WEBHOOK_URL` | N8n webhook URL | - |
| `SITE_NAME` | Site name | `Dunijet Pizza` |

### Security Features

- Rate limiting to prevent DDoS attacks
- Helmet for HTTP security headers
- CORS for access control
- Compression for response optimization
- Input validation
- Secure logging

## 📁 Project Structure

```
dunijet_restaurant/
├── public/
│   ├── index.html              
│   ├── app.js                  
│   ├── menu.json               
│   └── icons/
│       └── icon.png            
├── server.js                   
├── healthcheck.js              
├── test-webhook.js             
├── package.json                
├── Dockerfile                  
├── docker-compose.yml          
├── nginx.conf                  
└── README.md                   
```

## 📝 NPM Scripts

```bash
npm run dev              # Development server
npm start               # Production server
npm run test:webhook    # Test webhook connection
npm run docker:build    # Build Docker image
npm run docker:run      # Run Docker container
npm run deploy          # Deploy to production
```

## 🎯 API Endpoints

### POST /api/voice-agent
Send voice requests to the N8n AI agent.

### GET /health
Check server health status.

### POST /api/save-audio
Save audio files to the server.

### DELETE /api/audio/:filename
Delete a specific audio file.

### DELETE /api/audio-clear
Clear all audio files.

## 🚀 Performance Optimizations

- Gzip compression
- Static file caching
- Image lazy loading
- Efficient JavaScript bundling
- CSS optimization
- CDN ready

## 📊 Monitoring

- Docker health checks
- Morgan logging
- Advanced error handling
- Performance monitoring

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Contact

- Website: https://dunijettizza.com
- Email: info@dunijettizza.com
- Phone: +98 990 0668 7721

## 🙏 Acknowledgments

- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [N8n](https://n8n.io/) - Automation and AI
- [Express.js](https://expressjs.com/) - Server framework
- [Docker](https://docker.com/) - Containerization
