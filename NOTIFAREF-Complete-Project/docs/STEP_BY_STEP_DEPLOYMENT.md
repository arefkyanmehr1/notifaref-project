# 🚀 راهنمای گام به گام استقرار NOTIFAREF

## 📋 مراحل کلی

1. [آماده‌سازی Repository](#1-آماده-سازی-repository)
2. [تنظیم دیتابیس](#2-تنظیم-دیتابیس)
3. [استقرار Backend](#3-استقرار-backend)
4. [استقرار Frontend](#4-استقرار-frontend)
5. [تنظیمات نهایی](#5-تنظیمات-نهایی)
6. [تست و راه‌اندازی](#6-تست-و-راه-اندازی)

---

## 1. آماده‌سازی Repository

### مرحله 1.1: ایجاد GitHub Repository
```bash
# 1. به GitHub.com بروید
# 2. "New Repository" کلیک کنید
# 3. نام: notifaref
# 4. Description: Smart Persian Reminder System with PWA Support
# 5. Public یا Private انتخاب کنید
# 6. "Create Repository" کلیک کنید
```

### مرحله 1.2: آپلود کد
```bash
# Clone repository خالی
git clone https://github.com/YOUR_USERNAME/notifaref.git
cd notifaref

# کپی تمام فایل‌های پروژه به این پوشه
# (تمام محتویات پوشه notifaref که ساختیم)

# Add و commit
git add .
git commit -m "Initial commit: Complete NOTIFAREF application"
git push origin main
```

---

## 2. تنظیم دیتابیس

### مرحله 2.1: MongoDB Atlas (رایگان)

#### قدم 1: ایجاد حساب
1. به [MongoDB Atlas](https://mongodb.com/atlas) بروید
2. "Try Free" کلیک کنید
3. حساب ایجاد کنید

#### قدم 2: ایجاد Cluster
1. "Create a New Cluster" کلیک کنید
2. **Cloud Provider**: AWS
3. **Region**: انتخاب نزدیک‌ترین منطقه
4. **Cluster Tier**: M0 Sandbox (رایگان)
5. **Cluster Name**: notifaref-cluster
6. "Create Cluster" کلیک کنید

#### قدم 3: تنظیم دسترسی
```bash
# Database Access:
1. "Database Access" → "Add New Database User"
2. Username: notifaref_user
3. Password: یک رمز قوی تولید کنید
4. Database User Privileges: "Read and write to any database"
5. "Add User" کلیک کنید

# Network Access:
1. "Network Access" → "Add IP Address"
2. "Allow Access from Anywhere" (0.0.0.0/0)
3. "Confirm" کلیک کنید
```

#### قدم 4: دریافت Connection String
```bash
1. "Clusters" → "Connect" → "Connect your application"
2. Driver: Node.js
3. Version: 4.1 or later
4. Connection string را کپی کنید:
   mongodb+srv://notifaref_user:<password>@notifaref-cluster.xxxxx.mongodb.net/notifaref?retryWrites=true&w=majority
```

---

## 3. استقرار Backend

### گزینه A: Render.com (پیشنهادی - رایگان)

#### مرحله 3.1: ایجاد حساب
1. به [Render.com](https://render.com) بروید
2. "Get Started for Free" کلیک کنید
3. با GitHub وارد شوید

#### مرحله 3.2: ایجاد Web Service
```bash
1. "New" → "Web Service"
2. GitHub repository خود را انتخاب کنید
3. تنظیمات:
   - Name: notifaref-api
   - Environment: Node
   - Region: انتخاب نزدیک‌ترین
   - Branch: main
   - Root Directory: backend
   - Build Command: npm install
   - Start Command: npm start
```

#### مرحله 3.3: تنظیم Environment Variables
```env
NODE_ENV=production
JWT_SECRET=your-super-secure-64-character-jwt-secret
MONGODB_URI=mongodb+srv://notifaref_user:YOUR_PASSWORD@notifaref-cluster.xxxxx.mongodb.net/notifaref
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:your-email@yourdomain.com
BASE_URL=https://notifaref-api.onrender.com
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### مرحله 3.4: تولید VAPID Keys
```bash
# در terminal محلی:
npx web-push generate-vapid-keys

# خروجی:
# Public Key: BEl62iUYgUivxIkv69yViEuiBIa40HI6DuAp4wJKfQkF4ZKPcK3P1FX1JWd_mbaUzPXhLyqHDbxRLjfK6_CyqiA
# Private Key: nGzcGpvIjrH6akUdKsO9qbC_OUxVxQOaOmHnNRcKXWM
```

#### مرحله 3.5: Deploy
```bash
1. "Create Web Service" کلیک کنید
2. منتظر بمانید تا build تمام شود
3. URL سرویس را یادداشت کنید: https://notifaref-api.onrender.com
```

### گزینه B: Cloudflare Workers

#### مرحله 3.1: نصب Wrangler
```bash
npm install -g wrangler
wrangler login
```

#### مرحله 3.2: تنظیم Worker
```bash
cd backend
wrangler init notifaref-api --yes
```

#### مرحله 3.3: تنظیم wrangler.toml
```toml
name = "notifaref-api"
main = "server.js"
compatibility_date = "2024-01-01"

[vars]
NODE_ENV = "production"
BASE_URL = "https://notifaref-api.your-subdomain.workers.dev"

[[kv_namespaces]]
binding = "NOTIFAREF_KV"
id = "your-kv-namespace-id"
```

#### مرحله 3.4: استقرار
```bash
wrangler deploy
```

---

## 4. استقرار Frontend

### Cloudflare Pages (پیشنهادی)

#### مرحله 4.1: اتصال Repository
```bash
1. به [Cloudflare Pages](https://pages.cloudflare.com) بروید
2. "Create a project" کلیک کنید
3. "Connect to Git" انتخاب کنید
4. GitHub repository خود را انتخاب کنید
```

#### مرحله 4.2: تنظیمات Build
```bash
Project name: notifaref
Production branch: main
Build command: echo "No build needed for vanilla JS"
Build output directory: frontend
Root directory: (خالی بگذارید)
```

#### مرحله 4.3: تنظیم Environment Variables
```env
NODE_ENV=production
API_BASE_URL=https://notifaref-api.onrender.com
```

#### مرحله 4.4: Deploy
```bash
1. "Save and Deploy" کلیک کنید
2. منتظر بمانید تا deployment تمام شود
3. URL اپلیکیشن را یادداشت کنید: https://notifaref.pages.dev
```

---

## 5. تنظیمات نهایی

### مرحله 5.1: بروزرسانی CORS
Backend `.env` را بروزرسانی کنید:
```env
FRONTEND_URL=https://notifaref.pages.dev
```

### مرحله 5.2: بروزرسانی API URL
Frontend JavaScript files را بروزرسانی کنید:
```javascript
// در api.js
this.baseURL = 'https://notifaref-api.onrender.com';
```

### مرحله 5.3: تنظیم Custom Domain (اختیاری)
```bash
# Cloudflare Pages:
1. "Custom domains" → "Set up a custom domain"
2. دامنه خود را وارد کنید
3. DNS records را تنظیم کنید

# Render:
1. Settings → Custom Domains
2. دامنه خود را اضافه کنید
```

---

## 6. تست و راه‌اندازی

### مرحله 6.1: تست اولیه
```bash
# 1. به URL اپلیکیشن بروید
https://notifaref.pages.dev

# 2. Health check API:
https://notifaref-api.onrender.com/health

# 3. بررسی console برای errors
```

### مرحله 6.2: تست عملکردها
```bash
✅ ثبت نام کاربر جدید
✅ ورود به حساب
✅ ایجاد یادآوری
✅ دریافت اعلان (اگر VAPID تنظیم شده)
✅ تست PWA installation
✅ تست offline functionality
✅ تغییر زبان و تم
✅ تست responsive design
```

### مرحله 6.3: تنظیمات اختیاری

#### Google Calendar Integration
```bash
1. Google Cloud Console → New Project
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs:
   - https://notifaref-api.onrender.com/auth/google/callback
5. Environment variables را بروزرسانی کنید:
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
```

#### Email Notifications
```bash
1. Gmail → Account Settings → Security
2. Enable 2-Step Verification
3. Generate App Password
4. Environment variables:
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-character-app-password
```

---

## 🔧 عیب‌یابی

### مشکلات رایج:

#### 1. "Cannot connect to database"
```bash
✅ بررسی MONGODB_URI
✅ بررسی network access در Atlas
✅ بررسی username/password
✅ بررسی database name
```

#### 2. "CORS Error"
```bash
✅ بررسی FRONTEND_URL در backend
✅ بررسی API_BASE_URL در frontend
✅ بررسی CORS configuration
```

#### 3. "Push notifications not working"
```bash
✅ بررسی VAPID keys
✅ بررسی HTTPS (required)
✅ بررسی browser permissions
✅ بررسی service worker registration
```

#### 4. "PWA not installing"
```bash
✅ بررسی manifest.json
✅ بررسی service worker
✅ بررسی HTTPS
✅ بررسی icon files
```

### لاگ‌های مفید:
```bash
# Backend logs (Render):
Dashboard → Logs

# Frontend logs:
Browser DevTools → Console

# Database logs:
MongoDB Atlas → Monitoring
```

---

## 📊 مانیتورینگ

### 1. Health Monitoring
```bash
# Setup uptime monitoring:
- UptimeRobot (رایگان)
- Pingdom
- StatusCake

# URLs to monitor:
- https://notifaref.pages.dev
- https://notifaref-api.onrender.com/health
```

### 2. Error Tracking
```bash
# Sentry.io (رایگان برای پروژه‌های کوچک):
1. حساب ایجاد کنید
2. Project ایجاد کنید
3. DSN را در environment variables اضافه کنید
```

### 3. Analytics
```bash
# Google Analytics:
1. GA4 property ایجاد کنید
2. Tracking code را به HTML اضافه کنید

# Cloudflare Analytics:
- Automatically available در dashboard
```

---

## 🔐 نکات امنیتی

### 1. Secrets Management
```bash
❌ هرگز secrets را در کد commit نکنید
✅ از environment variables استفاده کنید
✅ .env را در .gitignore قرار دهید
✅ منظم secrets را تغییر دهید
```

### 2. Database Security
```bash
✅ Strong passwords
✅ Network access restrictions
✅ Regular backups
✅ Connection encryption
```

### 3. API Security
```bash
✅ Rate limiting enabled
✅ Input validation
✅ HTTPS everywhere
✅ CORS properly configured
✅ JWT expiration times
```

---

## 📱 PWA Optimization

### 1. Performance
```bash
✅ Minify CSS/JS
✅ Optimize images
✅ Enable compression
✅ Cache static assets
```

### 2. Offline Support
```bash
✅ Service worker caching
✅ Background sync
✅ Offline fallbacks
✅ Cache management
```

### 3. Installation
```bash
✅ Manifest.json complete
✅ Icons all sizes
✅ Install prompts
✅ Shortcuts configured
```

---

## 🎯 چک‌لیست نهایی

### Pre-Launch
- [ ] کد در GitHub آپلود شده
- [ ] Database setup و accessible
- [ ] Environment variables تنظیم شده
- [ ] VAPID keys تولید شده
- [ ] SSL certificates فعال

### Backend Deployment
- [ ] Backend deployed successfully
- [ ] Health endpoint responding
- [ ] Database connected
- [ ] API endpoints working
- [ ] Authentication working

### Frontend Deployment
- [ ] Frontend deployed successfully
- [ ] Static files serving
- [ ] API calls working
- [ ] PWA manifest valid
- [ ] Service worker registered

### Features Testing
- [ ] User registration/login
- [ ] Reminder CRUD operations
- [ ] Push notifications
- [ ] Email notifications (if configured)
- [ ] PWA installation
- [ ] Offline functionality
- [ ] Theme switching
- [ ] Language switching
- [ ] Google Calendar (if configured)
- [ ] 2FA (if enabled)

### Performance & Security
- [ ] HTTPS enabled
- [ ] CORS configured
- [ ] Rate limiting active
- [ ] Error handling working
- [ ] Monitoring setup
- [ ] Backup strategy

---

## 🆘 راهنمای سریع عیب‌یابی

### اگر سایت باز نمی‌شود:
1. بررسی کنید deployment موفق بوده
2. DNS propagation چک کنید (24 ساعت طول می‌کشد)
3. Browser cache را clear کنید

### اگر API کار نمی‌کند:
1. Backend logs را بررسی کنید
2. Database connection را چک کنید
3. Environment variables را تأیید کنید

### اگر اعلان‌ها کار نمی‌کند:
1. HTTPS فعال باشد
2. VAPID keys صحیح باشد
3. Browser permissions داده شده باشد

---

## 📞 پشتیبانی

### منابع کمکی:
- [Render Documentation](https://render.com/docs)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [Web Push Protocol](https://web.dev/push-notifications/)

### Community:
- GitHub Issues برای باگ‌ها
- GitHub Discussions برای سوالات
- Stack Overflow با تگ `notifaref`

---

**🎉 تبریک! NOTIFAREF شما آماده استفاده است!**

پس از تکمیل این مراحل، اپلیکیشن شما:
- ✅ در دسترس عموم قرار دارد
- ✅ PWA قابل نصب است
- ✅ اعلان‌های push ارسال می‌کند
- ✅ offline کار می‌کند
- ✅ امن و بهینه است

**URL نهایی شما**: `https://notifaref.pages.dev`