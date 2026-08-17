# 📂 TicketDesk Repository Directory Layout

```text
ticketdesk/
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI/CD Pipeline
├── backend/                   # Spring Boot Java Backend
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/ticketdesk/
│   │   │   │   ├── controller/      # REST API Controllers (Ticket, Auth, Comments, Attachments)
│   │   │   │   ├── model/           # JPA Domain Entities
│   │   │   │   └── repository/      # Spring Data JPA Repositories
│   │   │   └── resources/
│   │   │       ├── application.properties
│   │   │       └── application-mysql.properties
│   │   └── test/
│   ├── Dockerfile             # Multi-stage production runtime container setup
│   └── pom.xml                # Maven Dependencies
├── frontend/                  # React + Vite TypeScript Frontend
│   ├── src/
│   │   ├── App.css            # Custom premium micro-interactions & layout animations
│   │   ├── App.tsx            # Main frontend dashboard UI logic
│   │   └── main.tsx
│   ├── public/
│   │   └── loader.lottie      # Screen-wide premium Lottie loading animation
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── lambda/                    # Serverless Image Processing
│   └── thumbnail/
│       └── index.py           # Python lambda handler generating mock image thumbnails
├── terraform/                 # Infrastructure as Code
│   ├── main.tf
│   ├── vpc.tf                 # Network subnets (Public/Private), NATs, and IGW
│   ├── alb.tf                 # Application Load Balancer, Listener, and Target Group
│   ├── ecs.tf                 # ECS Cluster, Service, and Task Definitions
│   ├── rds.tf                 # MySQL Database Instance
│   ├── s3.tf                  # Frontend and attachments uploads buckets
│   ├── security_groups.tf     # Firewall ingress/egress rules
│   ├── iam.tf                 # Task, Execution, and Lambda roles/policies
│   ├── cloudfront.tf          # CDN distribution mapping origins
│   ├── observability.tf       # CloudWatch Dashboard, Metrics, and Alarms
│   ├── variables.tf
│   └── outputs.tf
├── AWS_ARCHITECTURE.md        # Architectural flow and execution mappings
├── AWS_DEPLOYMENT_GUIDE.md    # Decommission and setup runbook commands
├── DIRECTORY_LAYOUT.md        # This layout map file
├── PRD.md                     # Product Requirements Document
├── README.md                  # Comprehensive линейный MerMaid & Console path documentation
└── run_terraform.ps1          # Powershell script utility forwarding active AWS session
```
