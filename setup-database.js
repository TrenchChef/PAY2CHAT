// Script to set up Railway PostgreSQL database schema
// Usage: node setup-database.js

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Read DATABASE_URL from environment or file
const DATABASE_URL = process.env.DATABASE_URL || 
  fs.readFileSync(path.join(__dirname, '.env.railway.db'), 'utf8').trim();

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found');
  console.error('Please set DATABASE_URL environment variable or ensure .env.railway.db exists');
  process.exit(1);
}

// Read SQL schema file
const sqlFile = path.join(__dirname, 'railway-schema.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

async function setupDatabase() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to Railway PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to database');

    console.log('Running schema SQL...');
    await client.query(sql);
    console.log('✅ Schema executed successfully');

    // Verify tables were created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\n📊 Tables created:');
    result.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.table_name}`);
    });

    if (result.rows.length === 6) {
      console.log('\n✅ All 6 tables created successfully!');
    } else {
      console.log(`\n⚠️  Expected 6 tables, found ${result.rows.length}`);
    }

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed');
  }
}

setupDatabase();

