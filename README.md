# Holotor User Bonus Videos project 

This is a CloudFormation project for public API that gives clients a way to fetch bonus video downloadable link

## Deployment commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

## AWS SDK commands
- `aws dynamodb list-tables --profile dynamo-db-local --endpoint http://localhost:8000 --region us-west-2` connect to local DynamoDB
- `aws dynamodb create-table --table-name dev-bonus-videos --attribute-definitions '[{\"AttributeName\": \"video_id\", \"AttributeType\": \"S\"}]' --key-schema '[{\"Attribut
  eName\": \"video_id\", \"KeyType\": \"HASH\"}]' --provisioned-throughput '{\"ReadCapacityUnits\": 5, \"WriteCapacityUnits\": 5}' --profile dynamo-db-local --endpoint http://localhost:8000 --region us-west-2` create table
- `aws s3api create-bucket --bucket dev-holotor-bonus-videos --endpoint http://localhost:4566 --region us-east-1` create s3 bucket