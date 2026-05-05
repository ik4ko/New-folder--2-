#!/bin/bash

# Default project from .firebaserc
PROJECT_ID="studio-8121503591-3aa91"
BUCKET_NAME="phi-storage-$PROJECT_ID"
LOCATION="us-central1"

echo "Enabling Cloud Storage API..."
gcloud services enable storage.googleapis.com --project="$PROJECT_ID"

echo "Creating bucket $BUCKET_NAME..."
gcloud storage buckets create "gs://$BUCKET_NAME" \
  --project="$PROJECT_ID" \
  --location="$LOCATION" \
  --uniform-bucket-level-access \
  --public-access-prevention

echo "Bucket gs://$BUCKET_NAME provisioned successfully."
