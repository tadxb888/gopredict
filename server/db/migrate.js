const { pool } = require('./config');

const migrations = [
  {
    name: 'create_users_table',
    up: `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(20) NOT NULL DEFAULT 'trader' CHECK (role IN ('trader', 'admin')),
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
        session_token VARCHAR(500),
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_status ON users(status);
      CREATE INDEX idx_users_session_token ON users(session_token);
    `,
    down: `
      DROP TABLE IF EXISTS users CASCADE;
    `
  },
  {
    name: 'create_magic_links_table',
    up: `
      CREATE TABLE IF NOT EXISTS magic_links (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(500) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_magic_links_token ON magic_links(token);
      CREATE INDEX idx_magic_links_email ON magic_links(email);
      CREATE INDEX idx_magic_links_expires_at ON magic_links(expires_at);
    `,
    down: `
      DROP TABLE IF EXISTS magic_links CASCADE;
    `
  },
  {
    name: 'create_sessions_table',
    up: `
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) UNIQUE NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX idx_sessions_token ON sessions(token);
      CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
    `,
    down: `
      DROP TABLE IF EXISTS sessions CASCADE;
    `
  },
  {
    name: 'create_audit_logs_table',
    up: `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
    `,
    down: `
      DROP TABLE IF EXISTS audit_logs CASCADE;
    `
  }
];

async function runMigrations() {
  console.log('🔄 Starting database migrations...\n');

  // Create migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  for (const migration of migrations) {
    try {
      // Check if migration already applied
      const result = await pool.query(
        'SELECT * FROM migrations WHERE name = $1',
        [migration.name]
      );

      if (result.rows.length > 0) {
        console.log(`⏭️  Skipping migration: ${migration.name} (already applied)`);
        continue;
      }

      // Run migration
      console.log(`▶️  Running migration: ${migration.name}`);
      await pool.query(migration.up);

      // Record migration
      await pool.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migration.name]
      );

      console.log(`✅ Completed migration: ${migration.name}\n`);
    } catch (error) {
      console.error(`❌ Migration failed: ${migration.name}`);
      console.error(error);
      process.exit(1);
    }
  }

  console.log('✅ All migrations completed successfully!\n');
}

async function rollbackMigration(migrationName) {
  console.log(`🔄 Rolling back migration: ${migrationName}\n`);

  const migration = migrations.find(m => m.name === migrationName);
  if (!migration) {
    console.error(`❌ Migration not found: ${migrationName}`);
    process.exit(1);
  }

  try {
    await pool.query(migration.down);
    await pool.query('DELETE FROM migrations WHERE name = $1', [migrationName]);
    console.log(`✅ Rollback completed: ${migrationName}\n`);
  } catch (error) {
    console.error(`❌ Rollback failed: ${migrationName}`);
    console.error(error);
    process.exit(1);
  }
}

// Run migrations if called directly
if (require.main === module) {
  const command = process.argv[2];
  const migrationName = process.argv[3];

  if (command === 'rollback' && migrationName) {
    rollbackMigration(migrationName)
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  } else {
    runMigrations()
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  }
}

module.exports = { runMigrations, rollbackMigration };
