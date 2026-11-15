-- Migration 001: Initial Core Schema
-- Created to establish core pharmacy inventory and sales tables

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL UNIQUE,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE TRIGGER trg_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE TRIGGER trg_medicines_updated_at
BEFORE UPDATE ON public.medicines
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
    CONSTRAINT chk_sales_cash_paid CHECK (
        payment_method <> 'CASH' OR (payment_status = 'PAID' AND settled_at IS NULL AND settled_by IS NULL)
    ),
    CONSTRAINT chk_sales_credit_customer CHECK (
        payment_method <> 'CREDIT' OR customer_id IS NOT NULL
    ),
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
