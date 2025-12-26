# پیتزا دانیجت - Dunijet Pizza

یک وب‌سایت تک‌صفحه‌ای مدرن برای رستوران پیتزا با طراحی شیشه‌ای (Glass Design) و دستیار صوتی هوشمند

## ✨ ویژگی‌ها

- 🎨 طراحی شیشه‌ای مدرن با افکت‌های پیشرفته
- 🎤 دستیار صوتی هوشمند با N8n
- 📱 طراحی ریسپانسیو برای موبایل و دسکتاپ
- 🚀 عملکرد بالا با بهینه‌سازی‌های پیشرفته
- 🔒 امنیت پیشرفته با Helmet و Rate Limiting
- 🐳 آماده‌سازی برای استقرار با Docker

## 🚀 شروع سریع

### پیش‌نیازها

- Node.js 18+
- Docker & Docker Compose (اختیاری)
- حساب N8n (برای دستیار صوتی)

### نصب و راه‌اندازی

1. **کلون کردن پروژه:**
   ```bash
   git clone <repository-url>
   cd dunijet-pizza
   ```

2. **نصب وابستگی‌ها:**
   ```bash
   npm install
   ```

3. **تنظیم دستیار صوتی N8n:**
   ```bash
   # فایل .env.template را کپی کنید
   cp .env.template .env

   # فایل .env را باز کنید و فقط N8N_WEBHOOK_URL را تغییر دهید
   N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id
   ```

   > ⚠️ **مهم:** فقط متغیر `N8N_WEBHOOK_URL` را تغییر دهید. سایر تنظیمات معمولاً نیازی به تغییر ندارند.

4. **راه‌اندازی سرور توسعه:**
   ```bash
   npm run dev
   ```

   وب‌سایت در `http://localhost:3000` قابل دسترسی خواهد بود.

## 🐳 استقرار با Docker

### روش ۱: Docker Compose (توصیه شده)

```bash
# برای محیط تولید
docker-compose up -d

# برای محیط توسعه
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

### روش ۲: Docker مستقیم

```bash
# ساخت ایمیج
docker build -t dunijet-pizza .

# اجرای کانتینر
docker run -d \
  --name dunijet-pizza-site \
  -p 3000:3000 \
  --env-file .env \
  dunijet-pizza
```

## 🔧 تنظیمات

### متغیرهای محیطی

| متغیر | توضیح | پیش‌فرض |
|--------|--------|----------|
| `PORT` | پورت سرور | `3000` |
| `NODE_ENV` | محیط اجرا | `development` |
| `N8N_WEBHOOK_URL` | آدرس webhook N8n | - |
| `SITE_NAME` | نام سایت | `پیتزا فروشی دانیجت` |

### تنظیمات امنیتی

- Rate limiting برای جلوگیری از حملات DDoS
- Helmet برای امنیت HTTP headers
- CORS برای کنترل دسترسی
- Compression برای کاهش حجم پاسخ‌ها

## 📁 ساختار پروژه

```
site_restaurant/
├── public/
│   ├── index.html          # صفحه اصلی
│   └── app.js             # منطق کلاینت
├── server.js              # سرور Express
├── package.json           # وابستگی‌ها
├── Dockerfile            # تنظیمات Docker
├── docker-compose.yml    # تنظیمات Docker Compose
├── nginx.conf           # تنظیمات Nginx (اختیاری)
└── .env                 # متغیرهای محیطی
```

## 🎤 راه‌اندازی دستیار صوتی N8n

برای راه‌اندازی کامل دستیار صوتی، فایل `N8N_SETUP_GUIDE.md` را مطالعه کنید.

**فایل‌های مرتبط:**
- `N8N_SETUP_GUIDE.md` - راهنمای کامل تنظیم N8n
- `n8n-workflow-example.json` - نمونه workflow آماده برای import
- `test-voice-input.json` - نمونه داده‌های ورودی برای تست

## 🎯 API Endpoints

### POST /api/voice-agent
ارسال درخواست‌های صوتی به N8n

**مثال درخواست:**
```json
{
  "audio": "base64-encoded-audio",
  "page_context": {
    "site_name": "پیتزا دانیجت",
    "current_page": "صفحه اصلی/منو",
    "pizzas": [
      {
        "name": "پیتزا مخصوص",
        "price": "۱۵۰,۰۰۰ تومان",
        "description": "توضیح پیتزا",
        "badges": ["محبوب", "خانوادگی"]
      }
    ]
  },
  "metadata": {
    "timestamp": "2024-01-01T12:00:00.000Z",
    "userAgent": "Mozilla/5.0...",
    "ip": "127.0.0.1"
  }
}
```

**پاسخ مورد انتظار:**
```json
{
  "success": true,
  "text_response": "پاسخ متنی دستیار",
  "audio_response": "data:audio/wav;base64,...", // اختیاری
  "error": "پیام خطا" // در صورت خطا
}
```

### GET /health
بررسی سلامت سرور

## 🔐 امنیت

- استفاده از HTTPS در محیط تولید
- Rate limiting برای API endpoints
- Validation ورودی‌ها
- Logging امن
- Headers امنیتی

## 📊 مانیتورینگ

- Health checks با Docker
- Logging با Morgan
- Error handling پیشرفته
- Performance monitoring

## 🚀 بهینه‌سازی عملکرد

- Gzip compression
- Static file caching
- Code splitting (در صورت نیاز)
- Image optimization
- CDN ready

## 🧪 تست

```bash
# تست اتصال به وب‌هوک N8n
npm test
# یا
npm run test:webhook

# بررسی کد
npm run lint
```

### تست دستیار صوتی

1. **تست وب‌هوک:**
   ```bash
   npm run test:webhook
   ```

2. **راه‌اندازی سرور:**
   ```bash
   npm run dev
   ```

3. **باز کردن مرورگر:**
   - آدرس: `http://localhost:3000`
   - دکمه دستیار صوتی را پیدا کنید
   - اجازه دسترسی به میکروفون را بدهید
   - شروع به صحبت کنید

## 📝 اسکریپت‌های مفید

```bash
# توسعه
npm run dev

# تولید
npm start

# Docker
npm run docker:build
npm run docker:run
npm run deploy
```

## 🤝 مشارکت

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 لایسنس

این پروژه تحت لایسنس MIT منتشر شده است.

## 📞 تماس

- وب‌سایت: https://dunijettizza.com
- ایمیل: info@dunijettizza.com
- تلفن: ۰۲۱-۱۲۳۴۵۶۷۸

## 🙏 قدردانی

- [Tailwind CSS](https://tailwindcss.com/) - برای استایل‌بندی
- [N8n](https://n8n.io/) - برای اتوماسیون و AI
- [Express.js](https://expressjs.com/) - برای سرور
- [Docker](https://docker.com/) - برای کانتینری‌سازی

---

⭐ اگر این پروژه را دوست داشتید، لطفا ستاره دهید!
