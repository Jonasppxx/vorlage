#!/usr/bin/env node
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Hash password using Better-Auth compatible method
async function hashPassword(password) {
  // Better-Auth uses @node-rs/argon2 or bcrypt depending on configuration
  // For compatibility, we'll use bcrypt which is the default
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  
  // Better-Auth expects the hash in a specific format
  // Format: bcrypt:<hash>
  return hash;
}

async function main() {
  console.log('🔐 Nexal Admin Setup\n');

  const email = await question('Admin Email: ');
  const name = await question('Admin Name (optional): ');
  const password = await question('Admin Password: ');

  if (!email || !password) {
    console.error('❌ Email and password are required');
    rl.close();
    process.exit(1);
  }

  try {
    // Check if admin already exists
    const existing = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: {
          where: {
            providerId: 'credential',
          },
        },
      },
    });

    if (existing) {
      console.log(`⚠️  User with email "${email}" already exists`);
      console.log('   Updating to admin role and resetting password...\n');
      
      // Hash the password
      const hashedPassword = await hashPassword(password);
      
      // Update user role
      await prisma.user.update({
        where: { email },
        data: { 
          role: 'admin',
          emailVerified: true,
        },
      });

      if (existing.accounts && existing.accounts.length > 0) {
        // Update existing account with new password
        await prisma.account.update({
          where: { id: existing.accounts[0].id },
          data: { password: hashedPassword },
        });
      } else {
        // Create new credential account
        await prisma.account.create({
          data: {
            userId: existing.id,
            accountId: email,
            providerId: 'credential',
            password: hashedPassword,
          },
        });
      }

      console.log(`✅ Admin updated successfully!`);
      console.log(`   Email: ${email}`);
      console.log(`   Role: admin`);
    } else {
      // Hash the password
      const hashedPassword = await hashPassword(password);

      // Create admin user
      const user = await prisma.user.create({
        data: {
          email,
          name: name || undefined,
          role: 'admin',
          emailVerified: true,
        },
      });

      // Create credential account with password
      await prisma.account.create({
        data: {
          userId: user.id,
          accountId: email,
          providerId: 'credential',
          password: hashedPassword,
        },
      });

      console.log(`✅ Admin user created successfully!`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
    }

    console.log('\n🎉 You can now login with these credentials\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
