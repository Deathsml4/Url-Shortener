const { Client } = require('pg');

const pgClient = new Client({
    user: 'pgadmin',
    host: 'url-shortener-db.cmnwyi0i2y3j.us-east-1.rds.amazonaws.com',
    database: 'postgres',
    password: 'Welcome123',
    port: 5432,
});

module.exports = pgClient;