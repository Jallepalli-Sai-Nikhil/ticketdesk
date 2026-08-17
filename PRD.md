# 📄 TicketDesk - Product Requirements Document (PRD)

This document contains the official project requirements, development rules, and roadmap milestones (M0 through M8) for the TicketDesk ITSM platform.

---

## 🎯 Project Overview
TicketDesk is a high-performance, containerized, and secure IT Service Management (ITSM) system built using **Spring Boot (Java)** for the backend API and **React (TypeScript + Vite)** for the frontend dashboard. The entire infrastructure is managed declaratively via **Terraform** and deployed to **AWS Fargate** with continuous integration driven by **GitHub Actions**.

---

## 🏁 Milestones Roadmap (M0 - M8)

### 🔹 Milestone M0: Local Core API Setup
* **Backend Setup:** Java 25 & Maven structure setup.
* **Domain Model:** Core schema for `Ticket`, `User`, `Comment` models.
* **REST APIs:** Controllers for ticket queues, assignment triages, status updates, and user management.
* **Database persistence:** Local MySQL database connectivity using JPA/Hibernate.

### 🔹 Milestone M1: React Dashboard Interface
* **Design System:** Dark theme layout featuring Plus Jakarta Sans and Inter typographies.
* **Modular Panels:** Sidebar navigation, incident list queue, filtering criteria, and creation forms.
* **Live Integration:** Fetch and submit API integrations matching Spring Boot endpoint outputs.

### 🔹 Milestone M2: Secure S3 Attachments Flow
* **Direct PUT Uploads:** Client requests ephemeral pre-signed URL from API, then uploads file directly to S3.
* **Security Isolation:** Block direct public access on S3 attachments bucket (`ticketdesk-uploads`); enforce ephemeral read access via short-lived GET URLs.

### 🔹 Milestone M3: RDS Database & Secret Management
* **RDS MySQL Engine:** Secure database instance isolated in private VPC subnets.
* **AWS Secrets Manager:** Automatically generate, store, and rotate database passwords.
* **SSM Parameter Store:** Consumes configurations (regions, bucket names, DB URLs) inside the Fargate task runtime.

### 🔹 Milestone M4: Secure Network Infrastructure (VPC & ALB)
* **VPC Subnets:** Divides network into public (ALB, NAT Gateways) and private (compute tasks, databases) subnets.
* **Security Groups:** Enforces ingress isolation (RDS accepts 3306 from Tasks only; Tasks accept 8080 from ALB only).
* **Application Load Balancer:** Entrypoint forwarding path-based requests (`/api/*` to Fargate; `/` to frontend resources).

### 🔹 Milestone M5: Serverless Thumbnail Generation
* **Lambda Trigger:** Automatically invokes serverless Python handler on `s3:ObjectCreated` events.
* **Processing:** Reads uploaded image, resizes, and writes mock thumbnail back to the `thumbnails/` path prefix.

### 🔹 Milestone M6: System Observability & Alarms
* **CloudWatch Dashboard:** Monitor metrics (HTTP request volumes, 5xx errors, task CPU/Memory, DB connections).
* **Alert Alarms:** active alerts for target group health, elevated 5xx error rates, and high DB CPU loads.

### 🔹 Milestone M7: GitHub Actions CI/CD Automation
* **Verification Pipeline:** Checkstyle linting, ESLint rules, unit tests, and production compiles.
* **Deployment Steps:** Docker build with git SHA tag, ECR push, ECS task updates, and post-deployment smoke health checks.

### 🔹 Milestone M8: Full Stack Validation Runbook
* **CLI Validation:** Runbook containing CLI validations to verify AWS security, S3 bucket encryption, database isolation, and logs.

---

## 🛠️ Global Development Rules

1. **Local Development First:** Ensure code builds and tests locally before starting AWS modifications.
2. **No Hardcoded Secrets:** Pass all configuration strings, keys, and passwords dynamically via SSM Parameter Store or Secrets Manager.
3. **Strict Lint Compliance:** ESLint must pass with zero warnings (`--max-warnings 0`) to prevent pipeline breaks.
4. **AWS Account Limits:** CloudFront is currently **disabled** since the target AWS account is unverified. Serve static assets directly using **S3 website hosting** or embedded resource servers.
5. **Role Terminology:** Enforce standard terms: `Employee` for submitters, and `Admin` for technical operators.
