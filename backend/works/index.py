import json
import os
import base64
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Manage portfolio works (create, read, update, delete)
    Args: event with httpMethod, body, queryStringParameters
    Returns: HTTP response with works data or success status
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    database_url = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if method == 'GET':
            cursor.execute(
                "SELECT w.*, u.nickname as author_nickname FROM works w LEFT JOIN users u ON w.user_id = u.id ORDER BY w.created_at DESC"
            )
            works = cursor.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'works': [dict(work) for work in works]}, default=str)
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            user_id = body_data.get('user_id')
            title = body_data.get('title', 'Без названия')
            description = body_data.get('description', '')
            image_data = body_data.get('image_data')
            price = body_data.get('price')
            
            if not user_id or not image_data:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'User ID and image data are required'})
                }
            
            cursor.execute(
                "INSERT INTO works (user_id, title, description, image_url, price) VALUES (%s, %s, %s, %s, %s) RETURNING id, user_id, title, description, image_url, price, created_at",
                (user_id, title, description, image_data, price)
            )
            work = cursor.fetchone()
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'work': dict(work)}, default=str)
            }
        
        elif method == 'DELETE':
            params = event.get('queryStringParameters', {})
            work_id = params.get('id')
            
            if not work_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Work ID is required'})
                }
            
            cursor.execute("SELECT id FROM works WHERE id = %s", (work_id,))
            work = cursor.fetchone()
            
            if not work:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Work not found'})
                }
            
            cursor.execute("UPDATE works SET image_url = '', title = '[Deleted]' WHERE id = %s", (work_id,))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'message': 'Work deleted'})
            }
        
        else:
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Method not allowed'})
            }
    
    finally:
        cursor.close()
        conn.close()
