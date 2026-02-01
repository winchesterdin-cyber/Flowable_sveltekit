import json
from urllib.parse import parse_qs

def handle_tasks(path, command, headers, rfile, parsed_path):
    # Task Comments
    if path.endswith('/comments'):
        # taskId = path.split('/')[-2]
        if command == 'POST':
            length = int(headers.get('Content-Length', 0))
            if length > 0:
                body = json.loads(rfile.read(length))
                return {
                    "id": "c_new_" + str(path), 
                    "message": body.get('message', ''), 
                    "authorId": "me", 
                    "timestamp": "2024-02-01T12:00:00Z"
                }
            return {"message": "Comment added"}
        else:
            return [
                {"id": "c1", "message": "Can you please clarify the budget?", "authorId": "user2", "timestamp": "2024-02-01T10:00:00Z"},
                {"id": "c2", "message": "Budget is attached in the documents.", "authorId": "admin", "timestamp": "2024-02-01T10:30:00Z"}
            ]

    # Task Documents
    elif path.endswith('/documents'):
        if command == 'GET':
            return [
                {"id": "d1", "name": "invoice_feb.pdf", "type": "application/pdf", "size": 102400, "createdBy": "user1", "createdAt": "2024-02-01T09:00:00Z"},
                {"id": "d2", "name": "specs_v2.docx", "type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "size": 2048000, "createdBy": "admin", "createdAt": "2024-02-01T11:00:00Z"}
            ]
        elif command == 'POST':
            length = int(headers.get('Content-Length', 0))
            body = {}
            if length > 0:
                body = json.loads(rfile.read(length))
            return {"id": "d_new", "name": body.get('name', 'uploaded.file'), "type": body.get('type', 'application/octet-stream'), "size": body.get('size', 1000), "createdBy": "me", "createdAt": "2024-02-01T12:00:00Z"}
        elif command == 'DELETE':
             return {"message": "Document deleted"}

    elif '/documents/' in path:
         if command == 'DELETE':
             return {"message": "Document deleted"}

    # Task History
    elif path.endswith('/history'):
        return [
            {"id": "h1", "taskId": "1", "type": "CREATED", "userId": "system", "userName": "System", "timestamp": "2024-02-01T09:00:00Z", "details": "Task created"},
            {"id": "h2", "taskId": "1", "type": "ASSIGNED", "userId": "manager1", "userName": "Manager", "timestamp": "2024-02-01T09:05:00Z", "details": "Assigned to user"},
            {"id": "h3", "taskId": "1", "type": "COMMENT", "userId": "user2", "userName": "User Two", "timestamp": "2024-02-01T10:00:00Z", "details": "Added a comment"},
            {"id": "h4", "taskId": "1", "type": "DOCUMENT_UPLOAD", "userId": "user1", "userName": "User One", "timestamp": "2024-02-01T11:00:00Z", "details": "Uploaded invoice_feb.pdf"}
        ]

    # Task CRUD
    elif path.startswith('/api/tasks'):
        parts = path.split('/')
        
        if len(parts) == 3:
            # List tasks
            query = parse_qs(parsed_path.query)
            text = query.get('text', [''])[0].lower()
            assignee = query.get('assignee', [''])[0]
            priority = query.get('priority', [''])[0]
            
            all_tasks = [
                {"id": "1", "name": "Review Purchase Request", "description": "Review and approve purchase request", "assignee": "admin", "status": "completed", "priority": 50, "dueDate": "2024-02-15T00:00:00Z"},
                {"id": "2", "name": "Approve Leave Request", "description": "Review leave application", "assignee": None, "status": "pending", "priority": 50},
                {"id": "3", "name": "Project Planning", "description": "Create project plan", "assignee": "admin", "status": "in-progress", "priority": 75},
                {"id": "4", "name": "Budget Review", "description": "Review department budget", "assignee": None, "status": "pending", "priority": 100},
                {"id": "5", "name": "Document Review", "description": "Review submitted documents", "assignee": "admin", "status": "completed", "priority": 25}
            ]
            
            filtered = []
            for task in all_tasks:
                if text and text not in task['name'].lower() and text not in (task['description'] or '').lower():
                    continue
                if assignee:
                    if assignee == 'unassigned':
                        if task['assignee'] is not None: continue
                    elif task['assignee'] != assignee:
                        continue
                if priority and str(task['priority']) != priority:
                    continue
                filtered.append(task)
            
            return {
                "total": len(filtered),
                "content": filtered
            }
            
        elif len(parts) == 4:
            taskId = parts[3]
            if command == 'PUT':
                length = int(headers.get('Content-Length', 0))
                body = {}
                if length > 0:
                    body = json.loads(rfile.read(length))
                
                return {
                    "id": taskId,
                    "name": "Updated Task",
                    "priority": body.get('priority', 50),
                    "dueDate": body.get('dueDate', None),
                    "assignee": body.get('assignee', 'admin')
                }
            else:
                return {
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
    return None
