# tailscale-node-remover

A script to remove orphaned nodes from your Tailscale tailnet.

## Features

- Specify a timeout in seconds after a node was last seen
- Filter nodes by tags (inclusion)
- Exclude specific tags from deletion
- Dry-run mode to preview deletions without actually removing nodes
- Specify your tailnet, if you have multiple in one account
- Set a different API url
- Get the removed nodes as a github action output with detailed information

The [public Tailscale API](https://tailscale.com/api#tag/devices/GET/tailnet/{tailnet}/devices) does not tell you whether or not a node is connected.
So we have to make a guess bases on when a node was last seen.

But how can it be that we can see if a node is connected or not in the admin console and in the apps?
Well, the guys from Tailscale use a different admin API, which includes a field `connectedToControl`.

- public: `https://api.tailscale.com/api/v2/tailnet/example.com/devices`
- admin: `https://login.tailscale.com/admin/api/machines`

I have not *yet* looked into how to authenticate against the admin API.

## Usage

Create a [Tailscale API access token](https://login.tailscale.com/admin/settings/keys).

### Docker

``` shell
export TS_API_TOKEN="tskey-api-xyz"
docker run --rm -e TS_TAGS="tag:k8s, tag:k8s-operator" -e TS_TIMEOUT=3600 -e TS_API_TOKEN ghcr.io/simonhaas/tailscale-node-remover:main

# With exclusion tags (e.g., exclude production nodes)
docker run --rm \
  -e TS_TAGS="tag:k8s, tag:k8s-operator" \
  -e TS_EXCLUDE_TAGS="tag:prod, tag:production" \
  -e TS_TIMEOUT=3600 \
  -e TS_API_TOKEN \
  ghcr.io/simonhaas/tailscale-node-remover:main

# Dry-run mode to preview deletions
docker run --rm \
  -e TS_TAGS="tag:k8s, tag:k8s-operator" \
  -e TS_DRY_RUN=true \
  -e TS_TIMEOUT=3600 \
  -e TS_API_TOKEN \
  ghcr.io/simonhaas/tailscale-node-remover:main
```

### Github Actions

Add the API token to your repository's "Actions secrets and variables" as ``TS_API_TOKEN``

``` yaml
# File: .github/workflows/tailnet-cleanup.yaml

name: Cleanup your tailnet

on:
  workflow_dispatch:

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Cleanup Tailnet
        uses: simonhaas/tailscale-node-remover@main
        id: cleanup
        with:
          ts_api_token: ${{ secrets.TS_API_TOKEN }}       # required
          ts_tags: 'tag:k8s, tag:k8s-operator'            # default
          ts_exclude_tags: 'tag:prod, tag:production'     # optional - exclude these tags
          ts_timeout: 3600 # one hour                     # default
          ts_tailnet: '-' # your default tailnet          # default
          ts_api_url: 'https://api.tailscale.com/api/v2/' # default
          ts_dry_run: 'false' # preview without deleting  # default
      - name: Get the removed nodes
        run: echo '${{ steps.cleanup.outputs.removed_nodes }}' | jq -r '.[] | "\(.name) (\(.id))"'
        # Output format: JSON array of objects with 'id' and 'name' fields
        # Alternative without jq: run: echo "Removed nodes:" && echo '${{ steps.cleanup.outputs.removed_nodes }}'
```

The `removed_nodes` output contains a JSON array of deleted devices with `id` and `name` fields. You can use this output in subsequent steps to trigger notifications, create issues, etc.

You can trigger the workflow in github via the UI or from anywhere via the CLI:

``` shell
gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  /repos/$GITHUB_USER/$RepositoryName/actions/workflows/tailnet-cleanup.yaml/dispatches \
   -f "ref=main"

curl -L \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GH_PAT_TRIGGER_WORKFLOW_DISPATCH" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/$GITHUB_USER/$RepositoryName/actions/workflows/tailnet-cleanup.yaml/dispatches \
  -d '{"ref":"main"}'
```

<!--
``` shell
gh workflow run tailnet-cleanup.yaml # TODO could not create workflow dispatch event: HTTP 403: Resource not accessible by integration
```
-->

### Locally using nodejs

``` shell
git clone https://github.com/SimonHaas/tailscale-node-remover.git
cd tailscale-node-remover/src
npm install
node --env-file .env index.js
```

<!--
### Remotely using nodejs

``` shell
npx run-url https://raw.githubusercontent.com/SimonHaas/tailscale-node-remover/refs/heads/main/src/index.js # TODO env variables
```
-->

## Inspiration

I use github codespaces with minikube and the tailscale operator inside to work on applications and access them through my tailnet.
When I am done working on a feature I simply delete the codespace with the whole cluster inside.
Leaving me with orphaned nodes in tailscale which I have to remove manually.

So I wanted an automation to remove nodes with tag 'tag:k8s' or 'tag:k8s-operator' and which were last seen more than one hour ago.

Hopefully my Github Action becomes obsolete soon: [FR: Support K8s Operator creating ephemeral auth keys](https://github.com/tailscale/tailscale/issues/10166)

## Development

``` shell
minikube start

helm upgrade \
  --install \
  tailscale-operator \
  tailscale-operator \
  --repo https://pkgs.tailscale.com/helmcharts \
  --namespace=tailscale \
  --create-namespace \
  --set-string oauth.clientId=$TS_OAAUTH_CLIENT_ID \
  --set-string oauth.clientSecret=$TS_OAAUTH_CLIENT_SECRET \
  --wait
watch kubectl -n tailscale get all
kubectl delete ns tailscale

node --env-file src/.env src/index.js
docker build . -t tailscale-node-remover
docker run -e TS_TAGS="tag:k8s, tag:k8s-operator" -e TS_TIMEOUT=60 -e TS_API_TOKEN=tskey-api-xyz tailscale-node-remover
```
