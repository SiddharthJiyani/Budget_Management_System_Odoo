require('dotenv').config();
const mongoose = require('mongoose');
const Contact = require('../models/Contact');

mongoose.connect(process.env.MONGODB_URL).then(async () => {
    console.log('Checking database for vendors...\n');
    
    const vendors = await Contact.find({ type: 'vendor' });
    console.log(`Vendors: ${vendors.length}`);
    vendors.forEach(v => console.log(`  - ${v.name} (${v.email}) - type: "${v.type}"`));
    
    console.log(`\nAll Contacts: ${await Contact.countDocuments()}`);
    const allTypes = await Contact.distinct('type');
    console.log(`Contact types in DB: ${JSON.stringify(allTypes)}`);
    
    await mongoose.disconnect();
}).catch(console.error);
