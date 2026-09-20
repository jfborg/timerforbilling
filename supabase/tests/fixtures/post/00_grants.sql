-- Table-level grants matching Supabase's real defaults: broad grants to anon/authenticated,
-- with row level security (from the migrations) doing the actual restricting. Run after the
-- migrations so the tables exist.

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant all on all tables in schema public to service_role;
grant usage on all sequences in schema public to authenticated, service_role;
