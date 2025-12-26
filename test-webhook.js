#!/usr/bin/env node

/**
 * تست سریع وب‌هوک N8n
 * این اسکریپت برای تست اتصال به وب‌هوک شما استفاده می‌شود
 */

require('dotenv').config();
const axios = require('axios');

async function testWebhook() {
    try {
        console.log('🔄 تست اتصال به وب‌هوک N8n...');

        if (!process.env.N8N_WEBHOOK_URL) {
            console.error('❌ متغیر N8N_WEBHOOK_URL تنظیم نشده است!');
            console.log('📝 فایل .env را بررسی کنید');
            process.exit(1);
        }

        console.log(`📡 ارسال درخواست به: ${process.env.N8N_WEBHOOK_URL}`);

        // استفاده از داده‌های نمونه واقعی
        const fs = require('fs');
        let testData;

        try {
            // اگر فایل نمونه وجود دارد از آن استفاده کن
            if (fs.existsSync('./test-voice-input.json')) {
                testData = JSON.parse(fs.readFileSync('./test-voice-input.json', 'utf8'));
                console.log('📄 استفاده از داده‌های نمونه واقعی');
            } else {
                // در غیر این صورت از داده‌های ساده استفاده کن
                testData = {
                    test: true,
                    message: "تست اتصال از پیتزا دانیجت",
                    timestamp: new Date().toISOString(),
                    metadata: {
                        userAgent: "test-script",
                        source: "dunijet-pizza-site"
                    }
                };
                console.log('📝 استفاده از داده‌های تست ساده');
            }
        } catch (error) {
            console.error('❌ خطا در خواندن فایل نمونه:', error.message);
            testData = {
                test: true,
                message: "تست اتصال از پیتزا دانیجت",
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

        console.log('✅ اتصال موفق!');
        console.log(`📊 وضعیت: ${response.status}`);
        console.log(`📝 پاسخ:`, response.data);

    } catch (error) {
        console.error('❌ خطا در اتصال:');

        if (error.code === 'ECONNABORTED') {
            console.error('⏱️  زمان اتصال تمام شد');
        } else if (error.response) {
            console.error(`📊 وضعیت خطا: ${error.response.status}`);
            console.error(`📝 جزئیات:`, error.response.data);
        } else {
            console.error(`💥 خطا: ${error.message}`);
        }

        process.exit(1);
    }
}

// اجرای تست
testWebhook();
