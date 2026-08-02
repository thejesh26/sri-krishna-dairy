-- Adds an opt-in p_allow_negative parameter to deduct_wallet, defaulting to false so every
-- existing caller (trial order COD deduction, addon order deduction) keeps blocking on
-- insufficient balance exactly as before. Only the subscription delivery-confirm path
-- passes true: the milk has already been physically delivered by the time this runs, so
-- blocking the charge doesn't undo the delivery — it just leaves the charge unrecorded
-- (a real incident: subscription 41's 2026-08-02 delivery was marked delivered with zero
-- wallet transaction and no failure record at all). Instead the wallet is allowed to go
-- negative, and the caller deactivates the subscription once it does.
--
-- create or replace with a different parameter list creates a new overload rather than
-- replacing the function, so the old 3-arg version is dropped first to leave a single
-- definition (no risk of the two bodies drifting apart).
drop function if exists deduct_wallet(uuid, numeric, text);

create or replace function deduct_wallet(
  p_user_id        uuid,
  p_amount         numeric,
  p_description    text,
  p_allow_negative boolean default false
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

  if v_balance < p_amount and not p_allow_negative then
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

revoke execute on function deduct_wallet(uuid, numeric, text, boolean) from public, anon, authenticated;
grant execute on function deduct_wallet(uuid, numeric, text, boolean) to service_role;
