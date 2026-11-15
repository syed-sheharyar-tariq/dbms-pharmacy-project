-- Migration 002: Supabase Storage Buckets and Attachments Metadata Table
-- Allows storing medicine images, batch inspection documents, thermal receipts, and invoices

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

-- Create the Supabase Storage Bucket if storage schema exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'storage' AND table_name = 'buckets'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('pharmacy-attachments', 'pharmacy-attachments', true)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Enable RLS on attachments
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'attachments' AND policyname = 'Allow authenticated read attachments'
    ) THEN
        CREATE POLICY "Allow authenticated read attachments" 
        ON public.attachments FOR SELECT TO authenticated USING (true);
    END IF;
END $$;
