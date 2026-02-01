import json

def handle_auth(path, command, headers, rfile):
    if path == '/api/auth/me':
        return {
            "username": "admin", 
            "displayName": "Admin User", 
            "roles": ["MANAGER", "DIRECTOR"],
            "permissions": ["read", "write", "admin"]
        }
    return None
