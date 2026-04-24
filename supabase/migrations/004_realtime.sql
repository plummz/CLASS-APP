-- Migration 004: Enable Supabase Realtime on all application tables

do $$ begin alter publication supabase_realtime add table public.profiles;           exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.shared_ai_outputs;  exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.shared_announcements; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.app_updates;        exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.code_lab_completions; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.app_open_counts;    exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.files;              exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.message_reactions;  exception when duplicate_object then null; end $$;
