package com.demo.bpm.service;

import com.demo.bpm.dto.*;
import com.demo.bpm.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExportService {

    private final WorkflowHistoryService workflowHistoryService;
    private static final String CSV_SEPARATOR = ",";
    private static final String LINE_SEPARATOR = "\n";
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public byte[] exportProcessInstance(String processInstanceId) {
        log.info("Exporting process instance: {}", processInstanceId);

        WorkflowHistoryDTO history = getWorkflowHistoryOrThrow(processInstanceId);

        StringBuilder csv = new StringBuilder();

        // 1. Process Details
        csv.append("PROCESS DETAILS").append(LINE_SEPARATOR);
        appendRow(csv, "ID", history.getProcessInstanceId());
        appendRow(csv, "Definition", history.getProcessDefinitionName());
        appendRow(csv, "Key", history.getProcessDefinitionKey());
        appendRow(csv, "Business Key", history.getBusinessKey());
        appendRow(csv, "Status", history.getStatus());
        appendRow(csv, "Initiator", formatInitiator(history));
        appendRow(csv, "Start Time", formatDateTime(history.getStartTime()));
        appendRow(csv, "End Time", formatDateTime(history.getEndTime()));
        appendRow(csv, "Duration (ms)", String.valueOf(history.getDurationInMillis()));
        appendRow(csv, "Current Level", history.getCurrentLevel());
        csv.append(LINE_SEPARATOR);

        // 2. Variables
        csv.append("VARIABLES").append(LINE_SEPARATOR);
        appendRow(csv, "Name", "Value");
        if (history.getVariables() != null && !history.getVariables().isEmpty()) {
            for (Map.Entry<String, Object> entry : history.getVariables().entrySet()) {
                appendRow(csv, entry.getKey(), String.valueOf(entry.getValue()));
            }
        } else {
            log.debug("No variables recorded for process instance: {}", processInstanceId);
        }
        csv.append(LINE_SEPARATOR);

        // 3. Task History
        csv.append("TASK HISTORY").append(LINE_SEPARATOR);
        appendRow(csv, "Task Name", "Assignee", "Status", "Start Time", "End Time", "Duration (ms)");
        if (history.getTaskHistory() != null && !history.getTaskHistory().isEmpty()) {
            for (TaskHistoryDTO task : history.getTaskHistory()) {
                appendRow(csv,
                        task.getName(),
                        task.getAssignee(),
                        task.getEndTime() != null ? "COMPLETED" : "ACTIVE",
                        formatDateTime(task.getCreateTime()),
                        formatDateTime(task.getEndTime()),
                        String.valueOf(task.getDurationInMillis())
                );
            }
        } else {
            log.debug("No task history recorded for process instance: {}", processInstanceId);
        }
        csv.append(LINE_SEPARATOR);

        // 4. Approvals
        csv.append("APPROVALS").append(LINE_SEPARATOR);
        appendRow(csv, "Task", "Approver", "Level", "Decision", "Time");
        if (history.getApprovals() != null && !history.getApprovals().isEmpty()) {
            for (ApprovalDTO approval : history.getApprovals()) {
                appendRow(csv,
                        approval.getTaskName(),
                        approval.getApproverId(),
                        approval.getApproverLevel(),
                        approval.getDecision(),
                        formatDateTime(approval.getTimestamp())
                );
            }
        } else {
            log.debug("No approvals recorded for process instance: {}", processInstanceId);
        }
        csv.append(LINE_SEPARATOR);

         // 5. Escalations
        csv.append("ESCALATIONS").append(LINE_SEPARATOR);
        appendRow(csv, "From", "To", "By", "Reason", "Type", "Time");
        if (history.getEscalationHistory() != null && !history.getEscalationHistory().isEmpty()) {
            for (EscalationDTO esc : history.getEscalationHistory()) {
                appendRow(csv,
                        esc.getFromLevel(),
                        esc.getToLevel(),
                        esc.getFromUserId(),
                        esc.getReason(),
                        esc.getType(),
                        formatDateTime(esc.getTimestamp())
                );
            }
        } else {
            log.debug("No escalation history recorded for process instance: {}", processInstanceId);
        }
        csv.append(LINE_SEPARATOR);

        // 6. Comments
        csv.append("COMMENTS").append(LINE_SEPARATOR);
        appendRow(csv, "Author", "Message", "Time");
        if (history.getComments() != null && !history.getComments().isEmpty()) {
            for (CommentDTO comment : history.getComments()) {
                appendRow(csv,
                        comment.getAuthorId(),
                        comment.getMessage(),
                        formatDateTime(comment.getTimestamp())
                );
            }
        } else {
            log.debug("No comments recorded for process instance: {}", processInstanceId);
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    public WorkflowHistoryDTO exportProcessInstanceJson(String processInstanceId) {
        // Return structured workflow history for integrations that need JSON export.
        log.info("Exporting process instance JSON: {}", processInstanceId);
        return getWorkflowHistoryOrThrow(processInstanceId);
    }

    private void appendRow(StringBuilder sb, String... values) {
        for (int i = 0; i < values.length; i++) {
            sb.append(escapeSpecialCharacters(values[i]));
            if (i < values.length - 1) {
                sb.append(CSV_SEPARATOR);
            }
        }
        sb.append(LINE_SEPARATOR);
    }

    private String formatDateTime(java.time.LocalDateTime dateTime) {
        if (dateTime == null) {
            return "";
        }
        return dateTime.format(DATE_FORMATTER);
    }

    private String escapeSpecialCharacters(String data) {
        if (data == null) {
            return "";
        }
        // Normalize line breaks before applying CSV escaping rules.
        String sanitized = data.replaceAll("\\R", " ");
        String escaped = sanitized.replace("\"", "\"\"");
        if (sanitized.contains(CSV_SEPARATOR) || sanitized.contains("\"") || sanitized.contains("'")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }

    private String formatInitiator(WorkflowHistoryDTO history) {
        String name = nullIfBlank(history.getInitiatorName());
        String id = nullIfBlank(history.getInitiatorId());
        if (name == null && id == null) {
            return "";
        }
        if (name != null && id != null) {
            return name + " (" + id + ")";
        }
        return name != null ? name : id;
    }

    private String nullIfBlank(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private WorkflowHistoryDTO getWorkflowHistoryOrThrow(String processInstanceId) {
        WorkflowHistoryDTO history = workflowHistoryService.getWorkflowHistory(processInstanceId);
        if (history == null) {
            log.warn("No workflow history found for process instance: {}", processInstanceId);
            throw new ResourceNotFoundException("Process instance not found: " + processInstanceId);
        }
        return history;
    }
}
