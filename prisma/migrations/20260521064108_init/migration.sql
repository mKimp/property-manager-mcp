-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyName" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "rent" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "leaseStart" TEXT,
    "leaseEnd" TEXT,
    "propertyManager" TEXT,
    "notes" TEXT,
    "propertyTax" REAL,
    "mortgageLender" TEXT,
    "mortgageMonthlyPayment" REAL,
    "mortgageInterestRate" REAL,
    "mortgageTermYears" INTEGER,
    "mortgageStartDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    CONSTRAINT "Tenant_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RepairExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "vendor" TEXT,
    "notes" TEXT,
    CONSTRAINT "RepairExpense_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidDate" TEXT,
    "notes" TEXT,
    CONSTRAINT "RentRecord_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UtilitiesRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "electricity" REAL,
    "water" REAL,
    "gas" REAL,
    "internet" REAL,
    "trash" REAL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidDate" TEXT,
    "notes" TEXT,
    CONSTRAINT "UtilitiesRecord_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RentRecord_propertyId_year_month_key" ON "RentRecord"("propertyId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "UtilitiesRecord_propertyId_year_month_key" ON "UtilitiesRecord"("propertyId", "year", "month");
