#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function testWebhook() {
    try {
        console.log('Testing N8n webhook connection...');

        if (!process.env.N8N_WEBHOOK_URL) {
            console.error('N8N_WEBHOOK_URL environment variable is not set!');
            console.log('Check your .env file');
            process.exit(1);
        }

        console.log(`Sending request to: ${process.env.N8N_WEBHOOK_URL}`);

        const fs = require('fs');
        let testData;

        try {
            if (fs.existsSync('./test-voice-input.json')) {
                testData = JSON.parse(fs.readFileSync('./test-voice-input.json', 'utf8'));
                console.log('Using real sample data');
            } else {
                testData = {
                    test: true,
                    message: "Connection test from Dunijet Pizza",
                    timestamp: new Date().toISOString(),
                    metadata: {
                        userAgent: "test-script",
                        source: "dunijet-pizza-site"
                    }
                };
                console.log('Using simple test data');
            }
        } catch (error) {
            console.error('Error reading sample file:', error.message);
            testData = {
                test: true,
                message: "Connection test from Dunijet Pizza",
                timestamp: new Date().toISOString()
            };
        }

        const response = await axios.post(process.env.N8N_WEBHOOK_URL, testData, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Dunijet-Pizza-Site-Test/1.0'
            },
            timeout: 10000
        });

        console.log('Connection successful!');
        console.log(`Status: ${response.status}`);
        console.log(`Response:`, response.data);

    } catch (error) {
        console.error('Connection error:');

        if (error.code === 'ECONNABORTED') {
            console.error('Connection timeout');
        } else if (error.response) {
            console.error(`Error status: ${error.response.status}`);
            console.error(`Details:`, error.response.data);
        } else {
            console.error(`Error: ${error.message}`);
        }

        process.exit(1);
    }
}

testWebhook();
