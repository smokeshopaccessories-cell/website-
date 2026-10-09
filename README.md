# Smoke Shop Accessories – website

Retail and wholesale shop (Next.js + Supabase). Admin is at `/admin`.

## Publish it (about 10 minutes)

1. **GitHub:** open https://github.com/smokeshopaccessories-cell/smokeshop, click **Add file > Upload files**,
   drag in everything from this folder (the files and folders themselves, not the zip), then **Commit changes**.
   Make sure `package.json` is at the top level of the repository.
2. **Vercel:** go to vercel.com, sign in with GitHub, click **Add New > Project**, choose the `smokeshop` repository,
   leave the settings as they are, and click **Deploy**. When it finishes you get a web address like `smokeshop-xxxx.vercel.app`.
3. **Supabase settings** (supabase.com > your project `smoke-shop-portal`):
   - **Authentication > URL Configuration:** set **Site URL** to your Vercel address, and add it to **Redirect URLs**.
   - **Authentication > Sign In / Providers > Email:** for the easiest start, turn **off** "Confirm email".
     (Leave it on later if you want customers to verify their email, but then wholesale applicants must confirm before they can upload documents.)
4. Open your site, log in with the admin email, and you will see an **Admin** button.

The two Supabase values in `lib/supabase.js` are public by design. You do not need to add environment variables.

## Domain name
Vercel > your project > **Settings > Domains** lets you search for and buy a domain (roughly $10-20 a year) and connects it automatically.

## What is included
Shop with category menus and brand dropdowns, retail and wholesale signup with 21+ check, order requests (no online payment),
saved wholesale prices, price requests, deals, customer messages, and an admin area for inventory (photos by drag and drop,
paste link, or bulk by UPC), wholesale approvals, orders with UPS totals, deals, customers, and shipping settings.

## Not included yet
Draft and publish for product edits (edits save immediately), emails to customers, a best-seller ranking from real sales,
and the "save a copy" option for pasted image links.
