export const appConfig = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    jsonLimit: '10kb',
    helmetOptions: {
        contentSecurityPolicy: false
    }
};

export default appConfig;
