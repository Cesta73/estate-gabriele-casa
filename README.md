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

## Primo utilizzo e inviti

1. Esegui `supabase/schema.sql` nel SQL Editor. Lo script effettua una ripartenza pulita e cancella tutti i dati di prova della webapp.
2. Apri il sito pubblicato, premi **Accedi per sincronizzare** e inserisci la tua email.
3. Apri il link ricevuto e crea la famiglia indicando il tuo nome.
4. Dalla schermata famiglia invita ogni persona indicando nome, email e ruolo.
5. La persona invitata apre il link ricevuto sul proprio smartphone e viene riconosciuta automaticamente.

Non servono codici invito. L'email identifica la persona e l'invito determina nome e ruolo.

- Il proprietario puo invitare familiari.
- I genitori possono suggerire attivita, controllare i lavori e segnare i pagamenti.
- Il figlio puo vedere e registrare le missioni, ma non puo usare i controlli da adulto.

I genitori possono aggiungere lavori alla bacheca **Missioni per oggi**, scegliendo giorno e messaggio. Gabriele puo aprire la missione suggerita e registrarla come svolta.

Lo script attuale cancella i dati della webapp per semplificare la migrazione dal precedente sistema a codici.

## Funzioni

- attivita ricostruite dal PDF originale;
- registrazione di data, quantita/ore e note;
- controlli attribuiti al genitore che li esegue;
- pagamenti settimanali;
- diario filtrabile ed esportabile in CSV;
- attivita personalizzate;
- aggiornamenti condivisi in tempo reale.
- ruoli distinti per proprietario, genitori e figlio;
- bacheca giornaliera dei lavori suggeriti.
