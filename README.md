# tailscale-node-remover

If device with tag 'tag:k8s' or 'tag:k8s-operator' was last seen more then one hour ago, remove it.

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
```
