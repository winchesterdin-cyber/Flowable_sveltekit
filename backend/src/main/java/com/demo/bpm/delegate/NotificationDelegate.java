package com.demo.bpm.delegate;

import com.demo.bpm.entity.Notification;
import com.demo.bpm.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

@Slf4j
@Component("notificationDelegate")
@RequiredArgsConstructor
public class NotificationDelegate implements JavaDelegate {

    private final NotificationService notificationService;

    @Override
    public void execute(DelegateExecution execution) {
        // Normalize variables to avoid null/blank surprises from process context.
        String userId = getStringVariable(execution, "assignee");
        String title = getStringVariable(execution, "notificationTitle");
        String message = getStringVariable(execution, "notificationMessage");
        String typeStr = getStringVariable(execution, "notificationType");
        String link = getStringVariable(execution, "notificationLink");
        
        // Fallback or defaults
        if (userId == null) {
            userId = getStringVariable(execution, "initiator");
        }

        if (userId == null) {
            log.warn("Skipping notification creation because no assignee or initiator was provided.");
            return;
        }
        
        Notification.NotificationType type = Notification.NotificationType.SYSTEM;
        if (typeStr != null) {
            try {
                type = Notification.NotificationType.valueOf(typeStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.debug("Unknown notification type '{}', using SYSTEM default.", typeStr);
            }
        }
        
        if (title == null) {
            title = "Process Update";
        }
        
        if (message == null) {
            String processDefinitionId = execution.getProcessDefinitionId();
            message = processDefinitionId == null
                ? "Process updated."
                : "Process " + processDefinitionId + " updated.";
        }

        log.debug("Creating notification for user '{}' with type '{}'.", userId, type);
        
        notificationService.createNotification(userId, title, message, type, link);
    }

    private String getStringVariable(DelegateExecution execution, String variableName) {
        Object value = execution.getVariable(variableName);
        if (!(value instanceof String)) {
            return null;
        }
        String text = ((String) value).trim();
        return text.isEmpty() ? null : text;
    }
}
