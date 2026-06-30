import prisma from '../config/index.js';

let cachedSimulatedTime = null;
let cachedRealTime = null;

export const initTimeCache = async () => {
    try {
        const setting = await prisma.systemSetting.findFirst();
        if (setting) {
            cachedSimulatedTime = new Date(setting.current_datetime).getTime();
            cachedRealTime = Date.now();
            console.log('System time cache initialized:', new Date(cachedSimulatedTime).toISOString());
        } else {
            const now = new Date();
            await prisma.systemSetting.create({
                data: { current_datetime: now }
            });
            cachedSimulatedTime = now.getTime();
            cachedRealTime = Date.now();
            console.log('Created default system time setting.');
        }
    } catch (error) {
        console.error('Failed to initialize time cache, fallback to live time:', error);
    }
};

export const getCurrentTime = async () => {
    if (cachedSimulatedTime === null) {
        try {
            const setting = await prisma.systemSetting.findFirst();
            if (setting) {
                cachedSimulatedTime = new Date(setting.current_datetime).getTime();
                cachedRealTime = Date.now();
            } else {
                return new Date();
            }
        } catch (err) {
            return new Date();
        }
    }
    const elapsedRealTime = Date.now() - cachedRealTime;
    return new Date(cachedSimulatedTime + elapsedRealTime);
};

export const updateTimeCache = (newSimulatedTime) => {
    cachedSimulatedTime = new Date(newSimulatedTime).getTime();
    cachedRealTime = Date.now();
    console.log('System time cache updated:', new Date(cachedSimulatedTime).toISOString());
};
