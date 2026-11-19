# Configurar login (Google + correo de confirmación)

## A. Botón "Continuar con Google"

1. **Google Cloud** → https://console.cloud.google.com
   - Crea un proyecto (ej. "Eventia Agenda").
   - **Google Auth Platform → Branding / Pantalla de consentimiento**: tipo *External*, nombre de la app, correo de soporte.
   - **Audience / Público**: pásala a *In production* (si se queda en *Testing* solo pueden entrar los correos que agregues como testers).
   - **Clients → Create client** → tipo **Web application**.
     - *Authorized redirect URIs*: la "Callback URL" que te muestra Supabase en el paso 2
       (se ve así: `https://TU-PROYECTO.supabase.co/auth/v1/callback`).
   - Copia el **Client ID** y el **Client secret**.

2. **Supabase → Authentication → Sign In / Providers → Google**
   - Actívalo, pega Client ID y Client secret, guarda.

3. **Supabase → Authentication → URL Configuration → Redirect URLs**, agrega:
   - `exp://**`  (para probar en Expo Go)
   - `agendaeventialashes://**`  (para la app ya compilada / Play Store)

## B. Que sí llegue el correo de confirmación

El correo que trae Supabase de fábrica solo manda a los miembros de tu equipo de Supabase
y máximo 2 por hora. Hay que poner un servidor de correo propio (SMTP).

**Opción rápida para empezar: Gmail**
1. En tu cuenta de Google activa la *Verificación en 2 pasos*.
2. Entra a https://myaccount.google.com/apppasswords y crea una contraseña de aplicación
   (16 letras). Guárdala.
3. **Supabase → Authentication → Emails → SMTP Settings** → *Enable custom SMTP*:
   - Sender email: tu Gmail
   - Sender name: Agenda Eventia
   - Host: `smtp.gmail.com`
   - Port: `465`
   - Username: tu Gmail
   - Password: la contraseña de aplicación (no tu contraseña normal)
4. Vuelve a prender **Confirm email** en *Sign In / Providers → Email*.
5. (Opcional) **Authentication → Emails → Templates → Confirm signup**: traduce el texto a español.

**Para cuando publiques:** compra un dominio (ej. agendaeventia.com) y usa Resend o Brevo
con ese dominio; los correos llegan mejor y no salen de tu Gmail personal.
