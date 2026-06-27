export const handleError = (res, error, defaultStatus = 500) => {
    console.error(error);
    if (error.code && typeof error.code === 'string' && error.code.startsWith('P')) {
        if (error.code === 'P2002') {
            const target = error.meta?.target || [];
            let field = "Data tersebut";
            if (target.includes('email')) {
                field = "Email";
            } else if (target.includes('store_name')) {
                field = "Nama toko";
            } else if (target.includes('code')) {
                field = "Kode promo/voucher";
            }
            return res.status(400).json({
                msg: `${field} sudah digunakan, silakan gunakan yang lain.`
            });
        }
        if (error.code === 'P2025') {
            return res.status(404).json({
                msg: "Data yang diminta tidak ditemukan."
            });
        }
        return res.status(500).json({
            msg: "Terjadi kesalahan koneksi database."
        });
    }

    const isCustomError = error.message && 
        !error.stack?.includes('node_modules\\@prisma') && 
        !error.stack?.includes('node_modules/@prisma') &&
        !error.stack?.includes('PrismaClient');
        
    if (isCustomError) {
        return res.status(400).json({ msg: error.message });
    }

    return res.status(defaultStatus).json({
        msg: "Terjadi kesalahan internal server."
    });
};
