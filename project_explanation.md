# Nexus Control - A Step-by-Step Trainee's Guide to Our AWS Architecture

If you've ever looked at a cloud architecture diagram and felt overwhelmed, you are not alone. When you are a trainee, cloud deployments feel like a massive puzzle of random acronyms (VPC, ECS, ECR, ALB, RDS). 

This guide explains the project from the ground up, starting from a simple local app and processing each cloud service step-by-step as a solution to a specific problem we encountered.

---

## Step 1: The Core Application (Frontend & Backend)
Before the cloud, we had two separate applications running locally on our laptops:
1. **The Frontend (React + Vite)**: This is the user interface. It is the HTML, JavaScript, and CSS that runs directly in the user's browser. It draws the dashboard, the ticket tables, and the forms.
2. **The Backend (Java Spring Boot)**: This is the logic engine. It runs on a server, listens for requests (like "create a ticket" or "add a comment"), handles authorization, and communicates with the database.

* **The Problem**: Running them locally is easy (`npm run dev` and running the Java main class). But how do we run them in the cloud so that anyone on the internet can access them?

---

## Step 2: Packaging the App (Docker & Containerization)
* **The Problem**: If we try to deploy the backend directly to a virtual machine in the cloud, we have to manually install the correct version of Java, match the operating system settings, handle environment paths, etc. This leads to the classic *"it worked on my machine, why is it failing in production?"* bug.
* **The Solution (Docker)**: We use **Docker** to containerize our backend. 
  - We write a recipe file called a `Dockerfile`.
  - This recipe downloads a lightweight operating system (Alpine Linux), installs Java, copies our compiled Spring Boot jar file, and packages them together into a single file called a **Docker Image**.
  - A Docker Image is like a self-contained virtual computer. It runs exactly the same way on your laptop, a trainee's laptop, or AWS.

---

## Step 3: Storing our Packages (AWS ECR)
* **The Problem**: Now we have a Docker Image on our local machine. How does AWS get access to this image to run it?
* **The Solution (Amazon ECR - Elastic Container Registry)**: ECR is AWS's private vault for Docker images.
  - In our GitHub Actions pipeline, we build the Docker Image, log in to AWS, and upload (push) the image to **ECR**.
  - Now, our packaged backend application is stored securely in the cloud, ready to be deployed.

---

## Step 4: Running the Containers (AWS ECS & Fargate)
* **The Problem**: Our Docker Image is sitting in ECR. We need something to run it, monitor it, and make sure it doesn't crash.
* **The Solution (Amazon ECS - Elastic Container Service)**: ECS is the manager/orchestrator for containerized apps. It has three core parts that work together:
  1. **Task Definition**: This is the blueprint or "instruction manual". It tells ECS: *"Go fetch this image from ECR, allocate 0.25 CPU and 0.5GB of RAM to it, set these environment variables (like database URL), and expose port 8080."*
  2. **Service**: This is the "supervisor". It uses the Task Definition to launch the actual running container (called a **Task**). The Service continuously monitors the Tasks. If a Task crashes or freezes, the Service automatically kills it and starts a fresh one.
  3. **Cluster**: This is simply the logical room or boundary where our Services and Tasks live. It groups our container resources together.
  4. **AWS Fargate**: Normally, to run containers, you have to lease EC2 virtual machines and manage them. With **Fargate**, AWS handles the virtual machines. We just tell ECS: *"Run our Task definition serverlessly,"* and Fargate provisions the exact compute power on-demand. We don't manage any servers.

---

## Step 5: Network Security (VPC, Subnets, and Gateways)
* **The Problem**: Now our containers are running on Fargate. But if they are directly exposed to the public internet, hackers can scan them, DDoS them, or directly exploit security weaknesses.
* **The Solution (Amazon VPC & Subnets)**: A **VPC (Virtual Private Cloud)** is our own isolated, private network in AWS. No one can enter this network unless we explicitly build a gateway for them. We set up our VPC CIDR block at `10.0.0.0/16` and divide this network into two distinct functional zones across two availability zones (AZs) for high availability:
  1. **Public Subnets**:
     - `ticketdesk-subnet-public-a` (`10.0.1.0/24` in `ap-south-1a`)
     - `ticketdesk-subnet-public-b` (`10.0.2.0/24` in `ap-south-1b`)
     - Resources here have public IPs and are connected to the internet via an **Internet Gateway (IGW)**. This is where we place our Load Balancer to accept public users.
     - A **NAT Gateway** (with a dedicated Elastic IP) is placed in `ticketdesk-subnet-public-a` to bridge outbound traffic for private resources.
  2. **Private Subnets**:
     - `ticketdesk-subnet-private-a` (`10.0.10.0/24` in `ap-south-1a`)
     - `ticketdesk-subnet-private-b` (`10.0.11.0/24` in `ap-south-1b`)
     - This is where we place our ECS Fargate container Tasks and our RDS Database (isolated via a DB Subnet Group).
     - Resources here do not have public IPs and **cannot** be accessed from the public internet. If they need to talk outbound to the internet (e.g. to pull configuration parameters from SSM/Secrets Manager or retrieve ECR images), they do so through the **NAT Gateway** in the public subnet via a Private Route Table mapping `0.0.0.0/0` to the NAT Gateway.

---

## Step 6: Public Entry Point (ALB & Target Groups)
* **The Problem**: If our Spring Boot containers are hidden in private subnets with no public IPs, how does a user's web browser make API requests to them?
* **The Solution (Application Load Balancer - ALB)**: We place an ALB in our public subnets (`public_a` and `public_b`). 
  - The ALB has a public DNS address. It acts as the single point of contact for the outside world.
  - **Listeners & Rules**: The ALB listens on port 80 (HTTP). It has routing rules:
    - If a user sends a request to `/api/*` or `/health`, the ALB routes it to our backend containers.
  - **Target Group**: This is the list of private container IPs and ports that the ALB is allowed to forward traffic to (port 8080). The ALB continuously runs **Health Checks**: it pings `/health` on port 8080 every few seconds. If a container doesn't respond `200 OK`, the ALB stops sending traffic to it and tells ECS to replace it.
  - **Firewall Integration (Security Groups)**: 
    - The ALB's security group allows incoming public traffic on port 80.
    - The backend ECS task security group only allows inbound traffic on port 8080 if it originates specifically from the ALB's security group, preventing direct access.

---

## Step 7: Saving Data (RDS Managed Database)
* **The Problem**: Our Spring Boot app needs to save tickets, comments, and users. If we save them inside the container, they will be deleted the moment the container restarts (since container storage is temporary/ephemeral).
* **The Solution (Amazon RDS - Relational Database Service)**: RDS is a managed database service.
  - We deploy an RDS MySQL 8.0 database (`ticketdesk-db`). AWS handles backups, replication, and OS patches.
  - **Security & Subnets**: The RDS database is placed in the private subnets via `aws_db_subnet_group.db_subnets`. It has no public IP. The database's security group is configured to **only** accept incoming connections on port 3306 if they originate from our ECS container's security group.

---

## Step 8: Dynamic Configurations (SSM & Secrets Manager)
* **The Problem**: How does our Spring Boot app know the database URL and the database password at startup? We cannot hardcode them in the Docker image, because anyone who gets the image could see our credentials, and we would have to rebuild the image just to change a config.
* **The Solution (SSM & Secrets Manager)**:
  - We store database URLs, usernames, bucket names, and regions in **SSM Parameter Store** (non-sensitive configs under `/ticketdesk/*`).
  - We store the database password in **AWS Secrets Manager** (encrypted secrets under `ticketdesk-db-password`).
  - When ECS boots our container, it retrieves these values from SSM/Secrets via IAM roles and injects them as standard environment variables (`DB_URL`, `DB_PASSWORD`) into the container. Spring Boot reads them automatically.

---

## Step 9: Content Delivery, Caching, & Routing (Amazon CloudFront)
* **The Problem**: If our S3 website bucket (where frontend lives) is located in the Mumbai region (`ap-south-1`), and a user accesses the site from London or New York, the website might load slowly because static files have to travel across the oceans.
* **The Solution (Amazon CloudFront)**: CloudFront is a global CDN (Content Delivery Network) that optimizes delivery by routing traffic through edge locations worldwide:
  - **Static Assets Routing**: The default behavior (`/*`) caches React static web assets (HTML, JS, CSS) at edge locations. When a user visits the site, CloudFront serves assets from the closest edge server, achieving sub-second loads.
  - **Dynamic API Routing**: CloudFront is configured with a behavior for `/api/*` and `/health` that routes traffic to the ALB. For API requests, caching is disabled to ensure dynamic database pings are forwarded directly to the backend.
  - **Security & HTTPS**: CloudFront handles SSL/TLS termination using certificates managed in AWS Certificate Manager (ACM) to encrypt all user traffic.
  - **POC Environment Bypassing**: In this specific POC implementation, CloudFront is documented in the production architecture but disabled in the Terraform code because of AWS account verification constraints. The frontend is served directly via S3 website hosting, and API requests go directly to the ALB.

---

## Step 10: Security Authorizations (IAM Roles & Policies)
* **The Problem**: If our containers need to pull configurations from SSM Parameter Store, fetch passwords from Secrets Manager, or write uploaded files to S3, how does AWS know it is allowed? Can any random container in our AWS account access these secrets?
* **The Solution (AWS IAM - Identity and Access Management)**: We use IAM roles to define permissions strictly.
  - **Task Execution Role**: This is the role given to the ECS Agent. It says: *"You are allowed to download the container image from ECR, write logs to CloudWatch, read configurations from SSM, and decrypt the database password secret from Secrets Manager."*
  - **Task Role**: This is the role given to the Spring Boot application itself. It says: *"You are allowed to upload attachments to our specific S3 bucket and fetch presigned URLs."*
  - By separating these roles, we enforce the security principle of **least privilege**.

---

## Step 11: Secure Attachment Uploads (S3 Presigned URLs)
* **The Problem**: If a user uploads a 50MB screenshot or logs file to a ticket, we shouldn't stream that file through our Spring Boot backend task. It would consume container memory, increase backend CPU utilization, and slow down other API requests.
* **The Solution (S3 Presigned URLs)**:
  - When a user uploads a file, the frontend asks our backend: *"Can I have permission to upload this file to S3 directly?"*
  - The backend requests S3 to issue a secure **Presigned URL** that is cryptographically signed and expires in 15 minutes.
  - The backend returns this URL to the frontend.
  - The user's browser uploads the file **directly** to the secure private S3 uploads bucket (`ticketdesk-uploads-*`) using the presigned URL. Our Spring Boot server's bandwidth is completely bypassed!

---

## Step 12: Asynchronous Serverless Processing (AWS Lambda)
* **The Problem**: We want to generate small thumbnail versions of every uploaded image. If we process these images inside the Spring Boot container, it could choke our app's CPU resources. We only want this script to run when a file is uploaded, and not consume running memory when there are no uploads.
* **The Solution (AWS Lambda & S3 Triggers)**:
  - We write a Python 3.9 script (`index.py` with `handler`) that takes an image, scales it down, and saves it.
  - We deploy this script as an **AWS Lambda** serverless function (`ticketdesk-thumbnail-generator`).
  - **Event Trigger**: We configure an S3 bucket notification trigger (`s3:ObjectCreated:*`) on the uploads bucket. The moment a file is successfully uploaded, S3 fires an event notification that wakes up our Lambda function.
  - **Execution & Security**: The Lambda function runs under the `ticketdesk-lambda-role` IAM role. This role has the `AWSLambdaBasicExecutionRole` policy (to write logs to CloudWatch) and a custom policy (`ticketdesk-lambda-s3-policy`) allowing `s3:GetObject` and `s3:PutObject` specifically on the uploads bucket.
  - **Infinite Loop Prevention**: The Lambda handler is coded to ignore any keys starting with `thumbnails/` to avoid triggering itself recursively when writing the thumbnail.
  - Lambda processes the image, writes the thumbnail back to S3 under the `thumbnails/` prefix, and shuts down instantly. We only pay for the exact milliseconds it ran!

---

## Step 13: System Observability (Amazon CloudWatch Logs & Alarms)
* **The Problem**: Since our containers are hidden in private subnets with no public IPs, if the Spring Boot application throws an exception or crashes, how do we inspect the standard output console logs to debug it?
* **The Solution (Amazon CloudWatch Logs)**:
  - Fargate tasks are configured via log configuration parameters to direct stdout streams to **CloudWatch Logs** under the `/ecs/ticketdesk-backend` log group.
  - CloudWatch compiles container logs, RDS database queries, and load balancer traffic metrics.
  - **Alarms**: Custom CPU and Memory utilization alarms are set up to alert administrators if resource consumption exceeds 85%.

---

## Step 14: End-to-End AWS Architecture Diagram

```text
+-------------------------------------------------------------------------------------------------------------------------+
|                                                      Client Browser                                                     |
+-------------------------------------------------------------------------------------------------------------------------+
                                      |                                                ^
                                      | HTTP/HTTPS requests                            | Static assets / API response
                                      v                                                |
+-------------------------------------------------------------------------------------------------------------------------+
|                                              Amazon CloudFront (CDN)                                                    |
|  - Default Behavior (/*) -> S3 Website Origin (Static Assets)                                                           |
|  - API Behavior (/api/*) -> ALB Origin (Dynamic API Calls)                                                              |
+-------------------------------------------------------------------------------------------------------------------------+
                    |                                                      |
                    | (Cache Miss / Fetch Web Assets)                      | (Forward API Request)
                    v                                                      v
+--------------------------------------+             +--------------------------------------------------------------------+
|          Amazon S3 Website           |             |                       Internet Gateway (IGW)                       |
|        (ticketdesk-frontend)         |             +--------------------------------------------------------------------+
+--------------------------------------+                                                   |
                                                                                           |
                                                                                           v
+=========================================================================================================================+
|                                                    AWS VPC (10.0.0.0/16)                                                |
|                                                                                                                         |
|  +-------------------------------------------------------------------------------------------------------------------+  |
|  |                                  PUBLIC SUBNETS (10.0.1.0/24 & 10.0.2.0/24)                                       |  |
|  |                                                                                                                   |  |
|  |   +-----------------------------------------------------------------------------------------------------------+   |  |
|  |   |                                  Application Load Balancer (ALB) (Port 80)                                |   |  |
|  |   +-----------------------------------------------------------------------------------------------------------+   |  |
|  |                                                        |                                                          |  |
|  |                                                        | Outbound NAT traffic                                     |  |
|  |   +-------------------+                                v                                                          |  |
|  |   |    NAT Gateway    |<---------------------------------------------------------+                                |  |
|  |   +-------------------+                                                          |                                |  |
|  |             |                                                                    |                                |  |
|  |             v (Elastic IP)                                                       |                                |  |
|  |       To AWS Services (ECR, SSM, etc.)                                           |                                |  |
|  +--------------------------------------------------------|-------------------------|--------------------------------+  |
|                                                           |                         |                                   |
|                                                           | Route to Fargate Tasks  |                                   |
|                                                           v                         |                                   |
|  +----------------------------------------------------------------------------------|--------------------------------+  |
|  |                                  PRIVATE SUBNETS (10.0.10.0/24 & 10.0.11.0/24)   |                                |  |
|  |                                                                                  |                                |  |
|  |   +------------------------------------------------------------------------------|----------------------------+   |  |
|  |   |                                         AWS ECS Fargate Cluster              |                            |   |  |
|  |   |                                                                              |                            |   |  |
|  |   |   +--------------------------------------------------------------------------v------------------------+   |   |  |
|  |   |   |                                Spring Boot Backend Tasks (Port 8080)                                  |   |   |  |
|  |   |   +---------------------------------------------------------------------------------------------------+   |   |  |
|  |   |                                    |                            |                       ^                 |   |  |
|  |   |                                    | 4. DB Operations           | 8. S3 Presigned URL   | 6. Pull Config  |   |  |
|  |   +------------------------------------|----------------------------|-----------------------|-----------------+   |  |
|  |                                        |                            |                       |                     |  |
|  |   +------------------------------------v----+                       |                       |                     |  |
|  |   |           RDS MySQL Database            |                       |                       |                     |  |
|  |   |             (ticketdesk-db)             |                       |                       |                     |  |
|  |   +-----------------------------------------+                       |                       |                     |  |
|  +---------------------------------------------------------------------|-----------------------|---------------------+  |
+========================================================================|=======================|========================+
                                                                         |                       |
                                                                         |                       | 7. SSM & Secrets Manager
                                                                         v                       | (Dynamic configs & credentials)
                                                                 +---------------+               |
                                                                 |  S3 Uploads   |---------------+
                                                                 |    Bucket     |
                                                                 +---------------+
                                                                         |
                                                                         | 10. ObjectCreated Trigger
                                                                         v
                                                                 +---------------+
                                                                 |  AWS Lambda   |
                                                                 |  (Thumbnail   |
                                                                 |  Generator)   |
                                                                 +---------------+
```

---

## Step 15: Summary of the Whole Request Flow
Here is how it all connects when a user uploads a screenshot on a ticket:
1. **Frontend Request**: The user opens their browser and requests the React frontend. The request is intercepted by **Amazon CloudFront** which serves the static web assets cached from the **S3 Website Bucket** (`ticketdesk-frontend-*`).
2. **Dynamic Query**: When the user requests a presigned write URL from the backend, the browser fires a PUT request to `/api/tickets/attachments`.
3. **CloudFront API Routing**: **CloudFront** detects the `/api/*` path, disables caching, and routes the request directly to the **Application Load Balancer (ALB)** in the public subnets.
4. **ALB Routing**: The ALB listens on port 80 and forwards the request to the Spring Boot backend container tasks running on **ECS Fargate** in the private subnets.
5. **Secrets & Config**: If boot dependencies are needed, the backend tasks query **SSM Parameter Store** and **AWS Secrets Manager** through the **NAT Gateway** in the public subnet.
6. **URL Generation**: The container uses its **IAM Task Role** permissions to request a cryptographically signed write URL from **S3** and returns it back to the client browser through the ALB/CloudFront pipeline.
7. **Direct Upload**: The client browser uploads the actual image file **directly to S3** uploads bucket (`ticketdesk-uploads-*`) using the returned presigned URL. This completely bypasses the Fargate tasks' network bandwidth.
8. **Serverless Execution**: The moment S3 finishes saving the image file, it fires an `ObjectCreated:*` event notification that invokes the **AWS Lambda** thumbnail generator function.
9. **Processing**: **Lambda** downloads the image using its execution role, generates a scaled-down thumbnail version, and writes it back to S3 under the `thumbnails/` folder prefix, then shuts down.
10. **Observability**: Throughout this entire cycle, all task standard output streams, RDS database operations, and system health details are written to **Amazon CloudWatch** logs and dashboards.
