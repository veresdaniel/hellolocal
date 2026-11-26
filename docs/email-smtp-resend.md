# Outbound email (Resend SMTP)

Demo és önkormányzati ajánlatkérések a `QuoteRequest` táblába mentődnek; email csak akkor megy ki, ha SMTP be van állítva **és** az Admin → Platform settings → „Ajánlatkérések email címe” ki van töltve.

## Ingyenes szolgáltató: Resend

- Free: 100 levél/nap, 3000/hó — demó lead-ekhez elég.
- SMTP: `smtp.resend.com`, user `resend`, jelszó = API key.
- Port: `465` (TLS) vagy `587` (STARTTLS).

### Beállítás

1. [resend.com](https://resend.com) fiók + API key.
2. Domain verify (`hellolocal.hu` vagy `hello-local.io`) — SPF/DKIM a Resend UI szerint.
3. Szerveren (`/opt/hellolocal/stack.env` vagy a compose által olvasott env):

```bash
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxx
EMAIL_FROM=HelloLocal <noreply@hellolocal.hu>
```

4. `api-prod` recreate / redeploy (a compose már átadja ezeket a változókat).
5. Adminban állítsd be a címzettet (`quoteRequestRecipient`).

Amíg a domain nincs verifikálva, a Resend csak a saját fiók emailjére enged tesztet.

A kód a `EMAIL_FROM` env-et olvassa (nem `SMTP_FROM`).
