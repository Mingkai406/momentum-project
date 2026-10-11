const { Client } = require('pg');
require('dotenv').config();

async function cleanup() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Delete all test data
    await client.query('DELETE FROM mentor_feedback');
    await client.query('DELETE FROM monthly_checkpoints');
    await client.query('DELETE FROM action_steps');
    await client.query('DELETE FROM grow_analysis');
    await client.query('DELETE FROM goals');
    await client.query('DELETE FROM mentor_mentee');
    await client.query('DELETE FROM user_roles');

    console.log('All test data cleaned up successfully');
    await client.end();
  } catch (error) {
    console.error('Error cleaning up:', error);
  }
}

cleanup();
