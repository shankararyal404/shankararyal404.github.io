import { createClient } from "@libsql/client/web";
import { env } from './env-config.js';

// Edge-compatible database client
// Does NOT use connection pooling (not suitable for Edge usually, or relies on HTTP)
// Does NOT use 'dotenv' (assumes env vars are present in runtime)

const url = env.database.infra.url?.replace(/^https:/, 'libsql:'); // client/web prefers https or libsql? web usually https.
// Actually @libsql/client/web prefers 'https://' or 'libsql://' using HTTP.

const client = createClient({
    url: env.database.infra.url || '',
    authToken: env.database.infra.token || '',
});

export const edgeDb = client;
