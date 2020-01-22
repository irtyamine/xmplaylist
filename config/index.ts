import debug from 'debug';

const log = debug('xmplaylist');
const env = process.env.NODE_ENV || 'test';
log(`Env: ${env}`);

const DB_PASSWORD = process.env.DB_PASSWORD ?? '';
// sentry.io dsn (optional)
const SENTRY_DSN = process.env.DSN ?? '';
// disable config file based import
const DISABLE_CONFIG_IMPORT = process.env.DISABLE_CONFIG_IMPORT === 'true';

let config = {
  db: {
    client: 'postgresql',
    connection: {
      database: 'xmplaylist',
      user: 'postgres',
      password: DB_PASSWORD,
    },
  },
  dsn: SENTRY_DSN,
  spotifyUsername: '',
  spotifyPassword: '',
  spotifyClientId: '',
  spotifyClientSecret: '',
  googleCredentials: '',
};

const filename = `./config.${env}`;
log(`Using: ${filename}`);
if (!DISABLE_CONFIG_IMPORT) {
  const imported = require(filename).default;
  config = { ...config, ...imported };
}

export default config;
