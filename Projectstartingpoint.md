# Complete Implementation Guide: Flowable BPM + SvelteKit

This guide provides a complete, production-ready implementation of a BPM system using Flowable (embedded in Spring Boot) with a custom SvelteKit frontend using Svelte 5 runes.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Backend Setup (Spring Boot + Flowable)](#backend-setup)
3. [Process Definition (BPMN)](#process-definition)
4. [Backend API Implementation](#backend-api-implementation)
5. [Frontend Setup (SvelteKit)](#frontend-setup)
6. [Frontend Components](#frontend-components)
7. [Authentication & Authorization](#authentication)
8. [Complete User Journey](#complete-user-journey)
9. [Deployment](#deployment)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                              │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
┌────────────────────────▼────────────────────────────────────┐
│              SvelteKit Application                           │
│              (localhost:5173 - dev)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Routes:                                              │  │
│  │  • /tasks - Task inbox                               │  │
│  │  • /tasks/[id] - Task detail & form                  │  │
│  │  • /processes/start/[key] - Start new process        │  │
│  │  • /api/* - Proxy to Spring Boot                     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API calls
┌────────────────────────▼────────────────────────────────────┐
│           Spring Boot Application                            │
│              (localhost:8080)                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  REST Controllers:                                    │  │
│  │  • /api/tasks/**     - Task operations               │  │
│  │  • /api/processes/** - Process operations            │  │
│  │  • /api/auth/**      - Authentication                │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                          │
│  ┌────────────────▼─────────────────────────────────────┐  │
│  │         Flowable Engine (Embedded)                    │  │
│  │  • TaskService      - Task operations                │  │
│  │  • RuntimeService   - Process execution              │  │
│  │  • RepositoryService - Process definitions           │  │
│  │  • HistoryService   - Audit trail                    │  │
│  │  • IdentityService  - Users & groups                 │  │
│  └────────────────┬─────────────────────────────────────┘  │
└───────────────────┼──────────────────────────────────────────┘
                    │ JDBC
┌───────────────────▼──────────────────────────────────────────┐
│              PostgreSQL Database                             │
│  • Flowable tables (ACT_RE_*, ACT_RU_*, ACT_HI_*, etc.)     │
│  • Application tables (users, files, custom data)           │
└──────────────────────────────────────────────────────────────┘
```

**Key Design Decisions**:
- **Single Database**: Both Flowable and your application tables in PostgreSQL
- **Embedded Engine**: Flowable runs in the same JVM as Spring Boot (no separate deployment)
- **Custom API Layer**: Your REST controllers transform Flowable data for SvelteKit
- **Separation of Concerns**: Business logic in Java, UI/UX in Svelte

---

## Backend Setup (Spring Boot + Flowable)

### Step 1: Create Spring Boot Project

**Using Spring Initializr** (https://start.spring.io/):

```yaml
Project: Maven
Language: Java
Spring Boot: 3.2.x
Packaging: Jar
Java: 17 or 21

Dependencies:
  - Spring Web
  - Spring Security
  - Spring Data JPA
  - PostgreSQL Driver
  - Lombok (optional but recommended)
  - Validation
```

### Step 2: Add Flowable Dependency

**pom.xml**:
```xml
<dependencies>
    <!-- Spring Boot Starters -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    
    <!-- Flowable -->
    <dependency>
        <groupId>org.flowable</groupId>
        <artifactId>flowable-spring-boot-starter</artifactId>
        <version>7.0.1</version>
    </dependency>
    
    <!-- Database -->
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
    </dependency>
    
    <!-- Lombok (optional) -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
</dependencies>
```

### Step 3: Application Configuration

**application.yml**:
```yaml
server:
  port: 8080

spring:
  application:
    name: bpm-backend
    
  datasource:
    url: jdbc:postgresql://localhost:5432/bpm_db
    username: bpm_user
    password: your_password
    driver-class-name: org.postgresql.Driver
    
  jpa:
    hibernate:
      ddl-auto: update
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
    show-sql: false

# Flowable Configuration
flowable:
  # Database schema management
  database-schema-update: true
  
  # Async executor (for timers, async tasks)
  async-executor-activate: true
  
  # Process definition deployment
  process-definition-location-prefix: classpath*:/processes/
  process-definition-location-suffixes: "**.bpmn20.xml,**.bpmn"
  
  # History level (full audit trail)
  history-level: full
  
  # Enable REST API (optional - we'll build custom endpoints)
  rest:
    enabled: false

# CORS Configuration (for local development)
cors:
  allowed-origins: http://localhost:5173
  allowed-methods: GET,POST,PUT,DELETE,OPTIONS
  allowed-headers: "*"
  allow-credentials: true
```

### Step 4: Project Structure

```
src/main/java/com/yourcompany/bpm/
├── BpmApplication.java                    # Main application class
├── config/
│   ├── CorsConfig.java                    # CORS configuration
│   ├── SecurityConfig.java                # Spring Security
│   └── FlowableConfig.java                # Flowable customization (optional)
├── controller/
│   ├── TaskController.java                # Task endpoints
│   ├── ProcessController.java             # Process endpoints
│   └── AuthController.java                # Authentication
├── service/
│   ├── TaskService.java                   # Task business logic
│   ├── ProcessService.java                # Process business logic
│   └── FormService.java                   # Form schema generation
├── dto/
│   ├── TaskDTO.java                       # Task response objects
│   ├── ProcessInstanceDTO.java
│   ├── FormSchemaDTO.java
│   └── StartProcessRequest.java
├── delegate/                              # Service task implementations
│   ├── ValidateExpenseDelegate.java
│   └── UpdateAccountingDelegate.java
├── listener/                              # Event listeners
│   └── TaskCreatedListener.java
└── security/
    ├── JwtTokenProvider.java
    └── CustomUserDetailsService.java

src/main/resources/
├── application.yml
├── processes/                             # BPMN process definitions
│   ├── expense-approval.bpmn20.xml
│   └── leave-request.bpmn20.xml
└── static/                                # (optional) uploaded files
```

---

## Process Definition (BPMN)

### Creating a BPMN Process

**Option 1: Use Flowable Modeler** (web-based, requires separate deployment)
**Option 2: Use Camunda Modeler** (desktop app, free, works with Flowable)
- Download: https://camunda.com/download/modeler/
- Create BPMN diagrams visually
- Export as .bpmn20.xml

**Option 3: Write XML directly** (for simple processes)

### Example: Expense Approval Process

**File**: `src/main/resources/processes/expense-approval.bpmn20.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             xmlns:flowable="http://flowable.org/bpmn"
             targetNamespace="http://yourcompany.com/bpm">

  <process id="expense-approval" name="Expense Approval Process" isExecutable="true">
    
    <!-- Start Event -->
    <startEvent id="startEvent" name="Expense Submitted"/>
    
    <!-- Sequence Flow: Start to Validation -->
    <sequenceFlow id="flow1" sourceRef="startEvent" targetRef="validateExpense"/>
    
    <!-- Service Task: Validate Expense -->
    <serviceTask id="validateExpense" 
                 name="Validate Expense" 
                 flowable:delegateExpression="${validateExpenseDelegate}"/>
    
    <sequenceFlow id="flow2" sourceRef="validateExpense" targetRef="checkAmount"/>
    
    <!-- Exclusive Gateway: Check Amount -->
    <exclusiveGateway id="checkAmount" name="Amount > $1000?"/>
    
    <!-- High Amount Path: Requires Manager Approval -->
    <sequenceFlow id="flowHigh" sourceRef="checkAmount" targetRef="managerApproval">
      <conditionExpression xsi:type="tFormalExpression">
        ${requiresManagerApproval == true}
      </conditionExpression>
    </sequenceFlow>
    
    <!-- Low Amount Path: Auto-approve -->
    <sequenceFlow id="flowLow" sourceRef="checkAmount" targetRef="autoApprove">
      <conditionExpression xsi:type="tFormalExpression">
        ${requiresManagerApproval == false}
      </conditionExpression>
    </sequenceFlow>
    
    <!-- User Task: Manager Approval -->
    <userTask id="managerApproval" 
              name="Manager Approval" 
              flowable:assignee="${managerService.getManager(employeeId)}"
              flowable:candidateGroups="managers"
              flowable:formKey="approve-expense-form">
      <documentation>
        Review and approve expense request from employee.
      </documentation>
    </userTask>
    
    <sequenceFlow id="flow3" sourceRef="managerApproval" targetRef="merge"/>
    
    <!-- Service Task: Auto-approve -->
    <serviceTask id="autoApprove" 
                 name="Auto Approve" 
                 flowable:expression="${execution.setVariable('approved', true)}"/>
    
    <sequenceFlow id="flow4" sourceRef="autoApprove" targetRef="merge"/>
    
    <!-- Merge Paths -->
    <exclusiveGateway id="merge"/>
    
    <sequenceFlow id="flow5" sourceRef="merge" targetRef="updateAccounting"/>
    
    <!-- Service Task: Update Accounting System -->
    <serviceTask id="updateAccounting" 
                 name="Update Accounting" 
                 flowable:delegateExpression="${updateAccountingDelegate}"/>
    
    <sequenceFlow id="flow6" sourceRef="updateAccounting" targetRef="endEvent"/>
    
    <!-- End Event -->
    <endEvent id="endEvent" name="Expense Processed"/>
    
  </process>
</definitions>
```

**Key BPMN Elements Explained**:

1. **Process ID**: `expense-approval` - Used to start processes programmatically
2. **Service Tasks**: Execute Java code (`delegateExpression` points to Spring bean)
3. **User Tasks**: Create tasks for humans to complete
   - `assignee`: Specific user (can use expression)
   - `candidateGroups`: Users who can claim the task
   - `formKey`: Identifies which form to show
4. **Gateways**: Route execution based on conditions
5. **Sequence Flows**: Connect elements, can have conditions

---

## Backend API Implementation

### 1. Service Task Delegates

**ValidateExpenseDelegate.java**:
```java
package com.yourcompany.bpm.delegate;

import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

@Component("validateExpenseDelegate")
public class ValidateExpenseDelegate implements JavaDelegate {
    
    @Override
    public void execute(DelegateExecution execution) {
        // Get variables from process
        Double amount = (Double) execution.getVariable("amount");
        String category = (String) execution.getVariable("category");
        
        // Business logic
        boolean requiresApproval = amount > 1000.0;
        
        // Set variable for gateway decision
        execution.setVariable("requiresManagerApproval", requiresApproval);
        
        // Optional: Additional validation
        if (category == null || category.isEmpty()) {
            throw new RuntimeException("Category is required");
        }
        
        System.out.println("Validated expense: $" + amount + 
                         " - Requires approval: " + requiresApproval);
    }
}
```

**UpdateAccountingDelegate.java**:
```java
package com.yourcompany.bpm.delegate;

import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

@Component("updateAccountingDelegate")
public class UpdateAccountingDelegate implements JavaDelegate {
    
    @Override
    public void execute(DelegateExecution execution) {
        // Get process variables
        String businessKey = execution.getProcessInstanceBusinessKey();
        Double amount = (Double) execution.getVariable("amount");
        Boolean approved = (Boolean) execution.getVariable("approved");
        String employeeId = (String) execution.getVariable("employeeId");
        
        if (approved != null && approved) {
            // TODO: Call your accounting system API
            System.out.println("Creating reimbursement for " + employeeId + 
                             " - Amount: $" + amount);
            
            // Simulate API call
            String reimbursementId = "REIMB-" + System.currentTimeMillis();
            execution.setVariable("reimbursementId", reimbursementId);
            
            System.out.println("Accounting updated successfully: " + reimbursementId);
        } else {
            System.out.println("Expense rejected, no accounting update needed");
        }
    }
}
```

### 2. DTOs (Data Transfer Objects)

**TaskDTO.java**:
```java
package com.yourcompany.bpm.dto;

import lombok.Data;
import lombok.Builder;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
public class TaskDTO {
    private String taskId;
    private String taskName;
    private String processInstanceId;
    private String processDefinitionKey;
    private String processName;
    private String assignee;
    private LocalDateTime createTime;
    private LocalDateTime dueDate;
    private Integer priority;
    private String formKey;
    private Map<String, Object> variables;
    private String description;
}
```

**FormSchemaDTO.java**:
```java
package com.yourcompany.bpm.dto;

import lombok.Data;
import lombok.Builder;
import java.util.List;

@Data
@Builder
public class FormSchemaDTO {
    private String formKey;
    private List<FormField> fields;
    
    @Data
    @Builder
    public static class FormField {
        private String id;
        private String type; // text, number, textarea, select, radio, checkbox, file, date
        private String label;
        private boolean required;
        private List<String> options; // for select, radio
        private Object defaultValue;
        private ValidationRules validation;
    }
    
    @Data
    @Builder
    public static class ValidationRules {
        private Integer minLength;
        private Integer maxLength;
        private Double min;
        private Double max;
        private String pattern; // regex
        private String customMessage;
    }
}
```

**StartProcessRequest.java**:
```java
package com.yourcompany.bpm.dto;

import lombok.Data;
import java.util.Map;

@Data
public class StartProcessRequest {
    private String processDefinitionKey;
    private String businessKey; // Optional
    private Map<String, Object> variables;
}
```

### 3. Services

**TaskService.java** (Custom - wraps Flowable's TaskService):
```java
package com.yourcompany.bpm.service;

import com.yourcompany.bpm.dto.FormSchemaDTO;
import com.yourcompany.bpm.dto.TaskDTO;
import lombok.RequiredArgsConstructor;
import org.flowable.engine.RuntimeService;
import org.flowable.task.api.Task;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {
    
    private final org.flowable.engine.TaskService flowableTaskService;
    private final RuntimeService runtimeService;
    private final FormService formService;
    
    public List<TaskDTO> getMyTasks(String userId) {
        List<Task> tasks = flowableTaskService.createTaskQuery()
            .taskAssignee(userId)
            .orderByTaskPriority().desc()
            .orderByTaskCreateTime().desc()
            .list();
        
        return tasks.stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }
    
    public List<TaskDTO> getClaimableTasks(String userId) {
        List<Task> tasks = flowableTaskService.createTaskQuery()
            .taskCandidateUser(userId)
            .orderByTaskPriority().desc()
            .list();
        
        return tasks.stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }
    
    public TaskDTO getTaskById(String taskId) {
        Task task = flowableTaskService.createTaskQuery()
            .taskId(taskId)
            .singleResult();
        
        if (task == null) {
            throw new RuntimeException("Task not found: " + taskId);
        }
        
        return convertToDTO(task);
    }
    
    public Map<String, Object> getTaskVariables(String taskId) {
        return flowableTaskService.getVariables(taskId);
    }
    
    public FormSchemaDTO getFormSchema(String taskId) {
        Task task = flowableTaskService.createTaskQuery()
            .taskId(taskId)
            .singleResult();
        
        if (task == null) {
            throw new RuntimeException("Task not found");
        }
        
        return formService.generateFormSchema(task.getFormKey());
    }
    
    public void completeTask(String taskId, Map<String, Object> variables, String userId) {
        // Validate user owns the task
        Task task = flowableTaskService.createTaskQuery()
            .taskId(taskId)
            .taskAssignee(userId)
            .singleResult();
        
        if (task == null) {
            throw new RuntimeException("Task not assigned to user or not found");
        }
        
        // Complete the task
        flowableTaskService.complete(taskId, variables);
    }
    
    public void claimTask(String taskId, String userId) {
        flowableTaskService.claim(taskId, userId);
    }
    
    private TaskDTO convertToDTO(Task task) {
        Map<String, Object> variables = flowableTaskService.getVariables(task.getId());
        
        return TaskDTO.builder()
            .taskId(task.getId())
            .taskName(task.getName())
            .processInstanceId(task.getProcessInstanceId())
            .processDefinitionKey(task.getProcessDefinitionId().split(":")[0])
            .assignee(task.getAssignee())
            .createTime(task.getCreateTime().toInstant()
                .atZone(java.time.ZoneId.systemDefault())
                .toLocalDateTime())
            .dueDate(task.getDueDate() != null ? 
                task.getDueDate().toInstant()
                    .atZone(java.time.ZoneId.systemDefault())
                    .toLocalDateTime() : null)
            .priority(task.getPriority())
            .formKey(task.getFormKey())
            .variables(variables)
            .description(task.getDescription())
            .build();
    }
}
```

**FormService.java**:
```java
package com.yourcompany.bpm.service;

import com.yourcompany.bpm.dto.FormSchemaDTO;
import com.yourcompany.bpm.dto.FormSchemaDTO.FormField;
import com.yourcompany.bpm.dto.FormSchemaDTO.ValidationRules;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class FormService {
    
    public FormSchemaDTO generateFormSchema(String formKey) {
        // In a real application, you might:
        // 1. Store form definitions in database
        // 2. Use Flowable's form engine
        // 3. Generate dynamically based on business rules
        
        List<FormField> fields = new ArrayList<>();
        
        switch (formKey) {
            case "approve-expense-form":
                fields.add(FormField.builder()
                    .id("decision")
                    .type("radio")
                    .label("Your Decision")
                    .required(true)
                    .options(Arrays.asList("approve", "reject", "needMoreInfo"))
                    .build());
                
                fields.add(FormField.builder()
                    .id("approvalComments")
                    .type("textarea")
                    .label("Comments")
                    .required(false)
                    .validation(ValidationRules.builder()
                        .maxLength(500)
                        .build())
                    .build());
                break;
                
            case "submit-expense-form":
                fields.add(FormField.builder()
                    .id("amount")
                    .type("number")
                    .label("Amount")
                    .required(true)
                    .validation(ValidationRules.builder()
                        .min(0.01)
                        .max(10000.0)
                        .build())
                    .build());
                
                fields.add(FormField.builder()
                    .id("category")
                    .type("select")
                    .label("Category")
                    .required(true)
                    .options(Arrays.asList("Travel", "Office Supplies", 
                        "Meals", "Equipment", "Other"))
                    .build());
                
                fields.add(FormField.builder()
                    .id("description")
                    .type("textarea")
                    .label("Description")
                    .required(true)
                    .build());
                
                fields.add(FormField.builder()
                    .id("receipts")
                    .type("file")
                    .label("Receipt Files")
                    .required(true)
                    .build());
                break;
                
            default:
                throw new RuntimeException("Unknown form key: " + formKey);
        }
        
        return FormSchemaDTO.builder()
            .formKey(formKey)
            .fields(fields)
            .build();
    }
}
```

### 4. REST Controllers

**TaskController.java**:
```java
package com.yourcompany.bpm.controller;

import com.yourcompany.bpm.dto.FormSchemaDTO;
import com.yourcompany.bpm.dto.TaskDTO;
import com.yourcompany.bpm.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class TaskController {
    
    private final TaskService taskService;
    
    @GetMapping("/my-tasks")
    public ResponseEntity<List<TaskDTO>> getMyTasks(
            @AuthenticationPrincipal UserDetails userDetails) {
        
        List<TaskDTO> tasks = taskService.getMyTasks(userDetails.getUsername());
        return ResponseEntity.ok(tasks);
    }
    
    @GetMapping("/claimable")
    public ResponseEntity<List<TaskDTO>> getClaimableTasks(
            @AuthenticationPrincipal UserDetails userDetails) {
        
        List<TaskDTO> tasks = taskService.getClaimableTasks(userDetails.getUsername());
        return ResponseEntity.ok(tasks);
    }
    
    @GetMapping("/{taskId}")
    public ResponseEntity<Map<String, Object>> getTaskDetails(@PathVariable String taskId) {
        TaskDTO task = taskService.getTaskById(taskId);
        Map<String, Object> variables = taskService.getTaskVariables(taskId);
        FormSchemaDTO formSchema = taskService.getFormSchema(taskId);
        
        return ResponseEntity.ok(Map.of(
            "task", task,
            "variables", variables,
            "formSchema", formSchema
        ));
    }
    
    @PostMapping("/{taskId}/complete")
    public ResponseEntity<Map<String, String>> completeTask(
            @PathVariable String taskId,
            @RequestBody Map<String, Object> variables,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        taskService.completeTask(taskId, variables, userDetails.getUsername());
        
        return ResponseEntity.ok(Map.of(
            "message", "Task completed successfully",
            "taskId", taskId
        ));
    }
    
    @PostMapping("/{taskId}/claim")
    public ResponseEntity<Map<String, String>> claimTask(
            @PathVariable String taskId,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        taskService.claimTask(taskId, userDetails.getUsername());
        
        return ResponseEntity.ok(Map.of(
            "message", "Task claimed successfully",
            "taskId", taskId
        ));
    }
}
```

**ProcessController.java**:
```java
package com.yourcompany.bpm.controller;

import com.yourcompany.bpm.dto.StartProcessRequest;
import lombok.RequiredArgsConstructor;
import org.flowable.engine.RepositoryService;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.repository.ProcessDefinition;
import org.flowable.engine.runtime.ProcessInstance;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/processes")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class ProcessController {
    
    private final RuntimeService runtimeService;
    private final RepositoryService repositoryService;
    
    @GetMapping("/startable")
    public ResponseEntity<List<Map<String, String>>> getStartableProcesses() {
        List<ProcessDefinition> definitions = repositoryService
            .createProcessDefinitionQuery()
            .latestVersion()
            .list();
        
        List<Map<String, String>> result = definitions.stream()
            .map(def -> Map.of(
                "key", def.getKey(),
                "name", def.getName(),
                "version", String.valueOf(def.getVersion()),
                "description", def.getDescription() != null ? def.getDescription() : ""
            ))
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }
    
    @PostMapping("/start")
    public ResponseEntity<Map<String, String>> startProcess(
            @RequestBody StartProcessRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        
        // Add current user to variables
        Map<String, Object> variables = new HashMap<>(request.getVariables());
        variables.put("startedBy", userDetails.getUsername());
        variables.put("startedAt", java.time.LocalDateTime.now().toString());
        
        // Generate business key if not provided
        String businessKey = request.getBusinessKey() != null ? 
            request.getBusinessKey() : 
            request.getProcessDefinitionKey() + "-" + System.currentTimeMillis();
        
        // Start process instance
        ProcessInstance processInstance = runtimeService.startProcessInstanceByKey(
            request.getProcessDefinitionKey(),
            businessKey,
            variables
        );
        
        return ResponseEntity.ok(Map.of(
            "processInstanceId", processInstance.getId(),
            "businessKey", processInstance.getBusinessKey(),
            "processDefinitionKey", request.getProcessDefinitionKey(),
            "message", "Process started successfully"
        ));
    }
    
    @GetMapping("/{processInstanceId}")
    public ResponseEntity<Map<String, Object>> getProcessInstance(
            @PathVariable String processInstanceId) {
        
        ProcessInstance instance = runtimeService.createProcessInstanceQuery()
            .processInstanceId(processInstanceId)
            .singleResult();
        
        if (instance == null) {
            return ResponseEntity.notFound().build();
        }
        
        Map<String, Object> variables = runtimeService.getVariables(processInstanceId);
        
        return ResponseEntity.ok(Map.of(
            "processInstanceId", instance.getId(),
            "businessKey", instance.getBusinessKey(),
            "processDefinitionKey", instance.getProcessDefinitionKey(),
            "variables", variables,
            "isEnded", instance.isEnded()
        ));
    }
}
```

### 5. Security Configuration

**SecurityConfig.java** (Simplified for development):
```java
package com.yourcompany.bpm.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf().disable() // Disable for development (enable in production!)
            .cors().and()
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .anyRequest().authenticated()
            )
            .httpBasic(); // Use basic auth for development (use JWT in production)
        
        return http.build();
    }
    
    @Bean
    public UserDetailsService userDetailsService() {
        // In-memory users for development
        // TODO: Replace with database-backed UserDetailsService in production
        UserDetails employee = User.builder()
            .username("employee1")
            .password(passwordEncoder().encode("password"))
            .roles("EMPLOYEE")
            .build();
        
        UserDetails manager = User.builder()
            .username("manager1")
            .password(passwordEncoder().encode("password"))
            .roles("MANAGER", "EMPLOYEE")
            .build();
        
        return new InMemoryUserDetailsManager(employee, manager);
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

**CorsConfig.java**:
```java
package com.yourcompany.bpm.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:5173")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(true);
    }
}
```

---

## Frontend Setup (SvelteKit)

### Step 1: Create SvelteKit Project

```bash
npm create svelte@latest bpm-frontend
cd bpm-frontend

# Choose options:
# - SvelteKit demo app (or skeleton)
# - TypeScript: Yes
# - ESLint: Yes
# - Prettier: Yes
# - Playwright: Optional
# - Vitest: Optional

npm install
```

### Step 2: Install Dependencies

```bash
# Install additional dependencies
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Optional but recommended**:
```bash
npm install date-fns  # For date formatting
npm install zod       # For form validation
```

### Step 3: Project Structure

```
src/
├── lib/
│   ├── api/
│   │   └── flowable.ts              # API client
│   ├── components/
│   │   ├── TaskList.svelte          # Task list component
│   │   ├── TaskCard.svelte          # Individual task display
│   │   ├── DynamicForm.svelte       # Form renderer
│   │   ├── FileUpload.svelte        # File upload component
│   │   └── ProcessStarter.svelte    # Process initiation
│   ├── stores/
│   │   └── auth.svelte.ts           # Auth state (Svelte 5 runes)
│   ├── types/
│   │   └── index.ts                 # TypeScript types
│   └── utils/
│       └── formatters.ts            # Utility functions
├── routes/
│   ├── +layout.svelte               # Main layout
│   ├── +layout.ts                   # Layout load function
│   ├── +page.svelte                 # Dashboard/home
│   ├── login/
│   │   └── +page.svelte             # Login page
│   ├── tasks/
│   │   ├── +page.svelte             # Task list
│   │   ├── +page.ts                 # Load tasks
│   │   └── [taskId]/
│   │       ├── +page.svelte         # Task detail & form
│   │       └── +page.ts             # Load task data
│   └── processes/
│       ├── +page.svelte             # Available processes
│       ├── +page.ts                 # Load process definitions
│       └── start/
│           └── [processKey]/
│               ├── +page.svelte     # Process starter form
│               └── +page.ts         # Load form schema
├── app.html
├── app.css                          # Tailwind directives
└── hooks.server.ts                  # Auth middleware
```

### Step 4: TypeScript Types

**src/lib/types/index.ts**:
```typescript
export interface Task {
	taskId: string;
	taskName: string;
	processInstanceId: string;
	processDefinitionKey: string;
	assignee: string;
	createTime: string;
	dueDate: string | null;
	priority: number;
	formKey: string;
	variables: Record<string, any>;
	description: string | null;
}

export interface FormSchema {
	formKey: string;
	fields: FormField[];
}

export interface FormField {
	id: string;
	type: 'text' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file' | 'date';
	label: string;
	required: boolean;
	options?: string[];
	defaultValue?: any;
	validation?: ValidationRules;
}

export interface ValidationRules {
	minLength?: number;
	maxLength?: number;
	min?: number;
	max?: number;
	pattern?: string;
	customMessage?: string;
}

export interface TaskDetails {
	task: Task;
	variables: Record<string, any>;
	formSchema: FormSchema;
}

export interface ProcessDefinition {
	key: string;
	name: string;
	version: string;
	description: string;
}

export interface StartProcessRequest {
	processDefinitionKey: string;
	businessKey?: string;
	variables: Record<string, any>;
}
```

### Step 5: API Client

**src/lib/api/flowable.ts**:
```typescript
import type {
	Task,
	TaskDetails,
	ProcessDefinition,
	StartProcessRequest
} from '$lib/types';

const API_BASE = 'http://localhost:8080/api';

// Helper for auth headers
function getAuthHeaders(): HeadersInit {
	// For development with Basic Auth
	const credentials = btoa('employee1:password');
	return {
		'Content-Type': 'application/json',
		'Authorization': `Basic ${credentials}`
	};
}

export const flowableApi = {
	// Task operations
	async getMyTasks(): Promise<Task[]> {
		const response = await fetch(`${API_BASE}/tasks/my-tasks`, {
			headers: getAuthHeaders()
		});
		
		if (!response.ok) {
			throw new Error('Failed to fetch tasks');
		}
		
		return response.json();
	},

	async getClaimableTasks(): Promise<Task[]> {
		const response = await fetch(`${API_BASE}/tasks/claimable`, {
			headers: getAuthHeaders()
		});
		
		if (!response.ok) {
			throw new Error('Failed to fetch claimable tasks');
		}
		
		return response.json();
	},

	async getTaskDetails(taskId: string): Promise<TaskDetails> {
		const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
			headers: getAuthHeaders()
		});
		
		if (!response.ok) {
			throw new Error('Failed to fetch task details');
		}
		
		return response.json();
	},

	async completeTask(taskId: string, variables: Record<string, any>): Promise<void> {
		const response = await fetch(`${API_BASE}/tasks/${taskId}/complete`, {
			method: 'POST',
			headers: getAuthHeaders(),
			body: JSON.stringify(variables)
		});
		
		if (!response.ok) {
			throw new Error('Failed to complete task');
		}
	},

	async claimTask(taskId: string): Promise<void> {
		const response = await fetch(`${API_BASE}/tasks/${taskId}/claim`, {
			method: 'POST',
			headers: getAuthHeaders()
		});
		
		if (!response.ok) {
			throw new Error('Failed to claim task');
		}
	},

	// Process operations
	async getStartableProcesses(): Promise<ProcessDefinition[]> {
		const response = await fetch(`${API_BASE}/processes/startable`, {
			headers: getAuthHeaders()
		});
		
		if (!response.ok) {
			throw new Error('Failed to fetch processes');
		}
		
		return response.json();
	},

	async startProcess(request: StartProcessRequest): Promise<any> {
		const response = await fetch(`${API_BASE}/processes/start`, {
			method: 'POST',
			headers: getAuthHeaders(),
			body: JSON.stringify(request)
		});
		
		if (!response.ok) {
			throw new Error('Failed to start process');
		}
		
		return response.json();
	}
};
```

---

## Frontend Components (Svelte 5 Runes)

### TaskList Component

**src/lib/components/TaskList.svelte**:
```svelte
<script lang="ts">
	import type { Task } from '$lib/types';
	import { formatDistanceToNow } from 'date-fns';

	interface Props {
		tasks: Task[];
		onTaskClick: (taskId: string) => void;
	}

	let { tasks, onTaskClick }: Props = $props();

	// Derived state using Svelte 5 runes
	let sortedTasks = $derived(
		[...tasks].sort((a, b) => b.priority - a.priority)
	);

	function getPriorityColor(priority: number): string {
		if (priority >= 75) return 'bg-red-100 text-red-800';
		if (priority >= 50) return 'bg-yellow-100 text-yellow-800';
		return 'bg-green-100 text-green-800';
	}

	function getPriorityLabel(priority: number): string {
		if (priority >= 75) return 'High';
		if (priority >= 50) return 'Medium';
		return 'Low';
	}
</script>

<div class="space-y-3">
	{#if sortedTasks.length === 0}
		<div class="text-center py-12 text-gray-500">
			<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
			</svg>
			<p class="mt-2">No tasks assigned to you</p>
		</div>
	{:else}
		{#each sortedTasks as task (task.taskId)}
			<button
				onclick={() => onTaskClick(task.taskId)}
				class="w-full text-left bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
			>
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<h3 class="font-semibold text-gray-900">
							{task.taskName}
						</h3>
						<p class="text-sm text-gray-600 mt-1">
							Process: {task.processDefinitionKey}
						</p>
						
						{#if task.description}
							<p class="text-sm text-gray-500 mt-2">
								{task.description}
							</p>
						{/if}

						<!-- Display key variables -->
						{#if task.variables.amount}
							<p class="text-sm mt-2">
								<span class="font-medium">Amount:</span>
								${task.variables.amount.toFixed(2)}
							</p>
						{/if}
					</div>

					<div class="ml-4 flex flex-col items-end space-y-2">
						<span class="px-2 py-1 text-xs font-medium rounded {getPriorityColor(task.priority)}">
							{getPriorityLabel(task.priority)}
						</span>
						
						{#if task.dueDate}
							<span class="text-xs text-gray-500">
								Due: {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
							</span>
						{/if}
						
						<span class="text-xs text-gray-400">
							Created {formatDistanceToNow(new Date(task.createTime), { addSuffix: true })}
						</span>
					</div>
				</div>
			</button>
		{/each}
	{/if}
</div>
```

### DynamicForm Component

**src/lib/components/DynamicForm.svelte**:
```svelte
<script lang="ts">
	import type { FormSchema, FormField } from '$lib/types';

	interface Props {
		schema: FormSchema;
		initialData?: Record<string, any>;
		onSubmit: (data: Record<string, any>) => Promise<void>;
	}

	let { schema, initialData = {}, onSubmit }: Props = $props();

	// Form state using Svelte 5 runes
	let formData = $state<Record<string, any>>({ ...initialData });
	let errors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);

	function validateField(field: FormField, value: any): string | null {
		if (field.required && (!value || value === '')) {
			return `${field.label} is required`;
		}

		if (field.validation) {
			const validation = field.validation;

			if (field.type === 'text' || field.type === 'textarea') {
				if (validation.minLength && value.length < validation.minLength) {
					return validation.customMessage || 
						`Minimum length is ${validation.minLength}`;
				}
				if (validation.maxLength && value.length > validation.maxLength) {
					return validation.customMessage || 
						`Maximum length is ${validation.maxLength}`;
				}
				if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
					return validation.customMessage || 'Invalid format';
				}
			}

			if (field.type === 'number') {
				const numValue = Number(value);
				if (validation.min !== undefined && numValue < validation.min) {
					return `Minimum value is ${validation.min}`;
				}
				if (validation.max !== undefined && numValue > validation.max) {
					return `Maximum value is ${validation.max}`;
				}
			}
		}

		return null;
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		
		// Clear previous errors
		errors = {};

		// Validate all fields
		let hasErrors = false;
		for (const field of schema.fields) {
			const error = validateField(field, formData[field.id]);
			if (error) {
				errors[field.id] = error;
				hasErrors = true;
			}
		}

		if (hasErrors) {
			return;
		}

		// Submit
		isSubmitting = true;
		try {
			await onSubmit(formData);
		} catch (error) {
			console.error('Form submission error:', error);
			errors._form = 'Failed to submit form. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}

	function renderField(field: FormField) {
		switch (field.type) {
			case 'text':
			case 'number':
			case 'date':
				return { component: 'input', type: field.type };
			case 'textarea':
				return { component: 'textarea' };
			case 'select':
				return { component: 'select' };
			case 'radio':
				return { component: 'radio' };
			case 'checkbox':
				return { component: 'checkbox' };
			case 'file':
				return { component: 'file' };
			default:
				return { component: 'input', type: 'text' };
		}
	}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	{#each schema.fields as field (field.id)}
		<div class="form-field">
			<label for={field.id} class="block text-sm font-medium text-gray-700 mb-1">
				{field.label}
				{#if field.required}
					<span class="text-red-500">*</span>
				{/if}
			</label>

			{#if field.type === 'text' || field.type === 'number' || field.type === 'date'}
				<input
					id={field.id}
					type={field.type}
					bind:value={formData[field.id]}
					required={field.required}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					class:border-red-500={errors[field.id]}
				/>
			{:else if field.type === 'textarea'}
				<textarea
					id={field.id}
					bind:value={formData[field.id]}
					required={field.required}
					rows="4"
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					class:border-red-500={errors[field.id]}
				></textarea>
			{:else if field.type === 'select'}
				<select
					id={field.id}
					bind:value={formData[field.id]}
					required={field.required}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					class:border-red-500={errors[field.id]}
				>
					<option value="">Select {field.label}</option>
					{#each field.options || [] as option}
						<option value={option}>{option}</option>
					{/each}
				</select>
			{:else if field.type === 'radio'}
				<div class="space-y-2">
					{#each field.options || [] as option}
						<label class="flex items-center">
							<input
								type="radio"
								name={field.id}
								value={option}
								bind:group={formData[field.id]}
								required={field.required}
								class="mr-2"
							/>
							<span class="text-sm">{option}</span>
						</label>
					{/each}
				</div>
			{:else if field.type === 'checkbox'}
				<input
					type="checkbox"
					id={field.id}
					bind:checked={formData[field.id]}
					class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
				/>
			{:else if field.type === 'file'}
				<input
					type="file"
					id={field.id}
					multiple
					onchange={(e) => {
						const target = e.target as HTMLInputElement;
						formData[field.id] = Array.from(target.files || []);
					}}
					class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
				/>
			{/if}

			{#if errors[field.id]}
				<p class="mt-1 text-sm text-red-600">
					{errors[field.id]}
				</p>
			{/if}
		</div>
	{/each}

	{#if errors._form}
		<div class="bg-red-50 border border-red-200 rounded-md p-4">
			<p class="text-sm text-red-800">{errors._form}</p>
		</div>
	{/if}

	<div class="flex justify-end space-x-3">
		<button
			type="button"
			onclick={() => history.back()}
			class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
			disabled={isSubmitting}
		>
			Cancel
		</button>
		<button
			type="submit"
			class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
			disabled={isSubmitting}
		>
			{isSubmitting ? 'Submitting...' : 'Submit'}
		</button>
	</div>
</form>
```

---

## SvelteKit Routes

### Task List Page

**src/routes/tasks/+page.ts**:
```typescript
import { flowableApi } from '$lib/api/flowable';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const [myTasks, claimableTasks] = await Promise.all([
		flowableApi.getMyTasks(),
		flowableApi.getClaimableTasks()
	]);

	return {
		myTasks,
		claimableTasks
	};
};
```

**src/routes/tasks/+page.svelte**:
```svelte
<script lang="ts">
	import { goto } from '$app/navigation';
	import TaskList from '$lib/components/TaskList.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let activeTab = $state<'my-tasks' | 'claimable'>('my-tasks');

	function handleTaskClick(taskId: string) {
		goto(`/tasks/${taskId}`);
	}
</script>

<div class="max-w-6xl mx-auto px-4 py-8">
	<h1 class="text-3xl font-bold text-gray-900 mb-6">My Tasks</h1>

	<!-- Tab Navigation -->
	<div class="border-b border-gray-200 mb-6">
		<nav class="-mb-px flex space-x-8">
			<button
				onclick={() => activeTab = 'my-tasks'}
				class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
				class:border-blue-500={activeTab === 'my-tasks'}
				class:text-blue-600={activeTab === 'my-tasks'}
				class:border-transparent={activeTab !== 'my-tasks'}
				class:text-gray-500={activeTab !== 'my-tasks'}
			>
				My Tasks ({data.myTasks.length})
			</button>
			<button
				onclick={() => activeTab = 'claimable'}
				class="py-4 px-1 border-b-2 font-medium text-sm transition-colors"
				class:border-blue-500={activeTab === 'claimable'}
				class:text-blue-600={activeTab === 'claimable'}
				class:border-transparent={activeTab !== 'claimable'}
				class:text-gray-500={activeTab !== 'claimable'}
			>
				Available to Claim ({data.claimableTasks.length})
			</button>
		</nav>
	</div>

	<!-- Task Lists -->
	{#if activeTab === 'my-tasks'}
		<TaskList tasks={data.myTasks} {handleTaskClick} />
	{:else}
		<TaskList tasks={data.claimableTasks} {handleTaskClick} />
	{/if}
</div>
```

### Task Detail Page

**src/routes/tasks/[taskId]/+page.ts**:
```typescript
import { flowableApi } from '$lib/api/flowable';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	try {
		const taskDetails = await flowableApi.getTaskDetails(params.taskId);
		return taskDetails;
	} catch (err) {
		throw error(404, 'Task not found');
	}
};
```

**src/routes/tasks/[taskId]/+page.svelte**:
```svelte
<script lang="ts">
	import { goto } from '$app/navigation';
	import DynamicForm from '$lib/components/DynamicForm.svelte';
	import { flowableApi } from '$lib/api/flowable';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	async function handleSubmit(formData: Record<string, any>) {
		await flowableApi.completeTask(data.task.taskId, formData);
		await goto('/tasks');
	}
</script>

<div class="max-w-4xl mx-auto px-4 py-8">
	<!-- Task Header -->
	<div class="bg-white shadow rounded-lg p-6 mb-6">
		<h1 class="text-2xl font-bold text-gray-900 mb-2">
			{data.task.taskName}
		</h1>
		<p class="text-gray-600">
			Process: {data.task.processDefinitionKey}
		</p>
		{#if data.task.description}
			<p class="text-gray-500 mt-2">
				{data.task.description}
			</p>
		{/if}
	</div>

	<!-- Process Variables (Read-only context) -->
	<div class="bg-gray-50 rounded-lg p-6 mb-6">
		<h2 class="text-lg font-semibold text-gray-900 mb-4">Process Information</h2>
		<dl class="grid grid-cols-2 gap-4">
			{#each Object.entries(data.variables) as [key, value]}
				{#if !['approved', 'decision', 'approvalComments'].includes(key)}
					<div>
						<dt class="text-sm font-medium text-gray-500 capitalize">
							{key.replace(/([A-Z])/g, ' $1').trim()}
						</dt>
						<dd class="mt-1 text-sm text-gray-900">
							{#if typeof value === 'number'}
								{key.includes('amount') || key.includes('price') 
									? `$${value.toFixed(2)}` 
									: value}
							{:else if typeof value === 'boolean'}
								{value ? 'Yes' : 'No'}
							{:else if Array.isArray(value)}
								{value.join(', ')}
							{:else}
								{value}
							{/if}
						</dd>
					</div>
				{/if}
			{/each}
		</dl>
	</div>

	<!-- Form -->
	<div class="bg-white shadow rounded-lg p-6">
		<h2 class="text-lg font-semibold text-gray-900 mb-4">Complete Task</h2>
		<DynamicForm 
			schema={data.formSchema} 
			initialData={{}}
			{onSubmit}
		/>
	</div>
</div>
```

---

## Running the Application

### Backend (Spring Boot)

```bash
# Start PostgreSQL (Docker)
docker run --name bpm-postgres \
  -e POSTGRES_DB=bpm_db \
  -e POSTGRES_USER=bpm_user \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -d postgres:15

# Run Spring Boot application
./mvnw spring-boot:run

# Access:
# - API: http://localhost:8080/api
# - H2 Console (if using H2): http://localhost:8080/h2-console
```

### Frontend (SvelteKit)

```bash
npm run dev

# Access:
# - App: http://localhost:5173
```

### Testing the Flow

1. **Login**: Use credentials `employee1` / `password`
2. **Navigate to Processes**: http://localhost:5173/processes
3. **Start Expense Process**: Fill form with amount > $1000
4. **Logout and login as manager**: `manager1` / `password`
5. **Check Tasks**: See approval task
6. **Complete Task**: Approve or reject
7. **Check Process**: Verify completion

---

## Next Steps

1. **Production Authentication**: Replace Basic Auth with JWT tokens
2. **File Upload Handling**: Implement file storage (S3, local filesystem)
3. **Process Monitoring Dashboard**: Add admin views
4. **Notifications**: Email/Slack notifications for task assignments
5. **Advanced Forms**: Conditional fields, multi-step wizards
6. **Error Handling**: Comprehensive error boundaries
7. **Testing**: Unit tests, integration tests, E2E tests
8. **Deployment**: Docker containers, Kubernetes configs

This provides a complete, working foundation for your BPM system!
