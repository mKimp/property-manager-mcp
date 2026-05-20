// Use type aliases (not interfaces) so they're assignable to { [key: string]: unknown }
// which is required by structuredContent in MCP tool responses

export type Address = {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

export type Tenant = {
  name: string;
  email?: string;
  phone?: string;
};

export type RepairExpense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  year: number;
  vendor?: string;
  notes?: string;
};

export type RentRecord = {
  year: number;
  month: number;
  amount: number;
  paid: boolean;
  paidDate?: string;
  notes?: string;
};

export type UtilitiesRecord = {
  year: number;
  month: number;
  utilities: Utilities;
  paid: boolean;
  paidDate?: string;
  notes?: string;
};

export type Utilities = {
  electricity?: number;
  water?: number;
  gas?: number;
  internet?: number;
  trash?: number;
}

export type Property = {
  id: string;
  propertyName: string;
  address: Address;
  rent: number;
  currency: string;
  tenants: Tenant[];
  leaseStart?: string;
  leaseEnd?: string;
  propertyManager?: string;
  notes?: string;
  repairs: RepairExpense[];
  rentRecords: RentRecord[];
  createdAt: string;
  updatedAt: string;
  mortgage?: {
    lender?: string;
    monthlyPayment: number;
    interestRate?: number;
    termYears?: number;
    startDate?: string;
  },
  propertyTax?: number;
  utilitiesRecords: UtilitiesRecord[];
};

export type PropertyStore = {
  properties: Record<string, Property>;
};