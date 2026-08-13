# TicketDesk Previous Services Cleanup Script
# Run this script after AWS authentication is active

Write-Host "Starting TicketDesk M0/M2 Resource Cleanup..." -ForegroundColor Cyan

# 1. Delete ECS Services
Write-Host "Deleting ECS Services..."
aws ecs update-service --cluster ticketdesk-m0-cluster --service ticketdesk-m0-service --desired-count 0 --region ap-south-1 2>$null
aws ecs delete-service --cluster ticketdesk-m0-cluster --service ticketdesk-m0-service --force --region ap-south-1 2>$null

aws ecs update-service --cluster ticketdesk-m1-cluster --service ticketdesk-m1-service --desired-count 0 --region ap-south-1 2>$null
aws ecs delete-service --cluster ticketdesk-m1-cluster --service ticketdesk-m1-service --force --region ap-south-1 2>$null

# 2. Delete Load Balancers
Write-Host "Deleting Load Balancers..."
$albArn = aws elbv2 describe-load-balancers --names ticketdesk-m0-alb --region ap-south-1 --query "LoadBalancers[0].LoadBalancerArn" --output text 2>$null
if ($albArn -and $albArn -ne "None") {
    aws elbv2 delete-load-balancer --load-balancer-arn $albArn --region ap-south-1
}
$albArnM1 = aws elbv2 describe-load-balancers --names ticketdesk-m1-alb --region ap-south-1 --query "LoadBalancers[0].LoadBalancerArn" --output text 2>$null
if ($albArnM1 -and $albArnM1 -ne "None") {
    aws elbv2 delete-load-balancer --load-balancer-arn $albArnM1 --region ap-south-1
}

# Wait for Load Balancer deletion to free target groups and security groups
Write-Host "Waiting for Load Balancers to delete..."
Start-Sleep -Seconds 30

# 3. Delete Target Groups
Write-Host "Deleting Target Groups..."
$tgArn = aws elbv2 describe-target-groups --names ticketdesk-m0-tg --region ap-south-1 --query "TargetGroups[0].TargetGroupArn" --output text 2>$null
if ($tgArn -and $tgArn -ne "None") {
    aws elbv2 delete-target-group --target-group-arn $tgArn --region ap-south-1
}
$tgArnM1 = aws elbv2 describe-target-groups --names ticketdesk-m1-tg --region ap-south-1 --query "TargetGroups[0].TargetGroupArn" --output text 2>$null
if ($tgArnM1 -and $tgArnM1 -ne "None") {
    aws elbv2 delete-target-group --target-group-arn $tgArnM1 --region ap-south-1
}

# 4. Delete ECS Clusters
Write-Host "Deleting ECS Clusters..."
aws ecs delete-cluster --cluster ticketdesk-m0-cluster --region ap-south-1 2>$null
aws ecs delete-cluster --cluster ticketdesk-m1-cluster --region ap-south-1 2>$null

# 5. Delete Security Groups
Write-Host "Deleting Security Groups..."
$sgs = aws ec2 describe-security-groups --filters "Name=group-name,Values=ticketdesk-m0-alb-sg,ticketdesk-m0-task-sg,ticketdesk-m1-alb-sg,ticketdesk-m1-task-sg" --region ap-south-1 --query "SecurityGroups[].GroupId" --output text 2>$null
if ($sgs) {
    foreach ($sg in $sgs.Split(" ")) {
        if ($sg) {
            aws ec2 delete-security-group --group-id $sg --region ap-south-1 2>$null
        }
    }
}

Write-Host "Cleanup script finished!" -ForegroundColor Green
