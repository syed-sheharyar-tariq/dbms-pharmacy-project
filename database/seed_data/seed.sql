-- ==============================================================================
-- DEVELOPMENT / DEMO SEED DATA
-- PHARMACY INVENTORY & SALES MANAGEMENT SYSTEM
-- ==============================================================================

-- 1. SEED CATEGORIES
INSERT INTO public.categories (id, name, description, is_active) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Antibiotics', 'Antibacterial and antimicrobial prescription medicines', true),
    ('c0000000-0000-0000-0000-000000000002', 'Analgesics & Pain Relief', 'Pain relievers and anti-inflammatory medicines', true),
    ('c0000000-0000-0000-0000-000000000003', 'Gastrointestinal', 'Antacids, proton-pump inhibitors, and digestive health', true),
    ('c0000000-0000-0000-0000-000000000004', 'Cardiovascular', 'Blood pressure, heart, and cholesterol management', true),
    ('c0000000-0000-0000-0000-000000000005', 'Antihistamines', 'Allergy, cold, and respiratory symptom treatments', true)
ON CONFLICT (name) DO NOTHING;

-- 2. SEED SUPPLIERS
INSERT INTO public.suppliers (id, name, contact_person, phone, email, address, is_active) VALUES
    ('s0000000-0000-0000-0000-000000000001', 'GlaxoSmithKline Distribution', 'Tariq Mehmood', '+92-300-1112233', 'tariq.m@gsk-dist.pk', 'Plot 24, Industrial Area, Karachi', true),
    ('s0000000-0000-0000-0000-000000000002', 'Abbott Healthcare Supply', 'Ayesha Khan', '+92-321-4455667', 'ayesha.k@abbott-supply.pk', 'Sector 12, Korangi, Karachi', true),
    ('s0000000-0000-0000-0000-000000000003', 'Getz Pharma Logistics', 'Bilal Ahmed', '+92-333-7788990', 'bilal.a@getz-logistics.pk', 'Plot 5B, SITE Area, Karachi', true)
ON CONFLICT (id) DO NOTHING;

-- 3. SEED MEDICINES
INSERT INTO public.medicines (id, category_id, name, generic_name, manufacturer, description, selling_price, reorder_level, is_active) VALUES
    ('m0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Panadol 500mg Tablets', 'Paracetamol', 'GSK', 'Fast relief of pain and fever (strip of 10 tablets)', 35.00, 50, true),
    ('m0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'Brufen 400mg Tablets', 'Ibuprofen', 'Abbott', 'Anti-inflammatory and fever reducer (strip of 10 tablets)', 60.00, 30, true),
    ('m0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'Augmentin 625mg Tablets', 'Amoxicillin + Clavulanic Acid', 'GSK', 'Broad spectrum antibiotic (pack of 6 tablets)', 280.00, 20, true),
    ('m0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 'Risek 20mg Capsules', 'Omeprazole', 'Getz Pharma', 'Relief of acid reflux and peptic ulcer (pack of 14)', 320.00, 25, true),
    ('m0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005', 'Rigix 10mg Tablets', 'Cetirizine HCl', 'Getz Pharma', 'Allergy relief for hay fever and urticaria (strip of 10)', 110.00, 15, true)
ON CONFLICT (id) DO NOTHING;

-- 4. SEED INVENTORY BATCHES (Demonstrates FEFO with multiple expiry dates)
-- Panadol Batch A (Expires in 2 months) - Should be allocated first under FEFO
INSERT INTO public.inventory_batches (id, medicine_id, supplier_id, batch_number, purchase_date, expiry_date, purchase_price, qty_received, qty_available) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'm0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', 'PAN-2026-B1', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '60 days', 25.00, 100, 100),
    ('b0000000-0000-0000-0000-000000000002', 'm0000000-0000-0000-0000-000000000001', 's0000000-0000-0000-0000-000000000001', 'PAN-2026-B2', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '180 days', 26.00, 150, 150),
    -- Brufen Batch (Expiring Soon - 15 days from now to test Expiring Alert)
    ('b0000000-0000-0000-0000-000000000003', 'm0000000-0000-0000-0000-000000000002', 's0000000-0000-0000-0000-000000000002', 'BRU-2026-EXP', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE + INTERVAL '15 days', 45.00, 40, 40),
    -- Augmentin Batch (Expired - to verify exclusion from sellable stock and presence in Expired Alert)
    ('b0000000-0000-0000-0000-000000000004', 'm0000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000001', 'AUG-OLD-01', CURRENT_DATE - INTERVAL '400 days', CURRENT_DATE - INTERVAL '5 days', 210.00, 20, 20),
    -- Augmentin Fresh Batch (Unexpired)
    ('b0000000-0000-0000-0000-000000000005', 'm0000000-0000-0000-0000-000000000003', 's0000000-0000-0000-0000-000000000001', 'AUG-2026-FRESH', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '365 days', 220.00, 50, 50),
    -- Risek Low-Stock Batch (Total sellable = 10, which is <= reorder_level 25 to test Low Stock Alert)
    ('b0000000-0000-0000-0000-000000000006', 'm0000000-0000-0000-0000-000000000004', 's0000000-0000-0000-0000-000000000003', 'RIS-2026-LOW', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '240 days', 250.00, 10, 10)
ON CONFLICT (medicine_id, batch_number) DO NOTHING;

-- 5. SEED CUSTOMERS
INSERT INTO public.customers (id, name, phone, address) VALUES
    ('cu000000-0000-0000-0000-000000000001', 'Muhammad Usman', '+92-301-2345678', 'House 14B, Gulshan-e-Iqbal, Karachi'),
    ('cu000000-0000-0000-0000-000000000002', 'Fatima Zahra', '+92-312-9876543', 'Flat 402, Clifton Block 5, Karachi'),
    ('cu000000-0000-0000-0000-000000000003', 'Kamran Siddiqui', '+92-345-5556677', 'Sector 11-A, North Karachi')
ON CONFLICT (id) DO NOTHING;
