# NOTIFAREF - سیستم یادآوری هوشمند

<div align="center">

![NOTIFAREF Logo](frontend/icons/icon-192x192.png)

**سیستم یادآوری هوشمند با پشتیبانی کامل از PWA، اعلان‌های وب، و همگام‌سازی تقویم**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![Persian Support](https://img.shields.io/badge/Persian-Supported-blue)](https://github.com/YOUR_USERNAME/notifaref)

[🌐 Demo](https://3000-74f0e09b-d9d9-413f-842f-cbfa157bf449.proxy.daytona.works) • [📖 مستندات](docs/DEPLOYMENT.md) • [🐛 گزارش باگ](https://github.com/YOUR_USERNAME/notifaref/issues)

</div>

## ✨ ویژگی‌های کلیدی

### 🔔 سیستم اعلان‌های پیشرفته
- **اعلان‌های وب**: دریافت اعلان‌های فوری در مرورگر با VAPID
- **ایمیل پشتیبان**: ارسال ایمیل در صورت عدم دریافت اعلان وب
- **اولویت‌بندی**: چهار سطح اولویت (پایین، متوسط، بالا، فوری)
- **اقدامات سریع**: تکمیل یا به تعویق انداختن از روی اعلان

### 📅 مدیریت یادآوری‌های هوشمند
- **یادآوری‌های تکراری**: روزانه، هفتگی، ماهانه، سالانه
- **برچسب‌گذاری**: دسته‌بندی با برچسب‌های قابل تنظیم
- **جستجو و فیلتر**: جستجوی پیشرفته با فیلترهای متعدد
- **اشتراک‌گذاری**: اشتراک یادآوری‌ها با لینک امن

### 🗓️ همگام‌سازی تقویم گوگل
- **OAuth2 Integration**: اتصال امن به تقویم گوگل
- **دو طرفه Sync**: همگام‌سازی یادآوری‌ها با تقویم
- **Import/Export**: وارد کردن رویدادهای تقویم

### 📊 آمار و گزارش‌گیری
- **داشبورد تحلیلی**: نمودارهای تعاملی با Chart.js
- **آمار عملکرد**: نرخ تکمیل، روند استفاده، تحلیل برچسب‌ها
- **Export داده**: خروجی JSON و CSV

### 🔐 امنیت پیشرفته
- **احراز هویت دو مرحله‌ای**: TOTP با Google Authenticator
- **JWT Authentication**: نشست‌های امن
- **Rate Limiting**: محافظت در برابر حملات
- **Password Hashing**: bcrypt با salt

### 🌐 PWA کامل
- **قابلیت نصب**: روی Desktop، Android، iOS
- **Offline Support**: کار بدون اینترنت
- **Background Sync**: همگام‌سازی خودکار
- **App Shortcuts**: دسترسی سریع به عملکردها

### 🌍 چندزبانه و RTL
- **فارسی/انگلیسی**: پشتیبانی کامل از دو زبان
- **RTL Support**: طراحی مناسب برای فارسی
- **تم‌های متعدد**: حالت روشن و تیره

## 🚀 نصب و راه‌اندازی

### پیش‌نیازها
- Node.js 16+
- MongoDB یا SQLite
- Git

### نصب سریع
```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/notifaref.git
cd notifaref

# نصب dependencies
npm install

# کپی تنظیمات محیط
cp .env.template .env

# ویرایش .env با تنظیمات خود
nano .env

# راه‌اندازی سرور
npm start
```

### تنظیمات اولیه

#### 1. تولید VAPID Keys
```bash
npx web-push generate-vapid-keys
```

#### 2. تنظیم دیتابیس
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/notifaref

# یا SQLite (ساده‌تر)
DATABASE_TYPE=sqlite
DATABASE_PATH=./database/notifaref.db
```

#### 3. تنظیم JWT Secret
```env
JWT_SECRET=your-super-secure-secret-key
```

## 📱 استفاده

### 1. ثبت نام و ورود
- ایجاد حساب کاربری با ایمیل و رمز عبور
- ورود با نام کاربری یا ایمیل
- فعال‌سازی 2FA (اختیاری)

### 2. مدیریت یادآوری‌ها
- افزودن یادآوری با عنوان، توضیحات، زمان
- تنظیم اولویت و برچسب‌ها
- ایجاد یادآوری‌های تکراری

### 3. دریافت اعلان‌ها
- فعال‌سازی اعلان‌های مرورگر
- تنظیم ایمیل پشتیبان
- تست سیستم اعلان‌ها

### 4. همگام‌سازی تقویم
- اتصال به حساب گوگل
- همگام‌سازی یادآوری‌ها
- وارد کردن رویدادهای موجود

## 🏗️ معماری

### Backend (Node.js + Express)
```
backend/
├── models/          # Mongoose schemas
├── routes/          # API endpoints
├── services/        # Business logic
├── middleware/      # Custom middleware
└── server.js        # Main server file
```

### Frontend (Vanilla JS)
```
frontend/
├── css/            # Stylesheets
├── js/             # JavaScript modules
├── icons/          # PWA icons
├── *.html          # HTML pages
├── manifest.json   # PWA manifest
└── sw.js          # Service worker
```

### Database Schema
- **Users**: اطلاعات کاربری، تنظیمات، امنیت
- **Reminders**: یادآوری‌ها، تکرار، اعلان‌ها
- **Sessions**: مدیریت نشست‌ها

## 🔧 API Documentation

### Authentication
```http
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
PUT  /api/auth/profile
POST /api/auth/change-password
POST /api/auth/2fa/setup
POST /api/auth/2fa/verify
POST /api/auth/2fa/disable
```

### Reminders
```http
GET    /api/reminders
POST   /api/reminders
GET    /api/reminders/:id
PUT    /api/reminders/:id
DELETE /api/reminders/:id
PATCH  /api/reminders/:id/status
PATCH  /api/reminders/:id/snooze
POST   /api/reminders/:id/share
```

### Notifications
```http
GET  /api/notifications/vapid-key
POST /api/notifications/subscribe
DELETE /api/notifications/unsubscribe
GET  /api/notifications/settings
PUT  /api/notifications/settings
POST /api/notifications/test
```

### Calendar Integration
```http
GET  /api/calendar/status
GET  /api/calendar/auth-url
POST /api/calendar/callback
DELETE /api/calendar/disconnect
POST /api/calendar/sync-reminder/:id
POST /api/calendar/import
```

### Analytics
```http
GET /api/analytics/dashboard
GET /api/analytics/trends
GET /api/analytics/performance
GET /api/analytics/tags
GET /api/analytics/export
```

## 🧪 تست

### تست Manual
```bash
# راه‌اندازی سرور development
npm run dev

# باز کردن در مرورگر
open http://localhost:3000
```

### تست Features
1. **ثبت نام**: ایجاد حساب جدید
2. **ورود**: ورود با credentials
3. **یادآوری**: ایجاد، ویرایش، حذف
4. **اعلان‌ها**: تست push notifications
5. **PWA**: نصب روی دستگاه
6. **Offline**: تست عملکرد آفلاین
7. **تقویم**: اتصال به گوگل
8. **2FA**: فعال‌سازی احراز هویت دو مرحله‌ای

## 🤝 مشارکت

### نحوه مشارکت
1. Fork کنید
2. Feature branch ایجاد کنید (`git checkout -b feature/amazing-feature`)
3. تغییرات را commit کنید (`git commit -m 'Add amazing feature'`)
4. Push کنید (`git push origin feature/amazing-feature`)
5. Pull Request ایجاد کنید

### کدنویسی Standards
- ESLint configuration
- Prettier formatting
- JSDoc comments
- Persian comments در کد

## 📄 مجوز

این پروژه تحت مجوز MIT منتشر شده است. فایل [LICENSE](LICENSE) را برای جزئیات بیشتر مطالعه کنید.

## 🙏 تشکر

### تکنولوژی‌های استفاده شده
- [Node.js](https://nodejs.org/) - Backend runtime
- [Express.js](https://expressjs.com/) - Web framework
- [MongoDB](https://mongodb.com/) - Database
- [Mongoose](https://mongoosejs.com/) - ODM
- [Web Push](https://github.com/web-push-libs/web-push) - Push notifications
- [Chart.js](https://chartjs.org/) - Charts and analytics
- [Speakeasy](https://github.com/speakeasyjs/speakeasy) - 2FA
- [Passport.js](http://passportjs.org/) - Authentication
- [Nodemailer](https://nodemailer.com/) - Email sending

### منابع الهام
- [PWA Best Practices](https://web.dev/pwa/)
- [Material Design](https://material.io/)
- [Persian Web Design Guidelines](https://github.com/persian-web-design)

## 📊 آمار پروژه

- **خطوط کد**: ~3000+ lines
- **فایل‌ها**: 25+ files
- **ویژگی‌ها**: 15+ major features
- **زبان‌ها**: فارسی، انگلیسی
- **پلتفرم‌ها**: Web, Desktop PWA, Mobile PWA

## 🔮 نقشه راه

### نسخه 1.1
- [ ] تقویم شمسی
- [ ] ویجت دسکتاپ
- [ ] API موبایل
- [ ] تم‌های بیشتر

### نسخه 1.2
- [ ] اشتراک‌گذاری تیمی
- [ ] یادآوری‌های مکان‌محور
- [ ] AI suggestions
- [ ] Voice reminders

---

<div align="center">

**ساخته شده با ❤️ برای جامعه فارسی‌زبان**

[⭐ Star](https://github.com/YOUR_USERNAME/notifaref) • [🍴 Fork](https://github.com/YOUR_USERNAME/notifaref/fork) • [📢 Share](https://twitter.com/intent/tweet?text=Check%20out%20NOTIFAREF%20-%20Smart%20Persian%20Reminder%20System)

</div>