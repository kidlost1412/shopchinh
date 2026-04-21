// Data processor for TikTok Shop orders

class DataProcessor {
  constructor() {
    this.statusMapping = {
      'Tổng số đơn': 'all',
      'Đã nhận hàng': 'Đã nhận',
      'Đã gửi hàng': 'Đã gửi hàng',
      'Đã hoàn': 'Đã hoàn',
      'Đang hoàn': 'Đang hoàn',
      'Đã huỷ': 'Đã huỷ',
      'Đã xác nhận': 'Đã xác nhận',
      'Đang đóng hàng': 'Đang đóng hàng'
    };
    
    // Expected column names for smart detection - Updated from latest CSV headers
    this.expectedColumns = {
      ID: 'ID',
      WAYBILL_CODE: 'Mã vận đơn',
      STATUS: 'Trạng thái',
      PRODUCT_NAME: 'Sản phẩm',
      QUANTITY: 'Số lượng',
      UNIT_PRICE: 'Đơn giá',
      DISCOUNT: 'Giảm giá',
      CREATE_DATE: 'Ngày tạo đơn',
      UPDATE_DATE: 'Ngày cập nhật',
      PROVINCE: 'Tỉnh thành phố',
      DELIVERY_DATE: 'Ngày giờ đẩy đơn sang đvvc',
      TAGS: 'Thẻ',
      PRODUCT_IMAGE: 'Ảnh SP',
      REVENUE: 'Doanh thu chưa trừ phí sàn',
      ACTUAL_PAYMENT: 'Tiền thanh toán thực tế',
      RECONCILIATION_FEE: 'Tổng phí đối soát',
      PLATFORM_SUBSIDY: 'Sàn trợ giá',
      OTHER_FEE: 'khác',
      AFF_FEE: 'phí aff',
      AFF_NAME: 'tên aff',
      SHIPPING_FEE: 'tiền spf ship',
      ACTUAL_RECEIVED: 'tiền thực nhận',
      SHOP_SHIPPING_FEE: 'tiền ship shop chịu',
      TRANSACTION_FEE: 'phí giao dịch',
      TIKTOK_COMMISSION: 'phí hoa hồng tiktok shop',
      ACTUAL_FEE_9: 'Phí 9% thực tế',
      XTRA_FEE: 'phí xtra',
      FLASH_SALE_FEE: 'phí flash sale',
      NOTES: 'ghi chú',
      TAX: 'thuế',
      TIKTOK_SUBSIDY: 'phí tiktok bù',
      ORDER_PROCESSING_FEE: 'Phí xử lý đơn hàng',
      REFUND_BONUS_FEE: 'Phí dịch vụ hoàn tiền thưởng'
    };
    
    // Column mapping will be populated dynamically
    this.columnMapping = {};
    this.columnWarnings = [];
  }

  // Advanced smart column detection with fuzzy matching and change detection
  detectColumns(headers) {
    this.columnMapping = {};
    this.columnWarnings = [];
    
    console.log('[DataProcessor] CSV Headers detected:', headers);
    
    // Store previous mapping for change detection
    const previousMapping = { ...this.columnMapping };
    
    // Advanced matching algorithm
    for (const [key, expectedName] of Object.entries(this.expectedColumns)) {
      if (!expectedName || expectedName.trim() === '') {
        continue;
      }
      
      const result = this.findBestColumnMatch(headers, expectedName, key);
      
      if (result.index !== -1) {
        // Validate index is within bounds
        if (result.index >= headers.length) {
          this.columnWarnings.push(`❌ Lỗi nghiêm trọng: Cột "${expectedName}" map vào index ${result.index} vượt quá số cột thực tế (${headers.length})`);
          continue; // Skip this mapping
        }
        
        this.columnMapping[key] = result.index;
        
        // Add warning if not exact match
        if (result.confidence < 1.0) {
          this.columnWarnings.push(
            `Cảnh báo: Cột "${expectedName}" → "${headers[result.index]}" ` +
            `(độ tin cậy: ${(result.confidence * 100).toFixed(1)}%)`
          );
        }
        
        // Check for position changes
        if (previousMapping[key] !== undefined && previousMapping[key] !== result.index) {
          this.columnWarnings.push(
            `Thay đổi vị trí: Cột "${expectedName}" chuyển từ vị trí ${previousMapping[key]} sang ${result.index}`
          );
        }
      } else {
        this.columnWarnings.push(`❌ Lỗi nghiêm trọng: Không tìm thấy cột "${expectedName}". Dữ liệu có thể bị sai lệch.`);
      }
    }
    
    // Detect new columns that weren't expected
    this.detectNewColumns(headers);
    
    // Log results with confidence levels
    console.log('[DataProcessor] Advanced Column Mapping Result:');
    

    Object.entries(this.columnMapping).forEach(([key, index]) => {
      const confidence = this.calculateMatchConfidence(headers[index], this.expectedColumns[key]);
      console.log(`  ${key}: "${headers[index]}" (index: ${index}, confidence: ${(confidence * 100).toFixed(1)}%)`);
    });
    
    // Log warnings with severity levels
    if (this.columnWarnings.length > 0) {
      console.warn('[DataProcessor] Column Detection Issues:');
      this.columnWarnings.forEach(warning => {
        const severity = warning.includes('❌') ? 'CRITICAL' : 
                        warning.includes('Thay đổi vị trí') ? 'WARNING' : 'INFO';
        console.warn(`  [${severity}] ${warning}`);
      });
    }
    
    // Overall assessment
    const mappingRate = (Object.keys(this.columnMapping).length / Object.keys(this.expectedColumns).length) * 100;
    console.log(`[DataProcessor] Mapping Success Rate: ${mappingRate.toFixed(1)}% (${Object.keys(this.columnMapping).length}/${Object.keys(this.expectedColumns).length})`);
    
    return this.columnWarnings;
  }

  // Advanced column matching algorithm with fuzzy logic
  findBestColumnMatch(headers, expectedName, key) {
    let bestMatch = { index: -1, confidence: 0 };
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (!header) continue;
      
      const confidence = this.calculateMatchConfidence(header, expectedName);
      
      if (confidence > bestMatch.confidence) {
        bestMatch = { index: i, confidence };
      }
    }
    
    // Only accept matches above threshold
    const threshold = 0.6; // 60% confidence required
    if (bestMatch.confidence < threshold) {
      bestMatch.index = -1;
    }
    
    return bestMatch;
  }

  // Calculate match confidence using multiple algorithms
  calculateMatchConfidence(actual, expected) {
    if (!actual || !expected) return 0;
    
    const actualLower = actual.toString().trim().toLowerCase();
    const expectedLower = expected.toLowerCase();
    
    // Exact match
    if (actualLower === expectedLower) return 1.0;
    
    // Levenshtein distance based similarity
    const levenshteinSimilarity = 1 - (this.levenshteinDistance(actualLower, expectedLower) / Math.max(actualLower.length, expectedLower.length));
    
    // Substring containment
    const containmentScore = actualLower.includes(expectedLower) || expectedLower.includes(actualLower) ? 0.8 : 0;
    
    // Word overlap
    const actualWords = actualLower.split(/\s+/);
    const expectedWords = expectedLower.split(/\s+/);
    const commonWords = actualWords.filter(word => expectedWords.includes(word));
    const wordOverlapScore = commonWords.length / Math.max(actualWords.length, expectedWords.length);
    
    // Key term matching (for financial columns)
    const keyTerms = {
      'doanh thu': ['doanh', 'thu', 'revenue'],
      'tiền': ['tiền', 'money', 'payment'],
      'phí': ['phí', 'fee', 'charge'],
      'thực tế': ['thực', 'tế', 'actual'],
      'thực nhận': ['thực', 'nhận', 'received']
    };
    
    let keyTermScore = 0;
    for (const [concept, terms] of Object.entries(keyTerms)) {
      if (expectedLower.includes(concept)) {
        const matchingTerms = terms.filter(term => actualLower.includes(term));
        keyTermScore = Math.max(keyTermScore, matchingTerms.length / terms.length);
      }
    }
    
    // Weighted combination
    return Math.max(
      levenshteinSimilarity * 0.4 + 
      containmentScore * 0.3 + 
      wordOverlapScore * 0.2 + 
      keyTermScore * 0.1
    );
  }

  // Levenshtein distance calculation
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // Detect new columns that weren't in expected list
  detectNewColumns(headers) {
    const mappedIndices = new Set(Object.values(this.columnMapping));
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (header && header.trim() !== '' && !mappedIndices.has(i)) {
        this.columnWarnings.push(`📋 Cột mới phát hiện: "${header}" (vị trí ${i}) - Chưa được sử dụng`);
      }
    }
  }

  // Helper function to parse CSV line correctly handling quoted fields
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  // Group products by order ID
  groupOrdersByID(rawData) {
    if (!rawData || rawData.length < 2) return [];
    
    // Handle both array data from Google Sheets and CSV string data
    const headers = Array.isArray(rawData[0]) ? rawData[0] : this.parseCSVLine(rawData[0]);
    const rows = rawData.slice(1).map(row => 
      Array.isArray(row) ? row : this.parseCSVLine(row)
    );
    
    // Detect columns dynamically
    this.detectColumns(headers);
    
    const orders = [];
    let currentOrder = null;
    
    for (const row of rows) {
      const id = row[this.columnMapping.ID];
      
      if (id && id !== '_') {
        // New order found
        if (currentOrder) {
          orders.push(currentOrder);
        }
        
        // Determine correct revenue source based on order status
        const status = row[this.columnMapping.STATUS] || '';
        const statusTrimmed = status.trim();
        
        // Get all revenue values
        const actualPaymentValue = this.parseNumber(row[this.columnMapping.ACTUAL_PAYMENT]) || 0;
        const actualReceivedValue = this.parseNumber(row[this.columnMapping.ACTUAL_RECEIVED]) || 0;
        const revenueBeforeFeesValue = this.parseNumber(row[this.columnMapping.REVENUE]) || 0;
        
        // Revenue logic based on status:
        // - Return/cancel statuses: ACTUAL_PAYMENT 
        // - Shipping statuses: REVENUE (before fees)
        // - Completed: ACTUAL_RECEIVED
        let revenueForStatusCard;
        let revenueSource;
        
        if (['Đã hoàn', 'Đang hoàn', 'Đã huỷ'].includes(statusTrimmed)) {
          revenueForStatusCard = actualPaymentValue;
          revenueSource = 'ACTUAL_PAYMENT';
        } else if (['Đã gửi hàng', 'Đã xác nhận', 'Đang đóng hàng'].includes(statusTrimmed)) {
          revenueForStatusCard = revenueBeforeFeesValue;
          revenueSource = 'REVENUE';
        } else if (statusTrimmed === 'Đã nhận hàng' || statusTrimmed === 'Đã nhận') {
          revenueForStatusCard = actualReceivedValue;
          revenueSource = 'ACTUAL_RECEIVED';
        } else {
          // Default to ACTUAL_RECEIVED for other statuses
          revenueForStatusCard = actualReceivedValue;
          revenueSource = 'ACTUAL_RECEIVED';
        }
        
        // Debug log for revenue logic
        console.log(`[DataProcessor] Status "${statusTrimmed}" - Order ${id}: Using ${revenueSource} (${revenueForStatusCard})`);
        if (revenueSource !== 'ACTUAL_RECEIVED') {
          console.log(`  -> ACTUAL_PAYMENT: ${actualPaymentValue}, ACTUAL_RECEIVED: ${actualReceivedValue}, REVENUE: ${revenueBeforeFeesValue}`);
        }
        
        currentOrder = {
          id: id,
          waybillCode: row[this.columnMapping.WAYBILL_CODE] || '',
          status: status,
          province: row[this.columnMapping.PROVINCE] || '',
          deliveryDate: row[this.columnMapping.DELIVERY_DATE] || '',
          deliveryDateParsed: this.parseDate(row[this.columnMapping.DELIVERY_DATE]),
          revenue: revenueForStatusCard, // Smart revenue selection for status cards
          actualPayment: this.parseNumber(row[this.columnMapping.ACTUAL_PAYMENT]) || 0,
          revenueBeforeFees: this.parseNumber(row[this.columnMapping.REVENUE]) || 0, // From REVENUE column
          createDate: row[this.columnMapping.CREATE_DATE] || '',
          createDateParsed: this.parseDate(row[this.columnMapping.CREATE_DATE]),
          updateDate: row[this.columnMapping.UPDATE_DATE] || '',
          updateDateParsed: this.parseDate(row[this.columnMapping.UPDATE_DATE]),
          tags: row[this.columnMapping.TAGS] || '',
          // Additional financial fields - Updated for new CSV structure
          reconciliationFee: this.parseNumber(row[this.columnMapping.RECONCILIATION_FEE]) || 0,
          platformSubsidy: this.parseNumber(row[this.columnMapping.PLATFORM_SUBSIDY]) || 0,
          otherFee: this.parseNumber(row[this.columnMapping.OTHER_FEE]) || 0,
          affFee: this.parseNumber(row[this.columnMapping.AFF_FEE]) || 0,
          affName: row[this.columnMapping.AFF_NAME] || '',
          shippingFee: this.parseNumber(row[this.columnMapping.SHIPPING_FEE]) || 0,
          actualReceived: this.parseNumber(row[this.columnMapping.ACTUAL_RECEIVED]) || 0,
          shopShippingFee: this.parseNumber(row[this.columnMapping.SHOP_SHIPPING_FEE]) || 0,
          transactionFee: this.parseNumber(row[this.columnMapping.TRANSACTION_FEE]) || 0,
          tiktokCommission: this.parseNumber(row[this.columnMapping.TIKTOK_COMMISSION]) || 0,
          actualFee9: this.parseNumber(row[this.columnMapping.ACTUAL_FEE_9]) || 0,
          xtraFee: this.parseNumber(row[this.columnMapping.XTRA_FEE]) || 0,
          flashSaleFee: this.parseNumber(row[this.columnMapping.FLASH_SALE_FEE]) || 0,
          notes: (this.columnMapping.NOTES !== undefined && this.columnMapping.NOTES < row.length) ? row[this.columnMapping.NOTES] || '' : '',
          tags: (this.columnMapping.TAGS !== undefined && this.columnMapping.TAGS < row.length) ? row[this.columnMapping.TAGS] || '' : '',
          tax: this.parseNumber(row[this.columnMapping.TAX]) || 0,
          tiktokSubsidy: this.parseNumber(row[this.columnMapping.TIKTOK_SUBSIDY]) || 0,
          orderProcessingFee: this.parseNumber(row[this.columnMapping.ORDER_PROCESSING_FEE]) || 0,
          refundBonusFee: this.parseNumber(row[this.columnMapping.REFUND_BONUS_FEE]) || 0,
          products: [{
            name: row[this.columnMapping.PRODUCT_NAME] || '',
            quantity: this.parseNumber(row[this.columnMapping.QUANTITY]) || 0,
            price: this.parseNumber(row[this.columnMapping.UNIT_PRICE]) || 0,
            discount: this.parseNumber(row[this.columnMapping.DISCOUNT]) || 0,
            image: row[this.columnMapping.PRODUCT_IMAGE] || '',
            revenue: revenueForStatusCard, // Use same logic as order revenue
            notes: (this.columnMapping.NOTES !== undefined && this.columnMapping.NOTES < row.length) ? row[this.columnMapping.NOTES] || '' : ''
          }],
          notes: (this.columnMapping.NOTES !== undefined && this.columnMapping.NOTES < row.length) ? row[this.columnMapping.NOTES] || '' : ''
        };
      } else if (currentOrder && row[this.columnMapping.PRODUCT_NAME]) {
        // Additional product for current order
        const statusTrimmed = currentOrder.status.trim();
        
        // Apply same revenue logic for additional products
        const additionalActualPayment = this.parseNumber(row[this.columnMapping.ACTUAL_PAYMENT]) || 0;
        const additionalActualReceived = this.parseNumber(row[this.columnMapping.ACTUAL_RECEIVED]) || 0;
        const additionalRevenueBeforeFees = this.parseNumber(row[this.columnMapping.REVENUE]) || 0;
        
        let productRevenue;
        if (['Đã hoàn', 'Đang hoàn', 'Đã huỷ'].includes(statusTrimmed)) {
          productRevenue = additionalActualPayment;
        } else if (['Đã gửi hàng', 'Đã xác nhận', 'Đang đóng hàng'].includes(statusTrimmed)) {
          productRevenue = additionalRevenueBeforeFees;
        } else if (statusTrimmed === 'Đã nhận hàng' || statusTrimmed === 'Đã nhận') {
          productRevenue = additionalActualReceived;
        } else {
          productRevenue = additionalActualReceived;
        }
        const productRevenueBeforeFees = this.parseNumber(row[this.columnMapping.REVENUE]) || 0;
        
        currentOrder.products.push({
          name: row[this.columnMapping.PRODUCT_NAME] || '',
          quantity: this.parseNumber(row[this.columnMapping.QUANTITY]) || 0,
          price: this.parseNumber(row[this.columnMapping.UNIT_PRICE]) || 0,
          discount: this.parseNumber(row[this.columnMapping.DISCOUNT]) || 0,
          image: row[this.columnMapping.PRODUCT_IMAGE] || '',
          revenue: productRevenue,
          notes: (this.columnMapping.NOTES !== undefined && this.columnMapping.NOTES < row.length) ? row[this.columnMapping.NOTES] || '' : ''
        });
        
        // Add revenue from additional products (only if it's not zero)
        if (productRevenue > 0) {
          currentOrder.revenue += productRevenue;
        }
        
        if (productRevenueBeforeFees > 0) {
          currentOrder.revenueBeforeFees += productRevenueBeforeFees;
        }
      }
    }
    
    // Add last order
    if (currentOrder) {
      orders.push(currentOrder);
    }
    
    return orders;
  }

  // Parse number from string, handling Vietnamese number format
  parseNumber(value) {
    if (!value || value === '') return 0;
    if (typeof value === 'number') return value;
    
    // Remove non-numeric characters except decimal point
    const cleaned = value.toString().replace(/[^\d.-]/g, '');
    const number = parseFloat(cleaned);
    return isNaN(number) ? 0 : number;
  }



  // Parse Vietnamese date format (DD/MM/YYYY or DD/MM/YYYY HH:mm)
  parseDate(dateStr) {
    if (!dateStr || dateStr === '') return null;
    
    try {
      // Handle format like "11/06/2025" or "16:23 11/06/2025"
      const dateOnly = dateStr.includes(' ') ? dateStr.split(' ').pop() : dateStr;
      const [day, month, year] = dateOnly.split('/');
      
      if (day && month && year) {
        // Create date in ISO format (YYYY-MM-DD)
        const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const date = new Date(isoDate);
        return isNaN(date.getTime()) ? null : date;
      }
    } catch (error) {
      console.warn('Error parsing date:', dateStr, error);
    }
    
    return null;
  }

  // Calculate metrics for dashboard cards
  calculateMetrics(orders) {
    const metrics = {
      'Tổng số đơn': { count: 0, revenue: 0 },
      'Đã nhận hàng': { count: 0, revenue: 0 },
      'Đã gửi hàng': { count: 0, revenue: 0 },
      'Đã hoàn': { count: 0, revenue: 0 },
      'Đang hoàn': { count: 0, revenue: 0 },
      'Đã huỷ': { count: 0, revenue: 0 },
      'Đã xác nhận': { count: 0, revenue: 0 },
      'Đang đóng hàng': { count: 0, revenue: 0 }
    };

    // Define valid statuses for counting (only 8 main statuses)
    const validStatuses = ['Đã nhận', 'Đã gửi hàng', 'Đã hoàn', 'Đang hoàn', 'Đã huỷ', 'Đã xác nhận', 'Đang đóng hàng'];

    orders.forEach(order => {
      const status = order.status.trim();
      
      // Only count orders with valid statuses and exclude cancelled AND confirmed orders for total
      if (validStatuses.includes(status) && status !== 'Đã huỷ' && status !== 'Đã xác nhận') {
        metrics['Tổng số đơn'].count++;
        
        // Total revenue = REVENUE + ACTUAL_PAYMENT from returned orders
        let totalRevenue = order.revenueBeforeFees || 0; // REVENUE column
        if (['Đã hoàn', 'Đang hoàn'].includes(status)) {
          totalRevenue += order.actualPayment || 0; // Add ACTUAL_PAYMENT for returned orders
        }
        metrics['Tổng số đơn'].revenue += totalRevenue;
      }

      // Status-specific metrics - only for valid statuses
      if (validStatuses.includes(status)) {
      for (const [key, value] of Object.entries(this.statusMapping)) {
        if (value === 'all') continue;
        if (status === value) {
          metrics[key].count++;
            
            // Fix: Đã nhận hàng should use REVENUE instead of ACTUAL_RECEIVED
            if (key === 'Đã nhận hàng') {
              metrics[key].revenue += order.revenueBeforeFees || 0; // Use REVENUE
            } else {
              metrics[key].revenue += order.revenue; // Use status-specific revenue logic
            }
          break;
          }
        }
      }
    });

    return metrics;
  }

  // Filter orders by date range
  filterByDateRange(orders, startDate, endDate) {
    if (!startDate && !endDate) return orders;
    
    return orders.filter(order => {
      // Use pre-parsed dates for better performance
      const orderDate = order.deliveryDateParsed || order.createDateParsed;
      if (!orderDate) return true;
      
      if (startDate && orderDate < new Date(startDate)) return false;
      if (endDate && orderDate > new Date(endDate)) return false;
      
      return true;
    });
  }

  // Filter orders by status
  filterByStatus(orders, status) {
    if (!status || status === 'all' || status === 'Tổng số đơn') {
      console.log(`[DataProcessor] No status filter applied or 'all' status requested.`);
      return orders;
    }

    console.log(`[DataProcessor] Filtering by status: "${status}"`);
    
    const targetStatus = this.statusMapping[status];
    
    if (!targetStatus) {
      console.error(`[DataProcessor] FATAL: Status "${status}" not found in statusMapping. Returning empty array.`);
      return [];
    }

    console.log(`[DataProcessor] Mapped "${status}" to target status: "${targetStatus}"`);
    
    const initialCount = orders.length;
    const filteredOrders = orders.filter(order => order.status.trim() === targetStatus);
    console.log(`[DataProcessor] Filtering complete. Found ${filteredOrders.length} orders out of ${initialCount} for status "${targetStatus}".`);

    return filteredOrders;
  }

  // Search orders by ID or waybill code with smart partial matching
  searchOrders(orders, searchTerm) {
    if (!searchTerm) return orders;
    
    const term = searchTerm.toLowerCase().trim();
    
    // If search term is 4-5 digits, enable smart partial matching for order ID
    const isPartialSearch = /^\d{4,5}$/.test(term);
    
    return orders.filter(order => {
      const orderId = order.id ? order.id.toLowerCase() : '';
      const waybillCode = order.waybillCode ? order.waybillCode.toLowerCase() : '';
      
      if (isPartialSearch) {
        // Smart search: match if order ID ends with the search term
        return orderId.endsWith(term) || 
               orderId.includes(term) ||
               waybillCode.endsWith(term) ||
               waybillCode.includes(term);
      } else {
        // Regular search: full text matching
        return orderId.includes(term) || waybillCode.includes(term);
      }
    });
  }

  // Generate revenue trend data for charts
  generateRevenueTrend(orders) {
    const trendData = {};
    
    orders.forEach(order => {
      // Use pre-parsed dates
      const date = order.deliveryDateParsed || order.createDateParsed;
      if (!date) return;
      
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      if (!trendData[dateKey]) {
        trendData[dateKey] = { date: dateKey, revenue: 0, orders: 0 };
      }
      
      trendData[dateKey].revenue += order.revenue;
      trendData[dateKey].orders++;
    });
    
    return Object.values(trendData).sort((a, b) => a.date.localeCompare(b.date));
  }

  // Generate status distribution data for pie chart
  generateStatusDistribution(orders) {
    const distribution = {};
    
    orders.forEach(order => {
      const status = order.status.trim();
      if (!distribution[status]) {
        distribution[status] = { name: status, count: 0, revenue: 0 };
      }
      
      distribution[status].count++;
      distribution[status].revenue += order.revenue;
    });
    
    return Object.values(distribution);
  }

  // Generate product analysis data - NEW FEATURE
  generateProductAnalysis(orders, countOnlyShippedOrders = false) {
    const productMap = new Map();
    
    orders.forEach(order => {
      // Process each product in the order
      if (order.products && Array.isArray(order.products)) {
        order.products.forEach(product => {
          const productName = product.name || 'Không xác định';
          const quantity = product.quantity || 0;
          const revenue = product.revenue || 0;
          const deliveryDate = order.deliveryDate || order.createDate || '';
          
          // Nếu chỉ đếm đơn đã gửi hàng và đang đóng hàng
          if (countOnlyShippedOrders) {
            const status = order.status.trim();
            if (!['Đã gửi hàng', 'Đang đóng hàng'].includes(status)) {
              return; // Bỏ qua đơn hàng này
            }
          }
          
          // CRITICAL FIX: Each product should only get notes from its own row
          // NOT from the order level - only use product-specific notes
          const productNote = product.notes || '';
          
          if (productMap.has(productName)) {
            const existing = productMap.get(productName);
            existing.totalQuantity += quantity;
            existing.totalRevenue += revenue;
            // Keep the most recent delivery date
            if (deliveryDate > existing.latestDeliveryDate) {
              existing.latestDeliveryDate = deliveryDate;
            }
            
            // Only add note if this specific product has one
            if (productNote && productNote.trim() !== '' && productNote !== 'null' && productNote !== 'undefined') {
              existing.notesStats.set(productNote, (existing.notesStats.get(productNote) || 0) + 1);
            }
          } else {
            productMap.set(productName, {
              productName,
              totalQuantity: quantity,
              totalRevenue: revenue,
              latestDeliveryDate: deliveryDate,
              notesStats: new Map() // Initialize notes tracking
            });
            
            // Only add note if this specific product has one
            if (productNote && productNote.trim() !== '' && productNote !== 'null' && productNote !== 'undefined') {
              productMap.get(productName).notesStats.set(productNote, 1);
            }
          }
        });
      }
    });
    
    // Convert to array and sort by total quantity (descending)
    const productAnalysis = Array.from(productMap.values())
      .map(product => {
        // Format notes stats into readable string
        const notesArray = Array.from(product.notesStats.entries())
          .map(([note, count]) => `${note} (${count})`)
          .join(', ');
        
        return {
          ...product,
          notesSummary: notesArray || '' // Empty string instead of 'Không có ghi chú'
        };
      })
      .sort((a, b) => b.totalQuantity - a.totalQuantity);
    
    return productAnalysis;
  }

  // Get product orders for detailed view - NEW FEATURE
  getProductOrders(orders, productName, countOnlyShippedOrders = false) {
    const productOrders = [];
    
    orders.forEach(order => {
      if (order.products && Array.isArray(order.products)) {
        order.products.forEach(product => {
          if (product.name === productName) {
            // Nếu chỉ đếm đơn đã gửi hàng và đang đóng hàng
            if (countOnlyShippedOrders) {
              const status = order.status.trim();
              if (!['Đã gửi hàng', 'Đang đóng hàng'].includes(status)) {
                return; // Bỏ qua đơn hàng này
              }
            }
            

            
            productOrders.push({
              id: order.id,
              waybillCode: order.waybillCode,
              status: order.status,
              quantity: product.quantity,
              revenue: product.revenue,
              deliveryDate: order.deliveryDate,
              createDate: order.createDate,
              productName: product.name,
              notes: order.notes || '' // Add notes field
            });
          }
        });
      }
    });
    
    return productOrders;
  }

  // Get column warnings for API response
  getColumnWarnings() {
    return this.columnWarnings;
  }

  // Get column mapping status for debugging
  getColumnMappingStatus() {
    const detected = Object.keys(this.columnMapping).length;
    const expected = Object.keys(this.expectedColumns).length;
    const missing = expected - detected;
    
    return {
      detected,
      expected,
      missing,
      mappings: this.columnMapping,
      warnings: this.columnWarnings
    };
  }

  // This class handles Dashboard functionality
}

module.exports = DataProcessor;

