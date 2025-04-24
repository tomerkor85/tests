# RadixInsight: Infrastructure Setup on GCP

This document outlines the infrastructure setup for the RadixInsight platform on Google Cloud Platform (GCP), designed for a small team of 2-3 developers and 1 DevOps engineer.

## 1. Environment Architecture

### 1.1 Environment Tiers

RadixInsight will be deployed across three distinct environment tiers:

1. **Development Environment**
   - Purpose: Feature development and initial testing
   - Access: Development team only
   - Data: Synthetic test data only
   - Scale: Minimal resources, cost-optimized

2. **Staging Environment**
   - Purpose: Integration testing, UAT, pre-production validation
   - Access: Development team and selected stakeholders
   - Data: Anonymized subset of production data
   - Scale: Medium resources, similar to production but scaled down

3. **Production Environment**
   - Purpose: Live system for organizational use
   - Access: Restricted to operations team for management
   - Data: Real organizational data with full security controls
   - Scale: Full resources based on organizational needs

### 1.2 Multi-Project Structure

GCP resources will be organized using the following project structure:

```
RadixInsight-Organization
├── RadixInsight-Dev
│   ├── VPC Network (dev-network)
│   ├── GKE Cluster (dev-cluster)
│   ├── Cloud SQL (dev-postgres)
│   ├── ClickHouse Cluster (dev-clickhouse)
│   └── Cloud Storage (dev-storage)
├── RadixInsight-Staging
│   ├── VPC Network (staging-network)
│   ├── GKE Cluster (staging-cluster)
│   ├── Cloud SQL (staging-postgres)
│   ├── ClickHouse Cluster (staging-clickhouse)
│   └── Cloud Storage (staging-storage)
├── RadixInsight-Prod
│   ├── VPC Network (prod-network)
│   ├── GKE Cluster (prod-cluster)
│   ├── Cloud SQL (prod-postgres)
│   ├── ClickHouse Cluster (prod-clickhouse)
│   └── Cloud Storage (prod-storage)
└── RadixInsight-Common
    ├── Artifact Registry
    ├── Cloud Build
    ├── Monitoring & Logging
    ├── Shared Storage
    └── IAM & Security
```

## 2. Core Infrastructure Components

### 2.1 Compute Resources (GKE)

Google Kubernetes Engine will be used for container orchestration:

#### Development Cluster
```terraform
resource "google_container_cluster" "dev_cluster" {
  name     = "radixinsight-dev-cluster"
  location = "us-central1"
  
  # Use regional cluster with 1 node per zone for dev
  node_locations = ["us-central1-a"]
  
  # Remove default node pool and create custom one
  remove_default_node_pool = true
  initial_node_count       = 1
  
  # Network configuration
  network    = google_compute_network.dev_network.self_link
  subnetwork = google_compute_subnetwork.dev_subnet.self_link
  
  # Private cluster configuration
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }
}

resource "google_container_node_pool" "dev_nodes" {
  name       = "radixinsight-dev-node-pool"
  cluster    = google_container_cluster.dev_cluster.name
  location   = "us-central1"
  node_count = 1
  
  node_config {
    machine_type = "e2-standard-4"  # 4 vCPUs, 16GB memory
    disk_size_gb = 100
    
    # Use spot instances for dev to reduce costs
    spot = true
    
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
  
  # Enable autoscaling for cost optimization
  autoscaling {
    min_node_count = 1
    max_node_count = 3
  }
}
```

#### Production Cluster
```terraform
resource "google_container_cluster" "prod_cluster" {
  name     = "radixinsight-prod-cluster"
  location = "us-central1"
  
  # Use regional cluster with nodes in multiple zones for high availability
  node_locations = ["us-central1-a", "us-central1-b", "us-central1-c"]
  
  # Remove default node pool and create custom ones
  remove_default_node_pool = true
  initial_node_count       = 1
  
  # Network configuration
  network    = google_compute_network.prod_network.self_link
  subnetwork = google_compute_subnetwork.prod_subnet.self_link
  
  # Private cluster configuration
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = true
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }
  
  # Enable workload identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }
  
  # Enable binary authorization
  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }
}

# Application node pool
resource "google_container_node_pool" "prod_app_nodes" {
  name       = "app-node-pool"
  cluster    = google_container_cluster.prod_cluster.name
  location   = "us-central1"
  
  node_config {
    machine_type = "e2-standard-8"  # 8 vCPUs, 32GB memory
    disk_size_gb = 100
    
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
    
    # Node labels and taints for workload separation
    labels = {
      "nodepool" = "application"
    }
  }
  
  # Enable autoscaling
  autoscaling {
    min_node_count = 3
    max_node_count = 10
  }
}

# Database node pool with optimized machines
resource "google_container_node_pool" "prod_db_nodes" {
  name       = "db-node-pool"
  cluster    = google_container_cluster.prod_cluster.name
  location   = "us-central1"
  
  node_config {
    machine_type = "n2-standard-16"  # 16 vCPUs, 64GB memory
    disk_type    = "pd-ssd"
    disk_size_gb = 500
    
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
    
    # Node labels and taints for workload separation
    labels = {
      "nodepool" = "database"
    }
    
    # Ensure only database workloads run on these nodes
    taint {
      key    = "workloadType"
      value  = "database"
      effect = "NO_SCHEDULE"
    }
  }
  
  # Limited autoscaling for database nodes
  autoscaling {
    min_node_count = 3
    max_node_count = 5
  }
}
```

### 2.2 Database Resources

#### PostgreSQL (Cloud SQL)
```terraform
resource "google_sql_database_instance" "postgres" {
  name             = "radixinsight-postgres"
  database_version = "POSTGRES_14"
  region           = "us-central1"
  
  settings {
    tier = "db-custom-4-16384"  # 4 vCPUs, 16GB RAM
    
    availability_type = "REGIONAL"  # High availability
    
    backup_configuration {
      enabled            = true
      binary_log_enabled = true
      start_time         = "02:00"  # 2 AM UTC
      retention_days     = 7
    }
    
    maintenance_window {
      day          = 7  # Sunday
      hour         = 3  # 3 AM UTC
      update_track = "stable"
    }
    
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.prod_network.id
      
      authorized_networks {
        name  = "office"
        value = "203.0.113.0/24"  # Example office IP range
      }
    }
    
    database_flags {
      name  = "max_connections"
      value = "500"
    }
    
    insights_config {
      query_insights_enabled  = true
      query_string_length     = 4096
      record_application_tags = true
      record_client_address   = true
    }
  }
  
  deletion_protection = true  # Prevent accidental deletion
}

resource "google_sql_database" "radixinsight_meta" {
  name     = "radixinsight_meta"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "app_user" {
  name     = "radixinsight_app"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password  # Stored in Secret Manager
}
```

#### ClickHouse Cluster

ClickHouse will be deployed on GKE using the ClickHouse Operator:

```yaml
# clickhouse-cluster.yaml
apiVersion: clickhouse.altinity.com/v1
kind: ClickHouseInstallation
metadata:
  name: radixinsight-clickhouse
spec:
  configuration:
    clusters:
      - name: radixinsight-cluster
        layout:
          shardsCount: 3
          replicasCount: 2
    zookeeper:
      nodes:
        - host: zookeeper-0.zookeeper-headless.default.svc.cluster.local
          port: 2181
        - host: zookeeper-1.zookeeper-headless.default.svc.cluster.local
          port: 2181
        - host: zookeeper-2.zookeeper-headless.default.svc.cluster.local
          port: 2181
    settings:
      format_schema_path: /var/lib/clickhouse/format_schemas/
      # Performance settings
      max_memory_usage: 30000000000  # 30GB
      max_memory_usage_for_user: 30000000000
      max_concurrent_queries: 100
      max_connections: 100
      max_threads: 16
  templates:
    podTemplates:
      - name: clickhouse-pod
        spec:
          containers:
            - name: clickhouse
              image: clickhouse/clickhouse-server:22.3
              resources:
                requests:
                  memory: "16Gi"
                  cpu: "4"
                limits:
                  memory: "32Gi"
                  cpu: "8"
              volumeMounts:
                - name: clickhouse-data
                  mountPath: /var/lib/clickhouse
          nodeSelector:
            nodepool: database
          tolerations:
            - key: "workloadType"
              operator: "Equal"
              value: "database"
              effect: "NoSchedule"
    volumeClaimTemplates:
      - name: clickhouse-data
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 500Gi
          storageClassName: premium-rwo
```

### 2.3 Message Queue (Kafka)

Kafka will be deployed on GKE using Strimzi Operator:

```yaml
# kafka-cluster.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: radixinsight-kafka
spec:
  kafka:
    version: 3.3.1
    replicas: 3
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
      - name: tls
        port: 9093
        type: internal
        tls: true
        authentication:
          type: tls
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
      inter.broker.protocol.version: "3.3"
    storage:
      type: jbod
      volumes:
      - id: 0
        type: persistent-claim
        size: 100Gi
        deleteClaim: false
    resources:
      requests:
        memory: 4Gi
        cpu: "2"
      limits:
        memory: 8Gi
        cpu: "4"
    metricsConfig:
      type: jmxPrometheusExporter
      valueFrom:
        configMapKeyRef:
          name: kafka-metrics
          key: kafka-metrics-config.yml
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 20Gi
      deleteClaim: false
    resources:
      requests:
        memory: 1Gi
        cpu: "0.5"
      limits:
        memory: 2Gi
        cpu: "1"
  entityOperator:
    topicOperator: {}
    userOperator: {}
```

### 2.4 Storage Resources

```terraform
# Cloud Storage buckets
resource "google_storage_bucket" "event_archive" {
  name     = "radixinsight-event-archive"
  location = "US"
  
  uniform_bucket_level_access = true
  
  lifecycle_rule {
    condition {
      age = 365  # days
    }
    action {
      type = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }
  
  versioning {
    enabled = true
  }
}

resource "google_storage_bucket" "exports" {
  name     = "radixinsight-exports"
  location = "US"
  
  uniform_bucket_level_access = true
  
  lifecycle_rule {
    condition {
      age = 30  # days
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_storage_bucket" "backups" {
  name     = "radixinsight-backups"
  location = "US"
  
  uniform_bucket_level_access = true
  
  lifecycle_rule {
    condition {
      age = 90  # days
    }
    action {
      type = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }
  
  lifecycle_rule {
    condition {
      age = 365  # days
    }
    action {
      type = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }
}
```

### 2.5 Networking Setup

```terraform
# VPC Network
resource "google_compute_network" "prod_network" {
  name                    = "radixinsight-prod-network"
  auto_create_subnetworks = false
}

# Subnets
resource "google_compute_subnetwork" "prod_subnet" {
  name          = "radixinsight-prod-subnet"
  ip_cidr_range = "10.0.0.0/20"
  region        = "us-central1"
  network       = google_compute_network.prod_network.id
  
  # Enable flow logs for network monitoring
  log_config {
    aggregation_interval = "INTERVAL_5_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
  
  # Enable Private Google Access
  private_ip_google_access = true
  
  # Secondary IP ranges for GKE pods and services
  secondary_ip_range {
    range_name    = "pod-range"
    ip_cidr_range = "10.1.0.0/16"
  }
  
  secondary_ip_range {
    range_name    = "service-range"
    ip_cidr_range = "10.2.0.0/20"
  }
}

# Cloud NAT for outbound internet access
resource "google_compute_router" "router" {
  name    = "radixinsight-router"
  region  = "us-central1"
  network = google_compute_network.prod_network.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "radixinsight-nat"
  router                             = google_compute_router.router.name
  region                             = "us-central1"
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
  
  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# Internal Load Balancer for API Gateway
resource "google_compute_address" "api_gateway_ilb_ip" {
  name         = "radixinsight-api-gateway-ilb-ip"
  subnetwork   = google_compute_subnetwork.prod_subnet.id
  address_type = "INTERNAL"
  region       = "us-central1"
}

# Cloud Armor security policy
resource "google_compute_security_policy" "security_policy" {
  name = "radixinsight-security-policy"
  
  # Rate limiting rule
  rule {
    action   = "rate_based_ban"
    priority = "1000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
    }
    description = "Rate limiting rule"
  }
  
  # Block known malicious IPs
  rule {
    action   = "deny(403)"
    priority = "900"
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('threatsintelligence.iplist-known-malicious-ips')"
      }
    }
    description = "Block known malicious IPs"
  }
  
  # Default rule
  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default rule"
  }
}
```

## 3. Deployment Architecture

### 3.1 Kubernetes Resource Organization

```
RadixInsight Kubernetes Namespace Structure
├── radixinsight-system
│   ├── Ingress Controller
│   ├── Cert Manager
│   ├── Monitoring (Prometheus/Grafana)
│   └── Logging (Fluentd/Loki)
├── radixinsight-data
│   ├── ClickHouse Cluster
│   ├── Kafka Cluster
│   ├── Redis Cluster
│   └── Zookeeper Ensemble
├── radixinsight-backend
│   ├── API Gateway
│   ├── Event Ingestion Service
│   ├── Event Consumer Service
│   ├── Analytics Engine
│   └── User Management Service
└── radixinsight-frontend
    └── Dashboard UI
```

### 3.2 Kubernetes Manifests

Example deployment for the Event Ingestion Service:

```yaml
# event-ingestion-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: event-ingestion
  namespace: radixinsight-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: event-ingestion
  template:
    metadata:
      labels:
        app: event-ingestion
    spec:
      containers:
      - name: event-ingestion
        image: gcr.io/radixinsight-prod/event-ingestion:v1.0.0
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        ports:
        - containerPort: 8080
        env:
        - name: KAFKA_BOOTSTRAP_SERVERS
          value: "radixinsight-kafka-bootstrap.radixinsight-data:9092"
        - name: KAFKA_TOPIC
          value: "events"
        - name: LOG_LEVEL
          value: "INFO"
        - name: DB_CONNECTION_STRING
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: connection-string
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - event-ingestion
              topologyKey: "kubernetes.io/hostname"
---
apiVersion: v1
kind: Service
metadata:
  name: event-ingestion
  namespace: radixinsight-backend
spec:
  selector:
    app: event-ingestion
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: event-ingestion
  namespace: radixinsight-backend
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: event-ingestion
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 3.3 Ingress Configuration

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: radixinsight-ingress
  namespace: radixinsight-backend
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/rewrite-target: /$1
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "X-Frame-Options: DENY";
      more_set_headers "X-Content-Type-Options: nosniff";
      more_set_headers "X-XSS-Protection: 1; mode=block";
spec:
  tls:
  - hosts:
    - api.radixinsight.company.com
    - dashboard.radixinsight.company.com
    secretName: radixinsight-tls
  rules:
  - host: api.radixinsight.company.com
    http:
      paths:
      - path: /collect(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: event-ingestion
            port:
              number: 80
      - path: /query(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: analytics-engine
            port:
              number: 80
      - path: /users(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: user-management
            port:
              number: 80
  - host: dashboard.radixinsight.company.com
    http:
      paths:
      - path: /(.*)
        pathType: Prefix
        backend:
          service:
            name: dashboard-ui
            port:
              number: 80
```

## 4. Scaling Strategy

### 4.1 Horizontal Scaling

Components will scale horizontally based on the following metrics:

1. **API Gateway & Event Ingestion**: CPU utilization (70%), request rate
2. **Event Consumer**: Kafka consumer lag, CPU utilization
3. **Analytics Engine**: Query rate, CPU utilization, memory usage
4. **Dashboard UI**: Request rate, CPU utilization

### 4.2 Vertical Scaling

Database resources will primarily scale vertically:

1. **ClickHouse**: Increase node size based on query performance and data volume
2. **PostgreSQL**: Upgrade instance tier based on connection count and query performance

### 4.3 Data Partitioning

1. **Time-based Partitioning**: Events partitioned by month in ClickHouse
2. **Project-based Sharding**: Data sharded by project_id for large organizations

## 5. Backup and Disaster Recovery

### 5.1 Backup Strategy

1. **PostgreSQL**:
   - Daily automated backups via Cloud SQL
   - Point-in-time recovery enabled
   - Retention: 7 days

2. **ClickHouse**:
   - Daily full backups to Cloud Storage
   - Incremental backups every 6 hours
   - Retention: 30 days

3. **Configuration**:
   - All infrastructure as code stored in Git
   - CI/CD pipelines backed up daily

### 5.2 Disaster Recovery Plan

1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 1 hour

Recovery procedures:
1. Infrastructure recreation via Terraform
2. Database restoration from latest backup
3. Service redeployment via CI/CD pipelines

### 5.3 High Availability Configuration

1. **Regional GKE Cluster**: Nodes distributed across multiple zones
2. **Cloud SQL**: Regional configuration with automatic failover
3. **ClickHouse**: Multi-replica setup with automatic failover
4. **Kafka**: Multi-broker cluster with replication factor of 3

## 6. Monitoring and Logging

### 6.1 Monitoring Stack

1. **Prometheus**: Metrics collection
2. **Grafana**: Visualization and alerting
3. **Cloud Monitoring**: GCP resource monitoring
4. **Custom Metrics**: Application-specific performance indicators

### 6.2 Logging Architecture

1. **Fluentd**: Log collection from Kubernetes
2. **Cloud Logging**: Centralized log storage
3. **Log-based Metrics**: Derived from application logs
4. **Log Explorer**: For troubleshooting and analysis

### 6.3 Alerting Configuration

1. **SLO-based Alerts**: Based on service level objectives
2. **Resource Utilization Alerts**: CPU, memory, disk usage
3. **Error Rate Alerts**: Sudden increases in error rates
4. **Latency Alerts**: API response time degradation

## 7. Cost Optimization

### 7.1 Resource Optimization

1. **Spot Instances**: For development and non-critical workloads
2. **Autoscaling**: Scale down during low-traffic periods
3. **Rightsizing**: Regular review of resource allocation

### 7.2 Storage Optimization

1. **Tiered Storage**: Move older data to cheaper storage classes
2. **Compression**: Enable compression for ClickHouse tables
3. **Data Lifecycle**: Automatic archiving and deletion policies

### 7.3 Estimated Monthly Costs

| Component | Development | Staging | Production |
|-----------|------------|---------|------------|
| GKE Cluster | $150 | $300 | $900 |
| Cloud SQL | $100 | $200 | $500 |
| ClickHouse (on GKE) | $200 | $400 | $1,200 |
| Kafka (on GKE) | $150 | $300 | $800 |
| Cloud Storage | $50 | $100 | $300 |
| Networking | $50 | $100 | $300 |
| Monitoring & Logging | $50 | $100 | $200 |
| **Total** | **$750** | **$1,500** | **$4,200** |

*Note: Costs are estimates and will vary based on actual usage patterns.*
