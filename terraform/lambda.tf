data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "${path.module}/lambda.zip"
  
  source {
    content  = <<EOF
import urllib.parse
import boto3

s3 = boto3.client('s3')

def handler(event, context):
    print("S3 Event received:", event)
    for record in event.get('Records', []):
        bucket = record['s3']['bucket']['name']
        key = urllib.parse.unquote_plus(record['s3']['object']['key'])
        
        # Avoid infinite loop
        if key.startswith('thumbnails/'):
            print(f"Skipping thumbnail key: {key}")
            continue
            
        print(f"Processing image {key} from bucket {bucket}")
        thumbnail_key = f"thumbnails/{key}"
        try:
            s3.put_object(
                Bucket=bucket,
                Key=thumbnail_key,
                Body=f"Mock thumbnail for {key}".encode('utf-8'),
                ContentType='text/plain'
            )
            print(f"Successfully generated thumbnail: {thumbnail_key}")
        except Exception as e:
            print(f"Error generating thumbnail for {key}: {str(e)}")
            
    return {
        'statusCode': 200,
        'body': 'Thumbnail generation complete'
    }
EOF
    filename = "index.py"
  }
}

resource "aws_iam_role" "lambda_role" {
  name = "ticketdesk-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "lambda_s3_policy" {
  name        = "ticketdesk-lambda-s3-policy"
  description = "Allows Lambda function to get objects and write thumbnails"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = [
          "${aws_s3_bucket.uploads.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_s3" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_s3_policy.arn
}

resource "aws_lambda_function" "thumbnail" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "ticketdesk-thumbnail-generator"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "python3.9"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
}

resource "aws_lambda_permission" "allow_s3" {
  statement_id  = "AllowExecutionFromS3Bucket"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.thumbnail.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.uploads.arn
}

resource "aws_s3_bucket_notification" "upload_notification" {
  bucket = aws_s3_bucket.uploads.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.thumbnail.arn
    events              = ["s3:ObjectCreated:*"]
  }

  depends_on = [aws_lambda_permission.allow_s3]
}
