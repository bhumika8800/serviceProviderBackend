const dns = require('dns');
const mongoose = require('mongoose');

const PUBLIC_DNS = ['8.8.8.8', '1.1.1.1'];

const getUriHost = (uri) => {
  const match = uri.match(/^mongodb(?:\+srv)?:\/\/[^@]*@?([^/]+)/);
  return match ? match[1].split(',')[0].split(':')[0] : null;
};

const canResolve = (host) =>
  new Promise((resolve) => {
    dns.resolveSrv(`_mongodb._tcp.${host}`, () => {
      dns.resolve(host, (err) => resolve(!err));
    });
  });

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    const host = getUriHost(uri);

    if (host && !(await canResolve(host))) {
      dns.setServers(PUBLIC_DNS);
      console.warn('Default DNS resolver failed; falling back to public DNS servers');
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
