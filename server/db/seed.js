const { query } = require('./config');

async function seed() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Create default admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'nexdayai@gmail.com';
    
    const existingAdmin = await query(
      'SELECT * FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingAdmin.rows.length > 0) {
      console.log('⏭️  Admin user already exists, skipping...');
    } else {
      await query(
        `INSERT INTO users (email, first_name, last_name, role, status) 
         VALUES ($1, $2, $3, $4, $5)`,
        [adminEmail, 'System', 'Administrator', 'admin', 'active']
      );
      console.log(`✅ Created admin user: ${adminEmail}`);
    }

    // Create sample trader user for testing (development only)
    if (process.env.NODE_ENV === 'development') {
      const traderEmail = 'rostane521@gmail.com';
      
      const existingTrader = await query(
        'SELECT * FROM users WHERE email = $1',
        [traderEmail]
      );

      if (existingTrader.rows.length === 0) {
        await query(
          `INSERT INTO users (email, first_name, last_name, role, status) 
           VALUES ($1, $2, $3, $4, $5)`,
          [traderEmail, 'Test', 'Trader', 'trader', 'active']
        );
        console.log(`✅ Created test trader: ${traderEmail}`);
      }
    }

    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('You can now login with:');
    console.log(`  Admin: ${adminEmail}`);
    if (process.env.NODE_ENV === 'development') {
      console.log('  Trader: rostane521@gmail.com');
    }
    console.log('\nMagic links will be sent to these email addresses.\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seed if called directly
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seed };
