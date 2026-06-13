# Estate di Gabriele

Webapp familiare per gestire attivita estive, controlli e pagamenti. Funziona offline sul singolo dispositivo e puo sincronizzare i dati tra piu familiari tramite Supabase.

## Pubblicazione su GitHub Pages

1. Crea un nuovo repository GitHub, per esempio `estate-gabriele`.
2. Carica tutti i file di questa cartella nel repository e usa il branch `main`.
3. Su GitHub apri **Settings > Pages** e scegli **GitHub Actions** come sorgente.
4. Al primo caricamento, il flusso `Pubblica su GitHub Pages` pubblichera automaticamente il sito.

L'indirizzo sara simile a `https://TUO-UTENTE.github.io/estate-gabriele/`.

## Sincronizzazione familiare

Supabase offre database, accesso email e piano gratuito sufficiente per questa app.

1. Crea un progetto su [Supabase](https://supabase.com/).
2. Apri **SQL Editor**, incolla tutto il contenuto di `supabase/schema.sql` ed eseguilo.
3. In **Authentication > URL Configuration**:
   - imposta **Site URL** con l'indirizzo GitHub Pages;
   - aggiungi lo stesso indirizzo tra i **Redirect URLs**.
4. In **Project Settings > API** copia:
   - Project URL;
   - chiave pubblica `anon` / `publishable`.
5. Inserisci questi due valori in `config.js` e carica la modifica su GitHub.

Le chiavi presenti in `config.js` sono pubbliche per progetto. La protezione dei dati e affidata alle regole RLS installate tramite `schema.sql`. Non inserire mai la chiave `service_role`.

## Primo utilizzo

1. Apri il sito pubblicato e premi l'indicatore di sincronizzazione in alto.
2. Accedi con la tua email tramite il link ricevuto.
3. Crea la famiglia scegliendo un codice invito di almeno 8 caratteri.
4. Tua moglie apre il sito, accede con la propria email e sceglie **Entra in famiglia** usando lo stesso codice.

Ogni controllo registra il nome della persona che lo ha eseguito. Le modifiche vengono salvate sul dispositivo e sincronizzate automaticamente.

## Funzioni

- attivita ricostruite dal PDF originale;
- registrazione di data, quantita/ore e note;
- controlli attribuiti al genitore che li esegue;
- pagamenti settimanali;
- diario filtrabile ed esportabile in CSV;
- attivita personalizzate;
- aggiornamenti condivisi in tempo reale.
