def handle_processes(path, command):
    if path.startswith('/api/processes'):
        return {
            "total": 3,
            "content": [
                {"id": "proc1", "name": "Purchase Request Process", "description": "Multi-level approval for purchases", "status": "active"},
                {"id": "proc2", "name": "Leave Request Process", "description": "Employee leave approval workflow", "status": "active"},
                {"id": "proc3", "name": "Project Approval Process", "description": "Multi-stakeholder project review", "status": "completed"}
            ]
        }
    return None
