// Finance Order Processor - Xử lý riêng cho Finance Report
// Tách biệt hoàn toàn với Dashboard để tránh conflict

class FinanceOrderProcessor {
  constructor() {
    console.log('[FinanceOrderProcessor] Khởi tạo Finance Order Processor');
  }

  // Lọc đơn hàng theo loại phí - Logic riêng cho Finance
  filterOrdersByFeeType(orders, feeType) {
    console.log(`\n=== [FinanceOrderProcessor] FILTERING ${orders.length} ORDERS BY ${feeType.toUpperCase()} ===`);
    
    // Count orders with non-zero values for this fee type
    let ordersWithFee = 0;
    let totalFeeSum = 0;
    
    orders.forEach(order => {
      const feeValue = parseFloat(this.getFeeValue(order, feeType)) || 0;
      if (feeValue !== 0) { // Changed from > 0 to !== 0 to include negative fees
        ordersWithFee++;
        totalFeeSum += feeValue;
      }
    });
    
    console.log(`[FinanceOrderProcessor] Pre-filter analysis: ${ordersWithFee}/${orders.length} orders have ${feeType} !== 0, total sum: ${totalFeeSum.toLocaleString()}`);
    
    // Log first 5 orders to see actual data structure
    if (orders.length > 0) {
      console.log(`[FinanceOrderProcessor] Sample data for ${feeType}:`);
      orders.slice(0, 5).forEach((order, index) => {
        const rawValue = this.getFeeValue(order, feeType);
        const parsedValue = parseFloat(rawValue) || 0;
        console.log(`  Order ${index + 1} [${order.id}]: ${feeType} = "${rawValue}" (${typeof rawValue}) -> ${parsedValue} -> valid: ${parsedValue !== 0}`);
      });
    }
    
    const filteredOrders = orders.filter(order => {
      let hasValidFee = false;
      let feeValue = 0;

      switch (feeType) {
        case 'affFee':
          feeValue = parseFloat(order.affFee) || 0;
          hasValidFee = feeValue !== 0; // Show all orders with this fee field, including 0 values
          break;
          
        case 'shippingFee':
          feeValue = parseFloat(order.shippingFee) || 0;
          hasValidFee = feeValue !== 0;
          break;
          
        case 'shopShippingFee':
          feeValue = parseFloat(order.shopShippingFee) || 0;
          hasValidFee = feeValue !== 0;
          break;
          
        case 'platformFee':
          // Map to actualFee9 (Phí 9% thực tế)
          feeValue = parseFloat(order.actualFee9) || 0;
          hasValidFee = feeValue !== 0;
          break;
          
        case 'xtraFee':
          feeValue = parseFloat(order.xtraFee) || 0;
          hasValidFee = feeValue !== 0;
          console.log(`[FinanceOrderProcessor] XtraFee check - Order ${order.id}: xtraFee = "${order.xtraFee}" -> parsed = ${feeValue} -> valid = ${hasValidFee}`);
          break;
          
        case 'flashSaleFee':
          feeValue = parseFloat(order.flashSaleFee) || 0;
          hasValidFee = feeValue !== 0;
          break;
          
        case 'tax':
          feeValue = parseFloat(order.tax) || 0;
          hasValidFee = feeValue !== 0;
          console.log(`[FinanceOrderProcessor] Tax check - Order ${order.id}: tax = "${order.tax}" -> parsed = ${feeValue} -> valid = ${hasValidFee}`);
          break;
          
        case 'tiktokSubsidy':
          feeValue = parseFloat(order.tiktokSubsidy) || 0;
          hasValidFee = feeValue !== 0;
          break;
          
        case 'orderProcessingFee':
          feeValue = parseFloat(order.orderProcessingFee) || 0;
          hasValidFee = feeValue !== 0;
          console.log(`[FinanceOrderProcessor] OrderProcessingFee check - Order ${order.id}: orderProcessingFee = "${order.orderProcessingFee}" -> parsed = ${feeValue} -> valid = ${hasValidFee}`);
          break;
          
        default:
          return false;
      }

      // Debug log cho từng đơn hàng có fee !== 0
      if (hasValidFee) {
        console.log(`[FinanceOrderProcessor] ✅ Order ${order.id}: ${feeType} = ${feeValue}`);
      }

      return hasValidFee;
    });

    console.log(`[FinanceOrderProcessor] ✅ Found ${filteredOrders.length} orders with ${feeType} !== 0`);
    
    // If no orders found, let's check why
    if (filteredOrders.length === 0) {
      console.log(`[FinanceOrderProcessor] ❌ No orders found for ${feeType}. Checking sample data...`);
      const sampleOrders = orders.slice(0, 5);
      sampleOrders.forEach((order, index) => {
        const feeValue = this.getFeeValue(order, feeType);
        console.log(`[FinanceOrderProcessor] Sample ${index + 1} - Order ${order.id}: ${feeType} = ${feeValue} (type: ${typeof feeValue})`);
      });
    }

    return filteredOrders;
  }

  // Helper method to get fee value
  getFeeValue(order, feeType) {
    switch (feeType) {
      case 'affFee': return order.affFee;
      case 'shippingFee': return order.shippingFee;
      case 'shopShippingFee': return order.shopShippingFee;
      case 'platformFee': return order.actualFee9;
      case 'xtraFee': return order.xtraFee;
      case 'flashSaleFee': return order.flashSaleFee;
      case 'tax': return order.tax;
      case 'tiktokSubsidy': return order.tiktokSubsidy;
      case 'orderProcessingFee': return order.orderProcessingFee;
      default: return null;
    }
  }

  // Tính tổng phí cho loại phí cụ thể
  calculateTotalFeeForType(orders, feeType) {
    const totalFee = orders.reduce((sum, order) => {
      let feeValue = 0;
      
      switch (feeType) {
        case 'platformFee':
          feeValue = order.actualFee9 || 0; // Map to actualFee9 for platform fee
          break;
        default:
          feeValue = order[feeType] || 0;
      }
      
      return sum + feeValue;
    }, 0);

    console.log(`[FinanceOrderProcessor] Total ${feeType}: ${totalFee.toLocaleString()}`);
    return totalFee;
  }

  // Tìm kiếm đơn hàng với logic thông minh
  searchOrders(orders, searchTerm) {
    if (!searchTerm) return orders;
    
    const term = searchTerm.toLowerCase().trim();
    
    // Smart search: 4-5 digits for partial ID matching
    const isPartialSearch = /^\d{4,5}$/.test(term);
    
    const searchedOrders = orders.filter(order => {
      const orderId = order.id ? order.id.toLowerCase() : '';
      const waybillCode = order.waybillCode ? order.waybillCode.toLowerCase() : '';
      
      if (isPartialSearch) {
        return orderId.endsWith(term) || 
               orderId.includes(term) ||
               waybillCode.endsWith(term) ||
               waybillCode.includes(term);
      } else {
        return orderId.includes(term) || waybillCode.includes(term);
      }
    });

    console.log(`[FinanceOrderProcessor] Search "${searchTerm}": ${searchedOrders.length}/${orders.length} orders found`);
    return searchedOrders;
  }

  // Phân trang kết quả
  paginateOrders(orders, page = 1, limit = 10) {
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedOrders = orders.slice(startIndex, endIndex);
    
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: orders.length,
      totalPages: Math.ceil(orders.length / parseInt(limit))
    };

    console.log(`[FinanceOrderProcessor] Pagination: page ${page}/${pagination.totalPages}, showing ${paginatedOrders.length}/${orders.length} orders`);
    
    return {
      orders: paginatedOrders,
      pagination
    };
  }

  // Lọc đơn hàng theo các loại summary card chính
  filterOrdersBySummaryType(orders, summaryType) {
    console.log(`\n=== [FinanceOrderProcessor] FILTERING ${orders.length} ORDERS BY SUMMARY: ${summaryType.toUpperCase()} ===`);

    let filteredOrders = [];

    // Chỉ lọc các đơn có trạng thái "Đã nhận" làm cơ sở
    const receivedOrdersOnly = orders.filter(order => {
      const status = (order.status || '').trim();
      return status === 'Đã nhận' || status === 'Đã nhận hàng';
    });

    switch (summaryType) {
      // "Tổng doanh thu đã nhận" và "Tổng chi phí sàn" đều dựa trên các đơn đã nhận hàng
      case 'totalReceived':
      case 'totalCosts':
        filteredOrders = receivedOrdersOnly;
        break;
      
      // "Đã đối soát": đơn đã nhận VÀ có tiền thực nhận khác 0
      case 'reconciled':
        filteredOrders = receivedOrdersOnly.filter(order => {
          const actualReceived = parseFloat(order.actualReceived);
          return !isNaN(actualReceived) && actualReceived !== 0;
        });
        break;
      
      // "Chưa đối soát": đơn đã nhận VÀ tiền thực nhận là 0 hoặc null/undefined
      case 'unreconciled':
        filteredOrders = receivedOrdersOnly.filter(order => {
          const actualReceived = parseFloat(order.actualReceived);
          return isNaN(actualReceived) || actualReceived === 0;
        });
        break;

      default:
        console.warn(`[FinanceOrderProcessor] Unknown summaryType: "${summaryType}"`);
        return [];
    }

    console.log(`[FinanceOrderProcessor] ✅ Found ${filteredOrders.length} orders for summary type "${summaryType}"`);
    return filteredOrders;
  }
}

module.exports = FinanceOrderProcessor;
