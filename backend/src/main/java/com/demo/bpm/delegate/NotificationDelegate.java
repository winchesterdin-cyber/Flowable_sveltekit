package com.demo.bpm.delegate;

import com.demo.bpm.entity.Notification;
import com.demo.bpm.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.flowable.engine.delegate.DelegateExecution;
import org.flowable.engine.delegate.JavaDelegate;
import org.springframework.stereotype.Component;

@Component("notificationDelegate")
@RequiredArgsConstructor
public class NotificationDelegate implements JavaDelegate {

    private final NotificationService notificationService;

    @Override
    public void execute(DelegateExecution execution) {
        String userId = (String) execution.getVariable("assignee");
        String title = (String) execution.getVariable("notificationTitle");
        String message = (String) execution.getVariable("notificationMessage");
        String typeStr = (String) execution.getVariable("notificationType");
        String link = (String) execution.getVariable("notificationLink");
        
        // Fallback or defaults
        if (userId == null) {
            userId = (String) execution.getVariable("initiator");
        }
        
        Notification.NotificationType type = Notification.NotificationType.SYSTEM;
        if (typeStr != null) {
            try {
                type = Notification.NotificationType.valueOf(typeStr);
            } catch (IllegalArgumentException e) {
                // Keep default
            }
        }
        
        if (title == null) {
            title = "Process Update";
        }
        
        if (message == null) {
            message = "Process " + execution.getProcessDefinitionId() + " updated.";
        }
        
        notificationService.createNotification(userId, title, message, type, link);
    }
}
