const { Pool } = require('pg');
const Redis = require('ioredis');
const crypto = require('crypto');
require('dotenv').config();

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'password',
    database: process.env.PG_DATABASE || 'urlshortener',
    port: process.env.PG_PORT || 5432,
});

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
});

async function initializeDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS data (
                id TEXT PRIMARY KEY,
                url TEXT NOT NULL
            )
        `);
        console.log('Database table initialized');
    } catch (err) {
        console.error('Error initializing database:', err.message);
    }
}

initializeDatabase();

// function makeID(length = 5) {
//     const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//     let result = '';
//     for (let i = 0; i < length; i++) {
//         result += characters.charAt(Math.floor(Math.random() * characters.length));
//     }
//     return result;
// }

function makeID(url) {
    // Create a hash of the URL
    const hash = crypto.createHash('sha256')
        .update(url)
        .digest('base64')
        .replace(/[+/=]/g, '') // Remove +, / and = characters
        .slice(0, 5);          // Take first 5 characters
    return hash;
}

async function findOrigin(id) {
    const cacheKey = `url:${id}`;
    try {
        const cachedUrl = await redis.get(cacheKey);
        if (cachedUrl) return cachedUrl;

        const result = await pool.query('SELECT url FROM data WHERE id = $1', [id]);
        if (result.rows.length > 0) {
            await redis.set(cacheKey, result.rows[0].url, 'EX', 3600); // Cache for 1 hour
            return result.rows[0].url;
        }
        return null;
    } catch (err) {
        throw new Error(`Database or cache error: ${err.message}`);
    }
}

async function create(id, url) {
    try {
        await pool.query('INSERT INTO data (id, url) VALUES ($1, $2)', [id, url]);
        await redis.set(`url:${id}`, url, 'EX', 3600); // Cache for 1 hour
        return id;
    } catch (err) {
        throw new Error(`Database error: ${err.message}`);
    }
}

async function shortUrl(url) {
    for (let attempts = 0; attempts < 10; attempts++) {
        const newID = makeID(url);
        const existingUrl = await findOrigin(newID);
        if (!existingUrl) {
            await create(newID, url);
            return newID;
        }
    }
    throw new Error('Failed to generate unique ID after 10 attempts');
}

module.exports = { findOrigin, shortUrl };