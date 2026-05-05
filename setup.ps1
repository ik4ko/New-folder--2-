$ErrorActionPreference = "Stop"

$ProjectId = "medicare-retention-hq"
$BucketName = "phi-storage-medicare-retention-hq"
$Location = "us-central1"

Write-Host "Enabling Cloud Storage API for $ProjectId..."
gcloud services enable storage.googleapis.com --project="$ProjectId"

Write-Host "Creating bucket $BucketName..."
gcloud storage buckets create "gs://$BucketName" `
  --project="$ProjectId" `
  --location="$Location" `
  --uniform-bucket-level-access `
  --public-access-prevention

Write-Host "Bucket gs://$BucketName provisioned successfully."
