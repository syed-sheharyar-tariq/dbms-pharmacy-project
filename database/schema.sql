-- ==============================================================================
-- PHARMACY INVENTORY & SALES MANAGEMENT SYSTEM
-- MASTER DATABASE SCHEMA (PostgreSQL / Supabase)
-- Version 1.0
-- ==============================================================================

-- Enable UUID extension if not already available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to automatically manage updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 1. USERS (Application User Profiles linked to Supabase Auth)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    contact VARCHAR(40) NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('Manager', 'Cashier', 'Stock Handler')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Attempt to link auth_id to auth.users if supported in this environment
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_users_auth_users'
        ) THEN
            ALTER TABLE public.users 
            ADD CONSTRAINT fk_users_auth_users 
            FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 2. CATEGORIES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL UNIQUE,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 3. SUPPLIERS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(180) NOT NULL,
    contact_person VARCHAR(150) NULL,
    phone VARCHAR(40) NULL,
    email VARCHAR(255) NULL,
    address TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER trg_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 4. MEDICINES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    name VARCHAR(180) NOT NULL,
    generic_name VARCHAR(180) NULL,
    manufacturer VARCHAR(180) NULL,
    description TEXT NULL,
    selling_price NUMERIC(12, 2) NOT NULL CHECK (selling_price >= 0),
    reorder_level INTEGER NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medicines_category_id ON public.medicines(category_id);
CREATE INDEX IF NOT EXISTS idx_medicines_name ON public.medicines(name);
CREATE INDEX IF NOT EXISTS idx_medicines_generic_name ON public.medicines(generic_name);
CREATE INDEX IF NOT EXISTS idx_medicines_is_active ON public.medicines(is_active);

DROP TRIGGER IF EXISTS trg_medicines_updated_at ON public.medicines;
CREATE TRIGGER trg_medicines_updated_at
BEFORE UPDATE ON public.medicines
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 5. INVENTORY BATCHES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_id UUID NOT NULL REFERENCES public.medicines(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    batch_number VARCHAR(100) NOT NULL,
    purchase_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    purchase_price NUMERIC(12, 2) NOT NULL CHECK (purchase_price >= 0),
    qty_received INTEGER NOT NULL CHECK (qty_received > 0),
    qty_available INTEGER NOT NULL CHECK (qty_available >= 0 AND qty_available <= qty_received),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_medicine_batch_number UNIQUE (medicine_id, batch_number),
    CONSTRAINT chk_expiry_after_purchase CHECK (expiry_date >= purchase_date)
);

CREATE INDEX IF NOT EXISTS idx_batches_medicine_id ON public.inventory_batches(medicine_id);
CREATE INDEX IF NOT EXISTS idx_batches_supplier_id ON public.inventory_batches(supplier_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry_date ON public.inventory_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_fefo_allocation ON public.inventory_batches(medicine_id, expiry_date ASC, purchase_date ASC, created_at ASC) WHERE qty_available > 0;

-- ------------------------------------------------------------------------------
-- 6. CUSTOMERS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(180) NOT NULL,
    phone VARCHAR(40) NULL,
    address TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 7. SALES (Header)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_number VARCHAR(40) NOT NULL UNIQUE,
    idempotency_key VARCHAR(64) UNIQUE NULL,
    cashier_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    customer_id UUID NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
    payment_method VARCHAR(10) NOT NULL CHECK (payment_method IN ('CASH', 'CREDIT')),
    payment_status VARCHAR(10) NOT NULL CHECK (payment_status IN ('PAID', 'PENDING')),
    settled_at TIMESTAMPTZ NULL,
    settled_by UUID NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Business rule: CASH must be PAID with no settlement metadata
    CONSTRAINT chk_sales_cash_paid CHECK (
        payment_method <> 'CASH' OR (payment_status = 'PAID' AND settled_at IS NULL AND settled_by IS NULL)
    ),
    -- Business rule: CREDIT requires a non-null customer_id
    CONSTRAINT chk_sales_credit_customer CHECK (
        payment_method <> 'CREDIT' OR customer_id IS NOT NULL
    ),
    -- Business rule: CREDIT settlement integrity
    CONSTRAINT chk_sales_credit_settlement CHECK (
        payment_method <> 'CREDIT' OR (
            (payment_status = 'PENDING' AND settled_at IS NULL AND settled_by IS NULL) OR
            (payment_status = 'PAID' AND settled_at IS NOT NULL AND settled_by IS NOT NULL)
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_sales_sale_number ON public.sales(sale_number);
CREATE INDEX IF NOT EXISTS idx_sales_cashier_id ON public.sales(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON public.sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_idempotency_key ON public.sales(idempotency_key);

-- ------------------------------------------------------------------------------
-- 8. SALE ITEMS (Line Items linked to Batches)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE RESTRICT,
    batch_id UUID NOT NULL REFERENCES public.inventory_batches(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_batch_id ON public.sale_items(batch_id);

-- ------------------------------------------------------------------------------
-- 9. ATTACHMENTS (Supabase Storage Metadata)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(40) NOT NULL, -- 'medicine', 'batch', 'receipt', 'customer'
    entity_id UUID NOT NULL,
    storage_bucket VARCHAR(80) NOT NULL DEFAULT 'pharmacy-attachments',
    storage_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NULL,
    file_size INTEGER NULL,
    uploaded_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_entity ON public.attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by ON public.attachments(uploaded_by);

-- ------------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read pharmacy data via backend application role
-- Backend service connects via connection string (service_role or authenticated with proper grants)
DROP POLICY IF EXISTS "Allow authenticated read users" ON public.users;
CREATE POLICY "Allow authenticated read users" ON public.users FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read categories" ON public.categories;
CREATE POLICY "Allow authenticated read categories" ON public.categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read suppliers" ON public.suppliers;
CREATE POLICY "Allow authenticated read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read medicines" ON public.medicines;
CREATE POLICY "Allow authenticated read medicines" ON public.medicines FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read batches" ON public.inventory_batches;
CREATE POLICY "Allow authenticated read batches" ON public.inventory_batches FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read customers" ON public.customers;
CREATE POLICY "Allow authenticated read customers" ON public.customers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read sales" ON public.sales;
CREATE POLICY "Allow authenticated read sales" ON public.sales FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read sale_items" ON public.sale_items;
CREATE POLICY "Allow authenticated read sale_items" ON public.sale_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated read attachments" ON public.attachments;
CREATE POLICY "Allow authenticated read attachments" ON public.attachments FOR SELECT TO authenticated USING (true);
