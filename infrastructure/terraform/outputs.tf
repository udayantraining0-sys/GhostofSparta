output "cluster_endpoint" {
  value = module.gke.endpoint
}

output "cluster_ca_certificate" {
  value     = module.gke.ca_certificate
  sensitive = true
}

output "ingress_ip" {
  value = "kubectl get svc -n ingress-nginx nginx-ingress-ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}'"
}

output "grafana_url" {
  value = "http://kratos-grafana.monitoring:3000"
}

output "jaeger_url" {
  value = "http://kratos-jaeger.observability:16686"
}
