const { PrismaClient, Role, StockTransactionType, PaymentMethod } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding V1 database...');

  // 1. Create Users
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin@123456', salt);
  const staffPasswordHash = await bcrypt.hash('Staff@123456', salt);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@inventory.com' },
    update: { passwordHash: adminPasswordHash, role: Role.ADMIN },
    create: {
      email: 'admin@inventory.com',
      passwordHash: adminPasswordHash,
      firstName: 'System',
      lastName: 'Admin',
      role: Role.ADMIN,
      isActive: true
    }
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@inventory.com' },
    update: { passwordHash: staffPasswordHash, role: Role.STAFF },
    create: {
      email: 'staff@inventory.com',
      passwordHash: staffPasswordHash,
      firstName: 'Store',
      lastName: 'Staff',
      role: Role.STAFF,
      isActive: true
    }
  });

  console.log('✅ Users seeded: admin@inventory.com, staff@inventory.com');

  // 2. Create Categories
  const categoryData = [
    { name: 'Electronics', description: 'Computing, audio, and gadgets' },
    { name: 'Accessories', description: 'Cables, adapters, and peripherals' },
    { name: 'Office Supplies', description: 'Paper, pens, and office stationery' },
    { name: 'Hardware', description: 'Tools, fasteners, and maintenance items' }
  ];

  const categories = {};
  for (const cat of categoryData) {
    const c = await prisma.category.upsert({
      where: { name: cat.name },
      update: { description: cat.description },
      create: { name: cat.name, description: cat.description }
    });
    categories[cat.name] = c;
  }
  console.log('✅ Categories seeded');

  // 3. Create Sample Products
  const productsData = [
    {
      sku: 'ELEC-MOU-001',
      name: 'Logitech Wireless Mouse M185',
      category: 'Electronics',
      barcode: '8901234567890',
      unit: 'pcs',
      costPrice: 12.00,
      sellingPrice: 24.99,
      currentStock: 25,
      reorderLevel: 5
    },
    {
      sku: 'ELEC-KEY-002',
      name: 'Mechanical Gaming Keyboard RGB',
      category: 'Electronics',
      barcode: '8901234567891',
      unit: 'pcs',
      costPrice: 35.00,
      sellingPrice: 69.99,
      currentStock: 15,
      reorderLevel: 5
    },
    {
      sku: 'ACC-CAB-003',
      name: 'Braided USB-C Cable 2M',
      category: 'Accessories',
      barcode: '8901234567892',
      unit: 'pcs',
      costPrice: 2.50,
      sellingPrice: 8.99,
      currentStock: 40,
      reorderLevel: 10
    },
    {
      sku: 'OFF-PAP-004',
      name: 'A4 Copier Paper 75GSM 500 Sheets',
      category: 'Office Supplies',
      barcode: '8901234567893',
      unit: 'ream',
      costPrice: 3.20,
      sellingPrice: 6.50,
      currentStock: 4, // Low stock
      reorderLevel: 10
    },
    {
      sku: 'OFF-CHR-005',
      name: 'Ergonomic Mesh Office Chair',
      category: 'Office Supplies',
      barcode: '8901234567894',
      unit: 'pcs',
      costPrice: 80.00,
      sellingPrice: 149.99,
      currentStock: 0, // Out of stock
      reorderLevel: 3
    },
    {
      sku: 'HDW-SCR-006',
      name: 'Precision Screwdriver Tool Set 24-in-1',
      category: 'Hardware',
      barcode: '8901234567895',
      unit: 'set',
      costPrice: 9.00,
      sellingPrice: 19.99,
      currentStock: 18,
      reorderLevel: 4
    }
  ];

  for (const p of productsData) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (!existing) {
      const prod = await prisma.product.create({
        data: {
          sku: p.sku,
          name: p.name,
          categoryId: categories[p.category].id,
          barcode: p.barcode,
          unit: p.unit,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          currentStock: p.currentStock,
          reorderLevel: p.reorderLevel
        }
      });

      // If initial stock > 0, record initial StockTransaction
      if (p.currentStock > 0) {
        await prisma.stockTransaction.create({
          data: {
            productId: prod.id,
            userId: admin.id,
            transactionType: StockTransactionType.STOCK_IN,
            quantity: p.currentStock,
            balanceAfter: p.currentStock,
            reason: 'Opening stock count'
          }
        });
      }
    }
  }
  console.log('✅ Products & initial stock transactions seeded');

  // 4. Sample Sale
  const existingSale = await prisma.sale.findUnique({ where: { invoiceNumber: 'INV-000001' } });
  if (!existingSale) {
    const mouse = await prisma.product.findUnique({ where: { sku: 'ELEC-MOU-001' } });
    const cable = await prisma.product.findUnique({ where: { sku: 'ACC-CAB-003' } });

    if (mouse && cable) {
      const mouseQty = 2;
      const cableQty = 1;
      const mouseTotal = mouseQty * Number(mouse.sellingPrice);
      const cableTotal = cableQty * Number(cable.sellingPrice);
      const subtotal = mouseTotal + cableTotal;
      const grandTotal = subtotal;

      const sale = await prisma.sale.create({
        data: {
          invoiceNumber: 'INV-000001',
          userId: staff.id,
          subtotal,
          discountAmount: 0,
          taxAmount: 0,
          grandTotal,
          paymentMethod: PaymentMethod.CASH,
          items: {
            create: [
              {
                productId: mouse.id,
                quantity: mouseQty,
                unitPrice: mouse.sellingPrice,
                costPrice: mouse.costPrice,
                lineTotal: mouseTotal
              },
              {
                productId: cable.id,
                quantity: cableQty,
                unitPrice: cable.sellingPrice,
                costPrice: cable.costPrice,
                lineTotal: cableTotal
              }
            ]
          }
        }
      });

      // Update currentStock & record SALE transactions
      const newMouseStock = Number(mouse.currentStock) - mouseQty;
      await prisma.product.update({
        where: { id: mouse.id },
        data: { currentStock: newMouseStock }
      });
      await prisma.stockTransaction.create({
        data: {
          productId: mouse.id,
          userId: staff.id,
          transactionType: StockTransactionType.SALE,
          quantity: -mouseQty,
          balanceAfter: newMouseStock,
          reason: 'Sale INV-000001',
          referenceId: sale.id
        }
      });

      const newCableStock = Number(cable.currentStock) - cableQty;
      await prisma.product.update({
        where: { id: cable.id },
        data: { currentStock: newCableStock }
      });
      await prisma.stockTransaction.create({
        data: {
          productId: cable.id,
          userId: staff.id,
          transactionType: StockTransactionType.SALE,
          quantity: -cableQty,
          balanceAfter: newCableStock,
          reason: 'Sale INV-000001',
          referenceId: sale.id
        }
      });

      console.log('✅ Initial sale INV-000001 created');
    }
  }

  console.log('🎉 Database seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
