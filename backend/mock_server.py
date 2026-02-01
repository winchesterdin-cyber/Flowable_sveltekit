#!/usr/bin/env python3
import json
import http.server
import socketserver
from urllib.parse import urlparse, parse_qs

class BPMBackendHandler(http.server.SimpleHTTPRequestHandler):
    def handle_request(self):
        parsed_path = urlparse(self.path)
        
        # CORS headers
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        
        if self.command == 'OPTIONS':
            return

        # Common logic
        response = {}
        
        # Mock API responses
        if parsed_path.path == '/actuator/health':
            response = {"status": "UP", "components": {"db": {"status": "UP", "details": {"database": "H2", "validationQuery": "isValid()"}}}}
        
        elif parsed_path.path == '/api/auth/me':
            response = {
                "username": "admin", 
                "displayName": "Admin User", 
                "roles": ["MANAGER", "DIRECTOR"],
                "permissions": ["read", "write", "admin"]
            }
            
        elif parsed_path.path.endswith('/comments'):
            # Task comments
            # GET /api/tasks/{id}/comments
            # POST /api/tasks/{id}/comments
            if self.command == 'POST':
                # Read body
                length = int(self.headers.get('Content-Length', 0))
                if length > 0:
                    body = json.loads(self.rfile.read(length))
                    response = {
                        "id": "c_new_" + str(parsed_path.path), 
                        "message": body.get('message', ''), 
                        "authorId": "me", 
                        "timestamp": "2024-02-01T12:00:00Z"
                    }
                else:
                    response = {"message": "Comment added"}
            else:
                response = [
                    {"id": "c1", "message": "Can you please clarify the budget?", "authorId": "user2", "timestamp": "2024-02-01T10:00:00Z"},
                    {"id": "c2", "message": "Budget is attached in the documents.", "authorId": "admin", "timestamp": "2024-02-01T10:30:00Z"}
                ]
                
        elif parsed_path.path.endswith('/documents'):
            # Task documents
            if self.command == 'GET':
                response = [
                    {"id": "d1", "name": "invoice_feb.pdf", "type": "application/pdf", "size": 102400, "createdBy": "user1", "createdAt": "2024-02-01T09:00:00Z"},
                    {"id": "d2", "name": "specs_v2.docx", "type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "size": 2048000, "createdBy": "admin", "createdAt": "2024-02-01T11:00:00Z"}
                ]
            elif self.command == 'POST':
                length = int(self.headers.get('Content-Length', 0))
                body = {}
                if length > 0:
                    body = json.loads(self.rfile.read(length))
                response = {"id": "d_new", "name": body.get('name', 'uploaded.file'), "type": body.get('type', 'application/octet-stream'), "size": body.get('size', 1000), "createdBy": "me", "createdAt": "2024-02-01T12:00:00Z"}
            elif self.command == 'DELETE':
                 response = {"message": "Document deleted"}
                 
        elif '/documents/' in parsed_path.path:
             # Specific document delete /api/tasks/{tid}/documents/{did}
             if self.command == 'DELETE':
                 response = {"message": "Document deleted"}
                 
        elif parsed_path.path.endswith('/history'):
            response = [
                {"id": "h1", "taskId": "1", "type": "CREATED", "userId": "system", "userName": "System", "timestamp": "2024-02-01T09:00:00Z", "details": "Task created"},
                {"id": "h2", "taskId": "1", "type": "ASSIGNED", "userId": "manager1", "userName": "Manager", "timestamp": "2024-02-01T09:05:00Z", "details": "Assigned to user"},
                {"id": "h3", "taskId": "1", "type": "COMMENT", "userId": "user2", "userName": "User Two", "timestamp": "2024-02-01T10:00:00Z", "details": "Added a comment"},
                {"id": "h4", "taskId": "1", "type": "DOCUMENT_UPLOAD", "userId": "user1", "userName": "User One", "timestamp": "2024-02-01T11:00:00Z", "details": "Uploaded invoice_feb.pdf"}
            ]
            
        elif parsed_path.path.startswith('/api/tasks'):
            parts = parsed_path.path.split('/')
            # /api/tasks (len 3: '', 'api', 'tasks')
            # /api/tasks/123 (len 4)
            
            if len(parts) == 3:
                # List tasks
                response = {
                    "total": 5,
                    "content": [
                        {"id": "1", "name": "Review Purchase Request", "description": "Review and approve purchase request", "assignee": "admin", "status": "completed", "priority": 50, "dueDate": "2024-02-15T00:00:00Z"},
                        {"id": "2", "name": "Approve Leave Request", "description": "Review leave application", "assignee": None, "status": "pending", "priority": 50},
                        {"id": "3", "name": "Project Planning", "description": "Create project plan", "assignee": "admin", "status": "in-progress", "priority": 75},
                        {"id": "4", "name": "Budget Review", "description": "Review department budget", "assignee": None, "status": "pending", "priority": 100},
                        {"id": "5", "name": "Document Review", "description": "Review submitted documents", "assignee": "admin", "status": "completed", "priority": 25}
                    ]
                }
            elif len(parts) == 4:
                taskId = parts[3]
                if self.command == 'PUT':
                    # Update task
                    length = int(self.headers.get('Content-Length', 0))
                    body = {}
                    if length > 0:
                        body = json.loads(self.rfile.read(length))
                    
                    response = {
                        "id": taskId,
                        "name": "Updated Task",
                        "priority": body.get('priority', 50),
                        "dueDate": body.get('dueDate', None),
                        "assignee": body.get('assignee', 'admin')
                    }
                else:
                    # Task Details
                    response = {
                        "task": {
                            "id": taskId,
                            "name": "Review Purchase Request",
                            "description": "Review and approve purchase request",
                            "processName": "Purchase Process",
                            "assignee": "admin",
                            "priority": 50,
                            "dueDate": "2024-02-15T00:00:00Z",
                            "createTime": "2024-02-01T09:00:00Z",
                            "processDefinitionId": "proc1",
                            "taskDefinitionKey": "task1",
                            "formKey": "purchase-approval-form"
                        },
                        "variables": {
                            "amount": 1500.00,
                            "requestor": "John Doe",
                            "department": "Engineering",
                            "justification": "New hardware"
                        }
                    }

        elif parsed_path.path.startswith('/api/processes'):
            response = {
                "total": 3,
                "content": [
                    {"id": "proc1", "name": "Purchase Request Process", "description": "Multi-level approval for purchases", "status": "active"},
                    {"id": "proc2", "name": "Leave Request Process", "description": "Employee leave approval workflow", "status": "active"},
                    {"id": "proc3", "name": "Project Approval Process", "description": "Multi-stakeholder project review", "status": "completed"}
                ]
            }
        else:
            response = {"message": "BPM Backend Mock - Endpoint not implemented", "path": parsed_path.path}
        
        self.wfile.write(json.dumps(response, indent=2).encode())

    def do_GET(self):
        self.handle_request()
    
    def do_POST(self):
        self.handle_request()
        
    def do_PUT(self):
        self.handle_request()
        
    def do_DELETE(self):
        self.handle_request()
    
    def do_OPTIONS(self):
        self.handle_request()

PORT = 8080
Handler = BPMBackendHandler

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving mock BPM backend on port {PORT}")
    httpd.serve_forever()
