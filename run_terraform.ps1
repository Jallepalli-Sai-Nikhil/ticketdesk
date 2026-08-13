# Run Terraform with Exported AWS Credentials
param(
    [string]$Command = "plan"
)

Write-Host "Exporting AWS credentials..." -ForegroundColor Cyan
$credsJson = aws configure export-credentials
if ($LASTEXITCODE -ne 0 -or -not $credsJson) {
    Write-Error "Failed to export AWS credentials. Are you logged in?"
    exit 1
}

$creds = $credsJson | ConvertFrom-Json

$env:AWS_ACCESS_KEY_ID = $creds.AccessKeyId
$env:AWS_SECRET_ACCESS_KEY = $creds.SecretAccessKey
$env:AWS_SESSION_TOKEN = $creds.SessionToken
$env:AWS_DEFAULT_REGION = "ap-south-1"

Write-Host "Running terraform $Command..." -ForegroundColor Green
if ($Command -eq "apply") {
    & c:\Users\nikhi\Desktop\Ticket\bin\terraform.exe apply -auto-approve
} elseif ($Command -eq "destroy") {
    & c:\Users\nikhi\Desktop\Ticket\bin\terraform.exe destroy -auto-approve
} else {
    & c:\Users\nikhi\Desktop\Ticket\bin\terraform.exe plan
}
