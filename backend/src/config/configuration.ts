export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  internalApi: {
    secret: process.env.INTERNAL_API_SECRET,
    baseUrl: process.env.INTERNAL_API_BASE_URL ?? 'http://localhost:3000/api/internal',
  },
  cors: {
    origins: (process.env.CORS_ORIGINS ?? 'http://localhost:3001')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
});

export interface AppConfig {
  nodeEnv: string;
  port: number;
  database: {
    url: string;
  };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  internalApi: {
    secret: string;
    baseUrl: string;
  };
  cors: {
    origins: string[];
  };
  throttle: {
    ttl: number;
    limit: number;
  };
}
