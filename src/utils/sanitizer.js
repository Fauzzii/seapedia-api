export const sanitizeText = (text) => {
    if (typeof text !== 'string') return text;
    return text.replace(/<[^>]*>/g, '').trim();
};
