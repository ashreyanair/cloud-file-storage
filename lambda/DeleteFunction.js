const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

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
        // Get user role from Cognito claims
        const claims = event.requestContext?.authorizer?.claims || {};
        const userRole = claims['custom:role'] || 'user';
        
        // Only admins can delete
        if (userRole !== 'admin') {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ error: 'Access Denied: Admins Only' })
            };
        }
        
        // Parse request body
        let body;
        if (event.body) {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } else {
            throw new Error('Request body is required');
        }
        
        const { fileId } = body;
        
        if (!fileId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'fileId is required' })
            };
        }
        
        // Get file metadata from DynamoDB
        const getCommand = new GetCommand({
            TableName: TABLE_NAME,
            Key: { fileId: fileId }
        });
        
        const getResult = await docClient.send(getCommand);
        
        if (!getResult.Item) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'File not found' })
            };
        }
        
        const s3Key = getResult.Item.s3Key;
        
        // Delete from S3
        const s3Command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key
        });
        
        await s3Client.send(s3Command);
        console.log('Deleted from S3:', s3Key);
        
        // Delete from DynamoDB
        const deleteCommand = new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { fileId: fileId }
        });
        
        await docClient.send(deleteCommand);
        console.log('Deleted from DynamoDB:', fileId);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                message: 'File deleted successfully',
                fileId: fileId
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
