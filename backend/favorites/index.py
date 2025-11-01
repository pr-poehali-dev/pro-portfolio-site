import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Manage user favorites (add, remove, list)
    Args: event with httpMethod, body (user_id, work_id)
    Returns: HTTP response with favorites data or success status
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    database_url = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(database_url)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if method == 'GET':
            params = event.get('queryStringParameters', {})
            user_id = params.get('user_id')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'User ID is required'})
                }
            
            cursor.execute(
                """SELECT w.*, u.nickname as author_nickname 
                   FROM works w 
                   JOIN favorites f ON w.id = f.work_id 
                   LEFT JOIN users u ON w.user_id = u.id 
                   WHERE f.user_id = %s 
                   ORDER BY f.created_at DESC""",
                (user_id,)
            )
            favorites = cursor.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'favorites': [dict(fav) for fav in favorites]}, default=str)
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            user_id = body_data.get('user_id')
            work_id = body_data.get('work_id')
            
            if not user_id or not work_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'User ID and Work ID are required'})
                }
            
            cursor.execute(
                "INSERT INTO favorites (user_id, work_id) VALUES (%s, %s) ON CONFLICT (user_id, work_id) DO NOTHING RETURNING id",
                (user_id, work_id)
            )
            result = cursor.fetchone()
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'message': 'Added to favorites'})
            }
        
        elif method == 'DELETE':
            params = event.get('queryStringParameters', {})
            user_id = params.get('user_id')
            work_id = params.get('work_id')
            
            if not user_id or not work_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'User ID and Work ID are required'})
                }
            
            cursor.execute(
                "SELECT id FROM favorites WHERE user_id = %s AND work_id = %s",
                (user_id, work_id)
            )
            favorite = cursor.fetchone()
            
            if favorite:
                cursor.execute(
                    "UPDATE favorites SET work_id = NULL WHERE user_id = %s AND work_id = %s",
                    (user_id, work_id)
                )
                conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'message': 'Removed from favorites'})
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
