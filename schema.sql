CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    categories VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE finances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category TEXT,
    price INT,
    detail TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE logs (
    internal BOOLEAN DEFAULT true,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    location TEXT,
    activity ENUM('Modification', 'Removal', 'Creation'),
    detail TEXT
);

CREATE TABLE alsoValues (
    id INT DEFAULT 1,
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_activities INT DEFAULT 0,
    total_money INT DEFAULT 0,
    total_collab INT DEFAULT 0,
    total_gateway INT DEFAULT 0,
    total_item_delivered INT DEFAULT 0,
    total_item_available INT DEFAULT 0,
    total_item_pending INT DEFAULT 0,
    total_category INT DEFAULT 0
);

CREATE TABLE losses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category TEXT,
    name TEXT,
    price INT,
    memo TEXT,
    quantity INT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- BANKING MODULE
-- ======================

CREATE TABLE bank_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('Checking', 'Savings', 'Credit', 'Cash', 'Other') DEFAULT 'Other',
    balance DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bank_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL,
    related_account_id INT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    type ENUM('Deposit', 'Withdrawal', 'Transfer', 'Payment') NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (related_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
);
