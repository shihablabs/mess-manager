import dns from 'dns';
import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';

// Ensure Google DNS for MongoDB Atlas SRV resolution
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// STRICT SAFETY CHECK: Force simulation database name and verify it contains "sim"
const SIM_DB_NAME = 'mess_manager_sim';
if (!SIM_DB_NAME.includes('sim')) {
  throw new Error("CRITICAL SAFETY CHECK FAILED: Database name must contain 'sim'!");
}
process.env.MONGODB_DB_NAME = SIM_DB_NAME;

console.log('🚀 Running 30-Day Mess Cycle Simulation (via vitest runner)...');
console.log(`🛡️ Database: ${SIM_DB_NAME}`);
console.log('Please run: npm test -- scripts/simulate-cycle.test.ts or npx vitest run scripts/simulate-cycle.test.ts');
