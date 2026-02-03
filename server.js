require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const axios = require('axios');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const multer = require('multer');
const FormData = require('form-data');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            connectSrc: ["'self'", process.env.N8N_WEBHOOK_URL ? new URL(process.env.N8N_WEBHOOK_URL).origin : "'self'"],
            mediaSrc: ["'self'", "blob:", "data:"],
        },
    },
}));

app.use(compression());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

const voiceLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: {
        error: 'Too many voice requests, please wait a moment.'
    },
});
app.use('/api/voice-agent', voiceLimiter);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024,
        files: 1,
        fieldNameSize: 100,
        fieldSize: 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'), false);
        }
    }
});

if (!isProduction) {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        if (isProduction) {
            const allowedOrigins = [
                'http://localhost:3000',
                'https://dunijettizza.com',
            ];
            if (allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        } else {
            callback(null, true);
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: isProduction ? '1d' : 0,
    etag: true
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '7d',
    etag: true,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.webm')) {
            res.setHeader('Content-Type', 'audio/webm');
        } else if (filePath.endsWith('.mp3')) {
            res.setHeader('Content-Type', 'audio/mpeg');
        } else if (filePath.endsWith('.wav')) {
            res.setHeader('Content-Type', 'audio/wav');
        }
    }
}));

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.post('/api/save-audio', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        const type = req.body.type || 'user';
        const timestamp = Date.now();
        const randomId = crypto.randomBytes(8).toString('hex');

        let extension = '.webm';
        if (req.file.mimetype.includes('mpeg') || req.file.mimetype.includes('mp3')) {
            extension = '.mp3';
        } else if (req.file.mimetype.includes('wav')) {
            extension = '.wav';
        }

        const filename = `${type}_${timestamp}_${randomId}${extension}`;
        const filepath = path.join(uploadsDir, filename);

        fs.writeFileSync(filepath, req.file.buffer);

        res.json({
            success: true,
            filename: filename,
            url: `/uploads/${filename}`,
            type: type,
            size: req.file.size,
            mimeType: req.file.mimetype
        });
    } catch (error) {
        console.error('Error saving audio file:', error);
        res.status(500).json({ error: 'Failed to save audio file' });
    }
});

app.delete('/api/audio/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ error: 'Invalid filename' });
        }

        const filepath = path.join(uploadsDir, filename);

        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (error) {
        console.error('Error deleting audio file:', error);
        res.status(500).json({ error: 'Failed to delete audio file' });
    }
});

app.delete('/api/audio-clear', (req, res) => {
    try {
        const files = fs.readdirSync(uploadsDir);
        let deletedCount = 0;

        for (const file of files) {
            const filepath = path.join(uploadsDir, file);
            if (fs.statSync(filepath).isFile()) {
                fs.unlinkSync(filepath);
                deletedCount++;
            }
        }

        res.json({ success: true, deletedCount });
    } catch (error) {
        console.error('Error clearing audio files:', error);
        res.status(500).json({ error: 'Failed to clear audio files' });
    }
});

app.post('/api/voice-agent', upload.single('audio'), async (req, res) => {
    try {
        if (!process.env.N8N_WEBHOOK_URL) {
            return res.status(500).json({
                error: 'Server configuration error',
                message: 'Voice agent is temporarily unavailable'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: 'No audio file provided',
                message: 'Please provide an audio file'
            });
        }

        const formData = new FormData();

        formData.append('audio', req.file.buffer, {
            filename: req.file.originalname || 'voice-input.webm',
            contentType: req.file.mimetype || 'audio/webm'
        });

        const response = await axios.post(process.env.N8N_WEBHOOK_URL, formData, {
            headers: {
                ...formData.getHeaders(),
                'User-Agent': 'Dunijet-Pizza-Site/1.0'
            },
            timeout: 120000,
            maxContentLength: 50 * 1024 * 1024,
            maxBodyLength: 50 * 1024 * 1024,
            responseType: 'arraybuffer',
            httpAgent: new (require('http').Agent)({ keepAlive: false }),
            httpsAgent: new (require('https').Agent)({ keepAlive: false })
        });

        const contentType = response.headers['content-type'] || '';
        const responseBuffer = Buffer.from(response.data);

        // Check if it's binary audio data
        if (contentType.includes('audio') || contentType.includes('octet-stream')) {
            res.set('Content-Type', contentType.includes('audio') ? contentType : 'audio/mpeg');
            res.send(responseBuffer);
        } else {
            // Try to parse as JSON
            try {
                const textData = responseBuffer.toString('utf-8');
                const jsonData = JSON.parse(textData);
                res.json(jsonData);
            } catch {
                // If parsing fails, treat as binary audio
                res.set('Content-Type', 'audio/mpeg');
                res.send(responseBuffer);
            }
        }

    } catch (error) {
        console.error('Voice agent error:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            data: error.response?.data,
            timestamp: new Date().toISOString()
        });

        let statusCode = 500;
        let errorMessage = 'Failed to process voice request';

        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            statusCode = 504;
            errorMessage = 'Request timeout - please try again';
        } else if (error.code === 'ECONNRESET' || error.message.includes('socket hang up')) {
            statusCode = 502;
            errorMessage = 'Connection reset by N8N - check webhook configuration';
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

app.use((err, req, res, next) => {
    console.error('Server error:', err.message);
    res.status(500).json({
        error: 'Internal server error',
        message: isProduction ? 'Something went wrong' : err.message
    });
});

app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

process.on('SIGTERM', () => {
    console.log('Server shutting down');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Server shutting down');
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

