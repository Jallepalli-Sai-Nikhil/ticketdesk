# TicketDesk Master Prompt (Updated)

> This project follows a **Local Development → Docker → GitHub Actions
> CI → AWS** progression.

## 30. Development Roadmap

1.  Project setup and repository structure
2.  Backend domain model
3.  REST APIs
4.  Database integration
5.  Backend testing
6.  React frontend
7.  Frontend API integration
8.  Complete local integration testing
9.  Production-ready Dockerization

After these phases, begin AWS deployment. Do not skip phases.

## 31. Local Development First

For now, do **NOT** implement: - Terraform - Any AWS service (ECS, ECR,
RDS, S3, Lambda, CloudFront, IAM, VPC, ALB, Secrets Manager, Parameter
Store, CloudWatch, Route53, ACM) - Kubernetes, Helm, ArgoCD

Everything must run locally using: - React + Vite - Spring Boot -
MySQL - Maven - npm - Local environment variables

Design the code so AWS can be added later without major refactoring.

## 32. Docker

When requested: - Multi-stage backend Dockerfile - Non-root runtime
image - Optimized frontend image (Nginx) - docker-compose for Spring
Boot + MySQL (+ frontend when appropriate)

No cloud deployment manifests yet.

## 33. GitHub Actions CI

Implement an enterprise-style CI pipeline:

1.  Checkout
2.  Java setup
3.  Node.js setup
4.  Dependency installation (with caching)
5.  Static analysis
    -   Backend compile/checkstyle(optional)
    -   Frontend ESLint + TypeScript
6.  Unit tests
7.  Build
8.  Security checks
9.  Artifact verification
10. Smoke tests
11. Pipeline summary

Smoke tests should verify: - Backend starts - `/actuator/health` returns
UP - Create Ticket API works - Fetch Ticket API works - Dashboard API
responds - Frontend production build succeeds

## 34. Future CI/CD Evolution

Later extend CI with: - Docker build - Docker scan - Push to ECR -
Terraform validate/plan/apply - ECS deployment - Deployment
verification - CloudWatch checks - Rollback - terraform destroy
verification

Do **not** implement these now.

## 35. AWS Learning Rule

Before generating any Terraform: 1. Explain the service 2. Why it is
needed 3. Dependencies 4. Architecture placement 5. Security 6. Cost 7.
Best practices 8. Common mistakes 9. Then generate Terraform

## 36. Final Goal

Progression:

Local Development → Docker → GitHub Actions CI → AWS Infrastructure →
Production Deployment

Always stop after completing the current phase and wait for confirmation
before continuing.
