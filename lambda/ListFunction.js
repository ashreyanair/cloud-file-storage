const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'FileMetadata';

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,file-name',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,DELETE'
    };

    try {
        // Get all files from DynamoDB
        const command = new ScanCommand({
            TableName: TABLE_NAME
        });
        
        const response = await docClient.send(command);
        const files = response.Items || [];
        
        console.log('Files found:', files.length);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(files)
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
