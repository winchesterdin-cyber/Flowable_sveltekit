package com.demo.bpm.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class HomeController {

    @GetMapping("/")
    public ResponseEntity<?> home() {
        return ResponseEntity.ok(Map.of(
                "application", "BPM Backend API",
                "version", "1.0.0",
                "status", "running",
                "description", "Flowable BPM Backend Service with REST API",
                "endpoints", Map.of(
                        "auth", List.of(
                                "POST /api/auth/login - Login with username/password",
                                "POST /api/auth/logout - Logout current session",
                                "GET /api/auth/me - Get current user info"
                        ),
                        "processes", List.of(
                                "GET /api/processes - List available process definitions",
                                "POST /api/processes/{processKey}/start - Start a process instance",
                                "GET /api/processes/instance/{id} - Get process instance details",
                                "GET /api/processes/my-processes - Get user's active processes",
                                "GET /api/processes/users - List all users"
                        ),
                        "tasks", List.of(
                                "GET /api/tasks - Get tasks for current user",
                                "GET /api/tasks/assigned - Get assigned tasks",
                                "GET /api/tasks/claimable - Get claimable tasks",
                                "GET /api/tasks/{taskId} - Get task details",
                                "POST /api/tasks/{taskId}/claim - Claim a task",
                                "POST /api/tasks/{taskId}/complete - Complete a task"
                        ),
                        "health", List.of(
                                "GET /actuator/health - Health check endpoint"
                        )
                ),
                "demoUsers", List.of(
                        Map.of("username", "user1", "password", "password", "roles", "USER"),
                        Map.of("username", "supervisor1", "password", "password", "roles", "SUPERVISOR, USER"),
                        Map.of("username", "executive1", "password", "password", "roles", "EXECUTIVE, SUPERVISOR, USER")
                )
        ));
    }

    @GetMapping("/health")
    public ResponseEntity<?> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "bpm-backend"
        ));
    }
}
