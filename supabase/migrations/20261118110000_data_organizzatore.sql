-- Correzione (trovata il 15/11 col collaudo della disponibilità): il trigger che blocca la data e ricalcola
-- i mini giochi girava coi permessi di chi modifica il gruppo, che non può chiamare private.oggi_roma().
-- Risultato: l'organizzatore non riusciva a salvare o cambiare la data da Organizza ("permission denied").
-- Ora gira coi permessi del proprietario (come le altre funzioni dei giochi); le regole restano identiche.
alter function private.groups_data_e_giochi() security definer;
