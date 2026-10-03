CREATE TABLE IF NOT EXISTS public.distributor_products (
    id SERIAL PRIMARY KEY,
    distributor_id INTEGER,
    product_name VARCHAR(255),
    sku VARCHAR(100),
    category VARCHAR(100),
    price DECIMAL(12,2) DEFAULT 0,
    stock INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    product_id INTEGER,
    stock_quantity INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    CONSTRAINT unique_distributor_product UNIQUE (distributor_id, product_id)
);
