terraform {
  required_version = ">= 1.5"
}

variable "project_id" { type = string }
variable "region" { type = string }
variable "cluster_name" { type = string }
variable "network" { type = string }
variable "subnetwork" { type = string }
variable "service_account" { type = string }

variable "node_pools" {
  type = list(object({
    name           = string
    machine_type   = string
    min_count      = number
    max_count      = number
    disk_size_gb   = number
    disk_type      = string
    preemptible    = bool
  }))
}

resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.region

  network    = var.network
  subnetwork = var.subnetwork

  initial_node_count = 1

  remove_default_node_pool = true
  deletion_protection      = false

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS", "APISERVER", "SCHEDULER", "CONTROLLER_MANAGER"]
  }

  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }
}

resource "google_container_node_pool" "pools" {
  for_each = { for idx, pool in var.node_pools : pool.name => pool }

  name     = each.key
  cluster  = google_container_cluster.primary.name
  location = var.region

  node_count = each.value.min_count

  node_config {
    machine_type    = each.value.machine_type
    disk_size_gb    = each.value.disk_size_gb
    disk_type       = each.value.disk_type
    preemptible     = each.value.preemptible
    service_account = var.service_account

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]

    labels = {
      pool = each.key
    }
  }

  autoscaling {
    min_node_count = each.value.min_count
    max_node_count = each.value.max_count
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}

output "endpoint" {
  value = google_container_cluster.primary.endpoint
}

output "ca_certificate" {
  value     = google_container_cluster.primary.master_auth[0].cluster_ca_certificate
  sensitive = true
}
