# TicketDesk Backend AWS ECS Fargate & ALB Deployment Guide

This guide details the step-by-step process to compile, containerize, and deploy the TicketDesk Spring Boot backend to AWS ECS Fargate, routed through an Application Load Balancer (ALB).

---

## 🏗️ Deployment Architecture

All traffic flows are fully restricted via secure AWS security groups. The Spring Boot backend container runs in isolated tasks, only allowing direct traffic requests from the ALB.

```text
================================================================================
                               DEPLOYMENT STATE DIAGRAM
================================================================================

  [ Client / Internet ]
          │
          │ HTTP Request (Port 80)
          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  AWS VPC: vpc-0be1f9570a43a53a9                                              │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Public Subnets: subnet-072dd56866b89d892, subnet-07068222dc346c028     │  │
│  │                                                                        │  │
│  │  Application Load Balancer: ticketdesk-m0-alb-new                      │  │
│  │  Firewall rule: ALB Security Group (ticketdesk-m0-alb-sg-new)          │  │
│  │  - Ingress: Allows TCP Port 80 from 0.0.0.0/0                          │  │
│  │                                                                        │  │
│  └──────────────────────────────────┬─────────────────────────────────────┘  │
│                                     │                                        │
│                                     │ Forward (HTTP Port 8080)               │
│                                     ▼                                        │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ ECS Fargate Cluster: ticketdesk-m0-cluster                             │  │
│  │                                                                        │  │
│  │  Fargate Container Task: ticketdesk-mo-task:1                          │  │
│  │  Firewall rule: Task Security Group (ticketdesk-m0-task-sg-new)        │  │
│  │  - Ingress: Allows TCP Port 8080 ONLY from ALB Security Group          │  │
│  │                                                                        │  │
│  │  Container running Spring Boot                                         │  │
│  │  - Exposed: Port 8080                                                  │  │
│  │  - Health Check Endpoint: /health                                      │  │
│  │                                                                        │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites & Verification

Ensure you have the following environments configured before proceeding:

| Dependency | Required Version | Verification Command | Expected Output Example |
| :--- | :--- | :--- | :--- |
| **Java** | JDK 25 | `java -version` | `openjdk version "25" 2025-09-16` / `Eclipse Adoptium` |
| **Maven** | 3.9+ | `mvn -version` | `Apache Maven 3.9.x` (running on Java 25) |
| **Docker** | 20.10+ | `docker --version` | `Docker version 24.x.x` |
| **AWS CLI** | 2.x | `aws --version` | `aws-cli/2.x.x Python/3.x.x` |

---
---

# PART 1: Local Backend Compilation & Verification

---

### Step 1 — Navigate to the Backend Workspace

*   **Command to Run:**
    ```powershell
    cd C:\Users\nikhi\Desktop\Ticket\backend
    ```

*   **Verification Checkpoint:**
    > [!NOTE]
    > Ensure your terminal prompt directory changes to the backend directory containing `pom.xml`.

*   **⚠️ Lookout Point:**
    > Make sure you are inside the `backend` directory, not the project root workspace directory. Otherwise, the Maven wrapper or command will fail to find `pom.xml`.

---

### Step 2 — Configure Environment Variables for Java 25

*   **Command to Run:**
    ```powershell
    # Set Environment Variable for the Session
    $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-25.0.1.8-hotspot"

    # Verify Java Version
    java -version
    ```

*   **Expected CLI Response:**
    ```text
    openjdk version "25.0.1" 2025-01-21
    OpenJDK Runtime Environment Temurin-25.0.1+8 (build 25.0.1+8)
    OpenJDK 64-Bit Server VM Temurin-25.0.1+8 (build 25.0.1+8, mixed mode, sharing)
    ```

*   **Command to Run:**
    ```powershell
    # Verify Maven Version & Java Link
    mvn -version
    ```

*   **Expected CLI Response:**
    ```text
    Apache Maven 3.9.6 (c124214c556a355319949d3c4df5d80e2a3a83b6)
    Maven home: C:\Program Files\Maven\apache-maven-3.9.6
    Java version: 25.0.1, vendor: Eclipse Adoptium, runtime: C:\Program Files\Eclipse Adoptium\jdk-25.0.1.8-hotspot
    Default locale: en_IN, platform encoding: UTF-8
    OS name: "windows 11", version: "10.0", arch: "amd64", family: "windows"
    ```

*   **Verification Checkpoint:**
    > [!IMPORTANT]
    > Verify that the output of `mvn -version` explicitly lists Java 25 as the runtime JDK. If it references a lower version, Maven compilation might produce incompatible class binaries.

*   **⚠️ Lookout Point:**
    > Command line environment modifications via `$env:JAVA_HOME` only apply to the **current** terminal instance. If you open a new window to compile, you must rerun the Java configuration command.

---

### Step 3 — Compile and Package the Spring Boot App

*   **Command to Run:**
    ```powershell
    mvn clean package
    ```

*   **Expected CLI Response:**
    ```text
    [INFO] Scanning for projects...
    ...
    [INFO] --- maven-jar-plugin:3.4.1:jar (default-jar) @ backend ---
    [INFO] Building jar: C:\Users\nikhi\Desktop\Ticket\backend\target\backend-0.0.1-SNAPSHOT.jar
    [INFO] --- spring-boot-maven-plugin:4.1.0:repackage (repackage) @ backend ---
    [INFO] Replacing main artifact [C:\Users\nikhi\Desktop\Ticket\backend\target\backend-0.0.1-SNAPSHOT.jar]
    [INFO] ------------------------------------------------------------------------
    [INFO] BUILD SUCCESS
    [INFO] ------------------------------------------------------------------------
    [INFO] Total time:  4.321 s
    [INFO] Finished at: 2026-08-10T17:20:00+05:30
    [INFO] ------------------------------------------------------------------------
    ```

*   **⚠️ Lookout Point:**
    > If Maven fails with compilation errors, verify that Java 25 is actively being used. If there are unit test failures, you can bypass them for packaging by using `mvn clean package -DskipTests`.

---

### Step 4 — Perform a Local JAR Health Verification

*   **Command to Run:**
    ```powershell
    java -jar target/backend-0.0.1-SNAPSHOT.jar
    ```

*   **Expected CLI Response:**
    ```text
      .   ____          _            __ _ _
     /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
    ( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
     \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
      '  |____| .__|_| |_|_| |_\__, | / / / /
     =========|_|==============|___/=/_/_/_/
     :: Spring Boot ::                (v4.1.0)

    2026-08-10 17:21:00.000  INFO 12345 --- [backend] [           main] c.t.TicketDeskBackendApplication        : Starting TicketDeskBackendApplication v0.0.1-SNAPSHOT...
    2026-08-10 17:21:02.500  INFO 12345 --- [backend] [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat initialized with port 8080 (http)
    2026-08-10 17:21:03.200  INFO 12345 --- [backend] [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port 8080 (http) with context path '/'
    2026-08-10 17:21:03.210  INFO 12345 --- [backend] [           main] c.t.TicketDeskBackendApplication        : Started TicketDeskBackendApplication in 3.5 seconds (JVM running for 4.2)
    ```

*   **Action Required:**
    *   Leave this terminal running.
    *   Open a **second PowerShell terminal**.

*   **Command to Run (Second Terminal):**
    ```powershell
    curl http://localhost:8080/health
    ```

*   **Expected CLI Response:**
    ```json
    {"status":"UP"}
    ```

*   **Verification Checkpoint:**
    > [!CAUTION]
    > If you do not receive `{"status":"UP"}` or if the port is bound/blocked, **stop here**. Verify your local application properties or system ports.

*   **⚠️ Lookout Point:**
    > Ensure no other application (like local MySQL web tools or Docker containers) is currently using port `8080` before starting this verification step.

---

### Step 5 — Shutdown Local JAR Process

*   **Action Required:**
    *   Go back to the first terminal (where the Java process is running).
    *   Press: `CTRL + C` to terminate the process.

*   **⚠️ Lookout Point:**
    > **Do not skip this step.** If you do not release port `8080`, your next local Docker tests will conflict on port mappings.

---
---

# PART 2: Docker Containerization & Local Registry Verification

---

### Step 6 — Build the Docker Image

*   **Command to Run:**
    ```powershell
    docker build -t ticketdesk-backend:m0 .
    ```

*   **Expected CLI Response:**
    ```text
    [+] Building 1.2s (8/8) FINISHED
     => [internal] load build definition from Dockerfile                                                                        0.0s
     => => transferring dockerfile: 126B                                                                                        0.0s
     => [internal] load .dockerignore                                                                                           0.0s
     => => transferring context: 2B                                                                                             0.0s
     => [internal] load metadata for docker.io/library/eclipse-temurin:25-jre-alpine                                            0.5s
     => [1/3] FROM docker.io/library/eclipse-temurin:25-jre-alpine@sha256:xxxxxxxxxxxxxxxxxxxx                                   0.0s
     => [internal] load build context                                                                                           0.2s
     => => transferring context: 35.2MB                                                                                         0.2s
     => [2/3] WORKDIR /app                                                                                                      0.1s
     => [3/3] COPY target/*.jar app.jar                                                                                         0.3s
     => exporting to image                                                                                                      0.1s
     => => exporting layers                                                                                                     0.1s
     => => writing image sha256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx                                        0.0s
     => => naming to docker.io/library/ticketdesk-backend:m0                                                                    0.0s
    ```

*   **Command to Run:**
    ```powershell
    docker images
    ```

*   **Expected CLI Response:**
    ```text
    REPOSITORY            TAG       IMAGE ID       CREATED         SIZE
    ticketdesk-backend    m0        c1a2b3d4e5f6   1 minute ago    185MB
    ```

*   **⚠️ Lookout Point:**
    > Verify that the tag is explicitly `:m0` and matches what is specified in your `Dockerfile` (which should consume JDK/JRE 25 matching your target compilation).

---

### Step 7 — Run and Test the Docker Container Locally

*   **Command to Run:**
    ```powershell
    docker run --rm -p 8081:8080 ticketdesk-backend:m0
    ```

*   **Expected CLI Response:**
    ```text
    2026-08-10 17:22:00.000  INFO 1 --- [           main] c.t.TicketDeskBackendApplication        : Starting TicketDeskBackendApplication v0.0.1-SNAPSHOT...
    2026-08-10 17:22:01.800  INFO 1 --- [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat initialized with port 8080 (http)
    2026-08-10 17:22:02.300  INFO 1 --- [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port 8080 (http) with context path '/'
    2026-08-10 17:22:02.310  INFO 1 --- [           main] c.t.TicketDeskBackendApplication        : Started TicketDeskBackendApplication in 2.6 seconds
    ```

*   **Action Required:**
    *   Leave the process running.
    *   Open another PowerShell window.

*   **Command to Run (Second Terminal):**
    ```powershell
    curl http://localhost:8081/health
    ```

*   **Expected CLI Response:**
    ```json
    {"status":"UP"}
    ```

*   **Action Required:**
    *   Go back to the running container terminal.
    *   Press: `CTRL + C` to stop the container.

*   **⚠️ Lookout Point:**
    > We mapped host port `8081` to container port `8080` (`-p 8081:8080`). Do **not** try to query `localhost:8080` in this step. Query `8081`.

---
---

# PART 3: AWS Container Registry (ECR) Setup & Push

---

### Step 8 — Verify AWS Authentication

*   **Command to Run:**
    ```powershell
    aws sts get-caller-identity
    ```

*   **Expected CLI Response:**
    ```json
    {
        "UserId": "473009222991",
        "Account": "473009222991",
        "Arn": "arn:aws:iam::473009222991:root"
    }
    ```

*   **⚠️ Lookout Point:**
    > If the CLI response contains an error regarding invalid tokens, missing keys, or incorrect profiles, reconfigure your keys via `aws configure`.

---

### Step 9 — Log in to the Elastic Container Registry (ECR)

*   **Command to Run:**
    ```powershell
    aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 473009222991.dkr.ecr.ap-south-1.amazonaws.com
    ```

*   **Expected CLI Response:**
    ```text
    WARNING! Your password will be stored unencrypted in /root/.docker/config.json.
    Configure a credential helper to remove this warning. See
    https://docs.docker.com/engine/reference/commandline/login/#credentials-store

    Login Succeeded
    ```

*   **⚠️ Lookout Point:**
    > Docker login authentication tokens generated via AWS ECR expire exactly **12 hours** after generation. If you wait overnight to push, you must rerun this authentication command.

---

### Step 10 — Tag the Local Docker Image for ECR

*   **Command to Run:**
    ```powershell
    docker tag ticketdesk-backend:m0 473009222991.dkr.ecr.ap-south-1.amazonaws.com/ticketdesk-backend:m0
    ```
    *(Note: Runs silently with no console output on success)*

*   **Command to Run:**
    ```powershell
    docker images
    ```

*   **Expected CLI Response:**
    ```text
    REPOSITORY                                                           TAG       IMAGE ID       CREATED         SIZE
    ticketdesk-backend                                                   m0        c1a2b3d4e5f6   5 minutes ago   185MB
    473009222991.dkr.ecr.ap-south-1.amazonaws.com/ticketdesk-backend      m0        c1a2b3d4e5f6   5 minutes ago   185MB
    ```

*   **⚠️ Lookout Point:**
    > Ensure you do not tag the image with `:latest`. Consistently use `:m0` to match the target ECS Task definition configurations.

---

### Step 11 — Push the Image to ECR

*   **Command to Run:**
    ```powershell
    docker push 473009222991.dkr.ecr.ap-south-1.amazonaws.com/ticketdesk-backend:m0
    ```

*   **Expected CLI Response:**
    ```text
    The push refers to repository [473009222991.dkr.ecr.ap-south-1.amazonaws.com/ticketdesk-backend]
    a1b2c3d4e5f6: Pushed
    b2c3d4e5f6g7: Pushed
    c3d4e5f6g7h8: Pushed
    m0: digest: sha256:d37b120c4fb305c48b26e033dcd0e5b12852264c78119c836ec3b9cfb7ef8d8a size: 948
    ```

*   **⚠️ Lookout Point:**
    > If pushing fails with `repository does not exist` or `denied: Your authorization token has expired`, double check the repository name (`ticketdesk-backend`) and ensure ECR login was successful.

---

### Step 12 — Verify Uploaded Image Status in ECR

*   **Command to Run:**
    ```powershell
    aws ecr describe-images --repository-name ticketdesk-backend --region ap-south-1
    ```

*   **Expected CLI Response:**
    ```json
    {
        "imageDetails": [
            {
                "registryId": "473009222991",
                "repositoryName": "ticketdesk-backend",
                "imageDigest": "sha256:d37b120c4fb305c48b26e033dcd0e5b12852264c78119c836ec3b9cfb7ef8d8a",
                "imageTags": [
                    "m0"
                ],
                "imageSizeInBytes": 123456789,
                "imagePushedAt": "2026-08-10T17:25:00+05:30",
                "lastRecordedPullTime": "2026-08-10T17:25:00+05:30"
            }
        ]
    }
    ```

---
---

# PART 4: Cleanup of Legacy AWS Infrastructure

---

### Step 13 — Verify ECS Service-Linked Role

*   **Command to Run:**
    ```powershell
    aws iam get-role --role-name AWSServiceRoleForECS
    ```

*   **Expected CLI Response:**
    ```json
    {
        "Role": {
            "Path": "/aws-service-role/ecs.amazonaws.com/",
            "RoleName": "AWSServiceRoleForECS",
            "RoleId": "AROAXXXXXXXXXXXXXXXXX",
            "Arn": "arn:aws:iam::473009222991:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS",
            "CreateDate": "2026-01-01T12:00:00Z",
            "AssumeRolePolicyDocument": {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "ecs.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            },
            "Description": "Role to enable Amazon ECS to manage your cluster.",
            "MaxSessionDuration": 3600
        }
    }
    ```

*   **Command to Run:**
    ```powershell
    aws iam list-attached-role-policies --role-name AWSServiceRoleForECS
    ```

*   **Expected CLI Response:**
    ```json
    {
        "AttachedPolicies": [
            {
                "PolicyName": "AmazonECSServiceRolePolicy",
                "PolicyArn": "arn:aws:iam::aws:policy/aws-service-role/AmazonECSServiceRolePolicy"
            }
        ]
    }
    ```

*   **⚠️ Lookout Point:**
    > **Do not delete this role or modify its permissions.** Doing so will prevent ECS from configuring network interfaces (`ENIs`) for Fargate tasks, breaking future deployments.

---

### Step 14 — Delete Legacy ECS Service

*   **Command to Run:**
    ```powershell
    aws ecs delete-service --cluster ticketdesk-m0-cluster --service ticketdesk-m0-service --force --region ap-south-1
    ```

*   **Expected CLI Response:**
    ```json
    {
        "service": {
            "serviceArn": "arn:aws:ecs:ap-south-1:473009222991:service/ticketdesk-m0-cluster/ticketdesk-m0-service",
            "serviceName": "ticketdesk-m0-service",
            "clusterArn": "arn:aws:ecs:ap-south-1:473009222991:cluster/ticketdesk-m0-cluster",
            "status": "DRAINING",
            "desiredCount": 0,
            "runningCount": 1,
            "pendingCount": 0,
            "launchType": "FARGATE",
            "platformVersion": "LATEST",
            "taskDefinition": "arn:aws:ecs:ap-south-1:473009222991:task-definition/ticketdesk-mo-task:1",
            "deploymentConfiguration": {
                "maximumPercent": 200,
                "minimumHealthyPercent": 100
            },
            "roleArn": "arn:aws:iam::473009222991:role/aws-service-role/ecs.amazonaws.com/AWSServiceRoleForECS"
        }
    }
    ```

*   **Action Required:**
    *   Wait 30–60 seconds.

*   **Command to Run (Verification):**
    ```powershell
    aws ecs describe-services --cluster ticketdesk-m0-cluster --services ticketdesk-m0-service --region ap-south-1
    ```

*   **Expected CLI Response:**
    ```json
    {
        "services": [],
        "failures": [
            {
                "arn": "arn:aws:ecs:ap-south-1:473009222991:service/ticketdesk-m0-service",
                "reason": "MISSING"
            }
        ]
    }
    ```

---

### Step 15 — Delete Legacy Application Load Balancer

*   **Command to Run:**
    ```powershell
    aws elbv2 delete-load-balancer --load-balancer-arn "arn:aws:elasticloadbalancing:ap-south-1:473009222991:loadbalancer/app/ticketdesk-m0-alb/4b1c3125bdbe8bb7" --region ap-south-1
    ```

*   **Expected CLI Response:**
    ```text
    (Empty standard output on success)
    ```

*   **⚠️ Lookout Point:**
    > Application Load Balancers take up to 2-3 minutes to delete completely. During this time, they keep dependencies on security groups and target groups.

---

### Step 16 — Delete Legacy Target Group

*   **Command to Run:**
    ```powershell
    aws elbv2 delete-target-group --target-group-arn "arn:aws:elasticloadbalancing:ap-south-1:473009222991:targetgroup/ticketdesk-m0-tg/185b795bacb86af2" --region ap-south-1
    ```

*   **Expected CLI Response:**
    ```text
    (Empty standard output on success)
    ```

*   **⚠️ Lookout Point:**
    > If you execute this command immediately after Step 15, you may receive a `ResourceInUse` error. Simply wait 30 seconds for the ALB deletion process to release the targets, then rerun the delete command.

---

### Step 17 — Verify Base Network Resources (Do NOT Delete)

*   **Active Configurations Checklist:**
    *   **VPC ID:** `vpc-0be1f9570a43a53a9`
    *   **Public Subnet A:** `subnet-072dd56866b89d892`
    *   **Public Subnet B:** `subnet-07068222dc346c028`

*   **⚠️ Lookout Point:**
    > **Do not delete or modify these network resources.** They are essential base infrastructure dependencies.

---
---

# PART 5: Provisioning Modern & Isolated Security Groups

---

### Step 18 — Create a New ALB Security Group

*   **Command to Run:**
    ```powershell
    aws ec2 create-security-group `
      --group-name ticketdesk-m0-alb-sg-new `
      --description "TicketDesk ALB Security Group" `
      --vpc-id vpc-0be1f9570a43a53a9 `
      --region ap-south-1
    ```

*   **Expected CLI Response:**
    ```json
    {
        "GroupId": "sg-0a1b2c3d4e5f6g7h8"
    }
    ```
    > [!IMPORTANT]
    > Extract and save the returned `GroupId` as **`ALB_SG`** (e.g. `sg-0a1b2c3d4e5f6g7h8`).

*   **⚠️ Lookout Point:**
    > Ensure you capture the correct GroupId. Rerunning this command will fail with `InvalidGroup.Duplicate`.

---

### Step 19 — Configure Inbound Rules for ALB Security Group

*   **Command to Run:**
    ```powershell
    aws ec2 authorize-security-group-ingress `
      --group-id sg-0a1b2c3d4e5f6g7h8 `
      --protocol tcp `
      --port 80 `
      --cidr 0.0.0.0/0 `
      --region ap-south-1
    ```

*   **Expected CLI Response:**
    ```json
    {
        "Return": true,
        "SecurityGroupRules": [
            {
                "SecurityGroupRuleId": "sgr-1a2b3c4d5e6f7g8h9",
                "GroupId": "sg-0a1b2c3d4e5f6g7h8",
                "GroupOwnerId": "473009222991",
                "IsEgress": false,
                "IpProtocol": "tcp",
                "FromPort": 80,
                "ToPort": 80,
                "CidrIpv4": "0.0.0.0/0"
            }
        ]
    }
    ```

---

### Step 20 — Create a New ECS Task Security Group

*   **Command to Run:**
    ```powershell
    aws ec2 create-security-group `
      --group-name ticketdesk-m0-task-sg-new `
      --description "TicketDesk ECS Fargate Task Security Group" `
      --vpc-id vpc-0be1f9570a43a53a9 `
      --region ap-south-1
    ```

*   **Expected CLI Response:**
    ```json
    {
        "GroupId": "sg-1a2b3c4d5e6f7g8h0"
    }
    ```
    > [!IMPORTANT]
    > Extract and save the returned `GroupId` as **`TASK_SG`** (e.g. `sg-1a2b3c4d5e6f7g8h0`).

---

### Step 21 — Establish Secure Link (ALB ➔ Task Inbound Rule)

*   **Command to Run:**
    ```powershell
    aws ec2 authorize-security-group-ingress `
      --group-id sg-1a2b3c4d5e6f7g8h0 `
      --protocol tcp `
      --port 8080 `
      --source-group sg-0a1b2c3d4e5f6g7h8 `
      --region ap-south-1
    ```

*   **Expected CLI Response:**
    ```json
    {
        "Return": true,
        "SecurityGroupRules": [
            {
                "SecurityGroupRuleId": "sgr-2a3b4c5d6e7f8g9h0",
                "GroupId": "sg-1a2b3c4d5e6f7g8h0",
                "GroupOwnerId": "473009222991",
                "IsEgress": false,
                "IpProtocol": "tcp",
                "FromPort": 8080,
                "ToPort": 8080,
                "ReferencedGroupInfo": {
                    "GroupId": "sg-0a1b2c3d4e5f6g7h8",
                    "UserId": "473009222991"
                }
            }
        ]
    }
    ```

*   **⚠️ Lookout Point:**
    > **Do not use `--cidr 0.0.0.0/0` on port 8080 here.** The target configuration requires that only the ALB can reach the container tasks. Using a public CIDR bypasses the ALB security rules entirely.

---
---

# PART 6: Target Group & Load Balancer Provisioning

---

### Step 22 — Create Target Group

*   **Command to Run:**
    ```powershell
    aws elbv2 create-target-group `
      --name ticketdesk-m0-tg-new `
      --protocol HTTP `
      --port 8080 `
      --target-type ip `
      --vpc-id vpc-0be1f9570a43a53a9 `
      --health-check-protocol HTTP `
      --health-check-path /health `
      --health-check-port traffic-port `
      --health-check-interval-seconds 30 `
      --health-check-timeout-seconds 5 `
      --healthy-threshold-count 2 `
      --unhealthy-threshold-count 3 `
      --matcher HttpCode=200 `
      --region ap-south-1
    ```

*   **Expected CLI Response:**
    ```json
    {
        "TargetGroups": [
            {
                "TargetGroupArn": "arn:aws:elasticloadbalancing:ap-south-1:473009222991:targetgroup/ticketdesk-m0-tg-new/4f1c3125bdbe8bb7",
                "TargetGroupName": "ticketdesk-m0-tg-new",
                "Protocol": "HTTP",
                "Port": 8080,
                "VpcId": "vpc-0be1f9570a43a53a9",
                "HealthCheckProtocol": "HTTP",
                "HealthCheckPort": "traffic-port",
                "HealthCheckEnabled": true,
                "HealthCheckIntervalSeconds": 30,
                "HealthCheckTimeoutSeconds": 5,
                "HealthyThresholdCount": 2,
                "UnhealthyThresholdCount": 3,
                "HealthCheckPath": "/health",
                "Matcher": {
                    "HttpCode": "200"
                },
                "TargetType": "ip"
            }
        ]
    }
    ```
    > [!IMPORTANT]
    > Extract and save the returned `TargetGroupArn` as **`TARGET_GROUP_ARN`** (e.g. `arn:aws:elasticloadbalancing:ap-south-1:473009222991:targetgroup/ticketdesk-m0-tg-new/4f1c3125bdbe8bb7`).

*   **⚠️ Lookout Point:**
    > *   Ensure `--target-type` is explicitly set to **`ip`**. Fargate requires IP-based target routing (using `instance` mode will fail to register the tasks).
    > *   Double check that `--health-check-path` is exactly `/health` (since your custom controller exposes health there, not `/actuator/health` or `/`).

---

### Step 23 — Create Application Load Balancer

*   **Command to Run:**
    ```powershell
    aws elbv2 create-load-balancer `
      --name ticketdesk-m0-alb-new `
      --subnets subnet-072dd56866b89d892 subnet-07068222dc346c028 `
      --security-groups sg-0a1b2c3d4e5f6g7h8 `
      --scheme internet-facing `
      --type application `
      --ip-address-type ipv4 `
      --region ap-south-1
    ```

*   **Expected CLI Response:**
    ```json
    {
        "LoadBalancers": [
            {
                "LoadBalancerArn": "arn:aws:elasticloadbalancing:ap-south-1:473009222991:loadbalancer/app/ticketdesk-m0-alb-new/7c1c3125bdbe8bb8",
                "DNSName": "ticketdesk-m0-alb-new-473009222.ap-south-1.elb.amazonaws.com",
                "CanonicalHostedZoneId": "Z2F56UZL2M1ACD",
                "CreatedTime": "2026-08-10T17:35:00.000Z",
                "LoadBalancerName": "ticketdesk-m0-alb-new",
                "Scheme": "internet-facing",
                "VpcId": "vpc-0be1f9570a43a53a9",
                "State": {
                    "Code": "provisioning"
                },
                "Type": "application",
                "AvailabilityZones": [
                    {
                        "ZoneName": "ap-south-1a",
                        "SubnetId": "subnet-072dd56866b89d892"
                    },
                    {
                        "ZoneName": "ap-south-1b",
                        "SubnetId": "subnet-07068222dc346c028"
                    }
                ],
                "SecurityGroups": [
                    "sg-0a1b2c3d4e5f6g7h8"
                ],
                "IpAddressType": "ipv4"
            }
        ]
    }
    ```
    > [!IMPORTANT]
    > Extract and save the returned load balancer ARN as **`ALB_ARN`** (e.g. `arn:aws:elasticloadbalancing:ap-south-1:473009222991:loadbalancer/app/ticketdesk-m0-alb-new/7c1c3125bdbe8bb8`) and the `DNSName` for service verification.

*   **⚠️ Lookout Point:**
    > Ensure that you attach the **ALB Security Group** (`ALB_SG`), **not** the ECS Task Security Group (`TASK_SG`), to the load balancer definition.

---

### Step 24 — Create ALB HTTP Listener

*   **Command to Run:**
    ```powershell
    aws elbv2 create-listener `
      --load-balancer-arn arn:aws:elasticloadbalancing:ap-south-1:473009222991:loadbalancer/app/ticketdesk-m0-alb-new/7c1c3125bdbe8bb8 `
      --protocol HTTP `
      --port 80 `
      --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:ap-south-1:473009222991:targetgroup/ticketdesk-m0-tg-new/4f1c3125bdbe8bb7 `
      --region ap-south-1
    ```

*   **Expected CLI Response:**
    ```json
    {
        "Listeners": [
            {
                "ListenerArn": "arn:aws:elasticloadbalancing:ap-south-1:473009222991:listener/app/ticketdesk-m0-alb-new/7c1c3125bdbe8bb8/9d1c3125bdbe8bb9",
                "LoadBalancerArn": "arn:aws:elasticloadbalancing:ap-south-1:473009222991:loadbalancer/app/ticketdesk-m0-alb-new/7c1c3125bdbe8bb8",
                "Port": 80,
                "Protocol": "HTTP",
                "DefaultActions": [
                    {
                        "Type": "forward",
                        "TargetGroupArn": "arn:aws:elasticloadbalancing:ap-south-1:473009222991:targetgroup/ticketdesk-m0-tg-new/4f1c3125bdbe8bb7"
                    }
                ]
            }
        ]
    }
    ```

---
---

# PART 7: Task Definition Verification & ECS Service Deployment

---

### Step 25 — Review Register Task Definition

*   **Command to Run:**
    ```powershell
    aws ecs describe-task-definition `
      --task-definition ticketdesk-mo-task:1 `
      --region ap-south-1
    ```

*   **Expected CLI Response:**
    ```json
    {
        "taskDefinition": {
            "taskDefinitionArn": "arn:aws:ecs:ap-south-1:473009222991:task-definition/ticketdesk-mo-task:1",
            "containerDefinitions": [
                {
                    "name": "ticketdesk-backend",
                    "image": "473009222991.dkr.ecr.ap-south-1.amazonaws.com/ticketdesk-backend:m0",
                    "cpu": 256,
                    "memory": 512,
                    "portMappings": [
                        {
                            "containerPort": 8080,
                            "hostPort": 8080,
                            "protocol": "tcp"
                        }
                    ],
                    "essential": true,
                    "environment": [],
                    "mountPoints": [],
                    "volumesFrom": []
                }
            ],
            "family": "ticketdesk-mo-task",
            "revision": 1,
            "networkMode": "awsvpc",
            "requiresCompatibilities": [
                "FARGATE"
            ],
            "cpu": "256",
            "memory": "512"
        }
    }
    ```

*   **Verification Checkpoint:**
    > [!IMPORTANT]
    > Confirm the container exposes port `8080` and references the exact repository image tag `m0`.

*   **⚠️ Lookout Point:**
    > If the task definition fails to retrieve or does not match this format, register a corrected one. Mismatches between container ports (e.g. 8080) and target groups will cause silent routing failure.

---

### Step 26 — Create the Fargate Service

*   **Command to Run:**
    ```powershell
    aws ecs create-service `
      --cluster ticketdesk-m0-cluster `
      --service-name ticketdesk-m0-service `
      --task-definition ticketdesk-mo-task:1 `
      --desired-count 1 `
      --launch-type FARGATE `
      --platform-version LATEST `
      --network-configuration "awsvpcConfiguration={subnets=[subnet-072dd56866b89d892,subnet-07068222dc346c028],securityGroups=[sg-1a2b3c4d5e6f7g8h0],assignPublicIp=ENABLED}" `
      --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:ap-south-1:473009222991:targetgroup/ticketdesk-m0-tg-new/4f1c3125bdbe8bb7,containerName=ticketdesk-backend,containerPort=8080" `
      --health-check-grace-period-seconds 60 `
      --region ap-south-1
    ```

*   **Expected CLI Response:**
    ```json
    {
        "service": {
            "serviceArn": "arn:aws:ecs:ap-south-1:473009222991:service/ticketdesk-m0-cluster/ticketdesk-m0-service",
            "serviceName": "ticketdesk-m0-service",
            "clusterArn": "arn:aws:ecs:ap-south-1:473009222991:cluster/ticketdesk-m0-cluster",
            "loadBalancers": [
                {
                    "targetGroupArn": "arn:aws:elasticloadbalancing:ap-south-1:473009222991:targetgroup/ticketdesk-m0-tg-new/4f1c3125bdbe8bb7",
                    "containerName": "ticketdesk-backend",
                    "containerPort": 8080
                }
            ],
            "desiredCount": 1,
            "runningCount": 0,
            "pendingCount": 1,
            "launchType": "FARGATE",
            "platformVersion": "LATEST",
            "taskDefinition": "arn:aws:ecs:ap-south-1:473009222991:task-definition/ticketdesk-mo-task:1",
            "deploymentConfiguration": {
                "maximumPercent": 200,
                "minimumHealthyPercent": 100
            },
            "networkConfiguration": {
                "awsvpcConfiguration": {
                    "subnets": [
                        "subnet-072dd56866b89d892",
                        "subnet-07068222dc346c028"
                ],
                "securityGroups": [
                    "sg-1a2b3c4d5e6f7g8h0"
                ],
                "assignPublicIp": "ENABLED"
                }
            },
            "status": "ACTIVE",
            "healthCheckGracePeriodSeconds": 60
        }
    }
    ```

*   **⚠️ Lookout Point:**
    *   Ensure `--health-check-grace-period-seconds` is set to at least **`60`** seconds. The JVM runtime container requires time to warm up. Lacking this grace period triggers premature task termination by ECS.
    *   `assignPublicIp=ENABLED` is **mandatory** for Fargate tasks launched in public subnets, as they require access to ECR endpoints to pull application docker images.

---
---

# PART 8: Live Health Checks & Connection Verification

---

### Step 27 — Monitor Fargate Task Startup

*   **Command to Run:**
    ```powershell
    aws ecs list-tasks --cluster ticketdesk-m0-cluster --service-name ticketdesk-m0-service --region ap-south-1
    ```

*   **Expected CLI Response:**
    ```json
    {
        "taskArns": [
            "arn:aws:ecs:ap-south-1:473009222991:task/ticketdesk-m0-cluster/a1b2c3d4e5f6g7h8i9j0"
        ]
    }
    ```

*   **Command to Run:**
    ```powershell
    aws ecs describe-services --cluster ticketdesk-m0-cluster --services ticketdesk-m0-service --region ap-south-1
    ```

*   **Expected CLI Response:**
    ```json
    {
        "services": [
            {
                "serviceArn": "arn:aws:ecs:ap-south-1:473009222991:service/ticketdesk-m0-cluster/ticketdesk-m0-service",
                "serviceName": "ticketdesk-m0-service",
                "clusterArn": "arn:aws:ecs:ap-south-1:473009222991:cluster/ticketdesk-m0-cluster",
                "status": "ACTIVE",
                "desiredCount": 1,
                "runningCount": 1,
                "pendingCount": 0,
                "deployments": [
                    {
                        "status": "PRIMARY",
                        "desiredCount": 1,
                        "pendingCount": 0,
                        "runningCount": 1
                    }
                ]
            }
        ]
    }
    ```

*   **Verification Checkpoint:**
    > [!IMPORTANT]
    > Wait until `runningCount` reaches `1` and `pendingCount` turns to `0`.

*   **⚠️ Lookout Point:**
    > If the task repeatedly fails or restarts, run `aws ecs describe-tasks` or view CloudWatch application stdout logs to check for active runtime connection crashes.

---

### Step 28 — Query Target Health Status

*   **Command to Run:**
    ```powershell
    aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:ap-south-1:473009222991:targetgroup/ticketdesk-m0-tg-new/4f1c3125bdbe8bb7 --region ap-south-1
    ```

*   **Expected CLI Response:**
    ```json
    {
        "TargetHealthDescriptions": [
            {
                "Target": {
                    "Id": "10.0.1.25",
                    "Port": 8080
                },
                "HealthCheckPort": "8080",
                "TargetHealth": {
                    "State": "healthy"
                }
            }
        ]
    }
    ```

*   **Verification Checkpoint:**
    > [!IMPORTANT]
    > Keep checking target health state until the `State` registers as **`healthy`**.

*   **⚠️ Lookout Point:**
    > If target status states `draining` or `unused`, verify that the task security group ingress rule correctly points to the ALB security group port 8080.

---

### Step 29 — Retrieve DNS Endpoint URL

*   **Command to Run:**
    ```powershell
    aws elbv2 describe-load-balancers `
      --names ticketdesk-m0-alb-new `
      --query "LoadBalancers[0].DNSName" `
      --output text `
      --region ap-south-1
    ```

*   **Expected CLI Response:**
    ```text
    ticketdesk-m0-alb-new-473009222.ap-south-1.elb.amazonaws.com
    ```

---

### Step 30 — Perform Live Remote Health Check

*   **Command to Run:**
    ```powershell
    curl http://ticketdesk-m0-alb-new-473009222.ap-south-1.elb.amazonaws.com/health
    ```

*   **Expected CLI Response:**
    ```json
    {
      "status": "UP"
    }
    ```

---
---

# 🔍 Troubleshooting Guide

If the target health check remains unhealthy or fails, review the common failure modes below:

### 1. Target Health: `Request timed out`
* **Meaning:** The ALB cannot connect to the Fargate container on port `8080`.
* **Remedy:**
  * Double check the inbound rules for the **Task Security Group (`TASK_SG`)**. It must explicitly allow ingress from the **ALB Security Group (`ALB_SG`)** on TCP port `8080`.
  * Ensure the tasks are launching in the same subnets as the ALB.
  * Ensure your Spring Boot container exposes port `8080` and binds to host address `0.0.0.0` (not `127.0.0.1` or `localhost`).

### 2. Target Health: `Target.ResponseCodeMismatch`
* **Meaning:** The container answered the health check connection but did not return a `200 OK`.
* **Remedy:**
  * Check the logs of the Fargate container using AWS CloudWatch.
  * Common cause: The application failed to startup (e.g., due to database connectivity errors or active profile issues). Ensure correct environment configuration.
  * Confirm that hitting `GET /health` returns HTTP 200 locally.

### 3. Target Health: `Target.NotInUse`
* **Meaning:** The target is registered, but not receiving traffic from the ALB listener.
* **Remedy:**
  * Verify the listener is configured on Port `80` (HTTP) and forwarding requests to the target group.
  * Verify that target group properties have target type set to `ip`.
