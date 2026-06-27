import { createClient } from '@supabase/supabase-js';
import multer from 'multer';

// Supabase client dengan service_role key — dihandle di server, aman
const supabaseUrl = process.env.SUPABASE_URL || 'https://lnumdoftoomanmndehft.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;
if (supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false }
    });
} else {
    console.warn('[Upload] SUPABASE_SERVICE_ROLE_KEY belum diset di .env — upload gambar tidak akan berfungsi.');
}

// Simpan file di memory (buffer), bukan di disk
export const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB per file
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Hanya file gambar yang diperbolehkan'), false);
        }
        cb(null, true);
    }
});

export const uploadProductImages = async (req, res) => {
    try {
        if (!supabaseAdmin) {
            return res.status(503).json({
                msg: 'Layanan upload gambar belum dikonfigurasi. Hubungi administrator.'
            });
        }

        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ msg: 'Tidak ada file yang diunggah.' });
        }

        if (files.length > 5) {
            return res.status(400).json({ msg: 'Maksimal 5 gambar sekaligus.' });
        }

        const uploadedUrls = [];
        const errors = [];

        for (const file of files) {
            try {
                const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.webp`;

                const { error: uploadError } = await supabaseAdmin.storage
                    .from('products')
                    .upload(uniqueName, file.buffer, {
                        contentType: 'image/webp',
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    console.error('[Supabase Upload Error]', uploadError);
                    errors.push(`"${file.originalname}": ${uploadError.message}`);
                    continue;
                }

                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from('products')
                    .getPublicUrl(uniqueName);

                uploadedUrls.push(publicUrl);
            } catch (err) {
                console.error('[Upload File Error]', err);
                errors.push(`"${file.originalname}": ${err.message}`);
            }
        }

        if (uploadedUrls.length === 0) {
            return res.status(500).json({
                msg: `Semua file gagal diunggah: ${errors.join(', ')}`
            });
        }

        res.status(200).json({
            msg: `${uploadedUrls.length} gambar berhasil diunggah${errors.length > 0 ? `, ${errors.length} gagal` : ''}`,
            urls: uploadedUrls,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('[uploadProductImages]', error);
        res.status(500).json({ msg: 'Gagal mengunggah gambar.' });
    }
};
