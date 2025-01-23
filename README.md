# tailscale-node-remover

If device with tag 'tag:k8s' or 'tag:k8s-operator' was last seen more than one hour ago, remove it.

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

node --env-file .env src/index.js
```
