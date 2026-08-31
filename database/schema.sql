-- =========================================================
-- POLO NORTE BEBIDAS
-- Estrutura principal do banco de dados
-- PostgreSQL
-- =========================================================


-- =========================================================
-- CLIENTES
-- =========================================================

CREATE TABLE IF NOT EXISTS customers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(150) NOT NULL,
    email VARCHAR(200) NOT NULL,
    phone VARCHAR(30) NOT NULL,

    -- Nunca salvaremos a senha normal.
    -- Aqui será armazenado apenas o hash gerado pelo bcrypt.
    password_hash TEXT NOT NULL,

    active BOOLEAN NOT NULL DEFAULT TRUE,

    last_login_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- E-mail único ignorando maiúsculas/minúsculas
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email_unique
ON customers (LOWER(email));


-- =========================================================
-- ENDEREÇOS DOS CLIENTES
-- =========================================================

CREATE TABLE IF NOT EXISTS customer_addresses (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    customer_id BIGINT NOT NULL
        REFERENCES customers(id)
        ON DELETE CASCADE,

    -- Exemplo: Casa, Trabalho, Apartamento
    label VARCHAR(50) DEFAULT 'Casa',

    recipient_name VARCHAR(150),

    zip_code VARCHAR(10),
    street VARCHAR(200) NOT NULL,
    number VARCHAR(30) NOT NULL,
    complement VARCHAR(150),
    neighborhood VARCHAR(150) NOT NULL,
    city VARCHAR(150) NOT NULL,
    state VARCHAR(2) NOT NULL,

    reference TEXT,

    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer
ON customer_addresses(customer_id);


-- Permite apenas um endereço principal ativo por cliente
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_addresses_one_default
ON customer_addresses(customer_id)
WHERE is_default = TRUE AND active = TRUE;


-- =========================================================
-- PRODUTOS
-- =========================================================

CREATE TABLE IF NOT EXISTS products (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(150) NOT NULL,
    description TEXT,

    -- Exemplo: Refrigerantes, Cervejas, Água, Energéticos
    category VARCHAR(100),

    price NUMERIC(10,2) NOT NULL
        CHECK (price >= 0),

    stock_quantity INTEGER NOT NULL DEFAULT 0
        CHECK (stock_quantity >= 0),

    image_url TEXT,

    -- FALSE = produto não aparece para compra
    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_products_active
ON products(active);


CREATE INDEX IF NOT EXISTS idx_products_category
ON products(category);


-- =========================================================
-- PEDIDOS
-- =========================================================

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    order_number VARCHAR(50) NOT NULL UNIQUE,

    -- Pode ser NULL porque vamos permitir compra sem cadastro.
    customer_id BIGINT
        REFERENCES customers(id)
        ON DELETE SET NULL,

    -- Mesmo cliente cadastrado terá seus dados copiados
    -- para o pedido para preservar o histórico.
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    customer_email VARCHAR(200),

    -- Endereço salvo utilizado, caso o cliente tenha conta.
    customer_address_id BIGINT
        REFERENCES customer_addresses(id)
        ON DELETE SET NULL,

    -- Cópia do endereço no momento da compra.
    -- Assim, se o cliente alterar seu endereço depois,
    -- o pedido antigo continua mostrando o endereço correto.
    delivery_address TEXT NOT NULL,
    delivery_reference TEXT,

    delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (delivery_fee >= 0),

    subtotal NUMERIC(10,2) NOT NULL
        CHECK (subtotal >= 0),

    total NUMERIC(10,2) NOT NULL
        CHECK (total >= 0),

    -- pix, credit_card, debit_card, cash
    payment_method VARCHAR(30) NOT NULL,

    -- pending, approved, rejected, cancelled...
    payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',

    -- received, preparing, out_for_delivery, delivered...
    order_status VARCHAR(30) NOT NULL DEFAULT 'received',

    notes TEXT,

    -- Mantemos aqui também para facilitar integração
    -- com o fluxo atual do Mercado Pago.
    mercado_pago_payment_id VARCHAR(100),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_orders_customer
ON orders(customer_id);


CREATE INDEX IF NOT EXISTS idx_orders_payment_status
ON orders(payment_status);


CREATE INDEX IF NOT EXISTS idx_orders_order_status
ON orders(order_status);


CREATE INDEX IF NOT EXISTS idx_orders_created_at
ON orders(created_at);


-- =========================================================
-- ITENS DOS PEDIDOS
-- =========================================================

CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    order_id BIGINT NOT NULL
        REFERENCES orders(id)
        ON DELETE CASCADE,

    product_id BIGINT
        REFERENCES products(id)
        ON DELETE SET NULL,

    -- Guardamos nome e preço do momento da compra.
    -- Se o produto mudar de preço depois,
    -- o pedido antigo permanece correto.
    product_name VARCHAR(150) NOT NULL,

    unit_price NUMERIC(10,2) NOT NULL
        CHECK (unit_price >= 0),

    quantity INTEGER NOT NULL
        CHECK (quantity > 0),

    subtotal NUMERIC(10,2) NOT NULL
        CHECK (subtotal >= 0)
);


CREATE INDEX IF NOT EXISTS idx_order_items_order
ON order_items(order_id);


CREATE INDEX IF NOT EXISTS idx_order_items_product
ON order_items(product_id);


-- =========================================================
-- PAGAMENTOS
-- =========================================================

CREATE TABLE IF NOT EXISTS payments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    order_id BIGINT NOT NULL
        REFERENCES orders(id)
        ON DELETE CASCADE,

    -- mercado_pago, cash etc.
    provider VARCHAR(50) NOT NULL DEFAULT 'mercado_pago',

    -- ID retornado pelo Mercado Pago
    external_payment_id VARCHAR(100),

    -- pix, credit_card, debit_card, cash
    payment_method VARCHAR(30),

    -- pending, approved, rejected...
    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    amount NUMERIC(10,2) NOT NULL
        CHECK (amount >= 0),

    approved_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_payments_order
ON payments(order_id);


CREATE INDEX IF NOT EXISTS idx_payments_external_payment
ON payments(external_payment_id);


CREATE INDEX IF NOT EXISTS idx_payments_status
ON payments(status);


-- Impede o mesmo pagamento do Mercado Pago
-- de ser cadastrado duas vezes.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_external_unique
ON payments(provider, external_payment_id)
WHERE external_payment_id IS NOT NULL;


-- =========================================================
-- ADMINISTRADORES
-- =========================================================

CREATE TABLE IF NOT EXISTS admins (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(150) NOT NULL,
    email VARCHAR(200) NOT NULL,

    -- Será armazenado com bcrypt.
    password_hash TEXT NOT NULL,

    role VARCHAR(30) NOT NULL DEFAULT 'admin',

    active BOOLEAN NOT NULL DEFAULT TRUE,

    last_login_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_email_unique
ON admins (LOWER(email));


-- =========================================================
-- CONFIGURAÇÕES DA LOJA
-- =========================================================

CREATE TABLE IF NOT EXISTS store_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1
        CHECK (id = 1),

    store_open BOOLEAN NOT NULL DEFAULT TRUE,

    delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (delivery_fee >= 0),

    pix_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    credit_card_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    debit_card_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    cash_enabled BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Cria a configuração inicial da loja
INSERT INTO store_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;


-- =========================================================
-- ATUALIZAÇÃO AUTOMÁTICA DO updated_at
-- =========================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- CLIENTES
DROP TRIGGER IF EXISTS trigger_customers_updated_at
ON customers;

CREATE TRIGGER trigger_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- ENDEREÇOS
DROP TRIGGER IF EXISTS trigger_customer_addresses_updated_at
ON customer_addresses;

CREATE TRIGGER trigger_customer_addresses_updated_at
BEFORE UPDATE ON customer_addresses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- PRODUTOS
DROP TRIGGER IF EXISTS trigger_products_updated_at
ON products;

CREATE TRIGGER trigger_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- PEDIDOS
DROP TRIGGER IF EXISTS trigger_orders_updated_at
ON orders;

CREATE TRIGGER trigger_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- PAGAMENTOS
DROP TRIGGER IF EXISTS trigger_payments_updated_at
ON payments;

CREATE TRIGGER trigger_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- ADMINS
DROP TRIGGER IF EXISTS trigger_admins_updated_at
ON admins;

CREATE TRIGGER trigger_admins_updated_at
BEFORE UPDATE ON admins
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- CONFIGURAÇÕES
DROP TRIGGER IF EXISTS trigger_store_settings_updated_at
ON store_settings;

CREATE TRIGGER trigger_store_settings_updated_at
BEFORE UPDATE ON store_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();