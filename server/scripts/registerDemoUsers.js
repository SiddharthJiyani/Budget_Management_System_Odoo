require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

async function main() {
  const mongoUrl = process.env.MONGODB_URL || process.env.MONGO_URI;

  if (!mongoUrl) {
    throw new Error('Missing MONGODB_URL or MONGO_URI');
  }

  await mongoose.connect(mongoUrl);

  const demoUsers = [
    {
      email: 'demo-admin@example.com',
      loginId: 'demo-admin',
      password: 'Demo@1234',
      firstName: 'Demo',
      lastName: 'Admin',
      accountType: 'admin',
    },
    {
      email: 'demo-portal@example.com',
      loginId: 'demo-portal',
      password: 'Demo@1234',
      firstName: 'Demo',
      lastName: 'Portal',
      accountType: 'portal',
    },
  ];

  for (const demoUser of demoUsers) {
    const hashedPassword = await bcrypt.hash(demoUser.password, 10);

    await User.findOneAndUpdate(
      { $or: [{ email: demoUser.email }, { loginId: demoUser.loginId }] },
      {
        $set: {
          email: demoUser.email,
          loginId: demoUser.loginId,
          firstName: demoUser.firstName,
          lastName: demoUser.lastName,
          name: `${demoUser.firstName} ${demoUser.lastName}`,
          password: hashedPassword,
          accountType: demoUser.accountType,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`Registered ${demoUser.accountType} demo account: ${demoUser.loginId}`);
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message || error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});