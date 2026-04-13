-- Track unreturned bottles per customer
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS unreturned_bottles integer DEFAULT 0;

-- Reset incorrect deposit_balance values (as requested)
UPDATE wallet SET deposit_balance = 0 WHERE deposit_balance > 0;
