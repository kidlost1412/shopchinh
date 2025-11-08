# 📊 TÀI LIỆU LOGIC TÍNH TOÁN FINANCE - TIKTOK SHOP

## 🎯 TỔNG QUAN

Finance Report tính toán dựa trên dữ liệu từ Google Sheets (PosSheets) và sheet "rutve" để hiển thị báo cáo tài chính chi tiết.

---

## 📁 NGUỒN DỮ LIỆU

### 1. **PosSheets (Sheet chính)**
- **File CSV**: `shopbo - PosSheets(mẫu mới nhất).csv`
- **Cấu trúc**: 32 cột (A-AF)
- **Dữ liệu**: Thông tin đơn hàng TikTok Shop

### 2. **Rutve Sheet**
- **Sheet**: `rutve` trong Google Sheets
- **Dữ liệu**: Quảng cáo (advertising) và Rút tiền (withdrawals)

---

## 🔄 QUY TRÌNH XỬ LÝ DỮ LIỆU

### **Bước 1: Đọc và Parse CSV** (`dataProcessor.js`)

#### **Mapping cột CSV → Object Order**

| Cột CSV | Tên cột | Field trong Order | Mô tả |
|---------|---------|-------------------|-------|
| A | ID | `id` | Mã đơn hàng |
| B | Mã vận đơn | `trackingNumber` | Mã vận đơn |
| C | Trạng thái | `status` | Trạng thái đơn (Đã nhận, Đã giao hàng, etc.) |
| D | Sản phẩm | `productName` | Tên sản phẩm |
| E | Số lượng | `quantity` | Số lượng |
| F | Đơn giá | `unitPrice` | Đơn giá |
| G | Giảm giá | `discount` | Giảm giá |
| H | Ngày tạo đơn | `orderDate` | Ngày tạo |
| I | Ngày cập nhật | `updateDate` | Ngày cập nhật |
| J | Tỉnh thành phố | `province` | Tỉnh/TP |
| K | Ngày giờ đẩy đơn sang đvvc | `shippingDate` | Ngày giao cho ĐVVC |
| L | Thẻ | `tags` | Tags |
| M | Ảnh SP | `productImage` | Link ảnh |
| N | Doanh thu chưa trừ phí sàn | `revenue` | Doanh thu gốc |
| O | Tiền thanh toán thực tế | `actualPayment` | Tiền thực tế |
| P | Tổng phí đối soát | `reconciliationFee` | Phí đối soát |
| Q | Sàn trợ giá | `platformSubsidy` | Sàn trợ giá |
| R | khác | `otherFee` | Phí khác |
| S | phí aff | `affFee` | **Phí Affiliate** |
| T | tên aff | `affName` | Tên Affiliate |
| U | tiền spf ship | `shippingFee` | **Phí vận chuyển SPF** |
| V | tiền thực nhận | `actualReceived` | **Tiền thực nhận** |
| W | tiền ship shop chịu | `shopShippingFee` | **Phí VC Shop chịu** |
| X | phí giao dịch | `transactionFee` | Phí giao dịch |
| Y | phí hoa hồng tiktok shop | `tiktokCommission` | Hoa hồng TikTok |
| Z | Phí 9% thực tế | `actualFee9` | **Phí sàn 9%** |
| AA | phí xtra | `xtraFee` | **Phí Xtra** |
| AB | phí flash sale | `flashSaleFee` | **Phí Flash Sale** |
| AC | ghi chú | `notes` | Ghi chú |
| AD | thuế | `tax` | **Thuế** |
| AE | phí tiktok bù | `tiktokSubsidy` | **Phí TikTok bù** |
| AF | Phí xử lý đơn hàng | `orderProcessingFee` | **Phí xử lý đơn hàng** (MỚI) |

#### **Parse Number Logic**
```javascript
parseNumber(value) {
  if (!value || value === '') return 0;
  
  // Remove non-numeric characters except minus and dot
  const cleanValue = String(value).replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleanValue);
  
  return isNaN(parsed) ? 0 : parsed;
}
```

---

## 💰 TÍNH TOÁN CHI TIẾT

### **1. LỌC ĐỐN HÀNG THEO THỜI GIAN**

```javascript
// File: TikTokFinanceProcessor.js - filterOrdersByDate()
const filteredOrders = orders.filter(order => {
  const orderDate = new Date(order.shippingDate); // Dùng ngày đẩy ĐVVC (cột K)
  return orderDate >= startDate && orderDate <= endDate;
});
```

**Lưu ý**: Dùng `shippingDate` (Ngày đẩy ĐVVC) làm chuẩn, không dùng `orderDate`.

---

### **2. LỌC ĐƠN HÀNG "ĐÃ NHẬN"**

```javascript
// File: TikTokFinanceProcessor.js - calculateTotalReceivedRevenue()
const receivedOrders = filteredOrders.filter(order => 
  order.status === 'Đã nhận'
);
```

**Chỉ tính các đơn có trạng thái = "Đã nhận"**

---

### **3. TÍNH TỔNG DOANH THU ĐÃ NHẬN**

```javascript
// File: TikTokFinanceProcessor.js
const totalReceivedRevenue = receivedOrders.reduce((sum, order) => {
  return sum + (parseFloat(order.actualReceived) || 0); // Cột V: tiền thực nhận
}, 0);
```

**Công thức:**
```
Tổng Doanh Thu Đã Nhận = Σ (tiền thực nhận) của các đơn "Đã nhận"
                       = Σ (Cột V)
```

---

### **4. TÍNH CHI PHÍ SÀN (PLATFORM COSTS)**

#### **4.1. Chi tiết từng loại phí**

```javascript
// File: TikTokFinanceProcessor.js - calculateTotalPlatformCosts()
const costBreakdown = {
  // 1. Phí Affiliate (Cột S)
  affFee: Math.abs(receivedOrders.reduce((sum, order) => 
    sum + (parseFloat(order.affFee) || 0), 0
  )),
  
  // 2. Phí Vận Chuyển SPF (Cột U)
  shippingFee: Math.abs(receivedOrders.reduce((sum, order) => 
    sum + (parseFloat(order.shippingFee) || 0), 0
  )),
  
  // 3. Phí VC Shop Chịu (Cột W)
  shopShippingFee: Math.abs(receivedOrders.reduce((sum, order) => 
    sum + (parseFloat(order.shopShippingFee) || 0), 0
  )),
  
  // 4. Phí Sàn 9% (Cột Z)
  platformFee: Math.abs(receivedOrders.reduce((sum, order) => 
    sum + (parseFloat(order.actualFee9) || 0), 0
  )),
  
  // 5. Phí Xtra (Cột AA)
  xtraFee: Math.abs(receivedOrders.reduce((sum, order) => 
    sum + (parseFloat(order.xtraFee) || 0), 0
  )),
  
  // 6. Phí Flash Sale (Cột AB)
  flashSaleFee: Math.abs(receivedOrders.reduce((sum, order) => 
    sum + (parseFloat(order.flashSaleFee) || 0), 0
  )),
  
  // 7. Thuế (Cột AD)
  tax: Math.abs(receivedOrders.reduce((sum, order) => 
    sum + (parseFloat(order.tax) || 0), 0
  )),
  
  // 8. Phí TikTok Bù (Cột AE) - SỐ ÂM, GIẢM CHI PHÍ
  tiktokSubsidy: Math.abs(receivedOrders.reduce((sum, order) => 
    sum + (parseFloat(order.tiktokSubsidy) || 0), 0
  )),
  
  // 9. Phí Xử Lý Đơn Hàng (Cột AF) - MỚI THÊM
  orderProcessingFee: Math.abs(receivedOrders.reduce((sum, order) => 
    sum + (parseFloat(order.orderProcessingFee) || 0), 0
  ))
};
```

#### **4.2. Tổng Chi Phí Sàn**

```javascript
const totalPlatformCosts = 
  costBreakdown.affFee +              // Phí Affiliate
  costBreakdown.shippingFee +         // Phí Vận Chuyển
  costBreakdown.shopShippingFee +     // Phí VC Shop Chịu
  costBreakdown.platformFee +         // Phí Sàn 9%
  costBreakdown.xtraFee +             // Phí Xtra
  costBreakdown.flashSaleFee +        // Phí Flash Sale
  costBreakdown.tax +                 // Thuế
  costBreakdown.orderProcessingFee -  // Phí Xử Lý Đơn Hàng (MỚI)
  costBreakdown.tiktokSubsidy;        // TRỪ Phí TikTok Bù
```

**Công thức:**
```
Tổng Chi Phí Sàn = Phí Aff + Phí VC SPF + Phí VC Shop + Phí 9% 
                 + Phí Xtra + Phí Flash Sale + Thuế 
                 + Phí Xử Lý Đơn Hàng
                 - Phí TikTok Bù
```

**Lưu ý:**
- Tất cả phí đều dùng `Math.abs()` để chuyển thành số dương
- `tiktokSubsidy` được **TRỪ ĐI** vì đây là khoản TikTok bù lại cho shop

---

### **5. TÍNH SỐ DƯ TIKTOK HIỆN TẠI**

```javascript
// File: TikTokFinanceProcessor.js - calculateCurrentTikTokBalance()

// Bước 1: Tính tổng tiền thực nhận (ALL TIME)
const totalActualReceived = allOrders
  .filter(order => order.status === 'Đã nhận')
  .reduce((sum, order) => sum + (parseFloat(order.actualReceived) || 0), 0);

// Bước 2: Lấy tổng tiền đã rút (từ rutve sheet)
const totalWithdrawn = withdrawalData.totalWithdrawnAllTime || 0;

// Bước 3: Lấy tổng phí GVM (từ rutve sheet)
const totalGvmFee = withdrawalData.totalGvmFee || 0;

// Bước 4: Tính số dư
const currentBalance = totalActualReceived - totalWithdrawn - totalGvmFee;
```

**Công thức:**
```
Số Dư TikTok Hiện Tại = Tổng Tiền Thực Nhận (All Time)
                      - Tổng Tiền Đã Rút (All Time)
                      - Tổng Phí GVM (All Time)
```

**Lưu ý:**
- Tính trên **TOÀN BỘ THỜI GIAN**, không theo period
- Dữ liệu rút tiền lấy từ sheet "rutve"

---

### **6. TÍNH ĐƠN ĐÃ ĐỐI SOÁT / CHƯA ĐỐI SOÁT**

```javascript
// File: TikTokFinanceProcessor.js - calculateReconciledOrders()

// Đã đối soát: Có reconciliationFee (Cột P) !== 0
const reconciledOrders = receivedOrders.filter(order => 
  parseFloat(order.reconciliationFee) !== 0
);

const reconciledRevenue = reconciledOrders.reduce((sum, order) => 
  sum + (parseFloat(order.actualReceived) || 0), 0
);

// Chưa đối soát: reconciliationFee = 0
const unreconciledOrders = receivedOrders.filter(order => 
  parseFloat(order.reconciliationFee) === 0
);

const unreconciledRevenue = unreconciledOrders.reduce((sum, order) => 
  sum + (parseFloat(order.actualReceived) || 0), 0
);
```

**Công thức:**
```
Đã Đối Soát = Các đơn có "Tổng phí đối soát" (Cột P) ≠ 0
Chưa Đối Soát = Các đơn có "Tổng phí đối soát" (Cột P) = 0
```

---

### **7. TÍNH QUẢNG CÁO & RÚT TIỀN (RUTVE)**

#### **7.1. Dữ liệu Quảng Cáo**

```javascript
// File: RutveProcessor.js - calculateAdvertisingSummary()

// Lọc theo thời gian
const filteredAds = advertisingRecords.filter(record => {
  const date = parseDate(record['ngày nộp tiền']);
  return date >= startDate && date <= endDate;
});

// Tính tổng
const advertisingSummary = {
  totalDeposit: filteredAds.reduce((sum, record) => 
    sum + parseNumber(record['số tiền nộp']), 0
  ),
  totalTax: filteredAds.reduce((sum, record) => 
    sum + parseNumber(record['Tổng số tiền thuế']), 0
  ),
  totalGvmFee: filteredAds.reduce((sum, record) => 
    sum + parseNumber(record['Tổng phụ']), 0
  )
};

advertisingSummary.actualReceived = 
  advertisingSummary.totalDeposit - advertisingSummary.totalTax;
```

**Công thức:**
```
Tổng Nộp = Σ (số tiền nộp)
Tổng Thuế = Σ (Tổng số tiền thuế)
Tổng Phí GVM = Σ (Tổng phụ)
Thực Nhận = Tổng Nộp - Tổng Thuế
```

#### **7.2. Dữ liệu Rút Tiền**

```javascript
// File: RutveProcessor.js - calculateWithdrawalSummary()

// Rút trong kỳ
const periodWithdrawals = withdrawalRecords.filter(record => {
  const date = parseDate(record['Ngày rút tiền']);
  return date >= startDate && date <= endDate;
});

const withdrawnInPeriod = periodWithdrawals.reduce((sum, record) => 
  sum + parseNumber(record['Số tiền rút']), 0
);

// Rút toàn thời gian
const totalWithdrawnAllTime = withdrawalRecords.reduce((sum, record) => 
  sum + parseNumber(record['Số tiền rút']), 0
);

// Phí GVM toàn thời gian
const gvmWithdrawals = withdrawalRecords.filter(record => 
  record['ngày rút tiền gvm'] && record['ngày rút tiền gvm'].trim() !== ''
);

const totalGvmFee = gvmWithdrawals.reduce((sum, record) => 
  sum + parseNumber(record['số tiền']), 0
);
```

**Công thức:**
```
Rút Trong Kỳ = Σ (Số tiền rút) trong period
Tổng Rút (All Time) = Σ (Số tiền rút) toàn bộ
Tổng Phí GVM = Σ (số tiền) của các bản ghi có "ngày rút tiền gvm"
```

---

## 📈 KẾT QUẢ CUỐI CÙNG

### **Finance Report Object**

```javascript
{
  // Doanh thu
  totalReceivedRevenue: 399998021,        // Tổng doanh thu đã nhận (Cột V)
  
  // Chi phí
  totalPlatformCosts: 103863446,          // Tổng chi phí sàn
  costBreakdown: {
    affFee: 23800000,                     // Phí Affiliate (Cột S)
    shippingFee: 0,                       // Phí VC SPF (Cột U)
    shopShippingFee: 26200000,            // Phí VC Shop (Cột W)
    platformFee: 35970000,                // Phí 9% (Cột Z)
    xtraFee: 0,                           // Phí Xtra (Cột AA)
    flashSaleFee: 0,                      // Phí Flash Sale (Cột AB)
    tax: 4299439,                         // Thuế (Cột AD)
    tiktokSubsidy: 1300000,               // Phí TikTok Bù (Cột AE)
    orderProcessingFee: 15694007          // Phí Xử Lý Đơn Hàng (Cột AF) - MỚI
  },
  
  // Số dư
  currentTikTokBalance: 10614655,         // Số dư hiện tại
  
  // Đối soát
  reconciledRevenue: 182765644,           // Doanh thu đã đối soát
  reconciledOrdersCount: 1426,            // Số đơn đã đối soát
  unreconciledRevenue: 242000,            // Doanh thu chưa đối soát
  unreconciledOrdersCount: 2,             // Số đơn chưa đối soát
  
  // Quảng cáo & Rút tiền
  advertisingData: {
    totalDeposit: 31900000,               // Tổng nộp quảng cáo
    totalTax: 2900000,                    // Thuế quảng cáo
    totalGvmFee: 383365,                  // Phí GVM
    actualReceived: 29000000              // Thực nhận = Nộp - Thuế
  },
  withdrawnInPeriod: 186000000,           // Rút trong kỳ
  totalWithdrawnAllTime: 389000001,       // Tổng rút (all time)
  
  // Metadata
  dateRange: {
    startDate: '2025-10-01',
    endDate: '2025-10-31'
  },
  totalOrdersProcessed: 4135,             // Tổng đơn xử lý
  ordersInPeriod: 1598                    // Đơn trong kỳ
}
```

---

## 🔍 LƯU Ý QUAN TRỌNG

### **1. Về Phí Âm/Dương**
- Tất cả phí trong CSV có thể là **số âm**
- Code dùng `Math.abs()` để chuyển thành **số dương**
- `tiktokSubsidy` được **TRỪ ĐI** trong tổng chi phí

### **2. Về Ngày Tháng**
- Dùng **Ngày đẩy ĐVVC** (Cột K) làm chuẩn lọc
- Không dùng Ngày tạo đơn (Cột H)

### **3. Về Trạng Thái**
- Chỉ tính đơn có status = **"Đã nhận"**
- Các trạng thái khác bị loại bỏ

### **4. Về Đối Soát**
- Đã đối soát: `reconciliationFee` (Cột P) ≠ 0
- Chưa đối soát: `reconciliationFee` (Cột P) = 0

### **5. Về Phí Xử Lý Đơn Hàng (MỚI)**
- Cột AF trong CSV
- Chỉ có ở **tháng hiện tại**
- Tháng trước không có → giá trị = 0
- **KHÔNG ẢNH HƯỞNG** đến tính toán tháng trước

---

## 🎯 CÔNG THỨC TỔNG HỢP

```
┌─────────────────────────────────────────────────────────────┐
│  TỔNG DOANH THU ĐÃ NHẬN                                     │
│  = Σ (tiền thực nhận) của đơn "Đã nhận" trong period       │
│  = Σ (Cột V)                                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  TỔNG CHI PHÍ SÀN                                           │
│  = Phí Aff (S) + Phí VC SPF (U) + Phí VC Shop (W)         │
│    + Phí 9% (Z) + Phí Xtra (AA) + Phí Flash Sale (AB)     │
│    + Thuế (AD) + Phí Xử Lý Đơn Hàng (AF)                  │
│    - Phí TikTok Bù (AE)                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  SỐ DƯ TIKTOK HIỆN TẠI (All Time)                          │
│  = Tổng Tiền Thực Nhận (All Time)                          │
│    - Tổng Tiền Đã Rút (All Time)                           │
│    - Tổng Phí GVM (All Time)                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 FILES LIÊN QUAN

1. **`server/dataProcessor.js`**: Parse CSV → Order objects
2. **`server/TikTokFinanceProcessor.js`**: Tính toán Finance metrics
3. **`server/RutveProcessor.js`**: Xử lý quảng cáo & rút tiền
4. **`server/FinanceOrderProcessor.js`**: Lọc đơn hàng theo loại phí
5. **`server/index.js`**: API endpoints
6. **`client/src/pages/FinanceReport.tsx`**: Hiển thị UI

---

## 🔄 FLOW HOÀN CHỈNH

```
1. User chọn khoảng thời gian
         ↓
2. Frontend gọi API: GET /api/finance?startDate=...&endDate=...
         ↓
3. Backend đọc Google Sheets → Parse CSV
         ↓
4. DataProcessor: CSV → Order objects
         ↓
5. TikTokFinanceProcessor:
   - Lọc orders theo thời gian (shippingDate)
   - Lọc orders "Đã nhận"
   - Tính tổng doanh thu (actualReceived)
   - Tính chi phí sàn (9 loại phí)
   - Tính số dư TikTok
   - Tính đối soát
         ↓
6. RutveProcessor:
   - Đọc sheet "rutve"
   - Tính quảng cáo (nộp, thuế, thực nhận)
   - Tính rút tiền (trong kỳ, all time, GVM)
         ↓
7. Trả về JSON cho Frontend
         ↓
8. Frontend hiển thị cards + charts
```

---

## ✅ CHECKLIST KIỂM TRA

- [ ] Tất cả 9 loại phí được tính đúng
- [ ] `tiktokSubsidy` được TRỪ ĐI (không cộng)
- [ ] Dùng `shippingDate` (Cột K) để lọc thời gian
- [ ] Chỉ tính đơn "Đã nhận"
- [ ] Số dư TikTok tính trên All Time
- [ ] Phí Xử Lý Đơn Hàng (AF) chỉ có ở tháng hiện tại
- [ ] Tháng trước không có cột AF → giá trị = 0

---

**Tài liệu này mô tả đầy đủ logic tính toán Finance Report.**
**Cập nhật lần cuối: 08/11/2025**
