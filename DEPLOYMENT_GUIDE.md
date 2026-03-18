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
