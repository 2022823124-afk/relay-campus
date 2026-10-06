-- Projects created with automatic table exposure disabled need explicit grants.
-- The browser must not access personal account states or private evidence directly.
revoke all on public.items, public.item_images, public.transactions,
  public.price_records, public.account_states from anon, authenticated;
grant select, insert, update, delete on public.items, public.item_images,
  public.transactions, public.price_records, public.account_states to service_role;
