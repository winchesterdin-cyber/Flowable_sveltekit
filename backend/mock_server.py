#!/usr/bin/env python3
import json
import http.server
import socketserver
from urllib.parse import urlparse
from handlers.auth import handle_auth
from handlers.tasks import handle_tasks
from handlers.processes import handle_processes

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

        response = None
        
        # Actuator
        if parsed_path.path == '/actuator/health':
            response = {"status": "UP", "components": {"db": {"status": "UP", "details": {"database": "H2", "validationQuery": "isValid()"}}}}
        
        # Auth
        if not response:
            response = handle_auth(parsed_path.path, self.command, self.headers, self.rfile)
            
        # Tasks
        if not response:
            response = handle_tasks(parsed_path.path, self.command, self.headers, self.rfile, parsed_path)
            
        # Processes
        if not response:
            response = handle_processes(parsed_path.path, self.command)
            
        # Default/Fallback
        if not response:
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