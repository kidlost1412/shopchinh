# TikTok Shop Dashboard

Dashboard quản lý đơn hàng TikTok Shop với báo cáo tài chính chi tiết.

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/kidlost1412/shopchinh.git
cd shopchinh
```

### 2. Cài đặt Dependencies
```bash
npm run install:all
```

### 3. Cấu hình Environment Variables

**Server (.env trong thư mục server/):**
```bash
GOOGLE_SHEET_ID=your_google_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email_here
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----"
```

**Client (.env trong thư mục client/):**
```bash
# For local development
VITE_API_BASE_URL=http://localhost:3001/api

# For production (sau khi deploy)
# VITE_API_BASE_URL=https://your-vercel-domain.vercel.app/api
```

### 4. Chạy Development
```bash
npm run dev
```

## 🚀 Deploy lên Vercel

### Bước 1: Push lên GitHub (đã hoàn thành)

### Bước 2: Deploy lên Vercel

### Bước 2: Deploy lên Vercel

1. **Đăng nhập Vercel** tại [vercel.com](https://vercel.com)
2. **Click "New Project"**
3. **Import từ GitHub** - chọn repository vừa tạo
4. **Cấu hình Environment Variables:**
   ```
   SPREADSHEET_ID=your_google_sheet_id
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
   GOOGLE_PRIVATE_KEY=your_private_key
   ```
5. **Click "Deploy"**

### Bước 3: Cập nhật Frontend API URL

Sau khi deploy, cập nhật `client/.env`:
```
VITE_API_BASE_URL=https://your-vercel-domain.vercel.app/api
```

## 🔧 Development

```bash
# Cài đặt dependencies
npm run install:all

# Chạy development
npm run dev

# Build production
npm run build
```

## 📁 Cấu trúc dự án

```
├── client/          # React frontend
├── server/          # Node.js backend
├── vercel.json      # Cấu hình Vercel
└── package.json     # Scripts chính
```

## 🌐 API Endpoints

- `GET /api/orders` - Lấy danh sách đơn hàng
- `GET /api/finance/report` - Báo cáo tài chính
- `GET /api/orders/:id` - Chi tiết đơn hàng

## 📊 Tính năng

- **Dashboard**: Quản lý đơn hàng theo trạng thái
- **Finance Report**: Báo cáo tài chính chi tiết
- **Smart Column Detection**: Tự động phát hiện cột
- **Excel Export**: Xuất báo cáo Excel
- **Responsive Design**: Tối ưu mobile & desktop
