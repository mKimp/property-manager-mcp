import { z } from "zod";
export declare const AddressShape: {
    street: z.ZodString;
    city: z.ZodString;
    state: z.ZodString;
    zip: z.ZodString;
    country: z.ZodDefault<z.ZodString>;
};
export declare const TenantShape: {
    name: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
};
export declare const RepairExpenseShape: {
    description: z.ZodString;
    amount: z.ZodNumber;
    date: z.ZodString;
    vendor: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
};
export declare const RentRecordShape: {
    year: z.ZodNumber;
    month: z.ZodNumber;
    amount: z.ZodNumber;
    paid: z.ZodBoolean;
    paidDate: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
};
export declare const AddPropertyInputShape: {
    propertyName: z.ZodString;
    address: z.ZodObject<{
        street: z.ZodString;
        city: z.ZodString;
        state: z.ZodString;
        zip: z.ZodString;
        country: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        street: string;
        city: string;
        state: string;
        zip: string;
        country: string;
    }, {
        street: string;
        city: string;
        state: string;
        zip: string;
        country?: string | undefined;
    }>;
    rent: z.ZodNumber;
    currency: z.ZodDefault<z.ZodString>;
    tenants: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        email: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        email?: string | undefined;
        phone?: string | undefined;
    }, {
        name: string;
        email?: string | undefined;
        phone?: string | undefined;
    }>, "many">;
    leaseStart: z.ZodOptional<z.ZodString>;
    leaseEnd: z.ZodOptional<z.ZodString>;
    propertyManager: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    mortgage: z.ZodOptional<z.ZodObject<{
        lender: z.ZodOptional<z.ZodString>;
        monthlyPayment: z.ZodOptional<z.ZodNumber>;
        interestRate: z.ZodOptional<z.ZodNumber>;
        termYears: z.ZodOptional<z.ZodNumber>;
        startDate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        lender?: string | undefined;
        monthlyPayment?: number | undefined;
        interestRate?: number | undefined;
        termYears?: number | undefined;
        startDate?: string | undefined;
    }, {
        lender?: string | undefined;
        monthlyPayment?: number | undefined;
        interestRate?: number | undefined;
        termYears?: number | undefined;
        startDate?: string | undefined;
    }>>;
    propertyTax: z.ZodOptional<z.ZodNumber>;
};
export declare const UpdatePropertyInputShape: {
    propertyId: z.ZodString;
    propertyName: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodObject<{
        street: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        state: z.ZodOptional<z.ZodString>;
        zip: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodDefault<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        street?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        zip?: string | undefined;
        country?: string | undefined;
    }, {
        street?: string | undefined;
        city?: string | undefined;
        state?: string | undefined;
        zip?: string | undefined;
        country?: string | undefined;
    }>>;
    rent: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodString>;
    tenants: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        email: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        email?: string | undefined;
        phone?: string | undefined;
    }, {
        name: string;
        email?: string | undefined;
        phone?: string | undefined;
    }>, "many">>;
    leaseStart: z.ZodOptional<z.ZodString>;
    leaseEnd: z.ZodOptional<z.ZodString>;
    propertyManager: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    mortgage: z.ZodOptional<z.ZodObject<{
        lender: z.ZodOptional<z.ZodString>;
        monthlyPayment: z.ZodOptional<z.ZodNumber>;
        interestRate: z.ZodOptional<z.ZodNumber>;
        termYears: z.ZodOptional<z.ZodNumber>;
        startDate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        lender?: string | undefined;
        monthlyPayment?: number | undefined;
        interestRate?: number | undefined;
        termYears?: number | undefined;
        startDate?: string | undefined;
    }, {
        lender?: string | undefined;
        monthlyPayment?: number | undefined;
        interestRate?: number | undefined;
        termYears?: number | undefined;
        startDate?: string | undefined;
    }>>;
    propertyTax: z.ZodOptional<z.ZodNumber>;
};
export declare const PropertyIdInputShape: {
    propertyId: z.ZodString;
};
export declare const DeletePropertyInputShape: {
    propertyId: z.ZodString;
    dryRun: z.ZodDefault<z.ZodBoolean>;
};
export declare const SearchPropertiesInputShape: {
    city: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    propertyName: z.ZodOptional<z.ZodString>;
    tenantName: z.ZodOptional<z.ZodString>;
    street: z.ZodOptional<z.ZodString>;
};
export declare const AddRepairInputShape: {
    propertyId: z.ZodString;
    description: z.ZodString;
    amount: z.ZodNumber;
    date: z.ZodString;
    vendor: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
};
export declare const DeleteRepairInputShape: {
    propertyId: z.ZodString;
    repairId: z.ZodString;
};
export declare const GetRepairsByYearInputShape: {
    propertyId: z.ZodString;
    year: z.ZodNumber;
};
export declare const AddRentRecordInputShape: {
    propertyId: z.ZodString;
    year: z.ZodNumber;
    month: z.ZodNumber;
    amount: z.ZodNumber;
    paid: z.ZodBoolean;
    paidDate: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
};
export declare const AddUtilitiesRecordInputShape: {
    propertyId: z.ZodString;
    year: z.ZodOptional<z.ZodNumber>;
    month: z.ZodOptional<z.ZodNumber>;
    utilities: z.ZodObject<{
        electricity: z.ZodOptional<z.ZodNumber>;
        water: z.ZodOptional<z.ZodNumber>;
        gas: z.ZodOptional<z.ZodNumber>;
        internet: z.ZodOptional<z.ZodNumber>;
        trash: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        electricity?: number | undefined;
        water?: number | undefined;
        gas?: number | undefined;
        internet?: number | undefined;
        trash?: number | undefined;
    }, {
        electricity?: number | undefined;
        water?: number | undefined;
        gas?: number | undefined;
        internet?: number | undefined;
        trash?: number | undefined;
    }>;
    paid: z.ZodBoolean;
    paidDate: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
};
export declare const UpdateRentRecordInputShape: {
    propertyId: z.ZodString;
    year: z.ZodNumber;
    month: z.ZodNumber;
    paid: z.ZodOptional<z.ZodBoolean>;
    paidDate: z.ZodOptional<z.ZodString>;
    amount: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
};
export declare const UpdateUtilitiesRecordInputShape: {
    propertyId: z.ZodString;
    year: z.ZodOptional<z.ZodNumber>;
    month: z.ZodOptional<z.ZodNumber>;
    paid: z.ZodOptional<z.ZodBoolean>;
    paidDate: z.ZodOptional<z.ZodString>;
    utilities: z.ZodOptional<z.ZodObject<{
        electricity: z.ZodOptional<z.ZodNumber>;
        water: z.ZodOptional<z.ZodNumber>;
        gas: z.ZodOptional<z.ZodNumber>;
        internet: z.ZodOptional<z.ZodNumber>;
        trash: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        electricity?: number | undefined;
        water?: number | undefined;
        gas?: number | undefined;
        internet?: number | undefined;
        trash?: number | undefined;
    }, {
        electricity?: number | undefined;
        water?: number | undefined;
        gas?: number | undefined;
        internet?: number | undefined;
        trash?: number | undefined;
    }>>;
    notes: z.ZodOptional<z.ZodString>;
};
export declare const GetRentByYearInputShape: {
    propertyId: z.ZodString;
    year: z.ZodNumber;
};
export declare const GetUtilitiesByYearInputShape: {
    propertyId: z.ZodString;
    year: z.ZodOptional<z.ZodNumber>;
};
//# sourceMappingURL=index.d.ts.map