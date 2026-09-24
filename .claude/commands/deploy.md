Deploy the current working tree to production (https://quartertone.grimoire.supply).

The site is static files served directly by the `swag` nginx container on root@grimoire.supply. There is no app container — `/root/mealie/config/www/quartertone` on the host is `/config/www/quartertone` inside swag, and `config/nginx/proxy-confs/quartertone.subdomain.conf` points `quartertone.*` at it.

1. Build locally (this also type-checks):
```
npm run build
```
If it fails, show the error and stop.

2. Upload with a staged swap so the live directory is never half-written. The local machine has no rsync, so stream a tarball:
```
tar -C dist -czf - . | ssh root@grimoire.supply 'd=/root/mealie/config/www/quartertone; rm -rf $d.new && mkdir -p $d.new && tar -xzf - -C $d.new && chown -R 1000:1000 $d.new && rm -rf $d && mv $d.new $d'
```

No nginx reload is needed — it's static files.

3. Verify the live page references the asset hashes just built:
```
curl -s https://quartertone.grimoire.supply/ | grep -o 'assets/[^"]*'
ls dist/assets
```

Report the deployed commit (`git rev-parse --short HEAD`, and note if the tree was dirty) and whether the hashes matched.

SSH needs the key in the agent. If `Permission denied (publickey)`, ask the user to run `ssh-add` in their own terminal — it can't prompt for a passphrase through `!`.
