#!/usr/bin/env node
/*
  scripts/create-admin-via-api.js

  Tries to create an admin user by calling the running app's auth HTTP endpoints.
  If the HTTP attempts fail (server not running or endpoints not available), it falls
  back to running `scripts/init-admin.js` which writes directly to the DB.

  Usage:
    node scripts/create-admin-via-api.js <email> <password> [name] [baseUrl]

  Example:
    node scripts/create-admin-via-api.js admin@example.com 'Secret123' 'Admin' http://localhost:3000
*/

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

async function tryPost(url, body) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 2) {
    console.error('Usage: node scripts/create-admin-via-api.js <email> <password> [name] [baseUrl]');
    process.exit(2);
  }
  const [email, password, name = '', baseUrl = 'http://localhost:3000'] = argv;

  // A list of endpoints commonly used for sign-up with email/password in various setups
  const endpoints = [
    '/api/auth/sign-up/email',
    '/api/auth/sign-up',
    '/api/auth/signup',
    '/api/auth/register',
    '/api/auth/create',
  ];

  console.log('Attempting to create admin via HTTP endpoints on', baseUrl);

  for (const ep of endpoints) {
    const url = new URL(ep, baseUrl).toString();
    console.log(' -> Trying', url);
    // best-effort fetch available in Node 18+; use global fetch
    // body shape: many endpoints accept { email, password, name }
    // If your endpoint expects different shape, adjust accordingly.
    // eslint-disable-next-line no-undef
    const result = await tryPost(url, { email, password, name });
    if (result.ok) {
      console.log('Success creating admin via', url, 'status', result.status);
      console.log('Response:', result.body);

      // Even if creation succeeded via HTTP, ensure role is set to 'admin' in DB
      // by performing the same DB actions inline (avoid spawning a separate process).
      try {
        const { PrismaClient } = require('@prisma/client');
        const bcrypt = require('bcryptjs');
        const prisma = new PrismaClient();

        const accountId = (email || '').toLowerCase();
        const hashed = bcrypt.hashSync(password, 10);

        // find or create user
        let user = await prisma.user.findUnique({ where: { email: accountId } }).catch(() => null);
        if (!user) {
          user = await prisma.user.create({
            data: {
              name: name || null,
              email: accountId,
              emailVerified: true,
              role: 'admin',
              accounts: { create: { providerId: 'credential', accountId, password: hashed } },
            },
          });
          console.log(`Created admin user in DB: ${user.email}`);
        } else {
          if (user.role !== 'admin') {
            await prisma.user.update({ where: { id: user.id }, data: { role: 'admin' } });
            console.log(`Updated user role to admin for ${user.email}`);
          }

          const existingAccount = await prisma.account.findFirst({ where: { providerId: 'credential', accountId } });
          if (existingAccount) {
            await prisma.account.update({ where: { id: existingAccount.id }, data: { password: hashed } });
            console.log('Updated existing credential account password in DB.');
          } else {
            await prisma.account.create({ data: { providerId: 'credential', accountId, password: hashed, user: { connect: { id: user.id } } } });
            console.log('Created credential account for user in DB.');
          }
        }

        await prisma.$disconnect();
        process.exit(0);
      } catch (e) {
        console.error('Error ensuring admin in DB:', e && e.message ? e.message : e);
        process.exit(1);
      }
    }
    console.log('  failed:', result.status || result.error, result.body ? ('body: ' + result.body) : '');
  }

  console.warn('HTTP creation attempts failed — falling back to DB script (init-admin.js)');
  // perform DB fallback inline (avoid spawning a separate process)
  try {
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient();

    const accountId = (email || '').toLowerCase();
    const hashed = bcrypt.hashSync(password, 10);

    let user = await prisma.user.findUnique({ where: { email: accountId } }).catch(() => null);
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: name || null,
          email: accountId,
          emailVerified: true,
          role: 'admin',
          accounts: { create: { providerId: 'credential', accountId, password: hashed } },
        },
      });
      console.log(`Created admin user in DB: ${user.email}`);
    } else {
      if (user.role !== 'admin') {
        await prisma.user.update({ where: { id: user.id }, data: { role: 'admin' } });
        console.log(`Updated user role to admin for ${user.email}`);
      }

      const existingAccount = await prisma.account.findFirst({ where: { providerId: 'credential', accountId } });
      if (existingAccount) {
        await prisma.account.update({ where: { id: existingAccount.id }, data: { password: hashed } });
        console.log('Updated existing credential account password in DB.');
      } else {
        await prisma.account.create({ data: { providerId: 'credential', accountId, password: hashed, user: { connect: { id: user.id } } } });
        console.log('Created credential account for user in DB.');
      }
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Error performing DB fallback:', e && e.message ? e.message : e);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e && e.message ? e.message : e);
  process.exit(1);
});
