terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = "~> 1.14"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

provider "kubernetes" {
  host                   = "https://${module.gke.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(module.gke.ca_certificate)
}

provider "helm" {
  kubernetes {
    host                   = "https://${module.gke.endpoint}"
    token                  = data.google_client_config.default.access_token
    cluster_ca_certificate = base64decode(module.gke.ca_certificate)
  }
}

data "google_client_config" "default" {}

resource "google_service_account" "kratos_sa" {
  account_id   = "kratos-service-account"
  display_name = "KRATOS Service Account"
}

module "gke" {
  source = "./modules/gke"

  project_id       = var.gcp_project_id
  region           = var.gcp_region
  cluster_name     = var.cluster_name
  network          = module.networking.network_name
  subnetwork       = module.networking.subnetwork_name
  service_account  = google_service_account.kratos_sa.email

  node_pools = [
    {
      name           = "kratos-core-pool"
      machine_type   = "e2-standard-4"
      min_count      = 3
      max_count      = 12
      disk_size_gb   = 100
      disk_type      = "pd-ssd"
      preemptible    = false
    },
    {
      name           = "kratos-worker-pool"
      machine_type   = "e2-standard-2"
      min_count      = 2
      max_count      = 20
      disk_size_gb   = 50
      disk_type      = "pd-standard"
      preemptible    = true
    },
  ]
}

module "networking" {
  source = "./modules/networking"

  project_id = var.gcp_project_id
  region     = var.gcp_region
  vpc_name   = "kratos-vpc"
}

resource "helm_release" "nginx_ingress" {
  name       = "nginx-ingress"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  namespace  = "ingress-nginx"

  create_namespace = true

  set {
    name  = "controller.service.type"
    value = "LoadBalancer"
  }
}

resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  namespace  = "cert-manager"
  version    = "v1.14"

  create_namespace = true

  set {
    name  = "installCRDs"
    value = "true"
  }
}

resource "helm_release" "prometheus" {
  name       = "prometheus"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = "monitoring"

  create_namespace = true

  set {
    name  = "prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues"
    value = "false"
  }
}

resource "helm_release" "kratos" {
  name      = "kratos"
  chart     = "../k8s/helm"
  namespace = "kratos"

  create_namespace = true

  values = [
    file("../k8s/helm/values-production.yaml")
  ]

  depends_on = [
    module.gke,
    helm_release.nginx_ingress,
    helm_release.cert_manager,
    helm_release.prometheus,
  ]
}

resource "helm_release" "redis_operator" {
  name       = "redis-operator"
  repository = "https://ot-container-kit.github.io/helm-charts"
  chart      = "redis-operator"
  namespace  = "redis-operator"

  create_namespace = true
}

resource "kubectl_manifest" "kratos_secrets" {
  depends_on = [module.gke]
  yaml_body  = <<YAML
apiVersion: v1
kind: Secret
metadata:
  name: kratos-database
  namespace: kratos
type: Opaque
stringData:
  password: "${var.db_password}"
  username: "kratos"
---
apiVersion: v1
kind: Secret
metadata:
  name: kratos-jwt
  namespace: kratos
type: Opaque
stringData:
  secret: "${var.jwt_secret}"
---
apiVersion: v1
kind: Secret
metadata:
  name: kratos-api-keys
  namespace: kratos
type: Opaque
stringData:
  openai-api-key: "${var.openai_api_key}"
  anthropic-api-key: "${var.anthropic_api_key}"
  openrouter-api-key: "${var.openrouter_api_key}"
YAML
}
