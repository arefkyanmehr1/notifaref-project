# NOTIFAREF - راهنمای استقرار (Deployment Guide)

## 📋 فهرست مطالب

1. [پیش‌نیازها](#پیش-نیازها)
2. [آماده‌سازی پروژه](#آماده-سازی-پروژه)
3. [استقرار Backend](#استقرار-backend)
4. [استقرار Frontend](#استقرار-frontend)
5. [تنظیمات محیط Production](#تنظیمات-محیط-production)
6. [تست نهایی](#تست-نهایی)
7. [نکات امنیتی](#نکات-امنیتی)

## 🔧 پیش‌نیازها

### حساب‌های مورد نیاز:
- [GitHub](https://github.com) - برای میزبانی کد
- [Cloudflare](https://cloudflare.com) - برای استقرار
- [MongoDB Atlas](https://mongodb.com/atlas) - برای دیتابیس (رایگان)
- [Gmail](https://gmail.com) - برای ارسال ایمیل (اختیاری)
- [Google Cloud Console](https://console.cloud.google.com) - برای تقویم گوگل (اختیاری)

### ابزارهای مورد نیاز:
- Node.js 16+ 
- Git
- npm یا yarn

## 🚀 آماده‌سازی پروژه

### 1. ایجاد Repository در GitHub

```bash
# ایجاد repository جدید در GitHub با نام notifaref
# سپس clone کنید:
git clone https://github.com/YOUR_USERNAME/notifaref.git
cd notifaref

# کپی کردن فایل‌های پروژه
# تمام فایل‌های پروژه را در این repository قرار دهید
```

### 2. ساختار پروژه

```
notifaref/
├── backend/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   └── server.js
├── frontend/
│   ├── css/
│   ├── js/
│   ├── icons/
│   ├── index.html
│   ├── dashboard.html
│   ├── profile.html
│   ├── shared.html
│   ├── manifest.json
│   └── sw.js
├── docs/
├── package.json
├── .env.template
└── README.md
```

## 🗄️ استقرار Backend

### گزینه 1: Cloudflare Workers (پیشنهادی)

#### مرحله 1: نصب Wrangler CLI
```bash
npm install -g wrangler
wrangler login
```

#### مرحله 2: ایجاد Worker
```bash
cd backend
wrangler init notifaref-api
```

#### مرحله 3: تنظیم wrangler.toml
```toml
name = "notifaref-api"
main = "server.js"
compatibility_date = "2024-01-01"

[env.production]
name = "notifaref-api"

[[env.production.kv_namespaces]]
binding = "NOTIFAREF_KV"
id = "your-kv-namespace-id"

[env.production.vars]
NODE_ENV = "production"
JWT_SECRET = "your-production-jwt-secret"
VAPID_PUBLIC_KEY = "your-vapid-public-key"
VAPID_PRIVATE_KEY = "your-vapid-private-key"
VAPID_SUBJECT = "mailto:your-email@domain.com"
```

#### مرحله 4: استقرار
```bash
wrangler deploy --env production
```

### گزینه 2: Render (جایگزین رایگان)

#### مرحله 1: اتصال GitHub
1. به [Render.com](https://render.com) بروید
2. حساب کاربری ایجاد کنید
3. GitHub repository خود را متصل کنید

#### مرحله 2: ایجاد Web Service
1. "New Web Service" را انتخاب کنید
2. Repository خود را انتخاب کنید
3. تنظیمات زیر را وارد کنید:
   - **Name**: notifaref-api
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: `backend`

#### مرحله 3: تنظیم متغیرهای محیط
در بخش Environment Variables:
```
NODE_ENV=production
JWT_SECRET=your-production-jwt-secret
MONGODB_URI=your-mongodb-atlas-connection-string
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@domain.com
BASE_URL=https://your-app-name.onrender.com
```

## 🌐 استقرار Frontend

### Cloudflare Pages (پیشنهادی)

#### مرحله 1: اتصال GitHub
1. به [Cloudflare Pages](https://pages.cloudflare.com) بروید
2. "Connect to Git" را کلیک کنید
3. GitHub repository خود را انتخاب کنید

#### مرحله 2: تنظیمات Build
- **Project name**: notifaref
- **Production branch**: main
- **Build command**: `echo "No build needed"`
- **Build output directory**: `frontend`
- **Root directory**: `/`

#### مرحله 3: تنظیم متغیرهای محیط
```
NODE_ENV=production
VITE_API_URL=https://your-backend-url.com
```

#### مرحله 4: تنظیم Custom Domain (اختیاری)
1. در تنظیمات Pages، بخش "Custom domains" را باز کنید
2. دامنه دلخواه خود را اضافه کنید

## 🗄️ تنظیم دیتابیس

### MongoDB Atlas (رایگان)

#### مرحله 1: ایجاد Cluster
1. به [MongoDB Atlas](https://mongodb.com/atlas) بروید
2. حساب رایگان ایجاد کنید
3. "Create a New Cluster" را کلیک کنید
4. گزینه M0 (رایگان) را انتخاب کنید

#### مرحله 2: تنظیم دسترسی
1. Database Access → Add New Database User
2. نام کاربری و رمز عبور ایجاد کنید
3. Network Access → Add IP Address → Allow Access from Anywhere (0.0.0.0/0)

#### مرحله 3: دریافت Connection String
1. Clusters → Connect → Connect your application
2. Connection string را کپی کنید
3. در متغیرهای محیط قرار دهید

## 🔐 تنظیمات امنیتی

### 1. تولید VAPID Keys
```bash
npx web-push generate-vapid-keys
```

### 2. تولید JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. تنظیم Google OAuth (اختیاری)
1. به [Google Cloud Console](https://console.cloud.google.com) بروید
2. پروژه جدید ایجاد کنید
3. Google Calendar API را فعال کنید
4. OAuth 2.0 credentials ایجاد کنید
5. Authorized redirect URIs را اضافه کنید

### 4. تنظیم Gmail App Password (اختیاری)
1. به تنظیمات Gmail بروید
2. 2-Step Verification را فعال کنید
3. App Password ایجاد کنید

## 📧 تنظیم ایمیل

### Gmail Configuration
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
EMAIL_FROM=NOTIFAREF <your-email@gmail.com>
```

### SendGrid (جایگزین)
```env
EMAIL_SERVICE=SendGrid
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
EMAIL_FROM=NOTIFAREF <noreply@yourdomain.com>
```

## 🔄 CI/CD با GitHub Actions

### ایجاد `.github/workflows/deploy.yml`

```yaml
name: Deploy NOTIFAREF

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npm test

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    - name: Deploy to Render
      # Add Render deployment steps

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    - name: Deploy to Cloudflare Pages
      uses: cloudflare/pages-action@v1
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        projectName: notifaref
        directory: frontend
```

## 🧪 تست استقرار

### 1. تست Local
```bash
# نصب dependencies
npm install

# راه‌اندازی دیتابیس محلی
# MongoDB یا SQLite

# راه‌اندازی سرور
npm start

# تست در مرورگر
# http://localhost:3000
```

### 2. تست Production
1. ثبت نام کاربر جدید
2. ایجاد یادآوری
3. تست اعلان‌ها
4. تست PWA installation
5. تست offline functionality

## 🔧 تنظیمات محیط Production

### Backend Environment Variables
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secure-jwt-secret-64-characters-long
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/notifaref
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@yourdomain.com
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM=NOTIFAREF <noreply@yourdomain.com>
BASE_URL=https://yourdomain.com
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend Environment Variables
```env
VITE_API_URL=https://your-backend-url.com
VITE_APP_NAME=NOTIFAREF
VITE_APP_VERSION=1.0.0
```

## 📱 تنظیمات PWA

### 1. آیکون‌ها
فایل‌های آیکون مورد نیاز:
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`
- `maskable-icon-192x192.png`
- `maskable-icon-512x512.png`

### 2. Service Worker
- فایل `sw.js` در root directory قرار دهید
- Cache strategy را بررسی کنید
- Push notification handling را تست کنید

## 🔍 مانیتورینگ و لاگ‌ها

### 1. Health Check
```
GET /health
```

### 2. لاگ‌های مهم
- Authentication errors
- Database connection issues
- Push notification failures
- API rate limiting

### 3. Metrics
- User registrations
- Active users
- Notification delivery rates
- PWA installation rates

## 🛠️ عیب‌یابی

### مشکلات رایج:

#### 1. Database Connection Failed
```bash
# بررسی connection string
# بررسی network access در MongoDB Atlas
# بررسی credentials
```

#### 2. Push Notifications Not Working
```bash
# بررسی VAPID keys
# بررسی HTTPS (required for push notifications)
# بررسی browser permissions
```

#### 3. PWA Not Installing
```bash
# بررسی manifest.json
# بررسی service worker registration
# بررسی HTTPS
# بررسی icon files
```

#### 4. CORS Errors
```bash
# بررسی CORS configuration در server
# بررسی domain whitelist
```

## 📊 بهینه‌سازی Performance

### 1. Frontend
- Minify CSS/JS files
- Optimize images
- Enable gzip compression
- Use CDN for static assets

### 2. Backend
- Database indexing
- API response caching
- Rate limiting
- Connection pooling

### 3. PWA
- Efficient caching strategy
- Background sync
- Offline functionality

## 🔒 نکات امنیتی

### 1. Environment Variables
- هرگز secrets را در کد commit نکنید
- از strong passwords استفاده کنید
- JWT secret را منظم تغییر دهید

### 2. Database Security
- Connection string را محرمانه نگه دارید
- Network access را محدود کنید
- Regular backups بگیرید

### 3. API Security
- Rate limiting فعال باشد
- Input validation
- HTTPS اجباری
- CORS properly configured

## 📈 مانیتورینگ

### 1. Uptime Monitoring
- [UptimeRobot](https://uptimerobot.com) (رایگان)
- [Pingdom](https://pingdom.com)

### 2. Error Tracking
- [Sentry](https://sentry.io) (رایگان برای پروژه‌های کوچک)
- [LogRocket](https://logrocket.com)

### 3. Analytics
- Google Analytics
- Cloudflare Analytics

## 🔄 بروزرسانی

### 1. Backend Updates
```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Restart service
# (depends on hosting platform)
```

### 2. Frontend Updates
```bash
# Cloudflare Pages automatically deploys on git push
git push origin main
```

### 3. Database Migrations
```bash
# Run any database migrations
# Update indexes if needed
```

## 📞 پشتیبانی

### لاگ‌های مفید:
- Server logs: `/var/log/notifaref/`
- Database logs: MongoDB Atlas dashboard
- CDN logs: Cloudflare dashboard

### ابزارهای Debug:
- Browser DevTools
- Network tab for API calls
- Application tab for PWA features
- Console for JavaScript errors

---

## 🎯 چک‌لیست نهایی

- [ ] Backend deployed and running
- [ ] Frontend deployed and accessible
- [ ] Database connected and working
- [ ] Environment variables configured
- [ ] HTTPS enabled
- [ ] Push notifications working
- [ ] PWA installable
- [ ] Email notifications working (if configured)
- [ ] Google Calendar integration working (if configured)
- [ ] 2FA working
- [ ] All features tested
- [ ] Performance optimized
- [ ] Security measures in place
- [ ] Monitoring setup
- [ ] Backup strategy implemented

## 📧 تماس

برای سوالات و پشتیبانی:
- GitHub Issues: [Repository Issues](https://github.com/YOUR_USERNAME/notifaref/issues)
- Email: support@yourdomain.com

---

**نکته**: این راهنما برای استقرار production طراحی شده است. برای development، از تنظیمات ساده‌تر استفاده کنید.