const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const s3Client = new S3Client({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const BUCKET_NAME = 'cloud-file-storage-shreya-1';
const TABLE_NAME = 'FileMetadata';

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,file-name',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,DELETE'
    };

    try {
        // Get file name from headers
        const fileName = event.headers['file-name'] || event.headers['File-Name'] || 'unnamed-file';
        const contentType = event.headers['content-type'] || event.headers['Content-Type'] || 'application/octet-stream';
        
        // Get user info from the authorizer context (Cognito)
        const claims = event.requestContext?.authorizer?.claims || {};
        const userId = claims.sub || claims['cognito:username'] || 'anonymous';
        const userEmail = claims.email || 'unknown';
        const userRole = claims['custom:role'] || 'user';
        
        // Decode body if base64 encoded
        let fileContent;
        if (event.isBase64Encoded) {
            fileContent = Buffer.from(event.body, 'base64');
        } else {
            fileContent = Buffer.from(event.body || '');
        }
        
        // Generate unique file ID
        const fileId = uuidv4();
        const s3Key = `${userId}/${fileId}-${fileName}`;
        
        // Upload to S3
        const s3Command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: fileContent,
            ContentType: contentType
        });
        
        await s3Client.send(s3Command);
        console.log('File uploaded to S3:', s3Key);
        
        // Save metadata to DynamoDB
        const metadata = {
            fileId: fileId,
            fileName: fileName,
            s3Key: s3Key,
            contentType: contentType,
            size: fileContent.length,
            uploadedBy: userEmail,
            userId: userId,
            userRole: userRole,
            uploadedAt: new Date().toISOString()
        };
        
        const dynamoCommand = new PutCommand({
            TableName: TABLE_NAME,
            Item: metadata
        });
        
        await docClient.send(dynamoCommand);
        console.log('Metadata saved to DynamoDB:', fileId);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                message: 'File uploaded successfully',
                fileId: fileId,
                fileName: fileName
            })
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
