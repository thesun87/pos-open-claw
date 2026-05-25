import { PaymentMethod, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v7 as uuidv7 } from 'uuid';
import { createPrismaClientOptions } from '../src/prisma/prisma-client-options';

const prisma = new PrismaClient(createPrismaClientOptions());

const TENANT_ID = '018f0000-0000-7000-8000-000000000001';
const STORE_ID = '018f0000-0000-7000-8000-000000000002';
const ADMIN_USER_ID = '018f0000-0000-7000-8000-000000000003';
const CASHIER_USER_ID = '018f0000-0000-7000-8000-000000000004';
const MENU_VERSION_ID = '018f0000-0000-7000-8000-000000000005';
const TABLE_STORE_ID = '018f0000-0000-7000-8000-000000000006';
const TABLE_CASHIER_USER_ID = '018f0000-0000-7000-8000-000000000007';
const TABLE_MENU_VERSION_ID = '018f0000-0000-7000-8000-000000000008';
const BCRYPT_COST_FACTOR = 12;

const categories = [
  {
    id: '018f0000-0000-7000-8000-000000000101',
    key: 'coffee',
    name: 'Cà phê',
    sortOrder: 10,
  },
  {
    id: '018f0000-0000-7000-8000-000000000102',
    key: 'tea',
    name: 'Trà',
    sortOrder: 20,
  },
  {
    id: '018f0000-0000-7000-8000-000000000103',
    key: 'smoothie',
    name: 'Sinh tố',
    sortOrder: 30,
  },
  {
    id: '018f0000-0000-7000-8000-000000000104',
    key: 'ice-blended',
    name: 'Đá xay',
    sortOrder: 40,
  },
  {
    id: '018f0000-0000-7000-8000-000000000105',
    key: 'cake',
    name: 'Bánh ngọt',
    sortOrder: 50,
  },
] as const;

type CategoryKey = (typeof categories)[number]['key'];

const products: Array<{
  id: string;
  categoryKey: CategoryKey;
  name: string;
  description: string;
  priceVnd: number;
  sortOrder: number;
  optionGroupKeys: OptionGroupKey[];
}> = [
  {
    id: '018f0000-0000-7000-8000-000000000201',
    categoryKey: 'coffee',
    name: 'Bạc Xỉu',
    description: 'Cà phê sữa kiểu Việt Nam, béo nhẹ.',
    priceVnd: 35000,
    sortOrder: 10,
    optionGroupKeys: ['size', 'ice', 'sugar', 'topping'],
  },
  {
    id: '018f0000-0000-7000-8000-000000000202',
    categoryKey: 'coffee',
    name: 'Cà phê đen',
    description: 'Cà phê robusta đậm vị.',
    priceVnd: 25000,
    sortOrder: 20,
    optionGroupKeys: ['size', 'ice', 'sugar'],
  },
  {
    id: '018f0000-0000-7000-8000-000000000203',
    categoryKey: 'coffee',
    name: 'Cà phê sữa',
    description: 'Cà phê phin với sữa đặc.',
    priceVnd: 30000,
    sortOrder: 30,
    optionGroupKeys: ['size', 'ice', 'sugar'],
  },
  {
    id: '018f0000-0000-7000-8000-000000000204',
    categoryKey: 'coffee',
    name: 'Americano',
    description: 'Espresso pha nước nóng.',
    priceVnd: 35000,
    sortOrder: 40,
    optionGroupKeys: ['size', 'ice', 'sugar'],
  },
  {
    id: '018f0000-0000-7000-8000-000000000205',
    categoryKey: 'coffee',
    name: 'Latte',
    description: 'Espresso với sữa tươi đánh nóng.',
    priceVnd: 45000,
    sortOrder: 50,
    optionGroupKeys: ['size', 'ice', 'sugar'],
  },
  {
    id: '018f0000-0000-7000-8000-000000000206',
    categoryKey: 'coffee',
    name: 'Cappuccino',
    description: 'Espresso, sữa nóng và bọt sữa.',
    priceVnd: 45000,
    sortOrder: 60,
    optionGroupKeys: ['size', 'ice', 'sugar'],
  },
  {
    id: '018f0000-0000-7000-8000-000000000207',
    categoryKey: 'tea',
    name: 'Trà đào',
    description: 'Trà đào cam sả thanh mát.',
    priceVnd: 40000,
    sortOrder: 10,
    optionGroupKeys: ['size', 'ice', 'sugar', 'topping'],
  },
  {
    id: '018f0000-0000-7000-8000-000000000208',
    categoryKey: 'tea',
    name: 'Trà vải',
    description: 'Trà trái cây vị vải.',
    priceVnd: 40000,
    sortOrder: 20,
    optionGroupKeys: ['size', 'ice', 'sugar', 'topping'],
  },
  {
    id: '018f0000-0000-7000-8000-000000000209',
    categoryKey: 'tea',
    name: 'Trà sen vàng',
    description: 'Trà ô long, sen và macchiato.',
    priceVnd: 45000,
    sortOrder: 30,
    optionGroupKeys: ['size', 'ice', 'sugar', 'topping'],
  },
  {
    id: '018f0000-0000-7000-8000-000000000210',
    categoryKey: 'tea',
    name: 'Trà tắc',
    description: 'Trà tắc chua ngọt.',
    priceVnd: 30000,
    sortOrder: 40,
    optionGroupKeys: ['size', 'ice', 'sugar'],
  },
  {
    id: '018f0000-0000-7000-8000-000000000211',
    categoryKey: 'tea',
    name: 'Matcha latte',
    description: 'Matcha Nhật với sữa tươi.',
    priceVnd: 50000,
    sortOrder: 50,
    optionGroupKeys: ['size', 'ice', 'sugar', 'topping'],
  },
  {
    id: '018f0000-0000-7000-8000-000000000212',
    categoryKey: 'smoothie',
    name: 'Sinh tố xoài',
    description: 'Xoài chín xay cùng sữa chua.',
    priceVnd: 45000,
    sortOrder: 10,
    optionGroupKeys: ['size', 'ice', 'sugar'],
  },
  {
    id: '018f0000-0000-7000-8000-000000000213',
    categoryKey: 'smoothie',
    name: 'Sinh tố bơ',
    description: 'Bơ sáp xay béo mịn.',
    priceVnd: 50000,
    sortOrder: 20,
    optionGroupKeys: ['size', 'ice', 'sugar'],
  },
  {
    id: '018f0000-0000-7000-8000-000000000214',
    categoryKey: 'smoothie',
    name: 'Sinh tố dâu',
    description: 'Dâu tây xay tươi.',
    priceVnd: 48000,
    sortOrder: 30,
    optionGroupKeys: ['size', 'ice', 'sugar'],
  },
  {
    id: '018f0000-0000-7000-8000-000000000215',
    categoryKey: 'ice-blended',
    name: 'Cookies đá xay',
    description: 'Cookie chocolate đá xay.',
    priceVnd: 55000,
    sortOrder: 10,
    optionGroupKeys: ['size', 'sugar', 'topping'],
  },
  {
    id: '018f0000-0000-7000-8000-000000000216',
    categoryKey: 'ice-blended',
    name: 'Chocolate đá xay',
    description: 'Chocolate đá xay phủ kem.',
    priceVnd: 55000,
    sortOrder: 20,
    optionGroupKeys: ['size', 'sugar', 'topping'],
  },
  {
    id: '018f0000-0000-7000-8000-000000000217',
    categoryKey: 'ice-blended',
    name: 'Matcha đá xay',
    description: 'Matcha đá xay phủ kem.',
    priceVnd: 58000,
    sortOrder: 30,
    optionGroupKeys: ['size', 'sugar', 'topping'],
  },
  {
    id: '018f0000-0000-7000-8000-000000000218',
    categoryKey: 'cake',
    name: 'Croissant',
    description: 'Bánh sừng bò bơ Pháp.',
    priceVnd: 35000,
    sortOrder: 10,
    optionGroupKeys: [],
  },
  {
    id: '018f0000-0000-7000-8000-000000000219',
    categoryKey: 'cake',
    name: 'Tiramisu',
    description: 'Bánh tiramisu cà phê.',
    priceVnd: 55000,
    sortOrder: 20,
    optionGroupKeys: [],
  },
  {
    id: '018f0000-0000-7000-8000-000000000220',
    categoryKey: 'cake',
    name: 'Bánh brownie',
    description: 'Brownie chocolate đậm vị.',
    priceVnd: 45000,
    sortOrder: 30,
    optionGroupKeys: [],
  },
  {
    id: '018f0000-0000-7000-8000-000000000221',
    categoryKey: 'cake',
    name: 'Cheesecake',
    description: 'Cheesecake nướng mềm mịn.',
    priceVnd: 60000,
    sortOrder: 40,
    optionGroupKeys: [],
  },
  {
    id: '018f0000-0000-7000-8000-000000000222',
    categoryKey: 'cake',
    name: 'Bánh chuối',
    description: 'Bánh chuối nướng thơm mềm.',
    priceVnd: 30000,
    sortOrder: 50,
    optionGroupKeys: [],
  },
];

const optionGroups = [
  {
    id: '018f0000-0000-7000-8000-000000000301',
    key: 'size',
    name: 'Size S/M/L',
    isRequired: true,
    minSelect: 1,
    maxSelect: 1,
    sortOrder: 10,
    options: [
      {
        id: '018f0000-0000-7000-8000-000000000401',
        name: 'Size S',
        priceDeltaVnd: 0,
        isDefault: true,
        sortOrder: 10,
      },
      {
        id: '018f0000-0000-7000-8000-000000000402',
        name: 'Size M',
        priceDeltaVnd: 5000,
        isDefault: false,
        sortOrder: 20,
      },
      {
        id: '018f0000-0000-7000-8000-000000000403',
        name: 'Size L',
        priceDeltaVnd: 10000,
        isDefault: false,
        sortOrder: 30,
      },
    ],
  },
  {
    id: '018f0000-0000-7000-8000-000000000302',
    key: 'ice',
    name: 'Đá nhiều/vừa/ít/không',
    isRequired: true,
    minSelect: 1,
    maxSelect: 1,
    sortOrder: 20,
    options: [
      {
        id: '018f0000-0000-7000-8000-000000000404',
        name: 'Đá nhiều',
        priceDeltaVnd: 0,
        isDefault: false,
        sortOrder: 10,
      },
      {
        id: '018f0000-0000-7000-8000-000000000405',
        name: 'Đá vừa',
        priceDeltaVnd: 0,
        isDefault: true,
        sortOrder: 20,
      },
      {
        id: '018f0000-0000-7000-8000-000000000406',
        name: 'Đá ít',
        priceDeltaVnd: 0,
        isDefault: false,
        sortOrder: 30,
      },
      {
        id: '018f0000-0000-7000-8000-000000000407',
        name: 'Không đá',
        priceDeltaVnd: 0,
        isDefault: false,
        sortOrder: 40,
      },
    ],
  },
  {
    id: '018f0000-0000-7000-8000-000000000303',
    key: 'sugar',
    name: 'Đường 100/70/50/0%',
    isRequired: true,
    minSelect: 1,
    maxSelect: 1,
    sortOrder: 30,
    options: [
      {
        id: '018f0000-0000-7000-8000-000000000408',
        name: 'Đường 100%',
        priceDeltaVnd: 0,
        isDefault: false,
        sortOrder: 10,
      },
      {
        id: '018f0000-0000-7000-8000-000000000409',
        name: 'Đường 70%',
        priceDeltaVnd: 0,
        isDefault: true,
        sortOrder: 20,
      },
      {
        id: '018f0000-0000-7000-8000-000000000410',
        name: 'Đường 50%',
        priceDeltaVnd: 0,
        isDefault: false,
        sortOrder: 30,
      },
      {
        id: '018f0000-0000-7000-8000-000000000411',
        name: 'Đường 0%',
        priceDeltaVnd: 0,
        isDefault: false,
        sortOrder: 40,
      },
    ],
  },
  {
    id: '018f0000-0000-7000-8000-000000000304',
    key: 'topping',
    name: 'Topping: Trân châu/Pudding/Thạch',
    isRequired: false,
    minSelect: 0,
    maxSelect: 3,
    sortOrder: 40,
    options: [
      {
        id: '018f0000-0000-7000-8000-000000000412',
        name: 'Trân châu',
        priceDeltaVnd: 8000,
        isDefault: false,
        sortOrder: 10,
      },
      {
        id: '018f0000-0000-7000-8000-000000000413',
        name: 'Pudding',
        priceDeltaVnd: 10000,
        isDefault: false,
        sortOrder: 20,
      },
      {
        id: '018f0000-0000-7000-8000-000000000414',
        name: 'Thạch',
        priceDeltaVnd: 7000,
        isDefault: false,
        sortOrder: 30,
      },
    ],
  },
] as const;

type OptionGroupKey = (typeof optionGroups)[number]['key'];

async function seedDemoData() {
  const [adminPasswordHash, cashierPasswordHash] = await Promise.all([
    bcrypt.hash('Admin@123!', BCRYPT_COST_FACTOR),
    bcrypt.hash('Cashier@123!', BCRYPT_COST_FACTOR),
  ]);

  await prisma.$transaction(async (tx) => {
    await tx.tenant.upsert({
      where: { id: TENANT_ID },
      create: { id: TENANT_ID, name: 'Café Demo' },
      update: { name: 'Café Demo' },
    });

    await tx.store.upsert({
      where: { tenantId_code: { tenantId: TENANT_ID, code: 'POS01' } },
      create: {
        id: STORE_ID,
        tenantId: TENANT_ID,
        name: 'Café Demo POS01',
        code: 'POS01',
        tableMode: false,
      },
      update: { name: 'Café Demo POS01', tableMode: false },
    });

    await tx.store.upsert({
      where: { tenantId_code: { tenantId: TENANT_ID, code: 'TABLE01' } },
      create: {
        id: TABLE_STORE_ID,
        tenantId: TENANT_ID,
        name: 'Café Demo Table Service',
        code: 'TABLE01',
        tableMode: true,
      },
      update: { name: 'Café Demo Table Service', tableMode: true },
    });

    await tx.user.upsert({
      where: {
        tenantId_storeId_email: {
          tenantId: TENANT_ID,
          storeId: TABLE_STORE_ID,
          email: 'cashier.table@cafe.demo',
        },
      },
      create: {
        id: TABLE_CASHIER_USER_ID,
        tenantId: TENANT_ID,
        storeId: TABLE_STORE_ID,
        email: 'cashier.table@cafe.demo',
        passwordHash: cashierPasswordHash,
        role: Role.Cashier,
        isRevoked: false,
      },
      update: {
        passwordHash: cashierPasswordHash,
        role: Role.Cashier,
        isRevoked: false,
      },
    });

    await tx.user.upsert({
      where: {
        tenantId_storeId_email: {
          tenantId: TENANT_ID,
          storeId: STORE_ID,
          email: 'admin@cafe.demo',
        },
      },
      create: {
        id: ADMIN_USER_ID,
        tenantId: TENANT_ID,
        storeId: STORE_ID,
        email: 'admin@cafe.demo',
        passwordHash: adminPasswordHash,
        role: Role.Admin,
        isRevoked: false,
      },
      update: {
        passwordHash: adminPasswordHash,
        role: Role.Admin,
        isRevoked: false,
      },
    });

    await tx.user.upsert({
      where: {
        tenantId_storeId_email: {
          tenantId: TENANT_ID,
          storeId: STORE_ID,
          email: 'cashier@cafe.demo',
        },
      },
      create: {
        id: CASHIER_USER_ID,
        tenantId: TENANT_ID,
        storeId: STORE_ID,
        email: 'cashier@cafe.demo',
        passwordHash: cashierPasswordHash,
        role: Role.Cashier,
        isRevoked: false,
      },
      update: {
        passwordHash: cashierPasswordHash,
        role: Role.Cashier,
        isRevoked: false,
      },
    });

    for (const category of categories) {
      await tx.category.upsert({
        where: {
          tenantId_storeId_name: {
            tenantId: TENANT_ID,
            storeId: STORE_ID,
            name: category.name,
          },
        },
        create: {
          id: category.id,
          tenantId: TENANT_ID,
          storeId: STORE_ID,
          name: category.name,
          sortOrder: category.sortOrder,
          isActive: true,
        },
        update: { sortOrder: category.sortOrder, isActive: true },
      });
    }

    const categoryIdByKey = new Map(
      categories.map((category) => [category.key, category.id]),
    );

    for (const product of products) {
      const categoryId = categoryIdByKey.get(product.categoryKey);
      if (!categoryId) {
        throw new Error(`Missing category id for product ${product.name}`);
      }

      await tx.product.upsert({
        where: { id: product.id },
        create: {
          id: product.id,
          tenantId: TENANT_ID,
          storeId: STORE_ID,
          categoryId,
          name: product.name,
          description: product.description,
          priceVnd: product.priceVnd,
          sortOrder: product.sortOrder,
          isActive: true,
        },
        update: {
          categoryId,
          name: product.name,
          description: product.description,
          priceVnd: product.priceVnd,
          sortOrder: product.sortOrder,
          isActive: true,
        },
      });
    }

    for (const group of optionGroups) {
      await tx.optionGroup.upsert({
        where: { id: group.id },
        create: {
          id: group.id,
          tenantId: TENANT_ID,
          storeId: STORE_ID,
          name: group.name,
          isRequired: group.isRequired,
          minSelect: group.minSelect,
          maxSelect: group.maxSelect,
          sortOrder: group.sortOrder,
        },
        update: {
          name: group.name,
          isRequired: group.isRequired,
          minSelect: group.minSelect,
          maxSelect: group.maxSelect,
          sortOrder: group.sortOrder,
        },
      });

      for (const option of group.options) {
        await tx.option.upsert({
          where: { id: option.id },
          create: {
            id: option.id,
            tenantId: TENANT_ID,
            storeId: STORE_ID,
            optionGroupId: group.id,
            name: option.name,
            priceDeltaVnd: option.priceDeltaVnd,
            isDefault: option.isDefault,
            isActive: true,
            sortOrder: option.sortOrder,
          },
          update: {
            optionGroupId: group.id,
            name: option.name,
            priceDeltaVnd: option.priceDeltaVnd,
            isDefault: option.isDefault,
            isActive: true,
            sortOrder: option.sortOrder,
          },
        });
      }
    }

    const optionGroupIdByKey = new Map(
      optionGroups.map((group) => [group.key, group.id]),
    );

    for (const product of products) {
      for (const [index, groupKey] of product.optionGroupKeys.entries()) {
        const optionGroupId = optionGroupIdByKey.get(groupKey);
        if (!optionGroupId) {
          throw new Error(
            `Missing option group id for assignment ${product.name}:${groupKey}`,
          );
        }

        await tx.productOptionGroup.upsert({
          where: {
            productId_optionGroupId: { productId: product.id, optionGroupId },
          },
          create: {
            productId: product.id,
            optionGroupId,
            sortOrder: (index + 1) * 10,
          },
          update: { sortOrder: (index + 1) * 10 },
        });
      }
    }

    await tx.menuVersion.upsert({
      where: { tenantId_storeId: { tenantId: TENANT_ID, storeId: STORE_ID } },
      create: {
        id: MENU_VERSION_ID,
        tenantId: TENANT_ID,
        storeId: STORE_ID,
        version: 1,
        bumpedAt: new Date('2026-05-10T00:00:00.000Z'),
      },
      update: { version: 1 },
    });

    await tx.menuVersion.upsert({
      where: {
        tenantId_storeId: { tenantId: TENANT_ID, storeId: TABLE_STORE_ID },
      },
      create: {
        id: TABLE_MENU_VERSION_ID,
        tenantId: TENANT_ID,
        storeId: TABLE_STORE_ID,
        version: 1,
        bumpedAt: new Date('2026-05-10T00:00:00.000Z'),
      },
      update: { version: 1 },
    });
  });

  console.info(
    'Seeded Café Demo tenant/store/users/menu catalog/menu version.',
  );

  // Seed sample synced orders for reports demo (Story 4.1)
  // Idempotent: skip if orders already exist for this tenant/store
  const existingOrderCount = await prisma.order.count({
    where: { tenantId: TENANT_ID, storeId: STORE_ID },
  });
  if (existingOrderCount > 0) {
    console.info(
      `Sample orders already seeded (${existingOrderCount} orders exist). Skipping counter-store order seed.`,
    );
  } else {
    // ~150 orders spread over last 30 days with mixed payment methods and products
    const paymentMethods: PaymentMethod[] = [
      PaymentMethod.Cash,
      PaymentMethod.Transfer,
      PaymentMethod.Card,
    ];

    // Product snapshot pool — uses seeded product names + one "deleted product" snapshot
    const productSnapshots = [
      {
        id: '018f0000-0000-7000-8000-000000000201',
        name: 'Bạc Xỉu',
        price: 35000,
      },
      {
        id: '018f0000-0000-7000-8000-000000000202',
        name: 'Cà phê đen',
        price: 25000,
      },
      {
        id: '018f0000-0000-7000-8000-000000000203',
        name: 'Cà phê sữa',
        price: 30000,
      },
      {
        id: '018f0000-0000-7000-8000-000000000207',
        name: 'Trà đào',
        price: 40000,
      },
      {
        id: '018f0000-0000-7000-8000-000000000211',
        name: 'Matcha latte',
        price: 50000,
      },
    ];

    // One "deleted product" order uses existing productId but a different snapshot name (AR24 NFR14)
    const deletedProductOrder: { id: string; name: string; price: number } = {
      id: '018f0000-0000-7000-8000-000000000201', // valid FK (Bạc Xỉu productId)
      name: 'Món đã bị xóa', // snapshot doesn't match current product.name
      price: 40000,
    };

    const now = new Date();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    const ordersToCreate: Array<{
      id: string;
      clientOrderId: string;
      orderCode: string;
      soldAt: Date;
      paymentMethod: PaymentMethod;
      productIdx: number;
      quantity: number;
      isVoided: boolean;
      isDeletedProductOrder: boolean;
    }> = [];

    // 150 regular orders + 1 "deleted product" order
    for (let i = 0; i < 150; i++) {
      const daysAgo = Math.floor((i / 150) * 30); // spread evenly over 30 days
      const soldAt = new Date(
        now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000,
      ); // sold at 20:00 local (+07 = 13:00 UTC - roughly)
      ordersToCreate.push({
        id: uuidv7(),
        clientOrderId: uuidv7(),
        orderCode: `SEED-${String(i + 1).padStart(4, '0')}`,
        soldAt,
        paymentMethod: paymentMethods[i % 3]!,
        productIdx: i % productSnapshots.length,
        quantity: (i % 3) + 1,
        isVoided: i < 5, // first 5 orders are voided
        isDeletedProductOrder: false,
      });
    }

    // 1 "deleted product" order
    const deletedProductOrderEntry = {
      id: uuidv7(),
      clientOrderId: uuidv7(),
      orderCode: 'SEED-DELETED-PRODUCT',
      soldAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      paymentMethod: PaymentMethod.Cash,
      productIdx: -1, // special flag
      quantity: 1,
      isVoided: false,
      isDeletedProductOrder: true,
    };
    ordersToCreate.push(deletedProductOrderEntry);

    console.info(`Seeding ${ordersToCreate.length} sample orders...`);

    for (const orderDef of ordersToCreate) {
      const product: { id: string; name: string; price: number } =
        orderDef.isDeletedProductOrder
          ? deletedProductOrder
          : productSnapshots[orderDef.productIdx]!;

      const lineTotal = product.price * orderDef.quantity;
      const order = await prisma.order.create({
        data: {
          id: orderDef.id,
          tenantId: TENANT_ID,
          storeId: STORE_ID,
          clientOrderId: orderDef.clientOrderId,
          orderCode: orderDef.orderCode,
          deviceId: 'SEED-POS01',
          cashierId: CASHIER_USER_ID,
          soldAt: orderDef.soldAt,
          menuVersionAtSale: 1,
          discountAmount: 0,
          total: lineTotal,
          paymentMethod: orderDef.paymentMethod,
          items: {
            create: [
              {
                id: uuidv7(),
                productId: product.id,
                productNameSnapshot: product.name,
                unitPriceSnapshot: product.price,
                quantity: orderDef.quantity,
                lineTotal,
              },
            ],
          },
        },
      });

      if (orderDef.isVoided) {
        await prisma.orderVoid.create({
          data: {
            id: uuidv7(),
            orderId: order.id,
            voidedBy: ADMIN_USER_ID,
            reason: 'Demo void for reports exclusion test',
            voidedAt: new Date(orderDef.soldAt.getTime() + 60 * 1000),
          },
        });
      }
    }

    console.info(
      `Seeded ${ordersToCreate.length} sample orders (${5} voided, 1 deleted-product snapshot).`,
    );
  }

  await prisma.area.upsert({
    where: {
      tenantId_storeId_name: {
        tenantId: TENANT_ID,
        storeId: TABLE_STORE_ID,
        name: 'Quầy chính',
      },
    },
    create: {
      id: '018f0000-0000-7000-8000-000000000601',
      tenantId: TENANT_ID,
      storeId: TABLE_STORE_ID,
      name: 'Quầy chính',
      sortOrder: 10,
      isActive: true,
    },
    update: { sortOrder: 10, isActive: true },
  });
  await prisma.area.upsert({
    where: {
      tenantId_storeId_name: {
        tenantId: TENANT_ID,
        storeId: TABLE_STORE_ID,
        name: 'Sân ngoài',
      },
    },
    create: {
      id: '018f0000-0000-7000-8000-000000000602',
      tenantId: TENANT_ID,
      storeId: TABLE_STORE_ID,
      name: 'Sân ngoài',
      sortOrder: 20,
      isActive: true,
    },
    update: { sortOrder: 20, isActive: true },
  });
  const tableDefs = [
    {
      id: '018f0000-0000-7000-8000-000000000611',
      areaId: '018f0000-0000-7000-8000-000000000601',
      name: 'Bàn 1',
      capacity: 2,
      sortOrder: 10,
    },
    {
      id: '018f0000-0000-7000-8000-000000000612',
      areaId: '018f0000-0000-7000-8000-000000000601',
      name: 'Bàn 2',
      capacity: 2,
      sortOrder: 20,
    },
    {
      id: '018f0000-0000-7000-8000-000000000613',
      areaId: '018f0000-0000-7000-8000-000000000601',
      name: 'Bàn 3',
      capacity: 4,
      sortOrder: 30,
    },
    {
      id: '018f0000-0000-7000-8000-000000000614',
      areaId: '018f0000-0000-7000-8000-000000000601',
      name: 'Bàn 4',
      capacity: 4,
      sortOrder: 40,
    },
    {
      id: '018f0000-0000-7000-8000-000000000615',
      areaId: '018f0000-0000-7000-8000-000000000602',
      name: 'Sân 1',
      capacity: 2,
      sortOrder: 10,
    },
    {
      id: '018f0000-0000-7000-8000-000000000616',
      areaId: '018f0000-0000-7000-8000-000000000602',
      name: 'Sân 2',
      capacity: 2,
      sortOrder: 20,
    },
    {
      id: '018f0000-0000-7000-8000-000000000617',
      areaId: '018f0000-0000-7000-8000-000000000602',
      name: 'Sân 3',
      capacity: 4,
      sortOrder: 30,
    },
    {
      id: '018f0000-0000-7000-8000-000000000618',
      areaId: '018f0000-0000-7000-8000-000000000602',
      name: 'Sân 4',
      capacity: 4,
      sortOrder: 40,
    },
  ] as const;
  for (const table of tableDefs)
    await prisma.table.upsert({
      where: {
        tenantId_storeId_name: {
          tenantId: TENANT_ID,
          storeId: TABLE_STORE_ID,
          name: table.name,
        },
      },
      create: {
        ...table,
        tenantId: TENANT_ID,
        storeId: TABLE_STORE_ID,
        isActive: true,
      },
      update: {
        areaId: table.areaId,
        capacity: table.capacity,
        sortOrder: table.sortOrder,
        isActive: true,
      },
    });
  for (const [index, table] of tableDefs.slice(0, 3).entries())
    await prisma.order.upsert({
      where: {
        tenantId_storeId_deviceId_clientOrderId: {
          tenantId: TENANT_ID,
          storeId: TABLE_STORE_ID,
          deviceId: 'SEED-TABLE01',
          clientOrderId: `018f0000-0000-7000-8000-00000000063${index + 1}`,
        },
      },
      create: {
        id: `018f0000-0000-7000-8000-00000000062${index + 1}`,
        tenantId: TENANT_ID,
        storeId: TABLE_STORE_ID,
        clientOrderId: `018f0000-0000-7000-8000-00000000063${index + 1}`,
        orderCode: `TABLE-SEED-${index + 1}`,
        deviceId: 'SEED-TABLE01',
        cashierId: TABLE_CASHIER_USER_ID,
        tableId: table.id,
        tableNameSnapshot: table.name,
        soldAt: new Date('2026-05-25T08:00:00.000Z'),
        menuVersionAtSale: 1,
        discountAmount: 0,
        total: 35000,
        paymentMethod: PaymentMethod.Cash,
        items: {
          create: [
            {
              id: uuidv7(),
              productId: '018f0000-0000-7000-8000-000000000201',
              productNameSnapshot: 'Bạc Xỉu',
              unitPriceSnapshot: 35000,
              quantity: 1,
              lineTotal: 35000,
            },
          ],
        },
      },
      update: { tableId: table.id, tableNameSnapshot: table.name },
    });
  console.info(
    'Seeded table-mode store with 2 areas, 8 tables, 3 table orders.',
  );
}

seedDemoData()
  .catch((error: unknown) => {
    console.error('Seed failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
