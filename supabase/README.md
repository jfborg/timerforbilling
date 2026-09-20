# Supabase

This folder holds the Supabase CLI config, SQL migrations, and Edge Functions for the app,
per the standing rule that all schema changes are migrations committed to the repo.

No live Supabase project is linked yet. Creating one needs the owner's Supabase account and a
choice of EU region (standing rules, section 4), which is outside what this session can do.
Once the owner has a project:

```sh
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

`migrations/` is empty until Phase 1, which adds the locked-letter schema, row level security
policies, and the seal, claim, open and burn Edge Functions.

`functions/` will hold the Edge Functions themselves once Phase 1 starts.

To develop against a local Postgres instance instead (Docker required):

```sh
npx supabase start
```
