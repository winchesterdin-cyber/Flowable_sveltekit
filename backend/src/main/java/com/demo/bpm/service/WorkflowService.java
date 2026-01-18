package com.demo.bpm.service;

import com.demo.bpm.dto.*;
import com.demo.bpm.exception.InvalidOperationException;
import com.demo.bpm.exception.ResourceNotFoundException;
import com.demo.bpm.util.EscalationUtils;
import com.demo.bpm.util.WorkflowConstants;
import com.demo.bpm.util.WorkflowVariableUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.TaskService;
import org.flowable.task.api.Task;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowService {

    private final RuntimeService runtimeService;
    private final TaskService taskService;
    private final ObjectMapper objectMapper;

    @Transactional
    public EscalationDTO escalateTask(String taskId, EscalationRequest request, String userId) {
        return processEscalation(taskId, request, userId, true);
    }

    @Transactional
    public EscalationDTO deEscalateTask(String taskId, EscalationRequest request, String userId) {
        return processEscalation(taskId, request, userId, false);
    }

    private EscalationDTO processEscalation(String taskId, EscalationRequest request, String userId, boolean isEscalation) {
        Task task = getTaskOrThrow(taskId);
        Map<String, Object> variables = runtimeService.getVariables(task.getProcessInstanceId());
        String currentLevel = WorkflowVariableUtils.getStringVariable(variables, WorkflowConstants.VAR_CURRENT_LEVEL, WorkflowConstants.LEVEL_SUPERVISOR);

        String targetLevel = request.getTargetLevel();
        if (targetLevel == null) {
            targetLevel = isEscalation
                ? EscalationUtils.getDefaultNextLevel(currentLevel)
                : EscalationUtils.getDefaultPreviousLevel(currentLevel);
        }

        boolean valid = isEscalation
            ? EscalationUtils.canEscalate(currentLevel, targetLevel)
            : EscalationUtils.canDeEscalate(currentLevel, targetLevel);

        if (!valid) {
             throw new InvalidOperationException("Invalid " + (isEscalation ? "escalation" : "de-escalation") + " from " + currentLevel + " to " + targetLevel);
        }

        // Record history
        List<Map<String, Object>> history = WorkflowVariableUtils.getListVariable(variables, WorkflowConstants.VAR_ESCALATION_HISTORY, objectMapper);

        String type = isEscalation ? WorkflowConstants.TYPE_ESCALATE : WorkflowConstants.TYPE_DE_ESCALATE;
        String now = LocalDateTime.now().toString();
        String id = UUID.randomUUID().toString();

        Map<String, Object> record = new HashMap<>();
        record.put("id", id);
        record.put("taskId", taskId);
        record.put("fromLevel", currentLevel);
        record.put("toLevel", targetLevel);
        record.put("fromUserId", userId);
        record.put("reason", request.getReason());
        record.put("type", type);
        record.put("timestamp", now);
        history.add(record);

        // Update process variables
        Map<String, Object> updateVars = new HashMap<>();
        updateVars.put(WorkflowConstants.VAR_CURRENT_LEVEL, targetLevel);
        updateVars.put(WorkflowConstants.VAR_ESCALATION_HISTORY, WorkflowVariableUtils.serializeList(history, objectMapper));

        if (isEscalation) {
            int count = WorkflowVariableUtils.getIntVariable(variables, WorkflowConstants.VAR_ESCALATION_COUNT, 0) + 1;
            updateVars.put(WorkflowConstants.VAR_ESCALATION_COUNT, count);
            updateVars.put(WorkflowConstants.VAR_DECISION, "escalate");
            updateVars.put(WorkflowConstants.VAR_ESCALATION_REASON, request.getReason());
            updateVars.put(WorkflowConstants.VAR_ESCALATED_BY, userId);
            updateVars.put(WorkflowConstants.VAR_ESCALATED_AT, now);
        } else {
            updateVars.put(WorkflowConstants.VAR_DECISION, "de_escalate");
            updateVars.put(WorkflowConstants.VAR_DE_ESCALATION_REASON, request.getReason());
            updateVars.put(WorkflowConstants.VAR_DE_ESCALATED_BY, userId);
            updateVars.put(WorkflowConstants.VAR_DE_ESCALATED_AT, now);
        }

        taskService.complete(taskId, updateVars);

        log.info("Task {} (ProcessInstance: {}) {} from {} to {} by {}", taskId, task.getProcessInstanceId(), isEscalation ? "escalated" : "de-escalated", currentLevel, targetLevel, userId);

        return EscalationDTO.builder()
                .id(id)
                .taskId(taskId)
                .processInstanceId(task.getProcessInstanceId())
                .fromUserId(userId)
                .fromLevel(currentLevel)
                .toLevel(targetLevel)
                .reason(request.getReason())
                .type(type)
                .timestamp(LocalDateTime.parse(now))
                .build();
    }

    public List<String> getEscalationOptions(String taskId) {
        Task task = getTaskOrThrow(taskId);

        Map<String, Object> variables = runtimeService.getVariables(task.getProcessInstanceId());
        String currentLevel = WorkflowVariableUtils.getStringVariable(variables, WorkflowConstants.VAR_CURRENT_LEVEL, WorkflowConstants.LEVEL_SUPERVISOR);

        return EscalationUtils.getNextLevels(currentLevel);
    }

    public List<String> getDeEscalationOptions(String taskId) {
        Task task = getTaskOrThrow(taskId);

        Map<String, Object> variables = runtimeService.getVariables(task.getProcessInstanceId());
        String currentLevel = WorkflowVariableUtils.getStringVariable(variables, WorkflowConstants.VAR_CURRENT_LEVEL, WorkflowConstants.LEVEL_SUPERVISOR);

        return EscalationUtils.getPreviousLevels(currentLevel);
    }

    private Task getTaskOrThrow(String taskId) {
        Task task = taskService.createTaskQuery()
                .taskId(taskId)
                .singleResult();
        if (task == null) {
            throw new ResourceNotFoundException("Task not found: " + taskId);
        }
        return task;
    }

    @Transactional
    public void handoffTask(String taskId, String toUserId, String reason, String fromUserId) {
        Task task = taskService.createTaskQuery()
                .taskId(taskId)
                .singleResult();

        if (task == null) {
            throw new ResourceNotFoundException("Task not found: " + taskId);
        }

        Map<String, Object> variables = runtimeService.getVariables(task.getProcessInstanceId());
        List<Map<String, Object>> handoffHistory = WorkflowVariableUtils.getListVariable(variables, "handoffHistory", objectMapper);

        Map<String, Object> handoffRecord = new HashMap<>();
        handoffRecord.put("id", UUID.randomUUID().toString());
        handoffRecord.put("taskId", taskId);
        handoffRecord.put("taskName", task.getName());
        handoffRecord.put("fromUserId", fromUserId);
        handoffRecord.put("toUserId", toUserId);
        handoffRecord.put("reason", reason);
        handoffRecord.put("timestamp", LocalDateTime.now().toString());
        handoffHistory.add(handoffRecord);

        runtimeService.setVariable(task.getProcessInstanceId(), "handoffHistory", WorkflowVariableUtils.serializeList(handoffHistory, objectMapper));

        // Unclaim and reassign
        if (task.getAssignee() != null) {
            taskService.unclaim(taskId);
        }
        taskService.claim(taskId, toUserId);

        log.info("Task {} (ProcessInstance: {}) handed off from {} to {} - Reason: {}", taskId, task.getProcessInstanceId(), fromUserId, toUserId, reason);
    }

    @Transactional
    public ApprovalDTO recordApproval(String taskId, String decision, String comments, String userId) {
        Task task = taskService.createTaskQuery()
                .taskId(taskId)
                .singleResult();

        if (task == null) {
            throw new ResourceNotFoundException("Task not found: " + taskId);
        }

        Map<String, Object> variables = runtimeService.getVariables(task.getProcessInstanceId());
        String currentLevel = WorkflowVariableUtils.getStringVariable(variables, "currentLevel", "SUPERVISOR");

        List<Map<String, Object>> approvalHistory = WorkflowVariableUtils.getListVariable(variables, "approvalHistory", objectMapper);

        Map<String, Object> approvalRecord = new HashMap<>();
        approvalRecord.put("id", UUID.randomUUID().toString());
        approvalRecord.put("taskId", taskId);
        approvalRecord.put("taskName", task.getName());
        approvalRecord.put("approverId", userId);
        approvalRecord.put("approverLevel", currentLevel);
        approvalRecord.put("decision", decision);
        approvalRecord.put("comments", comments);
        approvalRecord.put("timestamp", LocalDateTime.now().toString());
        approvalRecord.put("stepOrder", approvalHistory.size() + 1);
        approvalHistory.add(approvalRecord);

        // Update variables
        Map<String, Object> updateVars = new HashMap<>();
        updateVars.put("approvalHistory", WorkflowVariableUtils.serializeList(approvalHistory, objectMapper));
        updateVars.put("decision", decision.toLowerCase());
        updateVars.put("approvalComments", comments);
        updateVars.put("completedBy", userId);

        taskService.complete(taskId, updateVars);

        log.info("Approval recorded for task {} (ProcessInstance: {}) by {} - Decision: {}", taskId, task.getProcessInstanceId(), userId, decision);

        return ApprovalDTO.builder()
                .id((String) approvalRecord.get("id"))
                .processInstanceId(task.getProcessInstanceId())
                .taskId(taskId)
                .taskName(task.getName())
                .approverId(userId)
                .approverLevel(currentLevel)
                .decision(decision)
                .comments(comments)
                .timestamp(LocalDateTime.now())
                .stepOrder(approvalHistory.size())
                .isRequired(true)
                .build();
    }
}
