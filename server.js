require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const multer = require('multer');
const FormData = require('form-data');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            connectSrc: ["'self'", process.env.N8N_URL ? new URL(process.env.N8N_URL).origin : "'self'"],
        },
    },
}));

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// More restrictive rate limiting for voice agent endpoint
const voiceLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 voice requests per minute
    message: {
        error: 'Too many voice requests, please wait a moment.'
    },
});
app.use('/api/voice-agent', voiceLimiter);

// Configure multer for voice agent endpoint
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB limit
        files: 1, // Only one file allowed
        fieldNameSize: 100,
        fieldSize: 1024
    },
    fileFilter: (req, file, cb) => {
        // Only allow audio files
        if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'), false);
        }
    }
});

// Logging
if (!isProduction) {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);

        // In production, you might want to restrict origins
        if (isProduction) {
            const allowedOrigins = [
                'http://localhost:3000',
                'https://dunijettizza.com',
                // Add your production domains here
            ];
            if (allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        } else {
            // In development, allow all origins
            callback(null, true);
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files with caching
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: isProduction ? '1d' : 0, // Cache for 1 day in production
    etag: true
}));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.post('/api/voice-agent', upload.single('audio'), async (req, res) => {
    try {
        // Validate required environment variables
        if (!process.env.N8N_URL) {
            console.error('N8N_URL environment variable is not set');
            return res.status(500).json({
                error: 'Server configuration error',
                message: 'Voice agent is temporarily unavailable'
            });
        }

        // Validate audio file
        if (!req.file) {
            return res.status(400).json({
                error: 'No audio file provided',
                message: 'Please provide an audio file'
            });
        }

        // Send binary audio file to N8N using FormData
        const formData = new FormData();
        
        // Add audio file as binary (not base64)
        formData.append('audio', req.file.buffer, {
            filename: req.file.originalname || 'voice-input.webm',
            contentType: req.file.mimetype || 'audio/webm'
        });

        console.log(`Processing voice request from ${req.ip} at ${new Date().toISOString()}, file size: ${req.file.size} bytes`);

        const response = await axios.post(process.env.N8N_URL, formData, {
            headers: {
                ...formData.getHeaders(),
                'User-Agent': 'Dunijet-Pizza-Site/1.0'
            },
            timeout: 60000, // 60 second timeout
            maxContentLength: 50 * 1024 * 1024, // 50MB max
            responseType: 'arraybuffer' // Expect binary response
        });

        console.log(`Voice request processed successfully for ${req.ip}`);
        
        // Check content type from N8N response
        const contentType = response.headers['content-type'] || '';
        
        if (contentType.includes('audio') || contentType.includes('octet-stream')) {
            // Binary audio response - forward directly
            res.set('Content-Type', contentType.includes('audio') ? contentType : 'audio/mpeg');
            res.send(Buffer.from(response.data));
        } else {
            // Try to parse as JSON
            try {
                const jsonData = JSON.parse(Buffer.from(response.data).toString('utf8'));
                if (!('success' in jsonData)) {
                    jsonData.success = true;
                }
                res.json(jsonData);
            } catch {
                // Unknown format, send as binary
                res.set('Content-Type', 'audio/mpeg');
                res.send(Buffer.from(response.data));
            }
        }

    } catch (error) {
        console.error('Error calling n8n:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            timestamp: new Date().toISOString()
        });

        // Determine appropriate error response
        let statusCode = 500;
        let errorMessage = 'Failed to process voice request';

        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            statusCode = 504;
            errorMessage = 'Request timeout - please try again';
        } else if (error.response) {
            statusCode = error.response.status || 500;
            errorMessage = error.response.data?.error || errorMessage;
        } else if (error.message.includes('File too large')) {
            statusCode = 413;
            errorMessage = 'Audio file is too large';
        }

        res.status(statusCode).json({
            success: false,
            error: errorMessage,
            timestamp: new Date().toISOString()
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: isProduction ? 'Something went wrong' : err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`🚀 Dunijet Pizza Server is running on http://localhost:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 Security: ${isProduction ? 'Production mode' : 'Development mode'}`);
    console.log(`🎤 Voice Agent: ${process.env.N8N_URL ? 'Configured' : 'Not configured'}`);
});

