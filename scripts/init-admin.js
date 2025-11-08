#!/usr/bin/env node
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('🔐 Nexal Admin Setup\n');

  const email = await question('Admin Email: ');
  const name = await question('Admin Name (optional): ');
  const password = await question('Admin Password: ');

  if (!email || !password) {
    console.error('❌ Email and password are required');
    process.exit(1);
  }

  try {
    // Check if admin already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.error(`❌ User with email "${email}" already exists`);
      process.exit(1);
    }

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email,
        name: name || undefined,
        role: 'admin',
      },
    });

    console.log(`✅ Admin user created successfully!`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
