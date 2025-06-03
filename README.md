## Backend

The backend service is written in Go and provides the following functionalities:
- URL shortening
- URL redirection

### Running the Backend

1. Ensure you have Docker and node installed.
3. Run cmd:
   ```bash
   npm install
   ```
3. Then, create image with:
   ```bash
   docker build -t url-shortener .
   ```
4. Authenticate with ECR:
   ```bash  
   aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com
   ```
5. Push image to ECR repo:
   ```bash
   docker tag url-shortener:latest <account-id>.dkr.ecr.<region>.amazonaws.com/url-shortener:latest
   docker push <account-id>.dkr.ecr.<region>.amazonaws.com/url-shortener:latest
   ```
5. Deploy with cloudformation:
   ```bash
   aws cloudformation deploy --template-file cloudformation.yml --stack-name url-shortener-stack \
  --parameter-overrides \
  PGHost=url-shortener-db.cmnwyi0i2y3j.us-east-1.rds.amazonaws.com \
  PGUser=<user> \
  PGPassword=<password> \
  PGDatabase=<db-name> \
  VPCId=<vpc-id> \
  Subnet1=<subnet1-id> \
  Subnet2=<subnet2-id> \
  ECSSecurityGroupId=<ECS-sg-id> \
  RouteTableId=<route_table-id> \
  --region <region> \
  --capabilities CAPABILITY_IAM
   ```

