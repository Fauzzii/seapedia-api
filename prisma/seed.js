import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Photo ID pools per category using picsum.photos (real WebP images)
const categoryPhotos = {
    'Sepatu':          [48, 106, 215, 292, 399],
    'Pakaian':         [64, 103, 177, 244, 316],
    'Furnitur':        [116, 158, 271, 357, 430],
    'Elektronik':      [0, 20, 60, 96, 180],
    'Peralatan Rumah': [145, 200, 237, 333, 428],
    'Jam Tangan':      [1012, 1011, 1010, 1009, 1008],
    'Tas':             [404, 407, 408, 411, 416],
    'Kulkas':          [201, 205, 208, 213, 233],
    'Barang Mewah':    [1074, 1082, 1080, 1069, 1051],
    'default':         [10, 11, 12, 13, 14]
};

function getProductImageUrl(category) {
    const pool = categoryPhotos[category] || categoryPhotos['default'];
    const photoId = pool[Math.floor(Math.random() * pool.length)];
    return `https://picsum.photos/id/${photoId}/600/400.webp`;
}

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
        where: { store_name: 'Griya Mode & Furnitur' }
    });
    if (!store1) {
        store1 = await prisma.store.create({
            data: {
                seller_id: seller1.id,
                store_name: 'Griya Mode & Furnitur',
                description: 'Toko sepatu, pakaian, furnitur, elektronik, dan peralatan rumah berkualitas',
                address_detail: 'Jl. Mawar No. 123, Jakarta'
            }
        });
        console.log('Created store: Griya Mode & Furnitur');
    }

    const seller2 = userRecords['seller2@example.com'];
    let store2 = await prisma.store.findUnique({
        where: { store_name: 'Nusantara Lifestyle Store' }
    });
    if (!store2) {
        store2 = await prisma.store.create({
            data: {
                seller_id: seller2.id,
                store_name: 'Nusantara Lifestyle Store',
                description: 'Kulkas, jam tangan, tas, furnitur, dan sepatu pilihan untuk gaya hidup modern',
                address_detail: 'Jl. Melati No. 45, Bandung'
            }
        });
        console.log('Created store: Nusantara Lifestyle Store');
    }

    const productsStore1 = [
        { name: 'Sepatu Sneakers Pria', description: 'Sepatu sneakers bahan kanvas premium nyaman untuk aktivitas kasual harian', price: 180000.00, stock: 25, category: 'Sepatu' },
        { name: 'Sepatu Boots Kulit Asli', description: 'Sepatu boots kulit sapi asli tahan lama dengan jahitan tangan berkualitas', price: 450000.00, stock: 12, category: 'Sepatu' },
        { name: 'Sepatu Lari Running Pro', description: 'Sepatu lari dengan bantalan EVA ringan dan sol karet anti selip', price: 320000.00, stock: 18, category: 'Sepatu' },
        { name: 'Kemeja Katun Premium', description: 'Kemeja katun combed halus motif polos cocok untuk formal dan kasual', price: 150000.00, stock: 40, category: 'Pakaian' },
        { name: 'Jaket Bomber Pria', description: 'Jaket bomber tebal bahan parasut tahan angin dengan desain sporty modern', price: 275000.00, stock: 20, category: 'Pakaian' },
        { name: 'Meja Kerja Minimalis', description: 'Meja kerja kayu MDF tebal 18mm dengan laci samping dan permukaan anti gores', price: 650000.00, stock: 8, category: 'Furnitur' },
        { name: 'Kursi Gaming Ergonomis', description: 'Kursi gaming dengan sandaran lumbar adjustable dan armrest 4D nyaman', price: 1200000.00, stock: 5, category: 'Furnitur' },
        { name: 'Monitor LED 24 Inch', description: 'Monitor IPS Full HD 75Hz dengan panel anti-glare dan port HDMI/VGA', price: 1800000.00, stock: 7, category: 'Elektronik' },
        { name: 'Kipas Angin Standing Fan', description: 'Kipas berdiri 16 inch 3 kecepatan dengan timer otomatis dan remote', price: 285000.00, stock: 15, category: 'Peralatan Rumah' },
        { name: 'Setrika Uap Otomatis', description: 'Setrika uap 2200W peluncur uap turbo dengan alas keramik anti lengket', price: 195000.00, stock: 22, category: 'Peralatan Rumah' }
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
                            { image_url: getProductImageUrl(p.category) }
                        ]
                    }
                }
            });
            console.log(`Created product in Griya Mode & Furnitur: ${p.name}`);
        }
    }

    const productsStore2 = [
        { name: 'Kulkas 2 Pintu 200L', description: 'Kulkas dua pintu kapasitas 200 liter dengan fitur No Frost dan laci buah', price: 3200000.00, stock: 4, category: 'Kulkas' },
        { name: 'Kulkas Mini 1 Pintu', description: 'Kulkas mini kapasitas 65L cocok untuk kamar kos atau kantor kecil', price: 850000.00, stock: 10, category: 'Kulkas' },
        { name: 'Jam Tangan Analog Pria', description: 'Jam tangan dengan tali kulit asli, mesin Quartz Jepang dan kaca mineral', price: 1200000.00, stock: 6, category: 'Jam Tangan' },
        { name: 'Jam Tangan Sport Digital', description: 'Jam tangan digital tahan air 50m dengan stopwatch, alarm, dan backlight', price: 350000.00, stock: 14, category: 'Jam Tangan' },
        { name: 'Tas Ransel Laptop 15 Inch', description: 'Tas ransel bahan polyester tebal dengan ruang laptop dan kompartemen organizer', price: 280000.00, stock: 20, category: 'Tas' },
        { name: 'Tas Selempang Kulit Pria', description: 'Tas selempang kulit sintetis premium dengan resleting anti karat', price: 195000.00, stock: 18, category: 'Tas' },
        { name: 'Lemari Pakaian 3 Pintu', description: 'Lemari kayu solid 3 pintu geser cermin dengan rak dalam 4 susun', price: 1800000.00, stock: 3, category: 'Furnitur' },
        { name: 'Rak Buku Besi Industrial', description: 'Rak buku besi 5 tingkat dengan papan kayu pinus, desain industrial modern', price: 480000.00, stock: 9, category: 'Furnitur' },
        { name: 'Sepatu Formal Pantofel Pria', description: 'Sepatu pantofel kulit sintetis mengkilap untuk kebutuhan formal dan kantor', price: 265000.00, stock: 15, category: 'Sepatu' },
        { name: 'Sepatu Sandal Casual Pria', description: 'Sandal kasual bahan EVA ringan anti selip cocok untuk aktivitas santai', price: 95000.00, stock: 30, category: 'Sepatu' }
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
                            { image_url: getProductImageUrl(p.category) }
                        ]
                    }
                }
            });
            console.log(`Created product in Nusantara Lifestyle Store: ${p.name}`);
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
