# Deployment and Domain Setup

<!-- slide -->
## Step 1: Push to GitHub
If your code isn't on GitHub yet:
1. Create a new repository on [GitHub](https://github.com/new).
2. Follow the instructions to push your local code:
   ```bash
   git remote add origin https://github.com/yourusername/ssc-cgl-platform.git
   git branch -M main
   git push -u origin main
   ```

<!-- slide -->
## Step 2: Deploy to Vercel
1. Go to [Vercel](https://vercel.com/new) and sign in with GitHub.
2. Import your `ssc-cgl-platform` repository.
3. **Configure Environment Variables**:
   Vercel will ask for environment variables. Add all keys from your `.env.local`:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
   - `NEXT_PUBLIC_ADMIN_EMAIL`
4. Click **Deploy**.

<!-- slide -->
## Step 3: Add Custom Domain
1. In your Vercel Project Dashboard, go to **Settings > Domains**.
2. Enter your domain (e.g., `example.com`) and click **Add**.
3. Vercel will provide **DNS records** (A record or CNAME).
4. Go to your domain registrar (e.g., GoDaddy, Namecheap) and add those DNS records.
5. Wait for SSL and DNS propagation (usually a few minutes).

<!-- slide -->
## Step 4: Authorize Domain in Firebase (CRITICAL)
If you do not add your custom domain to Firebase Auth, login will fail with an `auth/unauthorized-domain` error on the production site.
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project (**sarkaristaar-365cd**).
3. In the left sidebar, click **Authentication**, then go to the **Settings** tab.
4. Click on **Authorized domains**.
5. Click **Add domain** and enter your custom domain exactly as it appears in the Vercel URL (e.g., `yourdomain.com` without `https://`).
6. Click **Add**.

*Note for Google Sign-In:* If you manually set up an OAuth client ID, ensure you also add your new domain to the **Authorized JavaScript origins** and **Authorized redirect URIs** in the [Google Cloud Console Credentials page](https://console.cloud.google.com/apis/credentials).
