# Cloud File Storage Application

A secure, serverless file storage application built with React and AWS services. Features role-based access control (RBAC) with Admin, User, and Viewer roles.

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Client   │────▶│   API Gateway   │────▶│  Lambda Functions│
│  (AWS Amplify)  │     │  (REST API)     │     │  (Node.js 20.x) │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Amazon Cognito │     │   CloudWatch    │     │   Amazon S3     │
│  (User Pool)    │     │   (Logging)     │     │   (File Storage)│
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │                 │
                                                │   DynamoDB      │
                                                │  (Metadata)     │
                                                │                 │
                                                └─────────────────┘
```

## 🚀 Features

- **Secure Authentication**: AWS Cognito user authentication with JWT tokens
- **Role-Based Access Control (RBAC)**:
  - **Admin**: Can upload, download, and delete files
  - **User**: Can upload and download files
  - **Viewer**: Can only download/view files
- **Serverless Backend**: AWS Lambda functions for all operations
- **Scalable Storage**: Amazon S3 for file storage
- **Metadata Management**: DynamoDB for file metadata
- **CORS Support**: Properly configured for cross-origin requests

## 📁 Project Structure

```
cloud-file-storage/
├── public/                 # Static assets
│   ├── index.html
│   ├── manifest.json
│   └── robots.txt
├── src/                    # React application source
│   ├── App.js              # Main application component
│   ├── App.css             # Application styles
│   ├── index.js            # Entry point
│   └── setupProxy.js       # Development proxy configuration
├── lambda/                 # AWS Lambda function code
│   ├── ListFunction.js     # GET /files - List all files
│   ├── UploadFunction.js   # POST /files - Upload a file
│   ├── DownloadFunction.js # POST /download - Get download URL
│   └── DeleteFunction.js   # POST /delete - Delete a file (Admin only)
├── package.json
└── README.md
```

## 🛠️ AWS Services Setup

### 1. Amazon Cognito (User Pool)

1. Go to **AWS Console → Amazon Cognito → Create User Pool**
2. Configure sign-in options: Email
3. Configure security requirements as needed
4. Create an App Client (no client secret)
5. Add a custom attribute: \`custom:role\` (String) - Values: \`admin\`, \`user\`, \`viewer\`

**Note down:**
- User Pool ID (e.g., \`us-east-1_XXXXXXXXX\`)
- App Client ID (e.g., \`xxxxxxxxxxxxxxxxxxxxxxxxxx\`)

### 2. Amazon S3 (File Storage)

1. Go to **AWS Console → S3 → Create Bucket**
2. Bucket name: \`your-unique-bucket-name\`
3. Region: Same as your other services (e.g., \`us-east-1\`)
4. Block all public access: **Enabled** (files accessed via presigned URLs)

### 3. Amazon DynamoDB (Metadata)

1. Go to **AWS Console → DynamoDB → Create Table**
2. Table name: \`FileMetadata\`
3. Partition key: \`fileId\` (String)
4. Use default settings

### 4. AWS Lambda Functions

Create 4 Lambda functions with **Node.js 20.x** runtime:

| Function Name | Description | Trigger |
|--------------|-------------|---------|
| ListFunction | Lists all files | GET /files |
| UploadFunction | Uploads a file | POST /files |
| DownloadFunction | Generates download URL | POST /download |
| DeleteFunction | Deletes a file (Admin only) | POST /delete |

**For each function:**
1. Copy the corresponding code from the \`lambda/\` folder
2. Set execution role with permissions for S3 and DynamoDB
3. Update the hardcoded values in the code:
   - \`BUCKET_NAME\`: Your S3 bucket name
   - \`TABLE_NAME\`: Your DynamoDB table name

**Required IAM Permissions:**
\`\`\`json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:Scan",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/FileMetadata"
    }
  ]
}
\`\`\`

### 5. Amazon API Gateway

1. Go to **AWS Console → API Gateway → Create REST API**
2. Create resources and methods:

\`\`\`
/files
  ├── GET     → ListFunction (Authorization: CognitoAuth)
  ├── POST    → UploadFunction (Authorization: CognitoAuth)
  └── OPTIONS → Mock (for CORS)

/download
  ├── POST    → DownloadFunction (Authorization: CognitoAuth)
  └── OPTIONS → Mock (for CORS)

/delete
  ├── POST    → DeleteFunction (Authorization: CognitoAuth)
  └── OPTIONS → Mock (for CORS)
\`\`\`

3. Create a **Cognito Authorizer**:
   - Name: \`CognitoAuth\`
   - Type: Cognito
   - User Pool: Your Cognito User Pool
   - Token Source: \`Authorization\`

4. Enable **CORS** for all resources with these headers:
   - \`Access-Control-Allow-Origin\`: \`*\`
   - \`Access-Control-Allow-Headers\`: \`Content-Type,Authorization,file-name\`
   - \`Access-Control-Allow-Methods\`: \`GET,POST,OPTIONS,DELETE\`

5. **Deploy API** to a stage (e.g., \`prod\`)

## 💻 Local Development Setup

### Prerequisites

- Node.js 18+ and npm
- AWS Account with the services configured above

### Installation

1. **Clone the repository:**
   \`\`\`bash
   git clone https://github.com/ashreyanair/cloud-file-storage.git
   cd cloud-file-storage
   \`\`\`

2. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Configure the application:**
   
   Update \`src/App.js\` with your AWS credentials:
   \`\`\`javascript
   const USER_POOL_ID = 'your-user-pool-id';
   const CLIENT_ID = 'your-app-client-id';
   \`\`\`

4. **Update proxy configuration:**
   
   Update \`src/setupProxy.js\` with your API Gateway URL:
   \`\`\`javascript
   target: 'https://your-api-id.execute-api.us-east-1.amazonaws.com',
   \`\`\`

5. **Start the development server:**
   \`\`\`bash
   npm start
   \`\`\`

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧪 Testing

### Create Test Users

1. Go to **AWS Console → Cognito → User Pool → Users**
2. Create users with different roles:
   - Admin user: Set \`custom:role\` = \`admin\`
   - Regular user: Set \`custom:role\` = \`user\`
   - Viewer: Set \`custom:role\` = \`viewer\`

### Test the Application

1. Sign in with a test user
2. Based on the role:
   - **Admin**: Upload, download, delete files
   - **User**: Upload, download files
   - **Viewer**: Download/view files only

## 🚀 Deployment

### Build for Production

\`\`\`bash
npm run build
\`\`\`

### Deploy to AWS Amplify Hosting

1. Go to **AWS Console → AWS Amplify**
2. Connect your GitHub repository
3. Configure build settings
4. Deploy

## �� Troubleshooting

### CORS Errors
- Ensure API Gateway has CORS enabled on all methods
- Check that OPTIONS methods return proper headers
- Verify the proxy configuration in \`setupProxy.js\`

### 403 Forbidden
- Check that the Cognito authorizer is properly configured
- Verify the User Pool ID and Client ID match
- Ensure the token is being sent in the Authorization header

### 502 Bad Gateway
- Check Lambda function logs in CloudWatch
- Verify Lambda has correct IAM permissions
- Ensure DynamoDB table and S3 bucket exist

### Token Expired
- Sign out and sign back in to get a fresh token
- Tokens expire after 60 minutes by default

## 📝 API Reference

### List Files
\`\`\`
GET /files
Authorization: <id_token>

Response: [
  {
    "fileId": "uuid",
    "fileName": "document.pdf",
    "uploadedBy": "user@example.com",
    "uploadedAt": "2024-01-01T00:00:00.000Z",
    "size": 1024
  }
]
\`\`\`

### Upload File
\`\`\`
POST /files
Authorization: <id_token>
Content-Type: <file_mime_type>
file-name: <filename>
Body: <binary_file_data>

Response: {
  "message": "File uploaded successfully",
  "fileId": "uuid",
  "fileName": "document.pdf"
}
\`\`\`

### Download File
\`\`\`
POST /download
Authorization: <id_token>
Content-Type: application/json
Body: { "fileName": "document.pdf" }

Response: {
  "downloadUrl": "https://s3.amazonaws.com/...",
  "fileName": "document.pdf",
  "contentType": "application/pdf"
}
\`\`\`

### Delete File (Admin Only)
\`\`\`
POST /delete
Authorization: <id_token>
Content-Type: application/json
Body: { "fileId": "uuid" }

Response: {
  "message": "File deleted successfully",
  "fileId": "uuid"
}
\`\`\`

## 👥 Authors

- **Shreya Nair** - [GitHub](https://github.com/ashreyanair)

## 📄 License

This project is licensed under the MIT License.
