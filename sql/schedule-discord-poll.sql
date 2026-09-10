-- Run this in Supabase's SQL Editor, AFTER deploying the discord-poll
-- Edge Function (see supabase/functions/discord-poll and the README).
-- This is what makes Discord polling actually run on its own, every 5
-- minutes, without any external scheduler.

create extension if not exists pg_net;
-- pg_cron is already enabled by default on every Supabase project.

-- Store your project URL and anon key once, so the scheduled job
-- doesn't have them hardcoded in plain SQL.
select vault.create_secret('https://YOUR-PROJECT-REF.supabase.co', 'project_url');
select vault.create_secret('YOUR_ANON_PUBLIC_KEY', 'anon_key');

select
  cron.schedule(
    'discord-poll-every-5-minutes',
    '*/5 * * * *',
    $$
    select
      net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/discord-poll',
          headers := jsonb_build_object(
            'Content-type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key')
          ),
          body := '{}'::jsonb
      ) as request_id;
    $$
  );

-- To check it's running: select * from cron.job_run_details order by start_time desc limit 10;
-- To stop it: select cron.unschedule('discord-poll-every-5-minutes');
