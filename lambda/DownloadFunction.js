const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

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
        // Parse request body
        let body;
        if (event.body) {
            body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        } else {
            throw new Error('Request body is required');
        }
        
        const { fileName } = body;
        
        if (!fileName) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'fileName is required' })
            };
        }
        
        // Find file in DynamoDB by fileName
        const scanCommand = new ScanCommand({
            TableName: TABLE_NAME,
            FilterExpression: 'fileName = :fileName',
            ExpressionAttributeValues: {
                ':fileName': fileName
            }
        });
        
        const scanResult = await docClient.send(scanCommand);
        
        if (!scanResult.Items || scanResult.Items.length === 0) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'File not found' })
            };
        }
        
        const fileMetadata = scanResult.Items[0];
        const s3Key = fileMetadata.s3Key;
        
        // Generate presigned URL for download (valid for 1 hour)
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key
        });
        
        const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        
        console.log('Generated download URL for:', s3Key);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                downloadUrl: downloadUrl,
                fileName: fileMetadata.fileName,
                contentType: fileMetadata.contentType
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
