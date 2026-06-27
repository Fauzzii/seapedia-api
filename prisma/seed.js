import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding...');

    const roles = ['BUYER', 'SELLER', 'DRIVER', 'ADMIN'];
    const roleRecords = {};
    for (const roleName of roles) {
        let role = await prisma.role.findFirst({
            where: { name: roleName }
        });
        if (!role) {
            role = await prisma.role.create({
                data: { name: roleName }
            });
        }
        roleRecords[roleName] = role;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Password123', salt);

    const testUsers = [
        { email: 'admin@example.com', full_name: 'Admin User', role: 'ADMIN' },
        { email: 'buyer1@example.com', full_name: 'John Buyer', role: 'BUYER' },
        { email: 'buyer2@example.com', full_name: 'Alice Buyer', role: 'BUYER' },
        { email: 'seller1@example.com', full_name: 'Jane Seller', role: 'SELLER' },
        { email: 'seller2@example.com', full_name: 'Bob Seller', role: 'SELLER' },
        { email: 'driver1@example.com', full_name: 'Charlie Driver', role: 'DRIVER' },
        { email: 'driver2@example.com', full_name: 'David Driver', role: 'DRIVER' }
    ];

    const userRecords = {};
    for (const u of testUsers) {
        let user = await prisma.user.findUnique({
            where: { email: u.email }
        });
        const roleRecord = roleRecords[u.role];
        
        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: u.email,
                    full_name: u.full_name,
                    password: hashedPassword,
                    active_role_id: roleRecord.id,
                    user_roles: {
                        create: {
                            role_id: roleRecord.id
                        }
                    }
                }
            });
            console.log(`Created user: ${u.email}`);
        } else {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { active_role_id: roleRecord.id }
            });
            await prisma.userRole.upsert({
                where: {
                    user_id_role_id: {
                        user_id: user.id,
                        role_id: roleRecord.id
                    }
                },
                create: {
                    user_id: user.id,
                    role_id: roleRecord.id
                },
                update: {}
            });
        }
        userRecords[u.email] = user;
    }

    let multiUser = await prisma.user.findUnique({
        where: { email: 'multi@example.com' }
    });
    const buyerRole = roleRecords['BUYER'];
    const sellerRole = roleRecords['SELLER'];
    if (!multiUser) {
        multiUser = await prisma.user.create({
            data: {
                email: 'multi@example.com',
                full_name: 'Multi Role User',
                password: hashedPassword,
                active_role_id: buyerRole.id,
                user_roles: {
                    create: [
                        { role_id: buyerRole.id },
                        { role_id: sellerRole.id }
                    ]
                }
            }
        });
        console.log('Created multi-role user (multi@example.com)');
    }
    userRecords['multi@example.com'] = multiUser;

    const allUsers = await prisma.user.findMany();
    for (const u of allUsers) {
        await prisma.wallet.upsert({
            where: { user_id: u.id },
            create: {
                user_id: u.id,
                balance: 1000000.00
            },
            update: {}
        });
    }

    const seller1 = userRecords['seller1@example.com'];
    let store1 = await prisma.store.findUnique({
        where: { store_name: 'Toko Enak' }
    });
    if (!store1) {
        store1 = await prisma.store.create({
            data: {
                seller_id: seller1.id,
                store_name: 'Toko Enak',
                description: 'Toko catering lezat, fesyen trendi, dan kebutuhan harian terlengkap',
                address_detail: 'Jl. Mawar No. 123, Jakarta'
            }
        });
        console.log('Created store: Toko Enak');
    }

    const seller2 = userRecords['seller2@example.com'];
    let store2 = await prisma.store.findUnique({
        where: { store_name: 'Bob Bakery' }
    });
    if (!store2) {
        store2 = await prisma.store.create({
            data: {
                seller_id: seller2.id,
                store_name: 'Bob Bakery',
                description: 'Aneka kue, roti panggang segar, gadget keren dan peralatan rumah',
                address_detail: 'Jl. Melati No. 45, Bandung'
            }
        });
        console.log('Created store: Bob Bakery');
    }

    const productsStore1 = [
        { name: 'Nasi Goreng Spesial', description: 'Nasi goreng dengan telur mata sapi dan sosis ayam panggang', price: 25000.00, stock: 50, category: 'Kuliner' },
        { name: 'Ayam Goreng Mentega', description: 'Ayam goreng saus mentega harum manis gurih khas resep kuno', price: 30000.00, stock: 35, category: 'Kuliner' },
        { name: 'Kemeja Batik Premium', description: 'Kemeja batik katun halus motif modern dengan potongan fit', price: 150000.00, stock: 20, category: 'Fesyen' },
        { name: 'Jaket Parka Outdoor', description: 'Jaket parka anti angin dan air, cocok untuk bertualang luar ruangan', price: 250000.00, stock: 15, category: 'Fesyen' },
        { name: 'Sepatu Sneakers Canvas', description: 'Sepatu sneakers bahan kanvas nyaman dipakai untuk aktivitas kasual harian', price: 180000.00, stock: 25, category: 'Fesyen' },
        { name: 'Kaos Polos Cotton Combed', description: 'Kaos katun adem menyerap keringat dengan pilihan warna minimalis', price: 45000.00, stock: 100, category: 'Fesyen' },
        { name: 'Earphone TWS Wireless', description: 'TWS dengan konektivitas bluetooth stabil dan dentuman bass mantap', price: 120000.00, stock: 40, category: 'Elektronik' },
        { name: 'Powerbank 10000mAh', description: 'Penyimpan daya portable pengisian cepat dengan sistem proteksi ganda', price: 95000.00, stock: 50, category: 'Elektronik' },
        { name: 'Mouse Wireless Silent', description: 'Mouse tanpa kabel dengan fitur klik senyap tidak mengganggu sekitar', price: 65000.00, stock: 60, category: 'Elektronik' },
        { name: 'Keyboard Mechanical RGB', description: 'Papan ketik mekanikal tactile berlampu latar warna-warni memikat', price: 350000.00, stock: 15, category: 'Elektronik' }
    ];

    for (const p of productsStore1) {
        const existingProduct = await prisma.product.findFirst({
            where: { name: p.name, store_id: store1.id }
        });
        if (!existingProduct) {
            await prisma.product.create({
                data: {
                    store_id: store1.id,
                    name: p.name,
                    description: p.description,
                    price: p.price,
                    stock: p.stock,
                    category: p.category,
                    images: {
                        create: [
                            { image_url: `https://placehold.co/600x400?text=${encodeURIComponent(p.name)}` }
                        ]
                    }
                }
            });
            console.log(`Created product in Toko Enak: ${p.name}`);
        }
    }

    const productsStore2 = [
        { name: 'Roti Coklat Klasik', description: 'Roti manis empuk bertabur coklat lumer premium melimpah', price: 10000.00, stock: 80, category: 'Kuliner' },
        { name: 'Croissant Keju Crispy', description: 'Croissant renyah berlapis dengan taburan keju cheddar gurih', price: 18000.00, stock: 30, category: 'Kuliner' },
        { name: 'Gelas Tumblr Stainless', description: 'Tumblr tahan panas dan dingin hingga 12 jam, ramah lingkungan', price: 75000.00, stock: 45, category: 'Peralatan Rumah' },
        { name: 'Lampu Meja Belajar LED', description: 'Lampu belajar dengan 3 tingkat kecerahan aman untuk mata anak', price: 55000.00, stock: 30, category: 'Peralatan Rumah' },
        { name: 'Set Wajan Teflon Set', description: 'Wajan teflon anti lengket food grade isi 3 pcs berbagai ukuran', price: 125000.00, stock: 20, category: 'Peralatan Rumah' },
        { name: 'Box Container Plastik 30L', description: 'Kontainer plastik kokoh serbaguna dengan roda pemindah praktis', price: 85000.00, stock: 35, category: 'Logistik' },
        { name: 'Bubble Wrap Roll 50m', description: 'Gulungan bubble wrap tebal pelindung paket barang pecah belah', price: 45000.00, stock: 50, category: 'Logistik' },
        { name: 'Lakban Coklat 2 Inch', description: 'Lakban coklat dengan daya rekat ekstra kuat untuk packing karton', price: 12000.00, stock: 200, category: 'Logistik' },
        { name: 'Jam Tangan Minimalis', description: 'Jam tangan kulit asli dengan desain elegan bergaya formal mewah', price: 1200000.00, stock: 5, category: 'Barang Mewah' },
        { name: 'Cincin Perak Sterling 925', description: 'Cincin perak murni berhias zirkonia mewah anti karat mengkilap', price: 45000.00, stock: 10, category: 'Barang Mewah' }
    ];

    for (const p of productsStore2) {
        const existingProduct = await prisma.product.findFirst({
            where: { name: p.name, store_id: store2.id }
        });
        if (!existingProduct) {
            await prisma.product.create({
                data: {
                    store_id: store2.id,
                    name: p.name,
                    description: p.description,
                    price: p.price,
                    stock: p.stock,
                    category: p.category,
                    images: {
                        create: [
                            { image_url: `https://placehold.co/600x400?text=${encodeURIComponent(p.name)}` }
                        ]
                    }
                }
            });
            console.log(`Created product in Bob Bakery: ${p.name}`);
        }
    }

    const buyers = ['buyer1@example.com', 'buyer2@example.com'];
    for (const email of buyers) {
        const buyer = userRecords[email];
        const existingAddress = await prisma.address.findFirst({
            where: { buyer_id: buyer.id }
        });
        if (!existingAddress) {
            await prisma.address.create({
                data: {
                    buyer_id: buyer.id,
                    recipient_name: `${buyer.full_name} (Rumah)`,
                    phone: '081234567890',
                    address_detail: email === 'buyer1@example.com' ? 'Kav. 45, BSD City, Tangerang' : 'Pondok Indah Blok D-12, Jakarta',
                    is_default: true
                }
            });
            console.log(`Created address for buyer: ${email}`);
        }
    }

    const sampleVouchers = [
        { name: 'Voucher Hemat Rp20rb', code: 'HEMAT20', discount_type: 'FIXED', discount_value: 20000.00, remaining_usage: 10, expiry_date: new Date('2026-12-31') },
        { name: 'Voucher Kadaluwarsa', code: 'KADALUWARSA', discount_type: 'FIXED', discount_value: 10000.00, remaining_usage: 5, expiry_date: new Date('2020-01-01') }
    ];
    for (const v of sampleVouchers) {
        const existing = await prisma.voucher.findUnique({
            where: { code: v.code }
        });
        if (!existing) {
            await prisma.voucher.create({ data: v });
            console.log(`Created voucher: ${v.code}`);
        }
    }

    const samplePromos = [
        { name: 'Promo Merdeka 17%', code: 'MERDEKA17', discount_type: 'PERCENTAGE', discount_value: 17.00, expiry_date: new Date('2026-12-31') }
    ];
    for (const pr of samplePromos) {
        const existing = await prisma.promo.findUnique({
            where: { code: pr.code }
        });
        if (!existing) {
            await prisma.promo.create({ data: pr });
            console.log(`Created promo: ${pr.code}`);
        }
    }

    const sampleReviews = [
        { reviewer_name: 'John Buyer', rating: 5, comment: 'Aplikasi belanja Seapedia ini sangat membantu, responsif, dan mudah digunakan!' },
        { reviewer_name: 'Alice Buyer', rating: 4, comment: 'Sangat praktis untuk membeli roti dan katering harian.' }
    ];
    for (const r of sampleReviews) {
        const existing = await prisma.review.findFirst({
            where: { reviewer_name: r.reviewer_name }
        });
        if (!existing) {
            await prisma.review.create({ data: r });
            console.log(`Created review from: ${r.reviewer_name}`);
        }
    }

    console.log('Seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
