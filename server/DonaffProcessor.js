// Donaff Data Processor - Hoàn toàn độc lập với Dashboard và Finance
// Xử lý dữ liệu AFF theo logic phức tạp đã được định nghĩa

class DonaffProcessor {
  constructor() {
    console.log('[DonaffProcessor] Khởi tạo AFF Processor độc lập');
    
    // Expected column names cho smart detection - Theo CSV Donaff
    this.expectedColumns = {
      ORDER_ID: 'ID đơn hàng',                    // Cột A (1)
      PRODUCT_ID: 'ID sản phẩm',                  // Cột B (2)
      PRODUCT_NAME: 'Tên sản phẩm',               // Cột C (3)
      SKU: 'Sku',                                 // Cột D (4)
      PRICE: 'Giá',                               // Cột G (7)
      PAYMENT_AMOUNT: 'Payment Amount',           // Cột H (8)
      CURRENCY: 'Đơn vị tiền tệ',                 // Cột I (9)
      QUANTITY: 'Số lượng',                       // Cột J (10)
      PAYMENT_METHOD: 'Phương thức thanh toán',   // Cột K (11)
      ORDER_STATUS: 'Trạng thái đơn hàng',        // Cột L (12)
      AFF_NAME: 'Tên người dùng nhà sáng tạo',    // Cột M (13)
      CONTENT_TYPE: 'Loại nội dung',              // Cột N (14)
      CONTENT_ID: 'Id nội dung',                  // Cột O (15)
      COMMISSION_MODEL: 'commission model',       // Cột P (16)
      TAX_RATE: 'Tỷ lệ khấu trừ Thuế TNCN',      // Cột Q (17)
      TAX_ESTIMATED: 'Thuế TNCN ước tính',        // Cột R (18)
      TAX_ACTUAL: 'Thuế TNCN thực tế',            // Cột S (19)
      STANDARD_COMMISSION_RATE: 'Tỷ lệ hoa hồng tiêu chuẩn',     // Cột T (20)
      COMMISSION_BASE_ESTIMATED: 'Cơ sở hoa hồng ước tính',      // Cột U (21) - DOANH THU CHÍNH
      STANDARD_COMMISSION_ESTIMATED: 'Thanh toán hoa hồng tiêu chuẩn ước tính', // Cột V (22) - HH tự nhiên ước tính
      COMMISSION_BASE_ACTUAL: 'Cơ sở hoa hồng thực tế',          // Cột W (23) - BỎ QUA
      STANDARD_COMMISSION_ACTUAL: 'Thanh toán hoa hồng thực tế',  // Cột X (24) - HH tự nhiên thực tế (chỉ "Đã hoàn thành")
      AD_COMMISSION_RATE: 'Tỷ lệ hoa hồng Quảng cáo cửa hàng',   // Cột Y (25) - % đơn từ quảng cáo
      AD_COMMISSION_ESTIMATED: 'Thanh toán hoa hồng Quảng cáo cửa hàng ước tính', // Cột Z (26) - HH QC ước tính
      AD_COMMISSION_ACTUAL: 'Thanh toán hoa hồng Quảng cáo cửa hàng thực tế',     // Cột AA (27) - HH QC thực tế (chỉ "Đã hoàn thành")
      CREATOR_BONUS_ESTIMATED: 'Thưởng đồng chi trả cho nhà sáng tạo ước tính',   // Cột AB (28)
      CREATOR_BONUS_ACTUAL: 'Thưởng đồng chi trả cho nhà sáng tạo thực tế',       // Cột AC (29)
      RETURN_REFUND: 'Trả hàng & hoàn tiền',      // Cột AD (30)
      REFUND: 'Hoàn tiền',                        // Cột AE (31)
      CREATE_TIME: 'Thời gian đã tạo',            // Cột AF (32) - NGÀY LỌC CHÍNH
      PAYMENT_TIME: 'Thời gian thanh toán',       // Cột AG (33)
      READY_SHIP_TIME: 'Thời gian sẵn sàng vận chuyển', // Cột AH (34)
      DELIVERY_TIME: 'Order Delivery Time',       // Cột AI (35)
      COMPLETE_TIME: 'Thời gian hoàn thành đơn hàng',    // Cột AJ (36)
      COMMISSION_PAID_TIME: 'Thời gian hoa hồng đã thanh toán', // Cột AK (37)
      PLATFORM: 'Platform'                       // Cột AL (38)
    };
    
    // Column mapping sẽ được populate dynamically
    this.columnMapping = {};
    this.columnWarnings = [];
    
    // Status mapping cho AFF
    this.affStatusMapping = {
      'Đã hoàn thành': 'completed',
      'Đã hủy': 'cancelled', 
      'Đang xử lý': 'processing'
    };
    
    // Content type mapping
    this.contentTypeMapping = {
      'Phát trực tiếp': 'livestream',
      'Video': 'video',
      'Trưng bày': 'display',
      'Chương trình Lưu lượng truy cập bên ngoài': 'external_traffic'
    };
  }

  // Advanced smart column detection - Tương tự DataProcessor nhưng cho AFF
  detectColumns(headers) {
    this.columnMapping = {};
    this.columnWarnings = [];
    
    console.log('[DonaffProcessor] CSV Headers detected:', headers);
    
    // Store previous mapping for change detection
    const previousMapping = { ...this.columnMapping };
    
    // Advanced matching algorithm
    for (const [key, expectedName] of Object.entries(this.expectedColumns)) {
      if (!expectedName || expectedName.trim() === '') {
        continue;
      }
      
      const result = this.findBestColumnMatch(headers, expectedName, key);
      
      if (result.index !== -1) {
        this.columnMapping[key] = result.index;
        
        // Add warning if not exact match
        if (result.confidence < 1.0) {
          this.columnWarnings.push(
            `Cảnh báo AFF: Cột "${expectedName}" → "${headers[result.index]}" ` +
            `(độ tin cậy: ${(result.confidence * 100).toFixed(1)}%)`
          );
        }
        
        // Check for position changes
        if (previousMapping[key] !== undefined && previousMapping[key] !== result.index) {
          this.columnWarnings.push(
            `Thay đổi vị trí AFF: Cột "${expectedName}" chuyển từ vị trí ${previousMapping[key]} sang ${result.index}`
          );
        }
      } else {
        this.columnWarnings.push(`❌ Lỗi nghiêm trọng AFF: Không tìm thấy cột "${expectedName}". Dữ liệu có thể bị sai lệch.`);
      }
    }
    
    // Log results with confidence levels
    console.log('[DonaffProcessor] Advanced Column Mapping Result:');
    Object.entries(this.columnMapping).forEach(([key, index]) => {
      const confidence = this.calculateMatchConfidence(headers[index], this.expectedColumns[key]);
      console.log(`  ${key}: "${headers[index]}" (index: ${index}, confidence: ${(confidence * 100).toFixed(1)}%)`);
    });
    
    // Log warnings
    if (this.columnWarnings.length > 0) {
      console.warn('[DonaffProcessor] Column Detection Issues:');
      this.columnWarnings.forEach(warning => {
        const severity = warning.includes('❌') ? 'CRITICAL' : 
                        warning.includes('Thay đổi vị trí') ? 'WARNING' : 'INFO';
        console.warn(`  [${severity}] ${warning}`);
      });
    }
    
    // Overall assessment
    const mappingRate = (Object.keys(this.columnMapping).length / Object.keys(this.expectedColumns).length) * 100;
    console.log(`[DonaffProcessor] Mapping Success Rate: ${mappingRate.toFixed(1)}% (${Object.keys(this.columnMapping).length}/${Object.keys(this.expectedColumns).length})`);
    
    return this.columnWarnings;
  }

  // Tương tự DataProcessor
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

  // Tương tự DataProcessor
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
    
    // Key term matching (for AFF-specific columns)
    const keyTerms = {
      'hoa hồng': ['hoa', 'hồng', 'commission'],
      'quảng cáo': ['quảng', 'cáo', 'ad', 'advertising'],
      'doanh thu': ['doanh', 'thu', 'revenue'],
      'tỷ lệ': ['tỷ', 'lệ', 'rate', 'percent'],
      'ước tính': ['ước', 'tính', 'estimated'],
      'thực tế': ['thực', 'tế', 'actual']
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

  // Levenshtein distance calculation - Tương tự DataProcessor
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

  // Parse number từ string - Xử lý định dạng Việt Nam
  parseNumber(value) {
    if (!value || value === '') return 0;
    if (typeof value === 'number') return value;
    
    // Remove non-numeric characters except decimal point
    const cleaned = value.toString().replace(/[^\d.-]/g, '');
    const number = parseFloat(cleaned);
    return isNaN(number) ? 0 : number;
  }

  // Parse date từ format "23/07/2025 21:19:58" - Chỉ lấy ngày
  parseAffDate(dateStr) {
    if (!dateStr || dateStr === '') return null;
    
    try {
      // Handle format: "23/07/2025 21:19:58" hoặc "23/07/2025"
      const dateOnly = dateStr.includes(' ') ? dateStr.split(' ')[0] : dateStr;
      const [day, month, year] = dateOnly.split('/');
      
      if (day && month && year) {
        // Create date in ISO format (YYYY-MM-DD)
        const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const date = new Date(isoDate);
        return isNaN(date.getTime()) ? null : date;
      }
    } catch (error) {
      console.warn('[DonaffProcessor] Error parsing date:', dateStr, error);
    }
    
    return null;
  }

  // LOGIC PHỨC TẠP: Xử lý đơn hàng trùng ID
  // Nhiều đơn cùng ID nhưng khác AFF và loại nội dung
  // Chỉ dòng nào có "Cơ sở hoa hồng ước tính" > 0 mới là dòng chính xác
  processAffOrders(rawData) {
    if (!rawData || rawData.length < 2) return [];
    
    console.log('[DonaffProcessor] Processing AFF orders with duplicate ID logic');
    
    // Handle both array data from Google Sheets and CSV string data
    const headers = Array.isArray(rawData[0]) ? rawData[0] : this.parseCSVLine(rawData[0]);
    const rows = rawData.slice(1).map(row => 
      Array.isArray(row) ? row : this.parseCSVLine(row)
    );
    
    // Detect columns dynamically
    this.detectColumns(headers);
    
    console.log(`[DonaffProcessor] Processing ${rows.length} raw rows`);
    
    // Step 1: Group rows by ORDER_ID
    const orderGroups = {};
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const orderId = row[this.columnMapping.ORDER_ID];
      
      if (!orderId || orderId.trim() === '') {
        console.warn(`[DonaffProcessor] Row ${i + 2} missing ORDER_ID, skipping`);
        continue;
      }
      
      if (!orderGroups[orderId]) {
        orderGroups[orderId] = [];
      }
      
      orderGroups[orderId].push({
        rowIndex: i + 2, // +2 because we skip header and 0-based to 1-based
        data: row
      });
    }
    
    console.log(`[DonaffProcessor] Found ${Object.keys(orderGroups).length} unique order IDs`);
    
    // Step 2: For each order group, find the PRIMARY row
    const processedOrders = [];
    let duplicateCount = 0;
    let primaryRowsFound = 0;
    
    for (const [orderId, orderRows] of Object.entries(orderGroups)) {
      if (orderRows.length > 1) {
        duplicateCount++;
        console.log(`[DonaffProcessor] Order ${orderId} has ${orderRows.length} duplicate rows`);
      }
      
      // Find PRIMARY row: có "Cơ sở hoa hồng ước tính" > 0
      let primaryRow = null;
      
      for (const orderRow of orderRows) {
        const commissionBase = this.parseNumber(orderRow.data[this.columnMapping.COMMISSION_BASE_ESTIMATED]);
        
        if (commissionBase > 0) {
          if (primaryRow) {
            console.warn(`[DonaffProcessor] Order ${orderId} has multiple primary rows! Using first one found.`);
          } else {
            primaryRow = orderRow;
            primaryRowsFound++;
          }
        }
      }
      
      if (!primaryRow) {
        console.warn(`[DonaffProcessor] Order ${orderId} has NO primary row (no commission base > 0), skipping`);
        continue;
      }
      
      // Step 3: Extract all data from PRIMARY row
      const row = primaryRow.data;
      const orderStatus = row[this.columnMapping.ORDER_STATUS] || '';
      const affName = row[this.columnMapping.AFF_NAME] || '';
      const contentType = row[this.columnMapping.CONTENT_TYPE] || '';
      
      // Parse financial data
      const commissionBaseEstimated = this.parseNumber(row[this.columnMapping.COMMISSION_BASE_ESTIMATED]) || 0; // DOANH THU CHÍNH
      const standardCommissionEstimated = this.parseNumber(row[this.columnMapping.STANDARD_COMMISSION_ESTIMATED]) || 0; // HH tự nhiên ước tính
      const adCommissionEstimated = this.parseNumber(row[this.columnMapping.AD_COMMISSION_ESTIMATED]) || 0; // HH QC ước tính
      
      // HH thực tế - CHỈ cho đơn "Đã hoàn thành"
      let standardCommissionActual = 0;
      let adCommissionActual = 0;
      
      if (orderStatus.trim() === 'Đã hoàn thành') {
        standardCommissionActual = this.parseNumber(row[this.columnMapping.STANDARD_COMMISSION_ACTUAL]) || 0;
        adCommissionActual = this.parseNumber(row[this.columnMapping.AD_COMMISSION_ACTUAL]) || 0;
      }
      
      // Parse rates
      const standardCommissionRate = this.parseNumber(row[this.columnMapping.STANDARD_COMMISSION_RATE]) || 0; // % đơn tự nhiên
      const adCommissionRate = this.parseNumber(row[this.columnMapping.AD_COMMISSION_RATE]) || 0; // % đơn từ quảng cáo
      
      // Parse dates
      const createDate = row[this.columnMapping.CREATE_TIME] || '';
      const createDateParsed = this.parseAffDate(createDate);
      
      // Create processed order
      const processedOrder = {
        id: orderId,
        affName: affName,
        productName: row[this.columnMapping.PRODUCT_NAME] || '',
        quantity: this.parseNumber(row[this.columnMapping.QUANTITY]) || 0,
        price: this.parseNumber(row[this.columnMapping.PRICE]) || 0,
        paymentAmount: this.parseNumber(row[this.columnMapping.PAYMENT_AMOUNT]) || 0,
        
        // Status and content type
        status: orderStatus,
        statusMapped: this.affStatusMapping[orderStatus.trim()] || 'unknown',
        contentType: contentType,
        contentTypeMapped: this.contentTypeMapping[contentType] || 'unknown',
        
        // Financial data - THEO LOGIC ĐÃ ĐỊNH NGHĨA
        revenue: commissionBaseEstimated, // DOANH THU CHÍNH từ cột U
        
        // Hoa hồng tự nhiên
        standardCommissionEstimated: standardCommissionEstimated,
        standardCommissionActual: standardCommissionActual, // Chỉ có nếu "Đã hoàn thành"
        standardCommissionRate: standardCommissionRate,
        
        // Hoa hồng quảng cáo
        adCommissionEstimated: adCommissionEstimated,
        adCommissionActual: adCommissionActual, // Chỉ có nếu "Đã hoàn thành"
        adCommissionRate: adCommissionRate,
        
        // Tổng hoa hồng
        totalCommissionEstimated: standardCommissionEstimated + adCommissionEstimated,
        totalCommissionActual: standardCommissionActual + adCommissionActual,
        
        // Dates
        createDate: createDate,
        createDateParsed: createDateParsed,
        paymentTime: row[this.columnMapping.PAYMENT_TIME] || '',
        
        // Additional fields
        platform: row[this.columnMapping.PLATFORM] || '',
        
        // Debug info
        primaryRowIndex: primaryRow.rowIndex,
        duplicateRowsCount: orderRows.length
      };
      
      processedOrders.push(processedOrder);
    }
    
    console.log(`[DonaffProcessor] Processing complete:`);
    console.log(`  - Total unique orders: ${Object.keys(orderGroups).length}`);
    console.log(`  - Orders with duplicates: ${duplicateCount}`);
    console.log(`  - Primary rows found: ${primaryRowsFound}`);
    console.log(`  - Final processed orders: ${processedOrders.length}`);
    
    return processedOrders;
  }

  // Parse CSV line correctly handling quoted fields - Tương tự DataProcessor
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

  // FILTER BY DATE RANGE - Sử dụng CREATE_TIME (cột AF)
  filterAffOrdersByDateRange(orders, startDate, endDate) {
    if (!startDate && !endDate) return orders;
    
    console.log(`[DonaffProcessor] Filtering ${orders.length} orders by date: ${startDate} to ${endDate}`);
    
    const filteredOrders = orders.filter(order => {
      const orderDate = order.createDateParsed;
      if (!orderDate) return false;
      
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      if (start && orderDate < start) return false;
      if (end && orderDate > end) return false;
      
      return true;
    });

    console.log(`[DonaffProcessor] After date filtering: ${filteredOrders.length} orders`);
    return filteredOrders;
  }

  // TÍNH TOÁN METRICS CHO 5 CARDS
  calculateAffMetrics(orders) {
    console.log('[DonaffProcessor] Calculating AFF metrics for cards');
    
    const metrics = {
      // Card 1: Tổng số đơn AFF
      totalOrders: {
        count: orders.length,
        revenue: 0,
        breakdown: {
          livestream: { count: 0, revenue: 0 },
          video: { count: 0, revenue: 0 },
          display: { count: 0, revenue: 0 },
          external_traffic: { count: 0, revenue: 0 }
        }
      },
      
      // Card 2: Đơn hoàn thành
      completedOrders: {
        count: 0,
        revenue: 0,
        breakdown: {
          livestream: { count: 0, revenue: 0 },
          video: { count: 0, revenue: 0 },
          display: { count: 0, revenue: 0 },
          external_traffic: { count: 0, revenue: 0 }
        }
      },
      
      // Card 3: Đơn đang xử lý
      processingOrders: {
        count: 0,
        revenue: 0,
        breakdown: {
          livestream: { count: 0, revenue: 0 },
          video: { count: 0, revenue: 0 },
          display: { count: 0, revenue: 0 },
          external_traffic: { count: 0, revenue: 0 }
        }
      },
      
      // Card 4: Đơn đã huỷ
      cancelledOrders: {
        count: 0,
        revenue: 0,
        breakdown: {
          livestream: { count: 0, revenue: 0 },
          video: { count: 0, revenue: 0 },
          display: { count: 0, revenue: 0 },
          external_traffic: { count: 0, revenue: 0 }
        }
      }
    };
    
    // Process each order
    orders.forEach(order => {
      const revenue = order.revenue || 0; // DOANH THU từ cột U
      const contentType = order.contentTypeMapped || 'unknown';
      const status = order.statusMapped || 'unknown';
      
      // Add to total
      metrics.totalOrders.count++;
      metrics.totalOrders.revenue += revenue;
      if (metrics.totalOrders.breakdown[contentType]) {
        metrics.totalOrders.breakdown[contentType].count++;
        metrics.totalOrders.breakdown[contentType].revenue += revenue;
      }
      
      // Add to specific status
      if (status === 'completed') {
        metrics.completedOrders.count++;
        metrics.completedOrders.revenue += revenue;
        if (metrics.completedOrders.breakdown[contentType]) {
          metrics.completedOrders.breakdown[contentType].count++;
          metrics.completedOrders.breakdown[contentType].revenue += revenue;
        }
      } else if (status === 'processing') {
        metrics.processingOrders.count++;
        metrics.processingOrders.revenue += revenue;
        if (metrics.processingOrders.breakdown[contentType]) {
          metrics.processingOrders.breakdown[contentType].count++;
          metrics.processingOrders.breakdown[contentType].revenue += revenue;
        }
      } else if (status === 'cancelled') {
        metrics.cancelledOrders.count++;
        metrics.cancelledOrders.revenue += revenue;
        if (metrics.cancelledOrders.breakdown[contentType]) {
          metrics.cancelledOrders.breakdown[contentType].count++;
          metrics.cancelledOrders.breakdown[contentType].revenue += revenue;
        }
      }
    });
    
    console.log('[DonaffProcessor] AFF Metrics calculated:', {
      total: metrics.totalOrders.count,
      completed: metrics.completedOrders.count,
      processing: metrics.processingOrders.count,
      cancelled: metrics.cancelledOrders.count
    });
    
    return metrics;
  }

  // TÍNH TOP 3 DOANH THU CAO NHẤT
  calculateTop3Performers(orders) {
    console.log('[DonaffProcessor] Calculating top 3 performers');
    
    // Group by AFF name
    const affStats = {};
    
    orders.forEach(order => {
      const affName = order.affName || 'Unknown';
      const revenue = order.revenue || 0; // DOANH THU từ cột U
      const standardCommission = order.standardCommissionActual || order.standardCommissionEstimated || 0;
      const adCommission = order.adCommissionActual || order.adCommissionEstimated || 0;
      const totalCommission = standardCommission + adCommission;
      
      if (!affStats[affName]) {
        affStats[affName] = {
          name: affName,
          revenue: 0,
          standardCommission: 0,
          adCommission: 0,
          totalCommission: 0,
          orderCount: 0
        };
      }
      
      affStats[affName].revenue += revenue;
      affStats[affName].standardCommission += standardCommission;
      affStats[affName].adCommission += adCommission;
      affStats[affName].totalCommission += totalCommission;
      affStats[affName].orderCount++;
    });
    
    // Sort by revenue and get top 3
    const top3 = Object.values(affStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);
    
    console.log('[DonaffProcessor] Top 3 performers calculated:', top3.map(aff => ({
      name: aff.name,
      revenue: aff.revenue,
      orders: aff.orderCount
    })));
    
    return top3;
  }

  // TÍNH TOÁN CHI TIẾT CHO TỪNG AFF (cho bảng)
  calculateAffDetails(orders) {
    console.log('[DonaffProcessor] Calculating detailed AFF stats');
    
    const affDetails = {};
    
    orders.forEach(order => {
      const affName = order.affName || 'Unknown';
      const status = order.statusMapped || 'unknown';
      const revenue = order.revenue || 0;
      const standardCommission = order.standardCommissionActual || order.standardCommissionEstimated || 0;
      const adCommission = order.adCommissionActual || order.adCommissionEstimated || 0;
      const totalCommission = standardCommission + adCommission;
      
      if (!affDetails[affName]) {
        affDetails[affName] = {
          name: affName,
          totalOrders: 0,
          completedOrders: 0,
          processingOrders: 0,
          cancelledOrders: 0,
          completedRevenue: 0,
          processingRevenue: 0,
          cancelledRevenue: 0,
          standardCommission: 0,
          adCommission: 0,
          totalCommission: 0,
          revenue: 0
        };
      }
      
      // Count orders by status
      affDetails[affName].totalOrders++;
      if (status === 'completed') {
        affDetails[affName].completedOrders++;
        affDetails[affName].completedRevenue = (affDetails[affName].completedRevenue || 0) + revenue;
      } else if (status === 'processing') {
        affDetails[affName].processingOrders++;
        affDetails[affName].processingRevenue = (affDetails[affName].processingRevenue || 0) + revenue;
      } else if (status === 'cancelled') {
        affDetails[affName].cancelledOrders++;
        affDetails[affName].cancelledRevenue = (affDetails[affName].cancelledRevenue || 0) + revenue;
      }
      
      // Sum financial data
      affDetails[affName].revenue += revenue;
      affDetails[affName].standardCommission += standardCommission;
      affDetails[affName].adCommission += adCommission;
      affDetails[affName].totalCommission += totalCommission;
    });
    
    // Convert to array and sort by total commission
    const sortedAffDetails = Object.values(affDetails)
      .sort((a, b) => b.totalCommission - a.totalCommission);
    
    console.log(`[DonaffProcessor] AFF details calculated for ${sortedAffDetails.length} affiliates`);
    
    return sortedAffDetails;
  }

  // THUẬT TOÁN NÂNG CAO: TOP 3 SẢN PHẨM BÁN NHIỀU NHẤT
  getTop3Products(orders, affName) {
    console.log(`[DonaffProcessor] Getting top 3 products for AFF: ${affName}`);
    
    const affOrders = orders.filter(order => order.affName === affName);
    const productStats = {};
    
    affOrders.forEach(order => {
      const productName = order.productName || 'Unknown Product';
      const quantity = order.quantity || 1;
      const revenue = order.revenue || 0;
      
      if (!productStats[productName]) {
        productStats[productName] = {
          name: productName,
          totalQuantity: 0,
          totalRevenue: 0,
          orderCount: 0
        };
      }
      
      productStats[productName].totalQuantity += quantity;
      productStats[productName].totalRevenue += revenue;
      productStats[productName].orderCount++;
    });
    
    // Sort by total quantity (bán nhiều nhất) and get top 3
    const top3Products = Object.values(productStats)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 3)
      .map(product => ({
        ...product,
        // Rút gọn tên sản phẩm (15-20 ký tự)
        shortName: this.truncateProductName(product.name, 18)
      }));
    
    console.log(`[DonaffProcessor] Top 3 products for ${affName}:`, top3Products);
    return top3Products;
  }
  
  // Helper: Rút gọn tên sản phẩm
  truncateProductName(name, maxLength = 18) {
    if (name.length <= maxLength) return name;
    
    // Tìm từ cuối cùng để cắt đẹp hơn
    const words = name.split(' ');
    let result = '';
    
    for (const word of words) {
      if ((result + ' ' + word).length <= maxLength) {
        result = result ? result + ' ' + word : word;
      } else {
        break;
      }
    }
    
    return result + (result.length < name.length ? '...' : '');
  }

  // PHÂN TÍCH THEO NỘI DUNG CHO TỪNG AFF
  analyzeAffByContent(orders, affName) {
    console.log(`[DonaffProcessor] Analyzing content breakdown for AFF: ${affName}`);
    
    const affOrders = orders.filter(order => order.affName === affName);
    const contentAnalysis = {};
    
    affOrders.forEach(order => {
      const contentType = order.contentType || 'Unknown';
      const contentTypeMapped = order.contentTypeMapped || 'unknown';
      const revenue = order.revenue || 0;
      const standardCommission = order.standardCommissionActual || order.standardCommissionEstimated || 0;
      const adCommission = order.adCommissionActual || order.adCommissionEstimated || 0;
      const totalCommission = standardCommission + adCommission;
      
      if (!contentAnalysis[contentType]) {
        contentAnalysis[contentType] = {
          type: contentType,
          typeMapped: contentTypeMapped,
          orderCount: 0,
          revenue: 0,
          commission: 0
        };
      }
      
      contentAnalysis[contentType].orderCount++;
      contentAnalysis[contentType].revenue += revenue;
      contentAnalysis[contentType].commission += totalCommission;
    });
    
    const result = Object.values(contentAnalysis);
    console.log(`[DonaffProcessor] Content analysis for ${affName}:`, result);
    
    return result;
  }

  // Helper functions
  getColumnWarnings() {
    return this.columnWarnings;
  }

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
}

module.exports = DonaffProcessor;
