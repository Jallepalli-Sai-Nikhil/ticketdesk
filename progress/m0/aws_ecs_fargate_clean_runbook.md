# AWS ECS Fargate + ALB Resource Guide: Get & Clean Up Commands (ap-south-1)

This runbook contains the exact sequence of **GET** (discovery) and **DELETE** (destruction) commands for your current stack in `ap-south-1`. All commands are pre-populated with your live AWS resource IDs.

---

## 🔍 Part 1: Resource Discovery (GET/Describe Commands)
Run these commands to verify the status, configuration, and IDs of your active AWS resources.

### 1. Identify ECS Clusters
```powershell
aws ecs list-clusters --region ap-south-1
```
**Expected Output:**
```json
{
    "clusterArns": [
        "arn:aws:ecs:ap-south-1:473009222991:cluster/ticketdesk-m0-cluster"
    ]
}
```

### 2. Identify ECS Services (for ticketdesk-m0-cluster)
```powershell
aws ecs list-services --cluster ticketdesk-m0-cluster --region ap-south-1
```
**Expected Output:**
```json
{
    "serviceArns": [
        "arn:aws:ecs:ap-south-1:473009222991:service/ticketdesk-m0-cluster/ticketdesk-m0-service"
    ]
}
```

### 3. Get ECS Running Task IDs
```powershell
aws ecs list-tasks --cluster ticketdesk-m0-cluster --service-name ticketdesk-m0-service --region ap-south-1
```
**Expected Output:**
```json
{
    "taskArns": [
        "arn:aws:ecs:ap-south-1:473009222991:task/ticketdesk-m0-cluster/<TASK_ID>"
    ]
}
```

### 4. Describe Load Balancers (ALBs)
```powershell
aws elbv2 describe-load-balancers --region ap-south-1 --query "LoadBalancers[].{Name:LoadBalancerName,Arn:LoadBalancerArn,Vpc:VpcId,SGs:SecurityGroups}" --output json
```
**Expected Output:**
```json
[
    {
        "Name": "ticketdesk-m0-alb",
        "Arn": "arn:aws:elasticloadbalancing:ap-south-1:473009222991:loadbalancer/app/ticketdesk-m0-alb/0e262fcdb92e0b77",
        "Vpc": "vpc-0be1f9570a43a53a9",
        "SGs": [
            "sg-08c3552dcb84eb415"
        ]
    }
]
```

### 5. Describe Target Groups
```powershell
aws elbv2 describe-target-groups --region ap-south-1 --query "TargetGroups[].{Name:TargetGroupName,Arn:TargetGroupArn,Vpc:VpcId,Port:Port}" --output json
```
**Expected Output:**
```json
[
    {
        "Name": "ticketdesk-m0-tg",
        "Arn": "arn:aws:elasticloadbalancing:ap-south-1:473009222991:targetgroup/ticketdesk-m0-tg/da7fb0a4f0d0b7cb",
        "Vpc": "vpc-0be1f9570a43a53a9",
        "Port": 8080
    }
]
```

### 6. Describe ECR Repositories
```powershell
aws ecr describe-repositories --region ap-south-1
```
**Expected Output:**
```json
{
    "repositories": [
        {
            "repositoryArn": "arn:aws:ecr:ap-south-1:473009222991:repository/ticketdesk-backend",
            "repositoryName": "ticketdesk-backend",
            "repositoryUri": "473009222991.dkr.ecr.ap-south-1.amazonaws.com/ticketdesk-backend",
            ...
        }
    ]
}
```

### 7. Describe Security Groups in the VPC
```powershell
aws ec2 describe-security-groups --filters Name=vpc-id,Values=vpc-0be1f9570a43a53a9 --region ap-south-1 --query "SecurityGroups[].{Name:GroupName,ID:GroupId}" --output json
```
**Expected Output:**
```json
[
    {
        "Name": "default",
        "ID": "sg-02ac868dfbf6cab98"
    },
    {
        "Name": "ticketdesk-m0-task-sg",
        "ID": "sg-0e91561fa327a6be0"
    },
    {
        "Name": "ticketdesk-m0-alb-sg-new",
        "ID": "sg-08c3552dcb84eb415"
    }
]
```

---

## 🗑️ Part 2: Resource Clean Up (DELETE Commands in Correct Sequence)

> [!CAUTION]
> You must run these deletion steps in the exact sequence outlined below. Attempting to delete resources out of order will result in dependency lock errors (e.g. deleting a Security Group that is still attached to an active ENI).

### Step 1: Scale Down & Delete ECS Service
Before deleting the service, scale the active tasks down to `0` to trigger container shutdown and ENI teardown.
```powershell
aws ecs update-service `
  --cluster ticketdesk-m0-cluster `
  --service ticketdesk-m0-service `
  --desired-count 0 `
  --region ap-south-1
```
Wait **1 to 2 minutes** for tasks to terminate, then delete the service:
```powershell
aws ecs delete-service `
  --cluster ticketdesk-m0-cluster `
  --service ticketdesk-m0-service `
  --force `
  --region ap-south-1
```
Verify the service is deleted (should return an empty list):
```powershell
aws ecs list-services --cluster ticketdesk-m0-cluster --region ap-south-1
```

### Step 2: Delete ECS Cluster
Once all services inside the cluster are deleted, delete the cluster:
```powershell
aws ecs delete-cluster --cluster ticketdesk-m0-cluster --region ap-south-1
```

### Step 3: Delete the Application Load Balancer (ALB)
```powershell
aws elbv2 delete-load-balancer `
  --load-balancer-arn "arn:aws:elasticloadbalancing:ap-south-1:473009222991:loadbalancer/app/ticketdesk-m0-alb/0e262fcdb92e0b77" `
  --region ap-south-1
```

### Step 4: Delete the Target Group
Wait for the ALB deletion to complete (usually takes about 30 seconds), then delete the Target Group:
```powershell
aws elbv2 delete-target-group `
  --target-group-arn "arn:aws:elasticloadbalancing:ap-south-1:473009222991:targetgroup/ticketdesk-m0-tg/da7fb0a4f0d0b7cb" `
  --region ap-south-1
```

### Step 5: Force-Delete ECR Repository
This will delete the repository along with all hosted Docker images (including tags like `188bad7`):
```powershell
aws ecr delete-repository `
  --repository-name ticketdesk-backend `
  --force `
  --region ap-south-1
```

### Step 6: Delete Security Groups
> [!WARNING]
> You must delete the **Task Security Group** first, and then the **ALB Security Group**. AWS requires Fargate's ENIs to detach before the groups can be deleted (takes ~3 minutes after service shutdown).
> To check if any ENIs are still attached, run:
> `aws ec2 describe-network-interfaces --filters Name=vpc-id,Values=vpc-0be1f9570a43a53a9 --region ap-south-1`

Delete Task Security Group:
```powershell
aws ec2 delete-security-group --group-id sg-0e91561fa327a6be0 --region ap-south-1
```

Delete ALB Security Group:
```powershell
aws ec2 delete-security-group --group-id sg-08c3552dcb84eb415 --region ap-south-1
```
