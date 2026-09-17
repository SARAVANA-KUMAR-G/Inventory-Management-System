const http = require('http');
const app = require('./src/app');

async function runTests() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Test server running on port ${port}`);

  async function request(path, options = {}) {
    const url = `${baseUrl}${path}`;
    const headers = options.headers || {};
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    return { status: res.status, data };
  }

  try {
    console.log('\n--- 1. Health check ---');
    const health = await request('/health');
    console.log('Health status:', health.status, health.data);
    if (health.status !== 200) throw new Error('Health check failed');

    console.log('\n--- 2. Auth: Admin Login ---');
    const adminLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'admin@inventory.com', password: 'Admin@123456' }
    });
    console.log('Admin login status:', adminLogin.status, 'Success:', adminLogin.data.success);
    if (adminLogin.status !== 200 || !adminLogin.data.data?.accessToken) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.data)}`);
    }
    const adminToken = adminLogin.data.data.accessToken;

    console.log('\n--- 3. Auth: Staff Login ---');
    const staffLogin = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'staff@inventory.com', password: 'Staff@123456' }
    });
    console.log('Staff login status:', staffLogin.status, 'Role:', staffLogin.data.data?.user?.role);
    if (staffLogin.status !== 200 || staffLogin.data.data?.user?.role !== 'STAFF' || !staffLogin.data.data?.accessToken) {
      throw new Error(`Staff login failed: ${JSON.stringify(staffLogin.data)}`);
    }
    const staffToken = staffLogin.data.data.accessToken;

    console.log('\n--- 4. List Products ---');
    const productsRes = await request('/api/v1/products', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Products count:', productsRes.data.data?.length);
    if (productsRes.status !== 200 || !productsRes.data.data?.length) {
      throw new Error('List products failed');
    }
    const targetProduct = productsRes.data.data[0];
    console.log(`Using target product: ${targetProduct.name} (${targetProduct.sku}), current stock: ${targetProduct.currentStock}`);

    console.log('\n--- 5. Stock In Operation ---');
    const stockInRes = await request('/api/v1/inventory/stock-in', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: {
        productId: targetProduct.id,
        quantity: 15,
        unitCost: targetProduct.costPrice,
        supplier: 'Test Global Suppliers',
        notes: 'Verification stock in'
      }
    });
    console.log('Stock in status:', stockInRes.status, 'New stock:', stockInRes.data.data?.product?.currentStock);
    if (stockInRes.status !== 201) throw new Error(`Stock in failed: ${JSON.stringify(stockInRes.data)}`);

    console.log('\n--- 6. Stock Adjustment (Negative Stock Prevention Test) ---');
    const negAdjustRes = await request('/api/v1/inventory/adjustment', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: {
        productId: targetProduct.id,
        type: 'ADJUSTMENT_OUT',
        quantity: 999999, // Exceeds stock
        reason: 'Damaged'
      }
    });
    console.log('Negative stock attempt status:', negAdjustRes.status, 'Message:', negAdjustRes.data.error?.message || negAdjustRes.data.message);
    if (negAdjustRes.status === 200 || negAdjustRes.status === 201) {
      throw new Error('Negative stock was erroneously allowed!');
    }

    console.log('\n--- 7. Valid Stock Adjustment Out ---');
    const validAdjustRes = await request('/api/v1/inventory/adjustment', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: {
        productId: targetProduct.id,
        type: 'ADJUSTMENT_OUT',
        quantity: 2,
        reason: 'Damaged',
        notes: 'Damaged box in transit'
      }
    });
    console.log('Valid adjust status:', validAdjustRes.status, 'New stock:', validAdjustRes.data.data?.product?.currentStock);
    if (validAdjustRes.status !== 201) throw new Error(`Valid adjustment failed: ${JSON.stringify(validAdjustRes.data)}`);

    console.log('\n--- 8. POS Sale Creation ---');
    const saleRes = await request('/api/v1/sales', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: {
        customerName: 'Alice Green',
        customerPhone: '+1-555-0199',
        paymentMethod: 'CASH',
        items: [
          { productId: targetProduct.id, quantity: 3 }
        ],
        discount: 2,
        tax: 5,
        notes: 'In-store test transaction'
      }
    });
    console.log('POS sale status:', saleRes.status, 'Invoice:', saleRes.data.data?.invoiceNumber, 'Total:', saleRes.data.data?.totalAmount);
    if (saleRes.status !== 201 || !saleRes.data.data?.invoiceNumber) {
      throw new Error(`POS Sale creation failed: ${JSON.stringify(saleRes.data)}`);
    }

    console.log('\n--- 9. Stock Transactions Ledger ---');
    const txRes = await request('/api/v1/inventory/transactions', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Transactions count:', txRes.data.data?.length, 'Latest reason:', txRes.data.data?.[0]?.reason);
    if (txRes.status !== 200 || !txRes.data.data?.length) {
      throw new Error('Stock transactions ledger failed');
    }

    console.log('\n--- 10. Dashboard Summary ---');
    const dashRes = await request('/api/v1/dashboard/summary', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Dashboard KPIs:', {
      totalProducts: dashRes.data.data?.totalProducts,
      totalStockItems: dashRes.data.data?.totalStockItems,
      todayRevenue: dashRes.data.data?.todayRevenue,
      todaySalesCount: dashRes.data.data?.todaySalesCount
    });
    if (dashRes.status !== 200) throw new Error('Dashboard summary failed');

    console.log('\n--- 11. Reports (Admin) ---');
    const stockReport = await request('/api/v1/reports/stock', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const salesReport = await request('/api/v1/reports/sales', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const movementReport = await request('/api/v1/reports/movement', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Reports fetched successfully. Stock items:', stockReport.data.data?.length, 'Sales items:', salesReport.data.data?.items?.length, 'Movements:', movementReport.data.data?.length);
    if (stockReport.status !== 200 || salesReport.status !== 200 || movementReport.status !== 200) {
      throw new Error('Admin reports failed');
    }

    console.log('\n--- 12. Staff Role Restriction Check ---');
    const staffReports = await request('/api/v1/reports/stock', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    console.log('Staff reports status (expected 403):', staffReports.status);
    if (staffReports.status !== 403) throw new Error('Staff should not be able to access reports!');

    const staffUsers = await request('/api/v1/users', {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    console.log('Staff users status (expected 403):', staffUsers.status);
    if (staffUsers.status !== 403) throw new Error('Staff should not be able to access users!');

    console.log('\n>>> ALL 12 BACKEND INTEGRATION TESTS PASSED! <<<');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
