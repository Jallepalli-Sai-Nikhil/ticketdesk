# AWS ECS Fargate + ALB Deployment Runbook

This guide provides a step-by-step, interactive runbook to build, Dockerize, deploy, and verify the Spring Boot backend (`ticketdesk-backend`) on AWS ECS Fargate behind an Application Load Balancer (ALB).

---

## 0. Architecture Overview

```text
Internet
   |
   | HTTP :80 (Target: ALB)
   v
+------------------------+
| Application LB         |
| <ALB_NAME>             |
| Security Group         |
| ALB SG: Allow Port 80  |
+-----------+------------+
            |
            | HTTP :8080 (Target: Fargate Task IP)
            v
+------------------------+
| ECS Fargate Task       |
| <CONTAINER_NAME>       |
| Spring Boot Application|
| Listening on 0.0.0.0   |
| Task SG: Allow 8080    |
+-----------+------------+
            |
            v
       Spring Boot
         /health
        returns
     {"status":"UP"}
```

### Traffic Routing & Ports

```text
Internet  ──[Port 80]──>  ALB SG  ──[ALB]  ──[Port 8080]──>  Task SG  ──>  Spring Boot Container (Port 8080)
```

---

## 1. AWS Authentication & Configuration

First, verify that your AWS CLI is authenticated and configure your default region.

```powershell
aws sts get-caller-identity
```

**Expected Output:**
```json
{
    "UserId": "<YOUR_USER_ID>",
    "Account": "<YOUR_AWS_ACCOUNT_ID>",
    "Arn": "arn:aws:iam::<YOUR_AWS_ACCOUNT_ID>:<YOUR_IDENTITY>"
}
```

> [!CAUTION]
> If the `Account` returned is your AWS root account, exercise extreme caution. For production environments, always use an IAM user or role conforming to the Principle of Least Privilege.

Set your default deployment region:
```powershell
aws configure set region <YOUR_AWS_REGION>
```

Verify your configured region:
```powershell
aws configure get region
```

**Expected Output:**
```text
<YOUR_AWS_REGION>
```

> [!IMPORTANT]
> **Save / Note Down:**
> *   AWS Account ID: `____________________` (e.g., `473009222991`)
> *   AWS Region: `____________________` (e.g., `ap-south-1`)

---

## 2. Local Environment Verification

Ensure the target Java Development Kit (JDK) and Maven tools are available in your path.

Set your `JAVA_HOME` environment variable:
```powershell
$env:JAVA_HOME = "<PATH_TO_YOUR_JDK_DIRECTORY>"
```
*Example: `$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-25.0.1.8-hotspot"`*

Verify Java compiler/runtime version:
```powershell
java -version
```

**Expected Output:**
```text
openjdk version "<EXPECTED_JAVA_VERSION>" ...
OpenJDK Runtime Environment ...
```

Verify Maven configuration:
```powershell
mvn -version
```

**Expected Output:**
```text
Apache Maven <EXPECTED_MAVEN_VERSION> ...
Java version: <EXPECTED_JAVA_VERSION> ...
```

---

## 3. Build the Spring Boot JAR

Navigate to the project backend directory and run a clean package build.

```powershell
cd C:\Users\nikhi\Desktop\Ticket\backend
mvn clean package
```

**Expected Output:**
```text
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  ...
[INFO] Finished at: ...
[INFO] ------------------------------------------------------------------------
```

Verify that the build artifact was created:
```powershell
Get-ChildItem target/*.jar
```

**Expected Output:**
```text
    Directory: C:\Users\nikhi\Desktop\Ticket\backend\target

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a---          <DATE>       <SIZE> <YOUR_JAR_NAME>-<VERSION>-SNAPSHOT.jar
```

> [!IMPORTANT]
> **Save / Note Down:**
> *   Built JAR Filename: `____________________` (e.g., `backend-0.0.1-SNAPSHOT.jar`)

---

## 4. Local JAR Run & Health Check

Run the application locally to make sure it boots correctly.

```powershell
java -jar target/<YOUR_JAR_FILENAME>
```

**Expected Output:**
```text
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot :: ...
...
[main] c.t.backend.BackendApplication           : Started BackendApplication in ... seconds
```

From a separate terminal window, query the local health check:
```powershell
curl.exe http://localhost:8080/health
```

**Expected Output:**
```json
{"status":"UP"}
```

> [!WARNING]
> Do **not** proceed to Docker build or AWS deployment if the local health check fails or times out. Resolve local application config issues first.

---

## 5. Application Listening Configuration

For Docker containers and ECS Fargate deployments, the application **must listen on all network interfaces (`0.0.0.0`)**, not just localhost (`127.0.0.1`).

Open the application properties: [application.properties](file:///C:/Users/nikhi/Desktop/Ticket/backend/src/main/resources/application.properties)

Ensure the following configuration keys are set:
```properties
server.port=8080
server.address=0.0.0.0
```

> [!IMPORTANT]
> *   `127.0.0.1` binds exclusively to the loopback adapter inside the container. This makes the port unreachable by the ALB.
> *   `0.0.0.0` allows Spring Boot to listen to incoming connections on all network adapters attached to the container.

---

## 6. Health Controller Setup

Verify that the health check endpoint ([HealthController.java](file:///C:/Users/nikhi/Desktop/Ticket/backend/src/main/java/com/ticketdesk/backend/controller/HealthController.java)) is configured to return a simple `200 OK` status with **no security layers, database queries, or external authentication dependencies** that might fail under load or during startup.

Example implementation:
```java
package com.ticketdesk.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }
}
```

---

## 7. Dockerfile Verification

Review your project's Docker build config: [Dockerfile](file:///C:/Users/nikhi/Desktop/Ticket/backend/Dockerfile)

Ensure that it is configured as follows:
```dockerfile
FROM eclipse-temurin:25-jre-alpine

WORKDIR /app

COPY target/<YOUR_JAR_FILENAME> app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## 8. Build & Test Docker Image Locally

Build the container image:
```powershell
docker build -t <LOCAL_IMAGE_NAME>:<TAG> .
```
*Example: `docker build -t ticketdesk-backend:m0 .`*

Verify that the image is registered locally:
```powershell
docker images
```

**Expected Output:**
```text
REPOSITORY              TAG       IMAGE ID       CREATED         SIZE
<LOCAL_IMAGE_NAME>      <TAG>     <IMAGE_ID>     3 seconds ago   ...
```

Run the container, binding a local host port (`8081`) to the container port (`8080`):
```powershell
docker run --rm -p 8081:8080 <LOCAL_IMAGE_NAME>:<TAG>
```

From another terminal, test the running container:
```powershell
curl.exe http://localhost:8081/health
```

**Expected Output:**
```json
{"status":"UP"}
```

Stop the container (`Ctrl+C` in the running terminal) before proceeding.

---

## 9. Create Elastic Container Registry (ECR) Repo

Check if the target repository already exists:
```powershell
aws ecr describe-repositories --repository-names <REPOSITORY_NAME> --region <YOUR_AWS_REGION>
```

If it does not exist, create it:
```powershell
aws ecr create-repository --repository-name <REPOSITORY_NAME> --region <YOUR_AWS_REGION>
```

**Expected Output:**
```json
{
    "repository": {
        "repositoryArn": "arn:aws:ecr:<YOUR_AWS_REGION>:<YOUR_AWS_ACCOUNT_ID>:repository/<REPOSITORY_NAME>",
        "registryId": "<YOUR_AWS_ACCOUNT_ID>",
        "repositoryName": "<REPOSITORY_NAME>",
        "repositoryUri": "<YOUR_AWS_ACCOUNT_ID>.dkr.ecr.<YOUR_AWS_REGION>.amazonaws.com/<REPOSITORY_NAME>",
        ...
    }
}
```

> [!NOTE]
> If the repository already exists, you will receive a `RepositoryAlreadyExistsException` message. You can safely ignore this error and proceed.

---

## 10. Login to Remote AWS ECR Registry

Authenticate your local Docker CLI daemon to the AWS ECR registry:

```powershell
aws ecr get-login-password --region <YOUR_AWS_REGION> | docker login --username AWS --password-stdin <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.<YOUR_AWS_REGION>.amazonaws.com
```

**Expected Output:**
```text
Login Succeeded
```

---

## 11. Tag the Docker Image

Tag your local build to match the target AWS ECR Repository URL format:

```powershell
docker tag <LOCAL_IMAGE_NAME>:<TAG> <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.<YOUR_AWS_REGION>.amazonaws.com/<REPOSITORY_NAME>:<TAG>
```
*Example: `docker tag ticketdesk-backend:m0 473009222991.dkr.ecr.ap-south-1.amazonaws.com/ticketdesk-backend:m0`*

Verify the tags:
```powershell
docker images
```

**Expected Output:**
```text
REPOSITORY                                                              TAG     IMAGE ID
<YOUR_AWS_ACCOUNT_ID>.dkr.ecr.<YOUR_AWS_REGION>.amazonaws.com/<REPOSITORY_NAME>  <TAG>   <IMAGE_ID>
<LOCAL_IMAGE_NAME>                                                      <TAG>   <IMAGE_ID>
```

---

## 12. Push the Docker Image to AWS ECR

Push the image to your remote registry:

```powershell
docker push <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.<YOUR_AWS_REGION>.amazonaws.com/<REPOSITORY_NAME>:<TAG>
```

Verify that the image is now hosted on AWS ECR:
```powershell
aws ecr describe-images --repository-name <REPOSITORY_NAME> --region <YOUR_AWS_REGION>
```

**Expected Output:**
```json
{
    "imageDetails": [
        {
            "registryId": "<YOUR_AWS_ACCOUNT_ID>",
            "repositoryName": "<REPOSITORY_NAME>",
            "imageDigest": "sha256:...",
            "imageTags": [
                "<TAG>"
            ],
            ...
        }
    ]
}
```

---

## 13. Initialize ECS Cluster

Check if the cluster already exists:
```powershell
aws ecs describe-clusters --clusters <CLUSTER_NAME> --region <YOUR_AWS_REGION>
```

If it does not exist, create a new cluster:
```powershell
aws ecs create-cluster --cluster-name <CLUSTER_NAME> --region <YOUR_AWS_REGION>
```

**Expected Output:**
```json
{
    "cluster": {
        "clusterArn": "arn:aws:ecs:<YOUR_AWS_REGION>:<YOUR_AWS_ACCOUNT_ID>:cluster/<CLUSTER_NAME>",
        "clusterName": "<CLUSTER_NAME>",
        "status": "ACTIVE",
        ...
    }
}
```

> [!IMPORTANT]
> **Save / Note Down:**
> *   ECS Cluster Name: `____________________` (e.g., `ticketdesk-m0-cluster`)

---

## 14. Verify Service-Linked IAM Role

The ECS service uses a service-linked role to configure load balancers and manage ENIs. Verify that it exists:

```powershell
aws iam get-role --role-name AWSServiceRoleForECS
```

If the CLI returns a `NoSuchEntity` error, create the service role:
```powershell
aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com
```

---

## 15. Create Infrastructure Security Groups

Fargate services require a security group structure configured to isolate traffic. You will need:
1.  **ALB Security Group**: Open to public port `80` web traffic.
2.  **Task Security Group**: Open only to incoming traffic on port `8080` originating from the ALB Security Group.

Get your target VPC ID:
```powershell
aws ec2 describe-vpcs --region <YOUR_AWS_REGION> --query "Vpcs[].{VPC:VpcId,CIDR:CidrBlock,Default:IsDefault}" --output table
```

Create the Load Balancer Security Group:
```powershell
aws ec2 create-security-group `
  --group-name <ALB_SG_NAME> `
  --description "Security group for application load balancer" `
  --vpc-id <YOUR_VPC_ID> `
  --region <YOUR_AWS_REGION>
```

Create the Task Security Group:
```powershell
aws ec2 create-security-group `
  --group-name <TASK_SG_NAME> `
  --description "Security group for ECS tasks" `
  --vpc-id <YOUR_VPC_ID> `
  --region <YOUR_AWS_REGION>
```

**Expected Output (for both commands):**
```json
{
    "GroupId": "sg-<GENERATED_SG_ID>"
}
```

> [!IMPORTANT]
> **Save / Note Down:**
> *   VPC ID: `____________________` (e.g., `vpc-0be1f9570a43a53a9`)
> *   ALB Security Group ID: `____________________` (e.g., `sg-08c3552dcb84eb415`)
> *   Task Security Group ID: `____________________` (e.g., `sg-0e91561fa327a6be0`)

---

## 16. Configure ALB Security Group Rules

Allow incoming HTTP (port `80`) traffic from anywhere in the world:

```powershell
aws ec2 authorize-security-group-ingress `
  --group-id <ALB_SG_ID> `
  --protocol tcp `
  --port 80 `
  --cidr 0.0.0.0/0 `
  --region <YOUR_AWS_REGION>
```

> [!NOTE]
> If you get `InvalidPermission.Duplicate`, it means the permission rule already exists.

---

## 17. Configure Task Security Group Rules

Restrict task access to accept port `8080` traffic **only** from the ALB Security Group:

```powershell
aws ec2 authorize-security-group-ingress `
  --group-id <TASK_SG_ID> `
  --protocol tcp `
  --port 8080 `
  --source-group <ALB_SG_ID> `
  --region <YOUR_AWS_REGION>
```

---

## 18. Create the Target Group

Fargate tasks require the target group type to be configured as **`ip`** (instead of `instance`), since tasks run on independent elastic network interfaces inside the VPC.

```powershell
aws elbv2 create-target-group `
  --name <TARGET_GROUP_NAME> `
  --protocol HTTP `
  --port 8080 `
  --target-type ip `
  --vpc-id <YOUR_VPC_ID> `
  --health-check-protocol HTTP `
  --health-check-path /health `
  --health-check-port traffic-port `
  --matcher HttpCode=200 `
  --region <YOUR_AWS_REGION>
```

Verify target group properties:
```powershell
aws elbv2 describe-target-groups --region <YOUR_AWS_REGION> --query "TargetGroups[].{Name:TargetGroupName,Arn:TargetGroupArn,Port:Port,Protocol:Protocol}" --output table
```

> [!IMPORTANT]
> **Save / Note Down:**
> *   Target Group ARN: `____________________` (e.g., `arn:aws:elasticloadbalancing:ap-south-1:473009222991:targetgroup/ticketdesk-m0-tg/da7fb0a4f0d0b7cb`)

---

## 19. Create Application Load Balancer (ALB)

Create the load balancer. The ALB requires at least two subnets located in different availability zones.

Get VPC Subnets:
```powershell
aws ec2 describe-subnets --filters Name=vpc-id,Values=<YOUR_VPC_ID> --region <YOUR_AWS_REGION> --query "Subnets[].{ID:SubnetId,AZ:AvailabilityZone}" --output table
```

Create ALB:
```powershell
aws elbv2 create-load-balancer `
  --name <ALB_NAME> `
  --subnets <SUBNET_ID_A> <SUBNET_ID_B> `
  --security-groups <ALB_SG_ID> `
  --region <YOUR_AWS_REGION>
```

**Expected Output:**
```json
{
    "LoadBalancers": [
        {
            "LoadBalancerArn": "arn:aws:elasticloadbalancing:<YOUR_AWS_REGION>:<YOUR_AWS_ACCOUNT_ID>:loadbalancer/app/<ALB_NAME>/...",
            "DNSName": "<ALB_DNS_NAME>",
            "State": {
                "Code": "provisioning"
            },
            ...
        }
    ]
}
```

> [!IMPORTANT]
> **Save / Note Down:**
> *   ALB ARN: `____________________`
> *   ALB DNS Name: `____________________` (e.g., `ticketdesk-m0-alb-1984093227.ap-south-1.elb.amazonaws.com`)
> *   Subnet A ID: `____________________`
> *   Subnet B ID: `____________________`

---

## 20. Associate HTTP Listener with ALB

Create a listener on the ALB to intercept traffic on port `80` and route it to your Target Group:

```powershell
aws elbv2 create-listener `
  --load-balancer-arn <YOUR_ALB_ARN> `
  --protocol HTTP `
  --port 80 `
  --default-actions Type=forward,TargetGroupArn=<YOUR_TARGET_GROUP_ARN> `
  --region <YOUR_AWS_REGION>
```

**Expected Output:**
```json
{
    "Listeners": [
        {
            "ListenerArn": "arn:aws:elasticloadbalancing:<YOUR_AWS_REGION>:<YOUR_AWS_ACCOUNT_ID>:listener/app/<ALB_NAME>/...",
            "Port": 80,
            "Protocol": "HTTP",
            "DefaultActions": [
                {
                    "Type": "forward",
                    "TargetGroupArn": "<YOUR_TARGET_GROUP_ARN>"
                }
            ],
            ...
        }
    ]
}
```

---

## 21. Register ECS Task Definition

Create a local task configuration file: `task-def.json` (Save it in a scratch directory like `C:\Users\nikhi\.gemini\antigravity\brain\c6e44b8f-7b52-4594-987d-5b96e9222544\scratch\task-def.json`).

```json
{
  "family": "ticketdesk-backend-task",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "ticketdesk-backend",
      "image": "<YOUR_AWS_ACCOUNT_ID>.dkr.ecr.<YOUR_AWS_REGION>.amazonaws.com/<REPOSITORY_NAME>:<TAG>",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8080,
          "hostPort": 8080,
          "protocol": "tcp"
        }
      ]
    }
  ],
  "requiresCompatibilities": [
    "FARGATE"
  ],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::<YOUR_AWS_ACCOUNT_ID>:role/ecsTaskExecutionRole"
}
```

> [!WARNING]
> Fargate tasks require `networkMode` to be set to `awsvpc`. The `executionRoleArn` must point to an IAM Role that contains the `AmazonECSTaskExecutionRolePolicy` policy, enabling Fargate to pull the Docker image from ECR and write logs to CloudWatch.

Register the Task Definition in AWS:
```powershell
aws ecs register-task-definition --cli-input-json file://C:/Users/nikhi/.gemini/antigravity/brain/c6e44b8f-7b52-4594-987d-5b96e9222544/scratch/task-def.json --region <YOUR_AWS_REGION>
```

**Expected Output:**
```json
{
    "taskDefinition": {
        "taskDefinitionArn": "arn:aws:ecs:<YOUR_AWS_REGION>:<YOUR_AWS_ACCOUNT_ID>:task-definition/ticketdesk-backend-task:<REVISION_NUMBER>",
        "family": "ticketdesk-backend-task",
        "revision": <REVISION_NUMBER>,
        ...
    }
}
```

> [!IMPORTANT]
> **Save / Note Down:**
> *   Task Definition Family/Arn: `____________________`

---

## 22. Create ECS Fargate Service

Launch the Fargate service, associating it with your Cluster, subnets, Security Groups, and Target Group:

```powershell
aws ecs create-service `
  --cluster <YOUR_ECS_CLUSTER_NAME> `
  --service-name <YOUR_SERVICE_NAME> `
  --task-definition <YOUR_TASK_DEFINITION_ARN_OR_FAMILY> `
  --desired-count 1 `
  --launch-type FARGATE `
  --network-configuration "awsvpcConfiguration={subnets=[<SUBNET_ID_A>,<SUBNET_ID_B>],securityGroups=[<TASK_SG_ID>],assignPublicIp=ENABLED}" `
  --load-balancers "targetGroupArn=<YOUR_TARGET_GROUP_ARN>,containerName=ticketdesk-backend,containerPort=8080" `
  --region <YOUR_AWS_REGION>
```

> [!TIP]
> Setting `assignPublicIp=ENABLED` allows Fargate tasks deployed in public subnets to directly pull images from Amazon ECR. In a production VPC architecture utilizing private subnets, set this to `DISABLED` and routing outbound traffic through a NAT Gateway.

**Expected Output:**
```json
{
    "service": {
        "serviceArn": "arn:aws:ecs:<YOUR_AWS_REGION>:<YOUR_AWS_ACCOUNT_ID>:service/<CLUSTER_NAME>/<SERVICE_NAME>",
        "serviceName": "<SERVICE_NAME>",
        "clusterArn": "arn:aws:ecs:<YOUR_AWS_REGION>:<YOUR_AWS_ACCOUNT_ID>:cluster/<CLUSTER_NAME>",
        "status": "ACTIVE",
        "desiredCount": 1,
        "runningCount": 0,
        ...
    }
}
```

---

## 23. Verify Running Service Status

Monitor the provisioning status of the ECS service:

```powershell
aws ecs describe-services `
  --cluster <YOUR_ECS_CLUSTER_NAME> `
  --services <YOUR_SERVICE_NAME> `
  --region <YOUR_AWS_REGION> `
  --query "services[0].{Status:status,Desired:desiredCount,Running:runningCount,Pending:pendingCount}" `
  --output table
```

**Expected Output:**
```text
Desired    Running    Pending    Status
1          1          0          ACTIVE
```

---

## 24. Get Running ECS Task ID

Retrieve the running task's ARN:

```powershell
aws ecs list-tasks --cluster <YOUR_ECS_CLUSTER_NAME> --service-name <YOUR_SERVICE_NAME> --region <YOUR_AWS_REGION>
```

**Expected Output:**
```json
{
    "taskArns": [
        "arn:aws:ecs:<YOUR_AWS_REGION>:<YOUR_AWS_ACCOUNT_ID>:task/<CLUSTER_NAME>/<TASK_ID_HASH>"
    ]
}
```

> [!IMPORTANT]
> **Save / Note Down:**
> *   Task ID Hash: `____________________` (e.g., `2ea69cb5337f4d05b6bfdbe68aeba8b4`)

---

## 25. Check Container Startup & Private IP

Describe the state of the Fargate task inside the VPC:

```powershell
aws ecs describe-tasks `
  --cluster <YOUR_ECS_CLUSTER_NAME> `
  --tasks <YOUR_TASK_ID_HASH> `
  --region <YOUR_AWS_REGION> `
  --query "tasks[0].{LastStatus:lastStatus,Desired:desiredStatus,Health:healthStatus,PrivateIP:attachments[0].details[?name=='privateIPv4Address'].value|[0]}" `
  --output table
```

**Expected Output:**
```text
Desired     Health     LastStatus     PrivateIP
RUNNING     UNKNOWN    RUNNING        <CONTAINER_PRIVATE_IP>
```

---

## 26. Check Target Group Health (Critical Check)

Verify that the Load Balancer detects your container as healthy:

```powershell
aws elbv2 describe-target-health --target-group-arn <YOUR_TARGET_GROUP_ARN> --region <YOUR_AWS_REGION> --output table
```

**Expected Output:**
```text
---------------------------------------------
|            DescribeTargetHealth           |
+---------------------+---------------------+
|      Target.Id      |     Target.Port     |
+---------------------+---------------------+
|  <PRIVATE_IP>       |  8080               |
+---------------------+---------------------+

---------------------------------------------
|                TargetHealth               |
+-------------------------------------------+
|                   State                   |
+-------------------------------------------+
|  healthy                                  |
+-------------------------------------------+
```

---

## 27. End-to-End DNS Verification

Retrieve the public DNS record for your ALB:

```powershell
aws elbv2 describe-load-balancers `
  --region <YOUR_AWS_REGION> `
  --query "LoadBalancers[].{Name:LoadBalancerName,DNSName:DNSName,State:State.Code}" `
  --output table
```

Test the live API endpoint using curl:
```powershell
curl.exe -v "http://<YOUR_ALB_DNS_NAME>/health"
```

**Expected Output:**
```text
*   Trying <IP_ADDRESS>:80...
* Connected to <YOUR_ALB_DNS_NAME> (<IP_ADDRESS>) port 80
> GET /health HTTP/1.1
> Host: <YOUR_ALB_DNS_NAME>
> User-Agent: curl/...
> Accept: */*
>
< HTTP/1.1 200
< Content-Type: application/json
< Content-Length: 15
< Connection: keep-alive
<
* Connection #0 to host <YOUR_ALB_DNS_NAME> left intact
{"status":"UP"}
```

---

## 🗑️ Clean Up & Resource Destruction

> [!CAUTION]
> The following steps permanently destroy cloud resources. Execute them strictly in order to avoid dependency locks or dangling infrastructure costs.

### 1. Delete ECS Service
Scale down tasks to 0:
```powershell
aws ecs update-service --cluster <YOUR_ECS_CLUSTER_NAME> --service <YOUR_SERVICE_NAME> --desired-count 0 --region <YOUR_AWS_REGION>
```

Wait 1-2 minutes for task termination, then delete the service:
```powershell
aws ecs delete-service --cluster <YOUR_ECS_CLUSTER_NAME> --service <YOUR_SERVICE_NAME> --force --region <YOUR_AWS_REGION>
```

Verify service is empty:
```powershell
aws ecs list-services --cluster <YOUR_ECS_CLUSTER_NAME> --region <YOUR_AWS_REGION>
```
*Expected output: `"serviceArns": []`*

### 2. Delete ECS Cluster
```powershell
aws ecs delete-cluster --cluster <YOUR_ECS_CLUSTER_NAME> --region <YOUR_AWS_REGION>
```

### 3. Delete Application Load Balancer
```powershell
aws elbv2 delete-load-balancer --load-balancer-arn <YOUR_ALB_ARN> --region <YOUR_AWS_REGION>
```

Verify ALB is deleted:
```powershell
aws elbv2 describe-load-balancers --region <YOUR_AWS_REGION> --query "LoadBalancers[].LoadBalancerName" --output table
```
*Expected: No entry corresponding to your load balancer.*

### 4. Delete Target Group
Wait for the ALB deletion to complete, then delete the Target Group:
```powershell
aws elbv2 delete-target-group --target-group-arn <YOUR_TARGET_GROUP_ARN> --region <YOUR_AWS_REGION>
```

### 5. Force-Delete ECR Repository
Remove ECR repository and all stored image tags:
```powershell
aws ecr delete-repository --repository-name <REPOSITORY_NAME> --force --region <YOUR_AWS_REGION>
```

### 6. Delete Security Groups
> [!WARNING]
> Security groups cannot be deleted if they are currently associated with active ENIs. Fargate ENIs can take up to 3 minutes to detach after tasks terminate. Check interface state using:
> `aws ec2 describe-network-interfaces --filters Name=vpc-id,Values=<YOUR_VPC_ID> --region <YOUR_AWS_REGION>`

Delete the Task Security Group first:
```powershell
aws ec2 delete-security-group --group-id <TASK_SG_ID> --region <YOUR_AWS_REGION>
```

Delete the ALB Security Group second:
```powershell
aws ec2 delete-security-group --group-id <ALB_SG_ID> --region <YOUR_AWS_REGION>
```

---

## 🛠️ Common Errors & Troubleshooting

| Issue / Error | root Cause | Solution |
| :--- | :--- | :--- |
| **`RepositoryAlreadyExists`** | Repo with the name exists in AWS ECR. | Safe to ignore. Proceed to the tagging phase. |
| **`InvalidPermission.Duplicate`** | SG inbound rule already exists. | Safe to ignore. Proceed to the next step. |
| **`TargetHealth State: unhealthy` (Timeout)** | ALB cannot establish connection to container port `8080`. | 1. Confirm `server.address=0.0.0.0` is active. <br>2. Confirm Task SG allows port `8080` from the ALB SG. |
| **`Circuit breaker threshold exceeded`** | Tasks repeatedly fail startup/health checks, triggering rollback. | Run `aws ecs list-tasks --cluster <CLUSTER> --desired-status STOPPED` to find task ID, and run `describe-tasks` on that ID to inspect `stoppedReason`. |
| **`TargetGroupNotFound`** | Referencing a deleted Target Group ARN. | List target groups using `aws elbv2 describe-target-groups` to retrieve the active ARN. |
| **`DependencyViolation`** | Attempting to delete Security Group still associated with tasks or ENIs. | Wait 3 minutes for ECS to complete ENI teardown, then retry deletion. |
| **`ERR_CONNECTION_TIMED_OUT` (Browser)** | Client networking blocks port `80` or ALB is provisioned without public subnets. | Confirm routing from internet to ALB. Run `curl -v http://<ALB_DNS>/health`. If curl succeeds, check local browser caching/proxies. |
