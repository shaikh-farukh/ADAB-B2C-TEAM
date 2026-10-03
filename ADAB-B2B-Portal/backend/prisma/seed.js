import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with default values...');

  const defaultPassword = await bcrypt.hash('password123', 10);

  // Create user types
  const manufacturerType = await prisma.manage_b_to_b_user_type.upsert({
    where: { typename: 'manufacturer' },
    update: {},
    create: { typename: 'manufacturer', active: true }
  });

  const distributorType = await prisma.manage_b_to_b_user_type.upsert({
    where: { typename: 'distributor' },
    update: {},
    create: { typename: 'distributor', active: true }
  });

  // Create 10 manufacturers
  const manufacturers = [];
  for (let i = 1; i <= 10; i++) {
    const email = `manufacturer${i}@example.com`;
    const m = await prisma.manage_b_to_b_userdetail.upsert({
      where: { email },
      update: { password: defaultPassword, business_type_id: manufacturerType.id },
      create: {
        company_name: `Adab Manufacturer ${i} Inc`,
        owner_name: `John Doe ${i}`,
        email: email,
        password: defaultPassword,
        business_type_id: manufacturerType.id,
        mobile: `123456789${i%10}`,
        kyc_status: 'APPROVED',
        active: true
      }
    });
    manufacturers.push(m);
  }
  console.log(`Ensured 10 manufacturers exist`);

  // Create 20 distributors
  const distributors = [];
  for (let i = 1; i <= 20; i++) {
    const email = `distributor${i}@example.com`;
    const d = await prisma.manage_b_to_b_userdetail.upsert({
      where: { email },
      update: { password: defaultPassword, business_type_id: distributorType.id },
      create: {
        company_name: `Adab Distributor ${i} LLC`,
        owner_name: `Jane Doe ${i}`,
        email: email,
        password: defaultPassword,
        business_type_id: distributorType.id,
        mobile: `987654321${i%10}`,
        kyc_status: 'APPROVED',
        active: true
      }
    });
    distributors.push(d);
  }
  console.log(`Ensured 20 distributors exist`);

  // Create 500 products distributed among manufacturers
  console.log('Seeding 500 products (this may take a moment)...');
  const productCount = 500;
  for (let i = 1; i <= productCount; i++) {
    const manufacturer = manufacturers[i % manufacturers.length];
    const sku = `SKU-SEED-${String(i).padStart(4, '0')}`;

    // We can't use upsert for products without a unique constraint on SKU,
    // so we use findFirst + create or update.
    const existing = await prisma.manage_manufacturer_products.findFirst({
      where: { sku, manufacturer_id: manufacturer.id }
    });

    const data = {
      manufacturer_id: manufacturer.id,
      product_name: `Bulk Seeded Product ${i}`,
      sku: sku,
      unit: 'pcs',
      price: (10 + (i % 50)) * 1.0,
      mrp: (15 + (i % 50)) * 1.0,
      moq: 10 + (i % 5),
      total_stock: 5000,
      hsn_code: `1234${i%10}`,
      gst_rate: 18.0,
      tier_pricing: [
        { min_qty: 10, max_qty: 49, price: (10 + (i % 50)) * 1.0 },
        { min_qty: 50, max_qty: 99, price: (10 + (i % 50)) * 0.9 },
        { min_qty: 100, max_qty: null, price: (10 + (i % 50)) * 0.8 }
      ],
      active: true,
      status: 'active'
    };

    if (!existing) {
      await prisma.manage_manufacturer_products.create({ data });
    } else {
      await prisma.manage_manufacturer_products.update({
        where: { id: existing.id },
        data
      });
    }
  }
  console.log('Ensured 500 products exist');

  // Create 50 POs among distributors and manufacturers
  console.log('Seeding 50 POs...');

  // Get a valid product ID
  const firstProduct = await prisma.manage_manufacturer_products.findFirst({
    where: { sku: { startsWith: 'SKU-SEED-' } }
  });
  const validProductId = firstProduct ? firstProduct.id : 9999;

  for (let i = 1; i <= 50; i++) {
    const distributor = distributors[i % distributors.length];
    const manufacturer = manufacturers[i % manufacturers.length];
    const orderNumber = `PO-SEED-${String(i).padStart(4, '0')}`;

    const existingPo = await prisma.manage_b2b_purchase_order.findFirst({
      where: { order_number: orderNumber }
    });

    if (!existingPo) {
      await prisma.manage_b2b_purchase_order.create({
        data: {
          order_number: orderNumber,
          distributor_id: distributor.id,
          manufacturer_id: manufacturer.id,
          total_amount: 1000.0,
          status: 'PENDING',
          notes: 'Seeded PO',
          manage_b2b_purchase_order_detail: {
            create: [
              {
                fk_product: validProductId,
                product_name: 'Sample Seeded PO Product',
                quantity: 100,
                price: 10.0,
                unit_price: 10.0,
                grand_total: 1000.0
              }
            ]
          }
        }
      });
    }
  }
  console.log('Ensured 50 POs exist');

  console.log('Database seeding completed.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
