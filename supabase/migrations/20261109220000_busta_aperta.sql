-- Ricorda se una persona ha già aperto la sua busta, così la pagina del gruppo
-- può mostrarle un promemoria con il nome invece di "Apri la busta".
alter table public.group_members add column envelope_opened_at timestamptz;

-- Ognuno può segnare solo la propria riga (la regola "ognuno cambia il proprio avatar"
-- limita già gli aggiornamenti alla riga con il proprio user_id).
grant update (envelope_opened_at) on public.group_members to authenticated;
