-- Atomic wallet deduction with row-level locking.
-- Prevents double-deduction race conditions when two delivery confirmations
-- fire simultaneously for the same user.
--
-- Usage (from app code):
--   await supabaseAdmin.rpc('deduct_wallet', {
--     p_user_id: userId,
--     p_amount: dailyAmount,
--     p_description: description,
--   })
--
-- Returns the new balance, or raises an exception on insufficient funds
-- or if the description key has already been recorded (idempotency).

create or replace function deduct_wallet(
  p_user_id     uuid,
  p_amount      numeric,
  p_description text
)
returns numeric
language plpgsql
security definer
as $$
declare
  v_balance numeric;
  v_new_balance numeric;
begin
  -- Idempotency: if this description was already recorded, return current balance
  if exists (
    select 1 from wallet_transactions
    where user_id = p_user_id and description = p_description
  ) then
    select balance into v_balance from wallet where user_id = p_user_id;
    return coalesce(v_balance, 0);
  end if;

  -- Lock the wallet row for this user to prevent concurrent updates
  select balance into v_balance
  from wallet
  where user_id = p_user_id
  for update;

  if v_balance is null then
    raise exception 'Wallet not found for user %', p_user_id;
  end if;

  if v_balance < p_amount then
    raise exception 'Insufficient balance: have %, need %', v_balance, p_amount;
  end if;

  v_new_balance := v_balance - p_amount;

  update wallet
  set balance = v_new_balance
  where user_id = p_user_id;

  insert into wallet_transactions (user_id, amount, type, description)
  values (p_user_id, p_amount, 'debit', p_description);

  return v_new_balance;
end;
$$;

-- Only the service role may call this function
revoke execute on function deduct_wallet from public, anon, authenticated;
grant execute on function deduct_wallet to service_role;
