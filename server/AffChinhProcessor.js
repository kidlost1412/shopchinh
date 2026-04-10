// AffChính Processor - Xử lý đơn hàng tự bán của shop chính
// Đọc từ Google Sheet "affchinh", group by Order ID, tính doanh thu
// Doanh thu = SKU Subtotal Before Discount - SKU Seller Discount
// Lọc ngày theo cột AA: RTS Time (Thời gian sẵn sàng vận chuyển)

class AffChinhProcessor {
  constructor() {
    console.log('[AffChinhProcessor] Khởi tạo AffChính Processor');
    
    // Expected column names cho smart detection
    this.expectedColumns = {
      ORDER_ID: 'Order ID',                          // Cột A
      ORDER_STATUS: 'Order Status',                   // Cột B
      PRODUCT_NAME: 'Product Name',                   // Cột H
      VARIATION: 'Variation',                         // Cột I
      QUANTITY: 'Quantity',                           // Cột J
      SKU_SUBTOTAL_BEFORE_DISCOUNT: 'SKU Subtotal Before Discount', // Cột M
      SKU_SELLER_DISCOUNT: 'SKU Seller Discount',     // Cột O
      RTS_TIME: 'RTS Time',                           // Cột AA - NGÀY LỌC CHÍNH
      DELIVERED_TIME: 'Delivered Time',               // Cột AC
    };
    
    this.columnMapping = {};
    
    // Status mapping: affchinh status → donaff-compatible status
    this.statusMapping = {
      'Đã nhận hàng': 'Đã hoàn thành',
      'Delivered': 'Đã hoàn thành',
      'Đã giao': 'Đã hoàn thành',
      'Đã vận chuyển': 'Đang xử lý',
      'Shipped': 'Đang xử lý',
      'Cần vận chuyển': 'Đang xử lý',
      'Awaiting Shipment': 'Đang xử lý',
      'Đang đóng hàng': 'Đang xử lý',
      'Đã xác nhận': 'Đang xử lý',
      'Đã hủy': 'Đã hủy',
      'Cancelled': 'Đã hủy',
      'Đã hoàn': 'Đã hủy',
      'Đang hoàn': 'Đã hủy'
    };
    
    this.statusMappedMapping = {
      'Đã hoàn thành': 'completed',
      'Đang xử lý': 'processing',
      'Đã hủy': 'cancelled'
    };
  }

  // Detect columns dynamically từ header row
  detectColumns(headers) {
    this.columnMapping = {};
    
    for (const [key, expectedName] of Object.entries(this.expectedColumns)) {
      const lowerExpected = expectedName.toLowerCase();
      
      for (let i = 0; i < headers.length; i++) {
        if (!headers[i]) continue;
        const lowerHeader = headers[i].toString().trim().toLowerCase();
        
        if (lowerHeader === lowerExpected) {
          this.columnMapping[key] = i;
          break;
        }
        if (lowerHeader.includes(lowerExpected) || lowerExpected.includes(lowerHeader)) {
          this.columnMapping[key] = i;
          break;
        }
      }
    }
    
    console.log('[AffChinhProcessor] Column mapping:', 
      Object.entries(this.columnMapping).map(([k, v]) => `${k}=${v}(${headers[v]})`).join(', ')
    );
    
    return this.columnMapping;
  }

  parseNumber(value) {
    if (!value || value === '') return 0;
    if (typeof value === 'number') return value;
    const cleaned = value.toString().replace(/[^\d.-]/g, '');
    const number = parseFloat(cleaned);
    return isNaN(number) ? 0 : number;
  }

  // Parse date "10/04/2026 08:13:20" → Date object
  parseDate(dateStr) {
    if (!dateStr || dateStr === '') return null;
    try {
      const dateOnly = dateStr.includes(' ') ? dateStr.split(' ')[0] : dateStr;
      const [day, month, year] = dateOnly.split('/');
      if (day && month && year) {
        const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const date = new Date(isoDate);
        return isNaN(date.getTime()) ? null : date;
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  // XỬ LÝ DỮ LIỆU TỪ GOOGLE SHEET (array of arrays)
  // rawData[0] = headers, rawData[1] = descriptions (bỏ qua), rawData[2+] = data
  processAffChinhOrders(rawData, shopName = 'Shop Chính') {
    if (!rawData || rawData.length < 3) {
      console.warn('[AffChinhProcessor] Not enough data rows (need header + description + data)');
      return [];
    }
    
    console.log(`[AffChinhProcessor] Processing ${rawData.length} raw rows from Google Sheet "affchinh"`);
    
    // Dòng 0: headers, Dòng 1: descriptions (bỏ qua), Dòng 2+: data
    const headers = rawData[0];
    this.detectColumns(headers);
    
    // Group by Order ID, sum revenue
    const orderGroups = {};
    
    for (let i = 2; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;
      
      const orderId = row[this.columnMapping.ORDER_ID];
      if (!orderId || orderId.toString().trim() === '') continue;
      
      const skuSubtotalBeforeDiscount = this.parseNumber(row[this.columnMapping.SKU_SUBTOTAL_BEFORE_DISCOUNT]);
      const skuSellerDiscount = this.parseNumber(row[this.columnMapping.SKU_SELLER_DISCOUNT]);
      const skuRevenue = skuSubtotalBeforeDiscount - skuSellerDiscount;
      
      const orderStatus = (row[this.columnMapping.ORDER_STATUS] || '').toString().trim();
      const productName = (row[this.columnMapping.PRODUCT_NAME] || '').toString().trim();
      const variation = (row[this.columnMapping.VARIATION] || '').toString().trim();
      const quantity = this.parseNumber(row[this.columnMapping.QUANTITY]) || 0;
      // RTS Time = ngày lọc chính (cột AA)
      const rtsTime = (row[this.columnMapping.RTS_TIME] || '').toString().trim();
      
      const orderIdStr = orderId.toString().trim();
      
      if (!orderGroups[orderIdStr]) {
        orderGroups[orderIdStr] = {
          id: orderIdStr,
          originalStatus: orderStatus,
          products: [],
          totalRevenue: 0,
          rtsTime: rtsTime,
          rtsDateParsed: this.parseDate(rtsTime)
        };
      }
      
      // Cộng dồn doanh thu (multi-product cùng Order ID)
      orderGroups[orderIdStr].totalRevenue += skuRevenue;
      orderGroups[orderIdStr].products.push({
        name: productName,
        variation: variation,
        quantity: quantity,
        revenue: skuRevenue
      });
    }
    
    // Convert to donaff-compatible format
    const processedOrders = [];
    
    for (const [orderId, group] of Object.entries(orderGroups)) {
      const mappedStatus = this.statusMapping[group.originalStatus] || 'Đang xử lý';
      const statusMapped = this.statusMappedMapping[mappedStatus] || 'processing';
      
      processedOrders.push({
        id: orderId,
        affName: shopName,
        productName: group.products.map(p => p.name).filter(Boolean).join(' + '),
        quantity: group.products.reduce((sum, p) => sum + p.quantity, 0),
        price: group.totalRevenue,
        paymentAmount: group.totalRevenue,
        
        status: mappedStatus,
        statusMapped: statusMapped,
        contentType: 'Phát trực tiếp',
        contentTypeMapped: 'livestream',
        
        // Financial data - shop tự bán không có hoa hồng
        revenue: group.totalRevenue,
        standardCommissionEstimated: 0,
        standardCommissionActual: 0,
        standardCommissionRate: 0,
        adCommissionEstimated: 0,
        adCommissionActual: 0,
        adCommissionRate: 0,
        totalCommissionEstimated: 0,
        totalCommissionActual: 0,
        
        // Dates - Dùng RTS Time làm ngày lọc (createDateParsed)
        // Để tương thích với filterAffOrdersByDateRange của DonaffProcessor
        createDate: group.rtsTime,
        createDateParsed: group.rtsDateParsed,
        paymentTime: '',
        
        platform: '',
        primaryRowIndex: 0,
        duplicateRowsCount: group.products.length,
        
        // Flag để phân biệt đơn tự bán
        isShopOwn: true
      });
    }
    
    console.log(`[AffChinhProcessor] Processed ${processedOrders.length} orders from affchinh`);
    console.log(`[AffChinhProcessor] Status breakdown:`, {
      completed: processedOrders.filter(o => o.statusMapped === 'completed').length,
      processing: processedOrders.filter(o => o.statusMapped === 'processing').length,
      cancelled: processedOrders.filter(o => o.statusMapped === 'cancelled').length
    });
    console.log(`[AffChinhProcessor] Revenue: ${processedOrders.reduce((s, o) => s + o.revenue, 0).toLocaleString()} VND`);
    
    return processedOrders;
  }
}

module.exports = AffChinhProcessor;
