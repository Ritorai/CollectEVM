# Custom Domain Setup: link.wassieverse.io

## Overview
This document outlines the steps to configure `link.wassieverse.io` to point to the Railway deployment.

## Steps

### 1. Railway Configuration

1. Go to [Railway Dashboard](https://railway.app)
2. Select your **CollectEVM** project
3. Click on your service
4. Go to **Settings** → **Networking**
5. Under **Custom Domains**, click **+ Add Custom Domain**
6. Enter: `link.wassieverse.io`
7. Railway will provide a CNAME value (save this!)

### 2. DNS Configuration

Add a CNAME record in your DNS provider (where `wassieverse.io` is managed):

```
Type: CNAME
Name: link
Value: [Railway-provided CNAME value]
TTL: 3600 (or default)
```

**Common DNS Providers:**
- **Cloudflare**: DNS → Records → Add record → Type: CNAME, Name: `link`, Target: [Railway value]
- **GoDaddy**: DNS Management → Add → Type: CNAME, Host: `link`, Points to: [Railway value]
- **Namecheap**: Advanced DNS → Add New Record → Type: CNAME, Host: `link`, Value: [Railway value]

### 3. Verification

After DNS propagation (5-30 minutes, up to 48 hours):
- Visit `https://link.wassieverse.io`
- Railway will automatically provision SSL certificate
- Both `link.wassieverse.io` and `collectevm-production.up.railway.app` will work

### 4. Troubleshooting

**DNS not propagating?**
- Check DNS with: `nslookup link.wassieverse.io` or https://dnschecker.org
- Verify CNAME record is correct
- Wait up to 48 hours for full propagation

**SSL certificate issues?**
- Railway provisions SSL automatically after DNS is live
- Can take 5-10 minutes after DNS propagation
- Check Railway dashboard for SSL status

**Need to update domain?**
- Remove old domain in Railway Settings → Networking
- Add new domain and update DNS accordingly

## Current Status

- Railway App: https://collectevm-production.up.railway.app/
- Target Domain: link.wassieverse.io
- SSL: Automatic (handled by Railway)

