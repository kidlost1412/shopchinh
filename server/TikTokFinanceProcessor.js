// TikTok Finance Report Processor - Hoàn toàn độc lập với Dashboard
// Xử lý tài chính TikTok theo logic riêng biệt

class TikTokFinanceProcessor {
  constructor() {
    console.log('[TikTokFinanceProcessor] Khởi tạo Finance Processor độc lập');
    
    // Mapping trạng thái riêng cho Finance - Bao gồm tất cả trạng thái
    this.financeStatusMapping = {
      'Đã nhận hàng': 'Đã nhận',
      'Đã nhận': 'Đã nhận',
      'Đã gửi hàng': 'Đã gửi hàng', 
      'Đang đóng hàng': 'Đang đóng hàng',
      'Đã xác nhận': 'Đã xác nhận',
      'Đã hoàn': 'Đã hoàn',
      'Đang hoàn': 'Đang hoàn',
      'Đã huỷ': 'Đã huỷ'
    };
  }

  // BỘ LỌC NGÀY RIÊNG CHO FINANCE - Hoàn toàn độc lập
  filterOrdersByFinanceDate(allOrders, startDate, endDate) {
    console.log(`[TikTokFinanceProcessor] Filtering ${allOrders.length} orders by date: ${startDate} to ${endDate}`);
    
    if (!startDate && !endDate) {
      console.log('[TikTokFinanceProcessor] No date filter applied');
      return allOrders;
    }

    const filteredOrders = allOrders.filter(order => {
      // Sử dụng deliveryDate hoặc createDate để filter
      const orderDate = order.deliveryDateParsed || order.createDateParsed;
      if (!orderDate) return false;
      
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      if (start && orderDate < start) return false;
      if (end && orderDate > end) return false;
      
      return true;
    });

    console.log(`[TikTokFinanceProcessor] After date filtering: ${filteredOrders.length} orders`);
    return filteredOrders;
  }

  // TÍNH TỔNG DOANH THU ĐÃ NHẬN - Logic từ memory.md
  calculateTotalReceivedRevenue(ordersInPeriod) {
    console.log('[TikTokFinanceProcessor] Calculating total received revenue');
    
    // Filter orders có status = 'Đã nhận'
    const receivedOrders = ordersInPeriod.filter(order => {
      const status = order.status.trim();
      return status === 'Đã nhận';
    });

    console.log(`[TikTokFinanceProcessor] Found ${receivedOrders.length} received orders`);
    
    // Lấy doanh thu từ cột REVENUE: 'Doanh thu chưa trừ phí sàn'
    const totalRevenue = receivedOrders.reduce((sum, order) => {
      const revenue = order.revenueBeforeFees || 0;
      return sum + revenue;
    }, 0);

    return {
      orderCount: receivedOrders.length,
      totalRevenue: totalRevenue,
      orders: receivedOrders
    };
  }

  // TÍNH TỔNG CHI PHÍ SÀN - Logic từ memory.md
  calculateTotalPlatformCosts(receivedOrders) {
    console.log('[TikTokFinanceProcessor] Calculating platform costs');
    
    // Các loại chi phí theo memory.md - PARSE FLOAT để đảm bảo tính đúng
    const costBreakdown = {
      affFee: Math.abs(receivedOrders.reduce((sum, order) => sum + (parseFloat(order.affFee) || 0), 0)),
      shippingFee: Math.abs(receivedOrders.reduce((sum, order) => sum + (parseFloat(order.shippingFee) || 0), 0)),
      shopShippingFee: Math.abs(receivedOrders.reduce((sum, order) => sum + (parseFloat(order.shopShippingFee) || 0), 0)),
      platformFee: Math.abs(receivedOrders.reduce((sum, order) => sum + (parseFloat(order.actualFee9) || 0), 0)),
      xtraFee: Math.abs(receivedOrders.reduce((sum, order) => sum + (parseFloat(order.xtraFee) || 0), 0)),
      flashSaleFee: Math.abs(receivedOrders.reduce((sum, order) => sum + (parseFloat(order.flashSaleFee) || 0), 0)),
      tax: Math.abs(receivedOrders.reduce((sum, order) => sum + (parseFloat(order.tax) || 0), 0)),
      tiktokSubsidy: Math.abs(receivedOrders.reduce((sum, order) => sum + (parseFloat(order.tiktokSubsidy) || 0), 0))
    };

    // Debug: Log how many orders contribute to tax
    const taxOrders = receivedOrders.filter(order => parseFloat(order.tax) > 0);
    console.log(`[TikTokFinanceProcessor] Tax calculation: ${taxOrders.length} orders with tax > 0, total: ${costBreakdown.tax.toLocaleString()}`);

    // Tổng chi phí = tất cả chi phí - phí TikTok bù
    const totalCosts = costBreakdown.affFee + costBreakdown.shippingFee + 
                      costBreakdown.shopShippingFee + costBreakdown.platformFee + 
                      costBreakdown.xtraFee + costBreakdown.flashSaleFee + 
                      costBreakdown.tax - costBreakdown.tiktokSubsidy;

    console.log(`[TikTokFinanceProcessor] Total platform costs: ${totalCosts.toLocaleString()}`);
    
    return {
      totalCosts,
      breakdown: costBreakdown
    };
  }

  // TÍNH SỐ DƯ TIKTOK HIỆN TẠI - Logic từ memory.md (Cập nhật trừ GVM)
  calculateCurrentTikTokBalance(allOrders, totalWithdrawn, totalGvmFee = 0) {
    console.log('[TikTokFinanceProcessor] Calculating current TikTok balance');
    
    // TẤT CẢ orders (không filter date) có actualReceived
    const totalActualReceived = allOrders.reduce((sum, order) => {
      return sum + (order.actualReceived || 0);
    }, 0);

    // Số dư = Tổng actualReceived - Tổng tiền rút - Tổng phí GVM
    const currentBalance = totalActualReceived - totalWithdrawn - totalGvmFee;
    
    console.log(`[TikTokFinanceProcessor] Total actual received: ${totalActualReceived.toLocaleString()}`);
    console.log(`[TikTokFinanceProcessor] Total withdrawn: ${totalWithdrawn.toLocaleString()}`);
    console.log(`[TikTokFinanceProcessor] Total GVM fee: ${totalGvmFee.toLocaleString()}`);
    console.log(`[TikTokFinanceProcessor] Current balance: ${currentBalance.toLocaleString()}`);

    return {
      totalActualReceived,
      totalWithdrawn,
      totalGvmFee,
      currentBalance
    };
  }

  // TÍNH ĐÃ ĐỐI SOÁT - Logic từ memory.md (Sửa lại)
  calculateReconciledOrders(ordersInPeriod) {
    console.log('[TikTokFinanceProcessor] Calculating reconciled orders');
    
    // CHỈ lọc đơn có trạng thái 'Đã nhận' trước
    const receivedOrdersOnly = ordersInPeriod.filter(order => {
      const status = order.status.trim();
      return status === 'Đã nhận';
    });
    
    console.log(`[TikTokFinanceProcessor] Found ${receivedOrdersOnly.length} orders with status 'Đã nhận'`);
    
    // Đã đối soát: có actualReceived (bất kể âm hay dương - giữ nguyên giá trị)
    const reconciledOrders = receivedOrdersOnly.filter(order => {
      // Có actualReceived và khác 0 (có thể âm)
      return order.actualReceived !== null && order.actualReceived !== undefined && order.actualReceived !== 0;
    });

    // Chưa đối soát: không có actualReceived hoặc bằng 0
    const unreconciledOrders = receivedOrdersOnly.filter(order => {
      return !order.actualReceived || order.actualReceived === 0;
    });

    // Tính tổng tiền thực nhận (KHÔNG dùng Math.abs - giữ nguyên giá trị âm/dương)
    const reconciledRevenue = reconciledOrders.reduce((sum, order) => {
      return sum + (order.actualReceived || 0);
    }, 0);

    // Chưa đối soát: lấy doanh thu từ cột "Doanh thu chưa trừ phí sàn"
    const unreconciledRevenue = unreconciledOrders.reduce((sum, order) => {
      return sum + (order.revenueBeforeFees || 0);
    }, 0);

    console.log(`[TikTokFinanceProcessor] Reconciled: ${reconciledOrders.length} orders, Revenue: ${reconciledRevenue.toLocaleString()}`);
    console.log(`[TikTokFinanceProcessor] Unreconciled: ${unreconciledOrders.length} orders, Revenue: ${unreconciledRevenue.toLocaleString()}`);

    return {
      reconciledCount: reconciledOrders.length,
      reconciledRevenue: reconciledRevenue,
      unreconciledCount: unreconciledOrders.length,
      unreconciledRevenue: unreconciledRevenue,
      reconciledOrders: reconciledOrders,
      unreconciledOrders: unreconciledOrders
    };
  }

  // HÀM CHÍNH: Generate Finance Report
  generateFinanceReport(allOrders, startDate, endDate, advertisingData = null, withdrawalData = null) {
    console.log(`[TikTokFinanceProcessor] Generating Finance Report`);
    console.log(`[TikTokFinanceProcessor] Period: ${startDate} to ${endDate}`);
    console.log(`[TikTokFinanceProcessor] Input orders: ${allOrders.length}`);

    // 1. Lọc đơn hàng theo ngày (cho các metrics cần filter)
    const ordersInPeriod = this.filterOrdersByFinanceDate(allOrders, startDate, endDate);
    
    // 2. Tính tổng doanh thu đã nhận
    const revenueData = this.calculateTotalReceivedRevenue(ordersInPeriod);
    
    // 3. Tính tổng chi phí sàn
    const costsData = this.calculateTotalPlatformCosts(revenueData.orders);
    
    // 4. Tính số dư TikTok hiện tại (không filter date) - Bao gồm GVM
    const totalWithdrawn = withdrawalData ? withdrawalData.totalWithdrawn : 0;
    const totalGvmFee = withdrawalData ? (withdrawalData.totalGvmFee || 0) : 0;
    const balanceData = this.calculateCurrentTikTokBalance(allOrders, totalWithdrawn, totalGvmFee);
    
    // 5. Tính đã đối soát
    const reconciliationData = this.calculateReconciledOrders(ordersInPeriod);
    
    // 6. Tiền quảng cáo (có filter date) - Bao gồm GVM
    const adData = {
      totalDeposit: advertisingData ? advertisingData.totalDeposit : 0,
      totalTax: advertisingData ? advertisingData.totalTax : 0,
      actualReceived: advertisingData ? advertisingData.actualReceived : 0,
      recordCount: advertisingData ? advertisingData.recordCount : 0,
      totalGvmFee: withdrawalData ? (withdrawalData.totalGvmFee || 0) : 0,
      gvmRecordCount: withdrawalData ? (withdrawalData.gvmRecordCount || 0) : 0
    };

    // 7. Tiền rút trong kỳ (có filter date)
    const withdrawnInPeriod = withdrawalData ? withdrawalData.periodWithdrawn : 0;

    const financeReport = {
      // Metrics cần filter theo date
      totalReceivedRevenue: revenueData.totalRevenue,
      totalReceivedOrders: revenueData.orderCount,
      totalPlatformCosts: costsData.totalCosts,
      reconciledOrdersCount: reconciliationData.reconciledCount,
      reconciledRevenue: reconciliationData.reconciledRevenue,
      unreconciledOrdersCount: reconciliationData.unreconciledCount,
      unreconciledRevenue: reconciliationData.unreconciledRevenue,
      advertisingData: adData,
      withdrawnInPeriod: withdrawnInPeriod,
      
      // Metrics không filter date
      currentTikTokBalance: balanceData.currentBalance,
      totalWithdrawnAllTime: balanceData.totalWithdrawn,
      totalActualReceivedAllTime: balanceData.totalActualReceived,
      
      // Chi tiết chi phí
      costBreakdown: costsData.breakdown,
      
      // Meta data
      dateRange: { startDate, endDate },
      totalOrdersProcessed: allOrders.length,
      ordersInPeriod: ordersInPeriod.length
    };

    console.log('[TikTokFinanceProcessor] Finance report generated successfully');
    return financeReport;
  }
}

module.exports = TikTokFinanceProcessor;
