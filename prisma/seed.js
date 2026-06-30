import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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

const PRODUCT_IMAGES = {
    'Sepatu Sneakers Pria': [
        'https://images.unsplash.com/photo-1542291344-7f70aa0e15d2?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600&h=400&fit=crop&fm=webp',
    ],
    'Sepatu Boots Kulit Asli': [
        'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1542291344-7f70aa0e15d2?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600&h=400&fit=crop&fm=webp',
    ],
    'Sepatu Lari Running Pro': [
        'https://images.unsplash.com/photo-1556906781-9a412961a28c?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1562183241-840b8af0721e?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1579338834729-bf037702aa75?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1542291344-7f70aa0e15d2?w=600&h=400&fit=crop&fm=webp',
    ],
    'Kemeja Katun Premium': [
        'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1602810319428-019690571b5b?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1620799139507-2a76f79a2f4d?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&h=400&fit=crop&fm=webp',
    ],
    'Jaket Bomber Pria': [
        'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1548126032-079a0fb0099d?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1591218006756-e1bdc2de4e4a?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?w=600&h=400&fit=crop&fm=webp',
    ],
    'Meja Kerja Minimalis': [
        'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1611269154421-4e27233ac5c7?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1595515987869-f3ae49fa6b93?w=600&h=400&fit=crop&fm=webp',
    ],
    'Kursi Gaming Ergonomis': [
        'https://images.unsplash.com/photo-1598547548615-d12bc5a08fb3?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1616627561950-38af766b4b37?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1591370874773-6063c22650b2?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1612872087085-ab5aa7e8aabb?w=600&h=400&fit=crop&fm=webp',
    ],
    'Monitor LED 24 Inch': [
        'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1547586696-ea22b4d4235d?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1593640408182-31c4b8f6c87e?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1545665225-b23b99e4ca0f?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1585792180666-f7347c490ee2?w=600&h=400&fit=crop&fm=webp',
    ],
    'Kipas Angin Standing Fan': [
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1625736300986-83e4e2823aa3?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1524055988636-436cfa46e59e?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1593642534402-a0af84c7f06f?w=600&h=400&fit=crop&fm=webp',
    ],
    'Setrika Uap Otomatis': [
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1524055988636-436cfa46e59e?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&h=400&fit=crop&fm=webp',
    ],
    'Kulkas 2 Pintu 200L': [
        'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1558617327-a16d3e787571?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&h=400&fit=crop&fm=webp',
    ],
    'Kulkas Mini 1 Pintu': [
        'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1558617327-a16d3e787571?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop&fm=webp',
    ],
    'Jam Tangan Analog Pria': [
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1548169874-53e85f753f1e?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1622434641406-a158123450f9?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?w=600&h=400&fit=crop&fm=webp',
    ],
    'Jam Tangan Sport Digital': [
        'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1544117519-31a4b719223d?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=600&h=400&fit=crop&fm=webp',
    ],
    'Tas Ransel Laptop 15 Inch': [
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=400&fit=crop&fm=webp',
    ],
    'Tas Selempang Kulit Pria': [
        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=600&h=400&fit=crop&fm=webp',
    ],
    'Lemari Pakaian 3 Pintu': [
        'https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=600&h=400&fit=crop&fm=webp',
    ],
    'Rak Buku Besi Industrial': [
        'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1535905557558-afc4877a26fc?w=600&h=400&fit=crop&fm=webp',
    ],
    'Sepatu Formal Pantofel Pria': [
        'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1614252234498-af41f5a74b22?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1542291344-7f70aa0e15d2?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=600&h=400&fit=crop&fm=webp',
    ],
    'Sepatu Sandal Casual Pria': [
        'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1542291344-7f70aa0e15d2?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600&h=400&fit=crop&fm=webp',
        'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=600&h=400&fit=crop&fm=webp',
    ],
};

function getProductImageUrl(category) {
    const pool = categoryPhotos[category] || categoryPhotos['default'];
    const photoId = pool[Math.floor(Math.random() * pool.length)];
    return `https://picsum.photos/id/${photoId}/600/400.webp`;
}

function getProductImages(productName, category) {
    const pool = PRODUCT_IMAGES[productName];
    if (!pool) {
        return [{ image_url: getProductImageUrl(category) }];
    }
    const count = Math.floor(Math.random() * 5) + 1;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(url => ({ image_url: url }));
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
                        create: getProductImages(p.name, p.category)
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
                        create: getProductImages(p.name, p.category)
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