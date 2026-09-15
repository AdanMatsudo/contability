import "dotenv/config";

// Integration tests run against the dedicated finance_test database.
if (!process.env.TEST_DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL is not set; see .env.example");
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
