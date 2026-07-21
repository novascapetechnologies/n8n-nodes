# n8n-nodes (Novascape)

Custom n8n community nodes for services that don't have an existing n8n integration, built to be deployed to a self-hosted n8n instance (see `vps-docker-compose.md`) instead of relying on generic HTTP Request nodes.

Forked from [n8n-nodes-starter](https://github.com/n8n-io/n8n-nodes-starter).

## Structure

Each integrated app gets its own folder name, mirrored under both `nodes/` and `credentials/`:

```
nodes/<App>/<App>.node.ts        # node implementation
nodes/<App>/<app-logo>.svg       # node icon
credentials/<App>/<App>Api.credentials.ts
```

- Register each new node/credential in the `n8n` block of `package.json` (`n8n.nodes`, `n8n.credentials`)
- `postman/` - reference Postman collections the nodes are built from (request shapes + saved example/error responses)

## Nodes

### KRA eTIMS

`nodes/KraEtims/` wraps the KRA eTIMS (Electronic Tax Invoice Management System) OSCU API, built from `postman/etims-postman-collection.json`. Covers device initialization, code/branch/notice/taxpayer lookups, customers, suppliers, users, insurances, items (incl. composition), imported items, invoices, sales, purchases, and stock.

Credential (`kraEtimsApi`) fields map to the Postman collection's variables: environment (sandbox/production), consumer key/secret (used to fetch the OAuth2 access token via `client_credentials`), Apigee app ID, TIN, branch ID, device serial number, and CMC key. The access token is fetched automatically per request (`preAuthentication`) — you never paste a token by hand.

First-time setup for a new branch/device:
1. Create the credential with environment, consumer key/secret, TIN, and branch ID.
2. Run **Device > Initialize** once to obtain the `cmcKey`.
3. Paste the returned `cmcKey` into the credential — it's required on every other request.

## Development

```bash
npm install
npm run dev     # starts n8n locally with hot reload
npm run lint     # lint
npm run build    # compile to dist/
```

## Deploying to the VPS

The `Dockerfile` builds this package and copies its compiled `dist/` into a custom extensions folder inside the official `n8nio/n8n` image; the VPS `docker-compose.yml` (`vps-docker-compose.md`) builds from this repo (`build: .`) and points `N8N_CUSTOM_EXTENSIONS` at that folder, so pushing changes here and rebuilding on the VPS (`docker compose build && docker compose up -d`) picks up new or updated nodes.

## Adding a new node

1. Scaffold `nodes/<App>/<App>.node.ts` (plus an icon svg), and `credentials/<App>/<App>Api.credentials.ts` if it needs auth.
2. Add the compiled paths to `package.json`'s `n8n.nodes` / `n8n.credentials` arrays (e.g. `dist/nodes/<App>/<App>.node.js`, `dist/credentials/<App>/<App>Api.credentials.js`).
3. `npm run build` and redeploy.
